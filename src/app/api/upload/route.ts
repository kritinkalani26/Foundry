import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadSTLToCloudinary } from "@/lib/cloudinary";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const metricsJson = formData.get("metrics") as string | null;

    if (!file || !metricsJson) {
      return NextResponse.json({ error: "Missing file or metrics" }, { status: 400 });
    }

    const metrics = JSON.parse(metricsJson);

    // Upload STL to Cloudinary
    const buffer = Buffer.from(await file.arrayBuffer());
    const { publicId, url } = await uploadSTLToCloudinary(buffer, file.name);

    // Persist analysis record
    const analysis = await prisma.sTLAnalysis.create({
      data: {
        fileName: metrics.fileName,
        fileSizeBytes: metrics.fileSizeBytes,
        volumeCm3: metrics.volumeCm3,
        surfaceAreaCm2: metrics.surfaceAreaCm2,
        boundingBoxXMm: metrics.boundingBoxXMm,
        boundingBoxYMm: metrics.boundingBoxYMm,
        boundingBoxZMm: metrics.boundingBoxZMm,
        triangleCount: metrics.triangleCount,
        estimatedPrintHours: metrics.estimatedPrintHours,
        needsSupport: metrics.needsSupport,
        cloudinaryPublicId: publicId,
        cloudinaryUrl: url,
      },
    });

    return NextResponse.json({ data: { analysisId: analysis.id, url } });
  } catch (err) {
    console.error("[upload] Error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
