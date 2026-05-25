import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const db = prisma as any;

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await db.teamMember.findFirst({ where: { teamId: params.id, userId: session.user.id, role: "ADMIN" } });
  if (!member) return NextResponse.json({ error: "Only team admins can create invites" }, { status: 403 });

  // Expire any old invites and create a fresh one
  await db.teamInvite.deleteMany({ where: { teamId: params.id } });

  const invite = await db.teamInvite.create({
    data: {
      teamId: params.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return NextResponse.json({ inviteUrl: `${baseUrl}/team/join/${invite.token}` });
}
