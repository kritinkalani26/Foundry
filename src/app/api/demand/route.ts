import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { DemandStatus } from "@/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city") ?? "Indore";

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's order count
    const todayMetric = await prisma.demandMetric.findUnique({
      where: { city_date: { city, date: today } },
    });

    // Get last 7 days' counts
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weekMetrics = await prisma.demandMetric.findMany({
      where: {
        city,
        date: { gte: sevenDaysAgo, lt: today },
      },
    });

    const todayCount = todayMetric?.orderCount ?? 0;
    const weeklyTotal = weekMetrics.reduce((s, m) => s + m.orderCount, 0);
    const weeklyAvg = weekMetrics.length > 0 ? weeklyTotal / weekMetrics.length : 5; // default avg

    const ratio = todayCount / Math.max(weeklyAvg, 1);
    const isHighDemand = ratio >= 2.0;

    const result: DemandStatus = { city, isHighDemand, todayCount, weeklyAvg, ratio };
    return NextResponse.json({ data: result });
  } catch (err) {
    console.error("[demand/GET]", err);
    // Return a safe default — don't break the price estimator
    return NextResponse.json({
      data: { city, isHighDemand: false, todayCount: 0, weeklyAvg: 5, ratio: 0 } as DemandStatus,
    });
  }
}
