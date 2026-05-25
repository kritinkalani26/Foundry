import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const db = prisma as any;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await db.teamMember.findFirst({
    where: { userId: session.user.id },
    include: {
      team: {
        include: {
          members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
        },
      },
    },
  });

  if (!membership) return NextResponse.json({ team: null });
  return NextResponse.json({ team: membership.team, role: membership.role });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check not already in a team
  const existing = await db.teamMember.findFirst({ where: { userId: session.user.id } });
  if (existing) return NextResponse.json({ error: "You are already in a team. Leave it first." }, { status: 400 });

  const { name } = await req.json() as { name: string };
  if (!name?.trim()) return NextResponse.json({ error: "Team name is required" }, { status: 400 });

  const team = await db.team.create({
    data: {
      name: name.trim(),
      createdById: session.user.id,
      members: { create: { userId: session.user.id, role: "ADMIN" } },
    },
    include: { members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } } },
  });

  return NextResponse.json({ team, role: "ADMIN" }, { status: 201 });
}
