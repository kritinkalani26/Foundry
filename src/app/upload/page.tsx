"use client";

import { useState, lazy, Suspense } from "react";
import { Check, Loader2, ChevronRight } from "lucide-react";
import STLUploader from "@/components/STLUploader";
import PriceEstimator from "@/components/PriceEstimator";
import MatchedPrinters from "@/components/MatchedPrinters";
import UPIPayment from "@/components/UPIPayment";
import type { STLMetrics, PrintSettings, PriceBreakdown } from "@/types";

const STLViewer = lazy(() => import("@/components/STLViewer"));

type Step = "upload" | "configure" | "match" | "pay";
const STEPS: { key: Step; label: string }[] = [
  { key: "upload", label: "Upload File" },
  { key: "configure", label: "Configure" },
  { key: "match", label: "Choose Printer" },
  { key: "pay", label: "Pay & Confirm" },
];

export default function UploadPage() {
  const [step, setStep] = useState<Step>("upload");
  const [stlFile, setStlFile] = useState<File | null>(null);
  const [metrics, setMetrics] = useState<STLMetrics | null>(null);
  const [settings, setSettings] = useState<PrintSettings>({ material: "PLA", infillDensity: 0.30, layerHeight: 0.20, quantity: 1 });
  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  const currentIndex = STEPS.findIndex((s) => s.key === step);

  function handleAnalyzed(file: File, m: STLMetrics) {
    setStlFile(file);
    setMetrics(m);
    setStep("configure");
  }

  function handleProceed(s: PrintSettings, price: PriceBreakdown) {
    setSettings(s);
    setPriceBreakdown(price);
    setStep("match");
  }

  async function handlePrinterSelected(printerId: string) {
    if (!stlFile || !metrics || !priceBreakdown) return;
    const formData = new FormData();
    formData.append("file", stlFile);
    formData.append("metrics", JSON.stringify(metrics));
    formData.append("settings", JSON.stringify(settings));
    formData.append("priceBreakdown", JSON.stringify(priceBreakdown));
    formData.append("printerId", printerId);
    formData.append("lat", "22.7196");
    formData.append("lng", "75.8577");
    formData.append("city", "Indore");

    try {
      const res = await fetch("/api/orders", { method: "POST", body: formData });
      const data = await res.json();
      if (data.data?.id) setOrderId(data.data.id);
    } catch { /* use demo id */ }

    setOrderId((prev) => prev ?? "demo-order-123");
    setStep("pay");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB" }}>
      {/* Progress stepper */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #F3F4F6",
        position: "sticky", top: 64, zIndex: 40, padding: "14px 24px",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {STEPS.map(({ key, label }, idx) => {
              const done = idx < currentIndex;
              const active = idx === currentIndex;
              return (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 6, flex: idx < STEPS.length - 1 ? 1 : "none" }}>
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 7,
                    padding: "8px 18px", borderRadius: 999,
                    fontSize: 13, fontWeight: 700, whiteSpace: "nowrap",
                    background: done ? "#F0FDF4" : active ? "#F97316" : "#F3F4F6",
                    color: done ? "#15803D" : active ? "#fff" : "#9CA3AF",
                    boxShadow: active ? "0 2px 12px rgba(249,115,22,.25)" : "none",
                    transition: "all 0.2s",
                  }}>
                    {done
                      ? <Check size={14} />
                      : <span style={{
                          width: 18, height: 18, borderRadius: "50%",
                          border: `2px solid ${active ? "rgba(255,255,255,0.6)" : "#D1D5DB"}`,
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, fontWeight: 800,
                        }}>{idx + 1}</span>
                    }
                    {label}
                  </div>
                  {idx < STEPS.length - 1 && (
                    <ChevronRight size={14} color="#D1D5DB" style={{ flexShrink: 0 }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 24px" }}>

        {/* STEP 1 — UPLOAD */}
        {step === "upload" && (
          <div style={{ maxWidth: 600, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <h1 style={{ fontSize: 32, fontWeight: 800, color: "#111827", marginBottom: 10 }}>
                Upload Your 3D Model
              </h1>
              <p style={{ color: "#9CA3AF", fontSize: 15 }}>
                File is parsed in your browser — no upload needed for the estimate
              </p>
            </div>
            <STLUploader onAnalyzed={handleAnalyzed} />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 36 }}>
              {[
                { label: "In-browser parsing", sub: "No server wait" },
                { label: "Binary + ASCII STL", sub: "Both formats" },
                { label: "Up to 50 MB", sub: "Large models fine" },
              ].map(({ label, sub }) => (
                <div key={label} style={{
                  background: "#fff", border: "1px solid #E5E7EB",
                  borderRadius: 14, padding: "16px", textAlign: "center",
                }}>
                  <p style={{ fontWeight: 700, color: "#374151", fontSize: 13 }}>{label}</p>
                  <p style={{ color: "#9CA3AF", fontSize: 12, marginTop: 4 }}>{sub}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2 — CONFIGURE */}
        {step === "configure" && stlFile && metrics && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
            {/* 3D viewer */}
            <div style={{ position: "sticky", top: 140, alignSelf: "start" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 12 }}>3D Preview</h2>
              <div style={{
                background: "#F3F4F6", borderRadius: 20, overflow: "hidden",
                border: "1px solid #E5E7EB", height: 420,
              }}>
                <Suspense fallback={
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Loader2 size={32} color="#F97316" className="spin" />
                  </div>
                }>
                  <STLViewer file={stlFile} metrics={metrics} />
                </Suspense>
              </div>

              {/* Metric pills */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 16 }}>
                {[
                  { label: "Volume", value: `${metrics.volumeCm3.toFixed(2)} cm³` },
                  { label: "Surface", value: `${metrics.surfaceAreaCm2.toFixed(1)} cm²` },
                  { label: "Triangles", value: metrics.triangleCount.toLocaleString() },
                ].map(({ label, value }) => (
                  <div key={label} style={{
                    background: "#fff", border: "2px solid #E5E7EB",
                    borderRadius: 14, padding: "14px 12px", textAlign: "center",
                    boxShadow: "0 2px 8px rgba(0,0,0,.04)",
                  }}>
                    <p style={{ fontWeight: 800, color: "#111827", fontSize: 14 }}>{value}</p>
                    <p style={{ color: "#9CA3AF", fontSize: 11, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Price estimator — more breathing room */}
            <div style={{ paddingTop: 4 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 20 }}>Configure &amp; Price</h2>
              <PriceEstimator metrics={metrics} onSettingsChange={setSettings} onProceed={handleProceed} />
            </div>
          </div>
        )}

        {/* STEP 3 — MATCH */}
        {step === "match" && metrics && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <h1 style={{ fontSize: 32, fontWeight: 800, color: "#111827", marginBottom: 10 }}>
                Matched Printer Owners
              </h1>
              <p style={{ color: "#9CA3AF", fontSize: 15 }}>Ranked by proximity · rating · price</p>
            </div>
            <MatchedPrinters
              metrics={metrics}
              settings={settings}
              priceBreakdown={priceBreakdown!}
              onSelect={handlePrinterSelected}
            />
          </div>
        )}

        {/* STEP 4 — PAY */}
        {step === "pay" && priceBreakdown && (
          <div style={{ maxWidth: 480, margin: "0 auto" }}>
            <UPIPayment orderId={orderId ?? "demo-order-123"} amount={priceBreakdown.finalPrice} />
          </div>
        )}
      </div>
    </div>
  );
}
