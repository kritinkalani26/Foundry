import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const db = prisma as any;

const EQUIPMENT_TYPES = [
  "3d-printer", "cnc-mill", "laser-cutter", "lathe",
  "water-jet", "soldering", "vinyl-cutter", "pcb-fabrication",
];

// GET /api/admin/training-data
// Returns per-equipment datapoint counts so you can see when you have
// enough real data to retrain. Only accessible to ADMIN users.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Count datapoints per equipment type and source
  const rows = await db.priceDataPoint.groupBy({
    by: ["equipment", "source"],
    _count: { id: true },
    orderBy: [{ equipment: "asc" }, { source: "asc" }],
  });

  // Structure into per-equipment summary
  const summary: Record<string, {
    total: number;
    foundry: number;
    scraped: number;
    blendTier: string;
  }> = {};

  for (const eq of EQUIPMENT_TYPES) {
    const eqRows = rows.filter((r: { equipment: string }) => r.equipment === eq);
    const foundry = eqRows
      .filter((r: { source: string }) => r.source === "foundry_quote")
      .reduce((s: number, r: { _count: { id: number } }) => s + r._count.id, 0);
    const scraped = eqRows
      .filter((r: { source: string }) => r.source !== "foundry_quote")
      .reduce((s: number, r: { _count: { id: number } }) => s + r._count.id, 0);
    const total = foundry + scraped;

    summary[eq] = {
      total,
      foundry,
      scraped,
      blendTier:
        total >= 400 ? "real-only" :
        total >= 150 ? "50/50 blend" :
        "synthetic-dominant (need more data)",
    };
  }

  // Total accepted orders with STL analysis (potential datapoints not yet logged)
  const unloggedCount = await prisma.order.count({
    where: {
      acceptedQuoteId: { not: null },
      stlAnalysisId: { not: null },
    },
  });

  return NextResponse.json({
    summary,
    totalDatapoints: rows.reduce(
      (s: number, r: { _count: { id: number } }) => s + r._count.id, 0
    ),
    unloggedOrdersWithGeometry: unloggedCount,
    retrainCommand: "python scripts/export_foundry_data.py && python scripts/retrain_models.py",
  });
}
