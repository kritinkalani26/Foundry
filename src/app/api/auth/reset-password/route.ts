import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

function validatePassword(pw: string): string | null {
  if (pw.length < 8)              return "Password must be at least 8 characters.";
  if (!/\d/.test(pw))             return "Password must contain at least one number.";
  if (!/[^a-zA-Z0-9]/.test(pw))  return "Password must contain at least one special character.";
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();
    if (!token || !password) {
      return NextResponse.json({ error: "Token and new password are required." }, { status: 400 });
    }

    const pwErr = validatePassword(password);
    if (pwErr) return NextResponse.json({ error: pwErr }, { status: 400 });

    // Find users with a non-expired reset token
    const candidates = await prisma.user.findMany({
      where: {
        resetToken:      { not: null },
        resetTokenExpiry: { gt: new Date() },
      },
      select: { id: true, resetToken: true },
    });

    let matchedId: string | null = null;
    for (const c of candidates) {
      if (c.resetToken && await bcrypt.compare(token, c.resetToken)) {
        matchedId = c.id;
        break;
      }
    }

    if (!matchedId) {
      return NextResponse.json({ error: "Reset link is invalid or has expired." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: matchedId },
      data: {
        passwordHash,
        resetToken:      null,
        resetTokenExpiry: null,
        // Invalidate all sessions by bumping updatedAt — NextAuth JWTs issued before this
        // will be stale; with shorter maxAge or session checks this closes the window.
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[reset-password]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
