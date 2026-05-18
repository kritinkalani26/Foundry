/**
 * Gradient Boosting inference engine for Foundry pricing models.
 * Models are trained by scripts/train_models.py and stored as JSON tree structures.
 * This file runs on the server (API route) — no Python or external service needed at runtime.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

interface TreeNode {
  v?: number;       // leaf value
  f?: number;       // feature index (split feature)
  t?: number;       // threshold
  l?: TreeNode;     // left child  (feature[f] <= t)
  r?: TreeNode;     // right child (feature[f]  > t)
}

export interface ModelData {
  equipment: string;
  features: string[];
  init_value: number;
  learning_rate: number;
  trees: TreeNode[];
}

export interface PriceResult {
  price: number;
  low: number;      // -18% confidence band
  high: number;     // +18% confidence band
}

// ─── Core inference ─────────────────────────────────────────────────────────

function traverseTree(node: TreeNode, feats: number[]): number {
  if (node.v !== undefined) return node.v;
  return feats[node.f!] <= node.t!
    ? traverseTree(node.l!, feats)
    : traverseTree(node.r!, feats);
}

/**
 * Run a trained GBM model on a feature vector.
 * Models are trained on log(price), so we exp() the output.
 */
export function predictGBM(model: ModelData, feats: number[]): PriceResult {
  let logPred = model.init_value;
  for (const tree of model.trees) {
    logPred += model.learning_rate * traverseTree(tree, feats);
  }
  const price = Math.exp(logPred);
  return {
    price:  Math.round(price),
    low:    Math.round(price * 0.82),
    high:   Math.round(price * 1.18),
  };
}

// ─── Per-equipment feature extractors ───────────────────────────────────────
// These MUST match the column order used in scripts/train_models.py exactly.

export function features3DPrinter(
  volumeCm3: number,
  infill: number,
  layerHeight: number,
  materialCode: number,   // 0=PLA 1=ABS 2=PETG 3=Resin
  triangleCount: number,
  quantity: number,
): number[] {
  return [
    Math.log(volumeCm3 + 1),
    infill,
    layerHeight,
    materialCode,
    Math.log(triangleCount + 1) / 13.5,
    quantity,
  ];
}

export function featuresLaserCutter(
  widthMm: number,
  heightMm: number,
  materialCode: number,  // 0=wood 1=acrylic 2=mdf 3=leather 4=cardboard 5=fabric
  thicknessMm: number,
  quantity: number,
  numCutPaths = 4,
): number[] {
  const areaCm2   = (widthMm * heightMm) / 100;
  const perimCm   = (2 * (widthMm + heightMm) + numCutPaths * 150) / 10;
  return [
    Math.log(areaCm2 + 1),
    Math.log(perimCm + 1),
    materialCode,
    thicknessMm,
    quantity,
  ];
}

export function featuresCNCMill(
  stockVolumeCm3: number,
  materialCode: number,  // 0=wood 1=plastic 2=aluminum 3=steel
  complexity: number,    // 1–5
  numSetups: number,
): number[] {
  return [
    Math.log(stockVolumeCm3 + 1),
    materialCode,
    complexity,
    numSetups,
  ];
}

export function featuresLathe(
  diameterMm: number,
  lengthMm: number,
  materialCode: number,  // 0=mild_steel 1=aluminum 2=brass 3=plastic
  isPrecision: number,   // 0 or 1
  numOperations: number, // 1–5
): number[] {
  return [
    Math.log(diameterMm + 1),
    Math.log(lengthMm + 1),
    materialCode,
    isPrecision,
    numOperations,
  ];
}

export function featuresWaterJet(
  cutLengthMm: number,
  areaCm2: number,
  materialCode: number,  // 0=mild_steel 1=stainless 2=aluminum 3=stone 4=glass
  thicknessMm: number,
  quantity: number,
): number[] {
  return [
    Math.log(cutLengthMm + 1),
    Math.log(areaCm2 + 1),
    materialCode,
    thicknessMm,
    quantity,
  ];
}

export function featuresSoldering(
  thtCount: number,
  smdCount: number,
  boardAreaCm2: number,
  isDoubleSided: number,  // 0 or 1
  bgaCount: number,
  qtyBoards: number,
): number[] {
  return [
    thtCount,
    smdCount,
    Math.log(boardAreaCm2 + 1),
    isDoubleSided,
    bgaCount,
    qtyBoards,
  ];
}

export function featuresVinylCutter(
  areaCm2: number,
  materialCode: number,  // 0=standard 1=htv 2=chrome 3=glitter
  colorCount: number,
  quantity: number,
): number[] {
  return [
    Math.log(areaCm2 + 1),
    materialCode,
    colorCount,
    quantity,
  ];
}

export function featuresPCBFab(
  areaCm2: number,
  layers: number,         // 1 2 4 6 8
  quantity: number,
  minTraceMm: number,
  surfaceFinishCode: number, // 0=HASL 1=ENIG 2=OSP
): number[] {
  return [
    Math.log(areaCm2 + 1),
    layers,
    quantity,
    minTraceMm,
    surfaceFinishCode,
  ];
}
