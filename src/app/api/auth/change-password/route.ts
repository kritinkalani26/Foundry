import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function validatePassword(pw: string): string | null {
  if (pw.length < 8)              return "Password must be at least 8 characters.";
  if (!/\d/.test(pw))             return "Password must contain at least one number.";
  if (!/[^a-zA-Z0-9]/.test(pw))  return "Password must contain at least one special character.";
  return null;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Both current and new password are required." }, { status: 400 });
    }

    const pwErr = validatePassword(newPassword);
    if (pwErr) return NextResponse.json({ error: pwErr }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    });

    if (!user?.passwordHash) return NextResponse.json({ error: "No password set on this account." }, { status: 400 });

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: session.user.id },
      data:  { passwordHash, updatedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[change-password]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
