import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { orderId, printerOwnerId, printQuality, accuracy, packaging, comment } =
      await req.json();

    if (!orderId || !printerOwnerId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    for (const score of [printQuality, accuracy, packaging]) {
      if (typeof score !== "number" || score < 1 || score > 5) {
        return NextResponse.json({ error: "Scores must be between 1 and 5" }, { status: 400 });
      }
    }

    // Weighted composite score: quality 50%, accuracy 35%, packaging 15%
    const compositeScore = printQuality * 0.5 + accuracy * 0.35 + packaging * 0.15;

    const rating = await prisma.rating.create({
      data: {
        orderId,
        printerOwnerId,
        printQuality,
        accuracy,
        packaging,
        compositeScore,
        comment: comment ?? null,
      },
    });

    // Recompute and update the owner's aggregate rating
    const allRatings = await prisma.rating.findMany({
      where: { printerOwnerId },
      select: { compositeScore: true },
    });

    const avgRating =
      allRatings.reduce((s, r) => s + r.compositeScore, 0) / allRatings.length;

    // Owners below 3.5 are hidden from matching
    const isVisible = avgRating >= 3.5;

    await prisma.printerOwner.update({
      where: { id: printerOwnerId },
      data: {
        rating: Math.round(avgRating * 10) / 10,
        totalRatings: allRatings.length,
        isVisible,
      },
    });

    return NextResponse.json({ data: rating });
  } catch (err) {
    console.error("[ratings/POST]", err);
    return NextResponse.json({ error: "Failed to submit rating" }, { status: 500 });
  }
}
