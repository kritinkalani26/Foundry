"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { TrendingUp, AlertTriangle, Info, ChevronRight, Loader2, Cpu } from "lucide-react";
import { calculatePrice, MATERIALS, getLayerHeightLabel, getInfillLabel } from "@/lib/price-calculator";
import type { Material, PrintSettings, PriceBreakdown, STLMetrics, DemandStatus } from "@/types";

interface PriceEstimatorProps {
  metrics: STLMetrics;
  onSettingsChange: (s: PrintSettings) => void;
  onProceed: (s: PrintSettings, price: PriceBreakdown) => void;
}

const MATERIALS_LIST = (["PLA", "ABS", "PETG", "RESIN"] as Material[]);
const INFILL_OPTIONS  = [0.15, 0.30, 0.50, 0.80];
const LAYER_OPTIONS   = [0.10, 0.20, 0.30];
const QUANTITY_OPTIONS = [1, 2, 3, 5, 10];
const MATERIAL_CODE: Record<Material, number> = { PLA: 0, ABS: 1, PETG: 2, RESIN: 3 };

function SegmentedControl({
  options, value, onChange, formatLabel,
}: {
  options: (string | number)[];
  value: string | number;
  onChange: (v: string | number) => void;
  formatLabel?: (v: string | number) => string;
}) {
  return (
    <div className="seg-control">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`seg-btn${value === opt ? " active" : ""}`}
          style={value === opt ? { background: "#F97316", color: "#fff", boxShadow: "0 2px 8px rgba(249,115,22,.25)" } : {}}
        >
          {formatLabel ? formatLabel(opt) : opt}
        </button>
      ))}
    </div>
  );
}

export default function PriceEstimator({ metrics, onSettingsChange, onProceed }: PriceEstimatorProps) {
  const [settings, setSettings] = useState<PrintSettings>({
    material: "PLA", infillDensity: 0.30, layerHeight: 0.20, quantity: 1,
  });
  const [demand, setDemand] = useState<DemandStatus | null>(null);
  const [mlPrice, setMlPrice]   = useState<{ price: number; low: number; high: number } | null>(null);
  const [mlLoading, setMlLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/demand?city=Indore")
      .then((r) => r.json())
      .then((d) => setDemand(d.data))
      .catch(() => null);
  }, []);

  const surge = demand?.isHighDemand ? 1.2 : 1.0;

  // Formula-based breakdown (for bar chart proportions only)
  const formulaPrice = calculatePrice(metrics, settings, surge);

  const fetchMLPrice = useCallback(async (s: PrintSettings) => {
    setMlLoading(true);
    try {
      const res = await fetch("/api/price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipment: "3d-printer",
          params: {
            volumeCm3:     metrics.volumeCm3,
            infill:        s.infillDensity,
            layerHeight:   s.layerHeight,
            materialCode:  MATERIAL_CODE[s.material],
            triangleCount: metrics.triangleCount,
            quantity:      s.quantity,
          },
        }),
      });
      const data = await res.json();
      if (data.ok) {
        const surged = {
          price: Math.round(data.price * surge),
          low:   Math.round(data.low   * surge),
          high:  Math.round(data.high  * surge),
        };
        setMlPrice(surged);
      }
    } catch {
      // Fall back to formula price silently
      setMlPrice(null);
    } finally {
      setMlLoading(false);
    }
  }, [metrics, surge]);

  // Debounce ML calls by 350ms so we don't spam on rapid changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchMLPrice(settings), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [settings, fetchMLPrice]);

  function set<K extends keyof PrintSettings>(k: K, v: PrintSettings[K]) {
    const next = { ...settings, [k]: v };
    setSettings(next);
    onSettingsChange(next);
  }

  // Use ML price if available, otherwise fall back to formula
  const displayPrice = mlPrice?.price ?? formulaPrice.finalPrice;
  const displayLow   = mlPrice?.low   ?? formulaPrice.confidenceLow;
  const displayHigh  = mlPrice?.high  ?? formulaPrice.confidenceHigh;

  // Scale formula breakdown proportions to the ML total
  const scale = displayPrice / (formulaPrice.finalPrice || 1);
  const mat   = MATERIALS[settings.material];

  const breakdown = [
    {
      label: "Material cost",
      sub: `${metrics.volumeCm3.toFixed(1)} cm³ × ${Math.round(settings.infillDensity * 100)}% infill × ₹${mat.costPerCm3}/cm³`,
      value: Math.round(formulaPrice.materialCost * scale),
      pct:   formulaPrice.materialCost / formulaPrice.subtotal,
    },
    {
      label: "Machine time",
      sub: `${formulaPrice.estimatedPrintHours.toFixed(1)} hrs × ₹68/hr`,
      value: Math.round(formulaPrice.timeCost * scale),
      pct:   formulaPrice.timeCost / formulaPrice.subtotal,
    },
    ...(formulaPrice.complexitySurcharge > 0 ? [{
      label: "Complexity",
      sub:   `${metrics.triangleCount.toLocaleString()} triangles — ML complexity factor`,
      value: Math.round(formulaPrice.complexitySurcharge * scale),
      pct:   formulaPrice.complexitySurcharge / formulaPrice.subtotal,
    }] : []),
    ...(formulaPrice.supportCost > 0 ? [{
      label: "Support structures",
      sub:   "Tall/narrow geometry — +20% material",
      value: Math.round(formulaPrice.supportCost * scale),
      pct:   formulaPrice.supportCost / formulaPrice.subtotal,
    }] : []),
  ];

  // Build a PriceBreakdown-compatible object for onProceed
  const priceForProceed: PriceBreakdown = {
    ...formulaPrice,
    finalPrice:      displayPrice,
    confidenceLow:   displayLow,
    confidenceHigh:  displayHigh,
    materialCost:    breakdown[0].value,
    timeCost:        breakdown[1]?.value ?? formulaPrice.timeCost,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Demand alert */}
      {demand?.isHighDemand && (
        <div className="alert alert-red">
          <TrendingUp size={18} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p className="alert-title">High Demand in Your Area</p>
            <p>{demand.todayCount} orders today vs {Math.round(demand.weeklyAvg)} daily avg — prices are {Math.round((surge - 1) * 100)}% higher.</p>
          </div>
        </div>
      )}

      {/* Geometry warnings */}
      {(metrics.needsSupport || metrics.triangleCount > 50000) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {metrics.needsSupport && (
            <div className="alert alert-orange">
              <AlertTriangle size={14} style={{ flexShrink: 0 }} />
              Support structures detected — tall or narrow geometry
            </div>
          )}
          {metrics.triangleCount > 50000 && (
            <div className="alert alert-blue">
              <Info size={14} style={{ flexShrink: 0 }} />
              High-complexity model — ML adjusts price automatically
            </div>
          )}
        </div>
      )}

      {/* Material selector */}
      <div>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
          Material
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {MATERIALS_LIST.map((m) => (
            <button key={m} onClick={() => set("material", m)} style={{
              padding: "14px 16px", borderRadius: 14,
              border: settings.material === m ? "3px solid #F97316" : "2px solid #E5E7EB",
              background: settings.material === m ? "#FFF7ED" : "#fff",
              textAlign: "left", cursor: "pointer", fontFamily: "inherit",
              transition: "all 0.15s",
              boxShadow: settings.material === m ? "0 2px 12px rgba(249,115,22,.15)" : "none",
            }}>
              <p style={{ fontWeight: 800, fontSize: 14, color: settings.material === m ? "#C2410C" : "#111827" }}>
                {MATERIALS[m].label}
              </p>
              <p style={{ fontSize: 12, color: settings.material === m ? "#EA580C" : "#9CA3AF", marginTop: 2 }}>
                ₹{MATERIALS[m].costPerCm3}/cm³
              </p>
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 8 }}>{mat.description}</p>
      </div>

      {/* Infill */}
      <div>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
          Infill Density
        </label>
        <SegmentedControl options={INFILL_OPTIONS} value={settings.infillDensity}
          onChange={(v) => set("infillDensity", v as number)}
          formatLabel={(v) => `${Math.round((v as number) * 100)}%`} />
        <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 6 }}>{getInfillLabel(settings.infillDensity)}</p>
      </div>

      {/* Layer height */}
      <div>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
          Layer Height
        </label>
        <SegmentedControl options={LAYER_OPTIONS} value={settings.layerHeight}
          onChange={(v) => set("layerHeight", v as number)}
          formatLabel={(v) => `${v}mm`} />
        <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 6 }}>{getLayerHeightLabel(settings.layerHeight)}</p>
      </div>

      {/* Quantity */}
      <div>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
          Quantity
        </label>
        <SegmentedControl options={QUANTITY_OPTIONS} value={settings.quantity}
          onChange={(v) => set("quantity", v as number)}
          formatLabel={(v) => `${v}×`} />
      </div>

      {/* Price breakdown card */}
      <div className="price-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <p style={{ fontWeight: 700, color: "#111827", fontSize: 15 }}>Price Estimate</p>
            {mlLoading
              ? <Loader2 size={14} color="#9CA3AF" className="spin" />
              : mlPrice && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#7C3AED", background: "#F5F3FF", padding: "2px 8px", borderRadius: 99, fontWeight: 600 }}><Cpu size={10} /> ML</span>
            }
          </div>
          {surge > 1 && <span className="badge badge-surge">{surge}× Surge</span>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {breakdown.map(({ label, sub, value, pct }) => (
            <div key={label} className="price-bar-wrap">
              <div className="price-bar-label">
                <div>
                  <span className="price-bar-label-text">{label}</span>
                  <span className="price-bar-label-sub" style={{ display: "block" }}>{sub}</span>
                </div>
                <span className="price-bar-label-val">₹{value.toLocaleString()}</span>
              </div>
              <div className="price-bar-track">
                <div className="price-bar-fill" style={{ width: `${Math.min(100, pct * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="price-total-row">
          <div>
            <p style={{ fontSize: 13, color: "#9CA3AF" }}>Estimate</p>
            <p style={{ fontSize: 11, color: "#9CA3AF" }}>₹{displayLow.toLocaleString()} – ₹{displayHigh.toLocaleString()} range</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p className="price-total-amount" style={{ opacity: mlLoading ? 0.5 : 1, transition: "opacity 0.2s" }}>
              ₹{displayPrice.toLocaleString()}
            </p>
            <p className="price-total-sub">~{formulaPrice.estimatedPrintHours.toFixed(1)} hrs print</p>
          </div>
        </div>
      </div>

      <button
        onClick={() => onProceed(settings, priceForProceed)}
        className="btn btn-primary btn-lg"
        style={{ width: "100%", fontSize: 15, justifyContent: "center" }}
      >
        Find Printer Owners Near Me
        <ChevronRight size={18} style={{ marginLeft: 4 }} />
      </button>
      <p style={{ textAlign: "center", fontSize: 12, color: "#9CA3AF" }}>
        Free to browse · Pay only when you confirm
      </p>
    </div>
  );
}
