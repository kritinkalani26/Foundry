import Link from "next/link";
import { ArrowLeft, Star, Package, MapPin, Clock, CheckCircle, AlertCircle } from "lucide-react";
import OrderTracker from "@/components/OrderTracker";
import RatingWidget from "@/components/RatingWidget";
import { formatINR } from "@/lib/utils";
import type { OrderStatus } from "@/types";

interface PageProps {
  params: { id: string };
}

const DEMO_ORDER = {
  id: "demo-order-123",
  status: "PRINTING" as OrderStatus,
  material: "PLA",
  infillDensity: 0.3,
  layerHeight: 0.2,
  quantity: 2,
  totalPrice: 570,
  estimatedPrice: 570,
  notes: null as string | null,
  createdAt: new Date("2024-01-15T11:30:00Z"),
  estimatedCompletionAt: new Date("2024-01-17T18:00:00Z"),
  completionPhoto: null,
  customer: { name: "Demo Customer", email: "demo@foundry.in" },
  stlAnalysis: {
    fileName: "drone_arm_v3.stl",
    volumeCm3: 42.5,
    surfaceAreaCm2: 124.8,
    boundingBoxXMm: 120,
    boundingBoxYMm: 85,
    boundingBoxZMm: 95,
    triangleCount: 28640,
    estimatedPrintHours: 3.5,
  },
  statusHistory: [
    { status: "UPLOADED" as OrderStatus, timestamp: new Date("2024-01-15T11:30:00Z").toISOString(), note: null },
    { status: "QUOTED" as OrderStatus, timestamp: new Date("2024-01-15T11:45:00Z").toISOString(), note: null },
    { status: "CONFIRMED" as OrderStatus, timestamp: new Date("2024-01-15T12:10:00Z").toISOString(), note: "Payment confirmed" },
    { status: "PRINTING" as OrderStatus, timestamp: new Date("2024-01-16T09:00:00Z").toISOString(), note: "Print started on Ender 3 Pro" },
  ],
  quotes: [{
    turnaroundDays: 2,
    printerOwner: {
      id: "demo-owner-1",
      businessName: "MakerSpace Indore",
      rating: 4.8,
      totalRatings: 234,
      user: { name: "Rahul Sharma", city: "Indore" },
    }
  }],
  rating: null,
};

async function getOrder(id: string) {
  try {
    const { prisma } = await import("@/lib/prisma");
    return await prisma.order.findUnique({
      where: { id },
      include: {
        customer: { select: { name: true, email: true } },
        stlAnalysis: true,
        statusHistory: { orderBy: { timestamp: "asc" } },
        quotes: {
          where: { isAccepted: true },
          include: { printerOwner: { include: { user: true } } },
        },
        rating: true,
      },
    });
  } catch {
    return null;
  }
}

// Parse part/assembly info stored in the notes field by the bulk order route.
// Format: "[Assembly: <name>] Part: <part> | Process: <process> | Material: <material>"
function parseAssemblyNotes(notes: string | null) {
  if (!notes) return null;
  const assemblyMatch = notes.match(/\[Assembly:\s*([^\]]+)\]/);
  const partMatch     = notes.match(/Part:\s*([^|]+)/);
  const processMatch  = notes.match(/Process:\s*([^|]+)/);
  const materialMatch = notes.match(/Material:\s*([^|]+)/);
  if (!partMatch) return null;
  return {
    assemblyName: assemblyMatch?.[1]?.trim() ?? null,
    partName:     partMatch[1]?.trim() ?? null,
    process:      processMatch?.[1]?.trim() ?? null,
    material:     materialMatch?.[1]?.trim() ?? null,
  };
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
      <span style={{ fontSize: 13, color: "#9CA3AF" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#111827", textAlign: "right", maxWidth: "60%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {value}
      </span>
    </div>
  );
}

export default async function OrderPage({ params }: PageProps) {
  // Demo route
  if (params.id === "demo-order-123") {
    return <OrderPageContent order={DEMO_ORDER} isDemo={true} />;
  }

  const dbOrder = await getOrder(params.id);

  if (!dbOrder) {
    return (
      <div style={{ minHeight: "100vh", background: "#F9FAFB", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px" }}>
          <AlertCircle size={48} color="#E5E7EB" style={{ margin: "0 auto 16px" }} />
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111827", marginBottom: 8 }}>Order not found</h2>
          <p style={{ color: "#9CA3AF", fontSize: 14, marginBottom: 24 }}>
            We couldn&apos;t load this order. It may have been removed or the link is incorrect.
          </p>
          <Link href="/dashboard/customer" className="btn btn-primary btn-md" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            ← Back to My Orders
          </Link>
        </div>
      </div>
    );
  }

  return <OrderPageContent order={dbOrder as typeof DEMO_ORDER} isDemo={false} />;
}

function OrderPageContent({
  order,
  isDemo,
}: {
  order: typeof DEMO_ORDER;
  isDemo: boolean;
}) {
  const acceptedQuote = order.quotes[0];
  const printerOwner  = acceptedQuote?.printerOwner;
  const canRate       = order.status === "DELIVERED" && !order.rating;
  const assemblyInfo  = parseAssemblyNotes(order.notes);
  const isAssemblyOrder = !order.stlAnalysis && assemblyInfo;

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>

        {/* Demo banner */}
        {isDemo && (
          <div style={{
            background: "#FFF7ED", border: "1px solid #FED7AA",
            borderRadius: 12, padding: "12px 16px", marginBottom: 20,
            fontSize: 13, color: "#C2410C", display: "flex", alignItems: "center", gap: 8,
          }}>
            <CheckCircle size={14} />
            <span>
              <strong>Demo order</strong> — This is sample data showing how order tracking works.
            </span>
          </div>
        )}

        {/* Back link */}
        <Link
          href="/dashboard/customer"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 13, color: "#9CA3AF", marginBottom: 24, textDecoration: "none",
          }}
        >
          <ArrowLeft size={14} />
          Back to My Orders
        </Link>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827" }}>
              {isAssemblyOrder ? (assemblyInfo.partName ?? "Part Order") : "Order Details"}
            </h1>
            {isAssemblyOrder && assemblyInfo.assemblyName && (
              <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }}>From assembly: {assemblyInfo.assemblyName}</p>
            )}
            <p style={{ fontSize: 12, color: "#D1D5DB", fontFamily: "monospace", marginTop: 4 }}>{order.id}</p>
          </div>
          <div style={{
            display: "inline-flex", alignItems: "center",
            padding: "6px 14px", borderRadius: 999, fontSize: 13, fontWeight: 700,
            background: order.status === "DELIVERED" ? "#F0FDF4" : "#FFF7ED",
            color: order.status === "DELIVERED" ? "#15803D" : "#C2410C",
            border: `1px solid ${order.status === "DELIVERED" ? "#BBF7D0" : "#FED7AA"}`,
          }}>
            {order.status.replace("_", " ")}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
          {/* Left: Order tracker */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 20, padding: "24px" }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 4 }}>Order Progress</h2>
              <OrderTracker
                currentStatus={order.status}
                statusHistory={order.statusHistory.map((h) => ({
                  status: h.status,
                  timestamp: typeof h.timestamp === "string" ? h.timestamp : (h.timestamp as Date).toISOString(),
                  note: h.note,
                }))}
                estimatedCompletionAt={
                  order.estimatedCompletionAt
                    ? (typeof order.estimatedCompletionAt === "string"
                        ? order.estimatedCompletionAt
                        : (order.estimatedCompletionAt as Date).toISOString())
                    : null
                }
              />
            </div>

            {canRate && printerOwner && (
              <RatingWidget
                orderId={order.id}
                printerOwnerId={printerOwner.id}
                printerName={printerOwner.businessName ?? printerOwner.user.name}
              />
            )}
            {order.rating && (
              <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 16, padding: "20px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <Star size={18} color="#FBBF24" fill="#FBBF24" />
                  <span style={{ fontWeight: 700, color: "#15803D", fontSize: 14 }}>You rated this order</span>
                </div>
              </div>
            )}
          </div>

          {/* Right: Details sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Specs */}
            <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 20, padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Package size={15} color="#F97316" />
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>
                  {isAssemblyOrder ? "Part Details" : "Print Specifications"}
                </h3>
              </div>

              {isAssemblyOrder ? (
                <>
                  {assemblyInfo.partName     && <Row label="Part"     value={assemblyInfo.partName} />}
                  {assemblyInfo.assemblyName && <Row label="Assembly" value={assemblyInfo.assemblyName} />}
                  {assemblyInfo.process      && <Row label="Process"  value={assemblyInfo.process} />}
                  {assemblyInfo.material     && <Row label="Material" value={assemblyInfo.material} />}
                </>
              ) : (
                <>
                  {order.stlAnalysis && (
                    <>
                      <Row label="File"          value={order.stlAnalysis.fileName} />
                      <Row label="Volume"        value={`${order.stlAnalysis.volumeCm3.toFixed(2)} cm³`} />
                      <Row label="Bounding Box"  value={`${order.stlAnalysis.boundingBoxXMm.toFixed(0)}×${order.stlAnalysis.boundingBoxYMm.toFixed(0)}×${order.stlAnalysis.boundingBoxZMm.toFixed(0)} mm`} />
                      <Row label="Triangles"     value={order.stlAnalysis.triangleCount.toLocaleString()} />
                      <Row label="Est. Print Time" value={`${order.stlAnalysis.estimatedPrintHours.toFixed(1)} hrs`} />
                      <div style={{ borderTop: "1px solid #F3F4F6", margin: "10px 0" }} />
                    </>
                  )}
                  <Row label="Material"     value={order.material} />
                  <Row label="Infill"       value={`${Math.round(order.infillDensity * 100)}%`} />
                  <Row label="Layer Height" value={`${order.layerHeight}mm`} />
                  <Row label="Quantity"     value={order.quantity.toString()} />
                </>
              )}
            </div>

            {/* Printer owner */}
            {printerOwner && (
              <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 20, padding: "20px" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 14 }}>Makerspace</h3>
                <div style={{ fontWeight: 700, color: "#111827", fontSize: 14, marginBottom: 8 }}>
                  {printerOwner.businessName ?? printerOwner.user.name}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#9CA3AF", fontSize: 13, marginBottom: 6 }}>
                  <MapPin size={12} />
                  {printerOwner.user.city}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#D97706", fontSize: 13, marginBottom: 8 }}>
                  <Star size={12} color="#FBBF24" fill="#FBBF24" />
                  {printerOwner.rating.toFixed(1)} ({printerOwner.totalRatings} reviews)
                </div>
                {acceptedQuote && (
                  <Row label="Turnaround" value={`${acceptedQuote.turnaroundDays} days`} />
                )}
              </div>
            )}

            {/* Payment */}
            <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 20, padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <Clock size={15} color="#F97316" />
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Payment</h3>
              </div>
              <Row label="Estimated Total" value={formatINR(order.totalPrice ?? order.estimatedPrice ?? 0)} />
              <Row label="Payment Status"  value={order.totalPrice ? "Paid" : "Pending"} />
              <Row
                label="Order Date"
                value={new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              />
            </div>

            <Link
              href="/dashboard/customer"
              className="btn btn-outline btn-md"
              style={{ width: "100%", justifyContent: "center", textAlign: "center" }}
            >
              ← All My Orders
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
