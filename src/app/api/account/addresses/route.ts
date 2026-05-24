import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const addresses = await prisma.address.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ data: addresses });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { label, lineOne, lineTwo, city, state, pincode, country, lat, lng, isDefault } = body;

    if (!label || !lineOne || !city || !state || !pincode || lat == null || lng == null) {
      return NextResponse.json({ error: "Missing required address fields." }, { status: 400 });
    }

    // If setting as default, clear existing default
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: session.user.id },
        data:  { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        userId: session.user.id,
        label, lineOne, lineTwo, city, state, pincode,
        country: country ?? "India",
        lat, lng,
        isDefault: isDefault ?? false,
      },
    });

    return NextResponse.json({ data: address }, { status: 201 });
  } catch (err) {
    console.error("[addresses/POST]", err);
    return NextResponse.json({ error: "Failed to save address." }, { status: 500 });
  }
}
