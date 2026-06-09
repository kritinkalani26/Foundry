export interface GlbParseResult {
  assemblyName: string;
  parts: string[];
}

function normalize(name: string): string {
  return name.replace(/[:<(]\d+[)>]?\s*$/, "").trim();
}

// Extract component names from GLB binary JSON chunk — no tessellation, instant
export function parseGLB(buffer: ArrayBuffer): GlbParseResult {
  const view = new DataView(buffer);

  // GLB header: magic(4) + version(4) + totalLength(4)
  const magic = view.getUint32(0, true);
  if (magic !== 0x46546c67) throw new Error("Not a valid GLB file (bad magic bytes)");

  // Chunk 0 header at offset 12: chunkLength(4) + chunkType(4) + chunkData
  const jsonChunkLength = view.getUint32(12, true);
  const jsonChunkType   = view.getUint32(16, true);
  if (jsonChunkType !== 0x4e4f534a) throw new Error("First GLB chunk is not JSON"); // 'JSON'

  const jsonBytes = buffer.slice(20, 20 + jsonChunkLength);
  const gltf = JSON.parse(new TextDecoder().decode(jsonBytes)) as {
    nodes?: Array<{ name?: string; mesh?: number; children?: number[] }>;
    meshes?: Array<{ name?: string }>;
    scenes?: Array<{ nodes?: number[] }>;
  };

  const names = new Set<string>();
  const rootNodes = new Set<number>(gltf.scenes?.[0]?.nodes ?? []);

  // Nodes that have meshes are leaf components (actual parts)
  const leafNames: string[] = [];
  const rootNames: string[] = [];

  if (gltf.nodes) {
    for (let i = 0; i < gltf.nodes.length; i++) {
      const node = gltf.nodes[i];
      const raw  = node.name ?? "";
      const name = normalize(raw);
      if (!name || names.has(name)) continue;
      names.add(name);

      if (node.mesh !== undefined) {
        leafNames.push(name);
      } else if (rootNodes.has(i)) {
        rootNames.push(name);
      }
    }
  }

  // Fallback: if no node names, use mesh names
  if (leafNames.length === 0 && gltf.meshes) {
    for (const m of gltf.meshes) {
      const name = normalize(m.name ?? "");
      if (name && !names.has(name)) { names.add(name); leafNames.push(name); }
    }
  }

  const allParts = leafNames.length > 0 ? leafNames : Array.from(names);
  const assemblyName = rootNames[0] || allParts[0] || "Assembly";
  const parts = allParts.filter(n => n !== assemblyName);

  if (parts.length === 0) throw new Error("No components found in GLB. Make sure you exported an assembly with multiple components.");

  return { assemblyName, parts };
}
