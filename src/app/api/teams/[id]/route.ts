import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const db = prisma as any;

// Get team orders (all active members' orders)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await db.teamMember.findFirst({ where: { teamId: params.id, userId: session.user.id, leftAt: null } });
  if (!member) return NextResponse.json({ error: "Not in team" }, { status: 403 });

  const members = await db.teamMember.findMany({ where: { teamId: params.id, leftAt: null }, select: { userId: true } });
  const memberIds = members.map((m: { userId: string }) => m.userId);

  const orders = await prisma.order.findMany({
    where: { customerId: { in: memberIds } },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      customer: { select: { name: true } },
      stlAnalysis: { select: { fileName: true } },
    },
  });

  return NextResponse.json(orders);
}

// Leave team (soft-delete)
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db.teamMember.updateMany({
    where: { teamId: params.id, userId: session.user.id, leftAt: null },
    data: { leftAt: new Date() },
  });

  // If no active members remain, delete the team itself
  const remaining = await db.teamMember.count({ where: { teamId: params.id, leftAt: null } });
  if (remaining === 0) await db.team.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
