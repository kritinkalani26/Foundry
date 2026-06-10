"use client";

import { useEffect, useState, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AssemblyAnalysis, StoreInfo } from "@/app/api/analyze-assembly/route";
import { storeEstimate } from "@/lib/analyze-utils";

const PROCESS_STYLE: Record<string, { color: string; icon: string }> = {
  "3D Print":        { color: "bg-blue-100 text-blue-800",    icon: "🖨️" },
  "CNC Mill":        { color: "bg-orange-100 text-orange-800", icon: "⚙️" },
  "Laser Cut":       { color: "bg-purple-100 text-purple-800", icon: "⚡" },
  "Lathe":           { color: "bg-green-100 text-green-800",   icon: "🔩" },
  "Sheet Metal":     { color: "bg-teal-100 text-teal-800",     icon: "🔨" },
  "Urethane":        { color: "bg-indigo-100 text-indigo-800", icon: "🧪" },
  "Manual/Purchase": { color: "bg-gray-100 text-gray-600",    icon: "🛒" },
};

export default function PartOrderPage() {
  return <Suspense><PartOrderInner /></Suspense>;
}

function PartOrderInner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useSearchParams();

  const partName   = params.get("partName") || "";
  const process    = params.get("process") || "";
  const material   = params.get("material") || "";
  const baseEstimate = Number(params.get("estimate") || 0);

  const [analysis, setAnalysis] = useState<AssemblyAnalysis | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem("assembly_analysis");
    if (raw) {
      try { setAnalysis(JSON.parse(raw) as AssemblyAnalysis); } catch { /* ignore */ }
    }
  }, []);

  if (status === "loading") return null;
  if (!session) { router.push("/auth/login"); return null; }

  if (!partName) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">No part selected. <button onClick={() => router.push("/analyze")} className="text-blue-600 underline">Go back</button></p>
        </div>
      </div>
    );
  }

  const stores = analysis ? Object.values(analysis.storeMap) : [];
  const storeQuotes: Array<StoreInfo & { quote: number }> = stores
    .map(s => ({ ...s, quote: storeEstimate(baseEstimate, s) }))
    .sort((a, b) => a.quote - b.quote);

  const chosen = storeQuotes.find(s => s.id === selectedStoreId);
  const style = PROCESS_STYLE[process] || { color: "bg-gray-100 text-gray-700", icon: "🔧" };

  const handlePlace = async () => {
    setPlacing(true); setError("");
    try {
      const res = await fetch("/api/orders/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parts: [{
            partName,
            process,
            material,
            estimatedCostInr: chosen?.quote ?? baseEstimate,
            storeId: selectedStoreId || undefined,
            notes,
          }],
          city: (session.user as { city?: string }).city || "Mumbai",
          projectName: analysis?.assemblyName || "Assembly",
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error || "Order failed");
      setPlaced(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order failed");
    } finally {
      setPlacing(false);
    }
  };

  if (placed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center max-w-md w-full shadow-sm">
          <p className="text-4xl mb-3">✅</p>
          <h2 className="text-xl font-bold text-gray-900">Order placed!</h2>
          <p className="text-gray-600 text-sm mt-2">
            <strong>{partName}</strong> has been sent{chosen ? ` to ${chosen.name}` : ""}. They&apos;ll review and send a quote.
          </p>
          <div className="flex gap-3 justify-center mt-5">
            <button onClick={() => router.push("/dashboard/customer")} className="rounded-xl bg-blue-600 text-white font-semibold py-2 px-5 hover:bg-blue-700 transition-colors">View orders</button>
            <button onClick={() => router.back()} className="rounded-xl bg-white border border-gray-200 text-gray-700 font-semibold py-2 px-5 hover:bg-gray-50 transition-colors">Back to assembly</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Back */}
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
          ← Back to assembly
        </button>

        {/* Part details */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-5">
          <div className="flex items-start gap-3">
            <span className="text-3xl">{style.icon}</span>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">{partName}</h1>
              {analysis?.assemblyName && <p className="text-sm text-gray-400">From: {analysis.assemblyName}</p>}
              <div className="flex gap-2 mt-2 flex-wrap">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${style.color}`}>{process}</span>
                <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">{material}</span>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional notes for the store <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="e.g. tolerance requirements, colour, surface finish..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Store list */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-5">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Choose a store</h2>
            <p className="text-xs text-gray-400 mt-0.5">Prices are estimates — the store will confirm after reviewing your order</p>
          </div>

          {storeQuotes.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">
              No stores available yet. Your order will be broadcast to all stores.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {storeQuotes.map((store, i) => (
                <button
                  key={store.id}
                  onClick={() => setSelectedStoreId(store.id)}
                  className={`w-full text-left px-6 py-4 flex items-center gap-4 hover:bg-blue-50 transition-colors ${
                    selectedStoreId === store.id ? "bg-blue-50 border-l-4 border-blue-500" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 text-sm">{store.name}</p>
                      {i === 0 && <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">Cheapest</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{store.city} · ⭐ {store.rating.toFixed(1)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold text-gray-900">₹{store.quote.toLocaleString("en-IN")}</p>
                    <p className="text-xs text-gray-400">estimate</p>
                  </div>
                  {selectedStoreId === store.id && (
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Place order */}
        {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

        <button
          onClick={handlePlace}
          disabled={placing}
          className="w-full rounded-xl bg-blue-600 text-white font-bold py-3.5 hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {placing ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block" />
              Placing order…
            </span>
          ) : selectedStoreId
            ? `Place order with ${chosen?.name}`
            : "Place order (any available store)"}
        </button>
        <p className="text-center text-xs text-gray-400 mt-2">
          No payment now — you&apos;ll confirm and pay after receiving the store&apos;s actual quote
        </p>
      </div>
    </div>
  );
}
