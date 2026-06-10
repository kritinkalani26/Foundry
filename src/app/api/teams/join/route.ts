import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const db = prisma as any;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await req.json() as { token: string };
  if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

  const invite = await db.teamInvite.findUnique({ where: { token }, include: { team: true } });
  if (!invite) return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
  if (new Date(invite.expiresAt) < new Date()) return NextResponse.json({ error: "Invite has expired" }, { status: 410 });

  // Already an active member of this specific team?
  const activeHere = await db.teamMember.findFirst({
    where: { userId: session.user.id, teamId: invite.teamId, leftAt: null },
  });
  if (activeHere) return NextResponse.json({ error: "You are already in this team" }, { status: 400 });

  // If they were previously in this team and left, reactivate their record
  const existing = await db.teamMember.findFirst({ where: { teamId: invite.teamId, userId: session.user.id } });
  if (existing) {
    await db.teamMember.update({
      where: { id: existing.id },
      data: { leftAt: null, joinedAt: new Date(), role: "MEMBER" },
    });
  } else {
    await db.teamMember.create({ data: { teamId: invite.teamId, userId: session.user.id, role: "MEMBER" } });
  }

  return NextResponse.json({ teamId: invite.teamId, teamName: invite.team.name });
}
