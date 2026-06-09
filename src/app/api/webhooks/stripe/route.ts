import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const stripe        = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

  const rawBody = await req.text();
  const sig     = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 401 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi      = event.data.object as Stripe.PaymentIntent;
        const orderId = pi.metadata?.foundry_order_id;
        if (orderId) {
          const amount      = pi.amount_received / 100;
          const platformFee = parseFloat((amount * 0.15).toFixed(2));
          const ownerPayout = parseFloat((amount * 0.85).toFixed(2));

          const order = await prisma.order.findUnique({ where: { id: orderId } });
          if (order) {
            await prisma.order.update({
              where: { id: orderId },
              data: {
                stripePaymentId: pi.id,
                paymentStatus:   "paid",
                totalPrice:      amount,
                platformFee,
                ownerPayout,
                status:          "CONFIRMED",
              },
            });

            await prisma.orderStatusHistory.create({
              data: { orderId, status: "CONFIRMED", note: "Payment confirmed via Stripe" },
            });

            await prisma.paymentEvent.create({
              data: {
                orderId,
                userId:     order.customerId,
                type:       "ORDER_PAID",
                amount,
                currency:   (pi.currency ?? "usd").toUpperCase(),
                provider:   "stripe",
                providerId: pi.id,
              },
            });
          }
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub    = event.data.object as Stripe.Subscription & { current_period_start: number; current_period_end: number };
        const userId = sub.metadata?.foundry_user_id;
        if (userId) {
          const plan  = sub.metadata?.plan ?? "monthly";
          const start = new Date(sub.current_period_start * 1000);
          const end   = new Date(sub.current_period_end   * 1000);

          await prisma.subscription.upsert({
            where:  { userId },
            update: { status: "active", stripeSubId: sub.id, currentPeriodStart: start, currentPeriodEnd: end },
            create: { userId, plan, status: "active", stripeSubId: sub.id, currentPeriodStart: start, currentPeriodEnd: end },
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await prisma.subscription.updateMany({
          where: { stripeSubId: sub.id },
          data:  { status: "cancelled", cancelledAt: new Date() },
        });
        break;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook/stripe]", err);
    return NextResponse.json({ error: "Webhook error." }, { status: 500 });
  }
}
