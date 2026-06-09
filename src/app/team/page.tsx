"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AuthGate from "@/components/AuthGate";

interface TeamMember { id: string; userId: string; role: string; joinedAt: string; user: { id: string; name: string; email: string; avatarUrl?: string }; }
interface Team { id: string; name: string; members: TeamMember[]; }
interface Order { id: string; status: string; material: string; createdAt: string; customer: { name: string }; stlAnalysis?: { fileName: string }; notes?: string; }

function TeamPreview() {
  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", padding: "40px 24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111827", marginBottom: 6 }}>Teamspace</h1>
        <p style={{ color: "#6B7280", fontSize: 15, marginBottom: 28 }}>Collaborate on orders and share your part library with your team.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #E5E7EB", padding: 24 }}>
            <div style={{ width: 120, height: 18, background: "#F3F4F6", borderRadius: 4, marginBottom: 8 }} />
            <div style={{ width: "80%", height: 13, background: "#F3F4F6", borderRadius: 4, marginBottom: 20 }} />
            <div style={{ width: "100%", height: 38, background: "#F3F4F6", borderRadius: 10, marginBottom: 12 }} />
            <div style={{ width: "100%", height: 42, background: "#DBEAFE", borderRadius: 10 }} />
          </div>
          <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #E5E7EB", padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 8 }}>
            <div style={{ fontSize: 32 }}>🔗</div>
            <div style={{ width: 100, height: 18, background: "#F3F4F6", borderRadius: 4 }} />
            <div style={{ width: "80%", height: 26, background: "#F3F4F6", borderRadius: 4 }} />
          </div>
        </div>
        <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #E5E7EB", padding: 24 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: i < 3 ? 16 : 0, marginBottom: i < 3 ? 16 : 0, borderBottom: i < 3 ? "1px solid #F3F4F6" : "none" }}>
              <div style={{ width: 36, height: 36, background: "#E5E7EB", borderRadius: "50%", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ width: "35%", height: 13, background: "#F3F4F6", borderRadius: 4, marginBottom: 5 }} />
                <div style={{ width: "50%", height: 11, background: "#F3F4F6", borderRadius: 4 }} />
              </div>
              <div style={{ width: 60, height: 22, background: "#F3F4F6", borderRadius: 999 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TeamPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [team, setTeam] = useState<Team | null>(null);
  const [myRole, setMyRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState("");
  const [creating, setCreating] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3000); };

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/teams").then(r => r.json()).then((d: { team?: Team; role?: string }) => {
      setTeam(d.team ?? null);
      setMyRole((d.role as "ADMIN" | "MEMBER") ?? "MEMBER");
      setLoading(false);
      if (d.team) {
        fetch(`/api/teams/${d.team.id}`).then(r => r.json()).then(o => setOrders(Array.isArray(o) ? o : []));
      }
    });
  }, [status, router]);

  const handleCreate = async () => {
    if (!teamName.trim()) return;
    setCreating(true); setError("");
    const res = await fetch("/api/teams", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: teamName }) });
    const data = await res.json() as { team?: Team; role?: string; error?: string };
    if (!res.ok) { setError(data.error || "Failed"); setCreating(false); return; }
    setTeam(data.team!); setMyRole(data.role as "ADMIN" | "MEMBER");
    setCreating(false);
  };

  const handleInvite = async () => {
    if (!team) return;
    const res = await fetch(`/api/teams/${team.id}/invite`, { method: "POST" });
    const data = await res.json() as { inviteUrl?: string };
    if (data.inviteUrl) setInviteUrl(data.inviteUrl);
  };

  const copyInvite = () => { navigator.clipboard.writeText(inviteUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const handleRemove = async (userId: string) => {
    if (!team || !confirm("Remove this member?")) return;
    await fetch(`/api/teams/${team.id}/members`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) });
    setTeam(prev => prev ? { ...prev, members: prev.members.filter(m => m.userId !== userId) } : null);
  };

  const handleLeave = async () => {
    if (!team || !confirm("Leave this team?")) return;
    await fetch(`/api/teams/${team.id}`, { method: "DELETE" });
    setTeam(null); setOrders([]); showToast("You left the team");
  };

  const handlePromote = async (userId: string, role: "ADMIN" | "MEMBER") => {
    if (!team) return;
    await fetch(`/api/teams/${team.id}/members`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, role }) });
    setTeam(prev => prev ? { ...prev, members: prev.members.map(m => m.userId === userId ? { ...m, role } : m) } : null);
    showToast("Role updated");
  };

  const selfId = (session?.user as { id?: string })?.id;

  if (status === "loading") return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;
  if (status === "unauthenticated") return (
    <AuthGate
      featureName="Teamspace"
      featureDescription="Create a shared workspace for your organisation. Collaborate on orders, share your part library, and manage team members — all in one place."
      preview={<TeamPreview />}
    />
  );
  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">{toast}</div>}
      <div className="max-w-4xl mx-auto px-4 py-10">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Teamspace</h1>
          <p className="mt-1 text-gray-500">Collaborate on orders and share your part library with your team.</p>
        </div>

        {!team ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-1">Create a team</h2>
              <p className="text-sm text-gray-500 mb-4">Start a workspace for your project or organisation.</p>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                placeholder="e.g. Robotics Club, Startup Hardware"
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreate()}
              />
              {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
              <button onClick={handleCreate} disabled={!teamName.trim() || creating} className="w-full rounded-xl bg-blue-600 text-white font-semibold py-2.5 hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {creating ? "Creating…" : "Create team"}
              </button>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col justify-center items-center text-center">
              <p className="text-3xl mb-3">🔗</p>
              <h2 className="font-semibold text-gray-900 mb-1">Join a team</h2>
              <p className="text-sm text-gray-500">Ask a team admin to send you their invite link — clicking it will bring you here automatically.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{team.name}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {team.members.length} member{team.members.length !== 1 ? "s" : ""} · You are {myRole === "ADMIN" ? "an admin" : "a member"}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {myRole === "ADMIN" && (
                    <button onClick={handleInvite} className="rounded-xl bg-blue-600 text-white text-sm font-semibold py-2 px-4 hover:bg-blue-700 transition-colors">
                      + Invite member
                    </button>
                  )}
                  <button onClick={handleLeave} className="rounded-xl border border-red-200 text-red-500 text-sm font-semibold py-2 px-4 hover:bg-red-50 transition-colors">
                    Leave team
                  </button>
                </div>
              </div>

              {inviteUrl && (
                <div className="mt-4 rounded-xl bg-blue-50 border border-blue-200 p-4">
                  <p className="text-xs font-semibold text-blue-700 mb-2">Invite link · valid 7 days</p>
                  <div className="flex gap-2">
                    <input readOnly value={inviteUrl} className="flex-1 rounded-lg bg-white border border-blue-200 px-3 py-1.5 text-xs font-mono text-gray-700 focus:outline-none min-w-0" />
                    <button onClick={copyInvite} className="rounded-lg bg-blue-600 text-white text-xs font-bold px-3 py-1.5 hover:bg-blue-700 transition-colors shrink-0">
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Members */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Members</h3></div>
              <div className="divide-y divide-gray-100">
                {team.members.map(m => {
                  const isSelf = m.userId === selfId;
                  return (
                    <div key={m.id} className="px-6 py-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {m.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm">
                          {m.user.name}{isSelf && <span className="text-gray-400 font-normal ml-1">(you)</span>}
                        </p>
                        <p className="text-xs text-gray-500">{m.user.email}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${m.role === "ADMIN" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`}>
                        {m.role}
                      </span>
                      {myRole === "ADMIN" && !isSelf && (
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => handlePromote(m.userId, m.role === "ADMIN" ? "MEMBER" : "ADMIN")} className="text-xs text-blue-600 hover:underline">
                            {m.role === "ADMIN" ? "Demote" : "Promote"}
                          </button>
                          <button onClick={() => handleRemove(m.userId)} className="text-xs text-red-500 hover:underline">Remove</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Team orders */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Team Orders</h3>
                <span className="text-xs text-gray-400">{orders.length} recent</span>
              </div>
              {orders.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-gray-400">No orders yet from any team member.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {orders.map(o => (
                    <div key={o.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {o.notes?.split("|")[0]?.replace(/\[Assembly:|\bReorder from library:/g, "").trim() || o.stlAnalysis?.fileName || `Order ${o.id.slice(-6)}`}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {o.customer.name} · {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <StatusBadge status={o.status} />
                        <p className="text-xs text-gray-500 mt-0.5">{o.material}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    UPLOADED: "bg-gray-100 text-gray-600", QUOTED: "bg-yellow-100 text-yellow-700",
    CONFIRMED: "bg-blue-100 text-blue-700", PRINTING: "bg-indigo-100 text-indigo-700",
    QUALITY_CHECK: "bg-purple-100 text-purple-700", READY: "bg-green-100 text-green-700",
    DELIVERED: "bg-emerald-100 text-emerald-700",
  };
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[status] || "bg-gray-100 text-gray-600"}`}>{status.replace("_", " ")}</span>;
}
