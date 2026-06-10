/**
 * Printer owner matching algorithm.
 *
 * Scoring weights:
 *   Distance (proximity) : 40%
 *   Owner rating          : 35%
 *   Price (lower = better): 25%
 *
 * Filters applied before scoring:
 *   1. Printer type must support requested material
 *   2. Build volume must fit the model (bounding box check)
 *   3. Owner must be visible (rating >= 3.5) and active
 *   4. Owner must be within 100km
 */

import type { MatchedPrinter, PrinterOwnerProfile, STLMetrics } from "@/types";
import { haversineDistance, normalize } from "./utils";
import { calculatePrice } from "./price-calculator";
import type { PrintSettings } from "@/types";

const MAX_DISTANCE_KM = 100;
const MIN_SCORE_VISIBLE = 3.5;

export function matchPrinters(
  owners: PrinterOwnerProfile[],
  metrics: STLMetrics,
  settings: PrintSettings,
  customerLat: number,
  customerLng: number,
  limit = 5,
): MatchedPrinter[] {
  // Step 1: Filter eligible owners
  const eligible = owners.filter((owner) => {
    if (!owner.user.lat || !owner.user.lng) return false;
    if (owner.rating < MIN_SCORE_VISIBLE) return false;

    const dist = haversineDistance(
      customerLat, customerLng,
      owner.user.lat, owner.user.lng,
    );
    if (dist > MAX_DISTANCE_KM) return false;

    // Check if any printer can handle this material and bounding box
    return owner.printers.some((printer) => {
      const materialOk = printer.materials.includes(settings.material);
      const sizeOk =
        metrics.boundingBoxXMm <= printer.maxBuildX &&
        metrics.boundingBoxYMm <= printer.maxBuildY &&
        metrics.boundingBoxZMm <= printer.maxBuildZ;
      return materialOk && sizeOk && printer.isActive;
    });
  });

  if (eligible.length === 0) return [];

  // Step 2: Compute distances and quoted prices
  const withMetrics = eligible.map((owner) => {
    const distanceKm = haversineDistance(
      customerLat, customerLng,
      owner.user.lat!, owner.user.lng!,
    );
    const priceBreakdown = calculatePrice(metrics, settings, owner.surgeMultiplier);
    return {
      owner,
      distanceKm,
      quotedPrice: priceBreakdown.finalPrice,
    };
  });

  // Step 3: Normalize each dimension across the candidate set
  const distances = withMetrics.map((m) => m.distanceKm);
  const prices = withMetrics.map((m) => m.quotedPrice);
  const ratings = withMetrics.map((m) => m.owner.rating);

  const minDist = Math.min(...distances), maxDist = Math.max(...distances);
  const minPrice = Math.min(...prices), maxPrice = Math.max(...prices);
  const minRating = Math.min(...ratings), maxRating = Math.max(...ratings);

  // Step 4: Score each candidate
  const scored = withMetrics.map(({ owner, distanceKm, quotedPrice }) => {
    // Lower distance is better → invert
    const distScore = 1 - normalize(distanceKm, minDist, maxDist);
    // Higher rating is better
    const ratingScore = normalize(owner.rating, minRating, maxRating);
    // Lower price is better → invert
    const priceScore = 1 - normalize(quotedPrice, minPrice, maxPrice);

    const score = distScore * 0.40 + ratingScore * 0.35 + priceScore * 0.25;

    return {
      ...owner,
      distanceKm: Math.round(distanceKm * 10) / 10,
      score: Math.round(score * 100) / 100,
      distScore: Math.round(distScore * 100) / 100,
      ratingScore: Math.round(ratingScore * 100) / 100,
      priceScore: Math.round(priceScore * 100) / 100,
      quotedPrice: Math.round(quotedPrice),
      turnaroundDays: estimateTurnaround(distanceKm, owner.rating),
    } as MatchedPrinter;
  });

  // Step 5: Sort by score descending and return top N
  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

function estimateTurnaround(distanceKm: number, rating: number): number {
  // Base: 1 day printing + delivery based on distance
  const deliveryDays = distanceKm < 10 ? 1 : distanceKm < 50 ? 2 : 3;
  // Higher rated owners tend to be more efficient
  const efficiencyBonus = rating >= 4.5 ? -0.5 : 0;
  return Math.max(1, Math.round(deliveryDays + 1 + efficiencyBonus));
}
