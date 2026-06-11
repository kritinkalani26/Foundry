"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Check, CheckCircle, Upload, Loader2, Cpu,
  ChevronDown, ChevronRight, Shield, User, Phone, Mail, MapPin,
} from "lucide-react";
import MatchedSuppliers from "@/components/MatchedSuppliers";

// ─── Service metadata ─────────────────────────────────────────────────────────

const SERVICE_META: Record<string, {
  name: string; emoji: string; description: string; fileTypes: string;
  fields: string[]; materials: string[];
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
  "sheet-metal": {
    name: "Sheet Metal Fabrication", emoji: "🔨",
    description: "Upload your 2D design (DXF, SVG) and specify material and thickness for cutting, bending, and forming.",
    fileTypes: "DXF, SVG, PDF, STEP",
    fields: ["dimensions", "thickness", "quantity"],
    materials: ["Mild Steel", "Stainless Steel", "Aluminium", "Galvanized Steel", "Copper", "Brass"],
    modelId: "laser-cutter",
    materialCodes: { "Mild Steel": 0, "Stainless Steel": 1, Aluminium: 2, "Galvanized Steel": 3, Copper: 4, Brass: 5 },
    defaultParams: { widthMm: 300, heightMm: 200, thicknessMm: 2, quantity: 1 },
  },
  "urethane-casting": {
    name: "Urethane Casting", emoji: "🧪",
    description: "Low-volume casting using silicone molds. Upload your 3D model and specify material hardness and quantity.",
    fileTypes: "STL, STEP, OBJ",
    fields: ["dimensions", "quantity"],
    materials: ["Rigid Urethane (Shore D)", "Flexible Urethane (Shore A)", "Semi-rigid PU", "Pigmented / Coloured PU"],
    modelId: "cnc-mill",
    materialCodes: { "Rigid Urethane (Shore D)": 0, "Flexible Urethane (Shore A)": 1, "Semi-rigid PU": 2, "Pigmented / Coloured PU": 3 },
    defaultParams: { stockVolumeCm3: 150, materialCode: 0, complexity: 2, numSetups: 1 },
  },
};

const CITIES = [
  "Bengaluru", "Mumbai", "Delhi", "Pune", "Hyderabad", "Chennai",
  "Kolkata", "Ahmedabad", "Indore", "Kota", "Nagpur", "Bhopal",
  "Varanasi", "Patna",
];

const CERT_OPTIONS = [
  { id: "iso9001",   label: "ISO 9001:2015",   desc: "Quality Management",        color: "#2563EB", bg: "#EFF6FF" },
  { id: "as9100d",   label: "AS9100D",          desc: "Aerospace QMS",             color: "#0369A1", bg: "#F0F9FF" },
  { id: "nadcap",    label: "NADCAP",           desc: "Aerospace Special Process",  color: "#0369A1", bg: "#F0F9FF" },
  { id: "iatf16949", label: "IATF 16949",       desc: "Automotive QMS",            color: "#92400E", bg: "#FFFBEB" },
  { id: "iso13485",  label: "ISO 13485",        desc: "Medical Devices",           color: "#DC2626", bg: "#FEF2F2" },
  { id: "ipc610",    label: "IPC-A-610",        desc: "Electronics Assembly",      color: "#16A34A", bg: "#F0FDF4" },
  { id: "jstd001",   label: "J-STD-001",        desc: "Soldering Requirements",    color: "#16A34A", bg: "#F0FDF4" },
  { id: "aws",       label: "AWS D1.1",         desc: "Structural Welding",        color: "#64748B", bg: "#F8FAFC" },
  { id: "iso14001",  label: "ISO 14001",        desc: "Environmental Mgmt",        color: "#15803D", bg: "#F0FDF4" },
  { id: "udyam",     label: "MSME Udyam",       desc: "India MSME Registration",   color: "#D97706", bg: "#FFFBEB" },
  { id: "gem",       label: "GeM Seller",       desc: "Govt e-Marketplace",        color: "#D97706", bg: "#FFFBEB" },
];

// ─── ML helpers ───────────────────────────────────────────────────────────────

interface MLEstimate { price: number; low: number; high: number; }

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
  const qty     = Math.max(1, parseInt(form.quantity) || 1);
  const matCode = form.material ? (meta.materialCodes[form.material] ?? 0) : 0;
  const thick   = parseFloat(form.thickness) || (meta.defaultParams.thicknessMm ?? 3);
  const dims    = form.dimensions ? parseFirstTwoNumbers(form.dimensions) : null;

  switch (serviceKey) {
    case "laser-cutting": {
      const [w, h] = dims ?? [meta.defaultParams.widthMm, meta.defaultParams.heightMm];
      return { widthMm: w, heightMm: h, materialCode: matCode, thicknessMm: thick, quantity: qty };
    }
    case "cnc-milling": {
      const [w, h] = dims ?? [200, 100];
      const depth  = thick || 20;
      return { stockVolumeCm3: (w * h * depth) / 1000, materialCode: matCode, complexity: extraSliders.complexity ?? 2, numSetups: extraSliders.numSetups ?? 1 };
    }
    case "lathe": {
      const [dia, len] = dims ?? [meta.defaultParams.diameterMm, meta.defaultParams.lengthMm];
      return { diameterMm: dia, lengthMm: len, materialCode: matCode, isPrecision: form.tolerance ? 1 : 0, numOperations: extraSliders.numOperations ?? 2 };
    }
    case "water-jet": {
      const [w, h] = dims ?? [300, 200];
      return { cutLengthMm: 2 * (w + h) + 400, areaCm2: (w * h) / 100, materialCode: matCode, thicknessMm: thick, quantity: qty };
    }
    case "soldering": {
      return { thtCount: extraSliders.thtCount ?? meta.defaultParams.thtCount, smdCount: extraSliders.smdCount ?? meta.defaultParams.smdCount, boardAreaCm2: extraSliders.boardAreaCm2 ?? 25, isDoubleSided: extraSliders.isDoubleSided ?? 0, bgaCount: matCode === 3 ? 2 : 0, qtyBoards: qty };
    }
    case "vinyl-cutting": {
      const [w, h] = dims ?? [300, 200];
      return { areaCm2: (w * h) / 100, materialCode: matCode, colorCount: extraSliders.colorCount ?? 1, quantity: qty };
    }
    case "pcb-fabrication": {
      const [w, h] = dims ?? [100, 80];
      return { areaCm2: (w * h) / 100, layers: extraSliders.layers ?? 2, quantity: qty, minTraceMm: 0.2, surfaceFinishCode: matCode };
    }
    default:
      return meta.defaultParams;
  }
}

// ─── ML Price Panel ───────────────────────────────────────────────────────────

function MLPricePanel({
  serviceKey, meta, form, extraSliders, onEstimate,
}: {
  serviceKey: string;
  meta: typeof SERVICE_META[string];
  form: { material: string; dimensions: string; thickness: string; tolerance: string; quantity: string };
  extraSliders: Record<string, number>;
  onEstimate?: (price: number) => void;
}) {
  const [estimate, setEstimate] = useState<MLEstimate | null>(null);
  const [loading, setLoading]   = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchEstimate = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildMLParams(serviceKey, meta, form, extraSliders);
      const res  = await fetch("/api/price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ equipment: meta.modelId, params }),
      });
      const data = await res.json();
      if (data.ok) {
        setEstimate({ price: data.price, low: data.low, high: data.high });
        onEstimate?.(data.price);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [serviceKey, meta, form, extraSliders, onEstimate]);

  useEffect(() => {
    if (!form.material) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(fetchEstimate, 450);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [fetchEstimate, form.material]);

  return (
    <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 20, padding: "24px", position: "sticky", top: 120 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <Cpu size={16} color="#7C3AED" />
        <p style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>ML Price Estimate</p>
        {loading && <Loader2 size={14} color="#9CA3AF" className="spin" />}
      </div>

      {estimate ? (
        <>
          <div style={{ background: "linear-gradient(135deg, #F97316 0%, #EF4444 100%)", borderRadius: 14, padding: "20px", textAlign: "center", color: "#fff", marginBottom: 16 }}>
            <p style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>Estimated Price</p>
            <p style={{ fontSize: 38, fontWeight: 800, lineHeight: 1, opacity: loading ? 0.5 : 1, transition: "opacity 0.2s" }}>
              ₹{estimate.price.toLocaleString("en-IN")}
            </p>
            <p style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
              ₹{estimate.low.toLocaleString("en-IN")} – ₹{estimate.high.toLocaleString("en-IN")} range
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
            {[["Model", meta.name], ["Based on", "500+ real Indian market prices"], ["Accuracy", "±18% typical range"]].map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#9CA3AF" }}>{label}</span>
                <span style={{ fontWeight: 600, color: "#374151" }}>{value}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 10, background: "#F5F3FF", border: "1px solid #DDD6FE", fontSize: 12, color: "#7C3AED" }}>
            Gradient boosting model trained on Indian makerspace pricing data. Final quote from the space may vary.
          </div>
        </>
      ) : loading ? (
        <div style={{ textAlign: "center", padding: "24px 0", color: "#9CA3AF" }}>
          <Loader2 size={28} className="spin" style={{ margin: "0 auto 12px" }} />
          <p style={{ fontSize: 13 }}>Calculating estimate…</p>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "24px 0", color: "#9CA3AF" }}>
          <Cpu size={28} style={{ margin: "0 auto 12px", opacity: 0.35 }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: "#6B7280" }}>Select a material to see a price estimate</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>The ML model estimates based on your specs</p>
        </div>
      )}
    </div>
  );
}

// ─── Extra controls per service ───────────────────────────────────────────────

function ExtraControls({ serviceKey, sliders, onChange }: {
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
        {options.map(o => {
          const active = (sliders[key] ?? options[0].value) === o.value;
          return (
            <button key={o.value} type="button" onClick={() => onChange(key, o.value)} style={{
              padding: "7px 14px", borderRadius: 8, fontFamily: "inherit",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              border: active ? "2px solid #F97316" : "2px solid #E5E7EB",
              background: active ? "#FFF7ED" : "#fff",
              color: active ? "#C2410C" : "#6B7280",
              transition: "all 0.12s",
            }}>{o.label}</button>
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

// ─── Stepper ──────────────────────────────────────────────────────────────────

type Step = "upload" | "configure" | "match" | "done";

const STEPS: { key: Step; label: string }[] = [
  { key: "upload",    label: "Upload File" },
  { key: "configure", label: "Job Specs" },
  { key: "match",     label: "Choose Space" },
  { key: "done",      label: "Confirmed" },
];

// ─── Page content ─────────────────────────────────────────────────────────────

function RequestPageContent() {
  const searchParams = useSearchParams();
  const serviceKey   = searchParams.get("service") ?? "laser-cutting";
  const meta         = SERVICE_META[serviceKey] ?? SERVICE_META["laser-cutting"];

  const [step, setStep]             = useState<Step>("upload");
  const [uploadedFile, setFile]     = useState<File | null>(null);
  const [isDragging, setDragging]   = useState(false);
  const [form, setForm] = useState({
    material: "", dimensions: "", thickness: "", tolerance: "",
    quantity: "1", description: "", city: "",
  });
  const [extraSliders, setSliders]  = useState<Record<string, number>>({});
  const [requiredCerts, setCerts]   = useState<string[]>([]);
  const [mlEstimate, setMlEstimate] = useState<number | null>(null);
  const [userProfile, setProfile]   = useState<{
    name: string; email: string; phone: string | null; city: string | null;
  } | null>(null);
  const [orderId, setOrderId]       = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string>("");

  const currentIndex = STEPS.findIndex(s => s.key === step);

  useEffect(() => {
    if (step === "configure" && !userProfile) {
      fetch("/api/account/profile")
        .then(r => r.json())
        .then(d => {
          if (d.data) {
            setProfile(d.data);
            if (d.data.city) setForm(prev => ({ ...prev, city: d.data.city }));
          }
        })
        .catch(() => {});
    }
  }, [step, userProfile]);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) { setFile(file); setStep("configure"); }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) { setFile(file); setStep("configure"); }
  }

  async function handleSupplierSelected(supplierId: string) {
    setOrderError("");
    try {
      const res = await fetch("/api/service-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceKey,
          material:      form.material,
          dimensions:    form.dimensions,
          thickness:     form.thickness,
          tolerance:     form.tolerance,
          quantity:      form.quantity,
          description:   form.description,
          estimatedPrice: mlEstimate,
          supplierId,
          city:          form.city || "Bengaluru",
          certifications: requiredCerts,
        }),
      });
      const data = await res.json() as { data?: { id: string }; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to create request");
      if (!data.data?.id) throw new Error("No order ID returned");
      setOrderId(data.data.id);
      setStep("done");
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : "Failed to submit request. Please try again.");
    }
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

      {/* Sticky stepper */}
      <div style={{ background: "#fff", borderBottom: "1px solid #F3F4F6", position: "sticky", top: 64, zIndex: 40, padding: "14px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {STEPS.map(({ key, label }, idx) => {
              const done   = idx < currentIndex;
              const active = idx === currentIndex;
              return (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 6, flex: idx < STEPS.length - 1 ? 1 : "none" }}>
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 7,
                    padding: "8px 18px", borderRadius: 999,
                    fontSize: 13, fontWeight: 700, whiteSpace: "nowrap",
                    background: done ? "#F0FDF4" : active ? "#F97316" : "#F3F4F6",
                    color:      done ? "#15803D" : active ? "#fff"     : "#9CA3AF",
                    boxShadow: active ? "0 2px 12px rgba(249,115,22,.25)" : "none",
                    transition: "all 0.2s",
                  }}>
                    {done
                      ? <Check size={14} />
                      : <span style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${active ? "rgba(255,255,255,0.6)" : "#D1D5DB"}`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800 }}>{idx + 1}</span>
                    }
                    {label}
                  </div>
                  {idx < STEPS.length - 1 && <ChevronRight size={14} color="#D1D5DB" style={{ flexShrink: 0 }} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 24px" }}>

        {/* ── STEP 1: UPLOAD ──────────────────────────────── */}
        {step === "upload" && (
          <div style={{ maxWidth: 600, margin: "0 auto" }}>
            <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#9CA3AF", marginBottom: 28, textDecoration: "none" }}>
              <ArrowLeft size={14} /> Back to Services
            </Link>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <div style={{ width: 64, height: 64, borderRadius: 18, background: "#FFF7ED", border: "2px solid #FED7AA", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 16px" }}>
                {meta.emoji}
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111827", marginBottom: 10 }}>
                Upload Your Design File
              </h1>
              <p style={{ color: "#9CA3AF", fontSize: 14, lineHeight: 1.6 }}>{meta.description}</p>
            </div>

            <label
              htmlFor="design-file"
              style={{
                display: "block",
                border: isDragging ? "2.5px dashed #F97316" : "2.5px dashed #D1D5DB",
                borderRadius: 20, padding: "48px 32px", textAlign: "center",
                background: isDragging ? "#FFF7ED" : "#fff",
                cursor: "pointer", transition: "all 0.15s",
              }}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <Upload size={36} color={isDragging ? "#F97316" : "#9CA3AF"} style={{ margin: "0 auto 16px" }} />
              <p style={{ fontSize: 16, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
                Drop your {meta.name} file here
              </p>
              <p style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 20 }}>
                Accepted: {meta.fileTypes} · Max 50 MB
              </p>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 24px", background: "#F97316", color: "#fff", borderRadius: 10, fontSize: 14, fontWeight: 700 }}>
                <Upload size={15} /> Browse File
              </div>
              <input
                id="design-file" type="file" style={{ display: "none" }}
                onChange={handleFileInput}
                accept={meta.fileTypes.split(", ").map(t => `.${t.toLowerCase()}`).join(",")}
              />
            </label>

            <p style={{ textAlign: "center", marginTop: 20 }}>
              <button
                onClick={() => setStep("configure")}
                style={{ background: "none", border: "none", color: "#9CA3AF", fontSize: 13, cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}
              >
                Continue without a file — describe your job in words
              </button>
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 32 }}>
              {[
                { label: "Accepted formats", sub: meta.fileTypes },
                { label: "Max file size",    sub: "50 MB" },
                { label: "File privacy",     sub: "Your file stays private" },
              ].map(({ label, sub }) => (
                <div key={label} style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14, padding: "16px", textAlign: "center" }}>
                  <p style={{ fontWeight: 700, color: "#374151", fontSize: 13 }}>{label}</p>
                  <p style={{ color: "#9CA3AF", fontSize: 12, marginTop: 4 }}>{sub}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 2: CONFIGURE ────────────────────────────── */}
        {step === "configure" && (
          <div>
            <button onClick={() => setStep("upload")} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#9CA3AF", marginBottom: 28, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
              <ArrowLeft size={14} /> Back to Upload
            </button>

            <div className="req-layout">
              <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 24, padding: "32px" }}>

                {/* Profile read-only card */}
                {userProfile ? (
                  <div style={{ marginBottom: 24, padding: "14px 18px", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 14 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Your Details</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#374151" }}>
                        <User size={13} color="#9CA3AF" /> {userProfile.name}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#374151" }}>
                        <Mail size={13} color="#9CA3AF" /> {userProfile.email}
                      </span>
                      {userProfile.phone && (
                        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#374151" }}>
                          <Phone size={13} color="#9CA3AF" /> {userProfile.phone}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ marginBottom: 24, padding: "14px 18px", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 14, display: "flex", alignItems: "center", gap: 8 }}>
                    <Loader2 size={14} className="spin" color="#9CA3AF" />
                    <span style={{ fontSize: 13, color: "#9CA3AF" }}>Loading your profile...</span>
                  </div>
                )}

                {/* File indicator */}
                {uploadedFile && (
                  <div style={{ marginBottom: 20, padding: "10px 16px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#15803D" }}>
                    <CheckCircle size={14} />
                    <span>File: <strong>{uploadedFile.name}</strong> ({(uploadedFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                )}

                <p style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 20 }}>Job Specifications</p>

                {/* City */}
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Your City</label>
                  <div style={{ position: "relative" }}>
                    <select
                      style={{ ...inputStyle, cursor: "pointer", appearance: "none" }}
                      value={form.city}
                      onChange={e => setForm({ ...form, city: e.target.value })}
                    >
                      <option value="">Select city</option>
                      {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown size={14} color="#9CA3AF" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                  </div>
                </div>

                {/* Material */}
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Material</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {meta.materials.map(m => {
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

                {/* Dimension/spec fields */}
                <div className="req-form-2col" style={{ marginBottom: 16 }}>
                  {meta.fields.includes("dimensions") && (
                    <div>
                      <label style={labelStyle}>Dimensions (mm)</label>
                      <input style={inputStyle} placeholder="e.g. 200 × 150" value={form.dimensions}
                        onChange={e => setForm({ ...form, dimensions: e.target.value })} />
                    </div>
                  )}
                  {meta.fields.includes("thickness") && (
                    <div>
                      <label style={labelStyle}>Thickness (mm)</label>
                      <input style={inputStyle} type="number" placeholder="e.g. 6" value={form.thickness}
                        onChange={e => setForm({ ...form, thickness: e.target.value })} />
                    </div>
                  )}
                  {meta.fields.includes("tolerance") && (
                    <div>
                      <label style={labelStyle}>Tolerance</label>
                      <div style={{ position: "relative" }}>
                        <select style={{ ...inputStyle, cursor: "pointer", appearance: "none" }} value={form.tolerance}
                          onChange={e => setForm({ ...form, tolerance: e.target.value })}>
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
                    <input style={inputStyle} type="number" min="1" value={form.quantity}
                      onChange={e => setForm({ ...form, quantity: e.target.value })} />
                  </div>
                </div>

                <ExtraControls serviceKey={serviceKey} sliders={extraSliders} onChange={(k, v) => setSliders(p => ({ ...p, [k]: v }))} />

                {/* Description */}
                <div style={{ marginTop: 16 }}>
                  <label style={labelStyle}>Project Description</label>
                  <textarea
                    style={{ ...inputStyle, minHeight: 100, resize: "vertical", lineHeight: 1.6 }}
                    placeholder={`Describe your ${meta.name.toLowerCase()} job — requirements, surface finish, special notes...`}
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                  />
                </div>

                {/* Certifications */}
                <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: 20, marginTop: 20 }}>
                  <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 6 }}>
                    <Shield size={13} color="#6B7280" />
                    Required Supplier Certifications
                    <span style={{ fontWeight: 400, color: "#9CA3AF", textTransform: "none", letterSpacing: 0, fontSize: 12 }}>(optional)</span>
                  </label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {CERT_OPTIONS.map(opt => {
                      const active = requiredCerts.includes(opt.id);
                      return (
                        <button key={opt.id} type="button"
                          onClick={() => setCerts(prev => prev.includes(opt.id) ? prev.filter(c => c !== opt.id) : [...prev, opt.id])}
                          style={{
                            padding: "7px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700,
                            border: active ? `2px solid ${opt.color}` : "2px solid #E5E7EB",
                            background: active ? opt.bg : "#fff",
                            color: active ? opt.color : "#9CA3AF",
                            cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
                            display: "flex", alignItems: "center", gap: 5,
                          }}>
                          {active && <Shield size={11} />}
                          <span>{opt.label}</span>
                          <span style={{ fontWeight: 400, opacity: 0.7 }}>· {opt.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Mobile ML panel */}
                <div className="ml-panel-mobile" style={{ marginTop: 20 }}>
                  <MLPricePanel serviceKey={serviceKey} meta={meta} form={form} extraSliders={extraSliders} onEstimate={setMlEstimate} />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!form.material) { alert("Please select a material first."); return; }
                    if (!form.city)     { alert("Please select your city."); return; }
                    setStep("match");
                  }}
                  className="btn btn-primary btn-lg"
                  style={{ width: "100%", justifyContent: "center", fontSize: 15, marginTop: 24 }}
                >
                  Find Matching Suppliers <ChevronRight size={16} />
                </button>
                <p style={{ textAlign: "center", fontSize: 12, color: "#9CA3AF", marginTop: 10 }}>
                  Free to request · Spaces respond within 2 hours · No commitment
                </p>
              </div>

              {/* Sidebar — desktop ML estimate */}
              <div className="req-layout-sidebar">
                <MLPricePanel serviceKey={serviceKey} meta={meta} form={form} extraSliders={extraSliders} onEstimate={setMlEstimate} />
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: MATCH ───────────────────────────────── */}
        {step === "match" && (
          <div>
            <button onClick={() => setStep("configure")} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#9CA3AF", marginBottom: 28, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
              <ArrowLeft size={14} /> Back to Specs
            </button>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <h1 style={{ fontSize: 32, fontWeight: 800, color: "#111827", marginBottom: 10 }}>Matched Suppliers</h1>
              <p style={{ color: "#9CA3AF", fontSize: 15 }}>Ranked by proximity · rating · price</p>
            </div>
            {orderError && (
              <div style={{ maxWidth: 720, margin: "0 auto 20px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "12px 16px", color: "#DC2626", fontSize: 14 }}>
                {orderError}
              </div>
            )}
            <MatchedSuppliers
              serviceKey={serviceKey}
              estimatedPrice={mlEstimate ?? 800}
              customerCity={form.city || userProfile?.city || undefined}
              onSelect={handleSupplierSelected}
            />
          </div>
        )}

        {/* ── STEP 4: DONE ─────────────────────────────────── */}
        {step === "done" && (
          <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center", padding: "56px 24px" }}>
            <div style={{ width: 88, height: 88, borderRadius: "50%", background: "#F0FDF4", border: "3px solid #86EFAC", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
              <CheckCircle size={48} color="#16A34A" />
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: "#111827", marginBottom: 12 }}>Quote Request Sent!</h2>
            <p style={{ color: "#6B7280", fontSize: 15, marginBottom: 8, lineHeight: 1.6 }}>
              We&apos;ve sent your <strong>{meta.name}</strong> request to the supplier in <strong>{form.city}</strong>.
            </p>
            <p style={{ color: "#9CA3AF", fontSize: 14, marginBottom: 32 }}>
              They&apos;ll confirm within 2 hours. Track it in your orders dashboard.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              {orderId && (
                <Link href={`/order/${orderId}`} className="btn btn-primary btn-lg" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  Track My Order
                </Link>
              )}
              <Link href="/dashboard/customer" className="btn btn-outline btn-lg">My Orders</Link>
              <Link href="/" className="btn btn-outline btn-lg">Browse Services</Link>
            </div>
          </div>
        )}
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
