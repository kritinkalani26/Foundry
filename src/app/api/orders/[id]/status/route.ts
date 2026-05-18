import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { OrderStatus } from "@/types";

const VALID_STATUSES: OrderStatus[] = [
  "UPLOADED", "QUOTED", "CONFIRMED", "PRINTING", "QUALITY_CHECK", "READY", "DELIVERED",
];

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { status, note } = await req.json() as { status: OrderStatus; note?: string };

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id: params.id } });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    // Compute estimated completion time when transitioning to PRINTING
    let estimatedCompletionAt: Date | undefined;
    if (status === "PRINTING" && order.stlAnalysisId) {
      const analysis = await prisma.sTLAnalysis.findUnique({ where: { id: order.stlAnalysisId } });
      if (analysis) {
        const printHours = analysis.estimatedPrintHours * order.quantity;
        estimatedCompletionAt = new Date(Date.now() + printHours * 60 * 60 * 1000);
      }
    }

    // Update order status and append history
    const [updated] = await prisma.$transaction([
      prisma.order.update({
        where: { id: params.id },
        data: {
          status,
          ...(estimatedCompletionAt ? { estimatedCompletionAt } : {}),
        },
      }),
      prisma.orderStatusHistory.create({
        data: { orderId: params.id, status, note: note ?? null },
      }),
    ]);

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error("[orders/id/status/PATCH]", err);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
