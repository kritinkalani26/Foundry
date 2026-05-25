"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { AssemblyAnalysis, PartAnalysis, StoreInfo } from "@/app/api/analyze-assembly/route";
import { storeEstimate } from "@/lib/analyze-utils";

const PROCESS_STYLE: Record<string, { color: string; icon: string }> = {
  "3D Print":        { color: "bg-blue-100 text-blue-800",    icon: "🖨️" },
  "CNC Mill":        { color: "bg-orange-100 text-orange-800", icon: "⚙️" },
  "Laser Cut":       { color: "bg-purple-100 text-purple-800", icon: "⚡" },
  "Lathe":           { color: "bg-green-100 text-green-800",   icon: "🔩" },
  "Manual/Purchase": { color: "bg-gray-100 text-gray-600",    icon: "🛒" },
};


export default function AnalyzePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stepFile, setStepFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AssemblyAnalysis | null>(null);
  const [error, setError] = useState("");

  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [orderingAll, setOrderingAll] = useState(false);
  const [orderingSelected, setOrderingSelected] = useState(false);
  const [ordersPlaced, setOrdersPlaced] = useState<{ count: number; mode: string } | null>(null);

  if (status === "loading") return null;
  if (!session) { router.push("/auth/signin"); return null; }

  const orderableParts = result?.parts.filter(p => p.process !== "Manual/Purchase") ?? [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "step" || ext === "stp") {
      setStepFile(file); setError(""); setResult(null); setOrdersPlaced(null); setChecked(new Set());
    } else {
      setError("Please upload a .step or .stp file.");
    }
  };

  const handleAnalyze = async () => {
    if (!stepFile) return;
    setAnalyzing(true); setError(""); setResult(null); setOrdersPlaced(null);
    const formData = new FormData();
    formData.append("step", stepFile);
    formData.append("description", description);
    try {
      const res = await fetch("/api/analyze-assembly", { method: "POST", body: formData });
      const text = await res.text();
      let data: AssemblyAnalysis & { error?: string };
      try { data = JSON.parse(text); } catch { throw new Error(`Server error: ${text.slice(0, 300)}`); }
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setResult(data);
      setChecked(new Set());
      // Cache for the order detail page
      localStorage.setItem("assembly_analysis", JSON.stringify(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleCheck = (partName: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(partName) ? next.delete(partName) : next.add(partName);
      return next;
    });
  };

  const toggleAll = () => {
    if (checked.size === orderableParts.length) {
      setChecked(new Set());
    } else {
      setChecked(new Set(orderableParts.map(p => p.partName)));
    }
  };

  const placeOrders = async (parts: PartAnalysis[], mode: string) => {
    if (!result) return;
    const res = await fetch("/api/orders/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parts: parts.map(p => {
          // pick cheapest store
          const storeIds = p.suggestedStoreIds;
          const cheapestStore = storeIds.reduce((best, id) => {
            const store = result.storeMap[id];
            if (!store) return best;
            const price = storeEstimate(p.estimatedCostInr, store);
            const bestPrice = best ? storeEstimate(p.estimatedCostInr, result.storeMap[best]!) : Infinity;
            return price < bestPrice ? id : best;
          }, storeIds[0]);
          return {
            partName: p.partName,
            process: p.process,
            material: p.material,
            estimatedCostInr: p.estimatedCostInr,
            storeId: cheapestStore,
          };
        }),
        city: (session.user as { city?: string }).city || "Mumbai",
        projectName: result.assemblyName,
      }),
    });
    const data = await res.json() as { orderIds?: string[]; count?: number; error?: string };
    if (!res.ok) throw new Error(data.error || "Order failed");
    return data.count ?? parts.length;
  };

  const handleOrderAll = async () => {
    setOrderingAll(true); setError("");
    try {
      const count = await placeOrders(orderableParts, "all");
      setOrdersPlaced({ count: count ?? orderableParts.length, mode: "all" });
    } catch (err) { setError(err instanceof Error ? err.message : "Order failed"); }
    finally { setOrderingAll(false); }
  };

  const handleOrderSelected = async () => {
    const parts = orderableParts.filter(p => checked.has(p.partName));
    setOrderingSelected(true); setError("");
    try {
      const count = await placeOrders(parts, "selected");
      setOrdersPlaced({ count: count ?? parts.length, mode: "selected" });
    } catch (err) { setError(err instanceof Error ? err.message : "Order failed"); }
    finally { setOrderingSelected(false); }
  };

  const goToPartOrder = (part: PartAnalysis) => {
    const params = new URLSearchParams({
      partName: part.partName,
      process: part.process,
      material: part.material,
      estimate: String(part.estimatedCostInr),
    });
    router.push(`/analyze/order?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-10">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Assembly Analyzer</h1>
          <p className="mt-2 text-gray-500">
            Upload a STEP file — AI reads every component and recommends how to manufacture each part.
            Then order individually, select specific parts, or order all at once.
          </p>
        </div>

        {/* Upload card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Upload your STEP file</h2>
          <div
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
              stepFile ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { const fake = { target: { files: [f] } } as unknown as React.ChangeEvent<HTMLInputElement>; handleFileChange(fake); } }}
            onDragOver={e => e.preventDefault()}
          >
            {stepFile ? (
              <div className="space-y-1">
                <p className="text-3xl">📐</p>
                <p className="font-semibold text-gray-900">{stepFile.name}</p>
                <p className="text-sm text-gray-500">{(stepFile.size / 1024 / 1024).toFixed(2)} MB · click to replace</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-5xl">📐</p>
                <p className="font-semibold text-gray-700">Drop .step / .stp here or click to browse</p>
                <p className="text-sm text-gray-400">Fusion 360: File → Export → STEP</p>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept=".step,.stp" className="hidden" onChange={handleFileChange} />
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Describe your assembly <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="e.g. 6-DOF robotic arm — structural links need to be rigid, gripper needs tight tolerances..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={!stepFile || analyzing}
            className="mt-4 w-full rounded-xl bg-blue-600 text-white font-semibold py-3 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {analyzing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block" />
                Analysing with Llama 3.3…
              </span>
            ) : "Analyse Assembly →"}
          </button>

          {error && <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
        </div>

        {/* Results */}
        {result && !ordersPlaced && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{result.assemblyName}</h2>
                  <p className="mt-1 text-sm text-gray-600 max-w-2xl">{result.summary}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">AI estimate</p>
                  <p className="text-2xl font-bold text-gray-900">₹{result.totalEstimatedCostInr.toLocaleString("en-IN")}</p>
                  <p className="text-xs text-gray-400">{result.parts.length} components</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {Object.entries(result.parts.reduce((acc, p) => { acc[p.process] = (acc[p.process] || 0) + 1; return acc; }, {} as Record<string, number>)).map(([proc, count]) => {
                  const s = PROCESS_STYLE[proc] || PROCESS_STYLE["3D Print"];
                  return <span key={proc} className={`text-xs font-semibold px-3 py-1 rounded-full ${s.color}`}>{s.icon} {count}× {proc}</span>;
                })}
              </div>
            </div>

            {/* Parts list */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Header row */}
              <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-3 bg-gray-50">
                <input
                  type="checkbox"
                  checked={checked.size === orderableParts.length && orderableParts.length > 0}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded accent-blue-600"
                  title="Select all orderable parts"
                />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {checked.size > 0 ? `${checked.size} selected` : `${result.parts.length} components`}
                </span>
              </div>

              <div className="divide-y divide-gray-100">
                {result.parts.map((part, i) => {
                  const isOrderable = part.process !== "Manual/Purchase";
                  const storeCount = Object.keys(result.storeMap).length;
                  return (
                    <PartRow
                      key={i}
                      part={part}
                      isOrderable={isOrderable}
                      storeCount={storeCount}
                      isChecked={checked.has(part.partName)}
                      onToggle={() => toggleCheck(part.partName)}
                      onViewOrder={() => goToPartOrder(part)}
                    />
                  );
                })}
              </div>
            </div>

            {/* Action bar */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-wrap items-center gap-3">
              {checked.size > 0 && (
                <button
                  onClick={handleOrderSelected}
                  disabled={orderingSelected}
                  className="rounded-xl bg-blue-600 text-white font-semibold py-2.5 px-5 hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {orderingSelected ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block" />
                      Placing…
                    </span>
                  ) : `Order Selected (${checked.size})`}
                </button>
              )}
              <button
                onClick={handleOrderAll}
                disabled={orderingAll || orderableParts.length === 0}
                className="rounded-xl bg-indigo-600 text-white font-semibold py-2.5 px-5 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {orderingAll ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block" />
                    Placing…
                  </span>
                ) : `Order All ${orderableParts.length} Parts (cheapest)`}
              </button>
              <p className="text-xs text-gray-400 ml-auto">
                &quot;Order All&quot; automatically picks the lowest-quoted store per part
              </p>
            </div>
          </div>
        )}

        {/* Success state */}
        {ordersPlaced && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
            <p className="text-4xl mb-3">✅</p>
            <h3 className="text-xl font-bold text-green-800">
              {ordersPlaced.count} order{ordersPlaced.count > 1 ? "s" : ""} placed!
            </h3>
            <p className="text-green-700 text-sm mt-2">
              Makerspace owners will review and send you quotes. You accept the one you want.
            </p>
            <div className="flex justify-center gap-3 mt-5">
              <button onClick={() => router.push("/dashboard/customer")} className="rounded-xl bg-green-600 text-white font-semibold py-2 px-5 hover:bg-green-700 transition-colors">
                View orders
              </button>
              <button onClick={() => { setOrdersPlaced(null); setChecked(new Set()); }} className="rounded-xl bg-white border border-green-300 text-green-700 font-semibold py-2 px-5 hover:bg-green-50 transition-colors">
                Order more parts
              </button>
            </div>
          </div>
        )}

        {/* How it works */}
        {!result && !analyzing && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">How it works</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: "📐", title: "Export STEP from CAD", desc: "File → Export → STEP. One file, all components, all names intact." },
                { icon: "🤖", title: "AI analyses each part", desc: "Llama 3.3 recommends the right process — 3D print, CNC, laser cut, lathe, or purchase." },
                { icon: "🚀", title: "Order your way", desc: "Order one part, selected parts, or everything at once. Stores send real quotes after." },
              ].map(item => (
                <div key={item.title} className="rounded-xl bg-gray-50 p-4">
                  <div className="text-3xl mb-2">{item.icon}</div>
                  <h4 className="font-semibold text-gray-900 text-sm">{item.title}</h4>
                  <p className="text-gray-500 text-sm mt-1 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PartRow({ part, isOrderable, storeCount, isChecked, onToggle, onViewOrder }: {
  part: PartAnalysis;
  isOrderable: boolean;
  storeCount: number;
  isChecked: boolean;
  onToggle: () => void;
  onViewOrder: () => void;
}) {
  const style = PROCESS_STYLE[part.process] || { color: "bg-gray-100 text-gray-700", icon: "🔧" };
  return (
    <div className={`px-6 py-4 flex items-center gap-3 hover:bg-gray-50 transition-colors ${isChecked ? "bg-blue-50" : ""}`}>
      {isOrderable ? (
        <input type="checkbox" checked={isChecked} onChange={onToggle} className="w-4 h-4 rounded accent-blue-600 shrink-0" />
      ) : (
        <div className="w-4 shrink-0" />
      )}
      <div className="text-xl shrink-0">{style.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-900 text-sm">{part.partName}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style.color}`}>{part.process}</span>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{part.material}</span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{part.reason}</p>
        {isOrderable && storeCount > 0 && (
          <p className="text-xs text-blue-600 mt-0.5">{storeCount} local store{storeCount > 1 ? "s" : ""} available</p>
        )}
      </div>
      <div className="shrink-0 text-right flex flex-col items-end gap-1">
        <p className="font-semibold text-gray-900 text-sm">₹{part.estimatedCostInr.toLocaleString("en-IN")}</p>
        {isOrderable && (
          <button
            onClick={onViewOrder}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium border border-blue-200 rounded-lg px-2.5 py-1 hover:bg-blue-50 transition-colors whitespace-nowrap"
          >
            View & Order →
          </button>
        )}
      </div>
    </div>
  );
}

