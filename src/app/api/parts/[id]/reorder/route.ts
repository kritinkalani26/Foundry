import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const db = prisma as any;

const toMaterial = (m: string): "PLA" | "ABS" | "PETG" | "RESIN" => {
  const u = m.toUpperCase();
  if (u.includes("ABS")) return "ABS";
  if (u.includes("PETG")) return "PETG";
  if (u.includes("RESIN")) return "RESIN";
  return "PLA";
};

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const part = await db.savedPart.findUnique({ where: { id: params.id } });
  if (!part) return NextResponse.json({ error: "Part not found" }, { status: 404 });

  // Allow team members to reorder team parts
  if (part.teamId) {
    const member = await db.teamMember.findFirst({ where: { userId: session.user.id, teamId: part.teamId } });
    if (!member && part.userId !== session.user.id) return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  } else if (part.userId !== session.user.id) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  const { city, lat, lng } = await req.json() as { city?: string; lat?: number; lng?: number };

  const order = await prisma.order.create({
    data: {
      customerId: session.user.id,
      city: city || "Mumbai",
      lat: lat ?? 0,
      lng: lng ?? 0,
      material: toMaterial(part.material),
      estimatedPrice: part.estimatedCostInr,
      notes: `Reorder from library: ${part.name} | ${part.process} | ${part.material}${part.assemblyName ? ` | Assembly: ${part.assemblyName}` : ""}`,
      status: "UPLOADED",
    },
  });

  // Update reorder stats
  await db.savedPart.update({
    where: { id: params.id },
    data: { orderCount: { increment: 1 }, lastOrderedAt: new Date() },
  });

  return NextResponse.json({ orderId: order.id });
}
