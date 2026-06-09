"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthGate({
  featureName,
  featureDescription,
  preview,
}: {
  featureName: string;
  featureDescription: string;
  preview: ReactNode;
}) {
  return (
    <div style={{ position: "relative", minHeight: "100vh", overflow: "hidden" }}>
      <div
        style={{ filter: "blur(5px) brightness(0.6)", pointerEvents: "none", userSelect: "none" }}
        aria-hidden="true"
      >
        {preview}
      </div>

      <div
        style={{
          position: "fixed", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 50,
          background: "rgba(17,24,39,0.45)",
          padding: 24,
        }}
      >
        <div
          style={{
            background: "#fff", borderRadius: 24,
            padding: "40px 36px", maxWidth: 420, width: "100%",
            textAlign: "center",
            boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
          }}
        >
          <div
            style={{
              width: 68, height: 68, borderRadius: "50%",
              background: "#FFF7ED", border: "2px solid #FED7AA",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 22px",
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L13.2 10.8L22 12L13.2 13.2L12 22L10.8 13.2L2 12L10.8 10.8Z" fill="#EA580C"/>
            </svg>
          </div>

          <p style={{ fontSize: 13, fontWeight: 600, color: "#EA580C", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6 }}>
            Foundry
          </p>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", marginBottom: 10 }}>
            {featureName}
          </h2>
          <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.65, marginBottom: 28 }}>
            {featureDescription}
          </p>

          <Link
            href="/auth/login"
            style={{
              display: "block", padding: "13px 0", borderRadius: 12,
              background: "linear-gradient(135deg, #EA580C, #C2410C)",
              color: "#fff", fontWeight: 700, fontSize: 15,
              textDecoration: "none", marginBottom: 10,
            }}
          >
            Sign In
          </Link>
          <Link
            href="/auth/signup"
            style={{
              display: "block", padding: "12px 0", borderRadius: 12,
              background: "#F9FAFB", border: "1px solid #E5E7EB",
              color: "#374151", fontWeight: 600, fontSize: 14,
              textDecoration: "none",
            }}
          >
            Create free account →
          </Link>

          <p style={{ marginTop: 16, fontSize: 12, color: "#9CA3AF" }}>
            Free to sign up · No credit card required
          </p>
        </div>
      </div>
    </div>
  );
}
