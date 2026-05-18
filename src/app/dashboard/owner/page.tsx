"use client";

import { useState } from "react";
import Link from "next/link";
import { Package, Clock, DollarSign, TrendingUp, Star, ChevronRight, Check, X, AlertCircle, Loader2 } from "lucide-react";

const DEMO_ORDERS = [
  {
    id: "ord-1", file: "robot_arm.stl", customer: "Arjun Singh",
    volume: "78.4 cm³", bb: "120×85×95mm", material: "PLA", infill: "30%", qty: 1,
    price: 485, printHours: 3.5, status: "QUOTED", timeLeft: "1h 28m",
  },
  {
    id: "ord-2", file: "phone_stand_v2.stl", customer: "Kavya Sharma",
    volume: "22.1 cm³", bb: "90×60×45mm", material: "PETG", infill: "50%", qty: 3,
    price: 620, printHours: 2.1, status: "PRINTING", timeLeft: null,
  },
  {
    id: "ord-3", file: "gear_assembly.stl", customer: "Rohan Patel",
    volume: "56.8 cm³", bb: "85×85×40mm", material: "ABS", infill: "80%", qty: 1,
    price: 780, printHours: 5.2, status: "QUALITY_CHECK", timeLeft: null,
  },
];

const STATUS_NEXT: Record<string, string> = {
  QUOTED: "CONFIRMED", CONFIRMED: "PRINTING",
  PRINTING: "QUALITY_CHECK", QUALITY_CHECK: "READY", READY: "DELIVERED",
};
const STATUS_LABEL: Record<string, string> = {
  QUOTED: "Accept Order", CONFIRMED: "Start Printing",
  PRINTING: "Mark Quality Check",
  QUALITY_CHECK: "Mark Ready", READY: "Mark Delivered",
};
const STATUS_BADGE: Record<string, string> = {
  QUOTED: "badge-yellow",
  CONFIRMED: "badge-blue",
  PRINTING: "badge-purple",
  QUALITY_CHECK: "badge-orange",
  READY: "badge-green",
  DELIVERED: "badge-gray",
};

export default function OwnerDashboardPage() {
  const [orders, setOrders] = useState(DEMO_ORDERS);
  const [loading, setLoading] = useState<string | null>(null);
  const [surge, setSurge] = useState(1.0);

  async function advance(id: string, next: string) {
    setLoading(id);
    await new Promise((r) => setTimeout(r, 700));
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: next } : o));
    setLoading(null);
  }

  async function reject(id: string) {
    setLoading(`x-${id}`);
    await new Promise((r) => setTimeout(r, 500));
    setOrders((prev) => prev.filter((o) => o.id !== id));
    setLoading(null);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB" }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #F3F4F6" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ fontSize: 30, fontWeight: 800, color: "#111827" }}>MakerSpace Indore</h1>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 14, fontWeight: 600, color: "#6B7280" }}>
                  <Star size={16} color="#FBBF24" fill="#FBBF24" />
                  4.8 · 234 reviews
                </span>
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#D1D5DB" }} />
                <span style={{ fontSize: 14, color: "#22C55E", fontWeight: 700 }}>● Active</span>
              </div>
            </div>

            {/* Surge control with better visual feedback */}
            <div style={{
              background: "#FEF2F2", border: "1px solid #FECACA",
              borderRadius: 20, padding: "20px 24px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <TrendingUp size={16} color="#EF4444" />
                <p style={{ fontWeight: 700, color: "#991B1B", fontSize: 14 }}>High Demand Detected</p>
              </div>
              <p style={{ color: "#DC2626", fontSize: 12, marginBottom: 14 }}>
                24 orders today vs 10 daily avg — set your surge:
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                {[1.0, 1.1, 1.2, 1.3, 1.5].map((m) => (
                  <button
                    key={m}
                    onClick={() => setSurge(m)}
                    style={{
                      padding: "8px 14px", borderRadius: 10,
                      fontSize: 13, fontWeight: 800,
                      border: surge === m ? "none" : "2px solid #FECACA",
                      background: surge === m ? "#EF4444" : "#fff",
                      color: surge === m ? "#fff" : "#DC2626",
                      cursor: "pointer", fontFamily: "inherit",
                      transition: "all 0.15s",
                      boxShadow: surge === m ? "0 2px 8px rgba(239,68,68,.3)" : "none",
                      transform: surge === m ? "scale(1.05)" : "none",
                    }}
                  >
                    {m}×
                  </button>
                ))}
              </div>
              {surge > 1 && (
                <p style={{ fontSize: 12, color: "#EF4444", marginTop: 10, fontWeight: 600 }}>
                  ✓ Prices are {Math.round((surge - 1) * 100)}% above standard
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>
        {/* Earnings cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
          {[
            { label: "Total Earned", value: "₹85,420", icon: DollarSign, iconColor: "#15803D", iconBg: "#F0FDF4", accent: "#22C55E" },
            { label: "Pending Payout", value: "₹12,300", icon: Clock, iconColor: "#C2410C", iconBg: "#FFF7ED", accent: "#F97316" },
            { label: "Pending Orders", value: "1", icon: AlertCircle, iconColor: "#B91C1C", iconBg: "#FEF2F2", accent: "#EF4444" },
            { label: "Active Prints", value: "2", icon: Package, iconColor: "#1D4ED8", iconBg: "#EFF6FF", accent: "#2563EB" },
          ].map(({ label, value, icon: Icon, iconColor, iconBg, accent }) => (
            <div key={label} style={{
              background: "#fff",
              border: "1px solid #E5E7EB",
              borderLeft: `4px solid ${accent}`,
              borderRadius: "0 16px 16px 0",
              padding: "20px",
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: iconBg,
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 12,
              }}>
                <Icon size={20} color={iconColor} />
              </div>
              <p style={{ fontSize: 24, fontWeight: 800, color: "#111827" }}>{value}</p>
              <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Orders */}
        <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 20, overflow: "hidden" }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontWeight: 800, color: "#111827", fontSize: 16 }}>Incoming &amp; Active Orders</h2>
            <span style={{ fontSize: 13, color: "#9CA3AF" }}>{orders.length} orders</span>
          </div>

          <div>
            {orders.map((order, idx) => {
              const next = STATUS_NEXT[order.status];
              const isLoading = loading === order.id;
              const isRejecting = loading === `x-${order.id}`;
              const priceWithSurge = Math.round(order.price * surge);

              return (
                <div key={order.id}>
                  <div style={{ padding: "24px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                      {/* File icon */}
                      <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: "#EEF2FF",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        <Package size={20} color="#6366F1" />
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                          <p style={{ fontWeight: 700, color: "#111827", fontSize: 15 }}>{order.file}</p>
                          <span className={`badge ${STATUS_BADGE[order.status]}`}>
                            {order.status.replace("_", " ")}
                          </span>
                          {order.timeLeft && (
                            <span
                              className="badge badge-surge pulse"
                              style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                            >
                              ⏱ {order.timeLeft} left
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 4 }}>
                          {order.customer} · {order.material} {order.infill} · qty {order.qty}
                        </p>
                        <p style={{ fontSize: 12, color: "#9CA3AF" }}>
                          {order.volume} · {order.bb} · ~{order.printHours}hr print time
                        </p>
                      </div>

                      {/* Price + side-by-side actions */}
                      <div style={{ flexShrink: 0, textAlign: "right" }}>
                        <p style={{ fontSize: 22, fontWeight: 800, color: "#111827", marginBottom: 4 }}>
                          ₹{priceWithSurge}
                        </p>
                        {surge > 1 && (
                          <p style={{ fontSize: 11, color: "#EF4444", marginBottom: 10 }}>surge {surge}× applied</p>
                        )}

                        {/* Accept + Reject side by side */}
                        {order.status === "QUOTED" ? (
                          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            <button
                              onClick={() => reject(order.id)}
                              disabled={!!loading}
                              className="btn btn-sm btn-danger"
                              style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                            >
                              {isRejecting ? <Loader2 size={12} className="spin" /> : <X size={12} />}
                              Reject
                            </button>
                            <button
                              onClick={() => advance(order.id, next)}
                              disabled={!!loading}
                              className="btn btn-sm btn-green"
                              style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                            >
                              {isLoading ? <Loader2 size={12} className="spin" /> : <Check size={12} />}
                              Accept
                            </button>
                          </div>
                        ) : next && STATUS_LABEL[order.status] ? (
                          <button
                            onClick={() => advance(order.id, next)}
                            disabled={!!loading}
                            className="btn btn-sm btn-primary"
                            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                          >
                            {isLoading ? <Loader2 size={12} className="spin" /> : <Check size={12} />}
                            {STATUS_LABEL[order.status]}
                          </button>
                        ) : null}

                        <div style={{ marginTop: 10 }}>
                          <Link
                            href={`/order/${order.id}`}
                            style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 12, color: "#9CA3AF" }}
                          >
                            View details <ChevronRight size={12} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>

                  {idx < orders.length - 1 && (
                    <div style={{ height: 1, background: "#F9FAFB", margin: "0 24px" }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Payout card */}
        <div style={{
          marginTop: 24,
          background: "linear-gradient(135deg, #22C55E 0%, #16A34A 100%)",
          borderRadius: 20, padding: "28px 32px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 16,
        }}>
          <div>
            <p style={{ fontWeight: 600, color: "rgba(255,255,255,0.8)", fontSize: 14 }}>Pending Payout</p>
            <p style={{ fontSize: 40, fontWeight: 800, color: "#fff", lineHeight: 1.1, marginTop: 4 }}>₹12,300</p>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 6 }}>Paid every Friday via UPI</p>
          </div>
          <button className="btn btn-white btn-lg" style={{ fontWeight: 800 }}>
            Request Early Payout
          </button>
        </div>
      </div>
    </div>
  );
}
