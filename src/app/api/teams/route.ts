import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const db = prisma as any;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [memberships, pastMemberships] = await Promise.all([
    db.teamMember.findMany({
      where: { userId: session.user.id, leftAt: null },
      include: {
        team: {
          include: {
            members: {
              where: { leftAt: null },
              include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
            },
          },
        },
      },
    }),
    db.teamMember.findMany({
      where: { userId: session.user.id, leftAt: { not: null } },
      include: { team: { select: { id: true, name: true } } },
      orderBy: { leftAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    teams: memberships.map((m: { team: object; role: string }) => ({ team: m.team, role: m.role })),
    pastTeams: pastMemberships.map((m: { team: { id: string; name: string }; role: string; joinedAt: string; leftAt: string }) => ({
      id: m.team.id,
      name: m.team.name,
      role: m.role,
      joinedAt: m.joinedAt,
      leftAt: m.leftAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json() as { name: string };
  if (!name?.trim()) return NextResponse.json({ error: "Team name is required" }, { status: 400 });

  const team = await db.team.create({
    data: {
      name: name.trim(),
      createdById: session.user.id,
      members: { create: { userId: session.user.id, role: "ADMIN" } },
    },
    include: {
      members: {
        where: { leftAt: null },
        include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      },
    },
  });

  return NextResponse.json({ team, role: "ADMIN" }, { status: 201 });
}
