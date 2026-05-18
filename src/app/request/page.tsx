"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Upload, Loader2, Cpu, ChevronDown } from "lucide-react";

// ─── Service metadata ─────────────────────────────────────────────────────────

const SERVICE_META: Record<string, {
  name: string; emoji: string; description: string; fileTypes: string;
  fields: string[]; materials: string[];
  // ML model identifier and material code mapping
  modelId: string;
  materialCodes: Record<string, number>;
  defaultParams: Record<string, number>;
}> = {
  "laser-cutting": {
    name: "Laser Cutting", emoji: "⚡",
    description: "Upload your design file (SVG, DXF, AI) and specify your material and dimensions.",
    fileTypes: "SVG, DXF, AI, PDF",
    fields: ["dimensions", "thickness", "quantity"],
    materials: ["Wood", "Acrylic", "MDF", "Leather", "Cardboard", "Fabric"],
    modelId: "laser-cutter",
    materialCodes: { Wood: 0, Acrylic: 1, MDF: 2, Leather: 3, Cardboard: 4, Fabric: 5 },
    defaultParams: { widthMm: 200, heightMm: 150, thicknessMm: 3, quantity: 1 },
  },
  "cnc-milling": {
    name: "CNC Milling", emoji: "⚙️",
    description: "Upload your design (DXF, STL, G-code) and specify your material and tolerances.",
    fileTypes: "DXF, STL, G-code, STEP",
    fields: ["dimensions", "tolerance", "quantity"],
    materials: ["Aluminum", "Wood", "Plastic / HDPE", "Steel / SS"],
    modelId: "cnc-mill",
    materialCodes: { Wood: 0, "Plastic / HDPE": 1, Aluminum: 2, "Steel / SS": 3 },
    defaultParams: { stockVolumeCm3: 200, materialCode: 2, complexity: 2, numSetups: 1 },
  },
  "lathe": {
    name: "Lathe Work", emoji: "🔩",
    description: "Describe the part you need — diameter, length, and tolerances.",
    fileTypes: "DXF, PDF drawing, or text description",
    fields: ["dimensions", "tolerance", "quantity"],
    materials: ["Mild Steel", "Aluminum", "Brass", "Plastic"],
    modelId: "lathe",
    materialCodes: { "Mild Steel": 0, Aluminum: 1, Brass: 2, Plastic: 3 },
    defaultParams: { diameterMm: 50, lengthMm: 100, isPrecision: 0, numOperations: 2 },
  },
  "water-jet": {
    name: "Water Jet Cutting", emoji: "💧",
    description: "Upload your 2D design (DXF, SVG) and specify material and thickness.",
    fileTypes: "DXF, SVG, AI, PDF",
    fields: ["dimensions", "thickness", "quantity"],
    materials: ["Mild Steel", "Stainless Steel", "Aluminum", "Stone / Marble", "Glass"],
    modelId: "water-jet",
    materialCodes: { "Mild Steel": 0, "Stainless Steel": 1, Aluminum: 2, "Stone / Marble": 3, Glass: 4 },
    defaultParams: { cutLengthMm: 1000, areaCm2: 200, thicknessMm: 6, quantity: 1 },
  },
  "soldering": {
    name: "Soldering & Electronics", emoji: "🔌",
    description: "Describe your electronics project — PCB assembly, repair, or prototyping.",
    fileTypes: "Gerber, PDF schematic, or text description",
    fields: ["quantity"],
    materials: ["SMD Assembly", "Through-hole", "Mixed (SMD + THT)", "BGA Rework"],
    modelId: "soldering",
    materialCodes: { "Through-hole": 0, "SMD Assembly": 1, "Mixed (SMD + THT)": 2, "BGA Rework": 3 },
    defaultParams: { thtCount: 10, smdCount: 20, boardAreaCm2: 25, isDoubleSided: 0, bgaCount: 0, qtyBoards: 1 },
  },
  "vinyl-cutting": {
    name: "Vinyl Cutting", emoji: "✂️",
    description: "Upload your design (SVG, DXF) and specify vinyl type and colour.",
    fileTypes: "SVG, DXF, AI, PDF",
    fields: ["dimensions", "quantity"],
    materials: ["Standard Vinyl", "HTV (Heat Transfer)", "Chrome / Reflective", "Glitter Vinyl"],
    modelId: "vinyl-cutter",
    materialCodes: { "Standard Vinyl": 0, "HTV (Heat Transfer)": 1, "Chrome / Reflective": 2, "Glitter Vinyl": 3 },
    defaultParams: { areaCm2: 100, colorCount: 1, quantity: 1 },
  },
  "pcb-fabrication": {
    name: "PCB Fabrication", emoji: "🟢",
    description: "Upload your Gerber files and specify board specifications.",
    fileTypes: "Gerber ZIP, KiCad, Eagle files",
    fields: ["dimensions", "quantity"],
    materials: ["HASL (Standard)", "ENIG (Gold)", "OSP"],
    modelId: "pcb-fabrication",
    materialCodes: { "HASL (Standard)": 0, "ENIG (Gold)": 1, OSP: 2 },
    defaultParams: { areaCm2: 100, layers: 2, quantity: 10, minTraceMm: 0.2 },
  },
};

const CITIES = ["Kota", "Indore", "Patna", "Nagpur", "Bhopal", "Varanasi"];

// ─── ML price panel ───────────────────────────────────────────────────────────

interface MLEstimate {
  price: number; low: number; high: number;
}

function parseFirstTwoNumbers(s: string): [number, number] | null {
  const nums = s.match(/[\d.]+/g)?.map(Number).filter(n => n > 0);
  if (nums && nums.length >= 2) return [nums[0], nums[1]];
  return null;
}

function buildMLParams(
  serviceKey: string,
  meta: typeof SERVICE_META[string],
  form: { material: string; dimensions: string; thickness: string; tolerance: string; quantity: string },
  extraSliders: Record<string, number>,
): Record<string, number> {
  const qty = Math.max(1, parseInt(form.quantity) || 1);
  const matCode = form.material ? (meta.materialCodes[form.material] ?? 0) : 0;
  const thick = parseFloat(form.thickness) || (meta.defaultParams.thicknessMm ?? 3);
  const dims = form.dimensions ? parseFirstTwoNumbers(form.dimensions) : null;

  switch (serviceKey) {
    case "laser-cutting": {
      const [w, h] = dims ?? [meta.defaultParams.widthMm, meta.defaultParams.heightMm];
      return { widthMm: w, heightMm: h, materialCode: matCode, thicknessMm: thick, quantity: qty };
    }
    case "cnc-milling": {
      const [w, h] = dims ?? [200, 100];
      const depth = thick || 20;
      return {
        stockVolumeCm3: (w * h * depth) / 1000,
        materialCode: matCode,
        complexity: extraSliders.complexity ?? 2,
        numSetups: extraSliders.numSetups ?? 1,
      };
    }
    case "lathe": {
      const [dia, len] = dims ?? [meta.defaultParams.diameterMm, meta.defaultParams.lengthMm];
      const isPrecision = form.tolerance && form.tolerance !== "" ? 1 : 0;
      return { diameterMm: dia, lengthMm: len, materialCode: matCode, isPrecision, numOperations: extraSliders.numOperations ?? 2 };
    }
    case "water-jet": {
      const [w, h] = dims ?? [300, 200];
      return {
        cutLengthMm: 2 * (w + h) + 400,
        areaCm2: (w * h) / 100,
        materialCode: matCode, thicknessMm: thick, quantity: qty,
      };
    }
    case "soldering": {
      const tht = extraSliders.thtCount ?? meta.defaultParams.thtCount;
      const smd = extraSliders.smdCount ?? meta.defaultParams.smdCount;
      return {
        thtCount: tht, smdCount: smd,
        boardAreaCm2: extraSliders.boardAreaCm2 ?? 25,
        isDoubleSided: extraSliders.isDoubleSided ?? 0,
        bgaCount: matCode === 3 ? 2 : 0,
        qtyBoards: qty,
      };
    }
    case "vinyl-cutting": {
      const [w, h] = dims ?? [300, 200];
      return {
        areaCm2: (w * h) / 100,
        materialCode: matCode,
        colorCount: extraSliders.colorCount ?? 1,
        quantity: qty,
      };
    }
    case "pcb-fabrication": {
      const [w, h] = dims ?? [100, 80];
      return {
        areaCm2: (w * h) / 100,
        layers: extraSliders.layers ?? 2,
        quantity: qty,
        minTraceMm: 0.2,
        surfaceFinishCode: matCode,
      };
    }
    default:
      return meta.defaultParams;
  }
}

function MLPricePanel({
  serviceKey, meta, form, extraSliders,
}: {
  serviceKey: string;
  meta: typeof SERVICE_META[string];
  form: { material: string; dimensions: string; thickness: string; tolerance: string; quantity: string };
  extraSliders: Record<string, number>;
}) {
  const [estimate, setEstimate] = useState<MLEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchEstimate = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildMLParams(serviceKey, meta, form, extraSliders);
      const res = await fetch("/api/price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ equipment: meta.modelId, params }),
      });
      const data = await res.json();
      if (data.ok) setEstimate({ price: data.price, low: data.low, high: data.high });
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [serviceKey, meta, form, extraSliders]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(fetchEstimate, 450);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [fetchEstimate]);

  return (
    <div style={{
      background: "#fff", border: "1px solid #E5E7EB",
      borderRadius: 20, padding: "24px", position: "sticky", top: 24,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <Cpu size={16} color="#7C3AED" />
        <p style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>ML Price Estimate</p>
        {loading && <Loader2 size={14} color="#9CA3AF" className="spin" />}
      </div>

      {estimate ? (
        <>
          <div style={{
            background: "linear-gradient(135deg, #F97316 0%, #EF4444 100%)",
            borderRadius: 14, padding: "20px", textAlign: "center", color: "#fff", marginBottom: 16,
          }}>
            <p style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>Estimated Price</p>
            <p style={{
              fontSize: 38, fontWeight: 800, lineHeight: 1,
              opacity: loading ? 0.5 : 1, transition: "opacity 0.2s",
            }}>
              ₹{estimate.price.toLocaleString("en-IN")}
            </p>
            <p style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
              ₹{estimate.low.toLocaleString("en-IN")} – ₹{estimate.high.toLocaleString("en-IN")} range
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
            {[
              ["Model", meta.name],
              ["Based on", "500+ real Indian market prices"],
              ["Accuracy", "±18% typical range"],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#9CA3AF" }}>{label}</span>
                <span style={{ fontWeight: 600, color: "#374151" }}>{value}</span>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 16, padding: "10px 14px", borderRadius: 10,
            background: "#F5F3FF", border: "1px solid #DDD6FE", fontSize: 12, color: "#7C3AED",
          }}>
            Gradient boosting model trained on Indian makerspace pricing data. Final quote from the space may vary.
          </div>
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "24px 0", color: "#9CA3AF" }}>
          <Loader2 size={28} className="spin" style={{ margin: "0 auto 12px" }} />
          <p style={{ fontSize: 13 }}>Calculating estimate...</p>
        </div>
      )}
    </div>
  );
}

// ─── Extra sliders per service ─────────────────────────────────────────────

function ExtraControls({
  serviceKey,
  sliders,
  onChange,
}: {
  serviceKey: string;
  sliders: Record<string, number>;
  onChange: (key: string, val: number) => void;
}) {
  const sel = (key: string, label: string, options: { label: string; value: number }[]) => (
    <div key={key}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
        {label}
      </label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {options.map((o) => {
          const active = (sliders[key] ?? options[0].value) === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(key, o.value)}
              style={{
                padding: "7px 14px", borderRadius: 8, fontFamily: "inherit",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                border: active ? "2px solid #F97316" : "2px solid #E5E7EB",
                background: active ? "#FFF7ED" : "#fff",
                color: active ? "#C2410C" : "#6B7280",
                transition: "all 0.12s",
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  switch (serviceKey) {
    case "cnc-milling":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {sel("complexity", "Job Complexity", [
            { label: "Simple", value: 1 }, { label: "Medium", value: 2 },
            { label: "Complex", value: 3 }, { label: "Very Complex", value: 5 },
          ])}
          {sel("numSetups", "No. of Setups", [
            { label: "1", value: 1 }, { label: "2", value: 2 }, { label: "3", value: 3 },
          ])}
        </div>
      );
    case "lathe":
      return sel("numOperations", "No. of Operations", [
        { label: "1 op", value: 1 }, { label: "2 ops", value: 2 },
        { label: "3 ops", value: 3 }, { label: "5 ops", value: 5 },
      ]);
    case "soldering":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {sel("smdCount", "SMD Components (approx)", [
            { label: "< 10", value: 5 }, { label: "10–30", value: 20 },
            { label: "30–80", value: 50 }, { label: "80+", value: 120 },
          ])}
          {sel("thtCount", "Through-hole Components", [
            { label: "None", value: 0 }, { label: "< 10", value: 5 },
            { label: "10–30", value: 20 }, { label: "30+", value: 50 },
          ])}
          {sel("isDoubleSided", "Sides", [
            { label: "Single-sided", value: 0 }, { label: "Double-sided", value: 1 },
          ])}
        </div>
      );
    case "vinyl-cutting":
      return sel("colorCount", "Number of Colours", [
        { label: "1", value: 1 }, { label: "2", value: 2 },
        { label: "3", value: 3 }, { label: "4+", value: 4 },
      ]);
    case "pcb-fabrication":
      return sel("layers", "PCB Layers", [
        { label: "1L", value: 1 }, { label: "2L", value: 2 },
        { label: "4L", value: 4 }, { label: "6L", value: 6 },
      ]);
    default:
      return null;
  }
}

// ─── Main form ─────────────────────────────────────────────────────────────────

function RequestForm({ serviceKey, meta }: { serviceKey: string; meta: typeof SERVICE_META[string] }) {
  const [submitted, setSubmitted]   = useState(false);
  const [loading, setLoading]       = useState(false);
  const [extraSliders, setSliders]  = useState<Record<string, number>>({});
  const [form, setForm] = useState({
    name: "", phone: "", email: "", city: "",
    material: "", dimensions: "", thickness: "", tolerance: "",
    quantity: "1", description: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1400));
    setLoading(false);
    setSubmitted(true);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 16px",
    border: "2px solid #E5E7EB", borderRadius: 12,
    fontSize: 14, fontFamily: "inherit", outline: "none",
    boxSizing: "border-box", transition: "border-color 0.15s",
    background: "#fff",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 700,
    color: "#374151", textTransform: "uppercase",
    letterSpacing: "0.06em", marginBottom: 8,
  };

  if (submitted) {
    return (
      <div style={{ textAlign: "center", padding: "56px 24px" }}>
        <div style={{
          width: 88, height: 88, borderRadius: "50%",
          background: "#F0FDF4", border: "3px solid #86EFAC",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 24px",
        }}>
          <CheckCircle size={48} color="#16A34A" />
        </div>
        <h3 style={{ fontSize: 26, fontWeight: 800, color: "#111827", marginBottom: 12 }}>
          Quote Request Sent!
        </h3>
        <p style={{ color: "#6B7280", fontSize: 15, marginBottom: 8, lineHeight: 1.6 }}>
          We&apos;ve sent your <strong>{meta.name}</strong> request to verified spaces in{" "}
          <strong>{form.city || "your area"}</strong>.
        </p>
        <p style={{ color: "#9CA3AF", fontSize: 14, marginBottom: 32 }}>
          You&apos;ll receive quotes on <strong>{form.phone || form.email}</strong> within 2 hours.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/" className="btn btn-primary btn-lg" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            Browse More Services
          </Link>
          <Link href="/dashboard/customer" className="btn btn-outline btn-lg">My Orders</Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Contact details */}
      <div>
        <p style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 16 }}>Your Contact Details</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Full Name</label>
            <input style={inputStyle} placeholder="Arjun Singh" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label style={labelStyle}>Phone</label>
            <input style={inputStyle} placeholder="9876543210" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} type="email" placeholder="you@example.com" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>City</label>
            <select style={{ ...inputStyle, cursor: "pointer" }} value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })} required>
              <option value="">Select city</option>
              {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: 20 }}>
        <p style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 16 }}>Job Specifications</p>

        {/* Material */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Material</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {meta.materials.map((m) => {
              const sel = form.material === m;
              return (
                <button key={m} type="button" onClick={() => setForm({ ...form, material: m })} style={{
                  padding: "8px 16px", borderRadius: 999,
                  border: sel ? "2px solid #F97316" : "2px solid #E5E7EB",
                  background: sel ? "#FFF7ED" : "#fff",
                  color: sel ? "#C2410C" : "#6B7280",
                  fontWeight: 700, fontSize: 13, cursor: "pointer",
                  fontFamily: "inherit", transition: "all 0.15s",
                }}>
                  {m}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dimensional + standard fields */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          {meta.fields.includes("dimensions") && (
            <div>
              <label style={labelStyle}>Dimensions (mm)</label>
              <input style={inputStyle} placeholder="e.g. 200 × 150" value={form.dimensions}
                onChange={(e) => setForm({ ...form, dimensions: e.target.value })} />
            </div>
          )}
          {meta.fields.includes("thickness") && (
            <div>
              <label style={labelStyle}>Thickness (mm)</label>
              <input style={inputStyle} type="number" placeholder="e.g. 6" value={form.thickness}
                onChange={(e) => setForm({ ...form, thickness: e.target.value })} />
            </div>
          )}
          {meta.fields.includes("tolerance") && (
            <div>
              <label style={labelStyle}>Tolerance</label>
              <div style={{ position: "relative" }}>
                <select style={{ ...inputStyle, cursor: "pointer", appearance: "none" }} value={form.tolerance}
                  onChange={(e) => setForm({ ...form, tolerance: e.target.value })}>
                  <option value="">Standard (±0.5mm)</option>
                  <option value="medium">Medium (±0.2mm)</option>
                  <option value="high">High (±0.1mm)</option>
                  <option value="very-high">Very High (±0.05mm)</option>
                </select>
                <ChevronDown size={14} color="#9CA3AF" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              </div>
            </div>
          )}
          <div>
            <label style={labelStyle}>Quantity</label>
            <input style={inputStyle} type="number" min="1" placeholder="1" value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
          </div>
        </div>

        {/* Service-specific extra controls that also feed the ML estimate */}
        <ExtraControls
          serviceKey={serviceKey}
          sliders={extraSliders}
          onChange={(k, v) => setSliders((prev) => ({ ...prev, [k]: v }))}
        />
      </div>

      {/* File upload */}
      <div>
        <label style={labelStyle}>Upload Design File <span style={{ fontWeight: 400, color: "#9CA3AF" }}>(optional)</span></label>
        <div style={{
          border: "2px dashed #D1D5DB", borderRadius: 14,
          padding: "28px 24px", textAlign: "center",
          background: "#F9FAFB", cursor: "pointer",
        }}>
          <Upload size={24} color="#9CA3AF" style={{ margin: "0 auto 8px" }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
            Drop your file here or click to browse
          </p>
          <p style={{ fontSize: 12, color: "#9CA3AF" }}>Accepted: {meta.fileTypes} · Max 50 MB</p>
        </div>
      </div>

      {/* Description */}
      <div>
        <label style={labelStyle}>Project Description</label>
        <textarea
          style={{ ...inputStyle, minHeight: 100, resize: "vertical", lineHeight: 1.6 }}
          placeholder={`Describe your ${meta.name.toLowerCase()} job — requirements, surface finish, special notes...`}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          required
        />
      </div>

      {/* ML estimate on mobile (inline, below description) */}
      <div className="ml-panel-mobile">
        <MLPricePanel serviceKey={serviceKey} meta={meta} form={form} extraSliders={extraSliders} />
      </div>

      <button type="submit" disabled={loading} className="btn btn-primary btn-lg"
        style={{ width: "100%", justifyContent: "center", fontSize: 15 }}>
        {loading
          ? <><Loader2 size={16} className="spin" /> Sending to spaces...</>
          : `Request ${meta.name} Quote`
        }
      </button>
      <p style={{ textAlign: "center", fontSize: 12, color: "#9CA3AF" }}>
        Free to request · Spaces respond within 2 hours · No commitment
      </p>

      {/* Passing form + sliders to ML panel (desktop sidebar re-renders via props) */}
      <input type="hidden" value={JSON.stringify(extraSliders)} />
    </form>
  );
}

// ─── Page shell ───────────────────────────────────────────────────────────────

function RequestPageContent() {
  const searchParams = useSearchParams();
  const serviceKey = searchParams.get("service") ?? "laser-cutting";
  const meta = SERVICE_META[serviceKey] ?? SERVICE_META["laser-cutting"];

  // Lift form + slider state here so sidebar ML panel stays in sync
  const [form, setForm] = useState({
    name: "", phone: "", email: "", city: "",
    material: "", dimensions: "", thickness: "", tolerance: "",
    quantity: "1", description: "",
  });
  const [extraSliders, setSliders] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1400));
    setLoading(false);
    setSubmitted(true);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 16px",
    border: "2px solid #E5E7EB", borderRadius: 12,
    fontSize: 14, fontFamily: "inherit", outline: "none",
    boxSizing: "border-box", background: "#fff",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 700,
    color: "#374151", textTransform: "uppercase",
    letterSpacing: "0.06em", marginBottom: 8,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB" }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #F3F4F6" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#9CA3AF", marginBottom: 20, textDecoration: "none" }}>
            <ArrowLeft size={14} /> Back to Services
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: "#FFF7ED", border: "2px solid #FED7AA",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 26, flexShrink: 0,
            }}>
              {meta.emoji}
            </div>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: "#111827" }}>Request {meta.name} Quote</h1>
              <p style={{ fontSize: 14, color: "#9CA3AF", marginTop: 4 }}>{meta.description}</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>
        {/* Trust indicators */}
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
          {["Free to request", "Verified spaces only", "2hr response time", "Pay only on confirm"].map((t) => (
            <span key={t} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6B7280" }}>
              <CheckCircle size={14} color="#22C55E" />{t}
            </span>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "start" }}>
          {/* Form */}
          <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 24, padding: "36px" }}>
            {submitted ? (
              <div style={{ textAlign: "center", padding: "56px 24px" }}>
                <div style={{ width: 88, height: 88, borderRadius: "50%", background: "#F0FDF4", border: "3px solid #86EFAC", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
                  <CheckCircle size={48} color="#16A34A" />
                </div>
                <h3 style={{ fontSize: 26, fontWeight: 800, color: "#111827", marginBottom: 12 }}>Quote Request Sent!</h3>
                <p style={{ color: "#6B7280", fontSize: 15, marginBottom: 8, lineHeight: 1.6 }}>
                  We&apos;ve sent your <strong>{meta.name}</strong> request to verified spaces in <strong>{form.city || "your area"}</strong>.
                </p>
                <p style={{ color: "#9CA3AF", fontSize: 14, marginBottom: 32 }}>
                  You&apos;ll receive quotes on <strong>{form.phone || form.email}</strong> within 2 hours.
                </p>
                <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                  <Link href="/" className="btn btn-primary btn-lg" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>Browse More Services</Link>
                  <Link href="/dashboard/customer" className="btn btn-outline btn-lg">My Orders</Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Contact */}
                <div>
                  <p style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 16 }}>Your Contact Details</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={labelStyle}>Full Name</label>
                      <input style={inputStyle} placeholder="Arjun Singh" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                    </div>
                    <div>
                      <label style={labelStyle}>Phone</label>
                      <input style={inputStyle} placeholder="9876543210" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <label style={labelStyle}>Email</label>
                      <input style={inputStyle} type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </div>
                    <div>
                      <label style={labelStyle}>City</label>
                      <select style={{ ...inputStyle, cursor: "pointer" }} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required>
                        <option value="">Select city</option>
                        {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: 20 }}>
                  <p style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 16 }}>Job Specifications</p>

                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Material</label>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {meta.materials.map((m) => {
                        const active = form.material === m;
                        return (
                          <button key={m} type="button" onClick={() => setForm({ ...form, material: m })} style={{
                            padding: "8px 16px", borderRadius: 999,
                            border: active ? "2px solid #F97316" : "2px solid #E5E7EB",
                            background: active ? "#FFF7ED" : "#fff",
                            color: active ? "#C2410C" : "#6B7280",
                            fontWeight: 700, fontSize: 13, cursor: "pointer",
                            fontFamily: "inherit", transition: "all 0.15s",
                          }}>{m}</button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    {meta.fields.includes("dimensions") && (
                      <div>
                        <label style={labelStyle}>Dimensions (mm)</label>
                        <input style={inputStyle} placeholder="e.g. 200 × 150" value={form.dimensions} onChange={(e) => setForm({ ...form, dimensions: e.target.value })} />
                      </div>
                    )}
                    {meta.fields.includes("thickness") && (
                      <div>
                        <label style={labelStyle}>Thickness (mm)</label>
                        <input style={inputStyle} type="number" placeholder="e.g. 6" value={form.thickness} onChange={(e) => setForm({ ...form, thickness: e.target.value })} />
                      </div>
                    )}
                    {meta.fields.includes("tolerance") && (
                      <div>
                        <label style={labelStyle}>Tolerance</label>
                        <select style={{ ...inputStyle, cursor: "pointer" }} value={form.tolerance} onChange={(e) => setForm({ ...form, tolerance: e.target.value })}>
                          <option value="">Standard (±0.5mm)</option>
                          <option value="medium">Medium (±0.2mm)</option>
                          <option value="high">High (±0.1mm)</option>
                          <option value="very-high">Very High (±0.05mm)</option>
                        </select>
                      </div>
                    )}
                    <div>
                      <label style={labelStyle}>Quantity</label>
                      <input style={inputStyle} type="number" min="1" placeholder="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
                    </div>
                  </div>

                  <ExtraControls serviceKey={serviceKey} sliders={extraSliders} onChange={(k, v) => setSliders((p) => ({ ...p, [k]: v }))} />
                </div>

                <div>
                  <label style={labelStyle}>Upload Design File <span style={{ fontWeight: 400, color: "#9CA3AF" }}>(optional)</span></label>
                  <div style={{ border: "2px dashed #D1D5DB", borderRadius: 14, padding: "28px 24px", textAlign: "center", background: "#F9FAFB", cursor: "pointer" }}>
                    <Upload size={24} color="#9CA3AF" style={{ margin: "0 auto 8px" }} />
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Drop your file here or click to browse</p>
                    <p style={{ fontSize: 12, color: "#9CA3AF" }}>Accepted: {meta.fileTypes} · Max 50 MB</p>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Project Description</label>
                  <textarea style={{ ...inputStyle, minHeight: 100, resize: "vertical", lineHeight: 1.6 }}
                    placeholder={`Describe your ${meta.name.toLowerCase()} job...`}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    required />
                </div>

                <button type="submit" disabled={loading} className="btn btn-primary btn-lg" style={{ width: "100%", justifyContent: "center", fontSize: 15 }}>
                  {loading ? <><Loader2 size={16} className="spin" /> Sending to spaces...</> : `Request ${meta.name} Quote`}
                </button>
                <p style={{ textAlign: "center", fontSize: 12, color: "#9CA3AF" }}>
                  Free to request · Spaces respond within 2 hours · No commitment
                </p>
              </form>
            )}
          </div>

          {/* Sidebar — ML price estimate (desktop) */}
          {!submitted && (
            <MLPricePanel serviceKey={serviceKey} meta={meta} form={form} extraSliders={extraSliders} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function RequestPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: 80, textAlign: "center" }}>
        <Loader2 size={32} color="#F97316" className="spin" style={{ margin: "0 auto" }} />
      </div>
    }>
      <RequestPageContent />
    </Suspense>
  );
}
