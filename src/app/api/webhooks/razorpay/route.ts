import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";

function verifySignature(body: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) return false;
  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(body)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function POST(req: NextRequest) {
  const rawBody  = await req.text();
  const sig      = req.headers.get("x-razorpay-signature") ?? "";

  if (!verifySignature(rawBody, sig)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const { event: eventType, payload } = event;

  try {
    // ── Order payment captured ────────────────────────────────────────────
    if (eventType === "payment.captured") {
      const payment = payload.payment?.entity;
      const notes   = payment?.notes ?? {};
      const foundryOrderId = notes.foundry_order_id;

      if (foundryOrderId) {
        const order = await prisma.order.findUnique({ where: { id: foundryOrderId } });
        if (order) {
          const amount      = payment.amount / 100; // paise → rupees
          const platformFee = parseFloat((amount * 0.15).toFixed(2));
          const ownerPayout = parseFloat((amount * 0.85).toFixed(2));

          await prisma.order.update({
            where: { id: foundryOrderId },
            data: {
              razorpayPaymentId: payment.id,
              paymentStatus:     "paid",
              totalPrice:        amount,
              platformFee,
              ownerPayout,
              status:            "CONFIRMED",
            },
          });

          await prisma.orderStatusHistory.create({
            data: { orderId: foundryOrderId, status: "CONFIRMED", note: "Payment confirmed via Razorpay" },
          });

          await prisma.paymentEvent.create({
            data: {
              orderId:    foundryOrderId,
              userId:     order.customerId,
              type:       "ORDER_PAID",
              amount,
              currency:   payment.currency ?? "INR",
              provider:   "razorpay",
              providerId: payment.id,
            },
          });
        }
      }
    }

    // ── Subscription activated ────────────────────────────────────────────
    if (eventType === "subscription.activated" || eventType === "subscription.charged") {
      const sub   = payload.subscription?.entity;
      const subId = sub?.id;
      if (subId) {
        const existing = await prisma.subscription.findFirst({ where: { razorpaySubId: subId } });
        const start    = new Date((sub.current_start ?? Math.floor(Date.now() / 1000)) * 1000);
        const end      = new Date((sub.current_end   ?? Math.floor(Date.now() / 1000) + 30 * 86400) * 1000);

        if (existing) {
          await prisma.subscription.update({
            where: { id: existing.id },
            data: { status: "active", currentPeriodStart: start, currentPeriodEnd: end },
          });
        }
        // If no existing record, the create-subscription webhook (payment.captured) will handle it
      }
    }

    // ── Subscription cancelled ────────────────────────────────────────────
    if (eventType === "subscription.cancelled") {
      const sub   = payload.subscription?.entity;
      const subId = sub?.id;
      if (subId) {
        await prisma.subscription.updateMany({
          where: { razorpaySubId: subId },
          data:  { status: "cancelled", cancelledAt: new Date() },
        });
      }
    }

    // ── Order DELIVERED → release payout (simulated) ──────────────────────
    // This is triggered from order status update, not Razorpay directly.
    // See /api/orders/[id]/status route for actual trigger.

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook/razorpay]", err);
    return NextResponse.json({ error: "Webhook processing error." }, { status: 500 });
  }
}
