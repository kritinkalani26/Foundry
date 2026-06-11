"use client";

import { useState, useEffect } from "react";
import { ArrowRight, CheckCircle, Loader2, User, Phone, Mail } from "lucide-react";

const EQUIPMENT_TYPES = [
  { id: "3d-printer",       emoji: "🖨️", label: "3D Printer",            subtypes: ["FDM", "SLA / MSLA", "Resin (DLP)"],           dimensionLabels: ["Bed X (mm)", "Bed Y (mm)", "Max Z (mm)"],         dimKeys: ["dimX","dimY","dimZ"] as const, dimPlaceholders: ["220","220","250"],   extraField: null,                                                      materials: ["PLA","ABS","PETG","TPU","Resin","Nylon","ASA"],             rateUnit: "per hour",    rateHint: "₹50–150/hr typical" },
  { id: "laser-cutter",     emoji: "⚡",  label: "Laser Cutter",           subtypes: ["CO₂ Laser","Diode Laser","Fiber Laser"],       dimensionLabels: ["Bed X (mm)", "Bed Y (mm)", "Power (W)"],          dimKeys: ["dimX","dimY","dimZ"] as const, dimPlaceholders: ["600","400","60"],   extraField: null,                                                      materials: ["Wood","Acrylic","Leather","MDF","Cardboard"],               rateUnit: "per job",     rateHint: "₹150–800/job typical" },
  { id: "cnc-mill",         emoji: "⚙️",  label: "CNC Mill / Router",      subtypes: ["3-Axis","4-Axis","5-Axis","CNC Router"],       dimensionLabels: ["X travel (mm)", "Y travel (mm)", "Z travel (mm)"], dimKeys: ["dimX","dimY","dimZ"] as const, dimPlaceholders: ["500","400","100"],  extraField: { label: "Spindle Speed (RPM)", placeholder: "24000" },    materials: ["Aluminum","Wood","HDPE","Brass","Carbon Fibre"],            rateUnit: "per hour",    rateHint: "₹300–800/hr typical" },
  { id: "lathe",            emoji: "🔩",  label: "Lathe",                  subtypes: ["Metal Lathe","Wood Lathe","Metal & Wood"],     dimensionLabels: ["Max Diameter (mm)", "Max Length (mm)", ""],        dimKeys: ["dimX","dimY","dimZ"] as const, dimPlaceholders: ["300","750",""],    extraField: { label: "Swing Over Bed (mm)", placeholder: "330" },      materials: ["Steel","Aluminum","Brass","Copper","Nylon"],               rateUnit: "per hour",    rateHint: "₹200–600/hr typical" },
  { id: "water-jet",        emoji: "💧",  label: "Water Jet Cutter",       subtypes: ["Abrasive Jet","Pure Water Jet"],               dimensionLabels: ["Cutting X (mm)", "Cutting Y (mm)", "Max Thickness (mm)"], dimKeys: ["dimX","dimY","dimZ"] as const, dimPlaceholders: ["1500","1000","150"], extraField: { label: "Pump Pressure (bar)", placeholder: "3800" },  materials: ["Steel","Aluminum","Titanium","Stone","Glass"],             rateUnit: "per hour",    rateHint: "₹500–1500/hr typical" },
  { id: "soldering",        emoji: "🔌",  label: "Soldering / Electronics", subtypes: ["Manual Soldering","Reflow Oven","Hot Air Station"], dimensionLabels: ["Max PCB Width (mm)", "Max PCB Length (mm)", ""], dimKeys: ["dimX","dimY","dimZ"] as const, dimPlaceholders: ["300","400",""], extraField: { label: "Min Pitch (mm)", placeholder: "0.2" },          materials: ["Single-layer PCB","Double-layer PCB","SMD","Through-hole"], rateUnit: "per session", rateHint: "₹200–1000/session typical" },
  { id: "pcb-fabrication",  emoji: "🟢",  label: "PCB Fabrication",        subtypes: ["Single-sided","Double-sided","Multi-layer (4L+)","Flex PCB"], dimensionLabels: ["Max Board X (mm)", "Max Board Y (mm)", "Min Trace (mm)"], dimKeys: ["dimX","dimY","dimZ"] as const, dimPlaceholders: ["400","300","0.1"], extraField: { label: "Min Drill (mm)", placeholder: "0.2" },       materials: ["FR4 Standard","High-Tg FR4","Rogers / RF","Flex (Polyimide)"], rateUnit: "per board",  rateHint: "₹300–3000/board typical" },
  { id: "sheet-metal",      emoji: "🔨",  label: "Sheet Metal",            subtypes: ["Press Brake","Punch Press","Spot Welder"],     dimensionLabels: ["Max Sheet X (mm)", "Max Sheet Y (mm)", "Max Thickness (mm)"], dimKeys: ["dimX","dimY","dimZ"] as const, dimPlaceholders: ["2000","1500","12"], extraField: { label: "Press Brake Tonnage (T)", placeholder: "100" }, materials: ["Mild Steel","Stainless Steel","Aluminium","Copper","Brass"], rateUnit: "per job",    rateHint: "₹400–2000/job typical" },
  { id: "urethane-casting", emoji: "🧪",  label: "Urethane Casting",       subtypes: ["Silicone Mold Casting","Vacuum Casting"],     dimensionLabels: ["Max Part X (mm)", "Max Part Y (mm)", "Max Part Z (mm)"], dimKeys: ["dimX","dimY","dimZ"] as const, dimPlaceholders: ["350","350","250"], extraField: { label: "Typical MOQ", placeholder: "5" },             materials: ["Rigid Urethane","Flexible Urethane","Shore A variants","Pigmented PU"], rateUnit: "per run", rateHint: "₹1200–8000/run typical" },
] as const;

type EquipmentId = typeof EQUIPMENT_TYPES[number]["id"];

const CITIES = [
  "Bengaluru","Mumbai","Delhi","Pune","Hyderabad","Chennai","Kolkata","Ahmedabad",
  "Indore","Kota","Nagpur","Bhopal","Varanasi","Patna","Ludhiana","Coimbatore","Surat","Jaipur","Chandigarh",
];

const iStyle: React.CSSProperties = { width: "100%", padding: "12px 16px", border: "2px solid #E5E7EB", borderRadius: 12, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: "#fff" };
const lStyle: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 };
const sh = (t: string) => <p style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 16, borderTop: "1px solid #F3F4F6", paddingTop: 20 }}>{t}</p>;

export default function ListEquipmentPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<EquipmentId | "">("");
  const [form, setForm] = useState({
    name: "", phone: "", email: "", city: "", address: "", pincode: "",
    subtype: "", model: "", dimX: "", dimY: "", dimZ: "", extraA: "",
    materials: [] as string[], baseRate: "", hoursPerDay: "4", notes: "",
  });
  const [profile, setProfile] = useState<{ name: string; email: string; phone: string | null; city: string | null } | null>(null);

  useEffect(() => {
    fetch("/api/account/profile")
      .then(r => r.json())
      .then(d => {
        if (d.data) {
          setProfile(d.data);
          setForm(prev => ({
            ...prev,
            name:  d.data.name  ?? prev.name,
            email: d.data.email ?? prev.email,
            phone: d.data.phone ?? prev.phone,
            city:  d.data.city  ?? prev.city,
          }));
        }
      })
      .catch(() => {});
  }, []);

  const equipment = EQUIPMENT_TYPES.find((e) => e.id === selectedId);

  function toggleMaterial(m: string) {
    setForm((p) => ({ ...p, materials: p.materials.includes(m) ? p.materials.filter((x) => x !== m) : [...p.materials, m] }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/supplier/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, phone: form.phone, email: form.email,
          city: form.city, address: form.address, pincode: form.pincode,
          equipmentType: selectedId, subtype: form.subtype, model: form.model,
          dimX: form.dimX, dimY: form.dimY, dimZ: form.dimZ, extraA: form.extraA,
          materials: form.materials, baseRate: form.baseRate,
          hoursPerDay: form.hoursPerDay, notes: form.notes,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Submission failed. Please try again.");
        setLoading(false);
        return;
      }
    } catch {
      alert("Network error. Please try again.");
      setLoading(false);
      return;
    }
    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div style={{ maxWidth: 540, margin: "80px auto", padding: "0 24px", textAlign: "center" }}>
        <div style={{ width: 88, height: 88, borderRadius: "50%", background: "#F0FDF4", border: "3px solid #86EFAC", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px" }}>
          <CheckCircle size={48} color="#16A34A" />
        </div>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: "#111827", marginBottom: 12 }}>Application Submitted!</h2>
        <p style={{ color: "#6B7280", fontSize: 15, lineHeight: 1.7, marginBottom: 32 }}>
          Your <strong>{equipment?.label}</strong> listing is submitted. We&apos;ll verify and onboard you within 24 hours.
          Your customer account stays active — you can order and supply from the same login.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <a href="/dashboard/owner" className="btn btn-primary btn-lg" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            My Space Dashboard <ArrowRight size={16} />
          </a>
          <a href="/dashboard/customer" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 20px", borderRadius: 12, fontSize: 15, fontWeight: 700, border: "2px solid #E5E7EB", color: "#374151", textDecoration: "none" }}>
            My Orders
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px 64px" }}>
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: "#111827", marginBottom: 10 }}>List Your Equipment</h1>
        <p style={{ fontSize: 16, color: "#6B7280" }}>Join the Foundry supplier network and start earning from idle machine time.</p>
      </div>

      <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 24, padding: "clamp(20px, 5vw, 40px)" }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Personal details — read-only if logged in */}
          <div>
            <p style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 16 }}>Your Details</p>
            {profile ? (
              <div style={{ padding: "14px 18px", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 14, marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Pulled from your account</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#374151" }}>
                    <User size={13} color="#9CA3AF" /> {profile.name}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#374151" }}>
                    <Mail size={13} color="#9CA3AF" /> {profile.email}
                  </span>
                  {profile.phone && (
                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#374151" }}>
                      <Phone size={13} color="#9CA3AF" /> {profile.phone}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="req-form-2col" style={{ marginBottom: 16 }}>
                <div><label style={lStyle}>Full Name</label><input style={iStyle} placeholder="Rahul Sharma" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                <div><label style={lStyle}>Phone</label><input style={iStyle} placeholder="9876543210" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></div>
              </div>
            )}
            <div className={profile ? "" : "req-form-2col"}>
              {!profile && <div><label style={lStyle}>Email</label><input style={iStyle} type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>}
              <div>
                <label style={lStyle}>City</label>
                <select style={{ ...iStyle, cursor: "pointer" }} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required>
                  <option value="">Select city</option>
                  {CITIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={lStyle}>Business / Workshop Address</label>
              <input style={iStyle} placeholder="e.g. Plot 12, KIADB Industrial Area, Electronic City" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
              <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 6 }}>Used to calculate distance from customers. Be as specific as possible.</p>
            </div>
            <div style={{ maxWidth: 220 }}>
              <label style={lStyle}>Pincode</label>
              <input style={iStyle} placeholder="560100" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} maxLength={6} />
            </div>
          </div>

          {/* Equipment selection */}
          {sh("What equipment are you listing?")}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
            {EQUIPMENT_TYPES.map((eq) => {
              const sel = selectedId === eq.id;
              return (
                <button key={eq.id} type="button"
                  onClick={() => { setSelectedId(eq.id); setForm((p) => ({ ...p, subtype: "", model: "", dimX: "", dimY: "", dimZ: "", extraA: "", materials: [] })); }}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "16px 12px", borderRadius: 14, cursor: "pointer", border: sel ? "2px solid #F97316" : "2px solid #E5E7EB", background: sel ? "#FFF7ED" : "#F9FAFB", fontFamily: "inherit" }}>
                  <span style={{ fontSize: 24 }}>{eq.emoji}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: sel ? "#C2410C" : "#374151", textAlign: "center" }}>{eq.label}</span>
                </button>
              );
            })}
          </div>

          {/* Equipment-specific fields */}
          {equipment && (
            <>
              {sh(`${equipment.emoji} ${equipment.label} Specs`)}
              <div>
                <label style={lStyle}>Type</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {equipment.subtypes.map((s) => {
                    const sel = form.subtype === s;
                    return <button key={s} type="button" onClick={() => setForm({ ...form, subtype: s })} style={{ padding: "8px 16px", borderRadius: 999, fontSize: 13, fontWeight: 600, border: sel ? "2px solid #F97316" : "2px solid #E5E7EB", background: sel ? "#FFF7ED" : "#fff", color: sel ? "#C2410C" : "#6B7280", cursor: "pointer", fontFamily: "inherit" }}>{s}</button>;
                  })}
                </div>
              </div>
              <div>
                <label style={lStyle}>Make & Model</label>
                <input style={iStyle} placeholder="e.g. Creality Ender 3, OMAX 2626" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} required />
              </div>
              <div>
                <label style={lStyle}>Work Area / Capacity</label>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${equipment.dimensionLabels.filter(Boolean).length}, 1fr)`, gap: 10 }}>
                  {equipment.dimensionLabels.map((label, i) => label ? (
                    <div key={label}>
                      <p style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 6 }}>{label}</p>
                      <input style={iStyle} type="number" min="1" placeholder={equipment.dimPlaceholders[i]} value={form[equipment.dimKeys[i]]} onChange={(e) => setForm({ ...form, [equipment.dimKeys[i]]: e.target.value })} required={i < 2} />
                    </div>
                  ) : null)}
                </div>
              </div>
              {equipment.extraField && (
                <div>
                  <label style={lStyle}>{equipment.extraField.label}</label>
                  <input style={iStyle} placeholder={equipment.extraField.placeholder} value={form.extraA} onChange={(e) => setForm({ ...form, extraA: e.target.value })} />
                </div>
              )}
              <div>
                <label style={lStyle}>Materials Supported</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {equipment.materials.map((m) => {
                    const sel = form.materials.includes(m);
                    return <button key={m} type="button" onClick={() => toggleMaterial(m)} style={{ padding: "7px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600, border: sel ? "2px solid #F97316" : "2px solid #E5E7EB", background: sel ? "#FFF7ED" : "#fff", color: sel ? "#C2410C" : "#6B7280", cursor: "pointer", fontFamily: "inherit" }}>{m}</button>;
                  })}
                </div>
              </div>
              <div className="req-form-2col">
                <div>
                  <label style={lStyle}>Base Rate (₹ {equipment.rateUnit})</label>
                  <input style={iStyle} type="number" min="1" placeholder={equipment.rateHint} value={form.baseRate} onChange={(e) => setForm({ ...form, baseRate: e.target.value })} />
                  <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 6 }}>{equipment.rateHint}</p>
                </div>
                <div>
                  <label style={lStyle}>Availability (hrs/day)</label>
                  <div className="seg-control">
                    {["2","4","6","8","12"].map((h) => (
                      <button key={h} type="button" onClick={() => setForm({ ...form, hoursPerDay: h })}
                        className={`seg-btn${form.hoursPerDay === h ? " active" : ""}`}
                        style={form.hoursPerDay === h ? { background: "#F97316", color: "#fff" } : {}}>
                        {h}h
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label style={lStyle}>Notes <span style={{ fontWeight: 400, color: "#9CA3AF", textTransform: "none" }}>(optional)</span></label>
                <textarea style={{ ...iStyle, minHeight: 80, resize: "vertical", lineHeight: 1.6 }}
                  placeholder="Special capabilities, certifications, turnaround times..."
                  value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </>
          )}

          <button type="submit" disabled={loading || !selectedId} className="btn btn-primary btn-lg"
            style={{ width: "100%", justifyContent: "center", opacity: !selectedId ? 0.5 : 1 }}>
            {loading
              ? <><Loader2 size={16} className="spin" /> Submitting…</>
              : !selectedId
                ? "Select equipment type above"
                : <>Apply as Supplier <ArrowRight size={16} /></>}
          </button>
        </form>
      </div>
    </div>
  );
}
