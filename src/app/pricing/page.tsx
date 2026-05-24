"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2, Zap } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";

declare global {
  interface Window {
    Razorpay: new (options: object) => { open(): void };
  }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const s  = document.createElement("script");
    s.src    = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const FEATURES = [
  "Unlimited Build It analyses",
  "Priority printer matching",
  "Early access to new equipment types",
  "Download detailed print reports",
  "Dedicated support",
];

export default function PricingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [billing, setBilling]   = useState<"monthly" | "annual">("annual");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function handleSubscribe() {
    if (!session) { router.push("/auth/login?callbackUrl=/pricing"); return; }

    setLoading(true);
    setError("");

    const scriptOk = await loadRazorpay();
    if (!scriptOk) { setError("Could not load payment gateway."); setLoading(false); return; }

    const res  = await fetch("/api/payments/create-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ plan: billing }),
    });
    const data = await res.json();

    if (!res.ok) { setError(data.error || "Failed to start subscription."); setLoading(false); return; }

    const { subscriptionId, keyId, prefill } = data.data;

    const rzp = new window.Razorpay({
      key:             keyId,
      subscription_id: subscriptionId,
      name:            "Foundry Pro",
      description:     `Pro ${billing} subscription`,
      prefill,
      theme:           { color: "#F97316" },
      handler:         () => {
        setLoading(false);
        router.push("/account?tab=benefits&subscribed=1");
      },
      modal:           { ondismiss: () => setLoading(false) },
    });
    rzp.open();
  }

  const monthly = 299;
  const annual  = 2499;
  const monthlyEquiv = Math.round(annual / 12);
  const saving  = Math.round((1 - annual / (monthly * 12)) * 100);

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #F3F4F6" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "48px 24px 32px", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 999, padding: "6px 16px", marginBottom: 20, fontSize: 13, fontWeight: 700, color: "#C2410C" }}>
            <Zap size={14} /> Foundry Pro
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: "#111827", marginBottom: 12 }}>Unlimited Build It for serious makers</h1>
          <p style={{ fontSize: 16, color: "#6B7280" }}>Free plan includes 3 lifetime Build It analyses. Upgrade for unlimited access.</p>
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "40px 24px" }}>
        {/* Billing toggle */}
        <div style={{ display: "flex", gap: 0, background: "#F3F4F6", borderRadius: 12, padding: 4, marginBottom: 32, width: "fit-content", margin: "0 auto 32px" }}>
          {(["monthly", "annual"] as const).map(b => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              style={{
                padding: "10px 24px", borderRadius: 10, fontFamily: "inherit", fontSize: 14, fontWeight: 700,
                border: "none", cursor: "pointer",
                background: billing === b ? "#fff" : "transparent",
                color: billing === b ? "#111827" : "#9CA3AF",
                boxShadow: billing === b ? "0 1px 4px rgba(0,0,0,.12)" : "none",
                transition: "all 0.15s",
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              {b === "annual" ? "Annual" : "Monthly"}
              {b === "annual" && (
                <span style={{ background: "#22C55E", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999 }}>
                  Save {saving}%
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Price card */}
        <div style={{ background: "#fff", border: "2px solid #F97316", borderRadius: 24, padding: "36px 32px", boxShadow: "0 8px 32px rgba(249,115,22,.15)", textAlign: "center", marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
            Pro {billing}
          </p>
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 56, fontWeight: 800, color: "#111827" }}>
              ₹{billing === "monthly" ? monthly : monthlyEquiv}
            </span>
            <span style={{ fontSize: 16, color: "#9CA3AF" }}>/month</span>
          </div>
          {billing === "annual" && (
            <p style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 16 }}>
              Billed annually as ₹{annual.toLocaleString("en-IN")} · saves ₹{(monthly * 12 - annual).toLocaleString("en-IN")}
            </p>
          )}

          {error && (
            <p style={{ fontSize: 13, color: "#DC2626", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
              {error}
            </p>
          )}

          <button
            onClick={handleSubscribe} disabled={loading}
            style={{ width: "100%", padding: "16px", borderRadius: 14, background: loading ? "#9CA3AF" : "linear-gradient(135deg,#F97316,#EA580C)", color: "#fff", fontWeight: 800, fontSize: 16, border: "none", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 }}
          >
            {loading && <Loader2 size={16} className="spin" />}
            {session ? `Subscribe ${billing === "annual" ? "annually" : "monthly"}` : "Sign up to subscribe"}
          </button>

          <p style={{ fontSize: 12, color: "#9CA3AF" }}>Cancel any time · access continues to period end</p>

          <div style={{ borderTop: "1px solid #F3F4F6", marginTop: 24, paddingTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
            {FEATURES.map(f => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, textAlign: "left" }}>
                <CheckCircle size={16} color="#22C55E" />
                <span style={{ fontSize: 14, color: "#374151" }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Free plan note */}
        <div style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 16, padding: "20px 24px", textAlign: "center" }}>
          <p style={{ fontWeight: 700, color: "#374151", marginBottom: 6 }}>Free Plan</p>
          <p style={{ fontSize: 13, color: "#9CA3AF" }}>3 Build It analyses · lifetime · no credit card</p>
          <Link href="/" style={{ display: "inline-block", marginTop: 10, fontSize: 13, color: "#F97316", fontWeight: 600, textDecoration: "none" }}>
            Continue with free →
          </Link>
        </div>
      </div>
    </div>
  );
}
