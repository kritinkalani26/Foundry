import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { orderId, printerOwnerId, price, turnaroundDays, message } = await req.json();

    if (!orderId || !printerOwnerId || !price) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Quotes expire 2 hours from creation
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

    const quote = await prisma.quote.create({
      data: { orderId, printerOwnerId, price, turnaroundDays, message, expiresAt },
    });

    // Update order status to QUOTED if not already
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (order && order.status === "UPLOADED") {
      await prisma.$transaction([
        prisma.order.update({ where: { id: orderId }, data: { status: "QUOTED" } }),
        prisma.orderStatusHistory.create({ data: { orderId, status: "QUOTED" } }),
      ]);
    }

    return NextResponse.json({ data: quote });
  } catch (err) {
    console.error("[quotes/POST]", err);
    return NextResponse.json({ error: "Failed to create quote" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");

  try {
    const quotes = await prisma.quote.findMany({
      where: orderId ? { orderId } : undefined,
      include: { printerOwner: { include: { user: { select: { name: true, city: true } } } } },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ data: quotes });
  } catch (err) {
    console.error("[quotes/GET]", err);
    return NextResponse.json({ error: "Failed to fetch quotes" }, { status: 500 });
  }
}
