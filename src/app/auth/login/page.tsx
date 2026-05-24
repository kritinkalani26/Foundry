"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error === "ACCOUNT_LOCKED") {
      setError("Account locked after too many failed attempts. Try again in 15 minutes.");
    } else if (result?.error) {
      setError("Incorrect email or password.");
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", background: "#F9FAFB" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#F97316,#EA580C)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.5 5.5 7 8.5 8.5 12.5C6.5 11.5 5.5 9.5 6 7C3 10 3 15 7 18.5a7 7 0 0014 0C23.5 16 24.5 12 22 9c-1 2.5-3 3.5-5 3C19.5 8 18 4.5 12 2z"/></svg>
            </div>
            <span style={{ fontSize: 22, fontWeight: 800, color: "#111827" }}>Foundry</span>
          </div>
          <p style={{ fontSize: 15, color: "#6B7280" }}>Sign in to your account</p>
        </div>

        <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #E5E7EB", padding: "32px 28px", boxShadow: "0 4px 24px rgba(0,0,0,.06)" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={inputStyle}
              />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Password</label>
                <Link href="/auth/forgot-password" style={{ fontSize: 12, color: "#F97316", textDecoration: "none", fontWeight: 600 }}>
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={inputStyle}
              />
            </div>

            {error && (
              <p style={{ fontSize: 13, color: "#DC2626", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ padding: "13px 0", borderRadius: 12, background: loading ? "#9CA3AF" : "linear-gradient(135deg,#F97316,#EA580C)", color: "#fff", fontWeight: 700, fontSize: 15, border: "none", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              {loading && <Loader2 size={16} className="spin" />}
              Sign In
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "#6B7280" }}>
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" style={{ color: "#F97316", fontWeight: 600, textDecoration: "none" }}>
            Create one
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
