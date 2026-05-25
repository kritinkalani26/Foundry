import type { StoreInfo } from "@/app/api/analyze-assembly/route";

// Deterministic per-store price estimate based on rating + store ID characters
export function storeEstimate(base: number, store: StoreInfo): number {
  const ratingFactor = 0.82 + (store.rating / 5) * 0.36; // 0.82–1.18
  const seed = (store.id.charCodeAt(store.id.length - 1) + store.id.charCodeAt(0)) % 20;
  const jitter = 0.92 + seed * 0.008; // 0.92–1.07
  return Math.max(50, Math.round((base * ratingFactor * jitter) / 10) * 10);
}
