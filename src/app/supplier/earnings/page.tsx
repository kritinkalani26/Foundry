"use client";

import { useState } from "react";

const EQUIPMENT_TYPES = [
  { id: "3d-printer",       emoji: "🖨️", label: "3D Printer",         rateUnit: "per hour",    rate: 90  },
  { id: "laser-cutter",     emoji: "⚡",  label: "Laser Cutter",       rateUnit: "per job",     rate: 350 },
  { id: "cnc-mill",         emoji: "⚙️",  label: "CNC Mill",           rateUnit: "per hour",    rate: 500 },
  { id: "lathe",            emoji: "🔩",  label: "Lathe",              rateUnit: "per hour",    rate: 400 },
  { id: "water-jet",        emoji: "💧",  label: "Water Jet",          rateUnit: "per hour",    rate: 900 },
  { id: "soldering",        emoji: "🔌",  label: "Soldering",          rateUnit: "per session", rate: 300 },
  { id: "pcb-fabrication",  emoji: "🟢",  label: "PCB Fab",            rateUnit: "per board",   rate: 600 },
  { id: "sheet-metal",      emoji: "🔨",  label: "Sheet Metal",        rateUnit: "per job",     rate: 800 },
  { id: "urethane-casting", emoji: "🧪",  label: "Urethane Casting",   rateUnit: "per run",     rate: 1200 },
] as const;

type EquipId = typeof EQUIPMENT_TYPES[number]["id"];

const REVENUE_DATA = [
  { day: "Mon", value: 1840 }, { day: "Tue", value: 2560 }, { day: "Wed", value: 980 },
  { day: "Thu", value: 3200 }, { day: "Fri", value: 4100 }, { day: "Sat", value: 2780 }, { day: "Sun", value: 1520 },
];
const MAX_VAL = Math.max(...REVENUE_DATA.map((d) => d.value));

const PROFIT_TABLE = [
  { order: "Laser cut acrylic sign",  equipment: "⚡ Laser",       material: 120, time: 210, fee: 48,  profit: 312 },
  { order: "CNC aluminium bracket",   equipment: "⚙️ CNC Mill",    material: 340, time: 390, fee: 87,  profit: 583 },
  { order: "3D printed housing",      equipment: "🖨️ 3D Printer",  material: 86,  time: 91,  fee: 35,  profit: 228 },
  { order: "Sheet metal enclosure",   equipment: "🔨 Sheet Metal", material: 280, time: 450, fee: 93,  profit: 617 },
  { order: "PCB fabrication ×5",      equipment: "🟢 PCB Fab",     material: 210, time: 180, fee: 58,  profit: 382 },
];

const MONTHLY_BREAKDOWN = [
  { label: "3D Printer (FDM)",  hours: 8,  rate: 90,  monthly: 27864 },
  { label: "Laser Cutter",      hours: 5,  rate: 350, monthly: 60550 },
  { label: "CNC Mill (3-axis)", hours: 6,  rate: 500, monthly: 116100 },
  { label: "Waterjet",          hours: 4,  rate: 900, monthly: 139320 },
  { label: "Sheet Metal",       hours: 6,  rate: 800, monthly: 185760 },
];

export default function EarningsPage() {
  const [hoursPerWeek, setHoursPerWeek] = useState(10);
  const [equipId, setEquipId] = useState<EquipId>("cnc-mill");

  const eq = EQUIPMENT_TYPES.find((e) => e.id === equipId)!;
  const monthly = Math.round(hoursPerWeek * eq.rate * 4.3 * 0.9);
  const weeklyTotal = REVENUE_DATA.reduce((s, d) => s + d.value, 0);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px 64px" }}>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: "#111827", marginBottom: 10 }}>Earning Trends</h1>
        <p style={{ fontSize: 16, color: "#6B7280" }}>Full breakdown of how much you can earn — by equipment type, hours, and job. Platform fee is 10% on completed jobs only.</p>
      </div>

      {/* Top grid: chart + calculator */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>

        {/* Revenue chart */}
        <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 24, padding: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 28 }}>
            <div>
              <p style={{ fontWeight: 800, fontSize: 17, color: "#111827" }}>Sample Weekly Revenue</p>
              <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }}>Illustrative · single CNC mill at 6 hrs/day</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 28, fontWeight: 800, color: "#F97316" }}>₹{weeklyTotal.toLocaleString("en-IN")}</p>
              <p style={{ fontSize: 12, color: "#22C55E", fontWeight: 700 }}>↑ 12% vs last week</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end", height: 160 }}>
            {REVENUE_DATA.map(({ day, value }) => (
              <div key={day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ fontSize: 10, color: "#6B7280", fontWeight: 600 }}>₹{(value / 1000).toFixed(1)}k</div>
                <div style={{ width: "100%", background: "#FFF7ED", borderRadius: 6, height: `${Math.max(8, (value / MAX_VAL) * 120)}px`, position: "relative" }}>
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, #F97316, #FB923C)", height: "100%", borderRadius: 6 }} />
                </div>
                <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600 }}>{day}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Earnings calculator */}
        <div style={{ background: "#1E293B", borderRadius: 24, padding: 32 }}>
          <p style={{ fontWeight: 800, color: "#fff", fontSize: 16, marginBottom: 20 }}>Earnings Calculator</p>

          {/* Equipment picker */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Equipment type</p>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {EQUIPMENT_TYPES.map((e) => (
                <button key={e.id} onClick={() => setEquipId(e.id)} style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                  border: equipId === e.id ? "2px solid #F97316" : "2px solid rgba(255,255,255,0.15)",
                  background: equipId === e.id ? "#F97316" : "rgba(255,255,255,0.06)",
                  color: "#fff", cursor: "pointer", fontFamily: "inherit",
                }}>
                  {e.emoji} {e.label.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Slider */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 14, color: "rgba(255,255,255,0.8)" }}>Hours per week</span>
              <span style={{ fontWeight: 800, color: "#FB923C", fontSize: 18 }}>{hoursPerWeek}h</span>
            </div>
            <input type="range" min={2} max={40} step={1} value={hoursPerWeek}
              onChange={(e) => setHoursPerWeek(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#F97316" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
              <span>2h/week</span><span>40h/week</span>
            </div>
          </div>

          {/* Result */}
          <div style={{ background: "rgba(0,0,0,0.25)", borderRadius: 14, padding: "20px 24px", textAlign: "center" }}>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 6 }}>Est. monthly income after 10% fee</p>
            <p style={{ fontSize: 44, fontWeight: 800, color: "#fff", lineHeight: 1 }}>₹{monthly.toLocaleString("en-IN")}</p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 8 }}>avg ₹{eq.rate} {eq.rateUnit}</p>
          </div>
        </div>
      </div>

      {/* Per-job profit table */}
      <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 24, overflow: "hidden", marginBottom: 24 }}>
        <div style={{ padding: "20px 28px", borderBottom: "1px solid #F3F4F6" }}>
          <p style={{ fontWeight: 800, fontSize: 16, color: "#111827" }}>Per-Job Profit Breakdown</p>
          <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }}>Platform fee = 10% of total job value. Material cost is passed through to the buyer.</p>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#F9FAFB" }}>
              {["Job", "Equipment", "Material cost", "Machine time", "Fee (10%)", "Your Profit"].map((h) => (
                <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontWeight: 700, color: "#6B7280", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PROFIT_TABLE.map((r) => (
              <tr key={r.order} style={{ borderTop: "1px solid #F9FAFB" }}>
                <td style={{ padding: "14px 20px", fontWeight: 600, color: "#374151" }}>{r.order}</td>
                <td style={{ padding: "14px 20px", color: "#6B7280" }}>{r.equipment}</td>
                <td style={{ padding: "14px 20px", color: "#6B7280" }}>₹{r.material}</td>
                <td style={{ padding: "14px 20px", color: "#6B7280" }}>₹{r.time}</td>
                <td style={{ padding: "14px 20px", color: "#DC2626" }}>₹{r.fee}</td>
                <td style={{ padding: "14px 20px" }}>
                  <span style={{ fontWeight: 800, color: "#15803D", background: "#F0FDF4", padding: "4px 10px", borderRadius: 999 }}>₹{r.profit}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Monthly potential by equipment type */}
      <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 24, padding: 32 }}>
        <p style={{ fontWeight: 800, fontSize: 16, color: "#111827", marginBottom: 6 }}>Monthly Earning Potential by Equipment</p>
        <p style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 24 }}>Assumes typical utilisation and average market rates on Foundry. After 10% fee.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {MONTHLY_BREAKDOWN.map(({ label, hours, rate, monthly: mo }) => {
            const pct = (mo / MONTHLY_BREAKDOWN[MONTHLY_BREAKDOWN.length - 1].monthly) * 100;
            return (
              <div key={label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{label}</span>
                    <span style={{ fontSize: 12, color: "#9CA3AF", marginLeft: 8 }}>{hours} hrs/day · ₹{rate}/unit</span>
                  </div>
                  <span style={{ fontWeight: 800, fontSize: 15, color: "#15803D" }}>₹{mo.toLocaleString("en-IN")}/mo</span>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: "#F3F4F6", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #F97316, #FB923C)", borderRadius: 999, transition: "width 0.5s ease" }} />
                </div>
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 20, borderTop: "1px solid #F3F4F6", paddingTop: 16 }}>
          Certified suppliers earn on average 3.2× more quote requests. <a href="/supplier/certifications" style={{ color: "#F97316", fontWeight: 600, textDecoration: "none" }}>Upload certifications →</a>
        </p>
      </div>
    </div>
  );
}
