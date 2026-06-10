"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "", confirm: "",
    role: "CUSTOMER", city: "",
  });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  function validatePw(pw: string): string | null {
    if (pw.length < 8)              return "At least 8 characters";
    if (!/\d/.test(pw))             return "Must contain a number";
    if (!/[^a-zA-Z0-9]/.test(pw))  return "Must contain a special character";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirm) { setError("Passwords don't match."); return; }
    const pwErr = validatePw(form.password);
    if (pwErr) { setError(pwErr + "."); return; }

    setLoading(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name, email: form.email, phone: form.phone,
        password: form.password, role: form.role, city: form.city,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setLoading(false);
      setError(data.error || "Something went wrong.");
      return;
    }

    await signIn("credentials", { email: form.email, password: form.password, redirect: false });
    router.push(callbackUrl);
    router.refresh();
  }

  const pwErr = form.password ? validatePw(form.password) : null;

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", background: "#F9FAFB" }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 36, height: 36 }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L13.2 10.8L22 12L13.2 13.2L12 22L10.8 13.2L2 12L10.8 10.8Z" fill="#EA580C"/>
              </svg>
            </div>
            <span style={{ fontSize: 22, fontWeight: 800, color: "#111827" }}>Foundry</span>
          </div>
          <p style={{ fontSize: 15, color: "#6B7280" }}>Create your account</p>
        </div>

        <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #E5E7EB", padding: "32px 28px", boxShadow: "0 4px 24px rgba(0,0,0,.06)" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={labelStyle}>Full Name</label>
              <input type="text" value={form.name} onChange={e => set("name", e.target.value)}
                placeholder="Arjun Sharma" required style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                placeholder="you@example.com" required style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Phone Number</label>
              <input type="tel" value={form.phone} onChange={e => set("phone", e.target.value)}
                placeholder="+91 98765 43210" style={inputStyle} />
              <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>Indian (10 digits) or international format</p>
            </div>

            <div>
              <label style={labelStyle}>City</label>
              <input type="text" value={form.city} onChange={e => set("city", e.target.value)}
                placeholder="Indore, Kota, Patna…" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>I am a…</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { value: "CUSTOMER",      label: "Customer",    sub: "I need fabrication work done" },
                  { value: "PRINTER_OWNER", label: "Space Owner", sub: "I own equipment to rent out" },
                ].map(opt => (
                  <button
                    key={opt.value} type="button" onClick={() => set("role", opt.value)}
                    style={{
                      padding: "12px 14px", borderRadius: 12, textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                      border: form.role === opt.value ? "2px solid #F97316" : "2px solid #E5E7EB",
                      background: form.role === opt.value ? "#FFF7ED" : "#F9FAFB",
                    }}
                  >
                    <p style={{ fontWeight: 700, fontSize: 13, color: form.role === opt.value ? "#C2410C" : "#111827" }}>{opt.label}</p>
                    <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{opt.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Password</label>
              <input type="password" value={form.password} onChange={e => set("password", e.target.value)}
                placeholder="Min. 8 chars with a number and symbol" required style={inputStyle} />
              {form.password && (
                <p style={{ fontSize: 11, marginTop: 4, color: pwErr ? "#DC2626" : "#16A34A" }}>
                  {pwErr ?? "✓ Password looks good"}
                </p>
              )}
            </div>

            <div>
              <label style={labelStyle}>Confirm Password</label>
              <input type="password" value={form.confirm} onChange={e => set("confirm", e.target.value)}
                placeholder="••••••••" required style={inputStyle} />
            </div>

            {error && (
              <p style={{ fontSize: 13, color: "#DC2626", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px" }}>
                {error}
              </p>
            )}

            <button
              type="submit" disabled={loading}
              style={{ padding: "13px 0", borderRadius: 12, background: loading ? "#9CA3AF" : "linear-gradient(135deg, #EA580C, #C2410C)", color: "#fff", fontWeight: 700, fontSize: 15, border: "none", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4 }}
            >
              {loading && <Loader2 size={16} className="spin" />}
              Create Account
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "#6B7280" }}>
          Already have an account?{" "}
          <Link href="/auth/login" style={{ color: "#F97316", fontWeight: 600, textDecoration: "none" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: 10, border: "1.5px solid #E5E7EB",
  fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box",
  background: "#F9FAFB", color: "#111827",
};
