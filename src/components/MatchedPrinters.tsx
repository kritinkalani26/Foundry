"use client";

import { useEffect, useState } from "react";
import { MapPin, Star, Clock, TrendingUp, CheckCircle, Loader2 } from "lucide-react";
import type { MatchedPrinter, PrintSettings, PriceBreakdown, STLMetrics } from "@/types";

interface Props {
  metrics: STLMetrics;
  settings: PrintSettings;
  priceBreakdown: PriceBreakdown;
  onSelect: (printerId: string) => void;
}

const DEMO: MatchedPrinter[] = [
  {
    id: "demo-1", businessName: "MakerSpace Indore", description: "Professional FDM printing, 5 years experience",
    rating: 4.8, totalRatings: 234, surgeMultiplier: 1.0,
    distanceKm: 3.2, score: 0.91, quotedPrice: 418, turnaroundDays: 2,
    user: { name: "Rahul Sharma", city: "Indore", lat: 22.72, lng: 75.86 },
    printers: [{ id: "p1", name: "Ender 3 Pro", type: "FDM", isActive: true, maxBuildX: 220, maxBuildY: 220, maxBuildZ: 250, materials: ["PLA", "ABS", "PETG"] }],
  },
  {
    id: "demo-2", businessName: "3D Print Hub", description: "FDM and Resin, quick turnaround",
    rating: 4.5, totalRatings: 89, surgeMultiplier: 1.2,
    distanceKm: 7.8, score: 0.76, quotedPrice: 501, turnaroundDays: 2,
    user: { name: "Priya Patel", city: "Indore", lat: 22.73, lng: 75.88 },
    printers: [{ id: "p2", name: "Photon Mono", type: "RESIN", isActive: true, maxBuildX: 130, maxBuildY: 80, maxBuildZ: 165, materials: ["RESIN"] }],
  },
  {
    id: "demo-3", businessName: "QuickPrint Studio", description: "Budget-friendly FDM prints",
    rating: 4.1, totalRatings: 45, surgeMultiplier: 1.0,
    distanceKm: 14.5, score: 0.58, quotedPrice: 385, turnaroundDays: 3,
    user: { name: "Amit Verma", city: "Indore", lat: 22.71, lng: 75.87 },
    printers: [{ id: "p3", name: "CR-10", type: "FDM", isActive: true, maxBuildX: 300, maxBuildY: 300, maxBuildZ: 400, materials: ["PLA", "ABS"] }],
  },
];

export default function MatchedPrinters({ metrics, settings, onSelect }: Props) {
  const [printers, setPrinters] = useState<MatchedPrinter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({
      lat: "22.7196", lng: "75.8577",
      material: settings.material,
      volumeCm3: metrics.volumeCm3.toString(),
      bbX: metrics.boundingBoxXMm.toString(),
      bbY: metrics.boundingBoxYMm.toString(),
      bbZ: metrics.boundingBoxZMm.toString(),
      infill: settings.infillDensity.toString(),
      layerHeight: settings.layerHeight.toString(),
      triangleCount: metrics.triangleCount.toString(),
      needsSupport: metrics.needsSupport.toString(),
    });
    fetch(`/api/printers/match?${params}`)
      .then((r) => r.json())
      .then((d) => setPrinters(d.data?.length ? d.data : DEMO))
      .catch(() => setPrinters(DEMO))
      .finally(() => setLoading(false));
  }, [metrics, settings]);

  async function handleSelect(id: string) {
    setSelecting(id);
    await onSelect(id);
    setSelecting(null);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: 16 }}>
        <Loader2 size={40} color="#F97316" className="spin" />
        <p style={{ color: "#9CA3AF", fontSize: 15 }}>Finding printer owners near you...</p>
      </div>
    );
  }

  const list = printers.length ? printers : DEMO;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720, margin: "0 auto" }}>
      {list.map((printer, idx) => (
        <div
          key={printer.id}
          className="match-card"
          style={idx === 0 ? { borderColor: "#F97316", boxShadow: "0 4px 24px rgba(249,115,22,.18)" } : {}}
        >
          {/* Best match banner */}
          {idx === 0 && (
            <div className="match-best-banner" style={{ padding: "10px 20px" }}>
              <Star size={14} fill="white" color="white" />
              Best Match — Highest combined score
            </div>
          )}

          <div className="match-body" style={{ padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
              {/* Avatar */}
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: idx === 0
                  ? "linear-gradient(135deg, #F97316, #EF4444)"
                  : "linear-gradient(135deg, #FED7AA, #FDBA74)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                fontSize: 20, fontWeight: 800,
                color: idx === 0 ? "#fff" : "#C2410C",
              }}>
                {(printer.businessName ?? printer.user.name)[0]}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                  <p style={{ fontSize: 17, fontWeight: 700, color: "#111827" }}>
                    {printer.businessName ?? printer.user.name}
                  </p>
                  {printer.surgeMultiplier > 1 && (
                    <span className="badge badge-surge" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <TrendingUp size={10} /> {printer.surgeMultiplier}×
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 13, color: "#6B7280", flexWrap: "wrap", marginBottom: 10 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <MapPin size={13} /> {printer.distanceKm} km away
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Star size={13} color="#FBBF24" fill="#FBBF24" />
                    <span style={{ fontWeight: 600, color: "#374151" }}>{printer.rating.toFixed(1)}</span>
                    <span style={{ color: "#9CA3AF" }}>({printer.totalRatings})</span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Clock size={13} /> {printer.turnaroundDays} day{printer.turnaroundDays > 1 ? "s" : ""} turnaround
                  </span>
                </div>

                {/* Match score bar */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 500 }}>Match score</span>
                    <span style={{
                      fontSize: 13, fontWeight: 700,
                      color: printer.score >= 0.8 ? "#15803D" : printer.score >= 0.6 ? "#C2410C" : "#6B7280"
                    }}>
                      {Math.round(printer.score * 100)}%
                    </span>
                  </div>
                  <div className="match-score-track" style={{ height: 8, borderRadius: 99 }}>
                    <div
                      className="match-score-fill"
                      style={{
                        width: `${printer.score * 100}%`,
                        height: "100%",
                        borderRadius: 99,
                        background: printer.score >= 0.8 ? "#22C55E" : printer.score >= 0.6 ? "#F97316" : "#9CA3AF",
                        transition: "width 0.6s ease",
                      }}
                    />
                  </div>
                </div>

                {/* Printer chips */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {printer.printers.map((p) => (
                    <span key={p.id} className="printer-chip">
                      <span className="printer-chip-label">{p.type}</span>
                      <span style={{ color: "#9CA3AF" }}>·</span>
                      <span>{p.materials.join("/")}</span>
                    </span>
                  ))}
                </div>

                {/* Description */}
                {printer.description && (
                  <p style={{ fontSize: 13, color: "#6B7280", marginTop: 8, lineHeight: 1.5 }}>
                    {printer.description}
                  </p>
                )}
              </div>

              {/* Price + CTA */}
              <div style={{ flexShrink: 0, textAlign: "right", minWidth: 110 }}>
                <p style={{ fontSize: 30, fontWeight: 800, color: "#111827", lineHeight: 1 }}>
                  ₹{printer.quotedPrice}
                </p>
                <p style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 14, marginTop: 4 }}>estimated</p>
                <button
                  onClick={() => handleSelect(printer.id)}
                  disabled={!!selecting}
                  className="btn btn-md"
                  style={{
                    width: "100%", fontSize: 14,
                    background: idx === 0 ? "#16A34A" : "#F97316",
                    color: "#fff",
                    boxShadow: idx === 0
                      ? "0 4px 12px rgba(22,163,74,.25)"
                      : "0 4px 12px rgba(249,115,22,.25)",
                    opacity: selecting && selecting !== printer.id ? 0.6 : 1,
                  }}
                >
                  {selecting === printer.id
                    ? <Loader2 size={15} className="spin" />
                    : (
                      <>
                        <CheckCircle size={15} />
                        {idx === 0 ? "Select — Best Match" : "Select This Printer"}
                      </>
                    )
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      <p style={{ textAlign: "center", fontSize: 12, color: "#9CA3AF", paddingTop: 8 }}>
        Owners have 2 hours to confirm. Auto-rematch if rejected.
      </p>
    </div>
  );
}
