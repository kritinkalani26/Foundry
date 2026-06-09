export interface ObjParseResult {
  assemblyName: string;
  parts: string[];
}

function normalize(name: string): string {
  return name.replace(/[:<(]\d+[)>]?\s*$/, "").trim();
}

// Extract component names from OBJ text — reads `o` and `g` declarations
export function parseOBJ(text: string, filename: string): ObjParseResult {
  const seen   = new Set<string>();
  const oNames: string[] = [];
  const gNames: string[] = [];

  for (const line of text.split("\n")) {
    const t = line.trim();
    const isO = t.startsWith("o ");
    const isG = t.startsWith("g ");
    if (!isO && !isG) continue;
    const raw  = t.slice(2).trim();
    const name = normalize(raw);
    if (!name || name.toLowerCase() === "default" || seen.has(name)) continue;
    seen.add(name);
    if (isO) oNames.push(name);
    else      gNames.push(name);
  }

  // Prefer object names; fall back to group names if the file uses only groups
  const parts = oNames.length > 0 ? oNames : gNames;

  const assemblyName = filename.replace(/\.(obj|gltf|glb)$/i, "").replace(/[_-]/g, " ").trim() || "Assembly";

  if (parts.length === 0) {
    throw new Error("No components found in OBJ file. In Fusion 360, make sure you export an assembly (not a single body).");
  }

  return { assemblyName, parts };
}
