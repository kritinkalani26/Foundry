import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { parseSTEP } from "@/lib/step-parser";
import Groq from "groq-sdk";
import { prisma } from "@/lib/prisma";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Free tier: 12,000 TPM. Keep each call well under that.
const CHUNK_SIZE = 12;          // ~12 parts × ~80 tokens/part = ~960 output tokens
const MAX_OUTPUT_TOKENS = 1400; // plenty for 12 parts

export interface PartAnalysis {
  partName: string;
  process: string;
  material: string;
  reason: string;
  estimatedCostInr: number;
  suggestedStoreIds: string[];
}

export interface StoreInfo {
  id: string;
  name: string;
  city: string;
  rating: number;
}

export interface AssemblyAnalysis {
  assemblyName: string;
  parts: PartAnalysis[];
  summary: string;
  totalEstimatedCostInr: number;
  storeMap: Record<string, StoreInfo>; // id → info, for all suggested stores
}

function buildPrompt(assemblyName: string, description: string, parts: string[], storeContext: object[]): string {
  return `Manufacturing engineer. Assembly: "${assemblyName}". Context: "${description || "none"}".
Stores: ${JSON.stringify(storeContext)}
Parts: ${parts.map((p, i) => `${i + 1}.${p}`).join(", ")}
For each part: process (3D Print|CNC Mill|Laser Cut|Lathe|Manual/Purchase), material, reason (1 sentence), estimatedCostInr (INR), suggestedStoreIds (0-2 IDs).
Rules: shaft/axle/rod→Lathe; flat panel/sheet→Laser Cut; metal structural plate/block→CNC Mill; fasteners/bearings/motors→Manual/Purchase; else→3D Print.
JSON only: {"parts":[{"partName":"...","process":"...","material":"...","reason":"...","estimatedCostInr":0,"suggestedStoreIds":[]}]}`;
}

async function analyseChunk(
  assemblyName: string,
  description: string,
  parts: string[],
  storeContext: object[],
): Promise<PartAnalysis[]> {
  const prompt = buildPrompt(assemblyName, description, parts, storeContext);

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    max_tokens: MAX_OUTPUT_TOKENS,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(raw) as { parts?: PartAnalysis[] };
  return parsed.parts || [];
}

export async function POST(req: NextRequest) {
  try {
    return await handlePost(req);
  } catch (err) {
    console.error("[analyze-assembly] unhandled error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

async function handlePost(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const stepFile = formData.get("step") as File | null;
  const description = (formData.get("description") as string) || "";

  if (!stepFile) {
    return NextResponse.json({ error: "No STEP file provided" }, { status: 400 });
  }

  const text = await stepFile.text();

  let parsed: { assemblyName: string; parts: string[] };
  try {
    parsed = parseSTEP(text);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to parse STEP file" },
      { status: 400 }
    );
  }

  if (parsed.parts.length === 0) {
    return NextResponse.json(
      { error: "No components found. Make sure you exported an assembly (not a single part)." },
      { status: 400 }
    );
  }

  // Fetch active stores — all of them go into storeMap so every part can show options
  const stores = await prisma.printerOwner.findMany({
    where: { isActive: true, isVisible: true },
    select: {
      id: true,
      businessName: true,
      rating: true,
      user: { select: { city: true } },
    },
    take: 30,
  });

  const storeContext = stores.map(s => ({
    id: s.id,
    name: s.businessName || "Unnamed",
    city: s.user.city || "Unknown",
  }));

  const storeMap: Record<string, StoreInfo> = {};
  for (const s of stores) {
    storeMap[s.id] = {
      id: s.id,
      name: s.businessName || "Unnamed",
      city: s.user.city || "Unknown",
      rating: s.rating,
    };
  }

  // All store IDs — returned so frontend can show every store for every part
  const allStoreIds = stores.map(s => s.id);

  // Split into chunks so no single Groq call can be truncated
  const chunks: string[][] = [];
  for (let i = 0; i < parsed.parts.length; i += CHUNK_SIZE) {
    chunks.push(parsed.parts.slice(i, i + CHUNK_SIZE));
  }

  let allParts: PartAnalysis[] = [];
  try {
    // Run chunks sequentially to avoid rate-limit issues
    for (const chunk of chunks) {
      const results = await analyseChunk(
        parsed.assemblyName,
        description,
        chunk,
        storeContext,
      );
      allParts = allParts.concat(results);
    }
  } catch (err) {
    console.error("Groq error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Groq API error: ${msg}` }, { status: 500 });
  }

  // Generate a single summary if we had multiple chunks
  let summary = "";
  if (chunks.length === 1 && allParts.length > 0) {
    // Summary was included implicitly — generate separately
  }
  // Quick summary via a lightweight call
  try {
    const summaryCompletion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{
        role: "user",
        content: `Assembly "${parsed.assemblyName}", ${parsed.parts.length} parts, context: "${description || "none"}". 2-sentence manufacturing strategy. JSON: {"summary":"..."}`,
      }],
      temperature: 0.3,
      max_tokens: 200,
      response_format: { type: "json_object" },
    });
    const s = JSON.parse(summaryCompletion.choices[0]?.message?.content || "{}") as { summary?: string };
    summary = s.summary || "";
  } catch { /* non-critical */ }

  // Ensure every orderable part has all stores available (not just AI-guessed IDs)
  const enrichedParts = allParts.map(p => ({
    ...p,
    suggestedStoreIds: allStoreIds,
  }));

  const result: AssemblyAnalysis = {
    assemblyName: parsed.assemblyName,
    parts: enrichedParts,
    summary,
    totalEstimatedCostInr: enrichedParts.reduce((s, p) => s + (p.estimatedCostInr || 0), 0),
    storeMap,
  };

  return NextResponse.json(result);
}
