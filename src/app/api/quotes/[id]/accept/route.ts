import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: { order: true },
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
        data: { orderId: quote.orderId, status: "QUOTED", note: `Quote accepted from printer owner ${quote.printerOwnerId}` },
      }),
    ]);

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    console.error("[quotes/accept/POST]", err);
    return NextResponse.json({ error: "Failed to accept quote" }, { status: 500 });
  }
}
