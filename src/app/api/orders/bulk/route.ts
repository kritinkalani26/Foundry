import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface BulkOrderItem {
  partName: string;
  process: string;
  material: string;
  estimatedCostInr: number;
  notes?: string;
  storeId?: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as {
    parts: BulkOrderItem[];
    city: string;
    lat?: number;
    lng?: number;
    projectName?: string;
  };

  if (!body.parts || body.parts.length === 0) {
    return NextResponse.json({ error: "No parts provided" }, { status: 400 });
  }
  if (!body.city) {
    return NextResponse.json({ error: "City is required" }, { status: 400 });
  }

  // Map process → material enum (best-effort; default PLA)
  const toMaterial = (mat: string): "PLA" | "ABS" | "PETG" | "RESIN" => {
    const m = mat.toUpperCase();
    if (m.includes("ABS")) return "ABS";
    if (m.includes("PETG")) return "PETG";
    if (m.includes("RESIN")) return "RESIN";
    return "PLA";
  };

  const createdOrders = await Promise.all(
    body.parts.map(part =>
      prisma.order.create({
        data: {
          customerId: session.user.id,
          city: body.city,
          lat: body.lat ?? 0,
          lng: body.lng ?? 0,
          material: toMaterial(part.material),
          notes: `[Assembly: ${body.projectName || "Untitled"}] Part: ${part.partName} | Process: ${part.process} | Material: ${part.material}${part.notes ? ` | ${part.notes}` : ""}`,
          estimatedPrice: part.estimatedCostInr,
          status: "UPLOADED",
        },
        select: { id: true },
      })
    )
  );

  return NextResponse.json({ orderIds: createdOrders.map(o => o.id), count: createdOrders.length });
}
