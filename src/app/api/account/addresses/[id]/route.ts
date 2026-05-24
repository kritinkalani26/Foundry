import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const address = await prisma.address.findUnique({ where: { id: params.id } });
  if (!address || address.userId !== session.user.id)
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  try {
    const body = await req.json();
    const { isDefault, ...rest } = body;

    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: session.user.id },
        data:  { isDefault: false },
      });
    }

    const updated = await prisma.address.update({
      where: { id: params.id },
      data: { ...rest, ...(isDefault !== undefined ? { isDefault } : {}) },
    });
    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error("[addresses/PATCH]", err);
    return NextResponse.json({ error: "Failed to update address." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const address = await prisma.address.findUnique({ where: { id: params.id } });
  if (!address || address.userId !== session.user.id)
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  await prisma.address.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
