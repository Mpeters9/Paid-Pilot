"use client";

import { useState } from "react";

export default function BillingPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"none" | "checkout" | "portal">("none");

  async function startCheckout() {
    setError(null);
    setLoading("checkout");
    const response = await fetch("/api/billing/checkout-session", { method: "POST" });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload?.error?.message ?? "Failed to create checkout session");
      setLoading("none");
      return;
    }
    window.location.href = payload.data.url;
  }

  async function openPortal() {
    setError(null);
    setLoading("portal");
    const response = await fetch("/api/billing/portal-session", { method: "POST" });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload?.error?.message ?? "Failed to open customer portal");
      setLoading("none");
      return;
    }
    window.location.href = payload.data.url;
  }

  return (
    <div className="space-y-6 fade-up">
      <div className="rounded-2xl border border-slate-200/60 bg-white/70 p-5">
        <p className="chip mb-3">Subscription</p>
        <h1 className="text-3xl font-extrabold text-slate-900">Billing</h1>
        <p className="text-sm text-slate-600">Manage your SaaS subscription with Stripe Checkout and Portal.</p>
      </div>
      <section className="card space-y-3">
        <button
          className="btn-accent"
          onClick={startCheckout}
          disabled={loading !== "none"}
        >
          {loading === "checkout" ? "Redirecting..." : "Start subscription checkout"}
        </button>
        <button
          className="btn-secondary"
          onClick={openPortal}
          disabled={loading !== "none"}
        >
          {loading === "portal" ? "Redirecting..." : "Open customer portal"}
        </button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </section>
    </div>
  );
}
