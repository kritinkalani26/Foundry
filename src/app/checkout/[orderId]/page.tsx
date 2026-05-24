"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Loader2, Shield } from "lucide-react";

interface OrderSummary {
  id: string;
  material: string;
  quantity: number;
  infillDensity: number;
  estimatedPrice: number | null;
  totalPrice: number | null;
  status: string;
  stlAnalysis: { fileName: string } | null;
  quotes: Array<{ isAccepted: boolean; printerOwner: { businessName: string | null; user: { name: string } } }>;
}

declare global {
  interface Window {
    Razorpay: new (options: object) => { open(): void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const s     = document.createElement("script");
    s.src       = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload    = () => resolve(true);
    s.onerror   = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function CheckoutPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const router      = useRouter();

  const [order, setOrder]     = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying]   = useState(false);
  const [paid, setPaid]       = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    fetch(`/api/orders/${orderId}`)
      .then(r => r.json())
      .then(d => { setOrder(d.data); setLoading(false); })
      .catch(() => { setError("Could not load order."); setLoading(false); });
  }, [orderId]);

  async function handlePay() {
    if (!order) return;
    setPaying(true);
    setError("");

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) { setError("Could not load payment gateway."); setPaying(false); return; }

    const res  = await fetch("/api/payments/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ orderId }),
    });
    const data = await res.json();

    if (!res.ok) { setError(data.error || "Payment setup failed."); setPaying(false); return; }

    const { rzOrderId, amount, currency, keyId, prefill } = data.data;

    const rzp = new window.Razorpay({
      key:         keyId,
      amount,
      currency,
      name:        "Foundry",
      description: `Order #${orderId.slice(-6)}`,
      order_id:    rzOrderId,
      prefill,
      theme:       { color: "#F97316" },
      handler:     () => {
        setPaid(true);
        setPaying(false);
        setTimeout(() => router.push(`/order/${orderId}`), 2000);
      },
      modal: {
        ondismiss: () => setPaying(false),
      },
    });
    rzp.open();
  }

  const amount = order?.totalPrice ?? order?.estimatedPrice ?? 0;
  const platformFee = parseFloat((amount * 0.15).toFixed(2));
  const ownerPayout = parseFloat((amount * 0.85).toFixed(2));
  const acceptedQuote = order?.quotes.find(q => q.isAccepted);
  const printerName = acceptedQuote?.printerOwner?.businessName
    ?? acceptedQuote?.printerOwner?.user?.name
    ?? "Printer Owner";

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #F3F4F6" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px" }}>
          <Link href={`/order/${orderId}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#9CA3AF", textDecoration: "none", marginBottom: 20 }}>
            <ArrowLeft size={14} /> Back to order
          </Link>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#111827" }}>Checkout</h1>
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 24px" }}>
        {loading && (
          <div style={{ textAlign: "center", padding: 60 }}>
            <Loader2 size={32} color="#F97316" className="spin" style={{ margin: "0 auto" }} />
          </div>
        )}

        {paid && (
          <div style={{ textAlign: "center", padding: "48px 24px", background: "#fff", borderRadius: 20, border: "1px solid #E5E7EB" }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#F0FDF4", border: "3px solid #86EFAC", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <CheckCircle size={44} color="#16A34A" />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", marginBottom: 8 }}>Payment Successful!</h2>
            <p style={{ color: "#6B7280", fontSize: 14 }}>Redirecting to your order…</p>
          </div>
        )}

        {!loading && !paid && order && (
          <>
            {/* Order summary */}
            <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 20, padding: "24px", marginBottom: 16 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 16 }}>Order Summary</h2>
              {[
                ["File",         order.stlAnalysis?.fileName ?? `Order ${order.id.slice(-6)}`],
                ["Printer Owner", printerName],
                ["Material",     order.material],
                ["Infill",       `${Math.round(order.infillDensity * 100)}%`],
                ["Quantity",     String(order.quantity)],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #F9FAFB" }}>
                  <span style={{ fontSize: 13, color: "#9CA3AF" }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Price breakdown */}
            <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 20, padding: "24px", marginBottom: 16 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 16 }}>Price Breakdown</h2>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                <span style={{ fontSize: 13, color: "#6B7280" }}>Subtotal</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>₹{amount.toLocaleString("en-IN")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                <span style={{ fontSize: 12, color: "#9CA3AF" }}>Printer owner receives ({Math.round(ownerPayout / amount * 100)}%)</span>
                <span style={{ fontSize: 12, color: "#9CA3AF" }}>₹{ownerPayout.toLocaleString("en-IN")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                <span style={{ fontSize: 12, color: "#9CA3AF" }}>Platform fee (15%)</span>
                <span style={{ fontSize: 12, color: "#9CA3AF" }}>₹{platformFee.toLocaleString("en-IN")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0 6px", borderTop: "2px solid #F3F4F6", marginTop: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>Total</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: "#F97316" }}>₹{amount.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {error && (
              <p style={{ fontSize: 13, color: "#DC2626", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
                {error}
              </p>
            )}

            <button
              onClick={handlePay} disabled={paying}
              style={{ width: "100%", padding: "16px", borderRadius: 14, background: paying ? "#9CA3AF" : "linear-gradient(135deg,#F97316,#EA580C)", color: "#fff", fontWeight: 800, fontSize: 16, border: "none", cursor: paying ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
            >
              {paying ? <Loader2 size={18} className="spin" /> : null}
              {paying ? "Opening payment…" : `Pay ₹${amount.toLocaleString("en-IN")} via UPI / Card`}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center", marginTop: 12, fontSize: 12, color: "#9CA3AF" }}>
              <Shield size={13} /> Secured by Razorpay · 256-bit SSL
            </div>
          </>
        )}

        {!loading && !order && !paid && (
          <p style={{ textAlign: "center", color: "#9CA3AF" }}>Order not found.</p>
        )}
      </div>
    </div>
  );
}
