import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, TrendingUp, CreditCard, Users, Banknote, DollarSign } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

async function getFinancials() {
  const orders: {
    totalPrice: number | null; platformFee: number | null;
    ownerPayout: number | null; payoutStatus: string | null; createdAt: Date;
  }[] = await db.order.findMany({
    where:  { paymentStatus: "paid" },
    select: { totalPrice: true, platformFee: true, ownerPayout: true, payoutStatus: true, createdAt: true },
  });

  const gmv             = orders.reduce((s, o) => s + (o.totalPrice ?? 0), 0);
  const platformRevenue = orders.reduce((s, o) => s + (o.platformFee ?? 0), 0);
  const payoutsReleased = orders
    .filter(o => o.payoutStatus === "released")
    .reduce((s, o) => s + (o.ownerPayout ?? 0), 0);
  const payoutsPending  = orders
    .filter(o => o.payoutStatus !== "released")
    .reduce((s, o) => s + (o.ownerPayout ?? 0), 0);

  const subRevEvents: { amount: number; createdAt: Date }[] = await db.paymentEvent.findMany({
    where:  { type: { startsWith: "SUB" } },
    select: { amount: true, createdAt: true },
  });
  const subscriptionRevenue = subRevEvents.reduce((s, e) => s + e.amount, 0);

  const providerFees = parseFloat((gmv * 0.02).toFixed(2));
  const netRevenue   = parseFloat((platformRevenue + subscriptionRevenue - providerFees).toFixed(2));

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const recentOrders = orders.filter(o => new Date(o.createdAt) >= sixMonthsAgo);

  const monthlyMap: Record<string, { gmv: number; commission: number }> = {};
  for (const o of recentOrders) {
    const key = new Date(o.createdAt).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
    if (!monthlyMap[key]) monthlyMap[key] = { gmv: 0, commission: 0 };
    monthlyMap[key].gmv        += o.totalPrice ?? 0;
    monthlyMap[key].commission += o.platformFee ?? 0;
  }

  const activeSubs  = await db.subscription.count({ where: { status: "active" } });
  const totalUsers  = await prisma.user.count();
  const totalOwners = await prisma.printerOwner.count();

  return {
    gmv, platformRevenue, subscriptionRevenue, payoutsReleased, payoutsPending,
    providerFees, netRevenue, monthlyMap, activeSubs, totalUsers, totalOwners,
    orderCount: orders.length,
  };
}

export default async function AdminFinancesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/login");
  if ((session.user as { role?: string }).role !== "ADMIN") redirect("/");

  const f = await getFinancials();

  const cardStyle = (accent: string): React.CSSProperties => ({
    background: "#fff", border: "1px solid #E5E7EB", borderRadius: 16,
    padding: "24px", borderTop: `4px solid ${accent}`,
  });

  const labelSt: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: "#9CA3AF",
    textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8,
  };
  const valueSt: React.CSSProperties = { fontSize: 32, fontWeight: 800, color: "#111827" };

  function fmt(n: number) { return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`; }

  const months  = Object.entries(f.monthlyMap).slice(-6);
  const maxGmv  = Math.max(...months.map(([, v]) => v.gmv), 1);

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #F3F4F6" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 32px" }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#9CA3AF", textDecoration: "none", marginBottom: 16 }}>
            <ArrowLeft size={14} /> Back to app
          </Link>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111827" }}>Finances</h1>
          <p style={{ fontSize: 14, color: "#6B7280", marginTop: 4 }}>Platform financial overview · all-time unless noted</p>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 32 }}>
          <div style={cardStyle("#F97316")}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <p style={labelSt}>Total GMV</p>
              <TrendingUp size={18} color="#F97316" />
            </div>
            <p style={valueSt}>{fmt(f.gmv)}</p>
            <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 6 }}>{f.orderCount} paid orders</p>
          </div>

          <div style={cardStyle("#2563EB")}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <p style={labelSt}>Platform Commission</p>
              <CreditCard size={18} color="#2563EB" />
            </div>
            <p style={valueSt}>{fmt(f.platformRevenue)}</p>
            <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 6 }}>15% of GMV</p>
          </div>

          <div style={cardStyle("#7C3AED")}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <p style={labelSt}>Subscription Revenue</p>
              <Users size={18} color="#7C3AED" />
            </div>
            <p style={valueSt}>{fmt(f.subscriptionRevenue)}</p>
            <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 6 }}>{f.activeSubs} active subscriptions</p>
          </div>

          <div style={cardStyle("#16A34A")}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <p style={labelSt}>Payouts Released</p>
              <Banknote size={18} color="#16A34A" />
            </div>
            <p style={valueSt}>{fmt(f.payoutsReleased)}</p>
            <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 6 }}>{fmt(f.payoutsPending)} pending</p>
          </div>

          <div style={cardStyle("#D97706")}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <p style={labelSt}>Net Revenue</p>
              <DollarSign size={18} color="#D97706" />
            </div>
            <p style={valueSt}>{fmt(f.netRevenue)}</p>
            <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 6 }}>After ~2% provider fees ({fmt(f.providerFees)})</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
          {/* Monthly GMV bar chart */}
          <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 16, padding: "24px" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 24 }}>Monthly GMV (last 6 months)</h2>
            {months.length === 0 ? (
              <p style={{ color: "#9CA3AF", textAlign: "center", padding: "40px 0" }}>No data yet</p>
            ) : (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 16, height: 160 }}>
                {months.map(([month, val]) => {
                  const pct = (val.gmv / maxGmv) * 100;
                  return (
                    <div key={month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 10, color: "#6B7280", fontWeight: 600 }}>{fmt(val.gmv)}</span>
                      <div style={{ width: "100%", height: 120, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                        <div style={{ width: "100%", height: `${pct}%`, background: "linear-gradient(180deg,#F97316,#EA580C)", borderRadius: "6px 6px 0 0", minHeight: 4 }} />
                      </div>
                      <span style={{ fontSize: 11, color: "#9CA3AF" }}>{month}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Revenue breakdown */}
          <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 16, padding: "24px" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 20 }}>Revenue Breakdown</h2>
            {[
              { label: "Order commissions", value: f.platformRevenue,    color: "#F97316" },
              { label: "Subscriptions",     value: f.subscriptionRevenue, color: "#7C3AED" },
              { label: "Provider fees (−)", value: -f.providerFees,      color: "#DC2626" },
              { label: "Net revenue",        value: f.netRevenue,         color: "#16A34A" },
            ].map(row => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #F9FAFB" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: row.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: "#374151" }}>{row.label}</span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: row.value < 0 ? "#DC2626" : "#111827" }}>
                  {row.value < 0 ? `−${fmt(-row.value)}` : fmt(row.value)}
                </span>
              </div>
            ))}

            <div style={{ marginTop: 24, paddingTop: 16, borderTop: "2px solid #F3F4F6" }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 12 }}>User stats</h3>
              {[
                { label: "Total users",          value: f.totalUsers },
                { label: "Printer owners",       value: f.totalOwners },
                { label: "Active subscriptions", value: f.activeSubs },
              ].map(row => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                  <span style={{ fontSize: 13, color: "#6B7280" }}>{row.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
