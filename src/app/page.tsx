"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Star, ArrowRight, CheckCircle, TrendingUp, Zap } from "lucide-react";

type Category = "all" | "fabrication" | "cutting" | "machining" | "electronics";

const EQUIPMENT = [
  {
    id: "3d-printing",
    name: "3D Printing",
    category: "fabrication" as Category,
    emoji: "🖨️",
    bg: "#FFF7ED",
    accent: "#F97316",
    badge: "FDM · SLA · Resin",
    badgeClass: "badge-orange",
    description: "Additive manufacturing for prototypes, functional parts, models, and custom objects.",
    useCases: ["Prototypes", "Functional parts", "Miniatures", "Dental models", "Cosplay props"],
    materials: ["PLA", "ABS", "PETG", "Resin"],
    startingPrice: 99,
    unit: "per job",
    turnaround: "1–3 days",
    cities: 6,
    href: "/upload",
    cta: "Get 3D Printing Quote",
  },
  {
    id: "laser-cutting",
    name: "Laser Cutting",
    category: "cutting" as Category,
    emoji: "⚡",
    bg: "#EFF6FF",
    accent: "#2563EB",
    badge: "Cutting · Engraving",
    badgeClass: "badge-blue",
    description: "Precision cutting and engraving on wood, acrylic, leather, and fabric with sub-mm accuracy.",
    useCases: ["Custom signs", "Jewelry", "Model parts", "Engravings", "Packaging"],
    materials: ["Wood", "Acrylic", "Leather", "Fabric", "Paper"],
    startingPrice: 150,
    unit: "per job",
    turnaround: "Same day",
    cities: 4,
    href: "/request?service=laser-cutting",
    cta: "Get Laser Cutting Quote",
  },
  {
    id: "cnc-milling",
    name: "CNC Milling",
    category: "machining" as Category,
    emoji: "⚙️",
    bg: "#F5F3FF",
    accent: "#7C3AED",
    badge: "3-Axis · 5-Axis",
    badgeClass: "badge-purple",
    description: "Computer-controlled precision machining for complex parts in metal, wood, and engineering plastics.",
    useCases: ["Mechanical parts", "Molds", "Custom hardware", "Fixtures", "PCB blanks"],
    materials: ["Aluminum", "Wood", "HDPE", "Brass", "MDF"],
    startingPrice: 500,
    unit: "per job",
    turnaround: "2–5 days",
    cities: 3,
    href: "/request?service=cnc-milling",
    cta: "Get CNC Quote",
  },
  {
    id: "lathe",
    name: "Metal & Wood Lathe",
    category: "machining" as Category,
    emoji: "🔩",
    bg: "#FEF2F2",
    accent: "#DC2626",
    badge: "Turning · Shaping",
    badgeClass: "badge-red",
    description: "Precision turning for cylindrical and symmetrical parts — shafts, bushings, custom fasteners.",
    useCases: ["Shafts", "Custom fasteners", "Bushings", "Decorative turning", "Pulleys"],
    materials: ["Steel", "Aluminum", "Brass", "Wood", "Nylon"],
    startingPrice: 300,
    unit: "per hour",
    turnaround: "1–3 days",
    cities: 3,
    href: "/request?service=lathe",
    cta: "Get Lathe Quote",
  },
  {
    id: "water-jet",
    name: "Water Jet Cutting",
    category: "cutting" as Category,
    emoji: "💧",
    bg: "#ECFEFF",
    accent: "#0891B2",
    badge: "No Heat Distortion",
    badgeClass: "badge-blue",
    description: "High-pressure cold cutting for metals, stone, and glass with zero heat-affected zones.",
    useCases: ["Metal brackets", "Stone inlays", "Gaskets", "Complex profiles", "Tile art"],
    materials: ["Steel", "Aluminum", "Stone", "Glass", "Ceramic"],
    startingPrice: 800,
    unit: "per job",
    turnaround: "1–2 days",
    cities: 2,
    href: "/request?service=water-jet",
    cta: "Get Water Jet Quote",
  },
  {
    id: "soldering",
    name: "Electronics & Soldering",
    category: "electronics" as Category,
    emoji: "🔌",
    bg: "#F0FDF4",
    accent: "#16A34A",
    badge: "PCB · Assembly",
    badgeClass: "badge-green",
    description: "Professional soldering stations for PCB assembly, component rework, and electronics prototyping.",
    useCases: ["PCB assembly", "Electronics repair", "SMD rework", "Wiring harnesses"],
    materials: ["PCBs", "SMD Components", "Through-hole", "Wire"],
    startingPrice: 200,
    unit: "per session",
    turnaround: "Same day",
    cities: 5,
    href: "/request?service=soldering",
    cta: "Book a Session",
  },
  {
    id: "vinyl-cutting",
    name: "Vinyl / Sign Cutting",
    category: "cutting" as Category,
    emoji: "✂️",
    bg: "#FEFCE8",
    accent: "#D97706",
    badge: "Stickers · HTV",
    badgeClass: "badge-yellow",
    description: "Precision vinyl and film cutting for stickers, decals, heat-transfer apparel, and custom signage.",
    useCases: ["Stickers", "Vehicle decals", "Heat transfer vinyl", "Window graphics"],
    materials: ["Adhesive vinyl", "HTV fabric", "Transfer film", "Reflective vinyl"],
    startingPrice: 100,
    unit: "per job",
    turnaround: "Same day",
    cities: 5,
    href: "/request?service=vinyl-cutting",
    cta: "Get Vinyl Quote",
  },
  {
    id: "pcb-fabrication",
    name: "PCB Fabrication",
    category: "electronics" as Category,
    emoji: "🟢",
    bg: "#F0FDF4",
    accent: "#059669",
    badge: "Single · Multi-layer",
    badgeClass: "badge-green",
    description: "Custom circuit board fabrication from Gerber files. Single-sided, double-sided, and multi-layer boards.",
    useCases: ["Custom PCBs", "Arduino shields", "IoT boards", "Power electronics"],
    materials: ["FR4 fiberglass", "Copper", "Solder mask", "ENIG finish"],
    startingPrice: 500,
    unit: "per board",
    turnaround: "2–4 days",
    cities: 3,
    href: "/request?service=pcb-fabrication",
    cta: "Get PCB Quote",
  },
];

const DEMO_SPACES = [
  {
    id: "1", initials: "M",
    name: "MakerSpace Indore", city: "Indore", state: "MP",
    rating: 4.8, reviews: 234,
    equipment: ["3d-printing", "laser-cutting", "soldering", "vinyl-cutting"],
    tier: "Full Service", tierClass: "badge-orange",
  },
  {
    id: "2", initials: "F",
    name: "FabLab Kota", city: "Kota", state: "Rajasthan",
    rating: 4.6, reviews: 112,
    equipment: ["3d-printing", "cnc-milling", "lathe", "soldering"],
    tier: "Engineering Focus", tierClass: "badge-purple",
  },
  {
    id: "3", initials: "P",
    name: "Patna Makers", city: "Patna", state: "Bihar",
    rating: 4.3, reviews: 56,
    equipment: ["3d-printing", "laser-cutting", "vinyl-cutting"],
    tier: "Starter Space", tierClass: "badge-blue",
  },
  {
    id: "4", initials: "N",
    name: "Nagpur FabHub", city: "Nagpur", state: "MH",
    rating: 4.6, reviews: 89,
    equipment: ["cnc-milling", "water-jet", "3d-printing"],
    tier: "Industrial", tierClass: "badge-red",
  },
  {
    id: "5", initials: "B",
    name: "Bhopal Makers", city: "Bhopal", state: "MP",
    rating: 4.4, reviews: 67,
    equipment: ["3d-printing", "laser-cutting", "pcb-fabrication", "soldering"],
    tier: "Full Service", tierClass: "badge-orange",
  },
];

const CATEGORIES: { key: Category; label: string; emoji: string }[] = [
  { key: "all",         label: "All Services",        emoji: "🏭" },
  { key: "fabrication", label: "3D Fabrication",      emoji: "🖨️" },
  { key: "cutting",     label: "Cutting & Engraving", emoji: "⚡" },
  { key: "machining",   label: "Machining",           emoji: "⚙️" },
  { key: "electronics", label: "Electronics",         emoji: "🔌" },
];

const EQUIPMENT_NAMES: Record<string, { name: string; emoji: string; bg: string; accent: string }> =
  Object.fromEntries(EQUIPMENT.map((e) => [e.id, { name: e.name, emoji: e.emoji, bg: e.bg, accent: e.accent }]));

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState<Category>("all");

  const filtered = activeCategory === "all"
    ? EQUIPMENT
    : EQUIPMENT.filter((e) => e.category === activeCategory);

  return (
    <div style={{ minHeight: "100vh" }}>

      {/* ── HERO ── */}
      <section style={{
        background: "linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)",
        padding: "88px 0 72px",
        borderBottom: "4px solid #F97316",
      }}>
        <div className="container">
          <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>

            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.3)",
              borderRadius: 999, padding: "6px 18px", marginBottom: 28,
              fontSize: 13, fontWeight: 700, color: "#FB923C",
            }}>
              <Zap size={14} /> India&apos;s Makerspace Marketplace
            </div>

            <h1 style={{
              fontSize: "clamp(36px, 6vw, 64px)",
              fontWeight: 800, color: "#fff",
              lineHeight: 1.1, marginBottom: 24,
              letterSpacing: "-0.02em",
            }}>
              Every tool.<br />
              <span style={{ color: "#F97316" }}>Every city.</span><br />
              One platform.
            </h1>

            <p style={{
              fontSize: 18, color: "#94A3B8", lineHeight: 1.75,
              marginBottom: 40, maxWidth: 540, margin: "0 auto 40px",
            }}>
              Book time on 3D printers, laser cutters, CNC mills, lathes, water jets,
              and more — from verified maker spaces across India&apos;s tier-2 cities.
            </p>

            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 56 }}>
              <a
                href="#services"
                className="btn btn-primary btn-lg"
                style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
              >
                Browse All Services <ArrowRight size={16} />
              </a>
              <Link
                href="/printers"
                className="btn btn-outline btn-lg"
                style={{
                  color: "#fff", borderColor: "rgba(255,255,255,0.2)",
                  background: "rgba(255,255,255,0.06)",
                }}
              >
                Find Spaces Near Me
              </Link>
            </div>

            {/* Service emoji strip */}
            <div style={{
              display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap",
              borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 32,
            }}>
              {EQUIPMENT.map((eq) => (
                <Link
                  key={eq.id}
                  href={eq.href}
                  style={{
                    display: "flex", alignItems: "center", gap: 7,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 999, padding: "8px 16px",
                    fontSize: 13, fontWeight: 600, color: "#CBD5E1",
                    textDecoration: "none",
                    transition: "background 0.15s, border-color 0.15s",
                  }}
                  className="hero-service-pill"
                >
                  <span>{eq.emoji}</span>
                  <span>{eq.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section style={{ background: "#1E293B", padding: "28px 0" }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, textAlign: "center" }}>
            {[
              { n: "8",    label: "Equipment Types" },
              { n: "72+",  label: "Maker Spaces" },
              { n: "6",    label: "Cities" },
              { n: "₹99",  label: "Starting Price" },
            ].map(({ n, label }) => (
              <div key={label}>
                <div style={{ fontSize: 30, fontWeight: 800, color: "#FB923C" }}>{n}</div>
                <div style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES GRID ── */}
      <section id="services" className="section section-gray">
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 className="section-title">What can we make for you?</h2>
            <p className="section-sub" style={{ margin: "0 auto 36px" }}>
              All equipment types, all in one place
            </p>

            {/* Category filter */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              {CATEGORIES.map(({ key, label, emoji }) => {
                const isActive = activeCategory === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveCategory(key)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 7,
                      padding: "9px 20px", borderRadius: 999, fontSize: 14, fontWeight: 600,
                      border: isActive ? "2px solid #F97316" : "2px solid #E5E7EB",
                      background: isActive ? "#F97316" : "#fff",
                      color: isActive ? "#fff" : "#6B7280",
                      cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                      boxShadow: isActive ? "0 2px 12px rgba(249,115,22,.25)" : "none",
                    }}
                  >
                    <span>{emoji}</span> {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
            gap: 20,
          }}>
            {filtered.map((eq) => (
              <div
                key={eq.id}
                className="equipment-card"
                style={{
                  background: "#fff", border: "1px solid #E5E7EB",
                  borderRadius: 20, overflow: "hidden",
                  display: "flex", flexDirection: "column",
                  transition: "box-shadow 0.2s, transform 0.2s",
                }}
              >
                {/* Card header */}
                <div style={{ background: eq.bg, padding: "24px 24px 20px", borderBottom: "1px solid #F3F4F6" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
                    <div style={{
                      width: 58, height: 58, borderRadius: 16, fontSize: 26,
                      background: "#fff", border: `2px solid ${eq.accent}25`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      {eq.emoji}
                    </div>
                    <span className={`badge ${eq.badgeClass}`}>{eq.badge}</span>
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: "#111827", marginBottom: 8 }}>{eq.name}</h3>
                  <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.6 }}>{eq.description}</p>
                </div>

                {/* Card body */}
                <div style={{ padding: "20px 24px", flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Use cases */}
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>What you can make</p>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {eq.useCases.map((uc) => (
                        <span key={uc} style={{
                          fontSize: 11, fontWeight: 600, padding: "3px 10px",
                          borderRadius: 999, background: "#F3F4F6", color: "#374151",
                        }}>{uc}</span>
                      ))}
                    </div>
                  </div>

                  {/* Materials */}
                  <p style={{ fontSize: 13, color: "#9CA3AF" }}>
                    <span style={{ fontWeight: 700, color: "#6B7280" }}>Materials: </span>
                    {eq.materials.join(" · ")}
                  </p>

                  {/* Price + turnaround */}
                  <div style={{
                    display: "flex", gap: 0, alignItems: "stretch",
                    background: "#F9FAFB", borderRadius: 12, overflow: "hidden",
                    border: "1px solid #F3F4F6",
                  }}>
                    <div style={{ flex: 1, padding: "12px 16px", borderRight: "1px solid #F3F4F6" }}>
                      <p style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em" }}>From</p>
                      <p style={{ fontSize: 20, fontWeight: 800, color: "#111827", marginTop: 2 }}>
                        ₹{eq.startingPrice}
                        <span style={{ fontSize: 11, fontWeight: 400, color: "#9CA3AF" }}>/{eq.unit}</span>
                      </p>
                    </div>
                    <div style={{ flex: 1, padding: "12px 16px" }}>
                      <p style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em" }}>Turnaround</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginTop: 2 }}>{eq.turnaround}</p>
                    </div>
                  </div>

                  {/* Availability */}
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#9CA3AF" }}>
                    <MapPin size={12} />
                    Available in <strong style={{ color: "#374151" }}>{eq.cities} cities</strong>
                  </div>

                  {/* CTA */}
                  <Link
                    href={eq.href}
                    className="btn btn-md btn-primary"
                    style={{ justifyContent: "center", marginTop: "auto" }}
                  >
                    {eq.cta} <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="section section-white">
        <div className="container" style={{ textAlign: "center" }}>
          <h2 className="section-title">One flow for every service</h2>
          <p className="section-sub">Upload a file, describe your job, or both — then let Foundry handle the rest</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 32, marginTop: 48 }}>
            {[
              { n: "1", emoji: "📤", title: "Describe or Upload", desc: "Upload a design file (STL, DXF, SVG, Gerber) or describe your project in plain text. We handle both." },
              { n: "2", emoji: "💰", title: "Get an Instant Quote", desc: "Transparent pricing with full breakdowns — materials, machine time, complexity. No surprises." },
              { n: "3", emoji: "📍", title: "Pick a Space", desc: "Choose from verified maker spaces ranked by proximity, rating, and price." },
              { n: "4", emoji: "🚚", title: "Pay & Track", desc: "Pay via UPI. Track your job live through every stage with photos and timestamps." },
            ].map(({ n, emoji, title, desc }) => (
              <div key={n} style={{ textAlign: "center" }}>
                <div className="step-icon-wrap">
                  <div className="step-icon" style={{ fontSize: 28 }}>{emoji}</div>
                  <div className="step-num">{n}</div>
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: "#111827", marginBottom: 8 }}>{title}</h3>
                <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.7 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURED SPACES ── */}
      <section className="section section-gray">
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 className="section-title">Featured Maker Spaces</h2>
            <p className="section-sub" style={{ margin: "0 auto" }}>
              Verified spaces with multiple equipment types, ready for your job
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {DEMO_SPACES.map((space) => (
              <div key={space.id} style={{
                background: "#fff", border: "1px solid #E5E7EB",
                borderRadius: 20, padding: "24px 28px",
                display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap",
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                  background: "linear-gradient(135deg, #FED7AA, #FDBA74)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, fontWeight: 800, color: "#C2410C",
                }}>
                  {space.initials}
                </div>

                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 5 }}>
                    <p style={{ fontWeight: 800, fontSize: 15, color: "#111827" }}>{space.name}</p>
                    <span className={`badge ${space.tierClass}`}>{space.tier}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 13, color: "#9CA3AF" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <MapPin size={12} /> {space.city}, {space.state}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Star size={12} color="#FBBF24" fill="#FBBF24" />
                      <strong style={{ color: "#374151" }}>{space.rating}</strong>
                      <span>({space.reviews})</span>
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: 2, minWidth: 240 }}>
                  {space.equipment.map((eid) => {
                    const eq = EQUIPMENT_NAMES[eid];
                    return eq ? (
                      <span key={eid} style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        fontSize: 12, fontWeight: 600,
                        background: eq.bg, color: "#374151",
                        border: `1px solid ${eq.accent}30`,
                        padding: "5px 12px", borderRadius: 8,
                      }}>
                        {eq.emoji} {eq.name}
                      </span>
                    ) : null;
                  })}
                </div>

                <Link
                  href="/printers"
                  className="btn btn-outline btn-md"
                  style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  View Space <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: 32 }}>
            <Link href="/printers" className="btn btn-outline btn-lg" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              View All Maker Spaces <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── CITIES ── */}
      <section className="section section-dark">
        <div className="container" style={{ textAlign: "center" }}>
          <h2 className="section-title section-title-white">
            Built for <span style={{ color: "#FB923C" }}>Tier-2 India</span>
          </h2>
          <p className="section-sub section-sub-white">
            Metro cities have hundreds of maker spaces. Kota, Indore, Patna have almost none.
            Foundry exists specifically for these cities.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            {[
              { city: "Kota",     state: "Rajasthan",      spaces: 12, sub: "1.5L students" },
              { city: "Indore",   state: "Madhya Pradesh", spaces: 18, sub: "2L+ engineers" },
              { city: "Patna",    state: "Bihar",          spaces: 9,  sub: "1L+ students" },
              { city: "Nagpur",   state: "Maharashtra",    spaces: 15, sub: "IIT adjacent" },
              { city: "Bhopal",   state: "Madhya Pradesh", spaces: 11, sub: "NIT city" },
              { city: "Varanasi", state: "Uttar Pradesh",  spaces: 7,  sub: "BHU campus" },
            ].map(({ city, state, spaces, sub }) => (
              <div key={city} className="city-card" style={{ textAlign: "left" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <p className="city-name">{city}</p>
                    <p className="city-state">{state}</p>
                  </div>
                  <span style={{ fontSize: 18 }}>📍</span>
                </div>
                <p className="city-owners">● {spaces} maker spaces</p>
                <p className="city-sub">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST ── */}
      <section className="section section-white">
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 className="section-title">Built for real-world use</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {[
              { emoji: "✅", color: "#F0FDF4", title: "Verified Spaces Only", desc: "Every maker space is manually vetted — equipment inspections, safety standards, and owner certification before listing." },
              { emoji: "⭐", color: "#FEFCE8", title: "Quality-Gated Ratings", desc: "Spaces with composite ratings below 3.5 are hidden. Each job is rated on quality, accuracy, and packaging." },
              { emoji: "🔄", color: "#EFF6FF", title: "7-Stage Job Tracking", desc: "Track every job from submission to delivery with real-time status, photos, and timestamps at each stage." },
              { emoji: "💳", color: "#FFF7ED", title: "Secure UPI Payments", desc: "Pay via UPI through any app. Funds held in escrow until you confirm the job meets your expectations." },
            ].map(({ emoji, color, title, desc }) => (
              <div key={title} className="feature-box" style={{ background: color }}>
                <div className="feature-icon" style={{ background: "#fff", fontSize: 24 }}>{emoji}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: "#111827", marginBottom: 8 }}>{title}</h3>
                <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.7 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── OWNER CTA ── */}
      <section style={{
        background: "linear-gradient(135deg, #F97316 0%, #EF4444 100%)",
        padding: "80px 0", textAlign: "center",
      }}>
        <div className="container">
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(255,255,255,0.15)", borderRadius: 999,
            padding: "6px 18px", marginBottom: 20, fontSize: 13, fontWeight: 700, color: "#fff",
          }}>
            <TrendingUp size={14} /> For Space Owners
          </div>
          <h2 style={{ fontSize: 40, fontWeight: 800, color: "#fff", marginBottom: 12 }}>
            Have equipment? List it on Foundry.
          </h2>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.85)", marginBottom: 36, maxWidth: 480, margin: "0 auto 36px" }}>
            3D printers, laser cutters, CNCs, lathes, soldering stations — earn from idle machine time.
            Average owner earns ₹15,000–₹40,000/month.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/owner" className="btn btn-white btn-xl" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              List My Equipment <ArrowRight size={18} />
            </Link>
            <Link href="/dashboard/owner" className="btn btn-outline btn-lg" style={{
              color: "#fff", borderColor: "rgba(255,255,255,0.4)",
              background: "rgba(255,255,255,0.1)",
            }}>
              Owner Dashboard
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
