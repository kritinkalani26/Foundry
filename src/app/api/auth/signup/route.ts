import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

function validatePassword(pw: string): string | null {
  if (pw.length < 8)              return "Password must be at least 8 characters.";
  if (!/\d/.test(pw))             return "Password must contain at least one number.";
  if (!/[^a-zA-Z0-9]/.test(pw))  return "Password must contain at least one special character.";
  return null;
}

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  // Indian: 10 digits (add +91) or 12 digits starting with 91
  if (/^\d{10}$/.test(digits)) return `+91${digits}`;
  if (/^91\d{10}$/.test(digits)) return `+${digits}`;
  // International: allow +XX... format (7-15 digits total)
  if (/^\+?\d{7,15}$/.test(raw.trim())) return raw.trim().startsWith("+") ? raw.trim() : `+${digits}`;
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, role, city, phone } = await req.json();

    if (!name?.trim())    return NextResponse.json({ error: "Name is required." },  { status: 400 });
    if (!email?.trim())   return NextResponse.json({ error: "Email is required." }, { status: 400 });
    if (!password)        return NextResponse.json({ error: "Password is required." }, { status: 400 });

    const pwError = validatePassword(password);
    if (pwError) return NextResponse.json({ error: pwError }, { status: 400 });

    // Normalize phone
    let normalizedPhone: string | undefined;
    if (phone?.trim()) {
      const p = normalizePhone(phone.trim());
      if (!p) return NextResponse.json({ error: "Invalid phone number format." }, { status: 400 });
      normalizedPhone = p;
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });

    if (normalizedPhone) {
      const existingPhone = await prisma.user.findUnique({ where: { phone: normalizedPhone } });
      if (existingPhone) return NextResponse.json({ error: "This phone number is already registered." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name:         name.trim(),
        email:        email.toLowerCase(),
        passwordHash,
        role:         role === "PRINTER_OWNER" ? "PRINTER_OWNER" : "CUSTOMER",
        city:         city?.trim() || null,
        phone:        normalizedPhone ?? null,
      },
    });

    // Seed demo benefits for new users
    await prisma.userBenefit.create({
      data: {
        userId:      user.id,
        type:        "FREE_BUILDS",
        description: "3 Free Build It analyses for new members",
        isActive:    true,
      },
    });

    return NextResponse.json({ ok: true, userId: user.id });
  } catch {
    return NextResponse.json({ error: "Could not create account. Is the database connected?" }, { status: 500 });
  }
}
