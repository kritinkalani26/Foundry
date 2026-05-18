"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Star, Printer, TrendingUp, ArrowRight } from "lucide-react";

const DEMO_OWNERS = [
  {
    id: "1", initials: "M", name: "MakerSpace Indore", city: "Indore", state: "Madhya Pradesh",
    rating: 4.8, reviews: 234, surge: false,
    description: "Professional FDM and resin printing with 5 years of experience. Specialty: engineering prototypes, functional parts, and cosplay props.",
    printers: [
      { type: "FDM", materials: ["PLA", "ABS", "PETG"], volume: "220×220×250mm" },
      { type: "FDM", materials: ["PLA", "ABS"], volume: "300×300×400mm" },
    ],
    badge: "Top Rated",
    badgeClass: "badge-yellow",
  },
  {
    id: "2", initials: "3", name: "3D Print Hub Kota", city: "Kota", state: "Rajasthan",
    rating: 4.5, reviews: 89, surge: true,
    description: "Serving Kota's 1.5 lakh engineering students since 2021. Specialise in quick-turnaround project models before exams.",
    printers: [
      { type: "SLA", materials: ["Resin"], volume: "195×120×245mm" },
      { type: "FDM", materials: ["PLA", "PETG"], volume: "220×220×250mm" },
    ],
    badge: "High Demand",
    badgeClass: "badge-red",
  },
  {
    id: "3", initials: "P", name: "Patna Makers", city: "Patna", state: "Bihar",
    rating: 4.3, reviews: 56, surge: false,
    description: "First professional 3D printing studio in Patna. Large-format FDM prints up to 450mm. Student discount available.",
    printers: [
      { type: "FDM", materials: ["PLA", "ABS"], volume: "450×450×470mm" },
    ],
    badge: "Large Format",
    badgeClass: "badge-blue",
  },
  {
    id: "4", initials: "N", name: "Nagpur 3D Studio", city: "Nagpur", state: "Maharashtra",
    rating: 4.6, reviews: 112, surge: false,
    description: "Premium SLA/Resin printing for dental and jewelry applications. FDM also available for general use.",
    printers: [
      { type: "SLA", materials: ["Resin"], volume: "145×145×185mm" },
      { type: "FDM", materials: ["PLA", "PETG", "ABS"], volume: "250×210×210mm" },
    ],
    badge: "Resin Specialist",
    badgeClass: "badge-purple",
  },
];

const ALL_CITIES = ["All Cities", "Indore", "Kota", "Patna", "Nagpur", "Bhopal"];

export default function PrintersPage() {
  const [activeCity, setActiveCity] = useState("All Cities");

  const filtered = activeCity === "All Cities"
    ? DEMO_OWNERS
    : DEMO_OWNERS.filter((o) => o.city === activeCity);

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB" }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #F3F4F6" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 24px" }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: "#111827", marginBottom: 8 }}>
            Printer Owners Near You
          </h1>
          <p style={{ color: "#9CA3AF", fontSize: 16, marginBottom: 24 }}>
            Verified professionals across India&apos;s tier-2 cities
          </p>

          {/* City filter buttons */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {ALL_CITIES.map((city) => {
              const isActive = city === activeCity;
              return (
                <button
                  key={city}
                  onClick={() => setActiveCity(city)}
                  style={{
                    padding: "9px 20px", borderRadius: 999,
                    fontSize: 14, fontWeight: 600,
                    border: isActive ? "2px solid #F97316" : "2px solid #E5E7EB",
                    background: isActive ? "#F97316" : "#fff",
                    color: isActive ? "#fff" : "#6B7280",
                    cursor: "pointer", fontFamily: "inherit",
                    transition: "all 0.15s",
                    boxShadow: isActive ? "0 2px 12px rgba(249,115,22,.25)" : "none",
                  }}
                >
                  {city}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>
        <p style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 20 }}>
          {filtered.length} printer owner{filtered.length !== 1 ? "s" : ""} · sorted by rating
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {filtered.map((owner) => (
            <div key={owner.id} className="owner-card" style={{ padding: 28 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
                {/* Avatar — bigger */}
                <div style={{
                  width: 68, height: 68, borderRadius: 18,
                  background: "linear-gradient(135deg, #FED7AA, #FDBA74)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, fontSize: 26, fontWeight: 800, color: "#C2410C",
                }}>
                  {owner.initials}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>{owner.name}</h2>
                    <span className={`badge ${owner.badgeClass}`}>{owner.badge}</span>
                    {owner.surge && (
                      <span className="badge badge-surge" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <TrendingUp size={10} /> 1.2× Surge
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 13, color: "#9CA3AF", marginBottom: 10 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <MapPin size={13} />
                      {owner.city}, {owner.state}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <Star size={13} color="#FBBF24" fill="#FBBF24" />
                      <span style={{ fontWeight: 700, color: "#374151" }}>{owner.rating}</span>
                      <span>({owner.reviews} reviews)</span>
                    </span>
                  </div>

                  <p style={{ color: "#6B7280", fontSize: 14, lineHeight: 1.6, marginBottom: 14 }}>
                    {owner.description}
                  </p>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {owner.printers.map((p, i) => (
                      <div key={i} className="printer-chip">
                        <Printer size={12} color="#9CA3AF" />
                        <span className="printer-chip-label">{p.type}</span>
                        <span style={{ color: "#D1D5DB" }}>·</span>
                        <span style={{ color: "#6B7280" }}>{p.materials.join(", ")}</span>
                        <span style={{ color: "#D1D5DB" }}>·</span>
                        <span style={{ color: "#9CA3AF" }}>{p.volume}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA — prominent orange */}
                <div style={{ flexShrink: 0, textAlign: "right" }}>
                  <p style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 4 }}>Starting from</p>
                  <p style={{ fontSize: 28, fontWeight: 800, color: "#111827", marginBottom: 14 }}>₹99</p>
                  <Link
                    href="/upload"
                    className="btn btn-primary btn-md"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14 }}
                  >
                    Get Quote <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#9CA3AF" }}>
            <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No printers in {activeCity} yet</p>
            <p style={{ fontSize: 14 }}>Try a different city or check back soon</p>
          </div>
        )}

        {/* Join CTA */}
        <div style={{
          marginTop: 48,
          background: "linear-gradient(135deg, #F97316 0%, #EF4444 100%)",
          borderRadius: 24, padding: "48px 40px", textAlign: "center", color: "#fff",
        }}>
          <h3 style={{ fontSize: 26, fontWeight: 800, marginBottom: 10 }}>Own a 3D Printer?</h3>
          <p style={{ color: "rgba(255,255,255,0.85)", marginBottom: 28, maxWidth: 440, margin: "0 auto 28px", fontSize: 15, lineHeight: 1.6 }}>
            Join Foundry as a verified space owner. Average owner earns ₹15,000–₹40,000/month from idle machine time.
          </p>
          <Link
            href="/owner"
            className="btn btn-white btn-lg"
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            List My Printer <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
