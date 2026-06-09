"use client";

import { useEffect, useState } from "react";
import type { AssemblyAnalysis } from "@/app/api/analyze-assembly/route";

interface DfmPartResult {
  partName: string;
  suggestedProcess: string;
  skipped?: boolean;
  skipReason?: string;
  manufacturable?: boolean;
  confidence?: string;
  blockingReasons?: string[];
  warnings?: string[];
  suppliersCount?: number;
  topSupplier?: {
    id: string;
    process: string;
    leadDays: number;
    region: string;
    score: number;
  } | null;
  networkGap?: boolean;
  geometryNote?: string;
}

interface DfmResult {
  summary: { total: number; manufacturable: number; skipped: number; issues: number };
  parts: DfmPartResult[];
}

interface Props {
  analysis: AssemblyAnalysis;
  onClose: () => void;
}

const CONFIDENCE_LABEL: Record<string, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Based on process heuristics",
};

function StatusBadge({ result }: { result: DfmPartResult }) {
  if (result.skipped) {
    return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Skipped</span>;
  }
  if (!result.manufacturable) {
    return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Issues found</span>;
  }
  if (result.warnings?.length) {
    return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">Warnings</span>;
  }
  return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Ready</span>;
}

function StatusIcon({ result }: { result: DfmPartResult }) {
  if (result.skipped)        return <span className="text-gray-400 text-lg">🛒</span>;
  if (!result.manufacturable) return <span className="text-lg">❌</span>;
  if (result.warnings?.length) return <span className="text-lg">⚠️</span>;
  return <span className="text-lg">✅</span>;
}

function PartCard({ result }: { result: DfmPartResult }) {
  const [open, setOpen] = useState(!result.manufacturable && !result.skipped);

  const hasProblem = !result.skipped && (!result.manufacturable || (result.warnings?.length ?? 0) > 0);

  return (
    <div className={`rounded-xl border transition-colors ${
      result.skipped ? "border-gray-100 bg-gray-50"
      : !result.manufacturable ? "border-red-200 bg-red-50/30"
      : result.warnings?.length ? "border-yellow-200 bg-yellow-50/30"
      : "border-green-200 bg-green-50/20"
    }`}>
      <button
        className="w-full px-4 py-3 flex items-center gap-3 text-left"
        onClick={() => setOpen(v => !v)}
      >
        <StatusIcon result={result} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900 text-sm">{result.partName}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600">
              {result.suggestedProcess}
            </span>
            <StatusBadge result={result} />
          </div>
          {!open && hasProblem && (result.blockingReasons?.[0] || result.warnings?.[0]) && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {result.blockingReasons?.[0] ?? result.warnings?.[0]}
            </p>
          )}
        </div>
        {!result.skipped && (
          <svg
            className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {open && !result.skipped && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">

          {/* Blocking failures */}
          {result.blockingReasons && result.blockingReasons.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1.5">
                Blocking issues
              </p>
              <ul className="space-y-1">
                {result.blockingReasons.map((r, i) => (
                  <li key={i} className="flex gap-2 text-xs text-red-800">
                    <span className="shrink-0 mt-0.5">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {result.warnings && result.warnings.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wide mb-1.5">
                Warnings
              </p>
              <ul className="space-y-1">
                {result.warnings.map((w, i) => (
                  <li key={i} className="flex gap-2 text-xs text-yellow-800">
                    <span className="shrink-0 mt-0.5">•</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suppliers */}
          {result.manufacturable && (
            <div className="rounded-lg bg-white border border-gray-100 px-3 py-2.5">
              {result.suppliersCount && result.suppliersCount > 0 ? (
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-xs font-semibold text-gray-700">
                      {result.suppliersCount} supplier{result.suppliersCount > 1 ? "s" : ""} matched
                    </p>
                    {result.topSupplier && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Best: {result.topSupplier.id} · {result.topSupplier.leadDays}d lead time · {result.topSupplier.region}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-green-700 font-semibold bg-green-50 px-2 py-0.5 rounded-full">
                    Score {result.topSupplier ? (result.topSupplier.score * 100).toFixed(0) : "—"}%
                  </span>
                </div>
              ) : result.networkGap ? (
                <p className="text-xs text-orange-700">
                  ⚠️ No suppliers currently match this part — gap in the Foundry network.
                </p>
              ) : (
                <p className="text-xs text-gray-500">No supplier data available.</p>
              )}
            </div>
          )}

          {/* Confidence note */}
          {result.confidence && (
            <p className="text-[10px] text-gray-400 italic">
              {CONFIDENCE_LABEL[result.confidence] ?? result.confidence}.
              {result.geometryNote && ` ${result.geometryNote}`}
            </p>
          )}
        </div>
      )}

      {open && result.skipped && (
        <div className="px-4 pb-3 pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-500">{result.skipReason}</p>
        </div>
      )}
    </div>
  );
}

export default function DfmModal({ analysis, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [dfmResult, setDfmResult] = useState<DfmResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/dfm-analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parts: analysis.parts }),
    })
      .then(r => r.json())
      .then((data: DfmResult & { error?: string }) => {
        if (data.error) throw new Error(data.error);
        setDfmResult(data);
      })
      .catch(e => setError(e?.message ?? "DFM analysis failed"))
      .finally(() => setLoading(false));
  }, [analysis]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const s = dfmResult?.summary;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-4 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">DFM Check</h2>
            <p className="text-sm text-gray-500 mt-0.5">{analysis.assemblyName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">

          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
              <p className="text-sm text-gray-500">Running DFM rules on {analysis.parts.length} parts…</p>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {dfmResult && (
            <>
              {/* Summary bar */}
              <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 flex items-center gap-6 flex-wrap text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                  <span className="font-semibold text-gray-900">{s?.manufacturable}</span>
                  <span className="text-gray-500">ready</span>
                </div>
                {(s?.issues ?? 0) > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                    <span className="font-semibold text-gray-900">{s?.issues}</span>
                    <span className="text-gray-500">with issues</span>
                  </div>
                )}
                {(s?.skipped ?? 0) > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block" />
                    <span className="font-semibold text-gray-900">{s?.skipped}</span>
                    <span className="text-gray-500">purchase/skip</span>
                  </div>
                )}
                <p className="text-xs text-gray-400 ml-auto">
                  Geometry is estimated — upload individual STEP files for precise checks
                </p>
              </div>

              {/* Per-part results — issues first, then passes, then skipped */}
              {[
                ...dfmResult.parts.filter(p => !p.skipped && !p.manufacturable),
                ...dfmResult.parts.filter(p => !p.skipped && p.manufacturable),
                ...dfmResult.parts.filter(p => p.skipped),
              ].map(part => (
                <PartCard key={part.partName} result={part} />
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 shrink-0 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Rules sourced from dfm_engine/config/rules.yaml · supplier pool is sample data
          </p>
          <button
            onClick={onClose}
            className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
