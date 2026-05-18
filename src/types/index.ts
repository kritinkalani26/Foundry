// ─────────────────────────────────────────────
// Domain enums (mirror Prisma enums for client use)
// ─────────────────────────────────────────────

export type Role = "CUSTOMER" | "PRINTER_OWNER" | "ADMIN";
export type PrinterType = "FDM" | "SLA" | "RESIN";
export type Material = "PLA" | "ABS" | "PETG" | "RESIN";
export type OrderStatus =
  | "UPLOADED"
  | "QUOTED"
  | "CONFIRMED"
  | "PRINTING"
  | "QUALITY_CHECK"
  | "READY"
  | "DELIVERED";

// ─────────────────────────────────────────────
// STL analysis result (produced by browser parser)
// ─────────────────────────────────────────────

export interface STLMetrics {
  fileName: string;
  fileSizeBytes: number;
  volumeCm3: number;
  surfaceAreaCm2: number;
  boundingBoxXMm: number;
  boundingBoxYMm: number;
  boundingBoxZMm: number;
  triangleCount: number;
  estimatedPrintHours: number;
  needsSupport: boolean;
}

// ─────────────────────────────────────────────
// Price estimation
// ─────────────────────────────────────────────

export interface MaterialConfig {
  label: string;
  costPerCm3: number; // INR per cm³
  description: string;
}

export interface PrintSettings {
  material: Material;
  infillDensity: number;  // 0.15 | 0.30 | 0.50 | 0.80
  layerHeight: number;    // 0.10 | 0.20 | 0.30
  quantity: number;
}

export interface PriceBreakdown {
  materialCost: number;
  timeCost: number;
  complexitySurcharge: number;
  supportCost: number;
  subtotal: number;
  confidenceLow: number;
  confidenceHigh: number;
  estimatedPrintHours: number;
  surgeMultiplier: number;
  finalPrice: number;
}

// ─────────────────────────────────────────────
// Printer matching
// ─────────────────────────────────────────────

export interface PrinterOwnerProfile {
  id: string;
  businessName: string | null;
  description: string | null;
  rating: number;
  totalRatings: number;
  surgeMultiplier: number;
  user: {
    name: string;
    city: string | null;
    lat: number | null;
    lng: number | null;
  };
  printers: Array<{
    id: string;
    name: string;
    type: PrinterType;
    isActive?: boolean;
    maxBuildX: number;
    maxBuildY: number;
    maxBuildZ: number;
    materials: string[];
  }>;
}

export interface MatchedPrinter extends PrinterOwnerProfile {
  distanceKm: number;
  score: number;
  quotedPrice: number;
  turnaroundDays: number;
}

// ─────────────────────────────────────────────
// Order state machine
// ─────────────────────────────────────────────

export interface OrderStatusStep {
  status: OrderStatus;
  label: string;
  description: string;
  timestamp?: string;
}

export const ORDER_STATUS_FLOW: OrderStatusStep[] = [
  { status: "UPLOADED",      label: "File Uploaded",     description: "STL file received and analyzed" },
  { status: "QUOTED",        label: "Quotes Received",   description: "Printer owners have sent quotes" },
  { status: "CONFIRMED",     label: "Order Confirmed",   description: "Payment received, order confirmed" },
  { status: "PRINTING",      label: "Printing",          description: "Your model is being printed" },
  { status: "QUALITY_CHECK", label: "Quality Check",     description: "Post-print quality inspection" },
  { status: "READY",         label: "Ready for Pickup",  description: "Print is ready, photo uploaded" },
  { status: "DELIVERED",     label: "Delivered",         description: "Order successfully delivered" },
];

// ─────────────────────────────────────────────
// API response shapes
// ─────────────────────────────────────────────

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface DemandStatus {
  city: string;
  isHighDemand: boolean;
  todayCount: number;
  weeklyAvg: number;
  ratio: number;
}

// ─────────────────────────────────────────────
// Rating
// ─────────────────────────────────────────────

export interface RatingSubmission {
  orderId: string;
  printerOwnerId: string;
  printQuality: number;
  accuracy: number;
  packaging: number;
  comment?: string;
}
