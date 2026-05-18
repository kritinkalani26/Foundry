"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2, Smartphone, QrCode, ArrowRight } from "lucide-react";
import { formatINR } from "@/lib/utils";

interface UPIPaymentProps {
  orderId: string;
  amount: number;
}

type PaymentMethod = "upi_id" | "qr";
type PaymentState = "idle" | "processing" | "success";

export default function UPIPayment({ orderId, amount }: UPIPaymentProps) {
  const router = useRouter();
  const [method, setMethod] = useState<PaymentMethod>("upi_id");
  const [upiId, setUpiId] = useState("");
  const [paymentState, setPaymentState] = useState<PaymentState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Animate progress bar during processing
  useEffect(() => {
    if (paymentState !== "processing") {
      setProgress(0);
      return;
    }
    setProgress(0);
    const start = Date.now();
    const duration = 2000;
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(95, (elapsed / duration) * 100);
      setProgress(pct);
      if (elapsed >= duration) clearInterval(interval);
    }, 40);
    return () => clearInterval(interval);
  }, [paymentState]);

  async function handlePayment() {
    if (method === "upi_id" && !upiId.includes("@")) {
      setError("Please enter a valid UPI ID (e.g., name@upi)");
      return;
    }

    setError(null);
    setPaymentState("processing");

    // Simulate payment processing (2 seconds)
    await new Promise((r) => setTimeout(r, 2000));

    // Mark order as CONFIRMED
    try {
      await fetch("/api/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, amount, method, upiId }),
      });
    } catch {
      // ignore API errors in demo
    }

    setProgress(100);
    setPaymentState("success");
  }

  if (paymentState === "success") {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px" }}>
        {/* Success icon */}
        <div style={{
          width: 96, height: 96, borderRadius: "50%",
          background: "#F0FDF4", border: "3px solid #86EFAC",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 28px",
        }}>
          <CheckCircle size={52} color="#16A34A" />
        </div>

        <h2 style={{ fontSize: 28, fontWeight: 800, color: "#111827", marginBottom: 10 }}>
          Payment Successful!
        </h2>
        <p style={{ fontSize: 15, color: "#6B7280", marginBottom: 8 }}>
          Your order has been confirmed and sent to the printer owner.
        </p>

        <div style={{
          background: "#F9FAFB", border: "1px solid #E5E7EB",
          borderRadius: 12, padding: "16px 24px", margin: "24px 0",
          display: "inline-block",
        }}>
          <p style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 4 }}>Order ID</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#374151", fontFamily: "monospace" }}>{orderId}</p>
        </div>

        <div style={{ marginTop: 8, marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: "#9CA3AF" }}>
            Amount paid: <strong style={{ color: "#111827" }}>{formatINR(amount)}</strong>
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button
            className="btn btn-green btn-lg"
            style={{ width: "100%", fontSize: 15, justifyContent: "center" }}
            onClick={() => router.push(`/order/${orderId}`)}
          >
            Track My Order <ArrowRight size={16} style={{ marginLeft: 4 }} />
          </button>
          <a
            href="/dashboard/customer"
            style={{ fontSize: 14, color: "#9CA3AF", textDecoration: "underline" }}
          >
            Back to My Orders
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ textAlign: "center" }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: "#111827" }}>Complete Payment</h2>
        <p style={{ color: "#9CA3AF", marginTop: 4, fontSize: 14 }}>Secure UPI payment</p>
      </div>

      {/* Amount card */}
      <div style={{
        background: "linear-gradient(135deg, #F97316 0%, #EF4444 100%)",
        borderRadius: 16, padding: "24px", textAlign: "center", color: "#fff",
      }}>
        <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 6 }}>Total Amount</div>
        <div style={{ fontSize: 42, fontWeight: 800, lineHeight: 1 }}>{formatINR(amount)}</div>
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>including all taxes and platform fee</div>
      </div>

      {/* Method selector */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <button
          style={{
            padding: "14px 16px", borderRadius: 12,
            border: method === "upi_id" ? "2px solid #F97316" : "2px solid #E5E7EB",
            background: method === "upi_id" ? "#FFF7ED" : "#fff",
            color: method === "upi_id" ? "#C2410C" : "#6B7280",
            fontSize: 14, fontWeight: 600,
            display: "flex", alignItems: "center", gap: 8,
            cursor: "pointer", fontFamily: "inherit",
            transition: "all 0.15s",
          }}
          onClick={() => setMethod("upi_id")}
        >
          <Smartphone size={18} /> UPI ID
        </button>
        <button
          style={{
            padding: "14px 16px", borderRadius: 12,
            border: method === "qr" ? "2px solid #F97316" : "2px solid #E5E7EB",
            background: method === "qr" ? "#FFF7ED" : "#fff",
            color: method === "qr" ? "#C2410C" : "#6B7280",
            fontSize: 14, fontWeight: 600,
            display: "flex", alignItems: "center", gap: 8,
            cursor: "pointer", fontFamily: "inherit",
            transition: "all 0.15s",
          }}
          onClick={() => setMethod("qr")}
        >
          <QrCode size={18} /> Scan QR Code
        </button>
      </div>

      {method === "upi_id" && (
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            UPI ID
          </label>
          <input
            type="text"
            placeholder="yourname@upi or yourname@okicici"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            style={{
              width: "100%", padding: "12px 16px", fontSize: 15,
              border: "2px solid #E5E7EB", borderRadius: 12,
              fontFamily: "inherit", outline: "none",
              boxSizing: "border-box",
            }}
          />
          <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 6 }}>
            e.g., 9876543210@ybl, name@paytm, name@okaxis
          </p>
        </div>
      )}

      {method === "qr" && (
        <div style={{
          background: "#fff", border: "1px solid #E5E7EB",
          borderRadius: 16, padding: "24px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
        }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Scan to Pay</p>

          {/* Simulated QR code */}
          <div style={{
            width: 180, height: 180,
            background: "#fff", border: "2px solid #E5E7EB",
            borderRadius: 12, padding: 12, position: "relative",
          }}>
            <div style={{
              width: "100%", height: "100%",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='white'/%3E%3Crect x='10' y='10' width='30' height='30' fill='none' stroke='black' stroke-width='5'/%3E%3Crect x='15' y='15' width='20' height='20' fill='black'/%3E%3Crect x='60' y='10' width='30' height='30' fill='none' stroke='black' stroke-width='5'/%3E%3Crect x='65' y='15' width='20' height='20' fill='black'/%3E%3Crect x='10' y='60' width='30' height='30' fill='none' stroke='black' stroke-width='5'/%3E%3Crect x='15' y='65' width='20' height='20' fill='black'/%3E%3Crect x='45' y='10' width='5' height='5' fill='black'/%3E%3Crect x='45' y='20' width='5' height='5' fill='black'/%3E%3Crect x='50' y='15' width='5' height='5' fill='black'/%3E%3Crect x='45' y='45' width='5' height='5' fill='black'/%3E%3Crect x='55' y='45' width='5' height='5' fill='black'/%3E%3Crect x='65' y='50' width='5' height='5' fill='black'/%3E%3Crect x='70' y='45' width='5' height='5' fill='black'/%3E%3Crect x='60' y='60' width='10' height='5' fill='black'/%3E%3Crect x='70' y='65' width='5' height='10' fill='black'/%3E%3Crect x='75' y='60' width='5' height='5' fill='black'/%3E%3Crect x='80' y='70' width='5' height='5' fill='black'/%3E%3Crect x='60' y='75' width='5' height='5' fill='black'/%3E%3Crect x='65' y='80' width='5' height='5' fill='black'/%3E%3C/svg%3E")`,
              backgroundSize: "cover",
            }} />
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{
                background: "#fff", padding: "4px 8px", borderRadius: 6,
                fontSize: 11, fontWeight: 800, color: "#C2410C",
                border: "1px solid #FED7AA",
              }}>
                Foundry
              </div>
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <p style={{ fontWeight: 700, color: "#111827", fontSize: 14 }}>foundry@upi</p>
            <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }}>Scan with any UPI app</p>
          </div>
          <div style={{ display: "flex", gap: 8, fontSize: 12, color: "#9CA3AF" }}>
            <span>GPay</span><span>·</span><span>PhonePe</span><span>·</span><span>Paytm</span><span>·</span><span>BHIM</span>
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-red">
          {error}
        </div>
      )}

      {/* Progress bar during processing */}
      {paymentState === "processing" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
            <span style={{ color: "#374151", fontWeight: 600 }}>Processing payment...</span>
            <span style={{ color: "#9CA3AF" }}>{Math.round(progress)}%</span>
          </div>
          <div style={{ height: 8, background: "#F3F4F6", borderRadius: 99, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 99,
              background: "linear-gradient(90deg, #F97316, #22C55E)",
              width: `${progress}%`,
              transition: "width 0.1s linear",
            }} />
          </div>
          <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 8, textAlign: "center" }}>
            Verifying with your bank...
          </p>
        </div>
      )}

      {/* Demo disclaimer */}
      <div style={{
        fontSize: 12, color: "#9CA3AF",
        background: "#F9FAFB", borderRadius: 10,
        padding: "10px 14px", border: "1px solid #F3F4F6",
        lineHeight: 1.5,
      }}>
        <em>Demo mode:</em> This simulates a UPI payment. In production, Razorpay or Cashfree would handle real bank confirmation.
      </div>

      <button
        className="btn btn-primary btn-lg"
        style={{ width: "100%", fontSize: 15, justifyContent: "center" }}
        onClick={handlePayment}
        disabled={paymentState === "processing"}
      >
        {paymentState === "processing" ? (
          <>
            <Loader2 size={16} className="spin" style={{ marginRight: 8 }} />
            Processing Payment...
          </>
        ) : (
          `Pay ${formatINR(amount)}`
        )}
      </button>
    </div>
  );
}
