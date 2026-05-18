import Link from "next/link";
import { Package, Clock, CheckCircle, ChevronRight, Upload, TrendingUp } from "lucide-react";

const DEMO_ORDERS = [
  {
    id: "ord-abc123",
    file: "drone_arm_v3.stl",
    volume: "42.5 cm³",
    material: "PLA",
    infill: "30%",
    qty: 2,
    price: 570,
    status: "PRINTING",
    statusClass: "badge-blue",
    statusDot: "#2563EB",
    printer: "MakerSpace Indore",
    date: "Today, 11:30 AM",
  },
  {
    id: "ord-def456",
    file: "miniature_knight.stl",
    volume: "18.2 cm³",
    material: "Resin",
    infill: "100%",
    qty: 1,
    price: 890,
    status: "DELIVERED",
    statusClass: "badge-green",
    statusDot: "#16A34A",
    printer: "3D Print Hub",
    date: "Yesterday, 3:20 PM",
  },
  {
    id: "ord-ghi789",
    file: "phone_stand.stl",
    volume: "12.8 cm³",
    material: "PETG",
    infill: "50%",
    qty: 3,
    price: 420,
    status: "QUOTED",
    statusClass: "badge-yellow",
    statusDot: "#D97706",
    printer: "Awaiting selection",
    date: "Today, 9:05 AM",
  },
];

const STATS = [
  { label: "Total Orders", value: "3", icon: Package, iconColor: "#2563EB", iconBg: "#EFF6FF", accentColor: "#2563EB" },
  { label: "Active", value: "2", icon: Clock, iconColor: "#C2410C", iconBg: "#FFF7ED", accentColor: "#F97316" },
  { label: "Delivered", value: "1", icon: CheckCircle, iconColor: "#15803D", iconBg: "#F0FDF4", accentColor: "#22C55E" },
  { label: "Total Spent", value: "₹1,880", icon: TrendingUp, iconColor: "#6D28D9", iconBg: "#F5F3FF", accentColor: "#8B5CF6" },
];

export default function CustomerDashboardPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB" }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #F3F4F6" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: "#111827" }}>My Orders</h1>
          <p style={{ color: "#9CA3AF", marginTop: 4, fontSize: 14 }}>Track all your 3D print jobs</p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
        {/* Stats grid with colored left border accents */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
          {STATS.map(({ label, value, icon: Icon, iconColor, iconBg, accentColor }) => (
            <div key={label} style={{
              background: "#fff",
              border: "1px solid #E5E7EB",
              borderLeft: `4px solid ${accentColor}`,
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
              <p style={{ fontSize: 26, fontWeight: 800, color: "#111827" }}>{value}</p>
              <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Orders */}
        <div style={{
          background: "#fff", border: "1px solid #E5E7EB",
          borderRadius: 20, overflow: "hidden",
        }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #F3F4F6" }}>
            <h2 style={{ fontWeight: 800, color: "#111827", fontSize: 16 }}>Order History</h2>
          </div>

          <div>
            {DEMO_ORDERS.map((order, idx) => (
              <div key={order.id}>
                <Link
                  href={`/order/${order.id}`}
                  style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px 24px", textDecoration: "none", color: "inherit", transition: "background 0.15s" }}
                  className="order-row"
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: "#FFF7ED",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <Package size={20} color="#F97316" />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                      {/* Status color dot */}
                      <span style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: order.statusDot, flexShrink: 0,
                        display: "inline-block",
                      }} />
                      <p style={{ fontWeight: 700, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 15 }}>
                        {order.file}
                      </p>
                      <span className={`badge ${order.statusClass}`}>
                        {order.status.replace("_", " ")}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: "#9CA3AF" }}>
                      {order.material} · {order.infill} infill · {order.printer} · {order.date}
                    </p>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontWeight: 800, color: "#111827", fontSize: 16 }}>₹{order.price}</p>
                      <p style={{ fontSize: 12, color: "#9CA3AF" }}>qty {order.qty}</p>
                    </div>
                    <ChevronRight size={16} color="#D1D5DB" />
                  </div>
                </Link>

                {/* Subtle divider */}
                {idx < DEMO_ORDERS.length - 1 && (
                  <div style={{ height: 1, background: "#F9FAFB", margin: "0 24px" }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* New order CTA */}
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <Link
            href="/upload"
            className="btn btn-primary btn-lg"
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <Upload size={16} />
            Place New Order
          </Link>
        </div>
      </div>
    </div>
  );
}
