"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Star, TrendingUp, ArrowRight } from "lucide-react";

// ─── Equipment category config ────────────────────────────────────────────────

const CATEGORIES = [
  { id: "all",             label: "All Services",   emoji: "🏭" },
  { id: "3d-printer",      label: "3D Printing",    emoji: "🖨️" },
  { id: "laser-cutter",    label: "Laser Cutting",  emoji: "⚡" },
  { id: "cnc-mill",        label: "CNC / Router",   emoji: "⚙️" },
  { id: "lathe",           label: "Lathe",          emoji: "🔩" },
  { id: "soldering",       label: "Electronics",    emoji: "🔌" },
  { id: "pcb-fabrication", label: "PCB Fab",        emoji: "🟢" },
  { id: "vinyl-cutter",    label: "Vinyl / Sign",   emoji: "✂️" },
  { id: "water-jet",       label: "Water Jet",      emoji: "💧" },
] as const;

type CategoryId = typeof CATEGORIES[number]["id"];

// ─── Demo spaces ──────────────────────────────────────────────────────────────

const DEMO_SPACES = [
  {
    id: "1", initials: "M", name: "MakerSpace Indore", city: "Indore", state: "Madhya Pradesh",
    rating: 4.8, reviews: 234, surge: false,
    description: "Full-service fabrication hub with FDM/SLA printers and a 60W CO₂ laser cutter. Specialises in engineering prototypes, product enclosures, and custom signage.",
    badge: "Top Rated", badgeColor: "#D97706", badgeBg: "#FFFBEB",
    categories: ["3d-printer", "laser-cutter"],
    equipment: [
      { category: "3d-printer",   emoji: "🖨️", label: "FDM Printer",   spec: "220×220×250mm · PLA / ABS / PETG" },
      { category: "3d-printer",   emoji: "🖨️", label: "SLA Printer",   spec: "195×120×245mm · Resin" },
      { category: "laser-cutter", emoji: "⚡", label: "CO₂ Laser",     spec: "600×400mm · 60W · Wood / Acrylic / Leather" },
    ],
    startingFrom: "₹99",
  },
  {
    id: "2", initials: "3", name: "3D Print Hub Kota", city: "Kota", state: "Rajasthan",
    rating: 4.5, reviews: 89, surge: true,
    description: "Serving Kota's 1.5 lakh engineering students since 2021. Quick-turnaround FDM and resin models, same-day delivery on most prints.",
    badge: "High Demand", badgeColor: "#DC2626", badgeBg: "#FEF2F2",
    categories: ["3d-printer"],
    equipment: [
      { category: "3d-printer", emoji: "🖨️", label: "FDM Printer", spec: "220×220×250mm · PLA / PETG" },
      { category: "3d-printer", emoji: "🖨️", label: "Resin Printer", spec: "195×120×245mm · Standard / ABS-like Resin" },
    ],
    startingFrom: "₹99",
  },
  {
    id: "3", initials: "P", name: "Patna Metal Works", city: "Patna", state: "Bihar",
    rating: 4.3, reviews: 56, surge: false,
    description: "Professional CNC milling and metal lathe services. 3-axis VMC up to 500×400×100mm travel. Ideal for custom brackets, shafts, and jigs.",
    badge: "Metal Specialist", badgeColor: "#2563EB", badgeBg: "#EFF6FF",
    categories: ["cnc-mill", "lathe"],
    equipment: [
      { category: "cnc-mill", emoji: "⚙️", label: "3-Axis CNC Mill",  spec: "500×400×100mm · Aluminum / Steel / Brass" },
      { category: "lathe",    emoji: "🔩", label: "Metal Lathe",       spec: "Ø300mm × 750mm · Steel / Aluminum / Copper" },
    ],
    startingFrom: "₹300/hr",
  },
  {
    id: "4", initials: "N", name: "Nagpur 3D Studio", city: "Nagpur", state: "Maharashtra",
    rating: 4.6, reviews: 112, surge: false,
    description: "Premium SLA/Resin printing for dental, jewelry, and architectural models. High-detail prints at 25µm layer height.",
    badge: "Resin Specialist", badgeColor: "#7C3AED", badgeBg: "#F5F3FF",
    categories: ["3d-printer"],
    equipment: [
      { category: "3d-printer", emoji: "🖨️", label: "SLA Printer (High Res)", spec: "145×145×185mm · 25µm · Dental / Jewelry Resin" },
      { category: "3d-printer", emoji: "🖨️", label: "FDM Printer",            spec: "250×210×210mm · PLA / PETG / ABS" },
    ],
    startingFrom: "₹199",
  },
  {
    id: "5", initials: "B", name: "Bhopal FabLab", city: "Bhopal", state: "Madhya Pradesh",
    rating: 4.4, reviews: 78, surge: false,
    description: "Electronics prototyping and PCB fabrication studio. Reflow oven, hot air rework, and in-house PCB etching up to double-layer boards.",
    badge: "Electronics Hub", badgeColor: "#16A34A", badgeBg: "#F0FDF4",
    categories: ["soldering", "pcb-fabrication"],
    equipment: [
      { category: "soldering",       emoji: "🔌", label: "Reflow Oven + Hot Air",  spec: "Max PCB 300×400mm · SMD / Through-hole" },
      { category: "pcb-fabrication", emoji: "🟢", label: "PCB Fabrication",        spec: "Double-sided · Min trace 0.15mm · FR4" },
    ],
    startingFrom: "₹200/session",
  },
  {
    id: "6", initials: "V", name: "Varanasi Sign Studio", city: "Varanasi", state: "Uttar Pradesh",
    rating: 4.2, reviews: 41, surge: false,
    description: "Laser cutting and vinyl sign making for businesses, events, and personalised gifts. Bulk orders welcome with volume discounts.",
    badge: "Signage Expert", badgeColor: "#0891B2", badgeBg: "#ECFEFF",
    categories: ["laser-cutter", "vinyl-cutter"],
    equipment: [
      { category: "laser-cutter", emoji: "⚡", label: "CO₂ Laser",         spec: "900×600mm · 80W · Wood / Acrylic / MDF" },
      { category: "vinyl-cutter", emoji: "✂️", label: "Roll Vinyl Cutter", spec: "Max 610mm wide · Adhesive / HTV / Reflective" },
    ],
    startingFrom: "₹150/job",
  },
  {
    id: "7", initials: "H", name: "Hyderabad Proto Hub", city: "Hyderabad", state: "Telangana",
    rating: 4.7, reviews: 193, surge: true,
    description: "One-stop prototype shop — 3D printing, CNC routing, and water jet cutting under one roof. Serving startups and R&D teams.",
    badge: "Full Service", badgeColor: "#F97316", badgeBg: "#FFF7ED",
    categories: ["3d-printer", "cnc-mill", "water-jet"],
    equipment: [
      { category: "3d-printer", emoji: "🖨️", label: "FDM Printer (Large)", spec: "300×300×400mm · PLA / ABS / Nylon" },
      { category: "cnc-mill",   emoji: "⚙️", label: "CNC Router",          spec: "1200×900mm · Wood / Acrylic / Aluminium" },
      { category: "water-jet",  emoji: "💧", label: "Water Jet Cutter",     spec: "1500×1000mm · Steel / Stone / Glass" },
    ],
    startingFrom: "₹99",
  },
];

const ALL_CITIES = ["All Cities", ...Array.from(new Set(DEMO_SPACES.map(s => s.city)))];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SpacesPage() {
  const [activeCategory, setActiveCategory] = useState<CategoryId>("all");
  const [activeCity, setActiveCity] = useState("All Cities");

  const filtered = DEMO_SPACES.filter(s => {
    const cityMatch = activeCity === "All Cities" || s.city === activeCity;
    const catMatch  = activeCategory === "all" || s.categories.includes(activeCategory as never);
    return cityMatch && catMatch;
  });

  const activeCat = CATEGORIES.find(c => c.id === activeCategory)!;

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB" }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #F3F4F6" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "40px 24px 28px" }}>
          <h1 style={{ fontSize: 34, fontWeight: 800, color: "#111827", marginBottom: 8 }}>
            Find Makerspace Services
          </h1>
          <p style={{ color: "#9CA3AF", fontSize: 15, marginBottom: 28 }}>
            3D printing, laser cutting, CNC, PCB fabrication & more — verified spaces across India
          </p>

          {/* Equipment category filter */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {CATEGORIES.map(cat => {
              const isActive = cat.id === activeCategory;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    padding: "8px 16px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                    border: isActive ? "2px solid #F97316" : "2px solid #E5E7EB",
                    background: isActive ? "#F97316" : "#fff",
                    color: isActive ? "#fff" : "#6B7280",
                    cursor: "pointer", fontFamily: "inherit",
                    display: "flex", alignItems: "center", gap: 6,
                    transition: "all 0.15s",
                    boxShadow: isActive ? "0 2px 12px rgba(249,115,22,.25)" : "none",
                  }}
                >
                  <span>{cat.emoji}</span> {cat.label}
                </button>
              );
            })}
          </div>

          {/* City filter */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {ALL_CITIES.map(city => {
              const isActive = city === activeCity;
              return (
                <button
                  key={city}
                  onClick={() => setActiveCity(city)}
                  style={{
                    padding: "6px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                    border: isActive ? "2px solid #111827" : "2px solid #E5E7EB",
                    background: isActive ? "#111827" : "#fff",
                    color: isActive ? "#fff" : "#9CA3AF",
                    cursor: "pointer", fontFamily: "inherit",
                    transition: "all 0.15s",
                  }}
                >
                  {city}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "28px 24px" }}>
        <p style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 20 }}>
          {filtered.length} space{filtered.length !== 1 ? "s" : ""} offering {activeCat.label.toLowerCase()} · sorted by rating
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {filtered.map(space => (
            <div key={space.id} className="owner-card" style={{ padding: 28 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
                {/* Avatar */}
                <div style={{
                  width: 64, height: 64, borderRadius: 18,
                  background: "linear-gradient(135deg, #FED7AA, #FDBA74)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, fontSize: 24, fontWeight: 800, color: "#C2410C",
                }}>
                  {space.initials}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Name + badges */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>{space.name}</h2>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, color: space.badgeColor, background: space.badgeBg, border: `1px solid ${space.badgeColor}33` }}>
                      {space.badge}
                    </span>
                    {space.surge && (
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, color: "#DC2626", background: "#FEF2F2", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <TrendingUp size={10} /> 1.2× Surge
                      </span>
                    )}
                  </div>

                  {/* Location + rating */}
                  <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 13, color: "#9CA3AF", marginBottom: 10 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <MapPin size={13} /> {space.city}, {space.state}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <Star size={13} color="#FBBF24" fill="#FBBF24" />
                      <span style={{ fontWeight: 700, color: "#374151" }}>{space.rating}</span>
                      <span>({space.reviews} reviews)</span>
                    </span>
                  </div>

                  <p style={{ color: "#6B7280", fontSize: 14, lineHeight: 1.6, marginBottom: 14 }}>
                    {space.description}
                  </p>

                  {/* Equipment chips */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {space.equipment.map((eq, i) => (
                      <div key={i} style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "5px 12px", borderRadius: 8,
                        background: "#F9FAFB", border: "1px solid #E5E7EB",
                        fontSize: 12, color: "#374151",
                      }}>
                        <span>{eq.emoji}</span>
                        <span style={{ fontWeight: 600 }}>{eq.label}</span>
                        <span style={{ color: "#D1D5DB" }}>·</span>
                        <span style={{ color: "#9CA3AF" }}>{eq.spec}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <div style={{ flexShrink: 0, textAlign: "right" }}>
                  <p style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 4 }}>Starting from</p>
                  <p style={{ fontSize: 24, fontWeight: 800, color: "#111827", marginBottom: 14 }}>{space.startingFrom}</p>
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
            <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
              No {activeCat.label.toLowerCase()} spaces in {activeCity} yet
            </p>
            <p style={{ fontSize: 14 }}>Try a different category or city — more spaces are joining weekly</p>
          </div>
        )}

        {/* Join CTA */}
        <div style={{
          marginTop: 48,
          background: "linear-gradient(135deg, #F97316 0%, #EF4444 100%)",
          borderRadius: 24, padding: "48px 40px", textAlign: "center", color: "#fff",
        }}>
          <h3 style={{ fontSize: 26, fontWeight: 800, marginBottom: 10 }}>Own Makerspace Equipment?</h3>
          <p style={{ color: "rgba(255,255,255,0.85)", maxWidth: 480, margin: "0 auto 28px", fontSize: 15, lineHeight: 1.6 }}>
            3D printers, laser cutters, CNCs, lathes, soldering stations — list any equipment and earn from idle machine time. Average owner earns ₹15,000–₹40,000/month.
          </p>
          <Link
            href="/owner"
            className="btn btn-white btn-lg"
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            List My Equipment <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
