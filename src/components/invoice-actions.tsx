"use client";

import { useState } from "react";

export function InvoiceActions({ invoiceId, recovered }: { invoiceId: string; recovered: boolean }) {
  const [loading, setLoading] = useState<"none" | "remind" | "paid">("none");
  const [error, setError] = useState<string | null>(null);

  async function sendReminderNow() {
    setError(null);
    setLoading("remind");
    const response = await fetch(`/api/invoices/${invoiceId}/send-reminder-now`, { method: "POST" });
    if (!response.ok) {
      const payload = await response.json();
      setError(payload?.error?.message ?? "Failed to send reminder");
    } else {
      window.location.reload();
    }
    setLoading("none");
  }

  async function markRecovered() {
    setError(null);
    setLoading("paid");
    const response = await fetch(`/api/invoices/${invoiceId}/mark-paid`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      const payload = await response.json();
      setError(payload?.error?.message ?? "Failed to mark paid");
    } else {
      window.location.reload();
    }
    setLoading("none");
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        {!recovered ? (
          <>
            <button
              className="btn-secondary px-2 py-1 text-xs"
              onClick={sendReminderNow}
              disabled={loading !== "none"}
              type="button"
            >
              {loading === "remind" ? "Sending..." : "Send now"}
            </button>
            <button
              className="btn-primary px-2 py-1 text-xs"
              onClick={markRecovered}
              disabled={loading !== "none"}
              type="button"
            >
              {loading === "paid" ? "Saving..." : "Mark paid"}
            </button>
          </>
        ) : null}
      </div>
      {error ? <span className="text-[11px] text-red-600">{error}</span> : null}
    </div>
  );
}
