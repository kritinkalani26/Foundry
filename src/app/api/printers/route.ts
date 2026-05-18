import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  try {
    const owners = await prisma.printerOwner.findMany({
      where: { isVisible: true, isActive: true },
      include: {
        user: { select: { name: true, city: true, lat: true, lng: true } },
        printers: { where: { isActive: true } },
      },
      orderBy: { rating: "desc" },
    });
    return NextResponse.json({ data: owners });
  } catch (err) {
    console.error("[printers/GET]", err);
    return NextResponse.json({ error: "Failed to fetch printers" }, { status: 500 });
  }
}
