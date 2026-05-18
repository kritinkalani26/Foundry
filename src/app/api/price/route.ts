import { NextResponse } from "next/server";
import {
  predictGBM,
  type ModelData,
  features3DPrinter,
  featuresLaserCutter,
  featuresCNCMill,
  featuresLathe,
  featuresWaterJet,
  featuresSoldering,
  featuresVinylCutter,
  featuresPCBFab,
} from "@/lib/ml-predictor";

// Static imports so Next.js bundles them into the serverless function.
import model3D        from "@/lib/models/3d-printer.json";
import modelLaser     from "@/lib/models/laser-cutter.json";
import modelCNC       from "@/lib/models/cnc-mill.json";
import modelLathe     from "@/lib/models/lathe.json";
import modelWaterJet  from "@/lib/models/water-jet.json";
import modelSoldering from "@/lib/models/soldering.json";
import modelVinyl     from "@/lib/models/vinyl-cutter.json";
import modelPCB       from "@/lib/models/pcb-fabrication.json";

const MODELS: Record<string, ModelData> = {
  "3d-printer":      model3D       as ModelData,
  "laser-cutter":    modelLaser    as ModelData,
  "cnc-mill":        modelCNC      as ModelData,
  "lathe":           modelLathe    as ModelData,
  "water-jet":       modelWaterJet as ModelData,
  "soldering":       modelSoldering as ModelData,
  "vinyl-cutter":    modelVinyl    as ModelData,
  "pcb-fabrication": modelPCB      as ModelData,
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { equipment, params } = body as { equipment: string; params: Record<string, number> };

    const model = MODELS[equipment];
    if (!model) {
      return NextResponse.json({ error: `Unknown equipment: ${equipment}` }, { status: 400 });
    }

    let feats: number[];

    switch (equipment) {
      case "3d-printer":
        feats = features3DPrinter(
          params.volumeCm3      ?? 30,
          params.infill         ?? 0.3,
          params.layerHeight    ?? 0.2,
          params.materialCode   ?? 0,
          params.triangleCount  ?? 20000,
          params.quantity       ?? 1,
        );
        break;

      case "laser-cutter":
        feats = featuresLaserCutter(
          params.widthMm        ?? 200,
          params.heightMm       ?? 150,
          params.materialCode   ?? 0,
          params.thicknessMm    ?? 3,
          params.quantity       ?? 1,
          params.numCutPaths    ?? 4,
        );
        break;

      case "cnc-mill":
        feats = featuresCNCMill(
          params.stockVolumeCm3 ?? 200,
          params.materialCode   ?? 2,
          params.complexity     ?? 2,
          params.numSetups      ?? 1,
        );
        break;

      case "lathe":
        feats = featuresLathe(
          params.diameterMm     ?? 50,
          params.lengthMm       ?? 100,
          params.materialCode   ?? 1,
          params.isPrecision    ?? 0,
          params.numOperations  ?? 2,
        );
        break;

      case "water-jet":
        feats = featuresWaterJet(
          params.cutLengthMm    ?? 1000,
          params.areaCm2        ?? 200,
          params.materialCode   ?? 2,
          params.thicknessMm    ?? 6,
          params.quantity       ?? 1,
        );
        break;

      case "soldering":
        feats = featuresSoldering(
          params.thtCount       ?? 10,
          params.smdCount       ?? 20,
          params.boardAreaCm2   ?? 25,
          params.isDoubleSided  ?? 0,
          params.bgaCount       ?? 0,
          params.qtyBoards      ?? 1,
        );
        break;

      case "vinyl-cutter":
        feats = featuresVinylCutter(
          params.areaCm2        ?? 100,
          params.materialCode   ?? 0,
          params.colorCount     ?? 1,
          params.quantity       ?? 1,
        );
        break;

      case "pcb-fabrication":
        feats = featuresPCBFab(
          params.areaCm2            ?? 100,
          params.layers             ?? 2,
          params.quantity           ?? 10,
          params.minTraceMm         ?? 0.2,
          params.surfaceFinishCode  ?? 0,
        );
        break;

      default:
        return NextResponse.json({ error: "Unknown equipment" }, { status: 400 });
    }

    const result = predictGBM(model, feats);
    return NextResponse.json({ ok: true, ...result, equipment });
  } catch (err) {
    console.error("/api/price error:", err);
    return NextResponse.json({ error: "Inference failed" }, { status: 500 });
  }
}
