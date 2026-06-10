"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AuthGate from "@/components/AuthGate";

const PROCESS_STYLE: Record<string, { color: string; icon: string }> = {
  "3D Print":        { color: "bg-blue-100 text-blue-800",    icon: "🖨️" },
  "CNC Mill":        { color: "bg-orange-100 text-orange-800", icon: "⚙️" },
  "Laser Cut":       { color: "bg-purple-100 text-purple-800", icon: "⚡" },
  "Lathe":           { color: "bg-green-100 text-green-800",   icon: "🔩" },
  "Sheet Metal":     { color: "bg-teal-100 text-teal-800",     icon: "🔨" },
  "Urethane":        { color: "bg-indigo-100 text-indigo-800", icon: "🧪" },
  "Manual/Purchase": { color: "bg-gray-100 text-gray-600",    icon: "🛒" },
};

interface SavedPart {
  id: string;
  name: string;
  process: string;
  material: string;
  estimatedCostInr: number;
  notes?: string;
  assemblyName?: string;
  orderCount: number;
  lastOrderedAt?: string;
  teamId?: string;
  team?: { id: string; name: string };
  createdAt: string;
  user?: { name: string };
}

const FILTERS = ["All", "3D Print", "CNC Mill", "Laser Cut", "Lathe", "Sheet Metal", "Urethane", "Manual/Purchase"];

function LibraryPreview() {
  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", padding: "40px 24px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111827", marginBottom: 6 }}>Part Library</h1>
            <p style={{ color: "#6B7280", fontSize: 15 }}>Saved parts from your assemblies. Reorder any part with one click.</p>
          </div>
          <div style={{ width: 160, height: 38, background: "#E5E7EB", borderRadius: 10 }} />
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          {["All", "3D Print", "CNC Mill", "Laser Cut", "Lathe"].map((f, i) => (
            <div key={f} style={{ height: 30, width: f === "All" ? 64 : 88, background: i === 0 ? "#EA580C" : "#F3F4F6", borderRadius: 999 }} />
          ))}
        </div>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ background: "#fff", borderRadius: 14, border: "1px solid #E5E7EB", padding: "16px 18px", marginBottom: 10, display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{ width: 40, height: 40, background: "#FFF7ED", borderRadius: 10, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ width: "40%", height: 14, background: "#F3F4F6", borderRadius: 4, marginBottom: 6 }} />
              <div style={{ width: "25%", height: 11, background: "#F3F4F6", borderRadius: 4 }} />
            </div>
            <div style={{ width: 90, height: 14, background: "#F3F4F6", borderRadius: 4 }} />
            <div style={{ width: 60, height: 30, background: "#F3F4F6", borderRadius: 8 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LibraryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [parts, setParts] = useState<SavedPart[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [reordering, setReordering] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/parts").then(r => r.json()).then(data => { setParts(Array.isArray(data) ? data : []); setLoading(false); });
  }, [status]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const handleReorder = async (part: SavedPart) => {
    setReordering(part.id);
    try {
      const res = await fetch(`/api/parts/${part.id}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: (session?.user as { city?: string })?.city || "Mumbai" }),
      });
      const data = await res.json() as { orderId?: string; error?: string };
      if (!res.ok) throw new Error(data.error);
      showToast(`Order placed for "${part.name}" — check your dashboard`);
      // Refresh to update orderCount
      fetch("/api/parts").then(r => r.json()).then(d => setParts(Array.isArray(d) ? d : []));
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Reorder failed");
    } finally {
      setReordering(null);
    }
  };

  const handleDelete = async (part: SavedPart) => {
    if (!confirm(`Remove "${part.name}" from your library?`)) return;
    setDeleting(part.id);
    await fetch(`/api/parts/${part.id}`, { method: "DELETE" });
    setParts(prev => prev.filter(p => p.id !== part.id));
    setDeleting(null);
  };

  const filtered = filter === "All" ? parts : parts.filter(p => p.process === filter);
  const personal = filtered.filter(p => !p.teamId);

  // Group team parts by their specific team
  const teamGroups = new Map<string, { name: string; parts: SavedPart[] }>();
  filtered.filter(p => p.teamId).forEach(p => {
    const key = p.teamId!;
    if (!teamGroups.has(key)) teamGroups.set(key, { name: p.team?.name ?? "Team", parts: [] });
    teamGroups.get(key)!.parts.push(p);
  });

  if (status === "loading") return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;
  if (status === "unauthenticated") return (
    <AuthGate
      featureName="Part Library"
      featureDescription="Save parts from your assemblies and reorder any part with a single click. Accessible from anywhere, synced with your team."
      preview={<LibraryPreview />}
    />
  );
  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">{toast}</div>
      )}
      <div className="max-w-5xl mx-auto px-4 py-10">

        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Part Library</h1>
            <p className="mt-1 text-gray-500">Saved parts from your assemblies. Reorder any part with one click.</p>
          </div>
          <button onClick={() => router.push("/analyze")} className="rounded-xl bg-blue-600 text-white font-semibold py-2.5 px-5 hover:bg-blue-700 transition-colors text-sm">
            + Analyse new assembly
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 flex-wrap mb-6">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                filter === f ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f === "All" ? `All (${parts.length})` : `${PROCESS_STYLE[f]?.icon} ${f}`}
            </button>
          ))}
        </div>

        {parts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
            <p className="text-4xl mb-3">📚</p>
            <h3 className="font-semibold text-gray-900">Your library is empty</h3>
            <p className="text-gray-500 text-sm mt-1">Save parts from the Assembly Analyzer to build your library.</p>
            <button onClick={() => router.push("/analyze")} className="mt-4 rounded-xl bg-blue-600 text-white font-semibold py-2 px-5 hover:bg-blue-700 transition-colors text-sm">
              Analyse an assembly
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {personal.length > 0 && (
              <Section title="My Parts" count={personal.length} parts={personal} reordering={reordering} deleting={deleting} onReorder={handleReorder} onDelete={handleDelete} />
            )}
            {Array.from(teamGroups.entries()).map(([, group]) => (
              <Section key={group.name} title={group.name} count={group.parts.length} parts={group.parts} reordering={reordering} deleting={deleting} onReorder={handleReorder} onDelete={handleDelete} showOwner />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, count, parts, reordering, deleting, onReorder, onDelete, showOwner }: {
  title: string; count: number; parts: SavedPart[];
  reordering: string | null; deleting: string | null;
  onReorder: (p: SavedPart) => void; onDelete: (p: SavedPart) => void;
  showOwner?: boolean;
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{title} · {count}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {parts.map(part => <PartCard key={part.id} part={part} reordering={reordering} deleting={deleting} onReorder={onReorder} onDelete={onDelete} showOwner={showOwner} />)}
      </div>
    </div>
  );
}

function PartCard({ part, reordering, deleting, onReorder, onDelete, showOwner }: {
  part: SavedPart; reordering: string | null; deleting: string | null;
  onReorder: (p: SavedPart) => void; onDelete: (p: SavedPart) => void;
  showOwner?: boolean;
}) {
  const style = PROCESS_STYLE[part.process] || { color: "bg-gray-100 text-gray-700", icon: "🔧" };
  const isReordering = reordering === part.id;
  const isDeleting = deleting === part.id;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-lg">{style.icon}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style.color}`}>{part.process}</span>
          </div>
          <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">{part.name}</h3>
          {part.assemblyName && <p className="text-xs text-gray-400 mt-0.5 truncate">from {part.assemblyName}</p>}
          {showOwner && part.user && <p className="text-xs text-blue-500 mt-0.5">{part.user.name}</p>}
        </div>
        <button onClick={() => onDelete(part)} disabled={isDeleting} className="text-gray-300 hover:text-red-400 transition-colors text-lg shrink-0" title="Remove from library">
          {isDeleting ? "…" : "×"}
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span className="bg-gray-100 px-2 py-0.5 rounded-full">{part.material}</span>
        {part.notes && <span className="truncate italic text-gray-400">{part.notes}</span>}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div>
          <p className="font-bold text-gray-900">₹{part.estimatedCostInr.toLocaleString("en-IN")}</p>
          <p className="text-xs text-gray-400">
            {part.orderCount > 0 ? `Ordered ${part.orderCount}×` : "Never ordered"}
            {part.lastOrderedAt && ` · ${new Date(part.lastOrderedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
          </p>
        </div>
        <button
          onClick={() => onReorder(part)}
          disabled={isReordering}
          className="rounded-xl bg-blue-600 text-white text-xs font-bold py-2 px-4 hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {isReordering ? "…" : "Reorder →"}
        </button>
      </div>
    </div>
  );
}
