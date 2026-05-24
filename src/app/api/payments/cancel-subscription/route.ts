import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRazorpay } from "@/lib/razorpay";

export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const sub = await prisma.subscription.findUnique({ where: { userId: session.user.id } });
    if (!sub || sub.status !== "active") {
      return NextResponse.json({ error: "No active subscription found." }, { status: 400 });
    }

    if (sub.razorpaySubId) {
      const rz = getRazorpay();
      await rz.subscriptions.cancel(sub.razorpaySubId, false); // cancel_at_cycle_end
    }

    const updated = await prisma.subscription.update({
      where: { id: sub.id },
      data:  { status: "cancelled", cancelledAt: new Date() },
    });

    await prisma.paymentEvent.create({
      data: {
        userId:     session.user.id,
        type:       "SUB_CANCELLED",
        amount:     0,
        currency:   "INR",
        provider:   "razorpay",
        providerId: sub.razorpaySubId ?? sub.id,
      },
    });

    return NextResponse.json({
      data: {
        status:          updated.status,
        currentPeriodEnd: updated.currentPeriodEnd,
      },
    });
  } catch (err) {
    console.error("[cancel-subscription]", err);
    return NextResponse.json({ error: "Failed to cancel subscription." }, { status: 500 });
  }
}
