"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle } from "lucide-react";

function ResetPasswordForm() {
  const params   = useSearchParams();
  const router   = useRouter();
  const token    = params.get("token") ?? "";

  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState("");

  function validatePw(pw: string): string | null {
    if (pw.length < 8)              return "At least 8 characters required.";
    if (!/\d/.test(pw))             return "Must contain a number.";
    if (!/[^a-zA-Z0-9]/.test(pw))  return "Must contain a special character.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) { setError("Passwords don't match."); return; }
    const pwErr = validatePw(password);
    if (pwErr) { setError(pwErr); return; }

    setLoading(true);
    const res  = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error || "Something went wrong."); return; }
    setSuccess(true);
    setTimeout(() => router.push("/auth/login"), 2500);
  }

  if (!token) {
    return (
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 14, color: "#DC2626" }}>Invalid or missing reset token. <Link href="/auth/forgot-password" style={{ color: "#F97316" }}>Request a new link</Link>.</p>
      </div>
    );
  }

  return success ? (
    <div style={{ textAlign: "center" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#F0FDF4", border: "2px solid #86EFAC", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
        <CheckCircle size={32} color="#16A34A" />
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 8 }}>Password updated!</h3>
      <p style={{ fontSize: 14, color: "#6B7280" }}>Redirecting you to sign in…</p>
    </div>
  ) : (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <label style={labelStyle}>New Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          placeholder="Min. 8 chars with a number and symbol" required style={inputStyle} />
        {password && (
          <p style={{ fontSize: 11, marginTop: 4, color: validatePw(password) ? "#DC2626" : "#16A34A" }}>
            {validatePw(password) ?? "✓ Password looks good"}
          </p>
        )}
      </div>
      <div>
        <label style={labelStyle}>Confirm Password</label>
        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
          placeholder="••••••••" required style={inputStyle} />
      </div>

      {error && (
        <p style={{ fontSize: 13, color: "#DC2626", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px" }}>
          {error}
        </p>
      )}

      <button type="submit" disabled={loading} style={{ padding: "13px 0", borderRadius: 12, background: loading ? "#9CA3AF" : "linear-gradient(135deg, #EA580C, #C2410C)", color: "#fff", fontWeight: 700, fontSize: 15, border: "none", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        {loading && <Loader2 size={16} className="spin" />}
        Set New Password
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", background: "#F9FAFB" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 36, height: 36 }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L13.2 10.8L22 12L13.2 13.2L12 22L10.8 13.2L2 12L10.8 10.8Z" fill="#EA580C"/>
              </svg>
            </div>
            <span style={{ fontSize: 22, fontWeight: 800, color: "#111827" }}>Foundry</span>
          </div>
          <p style={{ fontSize: 15, color: "#6B7280" }}>Set a new password</p>
        </div>

        <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #E5E7EB", padding: "32px 28px", boxShadow: "0 4px 24px rgba(0,0,0,.06)" }}>
          <Suspense fallback={<div style={{ textAlign: "center", color: "#9CA3AF" }}>Loading…</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "#6B7280" }}>
          <Link href="/auth/login" style={{ color: "#F97316", fontWeight: 600, textDecoration: "none" }}>
            ← Back to Sign In
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
