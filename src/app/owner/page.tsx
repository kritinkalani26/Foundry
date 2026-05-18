"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle, TrendingUp, Clock, Star, Package, MapPin, DollarSign, BarChart2, ChevronDown } from "lucide-react";

// ─── Equipment catalog ────────────────────────────────────────────────────────

const EQUIPMENT_TYPES = [
  {
    id: "3d-printer",
    emoji: "🖨️",
    label: "3D Printer",
    subtypes: ["FDM", "SLA / MSLA", "Resin (DLP)"],
    dimensionLabels: ["Bed X (mm)", "Bed Y (mm)", "Max Z (mm)"],
    dimensionKeys: ["dimX", "dimY", "dimZ"] as const,
    dimensionPlaceholders: ["220", "220", "250"],
    extraField: null,
    materials: ["PLA", "ABS", "PETG", "TPU", "Resin", "Nylon", "ASA"],
    rateUnit: "per hour",
    rateHint: "₹50–150/hr typical",
  },
  {
    id: "laser-cutter",
    emoji: "⚡",
    label: "Laser Cutter",
    subtypes: ["CO₂ Laser", "Diode Laser", "Fiber Laser"],
    dimensionLabels: ["Bed X (mm)", "Bed Y (mm)", "Power (W)"],
    dimensionKeys: ["dimX", "dimY", "dimZ"] as const,
    dimensionPlaceholders: ["600", "400", "60"],
    extraField: null,
    materials: ["Wood", "Acrylic", "Leather", "Fabric", "Paper", "MDF", "Cardboard", "Anodised Metal"],
    rateUnit: "per job",
    rateHint: "₹150–800/job typical",
  },
  {
    id: "cnc-mill",
    emoji: "⚙️",
    label: "CNC Mill / Router",
    subtypes: ["3-Axis", "4-Axis", "5-Axis", "CNC Router"],
    dimensionLabels: ["X travel (mm)", "Y travel (mm)", "Z travel (mm)"],
    dimensionKeys: ["dimX", "dimY", "dimZ"] as const,
    dimensionPlaceholders: ["500", "400", "100"],
    extraField: { label: "Spindle Speed (RPM)", placeholder: "24000", key: "extraA" },
    materials: ["Aluminum", "Wood", "HDPE", "Brass", "Copper", "MDF", "Acrylic", "Carbon Fibre"],
    rateUnit: "per hour",
    rateHint: "₹300–800/hr typical",
  },
  {
    id: "lathe",
    emoji: "🔩",
    label: "Lathe",
    subtypes: ["Metal Lathe", "Wood Lathe", "Metal & Wood"],
    dimensionLabels: ["Max Diameter (mm)", "Max Length (mm)", ""],
    dimensionKeys: ["dimX", "dimY", "dimZ"] as const,
    dimensionPlaceholders: ["300", "750", ""],
    extraField: { label: "Swing Over Bed (mm)", placeholder: "330", key: "extraA" },
    materials: ["Steel", "Aluminum", "Brass", "Copper", "Cast Iron", "Wood", "Nylon", "Delrin"],
    rateUnit: "per hour",
    rateHint: "₹200–600/hr typical",
  },
  {
    id: "water-jet",
    emoji: "💧",
    label: "Water Jet Cutter",
    subtypes: ["Abrasive Jet", "Pure Water Jet", "Micro Jet"],
    dimensionLabels: ["Cutting X (mm)", "Cutting Y (mm)", "Max Thickness (mm)"],
    dimensionKeys: ["dimX", "dimY", "dimZ"] as const,
    dimensionPlaceholders: ["1500", "1000", "150"],
    extraField: { label: "Pump Pressure (bar)", placeholder: "3800", key: "extraA" },
    materials: ["Steel", "Aluminum", "Titanium", "Stone", "Glass", "Ceramic", "Composites", "Rubber"],
    rateUnit: "per hour",
    rateHint: "₹500–1500/hr typical",
  },
  {
    id: "soldering",
    emoji: "🔌",
    label: "Soldering / Electronics",
    subtypes: ["Manual Soldering", "Reflow Oven", "Hot Air Station", "Wave Soldering"],
    dimensionLabels: ["Max PCB Width (mm)", "Max PCB Length (mm)", ""],
    dimensionKeys: ["dimX", "dimY", "dimZ"] as const,
    dimensionPlaceholders: ["300", "400", ""],
    extraField: { label: "Min Pitch (mm)", placeholder: "0.2", key: "extraA" },
    materials: ["Single-layer PCB", "Double-layer PCB", "Multi-layer PCB", "SMD components", "Through-hole", "Flex PCB"],
    rateUnit: "per session",
    rateHint: "₹200–1000/session typical",
  },
  {
    id: "vinyl-cutter",
    emoji: "✂️",
    label: "Vinyl / Sign Cutter",
    subtypes: ["Desktop Cutter", "Professional Roll Cutter", "Flatbed Cutter"],
    dimensionLabels: ["Max Width (mm)", "Max Length (mm)", ""],
    dimensionKeys: ["dimX", "dimY", "dimZ"] as const,
    dimensionPlaceholders: ["610", "5000", ""],
    extraField: null,
    materials: ["Adhesive Vinyl", "HTV (Heat Transfer)", "Reflective Vinyl", "Printable Vinyl", "Transfer Film", "Flock HTV"],
    rateUnit: "per job",
    rateHint: "₹100–500/job typical",
  },
  {
    id: "pcb-fabrication",
    emoji: "🟢",
    label: "PCB Fabrication",
    subtypes: ["Single-sided", "Double-sided", "Multi-layer (4L)", "Multi-layer (6L+)", "Flex PCB"],
    dimensionLabels: ["Max Board X (mm)", "Max Board Y (mm)", "Min Trace (mm)"],
    dimensionKeys: ["dimX", "dimY", "dimZ"] as const,
    dimensionPlaceholders: ["400", "300", "0.1"],
    extraField: { label: "Min Drill (mm)", placeholder: "0.2", key: "extraA" },
    materials: ["FR4 Standard", "High-Tg FR4", "Aluminium PCB", "Rogers / RF", "Flex (Polyimide)", "Rigid-Flex"],
    rateUnit: "per board",
    rateHint: "₹300–3000/board typical",
  },
] as const;

type EquipmentId = typeof EQUIPMENT_TYPES[number]["id"];

const CITIES = ["Kota", "Indore", "Patna", "Nagpur", "Bhopal", "Varanasi"];

// ─── Earnings Calculator ──────────────────────────────────────────────────────

const RATE_BY_EQUIPMENT: Record<EquipmentId, number> = {
  "3d-printer": 90,
  "laser-cutter": 350,
  "cnc-mill": 500,
  "lathe": 400,
  "water-jet": 900,
  "soldering": 300,
  "vinyl-cutter": 200,
  "pcb-fabrication": 600,
};

function EarningsCalculator() {
  const [hoursPerWeek, setHoursPerWeek] = useState(10);
  const [equipmentId, setEquipmentId] = useState<EquipmentId>("3d-printer");

  const platformFee = 0.10;
  const weeksPerMonth = 4.3;
  const rph = RATE_BY_EQUIPMENT[equipmentId];
  const monthlyEarning = Math.round(hoursPerWeek * rph * weeksPerMonth * (1 - platformFee));

  return (
    <div style={{
      background: "rgba(255,255,255,0.08)",
      border: "1px solid rgba(255,255,255,0.15)",
      borderRadius: 20, padding: "28px",
    }}>
      <p style={{ fontWeight: 700, color: "#fff", fontSize: 15, marginBottom: 20 }}>
        Earnings Calculator
      </p>

      {/* Equipment picker */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Equipment type</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {EQUIPMENT_TYPES.map((eq) => (
            <button
              key={eq.id}
              onClick={() => setEquipmentId(eq.id)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                border: equipmentId === eq.id ? "2px solid #F97316" : "2px solid rgba(255,255,255,0.15)",
                background: equipmentId === eq.id ? "#F97316" : "rgba(255,255,255,0.06)",
                color: "#fff", cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.15s",
              }}
            >
              <span>{eq.emoji}</span>
              <span>{eq.label.split(" ")[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Hours slider */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 14, color: "rgba(255,255,255,0.8)" }}>Hours per week</span>
          <span style={{ fontWeight: 800, color: "#FB923C", fontSize: 18 }}>{hoursPerWeek}h</span>
        </div>
        <input
          type="range" min={2} max={40} step={1}
          value={hoursPerWeek}
          onChange={(e) => setHoursPerWeek(Number(e.target.value))}
          style={{ width: "100%", accentColor: "#F97316" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
          <span>2h/week</span><span>40h/week</span>
        </div>
      </div>

      <div style={{ background: "rgba(0,0,0,0.25)", borderRadius: 14, padding: "20px 24px", textAlign: "center" }}>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 6 }}>
          Est. monthly income · avg ₹{rph}/{EQUIPMENT_TYPES.find(e => e.id === equipmentId)?.rateUnit}
        </p>
        <p style={{ fontSize: 44, fontWeight: 800, color: "#fff", lineHeight: 1 }}>
          ₹{monthlyEarning.toLocaleString("en-IN")}
        </p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 8 }}>
          after 10% platform fee
        </p>
      </div>
    </div>
  );
}

// ─── Registration Form ────────────────────────────────────────────────────────

function RegistrationForm() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<EquipmentId | "">("");
  const [form, setForm] = useState({
    name: "", phone: "", email: "", city: "",
    subtype: "", model: "",
    dimX: "", dimY: "", dimZ: "",
    extraA: "",
    materials: [] as string[],
    baseRate: "",
    hoursPerDay: "4",
    notes: "",
  });

  const equipment = EQUIPMENT_TYPES.find((e) => e.id === selectedEquipmentId);

  function toggleMaterial(m: string) {
    setForm((prev) => ({
      ...prev,
      materials: prev.materials.includes(m)
        ? prev.materials.filter((x) => x !== m)
        : [...prev.materials, m],
    }));
  }

  function selectEquipment(id: EquipmentId) {
    setSelectedEquipmentId(id);
    setForm((prev) => ({ ...prev, subtype: "", model: "", dimX: "", dimY: "", dimZ: "", extraA: "", materials: [] }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1300));
    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px" }}>
        <div style={{
          width: 80, height: 80, borderRadius: "50%",
          background: "#F0FDF4", border: "3px solid #86EFAC",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 24px",
        }}>
          <CheckCircle size={44} color="#16A34A" />
        </div>
        <h3 style={{ fontSize: 24, fontWeight: 800, color: "#111827", marginBottom: 10 }}>
          Application Submitted!
        </h3>
        <p style={{ color: "#6B7280", fontSize: 15, marginBottom: 8, lineHeight: 1.6 }}>
          Welcome, {form.name}! We&apos;ll verify your{" "}
          <strong>{equipment?.label ?? "equipment"}</strong> and onboard you within 24 hours.
        </p>
        <p style={{ color: "#9CA3AF", fontSize: 14, marginBottom: 28 }}>
          You&apos;ll receive a confirmation SMS on {form.phone}.
        </p>
        <Link href="/dashboard/owner" className="btn btn-primary btn-lg" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          View Owner Dashboard <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 16px",
    border: "2px solid #E5E7EB", borderRadius: 12,
    fontSize: 14, fontFamily: "inherit", outline: "none",
    boxSizing: "border-box", transition: "border-color 0.15s", background: "#fff",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 700,
    color: "#374151", textTransform: "uppercase",
    letterSpacing: "0.06em", marginBottom: 8,
  };
  const sectionHead = (title: string) => (
    <p style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 16, borderTop: "1px solid #F3F4F6", paddingTop: 20 }}>{title}</p>
  );

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Step 1: Contact ── */}
      <div>
        <p style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 16 }}>Your Details</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Full Name</label>
            <input style={inputStyle} placeholder="Rahul Sharma"
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label style={labelStyle}>Phone Number</label>
            <input style={inputStyle} placeholder="9876543210"
              value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} type="email" placeholder="you@example.com"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>City</label>
            <select style={{ ...inputStyle, cursor: "pointer" }}
              value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required>
              <option value="">Select city</option>
              {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Step 2: Equipment type ── */}
      {sectionHead("What equipment are you listing?")}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
        {EQUIPMENT_TYPES.map((eq) => {
          const selected = selectedEquipmentId === eq.id;
          return (
            <button
              key={eq.id}
              type="button"
              onClick={() => selectEquipment(eq.id)}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 8, padding: "16px 12px", borderRadius: 14, cursor: "pointer",
                border: selected ? "2px solid #F97316" : "2px solid #E5E7EB",
                background: selected ? "#FFF7ED" : "#F9FAFB",
                fontFamily: "inherit", transition: "all 0.15s",
                boxShadow: selected ? "0 2px 12px rgba(249,115,22,.15)" : "none",
              }}
            >
              <span style={{ fontSize: 26 }}>{eq.emoji}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: selected ? "#C2410C" : "#374151", textAlign: "center", lineHeight: 1.3 }}>
                {eq.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Step 3: Equipment-specific fields (only shown after type is picked) ── */}
      {equipment && (
        <>
          {sectionHead(`${equipment.emoji} ${equipment.label} Specifications`)}

          {/* Subtype */}
          <div>
            <label style={labelStyle}>Type / Category</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {equipment.subtypes.map((s) => {
                const sel = form.subtype === s;
                return (
                  <button
                    key={s} type="button"
                    onClick={() => setForm({ ...form, subtype: s })}
                    style={{
                      padding: "8px 16px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                      border: sel ? "2px solid #F97316" : "2px solid #E5E7EB",
                      background: sel ? "#FFF7ED" : "#fff",
                      color: sel ? "#C2410C" : "#6B7280",
                      cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Model name */}
          <div>
            <label style={labelStyle}>Make & Model</label>
            <input style={inputStyle}
              placeholder={
                equipment.id === "3d-printer" ? "e.g. Creality Ender 3 Pro" :
                equipment.id === "laser-cutter" ? "e.g. Sculpfun S30 Pro, xTool D1 Pro" :
                equipment.id === "cnc-mill" ? "e.g. Genmitsu 4040-PRO" :
                equipment.id === "lathe" ? "e.g. HiTorque Mini Lathe 7×16" :
                equipment.id === "water-jet" ? "e.g. OMAX 2626" :
                equipment.id === "soldering" ? "e.g. Hakko FX-951, JBC CD-2SE" :
                equipment.id === "vinyl-cutter" ? "e.g. Cricut Maker 3, Graphtec CE7000" :
                "e.g. Lpkf ProtoMat S104"
              }
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              required
            />
          </div>

          {/* Dimension fields */}
          <div>
            <label style={labelStyle}>
              {equipment.id === "lathe" ? "Capacity" :
               equipment.id === "soldering" ? "PCB Capacity" :
               equipment.id === "vinyl-cutter" ? "Cutting Area" :
               "Work Area / Build Volume"}
            </label>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${equipment.dimensionLabels.filter(Boolean).length}, 1fr)`, gap: 10 }}>
              {equipment.dimensionLabels.map((label, i) => label ? (
                <div key={label}>
                  <p style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 6 }}>{label}</p>
                  <input
                    style={inputStyle}
                    type="number" min="1"
                    placeholder={equipment.dimensionPlaceholders[i]}
                    value={form[equipment.dimensionKeys[i]]}
                    onChange={(e) => setForm({ ...form, [equipment.dimensionKeys[i]]: e.target.value })}
                    required={i < 2}
                  />
                </div>
              ) : null)}
            </div>
          </div>

          {/* Extra field (machine-specific) */}
          {equipment.extraField && (
            <div>
              <label style={labelStyle}>{equipment.extraField.label}</label>
              <input style={inputStyle}
                placeholder={equipment.extraField.placeholder}
                value={form.extraA}
                onChange={(e) => setForm({ ...form, extraA: e.target.value })}
              />
            </div>
          )}

          {/* Materials */}
          <div>
            <label style={labelStyle}>Materials / Capabilities Supported</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {equipment.materials.map((m) => {
                const sel = form.materials.includes(m);
                return (
                  <button
                    key={m} type="button"
                    onClick={() => toggleMaterial(m)}
                    style={{
                      padding: "7px 16px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                      border: sel ? "2px solid #F97316" : "2px solid #E5E7EB",
                      background: sel ? "#FFF7ED" : "#fff",
                      color: sel ? "#C2410C" : "#6B7280",
                      cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                    }}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rate */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={labelStyle}>Your Base Rate (₹ {equipment.rateUnit})</label>
              <input style={inputStyle} type="number" min="1"
                placeholder={equipment.rateHint}
                value={form.baseRate}
                onChange={(e) => setForm({ ...form, baseRate: e.target.value })}
              />
              <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 6 }}>{equipment.rateHint}</p>
            </div>
            <div>
              <label style={labelStyle}>Availability (hours/day)</label>
              <div className="seg-control">
                {["2", "4", "6", "8", "12"].map((h) => (
                  <button key={h} type="button"
                    onClick={() => setForm({ ...form, hoursPerDay: h })}
                    className={`seg-btn${form.hoursPerDay === h ? " active" : ""}`}
                    style={form.hoursPerDay === h ? { background: "#F97316", color: "#fff" } : {}}
                  >
                    {h}h
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Additional Notes <span style={{ fontWeight: 400, color: "#9CA3AF" }}>(optional)</span></label>
            <textarea
              style={{ ...inputStyle, minHeight: 80, resize: "vertical", lineHeight: 1.6 }}
              placeholder="Any special capabilities, certifications, or equipment features worth mentioning..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </>
      )}

      <button
        type="submit"
        disabled={loading || !selectedEquipmentId}
        className="btn btn-primary btn-lg"
        style={{ width: "100%", justifyContent: "center", fontSize: 15, marginTop: 8, opacity: !selectedEquipmentId ? 0.5 : 1 }}
      >
        {loading ? (
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin">
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
            Submitting application...
          </span>
        ) : !selectedEquipmentId ? (
          "Select an equipment type above to continue"
        ) : (
          <>List My {equipment?.label} on Foundry <ArrowRight size={16} style={{ marginLeft: 4 }} /></>
        )}
      </button>
    </form>
  );
}

// ─── Revenue chart data ───────────────────────────────────────────────────────

const REVENUE_DATA = [
  { day: "Mon", value: 1840 },
  { day: "Tue", value: 2560 },
  { day: "Wed", value: 980 },
  { day: "Thu", value: 3200 },
  { day: "Fri", value: 4100 },
  { day: "Sat", value: 2780 },
  { day: "Sun", value: 1520 },
];
const MAX_VAL = Math.max(...REVENUE_DATA.map((d) => d.value));

const PROFIT_TABLE = [
  { order: "Laser cut acrylic sign", equipment: "⚡ Laser Cutter", material: 120, time: 210, fee: 48, profit: 312 },
  { order: "CNC aluminium bracket",  equipment: "⚙️ CNC Mill",     material: 340, time: 390, fee: 87, profit: 583 },
  { order: "3D printed housing",     equipment: "🖨️ 3D Printer",   material: 86,  time: 91,  fee: 35, profit: 228 },
  { order: "PCB fabrication ×5",     equipment: "🟢 PCB Fab",      material: 210, time: 180, fee: 58, profit: 382 },
  { order: "Vinyl vehicle decal",    equipment: "✂️ Vinyl Cutter",  material: 45,  time: 95,  fee: 20, profit: 140 },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OwnerPage() {
  return (
    <div style={{ minHeight: "100vh" }}>

      {/* ── HERO ── */}
      <section style={{
        background: "linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)",
        padding: "80px 0",
        borderBottom: "4px solid #F97316",
      }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }}>
            <div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.3)",
                borderRadius: 999, padding: "6px 16px", marginBottom: 24,
                fontSize: 13, fontWeight: 700, color: "#FB923C",
              }}>
                <TrendingUp size={14} /> For Equipment Owners
              </div>

              <h1 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, color: "#fff", lineHeight: 1.15, marginBottom: 20 }}>
                Turn Idle Equipment Into{" "}
                <span style={{ color: "#F97316" }}>Monthly Income</span>
              </h1>
              <p style={{ fontSize: 16, color: "#94A3B8", lineHeight: 1.7, marginBottom: 36 }}>
                3D printers, laser cutters, CNC mills, lathes, water jets, soldering stations —
                if it&apos;s in a makerspace, list it on Foundry and start earning from jobs you&apos;d
                otherwise turn away.
              </p>

              {/* Equipment pill list */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 36 }}>
                {EQUIPMENT_TYPES.map((eq) => (
                  <span key={eq.id} style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 999, padding: "6px 12px", fontSize: 12, fontWeight: 600, color: "#CBD5E1",
                  }}>
                    {eq.emoji} {eq.label}
                  </span>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 36 }}>
                {[
                  { value: "₹18,400", label: "Avg monthly income" },
                  { value: "2.3 hrs", label: "Avg daily usage" },
                  { value: "94%",     label: "Acceptance rate" },
                ].map(({ value, label }) => (
                  <div key={label} style={{
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 14, padding: "16px",
                  }}>
                    <p style={{ fontSize: 22, fontWeight: 800, color: "#F97316", marginBottom: 4 }}>{value}</p>
                    <p style={{ fontSize: 12, color: "#94A3B8" }}>{label}</p>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <a href="#register" className="btn btn-primary btn-lg" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  List My Equipment <ArrowRight size={16} />
                </a>
                <a href="#how-it-works" className="btn btn-outline btn-lg" style={{
                  color: "#fff", borderColor: "rgba(255,255,255,0.2)",
                  background: "rgba(255,255,255,0.05)",
                }}>
                  How it works
                </a>
              </div>
            </div>

            <EarningsCalculator />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="section section-white">
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2 className="section-title">How listing works</h2>
            <p className="section-sub">Three steps to start earning from any equipment</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32 }}>
            {[
              {
                step: 1,
                icon: <Package size={28} color="#F97316" />,
                title: "List your equipment",
                desc: "Choose your equipment type, fill in the specs — dimensions, materials, capabilities — and set your rate. Takes under 5 minutes.",
                detail: "8 equipment types supported",
              },
              {
                step: 2,
                icon: <DollarSign size={28} color="#F97316" />,
                title: "Receive job requests",
                desc: "Customers submit jobs with full specs. You see exactly what's required — material, dimensions, quantity — before accepting.",
                detail: "Accept or decline, no obligation",
              },
              {
                step: 3,
                icon: <CheckCircle size={28} color="#F97316" />,
                title: "Complete & get paid",
                desc: "Finish the job, upload a photo, mark it ready. Payment lands in your UPI account every Friday. No chasing invoices.",
                detail: "Weekly UPI payouts, zero delays",
              },
            ].map(({ step, icon, title, desc, detail }) => (
              <div key={step} style={{ background: "#F9FAFB", border: "1px solid #F3F4F6", borderRadius: 20, padding: "32px" }}>
                <div className="step-icon-wrap" style={{ marginBottom: 24 }}>
                  <div className="step-icon" style={{ width: 72, height: 72, borderRadius: 18 }}>{icon}</div>
                  <span className="step-num">{step}</span>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 10 }}>{title}</h3>
                <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.7, marginBottom: 14 }}>{desc}</p>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  fontSize: 12, fontWeight: 700, color: "#15803D",
                  background: "#F0FDF4", borderRadius: 999, padding: "4px 12px",
                }}>
                  <CheckCircle size={12} /> {detail}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── REGISTRATION FORM ── */}
      <section id="register" className="section section-gray">
        <div className="container">
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <h2 className="section-title">List Your Equipment</h2>
              <p className="section-sub" style={{ margin: "0 auto" }}>
                Join the Foundry network and start earning from your idle machine
              </p>
            </div>
            <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 24, padding: "40px" }}>
              <RegistrationForm />
            </div>
          </div>
        </div>
      </section>

      {/* ── ANALYTICS PREVIEW ── */}
      <section className="section section-white">
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "#FFF7ED", borderRadius: 999, padding: "6px 16px",
              fontSize: 13, fontWeight: 700, color: "#C2410C",
              marginBottom: 16, border: "1px solid #FED7AA",
            }}>
              <BarChart2 size={14} /> Preview of Your Dashboard
            </div>
            <h2 className="section-title">Your earnings, fully transparent</h2>
            <p className="section-sub" style={{ margin: "0 auto" }}>
              Material cost, machine time, platform fee, and your profit — itemised for every job
            </p>
          </div>

          {/* Revenue chart */}
          <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 24, padding: "32px", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
              <div>
                <p style={{ fontWeight: 800, fontSize: 17, color: "#111827" }}>Weekly Revenue</p>
                <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }}>All equipment combined · last 7 days</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 28, fontWeight: 800, color: "#F97316" }}>
                  ₹{REVENUE_DATA.reduce((s, d) => s + d.value, 0).toLocaleString("en-IN")}
                </p>
                <p style={{ fontSize: 12, color: "#22C55E", fontWeight: 700 }}>↑ 12% from last week</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", height: 160 }}>
              {REVENUE_DATA.map(({ day, value }) => {
                const pct = (value / MAX_VAL) * 100;
                return (
                  <div key={day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 11, color: "#6B7280", fontWeight: 600 }}>₹{(value / 1000).toFixed(1)}k</div>
                    <div style={{ width: "100%", background: "#FFF7ED", borderRadius: 8, height: `${Math.max(10, pct * 1.1)}px`, position: "relative" }}>
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, #F97316, #FB923C)", height: "100%", borderRadius: 8 }} />
                    </div>
                    <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600 }}>{day}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Profit table */}
          <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 24, overflow: "hidden", marginBottom: 24 }}>
            <div style={{ padding: "24px 28px", borderBottom: "1px solid #F3F4F6" }}>
              <p style={{ fontWeight: 800, fontSize: 16, color: "#111827" }}>Per-Job Profit Breakdown</p>
              <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }}>Platform fee = 10% of job value</p>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#F9FAFB" }}>
                    {["Job", "Equipment", "Material", "Time", "Fee (10%)", "Your Profit"].map((h) => (
                      <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontWeight: 700, color: "#6B7280", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PROFIT_TABLE.map((row) => (
                    <tr key={row.order} style={{ borderTop: "1px solid #F9FAFB" }}>
                      <td style={{ padding: "14px 20px", fontWeight: 600, color: "#374151" }}>{row.order}</td>
                      <td style={{ padding: "14px 20px", color: "#6B7280", whiteSpace: "nowrap" }}>{row.equipment}</td>
                      <td style={{ padding: "14px 20px", color: "#6B7280" }}>₹{row.material}</td>
                      <td style={{ padding: "14px 20px", color: "#6B7280" }}>₹{row.time}</td>
                      <td style={{ padding: "14px 20px", color: "#DC2626" }}>₹{row.fee}</td>
                      <td style={{ padding: "14px 20px" }}>
                        <span style={{ fontWeight: 800, color: "#15803D", background: "#F0FDF4", padding: "4px 10px", borderRadius: 999, fontSize: 13 }}>
                          ₹{row.profit}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Delivery + sample job */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 20, padding: "28px" }}>
              <h3 style={{ fontWeight: 800, fontSize: 16, color: "#111827", marginBottom: 16 }}>Order Fulfilment</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { icon: <MapPin size={18} color="#F97316" />, title: "Customer Pickup", desc: "Customer collects from your location. Most common for local jobs." },
                  { icon: <Package size={18} color="#2563EB" />, title: "Courier Delivery", desc: "We arrange Delhivery / DTDC pickup. Packing materials provided." },
                  { icon: <Clock size={18} color="#15803D" />, title: "Turnaround SLA", desc: "You set your own 1–7 day turnaround. Customers see it before booking." },
                ].map(({ icon, title, desc }) => (
                  <div key={title} style={{ display: "flex", gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: "#F9FAFB", border: "1px solid #F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {icon}
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, color: "#111827", fontSize: 14, marginBottom: 3 }}>{title}</p>
                      <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.5 }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sample job card */}
            <div style={{ background: "#fff", border: "2px solid #F97316", borderRadius: 20, overflow: "hidden" }}>
              <div style={{ background: "#F97316", padding: "12px 20px", display: "flex", alignItems: "center", gap: 8 }}>
                <Star size={14} color="#fff" fill="#fff" />
                <span style={{ fontWeight: 700, color: "#fff", fontSize: 13 }}>Sample job — what you&apos;ll see in dashboard</span>
              </div>
              <div style={{ padding: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                    ⚡
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, color: "#111827", fontSize: 15 }}>Acrylic sign — 600×400mm</p>
                    <p style={{ fontSize: 13, color: "#9CA3AF" }}>from Priya Mehta, Indore</p>
                  </div>
                  <span style={{ marginLeft: "auto", background: "#FEF9C3", color: "#92400E", fontWeight: 700, fontSize: 11, padding: "4px 10px", borderRadius: 999 }}>
                    QUOTED
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13, marginBottom: 16 }}>
                  {[
                    ["Equipment", "Laser Cutter"],
                    ["Material", "Clear Acrylic"],
                    ["Thickness", "6 mm"],
                    ["Cut Area", "600 × 400 mm"],
                    ["Est. Time", "~45 min"],
                    ["Qty", "2"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span style={{ color: "#9CA3AF" }}>{label}: </span>
                      <span style={{ fontWeight: 600, color: "#374151" }}>{value}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #F3F4F6", paddingTop: 16 }}>
                  <div>
                    <p style={{ fontSize: 11, color: "#9CA3AF" }}>Your earnings</p>
                    <p style={{ fontSize: 26, fontWeight: 800, color: "#15803D" }}>₹312</p>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-sm btn-danger" style={{ fontWeight: 700 }}>Decline</button>
                    <button className="btn btn-sm btn-green" style={{ fontWeight: 700 }}>Accept</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="section section-orange" style={{ textAlign: "center" }}>
        <div className="container">
          <h2 className="section-title">Ready to start earning?</h2>
          <p className="section-sub" style={{ margin: "0 auto 36px" }}>
            Join 340+ space owners already earning on Foundry
          </p>
          <a href="#register" className="btn btn-primary btn-xl" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            List My Equipment Now <ArrowRight size={18} />
          </a>
        </div>
      </section>

    </div>
  );
}
