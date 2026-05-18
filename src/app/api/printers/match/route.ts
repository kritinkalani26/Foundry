import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { matchPrinters } from "@/lib/matching-algorithm";
import type { Material, PrintSettings, STLMetrics, PrinterOwnerProfile } from "@/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const lat = parseFloat(searchParams.get("lat") ?? "22.7196");
  const lng = parseFloat(searchParams.get("lng") ?? "75.8577");
  const material = (searchParams.get("material") ?? "PLA") as Material;
  const infill = parseFloat(searchParams.get("infill") ?? "0.3");
  const layerHeight = parseFloat(searchParams.get("layerHeight") ?? "0.2");
  const volumeCm3 = parseFloat(searchParams.get("volumeCm3") ?? "10");
  const bbX = parseFloat(searchParams.get("bbX") ?? "50");
  const bbY = parseFloat(searchParams.get("bbY") ?? "50");
  const bbZ = parseFloat(searchParams.get("bbZ") ?? "50");
  const triangleCount = parseInt(searchParams.get("triangleCount") ?? "10000");
  const needsSupport = searchParams.get("needsSupport") === "true";

  const metrics: STLMetrics = {
    fileName: "model.stl",
    fileSizeBytes: 0,
    volumeCm3,
    surfaceAreaCm2: 0,
    boundingBoxXMm: bbX,
    boundingBoxYMm: bbY,
    boundingBoxZMm: bbZ,
    triangleCount,
    estimatedPrintHours: 1,
    needsSupport,
  };

  const settings: PrintSettings = {
    material,
    infillDensity: infill,
    layerHeight,
    quantity: 1,
  };

  try {
    const rawOwners = await prisma.printerOwner.findMany({
      where: { isVisible: true, isActive: true },
      include: {
        user: { select: { name: true, city: true, lat: true, lng: true } },
        printers: { where: { isActive: true } },
      },
    });

    const owners = rawOwners as unknown as PrinterOwnerProfile[];
    const matched = matchPrinters(owners, metrics, settings, lat, lng);

    return NextResponse.json({ data: matched });
  } catch (err) {
    console.error("[printers/match/GET]", err);
    return NextResponse.json({ error: "Matching failed" }, { status: 500 });
  }
}
