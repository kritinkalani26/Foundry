import { NextResponse } from "next/server";
import { spawnSync } from "child_process";
import path from "path";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("step") as File | null;
    if (!file) return NextResponse.json({ error: "No STEP file" }, { status: 400 });

    const bytes      = Buffer.from(await file.arrayBuffer());
    const scriptPath = path.join(process.cwd(), "scripts", "step-to-obj.js");

    const proc = spawnSync("node", [scriptPath], {
      input:     bytes,
      maxBuffer: 150 * 1024 * 1024, // 150 MB
      timeout:   55_000,
    });

    const stderr = proc.stderr?.toString().trim() || "";
    console.log("[step-to-obj stderr]", stderr);

    if (proc.error) throw proc.error;
    if (proc.status !== 0) {
      const msg = stderr || "Conversion failed";
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const obj = proc.stdout.toString();
    const hasGeometry = obj.split("\n").some(l => l.startsWith("v "));
    if (!hasGeometry) {
      return NextResponse.json({
        error: `No geometry extracted. Debug: ${stderr}`,
      }, { status: 400 });
    }

    return new Response(obj, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("[step-to-obj]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
