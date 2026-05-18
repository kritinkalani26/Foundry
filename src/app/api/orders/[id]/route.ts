import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        customer: { select: { name: true, email: true } },
        stlAnalysis: true,
        statusHistory: { orderBy: { timestamp: "asc" } },
        quotes: {
          include: {
            printerOwner: {
              include: { user: { select: { name: true, city: true } } },
            },
          },
        },
        rating: true,
      },
    });

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    return NextResponse.json({ data: order });
  } catch (err) {
    console.error("[orders/id/GET]", err);
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}
