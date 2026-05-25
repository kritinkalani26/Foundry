export interface StepParseResult {
  assemblyName: string;
  parts: string[];
}

// Normalize Fusion 360 instance suffixes: "Servo Bracket:1", "Base<1>", etc.
function normalize(name: string): string {
  return name.replace(/[:<(]\d+[)>]?$/, "").trim();
}

export function parseSTEP(content: string): StepParseResult {
  // ── 1. Collect all PRODUCT entities: #X = PRODUCT('name', ...)
  const entityToName = new Map<string, string>();
  const productRe = /#(\d+)\s*=\s*PRODUCT\s*\(\s*'([^']*)'/g;
  let m: RegExpExecArray | null;
  while ((m = productRe.exec(content)) !== null) {
    const name = m[2].trim();
    if (name) entityToName.set(m[1], name);
  }

  if (entityToName.size === 0) {
    throw new Error("No PRODUCT entities found — is this a valid STEP file?");
  }

  // ── 2. Map PRODUCT_DEFINITION id → PRODUCT id
  // Pattern: #X = PRODUCT_DEFINITION('...','...',#PRODUCT_REF,#context)
  const pdToProduct = new Map<string, string>();
  const pdRe = /#(\d+)\s*=\s*PRODUCT_DEFINITION\s*\('[^']*'\s*,\s*'[^']*'\s*,\s*#(\d+)/g;
  while ((m = pdRe.exec(content)) !== null) {
    pdToProduct.set(m[1], m[2]);
  }

  // ── 3. Parse NEXT_ASSEMBLY_USAGE_OCCURRENCE to find parents vs children
  // Pattern: NEXT_ASSEMBLY_USAGE_OCCURRENCE('id','name',#PARENT_PD,#CHILD_PD,...)
  const parentIds = new Set<string>();
  const childIds = new Set<string>();
  const nauoRe = /NEXT_ASSEMBLY_USAGE_OCCURRENCE\s*\(\s*'[^']*'\s*,\s*'[^']*'\s*,\s*#(\d+)\s*,\s*#(\d+)/g;
  while ((m = nauoRe.exec(content)) !== null) {
    const parentProduct = pdToProduct.get(m[1]);
    const childProduct = pdToProduct.get(m[2]);
    if (parentProduct) parentIds.add(parentProduct);
    if (childProduct) childIds.add(childProduct);
  }

  // ── 4. Deduplicate by normalised name, prefer child products as "parts"
  const seen = new Set<string>();
  const assemblyNames: string[] = [];
  const partNames: string[] = [];

  // Process child products first (actual parts)
  for (const [id, rawName] of Array.from(entityToName.entries())) {
    const name = normalize(rawName);
    if (!name || seen.has(name)) continue;
    if (childIds.has(id)) {
      seen.add(name);
      partNames.push(name);
    }
  }

  // Assembly = parent but not a child
  for (const [id, rawName] of Array.from(entityToName.entries())) {
    const name = normalize(rawName);
    if (!name || seen.has(name)) continue;
    if (parentIds.has(id) && !childIds.has(id)) {
      seen.add(name);
      assemblyNames.push(name);
    }
  }

  // Fallback: NAUO parsing failed (e.g. unusual export), just return all products
  if (partNames.length === 0 && childIds.size === 0) {
    const allNames = Array.from(
      new Set(Array.from(entityToName.values()).map(normalize).filter(Boolean))
    );
    return { assemblyName: allNames[0] || "Assembly", parts: allNames.slice(1) };
  }

  return {
    assemblyName: assemblyNames[0] || normalize(entityToName.values().next().value ?? "Assembly"),
    parts: partNames,
  };
}
