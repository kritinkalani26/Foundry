"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSession, signOut } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  User, MapPin, Package, Star, Shield, Loader2, CheckCircle,
  Plus, Trash2, Edit3, LogOut, Gift, ChevronRight, Upload,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Address {
  id: string; label: string; lineOne: string; lineTwo?: string;
  city: string; state: string; pincode: string; country: string;
  lat: number; lng: number; isDefault: boolean;
}

interface Benefit {
  id: string; type: string; description: string;
  expiresAt: string | null; isActive: boolean;
}

interface Subscription {
  plan: string; status: string;
  currentPeriodEnd: string; cancelledAt: string | null;
}

interface Order {
  id: string; status: string; material: string; infillDensity: number;
  quantity: number; totalPrice: number | null; estimatedPrice: number | null;
  createdAt: string;
  stlAnalysis: { fileName: string; volumeCm3: number } | null;
  quotes: Array<{ isAccepted: boolean; printerOwner: { user: { name: string } } }>;
}

interface Profile {
  id: string; name: string; email: string; phone: string | null;
  role: string; avatarUrl: string | null; city: string | null;
  createdAt: string;
  addresses: Address[];
  benefits:  Benefit[];
  subscription: Subscription | null;
}

// ─── Shared style helpers ────────────────────────────────────────────────────

const inputSt: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #E5E7EB",
  fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box",
  background: "#F9FAFB", color: "#111827",
};
const labelSt: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6,
};

// ─── Tab: Profile ────────────────────────────────────────────────────────────

function ProfileTab({ profile, onUpdate }: { profile: Profile; onUpdate: () => void }) {
  const [name, setName]     = useState(profile.name);
  const [phone, setPhone]   = useState(profile.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState("");
  const fileRef             = useRef<HTMLInputElement>(null);

  // Change email modal state
  const [emailModal, setEmailModal]   = useState(false);
  const [newEmail, setNewEmail]       = useState("");
  const [emailPw, setEmailPw]         = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMsg, setEmailMsg]       = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(""); setSaved(false);
    const form = new FormData();
    form.append("name", name);
    form.append("phone", phone);
    if (fileRef.current?.files?.[0]) form.append("avatar", fileRef.current.files[0]);

    const res = await fetch("/api/account/profile", { method: "PATCH", body: form });
    setSaving(false);
    if (res.ok) { setSaved(true); onUpdate(); } else { setError("Failed to save."); }
  }

  async function handleEmailChange(e: React.FormEvent) {
    e.preventDefault();
    setEmailSaving(true); setEmailMsg("");
    const res = await fetch("/api/auth/change-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newEmail, password: emailPw }),
    });
    const data = await res.json();
    setEmailSaving(false);
    setEmailMsg(res.ok ? "Email updated — please sign in again." : data.error);
    if (res.ok) setTimeout(() => { setEmailModal(false); signOut({ callbackUrl: "/auth/login" }); }, 2000);
  }

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 24 }}>Profile</h2>
      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 440 }}>
        {/* Avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,#FED7AA,#FDBA74)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
            {profile.avatarUrl
              ? <img src={profile.avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <User size={32} color="#C2410C" />}
          </div>
          <div>
            <button type="button" onClick={() => fileRef.current?.click()} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, border: "1.5px solid #E5E7EB", background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              <Upload size={14} /> Change Photo
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} />
            <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>JPG, PNG · max 5 MB</p>
          </div>
        </div>

        <div>
          <label style={labelSt}>Full Name</label>
          <input style={inputSt} value={name} onChange={e => setName(e.target.value)} required />
        </div>

        <div>
          <label style={labelSt}>Email</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input style={{ ...inputSt, flex: 1, color: "#9CA3AF" }} value={profile.email} readOnly />
            <button type="button" onClick={() => setEmailModal(true)} style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid #E5E7EB", background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
              Change
            </button>
          </div>
        </div>

        <div>
          <label style={labelSt}>Phone</label>
          <input type="tel" style={inputSt} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" />
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 999, background: "#FFF7ED", color: "#C2410C", border: "1px solid #FED7AA" }}>
            {profile.role.replace("_", " ")}
          </span>
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>
            Member since {new Date(profile.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
          </span>
        </div>

        {error && <p style={{ fontSize: 13, color: "#DC2626" }}>{error}</p>}
        {saved && <p style={{ fontSize: 13, color: "#16A34A", display: "flex", alignItems: "center", gap: 6 }}><CheckCircle size={14} /> Saved</p>}

        <button type="submit" disabled={saving} style={{ padding: "12px 0", borderRadius: 12, background: saving ? "#9CA3AF" : "linear-gradient(135deg,#F97316,#EA580C)", color: "#fff", fontWeight: 700, border: "none", cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {saving && <Loader2 size={14} className="spin" />} Save Changes
        </button>
      </form>

      {/* Email change modal */}
      {emailModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "32px 28px", width: "100%", maxWidth: 380 }}>
            <h3 style={{ fontWeight: 700, fontSize: 16, color: "#111827", marginBottom: 20 }}>Change Email</h3>
            <form onSubmit={handleEmailChange} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div><label style={labelSt}>New Email</label><input type="email" style={inputSt} value={newEmail} onChange={e => setNewEmail(e.target.value)} required /></div>
              <div><label style={labelSt}>Current Password</label><input type="password" style={inputSt} value={emailPw} onChange={e => setEmailPw(e.target.value)} required /></div>
              {emailMsg && <p style={{ fontSize: 13, color: emailMsg.includes("updated") ? "#16A34A" : "#DC2626" }}>{emailMsg}</p>}
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => setEmailModal(false)} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "1.5px solid #E5E7EB", background: "#fff", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>Cancel</button>
                <button type="submit" disabled={emailSaving} style={{ flex: 1, padding: "11px", borderRadius: 10, background: "linear-gradient(135deg,#F97316,#EA580C)", color: "#fff", border: "none", cursor: emailSaving ? "not-allowed" : "pointer", fontWeight: 700, fontFamily: "inherit" }}>
                  {emailSaving ? "Saving…" : "Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Addresses ──────────────────────────────────────────────────────────

function AddressesTab({ addresses, onUpdate }: { addresses: Address[]; onUpdate: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const blank = { label: "", lineOne: "", lineTwo: "", city: "", state: "", pincode: "", country: "India", lat: 0, lng: 0, isDefault: false };
  const [form, setForm]         = useState(blank);

  function setF(k: string, v: string | boolean | number) { setForm(f => ({ ...f, [k]: v })); }

  async function useMyLocation() {
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      const res  = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
      const data = await res.json();
      if (data.data) {
        setForm(f => ({ ...f, lat, lng, ...data.data }));
      }
      setGeoLoading(false);
    }, () => { setGeoLoading(false); setError("Could not get location."); });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    const res = await fetch("/api/account/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) { onUpdate(); setShowForm(false); setForm(blank); }
    else { const d = await res.json(); setError(d.error || "Failed."); }
  }

  async function setDefault(id: string) {
    await fetch(`/api/account/addresses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ isDefault: true }),
    });
    onUpdate();
  }

  async function deleteAddr(id: string) {
    await fetch(`/api/account/addresses/${id}`, { method: "DELETE" });
    onUpdate();
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>Saved Addresses</h2>
        <button onClick={() => setShowForm(s => !s)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 10, background: "linear-gradient(135deg,#F97316,#EA580C)", color: "#fff", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
          <Plus size={14} /> Add Address
        </button>
      </div>

      {addresses.length === 0 && !showForm && (
        <p style={{ color: "#9CA3AF", fontSize: 14 }}>No addresses saved yet.</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
        {addresses.map(addr => (
          <div key={addr.id} style={{ background: "#fff", border: `1.5px solid ${addr.isDefault ? "#F97316" : "#E5E7EB"}`, borderRadius: 14, padding: "16px 18px", display: "flex", gap: 14, alignItems: "flex-start" }}>
            <MapPin size={18} color={addr.isDefault ? "#F97316" : "#9CA3AF"} style={{ marginTop: 2, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{addr.label}</span>
                {addr.isDefault && <span style={{ fontSize: 11, fontWeight: 700, background: "#FFF7ED", color: "#C2410C", padding: "2px 8px", borderRadius: 999, border: "1px solid #FED7AA" }}>Default</span>}
              </div>
              <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.5 }}>
                {addr.lineOne}{addr.lineTwo ? `, ${addr.lineTwo}` : ""}<br />
                {addr.city}, {addr.state} {addr.pincode}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              {!addr.isDefault && (
                <button onClick={() => setDefault(addr.id)} style={{ fontSize: 12, padding: "5px 10px", borderRadius: 8, border: "1px solid #E5E7EB", background: "#fff", cursor: "pointer", fontFamily: "inherit", color: "#374151" }}>
                  Set Default
                </button>
              )}
              <button onClick={() => deleteAddr(addr.id)} style={{ padding: "5px 8px", borderRadius: 8, border: "1px solid #FECACA", background: "#FEF2F2", cursor: "pointer" }}>
                <Trash2 size={13} color="#DC2626" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 16, padding: "24px" }}>
          <h3 style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 16 }}>New Address</h3>
          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={labelSt}>Label</label><input style={inputSt} placeholder="Home / College / Hostel" value={form.label} onChange={e => setF("label", e.target.value)} required /></div>
              <div>
                <label style={labelSt}>&nbsp;</label>
                <button type="button" onClick={useMyLocation} disabled={geoLoading} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #E5E7EB", background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                  {geoLoading ? <Loader2 size={14} className="spin" /> : <MapPin size={14} />}
                  {geoLoading ? "Locating…" : "Use My Location"}
                </button>
              </div>
            </div>
            <div><label style={labelSt}>Address Line 1</label><input style={inputSt} value={form.lineOne} onChange={e => setF("lineOne", e.target.value)} required /></div>
            <div><label style={labelSt}>Address Line 2 <span style={{ fontWeight: 400, color: "#9CA3AF" }}>(optional)</span></label><input style={inputSt} value={form.lineTwo} onChange={e => setF("lineTwo", e.target.value)} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div><label style={labelSt}>City</label><input style={inputSt} value={form.city} onChange={e => setF("city", e.target.value)} required /></div>
              <div><label style={labelSt}>State</label><input style={inputSt} value={form.state} onChange={e => setF("state", e.target.value)} required /></div>
              <div><label style={labelSt}>Pincode</label><input style={inputSt} value={form.pincode} onChange={e => setF("pincode", e.target.value)} required /></div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" id="isDefault" checked={form.isDefault} onChange={e => setF("isDefault", e.target.checked)} />
              <label htmlFor="isDefault" style={{ fontSize: 13, color: "#374151", cursor: "pointer" }}>Set as default address</label>
            </div>
            {error && <p style={{ fontSize: 13, color: "#DC2626" }}>{error}</p>}
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "1.5px solid #E5E7EB", background: "#fff", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>Cancel</button>
              <button type="submit" disabled={saving} style={{ flex: 2, padding: "11px", borderRadius: 10, background: saving ? "#9CA3AF" : "linear-gradient(135deg,#F97316,#EA580C)", color: "#fff", border: "none", cursor: saving ? "not-allowed" : "pointer", fontWeight: 700, fontFamily: "inherit" }}>
                {saving ? "Saving…" : "Save Address"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Orders / Earnings ─────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  UPLOADED: "#9CA3AF", QUOTED: "#D97706", CONFIRMED: "#2563EB",
  PRINTING: "#7C3AED", QUALITY_CHECK: "#F97316", READY: "#16A34A", DELIVERED: "#15803D",
};

function OrdersTab({ userId }: { userId: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orders")
      .then(r => r.json())
      .then(d => { setOrders(d.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId]);

  const filtered = orders.filter(o => {
    if (filter === "active")    return !["DELIVERED"].includes(o.status);
    if (filter === "completed") return o.status === "DELIVERED";
    return true;
  });

  const totalSpent = orders
    .filter(o => o.status === "DELIVERED")
    .reduce((s, o) => s + (o.totalPrice ?? o.estimatedPrice ?? 0), 0);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>Order History</h2>
        <div style={{ display: "flex", gap: 8 }}>
          {["all", "active", "completed"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: "7px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600, border: filter === f ? "2px solid #F97316" : "2px solid #E5E7EB", background: filter === f ? "#FFF7ED" : "#fff", color: filter === f ? "#C2410C" : "#6B7280", cursor: "pointer", fontFamily: "inherit" }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {totalSpent > 0 && (
        <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: "12px 18px", marginBottom: 20, fontSize: 13 }}>
          Total spent on Foundry: <strong style={{ color: "#15803D" }}>₹{totalSpent.toLocaleString("en-IN")}</strong>
        </div>
      )}

      {loading && <div style={{ textAlign: "center", padding: 40 }}><Loader2 size={28} color="#F97316" className="spin" style={{ margin: "0 auto" }} /></div>}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF" }}>
          <Package size={40} style={{ margin: "0 auto 12px" }} />
          <p>No {filter === "all" ? "" : filter} orders yet.</p>
          <Link href="/upload" style={{ display: "inline-block", marginTop: 12, color: "#F97316", fontWeight: 600, textDecoration: "none" }}>Place an order →</Link>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map(order => {
          const price  = order.totalPrice ?? order.estimatedPrice ?? 0;
          const quote  = order.quotes.find(q => q.isAccepted);
          const owner  = quote?.printerOwner?.user?.name ?? "Awaiting";
          const date   = new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
          const dotCol = STATUS_BADGE[order.status] ?? "#9CA3AF";

          return (
            <Link key={order.id} href={`/order/${order.id}`} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px", background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14, textDecoration: "none", color: "inherit" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: dotCol, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {order.stlAnalysis?.fileName ?? `Order ${order.id.slice(-6)}`}
                </p>
                <p style={{ fontSize: 12, color: "#9CA3AF" }}>{owner} · {date} · {order.status.replace("_", " ")}</p>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p style={{ fontWeight: 700, color: "#111827" }}>₹{price.toLocaleString("en-IN")}</p>
                <ChevronRight size={14} color="#D1D5DB" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tab: Earnings (Printer Owner) ──────────────────────────────────────────

interface EarningOrder {
  orderId: string; fileName: string; customerName: string;
  status: string; paymentStatus: string | null; payoutStatus: string | null;
  totalPrice: number; ownerPayout: number; platformFee: number; createdAt: string;
}

const PAYOUT_BADGE: Record<string, [string, string]> = {
  released: ["#16A34A", "#F0FDF4"],
  pending:  ["#D97706", "#FFFBEB"],
};

function EarningsTab({ userId }: { userId: string }) {
  const [data, setData]     = useState<{ totalEarned: number; pendingPayout: number; orders: EarningOrder[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("all");

  useEffect(() => {
    fetch("/api/account/earnings")
      .then(r => r.json())
      .then(d => { setData(d.data ?? null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId]);

  const filtered = (data?.orders ?? []).filter(o => {
    if (filter === "paid")    return o.paymentStatus === "paid";
    if (filter === "pending") return o.paymentStatus !== "paid";
    return true;
  });

  if (loading) return <div style={{ textAlign: "center", padding: 40 }}><Loader2 size={28} color="#F97316" className="spin" style={{ margin: "0 auto" }} /></div>;

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 20 }}>Earnings</h2>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "linear-gradient(135deg,#F97316,#EA580C)", borderRadius: 16, padding: "20px 24px", color: "#fff" }}>
          <p style={{ fontSize: 12, fontWeight: 600, opacity: 0.85, marginBottom: 6 }}>TOTAL EARNED</p>
          <p style={{ fontSize: 28, fontWeight: 800 }}>₹{(data?.totalEarned ?? 0).toLocaleString("en-IN")}</p>
        </div>
        <div style={{ background: "#fff", border: "2px solid #FED7AA", borderRadius: 16, padding: "20px 24px" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", marginBottom: 6 }}>PENDING PAYOUT</p>
          <p style={{ fontSize: 28, fontWeight: 800, color: "#D97706" }}>₹{(data?.pendingPayout ?? 0).toLocaleString("en-IN")}</p>
        </div>
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["all", "paid", "pending"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "7px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600, border: filter === f ? "2px solid #F97316" : "2px solid #E5E7EB", background: filter === f ? "#FFF7ED" : "#fff", color: filter === f ? "#C2410C" : "#6B7280", cursor: "pointer", fontFamily: "inherit" }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF" }}>
          <Package size={40} style={{ margin: "0 auto 12px" }} />
          <p>No {filter === "all" ? "" : filter} orders yet.</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map(o => {
          const dotCol = STATUS_BADGE[o.status] ?? "#9CA3AF";
          const [payoutColor, payoutBg] = PAYOUT_BADGE[o.payoutStatus ?? "pending"] ?? ["#9CA3AF", "#F9FAFB"];
          const date = new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

          return (
            <Link key={o.orderId} href={`/order/${o.orderId}`} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px", background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14, textDecoration: "none", color: "inherit" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: dotCol, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.fileName}</p>
                <p style={{ fontSize: 12, color: "#9CA3AF" }}>{o.customerName} · {date} · {o.status.replace("_", " ")}</p>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                <p style={{ fontWeight: 700, color: "#111827", fontSize: 15 }}>₹{o.ownerPayout.toLocaleString("en-IN")}</p>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, color: payoutColor, background: payoutBg }}>
                  {(o.payoutStatus ?? "pending").toUpperCase()}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tab: Benefits ───────────────────────────────────────────────────────────

function BenefitsTab({ benefits, subscription, userId }: { benefits: Benefit[]; subscription: Subscription | null; userId: string }) {
  const [cancelling, setCancelling] = useState(false);
  const [cancelMsg, setCancelMsg]   = useState("");

  const active  = benefits.filter(b => b.isActive && (!b.expiresAt || new Date(b.expiresAt) > new Date()));
  const expired = benefits.filter(b => !b.isActive || (b.expiresAt && new Date(b.expiresAt) <= new Date()));

  async function handleCancel() {
    setCancelling(true);
    const res  = await fetch("/api/payments/cancel-subscription", { method: "POST" });
    const data = await res.json();
    setCancelling(false);
    if (res.ok) setCancelMsg(`Access continues until ${new Date(data.data.currentPeriodEnd).toLocaleDateString("en-IN")}.`);
    else setCancelMsg(data.error);
  }

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 24 }}>Benefits</h2>

      {/* Subscription card */}
      {subscription ? (
        <div style={{ background: subscription.status === "active" ? "linear-gradient(135deg,#F97316,#EF4444)" : "#F9FAFB", border: `1px solid ${subscription.status === "active" ? "transparent" : "#E5E7EB"}`, borderRadius: 16, padding: "20px 24px", marginBottom: 24, color: subscription.status === "active" ? "#fff" : "#374151" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>
                Pro {subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)}
                {" "}<span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "rgba(255,255,255,.2)" }}>{subscription.status.toUpperCase()}</span>
              </p>
              <p style={{ fontSize: 13, opacity: 0.85 }}>
                {subscription.status === "cancelled"
                  ? `Access until ${new Date(subscription.currentPeriodEnd).toLocaleDateString("en-IN")}`
                  : `Renews ${new Date(subscription.currentPeriodEnd).toLocaleDateString("en-IN")}`
                }
              </p>
            </div>
            {subscription.status === "active" && !cancelling && (
              <button onClick={handleCancel} style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,.4)", background: "rgba(255,255,255,.15)", color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
                Cancel
              </button>
            )}
            {cancelling && <Loader2 size={16} className="spin" />}
          </div>
          {cancelMsg && <p style={{ fontSize: 13, marginTop: 10, opacity: 0.9 }}>{cancelMsg}</p>}
        </div>
      ) : (
        <div style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 16, padding: "20px 24px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontWeight: 700, color: "#111827", marginBottom: 4 }}>Free Plan</p>
            <p style={{ fontSize: 13, color: "#9CA3AF" }}>Upgrade for unlimited Build It analyses</p>
          </div>
          <Link href="/pricing" style={{ padding: "9px 18px", borderRadius: 10, background: "linear-gradient(135deg,#F97316,#EA580C)", color: "#fff", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
            Upgrade →
          </Link>
        </div>
      )}

      <h3 style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 12 }}>Active Benefits</h3>
      {active.length === 0 ? (
        <p style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 24 }}>No active benefits.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {active.map(b => (
            <div key={b.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px", background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12 }}>
              <Gift size={18} color="#F97316" style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <p style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{b.description}</p>
                {b.expiresAt && <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>Expires {new Date(b.expiresAt).toLocaleDateString("en-IN")}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {expired.length > 0 && (
        <details style={{ marginTop: 8 }}>
          <summary style={{ fontSize: 13, color: "#9CA3AF", cursor: "pointer", fontWeight: 600 }}>Past benefits ({expired.length})</summary>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {expired.map(b => (
              <div key={b.id} style={{ padding: "12px 14px", background: "#F9FAFB", borderRadius: 10, opacity: 0.6 }}>
                <p style={{ fontSize: 13, color: "#6B7280" }}>{b.description}</p>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

// ─── Tab: Security ───────────────────────────────────────────────────────────

function SecurityTab() {
  const [cpForm, setCpForm] = useState({ current: "", next: "", confirm: "" });
  const [cpSaving, setCpSaving] = useState(false);
  const [cpMsg, setCpMsg]     = useState("");

  async function handleChangePw(e: React.FormEvent) {
    e.preventDefault();
    if (cpForm.next !== cpForm.confirm) { setCpMsg("New passwords don't match."); return; }
    setCpSaving(true); setCpMsg("");
    const res  = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ currentPassword: cpForm.current, newPassword: cpForm.next }),
    });
    const data = await res.json();
    setCpSaving(false);
    setCpMsg(res.ok ? "Password updated successfully." : data.error);
    if (res.ok) setCpForm({ current: "", next: "", confirm: "" });
  }

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 24 }}>Security</h2>

      <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 16, padding: "24px", marginBottom: 24, maxWidth: 440 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 20 }}>Change Password</h3>
        <form onSubmit={handleChangePw} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label style={labelSt}>Current Password</label><input type="password" style={inputSt} value={cpForm.current} onChange={e => setCpForm(f => ({ ...f, current: e.target.value }))} required /></div>
          <div><label style={labelSt}>New Password</label><input type="password" style={inputSt} value={cpForm.next} onChange={e => setCpForm(f => ({ ...f, next: e.target.value }))} placeholder="Min. 8 chars with number and symbol" required /></div>
          <div><label style={labelSt}>Confirm New Password</label><input type="password" style={inputSt} value={cpForm.confirm} onChange={e => setCpForm(f => ({ ...f, confirm: e.target.value }))} required /></div>
          {cpMsg && <p style={{ fontSize: 13, color: cpMsg.includes("success") ? "#16A34A" : "#DC2626" }}>{cpMsg}</p>}
          <button type="submit" disabled={cpSaving} style={{ padding: "12px", borderRadius: 10, background: cpSaving ? "#9CA3AF" : "linear-gradient(135deg,#F97316,#EA580C)", color: "#fff", border: "none", fontWeight: 700, cursor: cpSaving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {cpSaving ? "Saving…" : "Update Password"}
          </button>
        </form>
      </div>

      <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 16, padding: "20px 24px", maxWidth: 440 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#991B1B", marginBottom: 8 }}>Sign Out Everywhere</h3>
        <p style={{ fontSize: 13, color: "#DC2626", marginBottom: 16, lineHeight: 1.5 }}>
          This will end all active sessions on all devices.
        </p>
        <button
          onClick={() => signOut({ callbackUrl: "/auth/login" })}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, background: "#DC2626", color: "#fff", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
        >
          <LogOut size={14} /> Sign Out All Devices
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

type Tab = "profile" | "addresses" | "orders" | "earnings" | "benefits" | "security";

function buildTabs(role: string): { key: Tab; label: string; icon: React.ReactNode }[] {
  const ordersTab = role === "PRINTER_OWNER"
    ? { key: "earnings" as Tab, label: "Earnings", icon: <Package size={15} /> }
    : { key: "orders"   as Tab, label: "Orders",   icon: <Package size={15} /> };
  return [
    { key: "profile",   label: "Profile",   icon: <User   size={15} /> },
    { key: "addresses", label: "Addresses", icon: <MapPin size={15} /> },
    ordersTab,
    { key: "benefits",  label: "Benefits",  icon: <Gift   size={15} /> },
    { key: "security",  label: "Security",  icon: <Shield size={15} /> },
  ];
}

function AccountContent() {
  const { data: session } = useSession();
  const params = useSearchParams();
  const router = useRouter();

  const initTab = (params.get("tab") as Tab | null) ?? "profile";
  const [tab, setTab]         = useState<Tab>(initTab);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) { router.push("/auth/login"); return; }
    fetchProfile();
  }, [session]);

  async function fetchProfile() {
    const res  = await fetch("/api/account/profile");
    const data = await res.json();
    setProfile(data.data);
    setLoading(false);
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 80 }}>
        <Loader2 size={32} color="#F97316" className="spin" style={{ margin: "0 auto" }} />
      </div>
    );
  }

  if (!profile) {
    return <div style={{ textAlign: "center", padding: 80, color: "#9CA3AF" }}>Could not load profile.</div>;
  }

  const tabs = buildTabs(profile.role);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px", display: "grid", gridTemplateColumns: "220px 1fr", gap: 32, alignItems: "start" }}>
      {/* Sidebar */}
      <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 20, padding: "24px 16px", position: "sticky", top: 100 }}>
        {/* Mini profile */}
        <div style={{ textAlign: "center", marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid #F3F4F6" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg,#FED7AA,#FDBA74)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", overflow: "hidden" }}>
            {profile.avatarUrl
              ? <img src={profile.avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <User size={26} color="#C2410C" />}
          </div>
          <p style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{profile.name}</p>
          <p style={{ fontSize: 12, color: "#9CA3AF" }}>{profile.email}</p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {tabs.map(t => (
            <button
              key={t.key} onClick={() => setTab(t.key)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px", borderRadius: 10, fontFamily: "inherit",
                fontSize: 14, fontWeight: 600, cursor: "pointer", textAlign: "left",
                border: "none",
                background: tab === t.key ? "#FFF7ED" : "transparent",
                color: tab === t.key ? "#C2410C" : "#6B7280",
                transition: "all 0.12s",
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 20, padding: "32px" }}>
        {tab === "profile"   && <ProfileTab   profile={profile} onUpdate={fetchProfile} />}
        {tab === "addresses" && <AddressesTab addresses={profile.addresses} onUpdate={fetchProfile} />}
        {tab === "orders"    && <OrdersTab    userId={profile.id} />}
        {tab === "earnings"  && <EarningsTab  userId={profile.id} />}
        {tab === "benefits"  && <BenefitsTab  benefits={profile.benefits} subscription={profile.subscription} userId={profile.id} />}
        {tab === "security"  && <SecurityTab />}
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #F3F4F6" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px" }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#111827" }}>Account</h1>
        </div>
      </div>
      <Suspense fallback={<div style={{ textAlign: "center", padding: 80 }}><Loader2 size={32} color="#F97316" className="spin" style={{ margin: "0 auto" }} /></div>}>
        <AccountContent />
      </Suspense>
    </div>
  );
}
