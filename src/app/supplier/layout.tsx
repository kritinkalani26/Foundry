"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Package, BarChart2, Shield } from "lucide-react";

const NAV_LINKS = [
  { href: "/supplier/list",           label: "List Equipment",  icon: <Package size={14} /> },
  { href: "/supplier/earnings",       label: "Earning Trends",  icon: <BarChart2 size={14} /> },
  { href: "/supplier/certifications", label: "Certifications",  icon: <Shield size={14} /> },
];

function SupplierHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header style={{
      background: "#fff", borderBottom: "1px solid #E5E7EB",
      position: "sticky", top: 0, zIndex: 50,
    }}>
      <div style={{
        maxWidth: 1200, margin: "0 auto", padding: "0 24px",
        height: 64, display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <a href="/supplier" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, #F97316, #EF4444)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C8.5 5.5 7 8.5 8.5 12.5C6.5 11.5 5.5 9.5 6 7C3 10 3 15 7 18.5a7 7 0 0014 0C23.5 16 24.5 12 22 9c-1 2.5-3 3.5-5 3C19.5 8 18 4.5 12 2z"/>
            </svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: 18, color: "#111827" }}>Foundry</span>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
            background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0",
          }}>for Suppliers</span>
        </a>

        {/* Desktop nav */}
        <nav className="supplier-nav-desktop" style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {NAV_LINKS.map(({ href, label, icon }) => {
            const active = pathname === href;
            return (
              <a key={href} href={href} style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 8, fontSize: 14, fontWeight: active ? 700 : 500,
                color: active ? "#F97316" : "#6B7280",
                background: active ? "#FFF7ED" : "transparent",
                textDecoration: "none", transition: "all 0.15s",
              }}>
                <span style={{ color: active ? "#F97316" : "#9CA3AF" }}>{icon}</span>
                {label}
              </a>
            );
          })}
          <span style={{ width: 1, height: 20, background: "#E5E7EB", margin: "0 8px" }} />
          <a href="/" style={{ fontSize: 13, color: "#9CA3AF", textDecoration: "none", fontWeight: 500 }}>
            ← Foundry
          </a>
          <a href="/auth/login" style={{
            marginLeft: 8, padding: "8px 18px", borderRadius: 8,
            background: "#111827", color: "#fff",
            fontSize: 14, fontWeight: 700, textDecoration: "none",
          }}>
            Sign In
          </a>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="supplier-mobile-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
          style={{
            padding: 8, borderRadius: 8,
            background: mobileOpen ? "#FFF7ED" : "none",
            border: mobileOpen ? "1px solid #FED7AA" : "1px solid transparent",
          }}
        >
          {mobileOpen
            ? <svg width="20" height="20" fill="none" stroke="#F97316" strokeWidth="2.5"><line x1="4" y1="4" x2="16" y2="16"/><line x1="16" y1="4" x2="4" y2="16"/></svg>
            : <svg width="20" height="20" fill="none" stroke="#374151" strokeWidth="2"><line x1="3" y1="6" x2="17" y2="6"/><line x1="3" y1="12" x2="17" y2="12"/><line x1="3" y1="18" x2="17" y2="18"/></svg>
          }
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div style={{
          background: "#fff", borderTop: "1px solid #F3F4F6",
          padding: "12px 20px 20px", display: "flex", flexDirection: "column", gap: 4,
        }}>
          {NAV_LINKS.map(({ href, label, icon }) => {
            const active = pathname === href;
            return (
              <a key={href} href={href} onClick={() => setMobileOpen(false)} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "12px 14px", borderRadius: 10,
                fontSize: 15, fontWeight: active ? 700 : 500,
                color: active ? "#EA580C" : "#374151",
                background: active ? "#FFF7ED" : "transparent",
                textDecoration: "none",
              }}>
                <span style={{ color: active ? "#F97316" : "#9CA3AF" }}>{icon}</span>
                {label}
              </a>
            );
          })}
          <div style={{ borderTop: "1px solid #F3F4F6", marginTop: 8, paddingTop: 12, display: "flex", gap: 10 }}>
            <a href="/" style={{ flex: 1, textAlign: "center", padding: "10px", borderRadius: 10, fontSize: 14, color: "#6B7280", textDecoration: "none", border: "1px solid #E5E7EB" }}>
              ← Foundry
            </a>
            <a href="/auth/login" style={{ flex: 1, textAlign: "center", padding: "10px", borderRadius: 10, fontSize: 14, fontWeight: 700, background: "#111827", color: "#fff", textDecoration: "none" }}>
              Sign In
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

function SupplierFooter() {
  return (
    <footer style={{ background: "#0F172A", borderTop: "1px solid #1E293B", padding: "48px 0 32px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
        <div className="resp-grid-footer">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: "linear-gradient(135deg,#F97316,#EF4444)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.5 5.5 7 8.5 8.5 12.5C6.5 11.5 5.5 9.5 6 7C3 10 3 15 7 18.5a7 7 0 0014 0C23.5 16 24.5 12 22 9c-1 2.5-3 3.5-5 3C19.5 8 18 4.5 12 2z"/></svg>
              </div>
              <span style={{ fontWeight: 800, fontSize: 16, color: "#fff" }}>Foundry</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: "#F0FDF433", color: "#86EFAC", border: "1px solid #16A34A44" }}>Suppliers</span>
            </div>
            <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.7, maxWidth: 280 }}>
              India&apos;s manufacturing marketplace — connecting certified suppliers with verified industrial buyers across 28 cities.
            </p>
          </div>
          {[
            { heading: "Supplier Portal", links: [["/supplier", "Overview"], ["/supplier/list", "List Equipment"], ["/supplier/earnings", "Earning Trends"], ["/supplier/certifications", "Certifications"]] },
            { heading: "Platform", links: [["/", "Foundry Marketplace"], ["/printers", "Find Spaces"], ["/auth/login", "Sign in"], ["/auth/signup", "Sign up"]] },
            { heading: "Support", links: [["mailto:suppliers@foundry.in", "Contact support"], ["https://udyamregistration.gov.in/", "Udyam registration"], ["https://gem.gov.in/", "GeM registration"], ["https://www.nabcb.qci.org.in/", "NABCB India"]] },
          ].map(({ heading, links }) => (
            <div key={heading}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>{heading}</p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {links.map(([href, label]) => (
                  <li key={label}><a href={href} style={{ fontSize: 13, color: "#94A3B8", textDecoration: "none" }}>{label}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid #1E293B", paddingTop: 20 }}>
          <p style={{ fontSize: 12, color: "#475569" }}>© 2025 Foundry · Supplier Portal · <a href="/" style={{ color: "#F97316", textDecoration: "none" }}>Back to main site →</a></p>
        </div>
      </div>
    </footer>
  );
}

export default function SupplierLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", display: "flex", flexDirection: "column" }}>
      <SupplierHeader />
      <div style={{ flex: 1 }}>{children}</div>
      <SupplierFooter />
    </div>
  );
}
