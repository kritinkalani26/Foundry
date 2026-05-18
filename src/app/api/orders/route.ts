import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadSTLToCloudinary } from "@/lib/cloudinary";
import type { Material } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const metricsJson = formData.get("metrics") as string;
    const settingsJson = formData.get("settings") as string;
    const priceJson = formData.get("priceBreakdown") as string;
    const printerId = formData.get("printerId") as string;
    const lat = parseFloat(formData.get("lat") as string);
    const lng = parseFloat(formData.get("lng") as string);
    const city = formData.get("city") as string;

    const metrics = JSON.parse(metricsJson);
    const settings = JSON.parse(settingsJson);
    const price = JSON.parse(priceJson);

    // Demo: use or create a demo customer
    const customer = await prisma.user.upsert({
      where: { email: "demo@printkaro.in" },
      update: {},
      create: {
        email: "demo@printkaro.in",
        name: "Demo Customer",
        city,
        lat,
        lng,
        role: "CUSTOMER",
      },
    });

    // Upload STL to Cloudinary if file provided
    let analysisId: string | undefined;
    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const { publicId, url } = await uploadSTLToCloudinary(buffer, file.name);

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
      analysisId = analysis.id;
    }

    // Create the order
    const order = await prisma.order.create({
      data: {
        customerId: customer.id,
        stlAnalysisId: analysisId,
        material: settings.material as Material,
        infillDensity: settings.infillDensity,
        layerHeight: settings.layerHeight,
        quantity: settings.quantity,
        estimatedPrice: price.finalPrice,
        city,
        lat,
        lng,
        statusHistory: {
          create: { status: "UPLOADED", note: "Order created from STL upload" },
        },
      },
    });

    // Create a quote from the selected printer owner
    if (printerId && printerId !== "demo-1" && printerId !== "demo-2" && printerId !== "demo-3") {
      const printerOwner = await prisma.printerOwner.findUnique({ where: { id: printerId } });
      if (printerOwner) {
        await prisma.quote.create({
          data: {
            orderId: order.id,
            printerOwnerId: printerId,
            price: price.finalPrice * printerOwner.surgeMultiplier,
            turnaroundDays: 2,
            expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
          },
        });

        // Update order status to QUOTED
        await prisma.orderStatusHistory.create({
          data: { orderId: order.id, status: "QUOTED" },
        });
        await prisma.order.update({
          where: { id: order.id },
          data: { status: "QUOTED" },
        });
      }
    }

    // Track demand metric for the city
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await prisma.demandMetric.upsert({
      where: { city_date: { city, date: today } },
      update: { orderCount: { increment: 1 } },
      create: { city, date: today, orderCount: 1 },
    });

    return NextResponse.json({ data: { id: order.id } });
  } catch (err) {
    console.error("[orders/POST] Error:", err);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId");

  try {
    const orders = await prisma.order.findMany({
      where: customerId ? { customerId } : undefined,
      include: {
        stlAnalysis: { select: { fileName: true, volumeCm3: true } },
        quotes: {
          where: { isAccepted: true },
          include: { printerOwner: { include: { user: { select: { name: true } } } } },
        },
        rating: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ data: orders });
  } catch (err) {
    console.error("[orders/GET] Error:", err);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}
