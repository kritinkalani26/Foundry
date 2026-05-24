import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadSTLToCloudinary } from "@/lib/cloudinary";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true, name: true, email: true, phone: true,
        role: true, avatarUrl: true, city: true, createdAt: true,
        addresses: { orderBy: { isDefault: "desc" } },
        benefits:  { where: { isActive: true }, orderBy: { createdAt: "asc" } },
        subscription: true,
      },
    });
    return NextResponse.json({ data: user });
  } catch (err) {
    console.error("[profile/GET]", err);
    return NextResponse.json({ error: "Failed to fetch profile." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const ct = req.headers.get("content-type") ?? "";

    let name: string | undefined;
    let phone: string | undefined;
    let avatarUrl: string | undefined;

    if (ct.includes("multipart/form-data")) {
      const form  = await req.formData();
      name        = (form.get("name") as string) ?? undefined;
      phone       = (form.get("phone") as string) ?? undefined;
      const file  = form.get("avatar") as File | null;

      if (file) {
        const buf = Buffer.from(await file.arrayBuffer());
        const { url } = await uploadSTLToCloudinary(buf, `avatar_${session.user.id}`);
        avatarUrl = url;
      }
    } else {
      const body = await req.json();
      name  = body.name;
      phone = body.phone;
    }

    const data: Record<string, unknown> = {};
    if (name?.trim())  data.name  = name.trim();
    if (phone?.trim()) data.phone = phone.trim();
    if (avatarUrl)     data.avatarUrl = avatarUrl;

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: { id: true, name: true, email: true, phone: true, avatarUrl: true },
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error("[profile/PATCH]", err);
    return NextResponse.json({ error: "Failed to update profile." }, { status: 500 });
  }
}
