import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRazorpay } from "@/lib/razorpay";

// Plan IDs must be created in Razorpay dashboard first.
// For test mode, create them there and paste IDs here.
const PLAN_IDS: Record<string, string> = {
  monthly: process.env.RAZORPAY_PLAN_MONTHLY ?? "plan_monthly_placeholder",
  annual:  process.env.RAZORPAY_PLAN_ANNUAL  ?? "plan_annual_placeholder",
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { plan } = await req.json();
    if (!plan || !PLAN_IDS[plan]) {
      return NextResponse.json({ error: 'plan must be "monthly" or "annual".' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where:  { id: session.user.id },
      select: { name: true, email: true, phone: true, subscription: true },
    });
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

    if (user.subscription?.status === "active") {
      return NextResponse.json({ error: "You already have an active subscription." }, { status: 400 });
    }

    const rz  = getRazorpay();
    const sub = await rz.subscriptions.create({
      plan_id:         PLAN_IDS[plan],
      total_count:     plan === "annual" ? 1 : 12,
      customer_notify: 1,
      notify_info: {
        notify_email: user.email,
        notify_phone: user.phone ?? "",
      },
    } as Parameters<typeof rz.subscriptions.create>[0]);

    return NextResponse.json({
      data: {
        subscriptionId: sub.id,
        keyId: process.env.RAZORPAY_KEY_ID,
        plan,
        prefill: { name: user.name, email: user.email, contact: user.phone ?? "" },
      },
    });
  } catch (err) {
    console.error("[payments/create-subscription]", err);
    return NextResponse.json({ error: "Failed to create subscription." }, { status: 500 });
  }
}
