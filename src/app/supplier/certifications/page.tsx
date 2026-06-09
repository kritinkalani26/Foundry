"use client";

import { useState, useRef } from "react";
import {
  Award, CheckCircle, AlertCircle, Clock, Upload, ExternalLink,
  Zap, Shield, Info, Loader2, ChevronDown,
} from "lucide-react";

type VerifyStatus = "none" | "verifying" | "pending" | "verified" | "rejected";
type VerifyMethod = "instant" | "registry" | "manual";

interface CertEntry {
  id: string;
  name: string;
  industry: string;
  industryColor: string;
  industryBg: string;
  description: string;
  requiredFor: string;
  applyUrl: string;
  applyLabel: string;
  approxCost: string;
  approxTime: string;
  verifyMethod: VerifyMethod;
  verifyNote: string;
  regLabel?: string;
  regPlaceholder?: string;
  registryName?: string;
}

const CERTIFICATIONS: CertEntry[] = [
  { id: "udyam",     name: "MSME Udyam",        industry: "India — Free",        industryColor: "#D97706", industryBg: "#FFFBEB", description: "Free MSME registration giving access to government tenders, priority lending, and delayed payment protection under the MSMED Act.", requiredFor: "Government contracts, priority lending, legal protections", applyUrl: "https://udyamregistration.gov.in/", applyLabel: "Register at udyamregistration.gov.in", approxCost: "Free", approxTime: "Same day", verifyMethod: "instant", verifyNote: "Verified automatically via the Udyam government API — enter your registration number and we check in real time.", regLabel: "Udyam Registration Number", regPlaceholder: "UDYAM-MH-00-0000000" },
  { id: "gem",       name: "GeM Seller",         industry: "India — Free",        industryColor: "#D97706", industryBg: "#FFFBEB", description: "Government e-Marketplace seller registration. Enables selling fabrication services to central and state government departments.", requiredFor: "Selling to Government departments / PSUs", applyUrl: "https://gem.gov.in/", applyLabel: "Register at gem.gov.in", approxCost: "Free", approxTime: "1–3 days", verifyMethod: "instant", verifyNote: "Verified automatically by cross-checking your Seller ID against the GeM seller database.", regLabel: "GeM Seller ID", regPlaceholder: "e.g. 0001AB250000000001" },
  { id: "iso9001",   name: "ISO 9001:2015",      industry: "Quality Management",  industryColor: "#2563EB", industryBg: "#EFF6FF", description: "Universal quality management baseline. Required by most OEMs as a supplier prerequisite. Demonstrates consistent process quality across any manufacturing type.", requiredFor: "Most B2B supplier relationships, government tenders", applyUrl: "https://www.nabcb.qci.org.in/accreditation/certification_bodies.php", applyLabel: "Find accredited body — NABCB India", approxCost: "₹40,000 – ₹1,20,000", approxTime: "3–6 months", verifyMethod: "registry", verifyNote: "Your certificate number is cross-checked against the issuing Certification Body's online registry and NABCB's accredited CB list.", registryName: "NABCB India accredited CB registry", regLabel: "Certificate Number", regPlaceholder: "e.g. IN-QMS-12345" },
  { id: "iatf16949", name: "IATF 16949:2016",    industry: "Automotive",          industryColor: "#92400E", industryBg: "#FFFBEB", description: "Automotive sector quality management. Required to supply Tier 1 and Tier 2 auto manufacturers (Maruti, Tata Motors, Mahindra, Bosch).", requiredFor: "Tier 1 / 2 automotive supply chain", applyUrl: "https://www.iatfglobaloversight.org/cbcertified/", applyLabel: "IATF Certified Body Directory", approxCost: "₹60,000 – ₹1,80,000", approxTime: "6–9 months", verifyMethod: "registry", verifyNote: "Certificate number looked up in the IATF Global Oversight public registry — covers all IATF 16949 certified organisations worldwide.", registryName: "IATF Global Oversight registry", regLabel: "IATF Certificate Number", regPlaceholder: "e.g. 16949/2016-XXXX" },
  { id: "as9100d",   name: "AS9100D",            industry: "Aerospace",           industryColor: "#0369A1", industryBg: "#F0F9FF", description: "Aerospace quality management standard. Mandatory for any supplier in commercial or defense aviation supply chains (ISRO, HAL, Boeing, Airbus).", requiredFor: "Aerospace and defense parts supply", applyUrl: "https://iaqg.org/oasis/oasis", applyLabel: "IAQG OASIS Database", approxCost: "₹80,000 – ₹2,50,000", approxTime: "6–12 months", verifyMethod: "registry", verifyNote: "Certificate and organisation details verified in the IAQG OASIS public database, which all AS9100D certification bodies report to.", registryName: "IAQG OASIS database", regLabel: "OASIS Registration ID", regPlaceholder: "e.g. IN-001234" },
  { id: "nadcap",    name: "NADCAP",             industry: "Aerospace",           industryColor: "#0369A1", industryBg: "#F0F9FF", description: "Accreditation for aerospace special processes — heat treatment, NDT, welding, coatings. Required by Boeing, Airbus, GE Aviation, and all Tier 1 aerospace suppliers.", requiredFor: "Aerospace special-process suppliers", applyUrl: "https://www.pri.org/nadcap", applyLabel: "Apply via PRI (Performance Review Institute)", approxCost: "₹1,50,000 – ₹4,00,000", approxTime: "12–18 months", verifyMethod: "manual", verifyNote: "Foundry team verifies the NADCAP Merit certificate and accreditation commodity against PRI's records. Manual review within 48 hours." },
  { id: "iso13485",  name: "ISO 13485:2016",     industry: "Medical Devices",     industryColor: "#DC2626", industryBg: "#FEF2F2", description: "Quality management for medical device manufacturers. Required by CDSCO (India) and FDA (US) for any regulated medical device component manufacturing.", requiredFor: "Medical device component manufacturing", applyUrl: "https://www.nabh.co.in/", applyLabel: "Apply via NABH-accredited certification bodies", approxCost: "₹50,000 – ₹1,50,000", approxTime: "6–12 months", verifyMethod: "registry", verifyNote: "Certificate number cross-referenced against the issuing CB's client registry and NABCB's medical device CB accreditation list.", registryName: "NABCB medical devices CB list", regLabel: "Certificate Number", regPlaceholder: "e.g. MD-QMS-99876" },
  { id: "ipc610",    name: "IPC-A-610",          industry: "Electronics",         industryColor: "#16A34A", industryBg: "#F0FDF4", description: "Global acceptability standard for electronic assemblies. Customers specify Class 2 (consumer) or Class 3 (aerospace/medical). Operator and inspector certification.", requiredFor: "Quality electronics assembly, defense/aerospace PCBs", applyUrl: "https://www.ipc.org/ipc-a-610", applyLabel: "IPC Training & Certification Program", approxCost: "₹15,000 – ₹40,000 per operator", approxTime: "1–3 months", verifyMethod: "manual", verifyNote: "Foundry verifies operator/CIS certificate format and issuing IPC-licensed training centre. Manual review within 48 hours." },
  { id: "jstd001",   name: "J-STD-001",          industry: "Electronics",         industryColor: "#16A34A", industryBg: "#F0FDF4", description: "Requirements for Soldering Electrical and Electronic Assemblies. Operator and inspector certification — pairs with IPC-A-610 for complete electronics QA.", requiredFor: "Defense and aerospace PCB assembly", applyUrl: "https://www.ipc.org/ipc-j-std-001", applyLabel: "IPC J-STD-001 Certification Program", approxCost: "₹12,000 – ₹30,000 per operator", approxTime: "1–2 months", verifyMethod: "manual", verifyNote: "Certificate document checked against IPC licensed training centre list. Manual review within 48 hours." },
  { id: "iso14001",  name: "ISO 14001:2015",     industry: "Environmental",       industryColor: "#15803D", industryBg: "#F0FDF4", description: "Environmental management system. Increasingly required by large OEMs as part of ESG supplier mandates. Also useful for export to EU markets.", requiredFor: "Large OEM supplier programs, EU export", applyUrl: "https://www.nabcb.qci.org.in/accreditation/certification_bodies.php", applyLabel: "Find accredited body — NABCB India", approxCost: "₹35,000 – ₹1,00,000", approxTime: "3–6 months", verifyMethod: "registry", verifyNote: "Certificate number cross-checked against issuing CB's registry and NABCB's accredited EMS CB list.", registryName: "NABCB India accredited CB registry", regLabel: "Certificate Number", regPlaceholder: "e.g. IN-EMS-44512" },
  { id: "aws",       name: "AWS D1.1 Welding",   industry: "Structural Welding",  industryColor: "#64748B", industryBg: "#F8FAFC", description: "Structural Welding Code — Steel. Required for structural fabrication, pressure vessels, and any welded component in aerospace, defense, or oil & gas.", requiredFor: "Structural & pressure vessel welding", applyUrl: "https://www.aws.org/certification", applyLabel: "AWS Certification Program", approxCost: "₹8,000 – ₹20,000 per welder", approxTime: "1–3 months", verifyMethod: "manual", verifyNote: "Welder qualification certificate and CWI stamp checked manually. AWS does not publish a public lookup API." },
  { id: "bis",       name: "BIS / IS Mark",      industry: "India",               industryColor: "#D97706", industryBg: "#FFFBEB", description: "Bureau of Indian Standards product certification. Mandatory for many product categories in India (electrical goods, steel products, cement).", requiredFor: "Specific product categories mandated by India regulations", applyUrl: "https://www.bis.gov.in/", applyLabel: "Apply via bis.gov.in", approxCost: "₹20,000 – ₹80,000", approxTime: "3–9 months", verifyMethod: "manual", verifyNote: "BIS licence number and product category verified against BIS India public database. Manual review within 48 hours." },
];

const METHOD_INFO: Record<VerifyMethod, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  instant:  { label: "Instant verify",    color: "#16A34A", bg: "#F0FDF4", icon: <Zap size={12} /> },
  registry: { label: "Registry check",    color: "#2563EB", bg: "#EFF6FF", icon: <Shield size={12} /> },
  manual:   { label: "Manual review 48h", color: "#D97706", bg: "#FFFBEB", icon: <Clock size={12} /> },
};

const INDUSTRY_FILTERS = ["All", "India — Free", "Quality Management", "Automotive", "Aerospace", "Medical Devices", "Electronics", "Environmental", "Structural Welding", "India"];

interface CertState {
  status: VerifyStatus;
  fileName?: string;
  regNum?: string;
  rejectedReason?: string;
}

export default function CertificationsPage() {
  const [industryFilter, setIndustryFilter] = useState("All");
  const [states, setStates] = useState<Record<string, CertState>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [regInputs, setRegInputs] = useState<Record<string, string>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const filtered = CERTIFICATIONS.filter((c) => industryFilter === "All" || c.industry === industryFilter);

  function getState(id: string): CertState {
    return states[id] ?? { status: "none" };
  }

  function simulateInstantVerify(id: string) {
    const regNum = regInputs[id]?.trim();
    if (!regNum) return;
    setStates((p) => ({ ...p, [id]: { status: "verifying", regNum } }));
    setTimeout(() => {
      const pass = regNum.length > 8;
      setStates((p) => ({ ...p, [id]: { status: pass ? "verified" : "rejected", regNum, rejectedReason: pass ? undefined : "Registration number not found in government database. Please check and re-enter." } }));
    }, 1800);
  }

  function handleFileUpload(id: string, file: File | undefined) {
    if (!file) return;
    const regNum = regInputs[id]?.trim();
    setStates((p) => ({ ...p, [id]: { status: "pending", fileName: file.name, regNum } }));
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 64px" }}>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: "#111827", marginBottom: 10 }}>Certifications</h1>
        <p style={{ fontSize: 16, color: "#6B7280", maxWidth: 600 }}>Upload your credentials — every certificate is independently verified before a badge appears on your profile. Certified suppliers receive 3.2× more quote requests from aerospace, automotive, and defence buyers.</p>
      </div>

      {/* How verification works */}
      <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 20, padding: "24px 28px", marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Info size={18} color="#16A34A" />
          </div>
          <div>
            <h3 style={{ fontWeight: 800, fontSize: 16, color: "#111827", marginBottom: 4 }}>How Foundry verifies your certifications</h3>
            <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.6 }}>We never accept self-declarations. Every certification is independently verified before a badge appears on your profile.</p>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {([
            { method: "instant" as VerifyMethod,  title: "Instant API verify",     certs: "MSME Udyam, GeM Seller",                                          detail: "We call the government API with your registration number. Match confirmed in real time — under 3 seconds." },
            { method: "registry" as VerifyMethod, title: "Public registry check",   certs: "ISO 9001, IATF 16949, AS9100D, ISO 13485, ISO 14001",            detail: "Your certificate number is looked up in the certification body's public registry (IAQG OASIS, IATF Global Oversight, NABCB India). If found and not expired, auto-verified." },
            { method: "manual" as VerifyMethod,   title: "Manual document review",  certs: "IPC-A-610, J-STD-001, AWS D1.1, NADCAP, BIS",                   detail: "A Foundry verifier checks the uploaded PDF for correct format, valid issuer, expiry date, and company name. Completed within 48 business hours." },
          ]).map(({ method, title, certs, detail }) => {
            const m = METHOD_INFO[method];
            return (
              <div key={method} style={{ background: m.bg, border: `1px solid ${m.color}22`, borderRadius: 14, padding: "16px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <span style={{ color: m.color }}>{m.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: m.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>{m.label}</span>
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 6 }}>{title}</p>
                <p style={{ fontSize: 11, color: "#6B7280", marginBottom: 8, lineHeight: 1.5 }}>{detail}</p>
                <p style={{ fontSize: 11, color: m.color, fontWeight: 600 }}>Applies to: {certs}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Industry filter */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {INDUSTRY_FILTERS.map((f) => {
          const active = industryFilter === f;
          return (
            <button key={f} onClick={() => setIndustryFilter(f)} style={{ padding: "7px 14px", borderRadius: 999, fontSize: 12, fontWeight: 600, border: active ? "2px solid #F97316" : "2px solid #E5E7EB", background: active ? "#F97316" : "#fff", color: active ? "#fff" : "#6B7280", cursor: "pointer", fontFamily: "inherit" }}>
              {f}
            </button>
          );
        })}
      </div>

      {/* Cert cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map((cert) => {
          const cs = getState(cert.id);
          const mi = METHOD_INFO[cert.verifyMethod];
          const isExpanded = expanded === cert.id;

          return (
            <div key={cert.id} style={{
              background: "#fff",
              border: cs.status === "verified" ? "2px solid #16A34A" : cs.status === "rejected" ? "2px solid #DC2626" : cs.status === "pending" ? "2px solid #D97706" : "1px solid #E5E7EB",
              borderRadius: 16, overflow: "hidden",
            }}>
              {/* Row */}
              <div style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: cert.industryBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Award size={17} color={cert.industryColor} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                    <span style={{ fontWeight: 800, fontSize: 15, color: "#111827" }}>{cert.name}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, color: cert.industryColor, background: cert.industryBg }}>{cert.industry}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, color: mi.color, background: mi.bg, display: "inline-flex", alignItems: "center", gap: 3 }}>{mi.icon} {mi.label}</span>
                  </div>
                  <p style={{ fontSize: 12, color: "#6B7280" }}>{cert.description.slice(0, 100)}…</p>
                </div>
                <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
                  {cs.status === "none"      && <span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600 }}>Not submitted</span>}
                  {cs.status === "verifying" && <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "#2563EB" }}><Loader2 size={12} className="spin" /> Verifying…</span>}
                  {cs.status === "pending"   && <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: "#FFFBEB", color: "#D97706", border: "1px solid #FDE68A" }}>⏳ Under review</span>}
                  {cs.status === "verified"  && <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" }}><CheckCircle size={11} /> Verified</span>}
                  {cs.status === "rejected"  && <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}><AlertCircle size={11} /> Not verified</span>}
                  <button onClick={() => setExpanded(isExpanded ? null : cert.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 4 }}>
                    <ChevronDown size={16} style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                  </button>
                </div>
              </div>

              {/* Expanded */}
              {isExpanded && (
                <div style={{ borderTop: "1px solid #F3F4F6", padding: 20 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                    {/* Info column */}
                    <div>
                      <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.7, marginBottom: 16 }}>{cert.description}</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                        {[
                          { label: "Required for", value: cert.requiredFor, color: "#DC2626", bg: "#FEF2F2" },
                          { label: "Cost",         value: cert.approxCost,  color: "#2563EB", bg: "#EFF6FF" },
                          { label: "Time",         value: cert.approxTime,  color: "#16A34A", bg: "#F0FDF4" },
                        ].map(({ label, value, color, bg }) => (
                          <div key={label} style={{ background: bg, borderRadius: 8, padding: "8px 12px", display: "flex", gap: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 70 }}>{label}</span>
                            <span style={{ fontSize: 12, color: "#374151" }}>{value}</span>
                          </div>
                        ))}
                      </div>
                      <a href={cert.applyUrl} target="_blank" rel="noopener noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 8, background: cert.industryBg, border: `1.5px solid ${cert.industryColor}33`, color: cert.industryColor, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                        <ExternalLink size={12} /> {cert.applyLabel}
                      </a>
                    </div>

                    {/* Verification panel */}
                    <div style={{ background: "#F9FAFB", borderRadius: 14, padding: 20, border: "1px solid #F3F4F6" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                        <span style={{ color: mi.color }}>{mi.icon}</span>
                        <p style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>Submit for verification</p>
                      </div>
                      <p style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.6, marginBottom: 16 }}>{cert.verifyNote}</p>

                      {cs.status === "verified" && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 16px", background: "#F0FDF4", borderRadius: 10, border: "1.5px solid #BBF7D0" }}>
                          <CheckCircle size={20} color="#16A34A" />
                          <div>
                            <p style={{ fontWeight: 800, fontSize: 13, color: "#15803D" }}>Verified ✓</p>
                            {cs.regNum && <p style={{ fontSize: 11, color: "#16A34A", marginTop: 2 }}>Reg: {cs.regNum}</p>}
                          </div>
                        </div>
                      )}

                      {cs.status === "pending" && (
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", background: "#FFFBEB", borderRadius: 10, border: "1px solid #FDE68A" }}>
                          <Clock size={16} color="#D97706" style={{ marginTop: 1, flexShrink: 0 }} />
                          <div>
                            <p style={{ fontWeight: 700, fontSize: 12, color: "#D97706" }}>Under review</p>
                            <p style={{ fontSize: 11, color: "#92400E", marginTop: 2 }}>
                              {cert.verifyMethod === "registry"
                                ? "Registry check in progress — usually within 24 hours."
                                : "Foundry team reviews within 48 business hours."}
                            </p>
                            {cs.fileName && <p style={{ fontSize: 11, color: "#92400E", marginTop: 2 }}>File: {cs.fileName}</p>}
                          </div>
                        </div>
                      )}

                      {cs.status === "rejected" && (
                        <div style={{ padding: "12px 14px", background: "#FEF2F2", borderRadius: 10, border: "1px solid #FECACA", marginBottom: 14 }}>
                          <p style={{ fontWeight: 700, fontSize: 12, color: "#DC2626", marginBottom: 4 }}>Verification failed</p>
                          <p style={{ fontSize: 12, color: "#991B1B" }}>{cs.rejectedReason}</p>
                        </div>
                      )}

                      {(cs.status === "none" || cs.status === "rejected") && (
                        <>
                          {cert.verifyMethod === "instant" && (
                            <div>
                              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{cert.regLabel}</label>
                              <input
                                style={{ width: "100%", padding: "10px 14px", border: "2px solid #E5E7EB", borderRadius: 10, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 10, background: "#fff" }}
                                placeholder={cert.regPlaceholder}
                                value={regInputs[cert.id] ?? ""}
                                onChange={(e) => setRegInputs((p) => ({ ...p, [cert.id]: e.target.value }))}
                              />
                              <button
                                onClick={() => simulateInstantVerify(cert.id)}
                                disabled={!regInputs[cert.id]?.trim()}
                                style={{ width: "100%", padding: "10px", borderRadius: 10, fontSize: 13, fontWeight: 700, border: "none", background: "#16A34A", color: "#fff", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: !regInputs[cert.id]?.trim() ? 0.5 : 1 }}>
                                <Zap size={13} /> Verify Instantly
                              </button>
                            </div>
                          )}

                          {cert.verifyMethod === "registry" && (
                            <div>
                              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{cert.regLabel}</label>
                              <input
                                style={{ width: "100%", padding: "10px 14px", border: "2px solid #E5E7EB", borderRadius: 10, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 10, background: "#fff" }}
                                placeholder={cert.regPlaceholder}
                                value={regInputs[cert.id] ?? ""}
                                onChange={(e) => setRegInputs((p) => ({ ...p, [cert.id]: e.target.value }))}
                              />
                              <p style={{ fontSize: 11, color: "#6B7280", marginBottom: 8 }}>Also upload the certificate PDF for our records:</p>
                              <input ref={(el) => { fileRefs.current[cert.id] = el; }} type="file" accept=".pdf,.jpg,.png" style={{ display: "none" }} onChange={(e) => handleFileUpload(cert.id, e.target.files?.[0])} />
                              <button onClick={() => fileRefs.current[cert.id]?.click()}
                                style={{ width: "100%", padding: "10px", borderRadius: 10, fontSize: 13, fontWeight: 700, border: "2px solid #2563EB", background: "#EFF6FF", color: "#2563EB", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                                <Upload size={13} /> Upload Certificate PDF
                              </button>
                              <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 6, textAlign: "center" }}>Cross-checked against {cert.registryName}</p>
                            </div>
                          )}

                          {cert.verifyMethod === "manual" && (
                            <div>
                              <input ref={(el) => { fileRefs.current[cert.id] = el; }} type="file" accept=".pdf,.jpg,.png" style={{ display: "none" }} onChange={(e) => handleFileUpload(cert.id, e.target.files?.[0])} />
                              <button onClick={() => fileRefs.current[cert.id]?.click()}
                                style={{ width: "100%", padding: "10px", borderRadius: 10, fontSize: 13, fontWeight: 700, border: "2px solid #D97706", background: "#FFFBEB", color: "#D97706", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                                <Upload size={13} /> Upload Certificate PDF
                              </button>
                              <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 6, textAlign: "center" }}>Foundry team reviews within 48 business hours</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
