import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCityCoords } from "@/lib/city-coords";
import { haversineDistance, normalize } from "@/lib/utils";

const MAX_DISTANCE_KM = 150;
const MIN_RATING = 3.5;

// Fixed offsets so demo suppliers appear within the customer's city
const DEMO_OFFSETS = [
  { dlat:  0.010, dlng:  0.012 },  // ~1.7 km
  { dlat:  0.033, dlng: -0.025 },  // ~5.2 km
  { dlat: -0.061, dlng:  0.047 },  // ~9.8 km
];

const DEMO_BASE = [
  {
    id: "sup-demo-1",
    businessName: "BeMakerHub",
    description: "Full-service fabrication lab — laser cutting, CNC, sheet metal, and more. ISO 9001 certified.",
    rating: 4.7, totalRatings: 187, surgeMultiplier: 1.0, turnaroundOffset: 0,
  },
  {
    id: "sup-demo-2",
    businessName: "FabWorks Studio",
    description: "Precision machining and fabrication for prototypes and small production runs.",
    rating: 4.4, totalRatings: 92, surgeMultiplier: 1.15, turnaroundOffset: 1,
  },
  {
    id: "sup-demo-3",
    businessName: "QuickFab Express",
    description: "Fast-turnaround 2D cutting and engraving at competitive prices.",
    rating: 4.1, totalRatings: 54, surgeMultiplier: 0.9, turnaroundOffset: -1,
  },
];

function estimateTurnaround(distanceKm: number, rating: number): number {
  const deliveryDays = distanceKm < 10 ? 1 : distanceKm < 50 ? 2 : 3;
  const efficiencyBonus = rating >= 4.5 ? -0.5 : 0;
  return Math.max(1, Math.round(deliveryDays + 1 + efficiencyBonus));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const serviceKey  = searchParams.get("serviceKey") ?? "";
  const city        = searchParams.get("city") ?? "";

  const coords = getCityCoords(city);
  const customerLat = coords?.lat ?? 12.9716;
  const customerLng = coords?.lng ?? 77.5946;

  try {
    const db = prisma as any;

    // Fetch all active, visible PrinterOwners
    const owners = await db.printerOwner.findMany({
      where: { isActive: true, isVisible: true },
      include: { user: { select: { lat: true, lng: true, city: true } } },
    });

    // Filter by distance + rating, and (optionally) by service type
    const eligible = owners.filter((o: any) => {
      const lat = o.businessLat ?? o.user?.lat;
      const lng = o.businessLng ?? o.user?.lng;
      if (!lat || !lng) return false;
      if (o.rating < MIN_RATING) return false;
      const dist = haversineDistance(customerLat, customerLng, lat, lng);
      if (dist > MAX_DISTANCE_KM) return false;
      // If services array is populated, check it; otherwise accept any
      if (o.services?.length > 0 && serviceKey) {
        return (o.services as string[]).includes(serviceKey);
      }
      return true;
    });

    if (eligible.length > 0) {
      // Score and rank real suppliers
      const withMetrics = eligible.map((o: any) => {
        const lat = o.businessLat ?? o.user?.lat;
        const lng = o.businessLng ?? o.user?.lng;
        const distanceKm = Math.round(haversineDistance(customerLat, customerLng, lat, lng) * 10) / 10;
        return { ...o, distanceKm };
      });

      const distances = withMetrics.map((m: any) => m.distanceKm);
      const ratings   = withMetrics.map((m: any) => m.rating);
      const minDist = Math.min(...distances), maxDist = Math.max(...distances);
      const minRating = Math.min(...ratings), maxRating = Math.max(...ratings);

      const scored = withMetrics.map((o: any) => {
        const distScore   = 1 - normalize(o.distanceKm, minDist, maxDist);
        const ratingScore = normalize(o.rating, minRating, maxRating);
        const priceScore  = 1 - normalize(o.surgeMultiplier, 0.8, 1.5);
        const score = distScore * 0.40 + ratingScore * 0.35 + priceScore * 0.25;
        return {
          id:              o.id,
          businessName:    o.businessName ?? "Unnamed Space",
          description:     o.description ?? "",
          rating:          o.rating,
          totalRatings:    o.totalRatings,
          surgeMultiplier: o.surgeMultiplier,
          distanceKm:      o.distanceKm,
          score:           Math.round(score * 100) / 100,
          distScore:       Math.round(distScore * 100) / 100,
          ratingScore:     Math.round(ratingScore * 100) / 100,
          priceScore:      Math.round(priceScore * 100) / 100,
          turnaroundDays:  estimateTurnaround(o.distanceKm, o.rating),
        };
      });

      const ranked = scored.sort((a: any, b: any) => b.score - a.score).slice(0, 5);
      return NextResponse.json({ suppliers: ranked, isDemo: false });
    }
  } catch (err) {
    console.error("[suppliers/match]", err);
  }

  // Demo fallback: place suppliers at fixed offsets within the customer's city
  const demo = DEMO_BASE.map((s, i) => {
    const off = DEMO_OFFSETS[i];
    const sLat = customerLat + off.dlat;
    const sLng = customerLng + off.dlng;
    const distanceKm = Math.round(haversineDistance(customerLat, customerLng, sLat, sLng) * 10) / 10;
    return {
      id:              s.id,
      businessName:    s.businessName + (city ? ` ${city}` : ""),
      description:     s.description,
      rating:          s.rating,
      totalRatings:    s.totalRatings,
      surgeMultiplier: s.surgeMultiplier,
      distanceKm,
      score:           i === 0 ? 0.91 : i === 1 ? 0.55 : 0.31,
      distScore:       i === 0 ? 1.0  : i === 1 ? 0.63 : 0.0,
      ratingScore:     i === 0 ? 0.94 : i === 1 ? 0.61 : 0.0,
      priceScore:      i === 0 ? 0.79 : i === 1 ? 0.36 : 1.0,
      turnaroundDays:  Math.max(1, estimateTurnaround(distanceKm, s.rating) + s.turnaroundOffset),
    };
  });

  return NextResponse.json({ suppliers: demo, isDemo: true });
}
