import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const db = prisma as any;

// Remove a member (admin only, can't remove yourself if last admin)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = await req.json() as { userId: string };

  const requester = await db.teamMember.findFirst({ where: { teamId: params.id, userId: session.user.id, leftAt: null } });
  if (!requester) return NextResponse.json({ error: "Not in team" }, { status: 403 });

  if (userId !== session.user.id && requester.role !== "ADMIN") {
    return NextResponse.json({ error: "Only admins can remove members" }, { status: 403 });
  }

  await db.teamMember.updateMany({
    where: { teamId: params.id, userId, leftAt: null },
    data: { leftAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}

// Promote/demote a member (admin only)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId, role } = await req.json() as { userId: string; role: "ADMIN" | "MEMBER" };

  const requester = await db.teamMember.findFirst({ where: { teamId: params.id, userId: session.user.id, leftAt: null, role: "ADMIN" } });
  if (!requester) return NextResponse.json({ error: "Only admins can change roles" }, { status: 403 });

  await db.teamMember.updateMany({ where: { teamId: params.id, userId, leftAt: null }, data: { role } });
  return NextResponse.json({ ok: true });
}
