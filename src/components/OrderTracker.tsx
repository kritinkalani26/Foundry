"use client";

import { CheckCircle, Circle, Loader2, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { ORDER_STATUS_FLOW } from "@/types";
import type { OrderStatus } from "@/types";

interface StatusHistoryItem {
  status: OrderStatus;
  timestamp: string;
  note?: string | null;
}

interface OrderTrackerProps {
  currentStatus: OrderStatus;
  statusHistory: StatusHistoryItem[];
  estimatedCompletionAt?: string | null;
}

export default function OrderTracker({
  currentStatus,
  statusHistory,
  estimatedCompletionAt,
}: OrderTrackerProps) {
  const currentIndex = ORDER_STATUS_FLOW.findIndex((s) => s.status === currentStatus);

  function getTimestamp(status: OrderStatus): string | undefined {
    return statusHistory.find((h) => h.status === status)?.timestamp;
  }

  return (
    <div style={{ padding: "16px 0" }}>
      {/* Current status header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <div style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 6 }}>Current Status</div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: currentStatus === "DELIVERED" ? "#F0FDF4" : "#FFF7ED",
            color: currentStatus === "DELIVERED" ? "#15803D" : "#C2410C",
            border: `1px solid ${currentStatus === "DELIVERED" ? "#BBF7D0" : "#FED7AA"}`,
            borderRadius: 999, padding: "6px 14px", fontSize: 13, fontWeight: 700,
          }}>
            {currentStatus === "PRINTING" && (
              <Loader2 size={13} className="spin" />
            )}
            {ORDER_STATUS_FLOW[currentIndex]?.label ?? currentStatus}
          </div>
        </div>
        {currentStatus === "PRINTING" && estimatedCompletionAt && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, color: "#9CA3AF", display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
              <Clock size={13} />
              Est. completion
            </div>
            <div style={{ fontWeight: 600, color: "#111827", fontSize: 13, marginTop: 2 }}>
              {formatDate(estimatedCompletionAt)}
            </div>
          </div>
        )}
      </div>

      {/* Step tracker */}
      <div style={{ position: "relative" }}>
        {ORDER_STATUS_FLOW.map((step, idx) => {
          const isCompleted = idx < currentIndex;
          const isActive = idx === currentIndex;
          const timestamp = getTimestamp(step.status);
          const note = statusHistory.find((h) => h.status === step.status)?.note;
          const isLast = idx === ORDER_STATUS_FLOW.length - 1;

          return (
            <div key={step.status} style={{ display: "flex", gap: 16, paddingBottom: isLast ? 0 : 28, position: "relative" }}>
              {/* Connecting line */}
              {!isLast && (
                <div style={{
                  position: "absolute",
                  left: 19,
                  top: 40,
                  bottom: 0,
                  width: 2,
                  background: isCompleted ? "#22C55E" : "#E5E7EB",
                  transition: "background 0.3s",
                }} />
              )}

              {/* Step dot */}
              <div style={{ flexShrink: 0, zIndex: 1 }}>
                {isCompleted ? (
                  <div className="track-dot-done">
                    <CheckCircle size={20} color="#fff" />
                  </div>
                ) : isActive ? (
                  <div className="track-dot-active">
                    {currentStatus === "PRINTING" ? (
                      <Loader2 size={20} color="#fff" className="spin" />
                    ) : (
                      <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#fff" }} />
                    )}
                  </div>
                ) : (
                  <div className="track-dot-todo">
                    <Circle size={16} color="#D1D5DB" />
                  </div>
                )}
              </div>

              {/* Step content */}
              <div className="track-content" style={{ opacity: !isCompleted && !isActive ? 0.4 : 1 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <h4 className={`track-title${isActive ? " track-title-active" : ""}`}>
                    {step.label}
                  </h4>
                  {timestamp && (
                    <span className="track-time">{formatDate(timestamp)}</span>
                  )}
                </div>
                <p className="track-desc">{step.description}</p>
                {note && (
                  <div style={{
                    marginTop: 8, fontSize: 12,
                    background: "#F9FAFB", border: "1px solid #E5E7EB",
                    borderRadius: 8, padding: "8px 12px", color: "#6B7280",
                  }}>
                    {note}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
