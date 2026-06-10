import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const db = prisma as any;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Collect all active team IDs for this user
  const memberships = await db.teamMember.findMany({
    where: { userId: session.user.id, leftAt: null },
    select: { teamId: true },
  });
  const teamIds = memberships.map((m: { teamId: string }) => m.teamId);

  const parts = await db.savedPart.findMany({
    where: {
      OR: [
        { userId: session.user.id },
        ...(teamIds.length > 0 ? [{ teamId: { in: teamIds } }] : []),
      ],
    },
    orderBy: { updatedAt: "desc" },
    include: { user: { select: { name: true } } },
  });

  return NextResponse.json(parts);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    name: string;
    process: string;
    material: string;
    estimatedCostInr: number;
    notes?: string;
    assemblyName?: string;
    teamId?: string | null;
  };

  if (!body.name || !body.process || !body.material) {
    return NextResponse.json({ error: "name, process and material are required" }, { status: 400 });
  }

  // Validate teamId belongs to the user if provided
  let teamId: string | null = null;
  if (body.teamId) {
    const member = await db.teamMember.findFirst({
      where: { userId: session.user.id, teamId: body.teamId, leftAt: null },
    });
    teamId = member ? body.teamId : null;
  }

  const existing = await db.savedPart.findFirst({
    where: { userId: session.user.id, name: body.name, process: body.process, material: body.material },
  });

  const part = existing
    ? await db.savedPart.update({
        where: { id: existing.id },
        data: { estimatedCostInr: body.estimatedCostInr, notes: body.notes, assemblyName: body.assemblyName, teamId, updatedAt: new Date() },
      })
    : await db.savedPart.create({
        data: { userId: session.user.id, teamId, name: body.name, process: body.process, material: body.material, estimatedCostInr: body.estimatedCostInr, notes: body.notes, assemblyName: body.assemblyName },
      });

  return NextResponse.json(part, { status: existing ? 200 : 201 });
}
