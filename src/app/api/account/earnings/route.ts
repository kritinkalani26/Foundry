import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const db = prisma as any;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const owner = await prisma.printerOwner.findUnique({
      where: { userId: session.user.id },
      select: { id: true, totalEarned: true, pendingPayout: true },
    });

    if (!owner) return NextResponse.json({ error: "Not a printer owner." }, { status: 403 });

    const quotes: Array<{
      price: number; createdAt: Date;
      order: {
        id: string; status: string; totalPrice: number | null; estimatedPrice: number | null;
        platformFee: number | null; ownerPayout: number | null;
        payoutStatus: string | null; paymentStatus: string | null; createdAt: Date;
        stlAnalysis: { fileName: string } | null;
        customer:    { name: string };
      };
    }> = await db.quote.findMany({
      where:   { printerOwnerId: owner.id, isAccepted: true },
      orderBy: { createdAt: "desc" },
      include: {
        order: {
          select: {
            id: true, status: true, totalPrice: true, estimatedPrice: true,
            platformFee: true, ownerPayout: true, payoutStatus: true,
            paymentStatus: true, createdAt: true,
            stlAnalysis: { select: { fileName: true } },
            customer:    { select: { name: true } },
          },
        },
      },
    });

    const orders = quotes.map(q => ({
      orderId:       q.order.id,
      fileName:      q.order.stlAnalysis?.fileName ?? `Order ${q.order.id.slice(-6)}`,
      customerName:  q.order.customer.name,
      status:        q.order.status,
      paymentStatus: q.order.paymentStatus,
      payoutStatus:  q.order.payoutStatus,
      totalPrice:    q.order.totalPrice ?? q.order.estimatedPrice ?? q.price,
      ownerPayout:   q.order.ownerPayout ?? parseFloat((q.price * 0.85).toFixed(2)),
      platformFee:   q.order.platformFee ?? parseFloat((q.price * 0.15).toFixed(2)),
      createdAt:     q.order.createdAt,
    }));

    return NextResponse.json({
      data: {
        totalEarned:   owner.totalEarned,
        pendingPayout: owner.pendingPayout,
        orders,
      },
    });
  } catch (err) {
    console.error("[account/earnings]", err);
    return NextResponse.json({ error: "Failed to load earnings." }, { status: 500 });
  }
}
