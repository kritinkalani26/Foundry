/**
 * Transparent algorithmic price estimation for 3D prints.
 *
 * This mimics an ML regression model with interpretable features.
 * When real order data is available, replace with a trained XGBoost/LightGBM
 * model trained on (volume, infill, layer_height, material, triangle_count) → actual_price.
 */

import type { Material, MaterialConfig, PrintSettings, PriceBreakdown, STLMetrics } from "@/types";

// ─────────────────────────────────────────────
// Material cost constants (INR per cm³ of filament)
// ─────────────────────────────────────────────

export const MATERIALS: Record<Material, MaterialConfig> = {
  PLA: {
    label: "PLA",
    costPerCm3: 4.5,
    description: "Most popular, biodegradable, easy to print. Best for prototypes.",
  },
  ABS: {
    label: "ABS",
    costPerCm3: 5.0,
    description: "Durable, heat-resistant. Good for functional parts.",
  },
  PETG: {
    label: "PETG",
    costPerCm3: 6.2,
    description: "Strong, food-safe, flexible. Best of PLA and ABS.",
  },
  RESIN: {
    label: "Resin (SLA)",
    costPerCm3: 12.0,
    description: "Ultra-high detail. Best for miniatures and dental models.",
  },
};

// Machine hourly rate (electricity + depreciation + operator time), INR
const MACHINE_HOURLY_RATE = 65;

// Effective print speed in cm³/hour at 0.2mm layer height
const BASE_PRINT_SPEED_CM3_PER_HOUR = 8;

// Layer height speed multipliers — thicker layers = faster prints
const LAYER_SPEED_MULTIPLIER: Record<string, number> = {
  "0.1": 0.55, // fine: ~55% speed
  "0.2": 1.0,  // standard: baseline
  "0.3": 1.40, // draft: 40% faster
};

/**
 * Calculates a detailed price breakdown for a print job.
 *
 * Formula:
 *   print_time = (volume × infill × 1.2) / (base_speed × layer_multiplier)
 *   material   = volume × infill × cost_per_cm3
 *   time_cost  = print_time × machine_hourly_rate
 *   complexity = +15% if triangle_count > 50,000
 *   support    = +20% of material if support needed
 *   subtotal   = material + time_cost + complexity + support
 *   final      = subtotal × quantity × surge_multiplier
 *   confidence = ±10% band
 */
export function calculatePrice(
  metrics: STLMetrics,
  settings: PrintSettings,
  surgeMultiplier = 1.0,
): PriceBreakdown {
  const material = MATERIALS[settings.material];
  const layerKey = settings.layerHeight.toFixed(1);
  const speedMultiplier = LAYER_SPEED_MULTIPLIER[layerKey] ?? 1.0;
  const effectiveSpeed = BASE_PRINT_SPEED_CM3_PER_HOUR * speedMultiplier;

  // Print time for ONE unit
  const printTimeHours =
    (metrics.volumeCm3 * settings.infillDensity * 1.2) / effectiveSpeed;

  // Material cost for solid infill volume
  const materialCost =
    metrics.volumeCm3 * settings.infillDensity * material.costPerCm3;

  // Time cost (machine rate × hours)
  const timeCost = printTimeHours * MACHINE_HOURLY_RATE;

  // Complexity surcharge for geometrically complex models
  const complexitySurcharge =
    metrics.triangleCount > 50_000 ? (materialCost + timeCost) * 0.15 : 0;

  // Support structure cost — estimated 20% extra material for supports
  const supportCost = metrics.needsSupport
    ? materialCost * 0.20
    : 0;

  const subtotalPerUnit = materialCost + timeCost + complexitySurcharge + supportCost;
  const subtotal = subtotalPerUnit * settings.quantity;

  // Surge pricing applied on top
  const finalPrice = subtotal * surgeMultiplier;

  return {
    materialCost: round(materialCost * settings.quantity),
    timeCost: round(timeCost * settings.quantity),
    complexitySurcharge: round(complexitySurcharge * settings.quantity),
    supportCost: round(supportCost * settings.quantity),
    subtotal: round(subtotal),
    confidenceLow: round(finalPrice * 0.90),
    confidenceHigh: round(finalPrice * 1.10),
    estimatedPrintHours: round(printTimeHours * settings.quantity),
    surgeMultiplier,
    finalPrice: round(finalPrice),
  };
}

function round(n: number, decimals = 2): number {
  return Math.round(n * 10 ** decimals) / 10 ** decimals;
}

export function getLayerHeightLabel(layerHeight: number): string {
  const labels: Record<string, string> = {
    "0.1": "0.1mm — Fine (slow, high detail)",
    "0.2": "0.2mm — Standard (recommended)",
    "0.3": "0.3mm — Draft (fast, lower detail)",
  };
  return labels[layerHeight.toFixed(1)] ?? `${layerHeight}mm`;
}

export function getInfillLabel(infill: number): string {
  const labels: Record<string, string> = {
    "0.15": "15% — Sparse (display models)",
    "0.30": "30% — Standard (recommended)",
    "0.50": "50% — Dense (functional parts)",
    "0.80": "80% — Solid (maximum strength)",
  };
  return labels[infill.toFixed(2)] ?? `${Math.round(infill * 100)}%`;
}
