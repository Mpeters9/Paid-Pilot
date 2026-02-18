"use client";

import { useState } from "react";

export default function IntegrationsPage() {
  const [stripeKey, setStripeKey] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"none" | "connect" | "sync">("none");

  async function connectStripe() {
    setLoading("connect");
    setError(null);
    setStatus(null);
    const response = await fetch("/api/integrations/stripe/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKeyEncryptedPayload: stripeKey }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload?.error?.message ?? "Failed to connect Stripe");
    } else {
      setStatus("Stripe connected");
    }
    setLoading("none");
  }

  async function syncStripe() {
    setLoading("sync");
    setError(null);
    setStatus(null);
    const response = await fetch("/api/integrations/stripe/sync", { method: "POST" });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload?.error?.message ?? "Failed to sync Stripe");
    } else {
      setStatus(`Stripe sync complete: imported ${payload.data.imported}, skipped ${payload.data.skipped}`);
    }
    setLoading("none");
  }

  return (
    <div className="space-y-8 fade-up">
      <div className="rounded-2xl border border-slate-200/60 bg-white/70 p-5">
        <p className="chip mb-3">Connections</p>
        <h1 className="text-3xl font-extrabold text-slate-900">Integrations</h1>
        <p className="text-sm text-slate-600">Stripe is supported now. QuickBooks is staged as next milestone.</p>
      </div>

      <section className="card space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">Stripe</h2>
        <p className="text-sm text-slate-600">Paste your Stripe secret key (test mode for local development).</p>
        <input
          className="field w-full text-sm"
          value={stripeKey}
          onChange={(event) => setStripeKey(event.target.value)}
          placeholder="sk_test_..."
          type="password"
        />
        <div className="flex gap-2">
          <button
            onClick={connectStripe}
            disabled={loading !== "none" || stripeKey.length < 10}
            className="btn-primary px-4 py-2 text-sm"
          >
            {loading === "connect" ? "Connecting..." : "Connect Stripe"}
          </button>
          <button
            onClick={syncStripe}
            disabled={loading !== "none"}
            className="btn-secondary px-4 py-2 text-sm"
          >
            {loading === "sync" ? "Syncing..." : "Sync invoices"}
          </button>
        </div>
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold text-slate-900">QuickBooks</h2>
        <p className="mt-2 text-sm text-slate-600">Planned next milestone. Adapter interface is present in the codebase.</p>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {status ? <p className="text-sm text-green-700">{status}</p> : null}
    </div>
  );
}
