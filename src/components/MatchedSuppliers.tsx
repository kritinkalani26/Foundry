"use client";

import { useState, useEffect } from "react";
import { MapPin, Star, Clock, TrendingUp, CheckCircle, Loader2 } from "lucide-react";

interface Supplier {
  id: string;
  businessName: string;
  description: string;
  rating: number;
  totalRatings: number;
  surgeMultiplier: number;
  distanceKm: number;
  score: number;
  distScore: number;
  ratingScore: number;
  priceScore: number;
  turnaroundDays: number;
}

interface Props {
  serviceKey: string;
  estimatedPrice: number;
  customerCity?: string;
  onSelect: (supplierId: string) => void;
}

export default function MatchedSuppliers({ serviceKey, estimatedPrice, customerCity, onSelect }: Props) {
  const [suppliers, setSuppliers] = useState<(Supplier & { quotedPrice: number })[]>([]);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ serviceKey });
    if (customerCity) params.set("city", customerCity);

    fetch(`/api/suppliers/match?${params}`)
      .then(r => r.json())
      .then(data => {
        const base = estimatedPrice || 600;
        const raw: Supplier[] = data.suppliers ?? [];
        const withPrice = raw.map((s, i) => ({
          ...s,
          quotedPrice: Math.round(base * s.surgeMultiplier * (i === 2 ? 0.88 : i === 1 ? 1.05 : 1.0)),
        }));
        setSuppliers(withPrice);
        setIsDemo(data.isDemo ?? false);
      })
      .catch(() => setSuppliers([]))
      .finally(() => setLoading(false));
  }, [serviceKey, customerCity, estimatedPrice]);

  const cheapestId = [...suppliers].sort((a, b) => a.quotedPrice - b.quotedPrice)[0]?.id;
  const nearestId  = [...suppliers].sort((a, b) => a.distanceKm - b.distanceKm)[0]?.id;
  const topRatedId = [...suppliers].sort((a, b) => b.rating - a.rating)[0]?.id;

  function getTag(s: typeof suppliers[0], idx: number): { label: string; color: string; bg: string } | null {
    if (idx === 0) return { label: "Best Match", color: "#fff", bg: "#F97316" };
    if (s.id === cheapestId) return { label: "Cheapest",  color: "#15803D", bg: "#DCFCE7" };
    if (s.id === nearestId)  return { label: "Nearest",   color: "#1D4ED8", bg: "#DBEAFE" };
    if (s.id === topRatedId) return { label: "Top Rated", color: "#92400E", bg: "#FEF3C7" };
    return null;
  }

  async function handleSelect(id: string) {
    setSelecting(id);
    await onSelect(id);
    setSelecting(null);
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0", color: "#9CA3AF" }}>
        <Loader2 size={32} className="spin" style={{ margin: "0 auto 16px" }} />
        <p style={{ fontSize: 15, fontWeight: 600, color: "#6B7280" }}>Finding suppliers near you…</p>
      </div>
    );
  }

  if (suppliers.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0", color: "#9CA3AF" }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: "#6B7280" }}>No suppliers found in your area yet.</p>
        <p style={{ fontSize: 13, marginTop: 8 }}>We&apos;re growing our network — check back soon.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720, margin: "0 auto" }}>
      {isDemo && (
        <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: "10px 16px", fontSize: 12, color: "#92400E", display: "flex", alignItems: "center", gap: 6 }}>
          <MapPin size={12} />
          Demo results — distances shown are calculated from <strong>{customerCity ?? "your city"}</strong>. Real suppliers will appear here once they join your area.
        </div>
      )}

      {suppliers.map((s, idx) => {
        const tag = getTag(s, idx);
        return (
          <div
            key={s.id}
            className="match-card"
            style={idx === 0 ? { borderColor: "#F97316", boxShadow: "0 4px 24px rgba(249,115,22,.18)" } : {}}
          >
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
                  flexShrink: 0, fontSize: 20, fontWeight: 800,
                  color: idx === 0 ? "#fff" : "#C2410C",
                }}>
                  {s.businessName[0]}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                    <p style={{ fontSize: 17, fontWeight: 700, color: "#111827" }}>{s.businessName}</p>
                    {s.surgeMultiplier > 1 && (
                      <span className="badge badge-surge" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <TrendingUp size={10} /> {s.surgeMultiplier}×
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 13, color: "#6B7280", flexWrap: "wrap", marginBottom: 10 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <MapPin size={13} /> {s.distanceKm} km away
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Star size={13} color="#FBBF24" fill="#FBBF24" />
                      <span style={{ fontWeight: 600, color: "#374151" }}>{s.rating.toFixed(1)}</span>
                      <span style={{ color: "#9CA3AF" }}>({s.totalRatings})</span>
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Clock size={13} /> {s.turnaroundDays} day{s.turnaroundDays > 1 ? "s" : ""} turnaround
                    </span>
                  </div>

                  {/* Score breakdown */}
                  <div style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                    {[
                      { label: "📍 Proximity", value: s.distScore,    weight: "40%" },
                      { label: "⭐ Rating",    value: s.ratingScore,  weight: "35%" },
                      { label: "💰 Price",     value: s.priceScore,   weight: "25%" },
                    ].map(({ label, value, weight }) => (
                      <div key={label}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                          <span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>
                            {label} <span style={{ color: "#D1D5DB" }}>·{weight}</span>
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#374151" }}>{Math.round(value * 100)}%</span>
                        </div>
                        <div style={{ height: 5, borderRadius: 99, background: "#F3F4F6" }}>
                          <div style={{ width: `${value * 100}%`, height: "100%", borderRadius: 99, background: "#CBD5E1", transition: "width 0.6s ease" }} />
                        </div>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, paddingTop: 8, borderTop: "1px solid #F3F4F6" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 600 }}>Overall match</span>
                        {tag && idx !== 0 && (
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 8px", borderRadius: 99, color: tag.color, background: tag.bg }}>
                            {tag.label}
                          </span>
                        )}
                      </div>
                      <span style={{
                        fontSize: 15, fontWeight: 800,
                        color: s.score >= 0.8 ? "#15803D" : s.score >= 0.6 ? "#C2410C" : "#6B7280",
                      }}>
                        {Math.round(s.score * 100)}%
                      </span>
                    </div>
                    <div style={{ height: 7, borderRadius: 99, background: "#F3F4F6" }}>
                      <div style={{
                        width: `${s.score * 100}%`, height: "100%", borderRadius: 99,
                        background: s.score >= 0.8 ? "#22C55E" : s.score >= 0.6 ? "#F97316" : "#9CA3AF",
                        transition: "width 0.6s ease",
                      }} />
                    </div>
                  </div>

                  {s.description && (
                    <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.5 }}>{s.description}</p>
                  )}
                </div>

                {/* Price + CTA */}
                <div style={{ flexShrink: 0, textAlign: "right", minWidth: 110 }}>
                  <p style={{ fontSize: 30, fontWeight: 800, color: "#111827", lineHeight: 1 }}>
                    ₹{s.quotedPrice.toLocaleString("en-IN")}
                  </p>
                  <p style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 14, marginTop: 4 }}>estimated</p>
                  <button
                    onClick={() => handleSelect(s.id)}
                    disabled={!!selecting}
                    className="btn btn-md"
                    style={{
                      width: "100%", fontSize: 14,
                      background: idx === 0 ? "#16A34A" : "#F97316",
                      color: "#fff",
                      boxShadow: idx === 0
                        ? "0 4px 12px rgba(22,163,74,.25)"
                        : "0 4px 12px rgba(249,115,22,.25)",
                      opacity: selecting && selecting !== s.id ? 0.6 : 1,
                    }}
                  >
                    {selecting === s.id
                      ? <Loader2 size={15} className="spin" />
                      : (
                        <>
                          <CheckCircle size={15} />
                          {idx === 0 ? "Select — Best Match" : "Select This Space"}
                        </>
                      )
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <p style={{ textAlign: "center", fontSize: 12, color: "#9CA3AF", paddingTop: 8 }}>
        Spaces have 2 hours to confirm. Auto-rematch if rejected.
      </p>
    </div>
  );
}
