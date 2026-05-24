import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmailChangeVerification } from "@/lib/email";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { newEmail, password } = await req.json();
    if (!newEmail?.trim() || !password) {
      return NextResponse.json({ error: "New email and password are required." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    });

    if (!user?.passwordHash) return NextResponse.json({ error: "No password on this account." }, { status: 400 });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return NextResponse.json({ error: "Incorrect password." }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { email: newEmail.toLowerCase() } });
    if (existing) return NextResponse.json({ error: "This email is already in use." }, { status: 409 });

    // Send verification (simulated)
    const rawToken = crypto.randomBytes(32).toString("hex");
    await sendEmailChangeVerification(newEmail, rawToken);

    // In production: store pendingEmail + hashedToken, then verify on callback.
    // For now, update directly.
    await prisma.user.update({
      where: { id: session.user.id },
      data:  { email: newEmail.toLowerCase() },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[change-email]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
