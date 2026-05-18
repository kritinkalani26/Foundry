import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { orderId, amount } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // In production: verify payment with Razorpay/Cashfree webhook before confirming
    // For demo: trust the client's success signal

    const [updated] = await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: {
          status: "CONFIRMED",
          totalPrice: amount,
        },
      }),
      prisma.orderStatusHistory.create({
        data: {
          orderId,
          status: "CONFIRMED",
          note: "Payment confirmed via UPI (demo)",
        },
      }),
    ]);

    return NextResponse.json({ data: { orderId: updated.id, status: updated.status } });
  } catch (err) {
    console.error("[payment/POST]", err);
    return NextResponse.json({ error: "Payment confirmation failed" }, { status: 500 });
  }
}
