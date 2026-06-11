import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCityCoords } from "@/lib/city-coords";

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (/^\d{10}$/.test(digits)) return `+91${digits}`;
  if (/^91\d{10}$/.test(digits)) return `+${digits}`;
  if (/^\+?\d{7,15}$/.test(raw.trim())) return raw.trim().startsWith("+") ? raw.trim() : `+${digits}`;
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    const body = await req.json() as {
      name: string; phone: string; email: string;
      city: string; address: string; pincode?: string;
      equipmentType: string; subtype?: string; model?: string;
      dimX?: string; dimY?: string; dimZ?: string; extraA?: string;
      materials?: string[]; baseRate?: string;
      hoursPerDay?: string; notes?: string;
    };

    const {
      name, phone, email, city, address, pincode,
      equipmentType, subtype, model,
      dimX, dimY, dimZ,
      materials = [], baseRate, hoursPerDay, notes,
    } = body;

    if (!name?.trim())          return NextResponse.json({ error: "Name is required." }, { status: 400 });
    if (!city?.trim())          return NextResponse.json({ error: "City is required." }, { status: 400 });
    if (!address?.trim())       return NextResponse.json({ error: "Business address is required." }, { status: 400 });
    if (!equipmentType?.trim()) return NextResponse.json({ error: "Equipment type is required." }, { status: 400 });

    const coords = getCityCoords(city.trim());
    const businessAddress = [address.trim(), pincode?.trim()].filter(Boolean).join(", ");
    const db = prisma as any;

    // If authenticated, link to the logged-in user's PrinterOwner record
    if (session?.user?.id) {
      const userId = session.user.id;

      // Upsert PrinterOwner
      const owner = await db.printerOwner.upsert({
        where: { userId },
        create: {
          userId,
          businessName:    name.trim(),
          description:     notes?.trim() || null,
          businessAddress,
          businessCity:    city.trim(),
          businessLat:     coords?.lat ?? null,
          businessLng:     coords?.lng ?? null,
          services:        [equipmentType],
        },
        update: {
          businessAddress,
          businessCity: city.trim(),
          businessLat:  coords?.lat ?? null,
          businessLng:  coords?.lng ?? null,
          // Append service if not already present
          services: {
            push: equipmentType,
          },
        },
      });

      // For 3D printers create a proper Printer record
      if (equipmentType === "3d-printer") {
        const printerType =
          subtype?.toLowerCase().includes("sla") || subtype?.toLowerCase().includes("msla") ? "SLA"
          : subtype?.toLowerCase().includes("resin") || subtype?.toLowerCase().includes("dlp") ? "RESIN"
          : "FDM";
        await db.printer.create({
          data: {
            ownerId:   owner.id,
            name:      model?.trim() || `${subtype || "FDM"} Printer`,
            type:      printerType,
            maxBuildX: parseFloat(dimX || "220"),
            maxBuildY: parseFloat(dimY || "220"),
            maxBuildZ: parseFloat(dimZ || "250"),
            materials: materials.length > 0 ? materials : ["PLA", "ABS", "PETG"],
          },
        });
      }

      return NextResponse.json({ ok: true, ownerId: owner.id });
    }

    // Unauthenticated path: look up by email or phone, create a pending record
    const normalizedPhone = phone?.trim() ? normalizePhone(phone.trim()) : null;
    const lookupEmail = email?.toLowerCase().trim();

    let user = lookupEmail ? await db.user.findUnique({ where: { email: lookupEmail } }) : null;
    if (!user && normalizedPhone) {
      user = await db.user.findUnique({ where: { phone: normalizedPhone } });
    }

    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email/phone. Please sign up first, then list your equipment." },
        { status: 404 },
      );
    }

    const owner = await db.printerOwner.upsert({
      where: { userId: user.id },
      create: {
        userId:          user.id,
        businessName:    name.trim(),
        description:     notes?.trim() || null,
        businessAddress,
        businessCity:    city.trim(),
        businessLat:     coords?.lat ?? null,
        businessLng:     coords?.lng ?? null,
        services:        [equipmentType],
      },
      update: {
        businessAddress,
        businessCity: city.trim(),
        businessLat:  coords?.lat ?? null,
        businessLng:  coords?.lng ?? null,
        services:     { push: equipmentType },
      },
    });

    if (equipmentType === "3d-printer") {
      const printerType =
        subtype?.toLowerCase().includes("sla") || subtype?.toLowerCase().includes("msla") ? "SLA"
        : subtype?.toLowerCase().includes("resin") || subtype?.toLowerCase().includes("dlp") ? "RESIN"
        : "FDM";
      await db.printer.create({
        data: {
          ownerId:   owner.id,
          name:      model?.trim() || `${subtype || "FDM"} Printer`,
          type:      printerType,
          maxBuildX: parseFloat(dimX || "220"),
          maxBuildY: parseFloat(dimY || "220"),
          maxBuildZ: parseFloat(dimZ || "250"),
          materials: materials.length > 0 ? materials : ["PLA", "ABS", "PETG"],
        },
      });
    }

    return NextResponse.json({ ok: true, ownerId: owner.id });
  } catch (err) {
    console.error("[supplier/register]", err);
    return NextResponse.json({ error: "Failed to register. Please try again." }, { status: 500 });
  }
}
