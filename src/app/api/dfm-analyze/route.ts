import { NextResponse } from "next/server";
import { spawnSync } from "child_process";
import path from "path";

export const runtime  = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json() as { parts?: unknown[] };
    if (!body.parts || !Array.isArray(body.parts)) {
      return NextResponse.json({ error: "Missing parts array" }, { status: 400 });
    }

    const scriptPath = path.join(process.cwd(), "scripts", "dfm_analyze.py");
    const proc = spawnSync("python", [scriptPath], {
      input:     Buffer.from(JSON.stringify(body)),
      maxBuffer: 10 * 1024 * 1024,
      timeout:   25_000,
    });

    const stderr = proc.stderr?.toString().trim();
    if (stderr) console.log("[dfm-analyze stderr]", stderr);

    if (proc.error) throw proc.error;
    if (proc.status !== 0) {
      return NextResponse.json(
        { error: stderr || "DFM analysis failed" },
        { status: 500 },
      );
    }

    const result = JSON.parse(proc.stdout.toString());
    return NextResponse.json(result);
  } catch (err) {
    console.error("[dfm-analyze]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
