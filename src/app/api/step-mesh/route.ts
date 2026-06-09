import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_TRIS = 800; // triangles per mesh — keeps response under ~5 MB total

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("step") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const bytes = new Uint8Array(await file.arrayBuffer());

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const occtimportjs = require("occt-import-js");
    const occt = await occtimportjs();
    const result = occt.ReadStepFile(bytes, null);

    if (!result.success) {
      return NextResponse.json({ error: "STEP parse failed" }, { status: 400 });
    }

    const meshes: Array<{
      id: string;
      name: string;
      positions: number[];
      normals: number[];
      indices: number[];
    }> = [];

    for (let mi = 0; mi < result.meshCount; mi++) {
      const mesh   = result.GetMesh(mi);
      const name   = (mesh.name as string | undefined) || `Part ${mi + 1}`;
      const vCount = mesh.VertexCount() as number;
      const tCount = mesh.TriangleCount() as number;
      if (vCount === 0 || tCount === 0) continue;

      const positions: number[] = [];
      const normals:   number[] = [];

      for (let v = 0; v < vCount; v++) {
        const vtx = mesh.GetVertex(v) as { x: number; y: number; z: number };
        positions.push(vtx.x, vtx.y, vtx.z);
        const nrm = mesh.GetNormal(v) as { x: number; y: number; z: number };
        normals.push(nrm.x, nrm.y, nrm.z);
      }

      // Stride-decimate triangles when the mesh is very dense
      const stride  = Math.max(1, Math.ceil(tCount / MAX_TRIS));
      const indices: number[] = [];
      for (let t = 0; t < tCount; t += stride) {
        const tri = mesh.GetTriangle(t) as { v0: number; v1: number; v2: number };
        indices.push(tri.v0, tri.v1, tri.v2);
      }

      meshes.push({ id: `m${mi}`, name, positions, normals, indices });
    }

    return NextResponse.json({ meshes });
  } catch (err) {
    console.error("[step-mesh]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Parse failed" },
      { status: 500 }
    );
  }
}
