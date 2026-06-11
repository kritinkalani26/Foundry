import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCityCoords } from "@/lib/city-coords";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json() as {
      serviceKey: string;
      material: string;
      dimensions?: string;
      thickness?: string;
      tolerance?: string;
      quantity?: string;
      description?: string;
      estimatedPrice?: number;
      supplierId?: string;
      city?: string;
      certifications?: string[];
    };

    const {
      serviceKey, material, dimensions, thickness, tolerance,
      quantity, description, estimatedPrice, supplierId,
      city = "Bengaluru", certifications,
    } = body;

    const customerId = session.user.id;
    const coords = getCityCoords(city) ?? { lat: 12.9716, lng: 77.5946 };

    // Encode specs in notes
    const parts: string[] = [`[Service: ${serviceKey}]`];
    if (material)           parts.push(`Material: ${material}`);
    if (dimensions)         parts.push(`Dimensions: ${dimensions}`);
    if (thickness)          parts.push(`Thickness: ${thickness}mm`);
    if (tolerance)          parts.push(`Tolerance: ${tolerance}`);
    if (quantity && quantity !== "1") parts.push(`Qty: ${quantity}`);
    if (certifications?.length) parts.push(`Certs: ${certifications.join(", ")}`);
    if (description)        parts.push(`Desc: ${description}`);
    const notes = parts.join(" | ");

    const db = prisma as any;

    const order = await db.order.create({
      data: {
        customerId,
        notes,
        estimatedPrice: estimatedPrice ?? null,
        city,
        lat: coords.lat,
        lng: coords.lng,
        quantity: parseInt(quantity ?? "1") || 1,
        statusHistory: {
          create: { status: "UPLOADED", note: `${serviceKey} quote request` },
        },
      },
    });

    // Create a quote for real (non-demo) supplier IDs
    if (supplierId && !supplierId.startsWith("sup-demo-")) {
      const printerOwner = await db.printerOwner.findUnique({ where: { id: supplierId } });
      if (printerOwner) {
        await db.quote.create({
          data: {
            orderId: order.id,
            printerOwnerId: supplierId,
            price: estimatedPrice ?? 500,
            turnaroundDays: 2,
            expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
          },
        });
        await db.orderStatusHistory.create({ data: { orderId: order.id, status: "QUOTED" } });
        await db.order.update({ where: { id: order.id }, data: { status: "QUOTED" } });
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await db.demandMetric.upsert({
      where: { city_date: { city, date: today } },
      update: { orderCount: { increment: 1 } },
      create: { city, date: today, orderCount: 1 },
    });

    return NextResponse.json({ data: { id: order.id } });
  } catch (err) {
    console.error("[service-orders/POST] Error:", err);
    return NextResponse.json({ error: "Failed to create service request" }, { status: 500 });
  }
}
