import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRazorpay } from "@/lib/razorpay";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { orderId } = await req.json();
    if (!orderId) return NextResponse.json({ error: "orderId is required." }, { status: 400 });

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: { select: { name: true, email: true, phone: true } } },
    });

    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    if (order.customerId !== session.user.id)
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });

    const amount = order.totalPrice ?? order.estimatedPrice ?? 0;
    if (amount <= 0) return NextResponse.json({ error: "Invalid order amount." }, { status: 400 });

    const rz = getRazorpay();
    const rzOrder = await rz.orders.create({
      amount:   Math.round(amount * 100), // paise
      currency: "INR",
      receipt:  orderId,
      notes:    { foundry_order_id: orderId },
    });

    await prisma.order.update({
      where: { id: orderId },
      data:  { razorpayOrderId: rzOrder.id },
    });

    return NextResponse.json({
      data: {
        rzOrderId:  rzOrder.id,
        amount:     rzOrder.amount,
        currency:   rzOrder.currency,
        keyId:      process.env.RAZORPAY_KEY_ID,
        prefill: {
          name:    order.customer.name,
          email:   order.customer.email,
          contact: order.customer.phone ?? "",
        },
      },
    });
  } catch (err) {
    console.error("[payments/create-order]", err);
    return NextResponse.json({ error: "Failed to create payment order." }, { status: 500 });
  }
}
