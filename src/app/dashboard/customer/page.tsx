import Link from "next/link";
import { Package, Clock, CheckCircle, ChevronRight, Upload, TrendingUp } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface Order {
  id: string;
  material: string;
  infillDensity: number;
  quantity: number;
  totalPrice: number | null;
  estimatedPrice: number | null;
  status: string;
  createdAt: string;
  stlAnalysis: { fileName: string; volumeCm3: number } | null;
  quotes: Array<{
    isAccepted: boolean;
    printerOwner: { user: { name: string } };
  }>;
}

const STATUS_BADGE: Record<string, string> = {
  UPLOADED: "badge-gray",
  QUOTED: "badge-yellow",
  CONFIRMED: "badge-blue",
  PRINTING: "badge-blue",
  QUALITY_CHECK: "badge-orange",
  READY: "badge-green",
  DELIVERED: "badge-green",
};

const STATUS_DOT: Record<string, string> = {
  UPLOADED: "#9CA3AF",
  QUOTED: "#D97706",
  CONFIRMED: "#2563EB",
  PRINTING: "#2563EB",
  QUALITY_CHECK: "#F97316",
  READY: "#16A34A",
  DELIVERED: "#16A34A",
};

async function getOrders(userId: string): Promise<Order[]> {
  try {
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.order.findMany({
      where: { customerId: userId },
      include: {
        stlAnalysis: { select: { fileName: true, volumeCm3: true } },
        quotes: {
          where: { isAccepted: true },
          include: { printerOwner: { include: { user: { select: { name: true } } } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })) as Order[];
  } catch {
    return [];
  }
}

export default async function CustomerDashboardPage() {
  const session = await getServerSession(authOptions);
  const orders = session?.user?.id ? await getOrders(session.user.id) : [];

  const delivered = orders.filter((o) => o.status === "DELIVERED").length;
  const active     = orders.filter((o) => o.status !== "DELIVERED").length;
  const totalSpent = orders.reduce((sum, o) => sum + (o.totalPrice ?? o.estimatedPrice ?? 0), 0);

  const STATS = [
    { label: "Total Orders", value: String(orders.length), icon: Package,     iconColor: "#2563EB", iconBg: "#EFF6FF", accentColor: "#2563EB" },
    { label: "Active",       value: String(active),        icon: Clock,        iconColor: "#C2410C", iconBg: "#FFF7ED", accentColor: "#F97316" },
    { label: "Delivered",    value: String(delivered),     icon: CheckCircle,  iconColor: "#15803D", iconBg: "#F0FDF4", accentColor: "#22C55E" },
    { label: "Total Spent",  value: `₹${totalSpent.toLocaleString("en-IN")}`, icon: TrendingUp, iconColor: "#6D28D9", iconBg: "#F5F3FF", accentColor: "#8B5CF6" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #F3F4F6" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: "#111827" }}>My Orders</h1>
          <p style={{ color: "#9CA3AF", marginTop: 4, fontSize: 14 }}>
            {session?.user?.name ? `Welcome back, ${session.user.name.split(" ")[0]}` : "Track all your jobs"}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
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

        <div style={{
          background: "#fff", border: "1px solid #E5E7EB",
          borderRadius: 20, overflow: "hidden",
        }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #F3F4F6" }}>
            <h2 style={{ fontWeight: 800, color: "#111827", fontSize: 16 }}>Order History</h2>
          </div>

          {orders.length === 0 ? (
            <div style={{ padding: "60px 24px", textAlign: "center" }}>
              <Package size={48} color="#E5E7EB" style={{ margin: "0 auto 16px" }} />
              <p style={{ fontWeight: 700, color: "#374151", fontSize: 16, marginBottom: 8 }}>No orders yet</p>
              <p style={{ color: "#9CA3AF", fontSize: 14, marginBottom: 24 }}>
                Upload a 3D model to place your first order
              </p>
              <Link href="/upload" className="btn btn-primary btn-md" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <Upload size={16} /> Start an Order
              </Link>
            </div>
          ) : (
            <div>
              {orders.map((order, idx) => {
                const acceptedQuote = order.quotes.find((q) => q.isAccepted);
                const printerName = acceptedQuote?.printerOwner?.user?.name ?? "Awaiting selection";
                const price = order.totalPrice ?? order.estimatedPrice ?? 0;
                const date = new Date(order.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                });

                return (
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
                          <span style={{
                            width: 8, height: 8, borderRadius: "50%",
                            background: STATUS_DOT[order.status] ?? "#9CA3AF",
                            flexShrink: 0, display: "inline-block",
                          }} />
                          <p style={{ fontWeight: 700, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 15 }}>
                            {order.stlAnalysis?.fileName ?? `Order ${order.id.slice(-6)}`}
                          </p>
                          <span className={`badge ${STATUS_BADGE[order.status] ?? "badge-gray"}`}>
                            {order.status.replace("_", " ")}
                          </span>
                        </div>
                        <p style={{ fontSize: 13, color: "#9CA3AF" }}>
                          {order.material} · {Math.round(order.infillDensity * 100)}% infill · {printerName} · {date}
                        </p>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ fontWeight: 800, color: "#111827", fontSize: 16 }}>₹{price.toLocaleString("en-IN")}</p>
                          <p style={{ fontSize: 12, color: "#9CA3AF" }}>qty {order.quantity}</p>
                        </div>
                        <ChevronRight size={16} color="#D1D5DB" />
                      </div>
                    </Link>

                    {idx < orders.length - 1 && (
                      <div style={{ height: 1, background: "#F9FAFB", margin: "0 24px" }} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

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
