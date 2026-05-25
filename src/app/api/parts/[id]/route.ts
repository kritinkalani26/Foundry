import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const db = prisma as any;

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const part = await db.savedPart.findUnique({ where: { id: params.id } });
  if (!part || part.userId !== session.user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.savedPart.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const part = await db.savedPart.findUnique({ where: { id: params.id } });
  if (!part || part.userId !== session.user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json() as { notes?: string; material?: string; estimatedCostInr?: number };
  const updated = await db.savedPart.update({ where: { id: params.id }, data: { ...body, updatedAt: new Date() } });
  return NextResponse.json(updated);
}
