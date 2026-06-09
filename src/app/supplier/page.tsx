"use client";

import { ArrowRight, CheckCircle, Star, MapPin, DollarSign, Package, BarChart2, Shield, Users, Zap } from "lucide-react";

const PLATFORM_STATS = [
  { value: "2,400+", label: "Active Suppliers",    sub: "across 28 cities" },
  { value: "₹18,400", label: "Avg Monthly Income", sub: "per listed machine" },
  { value: "1M+",     label: "Parts Fulfilled",    sub: "₹4.7 Cr paid to suppliers" },
  { value: "3.2×",    label: "More Quotes",        sub: "for certified suppliers" },
];

const TESTIMONIALS = [
  { name: "Ramesh Patel",  role: "Sole Proprietor · 2 FDM Printers",              city: "Surat, Gujarat",       quote: "I was making ₹8,000/month selling to local shops. Foundry brought customers from Pune and Bangalore in the first week. Same two machines now earn ₹24,000/month — zero marketing spend.", avatar: "R", bg: "linear-gradient(135deg,#4F46E5,#7C3AED)", earnings: "₹24K/mo",  tag: "Small Maker",         tagColor: "#4F46E5", tagBg: "#EEF2FF" },
  { name: "Priya Iyer",    role: "Owner · FabTech Coimbatore · 8 Machines",       city: "Coimbatore, Tamil Nadu", quote: "We got ISO 9001 certified and uploaded it to Foundry the same day. Defence-adjacent clients filter specifically for it — we closed 3 precision parts contracts that month we'd never have found otherwise.", avatar: "P", bg: "linear-gradient(135deg,#0891B2,#0284C7)", earnings: "₹1.8L/mo", tag: "Mid-Scale Hub",       tagColor: "#0891B2", tagBg: "#ECFEFF" },
  { name: "Arjun Singh",   role: "GM · Punjab Steel & Fab · 18 Operators",        city: "Ludhiana, Punjab",     quote: "We had the capacity — 5-axis CNC, waterjet, full welding bay — but no reach outside Punjab. Foundry's certification filters mean serious buyers find us directly. Waterjet alone runs 6 hrs/day on platform orders.", avatar: "A", bg: "linear-gradient(135deg,#15803D,#16A34A)", earnings: "₹4.2L/mo", tag: "Large Manufacturer",  tagColor: "#15803D", tagBg: "#F0FDF4" },
];

const SECTION_CARDS = [
  {
    href:    "/supplier/list",
    icon:    <Package  size={28} color="#F97316" />,
    title:   "List Equipment",
    desc:    "Register your machines — 3D printers, CNC mills, lathes, laser cutters, waterjet, PCB fabs, sheet metal, and more. Set your rate and availability. Go live in minutes.",
    cta:     "Apply as supplier",
    accent:  "#F97316",
    accentBg: "#FFF7ED",
  },
  {
    href:    "/supplier/earnings",
    icon:    <BarChart2 size={28} color="#2563EB" />,
    title:   "Earning Trends",
    desc:    "See a full breakdown of how much you could earn based on your equipment type and hours. Weekly revenue charts, per-job profit table, and an interactive earnings calculator.",
    cta:     "See earning trends",
    accent:  "#2563EB",
    accentBg: "#EFF6FF",
  },
  {
    href:    "/supplier/certifications",
    icon:    <Shield   size={28} color="#16A34A" />,
    title:   "Certifications",
    desc:    "Upload ISO 9001, AS9100D, IATF, Udyam, GeM, IPC-A-610 and more. Certified suppliers are shown to buyers who filter for specific standards — 3.2× more quote requests on average.",
    cta:     "Upload certifications",
    accent:  "#16A34A",
    accentBg: "#F0FDF4",
  },
];

export default function SupplierLanding() {
  return (
    <>
      {/* ── HERO ── */}
      <section style={{
        background: "linear-gradient(135deg, #0F172A 0%, #1E293B 60%, #0F172A 100%)",
        padding: "88px 0 80px", borderBottom: "4px solid #F97316",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 999, padding: "6px 18px", marginBottom: 28, fontSize: 13, fontWeight: 700, color: "#FB923C" }}>
            <Zap size={13} /> Jobs matched to your facility. No RFQs. No subscription fee.
          </div>
          <h1 style={{ fontSize: "clamp(32px,5vw,56px)", fontWeight: 900, color: "#fff", lineHeight: 1.1, marginBottom: 22 }}>
            Earn from every hour<br />
            <span style={{ color: "#F97316" }}>your equipment runs.</span>
          </h1>
          <p style={{ fontSize: 18, color: "#94A3B8", lineHeight: 1.7, marginBottom: 44, maxWidth: 600, margin: "0 auto 44px" }}>
            List any manufacturing equipment. Foundry matches you with verified buyers across India. Upload certifications to unlock aerospace, automotive, and defence contracts.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 56 }}>
            <a href="/supplier/list" className="btn btn-primary btn-lg" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              Apply as Supplier <ArrowRight size={16} />
            </a>
            <a href="/supplier/certifications" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 22px", borderRadius: 12, fontSize: 15, fontWeight: 700, border: "1.5px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.06)", color: "#fff", textDecoration: "none" }}>
              <Shield size={15} /> Upload Certifications
            </a>
          </div>

          {/* 3 mini stats */}
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            {[
              { value: "₹18,400", label: "avg monthly / machine" },
              { value: "10% fee", label: "only on completed jobs" },
              { value: "24 hrs",  label: "to your first job request" },
            ].map(({ value, label }) => (
              <div key={label} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: "16px 24px", minWidth: 160 }}>
                <p style={{ fontSize: 24, fontWeight: 800, color: "#F97316", marginBottom: 4 }}>{value}</p>
                <p style={{ fontSize: 12, color: "#94A3B8" }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION CARDS ── */}
      <section style={{ padding: "64px 0", background: "#F9FAFB" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: "#111827", marginBottom: 10 }}>Everything you need as a supplier</h2>
            <p style={{ fontSize: 16, color: "#6B7280" }}>Three sections — list, earn, and get certified.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {SECTION_CARDS.map(({ href, icon, title, desc, cta, accent, accentBg }) => (
              <div key={href} style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 20, padding: 32, display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ width: 60, height: 60, borderRadius: 16, background: accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {icon}
                </div>
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: "#111827", marginBottom: 10 }}>{title}</h3>
                  <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.7 }}>{desc}</p>
                </div>
                <a href={href} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 10, fontSize: 14, fontWeight: 700, color: accent, background: accentBg, textDecoration: "none", marginTop: "auto", alignSelf: "flex-start" }}>
                  {cta} <ArrowRight size={14} />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section style={{ background: "#fff", borderTop: "1px solid #F3F4F6", borderBottom: "1px solid #F3F4F6" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
            {PLATFORM_STATS.map(({ value, label, sub }, i) => (
              <div key={label} style={{ textAlign: "center", padding: "28px 20px", borderRight: i < 3 ? "1px solid #F3F4F6" : "none" }}>
                <p style={{ fontSize: 32, fontWeight: 900, color: "#F97316", lineHeight: 1, marginBottom: 6 }}>{value}</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 3 }}>{label}</p>
                <p style={{ fontSize: 12, color: "#9CA3AF" }}>{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={{ padding: "72px 0", background: "#F9FAFB" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 999, padding: "6px 16px", marginBottom: 16, fontSize: 13, fontWeight: 700, color: "#C2410C" }}>
              <Users size={14} /> From solo maker to 18-operator shop
            </div>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: "#111827", marginBottom: 12 }}>Suppliers of every size earn on Foundry</h2>
            <p style={{ fontSize: 16, color: "#6B7280" }}>Real stories from the network.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {TESTIMONIALS.map((t) => (
              <div key={t.name} style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 20, padding: 28, display: "flex", flexDirection: "column", gap: 18 }}>
                <div style={{ display: "flex", gap: 3 }}>
                  {[1,2,3,4,5].map(i => <Star key={i} size={13} color="#FBBF24" fill="#FBBF24" />)}
                </div>
                <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.75, fontStyle: "italic" }}>&ldquo;{t.quote}&rdquo;</p>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: "auto" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{t.avatar}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 800, fontSize: 14, color: "#111827" }}>{t.name}</p>
                    <p style={{ fontSize: 12, color: "#6B7280" }}>{t.role}</p>
                    <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}><MapPin size={10} style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} />{t.city}</p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontSize: 18, fontWeight: 900, color: "#16A34A" }}>{t.earnings}</p>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, color: t.tagColor, background: t.tagBg }}>{t.tag}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ background: "#fff", padding: "72px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: "#111827", marginBottom: 12 }}>Start earning in 3 steps</h2>
            <p style={{ fontSize: 16, color: "#6B7280", maxWidth: 480, margin: "0 auto" }}>No subscription. No upfront fee. First job request within 24 hours of approval.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 28 }}>
            {[
              { step: 1, icon: <Package  size={28} color="#F97316" />, title: "Apply online",        desc: "Select your equipment type, enter specs, materials, and rate. Upload any certifications you hold. Takes under 10 minutes.", detail: "10 min to apply",     href: "/supplier/list" },
              { step: 2, icon: <Shield   size={28} color="#F97316" />, title: "Get verified",       desc: "Our team reviews your listing and certifications. Approval and onboarding within 24 hours of submission.", detail: "24-hour approval",  href: null },
              { step: 3, icon: <DollarSign size={28} color="#F97316" />, title: "Accept jobs & earn", desc: "Receive matched job requests — you see full specs before accepting. Pay lands in your UPI account every Friday.", detail: "Weekly UPI payouts", href: "/supplier/earnings" },
            ].map(({ step, icon, title, desc, detail, href }) => (
              <div key={step} style={{ background: "#F9FAFB", border: "1px solid #F3F4F6", borderRadius: 20, padding: 32 }}>
                <div className="step-icon-wrap" style={{ marginBottom: 24 }}>
                  <div className="step-icon" style={{ width: 68, height: 68, borderRadius: 18 }}>{icon}</div>
                  <span className="step-num">{step}</span>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 10 }}>{title}</h3>
                <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.7, marginBottom: 16 }}>{desc}</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#15803D", background: "#F0FDF4", borderRadius: 999, padding: "4px 12px" }}>
                    <CheckCircle size={12} /> {detail}
                  </div>
                  {href && (
                    <a href={href} style={{ fontSize: 12, fontWeight: 700, color: "#F97316", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                      Go <ArrowRight size={12} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section style={{ background: "linear-gradient(135deg, #0F172A, #1E293B)", padding: "72px 0" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
          <h2 style={{ fontSize: 36, fontWeight: 900, color: "#fff", marginBottom: 16 }}>Ready to list your equipment?</h2>
          <p style={{ fontSize: 16, color: "#94A3B8", marginBottom: 36 }}>Join 2,400+ suppliers already earning on Foundry. No subscription — just pay 10% on completed jobs.</p>
          <a href="/supplier/list" className="btn btn-primary btn-lg" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            Apply as Supplier <ArrowRight size={16} />
          </a>
        </div>
      </section>
    </>
  );
}
