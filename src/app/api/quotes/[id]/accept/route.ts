import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const db = prisma as any;

// Material enum → numeric code (matches ml-predictor.ts and train scripts)
const MATERIAL_CODE: Record<string, number> = { PLA: 0, ABS: 1, PETG: 2, RESIN: 3 };

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: {
        order: {
          include: { stlAnalysis: true },
        },
      },
    });

    if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    if (new Date() > quote.expiresAt) {
      return NextResponse.json({ error: "Quote has expired" }, { status: 400 });
    }

    // Accept this quote and reject all others for the same order
    await prisma.$transaction([
      prisma.quote.update({
        where: { id: params.id },
        data: { isAccepted: true },
      }),
      prisma.quote.updateMany({
        where: { orderId: quote.orderId, id: { not: params.id } },
        data: { isAccepted: false },
      }),
      prisma.order.update({
        where: { id: quote.orderId },
        data: {
          status: "QUOTED",
          acceptedQuoteId: params.id,
          totalPrice: quote.price,
        },
      }),
      prisma.orderStatusHistory.create({
        data: {
          orderId: quote.orderId,
          status: "QUOTED",
          note: `Quote accepted from printer owner ${quote.printerOwnerId}`,
        },
      }),
    ]);

    // Log a PriceDataPoint for ML retraining if we have geometry data
    const order = quote.order;
    if (order?.stlAnalysis && quote.price > 0) {
      const stl = order.stlAnalysis;
      const matCode = MATERIAL_CODE[order.material as string] ?? 0;
      const features = {
        volume_cm3:      stl.volumeCm3,
        infill:          order.infillDensity,
        layer_height_mm: order.layerHeight,
        material_code:   matCode,
        triangle_count:  stl.triangleCount,
        quantity:        order.quantity,
      };

      // Non-blocking — don't fail the accept if this errors
      db.priceDataPoint.create({
        data: {
          equipment: "3d-printer",
          features,
          priceInr: quote.price,
          source: "foundry_quote",
          orderId: order.id,
        },
      }).catch((err: unknown) => {
        console.error("[quotes/accept] PriceDataPoint log failed:", err);
      });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    console.error("[quotes/accept/POST]", err);
    return NextResponse.json({ error: "Failed to accept quote" }, { status: 500 });
  }
}
