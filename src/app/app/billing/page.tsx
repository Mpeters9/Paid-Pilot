"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type BillingStatus = {
  status: string;
  plan: "starter" | "growth" | "scale" | null;
  stripePriceId: string | null;
  currentPeriodEnd: string | null;
  hasCustomer: boolean;
  hasSubscription: boolean;
};

function formatStatus(value: string): string {
  if (!value) return "Unknown";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export default function BillingPage() {
  const searchParams = useSearchParams();
  const checkoutState = searchParams.get("checkout");
  const checkoutSessionId = searchParams.get("session_id");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"none" | "checkout" | "portal">("none");
  const [selectedPlan, setSelectedPlan] = useState<"starter" | "growth" | "scale">("starter");
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusRefreshing, setStatusRefreshing] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [confirmingCheckout, setConfirmingCheckout] = useState(false);
  const [confirmedSessionId, setConfirmedSessionId] = useState<string | null>(null);

  const loadBillingStatus = useCallback(async (isInitialLoad = false, syncFromStripe = false) => {
    setStatusError(null);
    if (isInitialLoad) {
      setStatusLoading(true);
    } else {
      setStatusRefreshing(true);
    }

    try {
      const suffix = syncFromStripe ? "?sync=1" : "";
      const response = await fetch(`/api/billing/subscription${suffix}`, { method: "GET" });
      const payload = await response.json();
      if (!response.ok) {
        setStatusError(payload?.error?.message ?? "Failed to load current subscription status");
        return;
      }
      setBillingStatus(payload.data as BillingStatus);
    } catch {
      setStatusError("Failed to load current subscription status");
    } finally {
      if (isInitialLoad) {
        setStatusLoading(false);
      } else {
        setStatusRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadBillingStatus(true, checkoutState === "success");
  }, [checkoutState, loadBillingStatus]);

  useEffect(() => {
    if (checkoutState !== "success" || !checkoutSessionId) return;
    if (confirmedSessionId === checkoutSessionId) return;

    async function confirmAndRefresh() {
      setConfirmingCheckout(true);
      setStatusError(null);
      try {
        const response = await fetch("/api/billing/checkout-session/confirm", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sessionId: checkoutSessionId }),
        });
        const payload = await response.json();
        if (!response.ok) {
          setStatusError(payload?.error?.message ?? "Checkout succeeded, but subscription sync is still pending.");
          return;
        }
        setConfirmedSessionId(checkoutSessionId);
        await loadBillingStatus(false, true);
      } catch {
        setStatusError("Checkout succeeded, but subscription sync is still pending.");
      } finally {
        setConfirmingCheckout(false);
      }
    }

    void confirmAndRefresh();
  }, [checkoutSessionId, checkoutState, confirmedSessionId, loadBillingStatus]);

  useEffect(() => {
    if (checkoutState !== "success") return;
    if (!billingStatus || billingStatus.status === "active") return;
    if (confirmingCheckout) return;

    let pollCount = 0;
    const intervalId = window.setInterval(async () => {
      pollCount += 1;
        await loadBillingStatus(false, true);
      if (pollCount >= 5) {
        window.clearInterval(intervalId);
      }
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [billingStatus?.status, checkoutState, confirmingCheckout, loadBillingStatus]);

  async function startCheckout() {
    setError(null);
    setLoading("checkout");
    const response = await fetch("/api/billing/checkout-session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ plan: selectedPlan }),
    });
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

  const banner = useMemo(() => {
    if (checkoutState === "success") {
      if (confirmingCheckout) {
        return {
          tone: "info",
          text: "Checkout completed. Finalizing your subscription details now...",
        } as const;
      }
      if (billingStatus?.status === "active") {
        return {
          tone: "success",
          text: "Checkout completed and your subscription is now active.",
        } as const;
      }
      return {
        tone: "info",
        text: "Checkout completed. We are syncing your subscription status from Stripe. This can take a few seconds.",
      } as const;
    }
    if (checkoutState === "cancelled") {
      return {
        tone: "warning",
        text: "Checkout was cancelled. No subscription changes were made.",
      } as const;
    }
    return null;
  }, [billingStatus?.status, checkoutState, confirmingCheckout]);

  const planLabel = useMemo(() => {
    if (!billingStatus?.plan) return "Not set";
    if (billingStatus.plan === "starter") return "Starter";
    if (billingStatus.plan === "growth") return "Growth";
    return "Scale";
  }, [billingStatus?.plan]);

  return (
    <div className="space-y-6 fade-up">
      <section className="surface-hero">
        <p className="section-kicker mb-3">Subscription</p>
        <h1 className="text-4xl font-bold text-slate-900">Billing</h1>
        <p className="copy-muted mt-2 text-sm">Manage plan changes, upgrades, and subscription details through Stripe.</p>
      </section>

      {banner ? (
        <section
          className={`surface-card text-sm ${
            banner.tone === "success"
              ? "border-emerald-300/80 bg-emerald-50/80 text-emerald-900"
              : banner.tone === "warning"
                ? "border-amber-300/80 bg-amber-50/80 text-amber-900"
                : "border-blue-300/80 bg-blue-50/80 text-blue-900"
          }`}
        >
          {banner.text}
        </section>
      ) : null}

      <section className="surface-card space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Current subscription</h2>
            <p className="copy-muted text-sm">Live status from your workspace subscription record.</p>
          </div>
          <button
            className="btn-ghost"
            onClick={() => void loadBillingStatus(false, true)}
            disabled={statusLoading || statusRefreshing}
          >
            {statusLoading || statusRefreshing ? "Loading..." : "Refresh status"}
          </button>
        </div>
        {statusError ? <p className="text-sm text-[var(--error)]">{statusError}</p> : null}
        {billingStatus ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <p className="text-sm text-slate-700">
              Status: <span className="font-semibold text-slate-900">{formatStatus(billingStatus.status)}</span>
            </p>
            <p className="text-sm text-slate-700">
              Plan: <span className="font-semibold text-slate-900">{planLabel}</span>
            </p>
            <p className="text-sm text-slate-700">
              Renewal:{" "}
              <span className="font-semibold text-slate-900">
                {billingStatus.currentPeriodEnd ? new Date(billingStatus.currentPeriodEnd).toLocaleDateString() : "Not available yet"}
              </span>
            </p>
            <p className="text-sm text-slate-700">
              Customer portal:{" "}
              <span className="font-semibold text-slate-900">{billingStatus.hasCustomer ? "Available" : "Not available yet"}</span>
            </p>
          </div>
        ) : (
          <p className="copy-muted text-sm">No subscription record found yet.</p>
        )}
      </section>

      <section className="surface-card space-y-4">
        <h2 className="text-2xl font-semibold text-slate-900">Plan management</h2>
        <p className="copy-muted text-sm">Select a self-serve plan, then start checkout. Use the portal for existing subscriptions.</p>
        <label className="field-label">
          Plan
          <select
            className="field"
            value={selectedPlan}
            onChange={(event) => setSelectedPlan(event.target.value as "starter" | "growth" | "scale")}
          >
            <option value="starter">Starter ($29/mo)</option>
            <option value="growth">Growth ($79/mo)</option>
            <option value="scale">Scale ($149/mo)</option>
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <button className="btn-accent" onClick={startCheckout} disabled={loading !== "none"}>
            {loading === "checkout" ? "Redirecting..." : "Start subscription checkout"}
          </button>
          <button className="btn-secondary" onClick={openPortal} disabled={loading !== "none" || !billingStatus?.hasCustomer}>
            {loading === "portal" ? "Redirecting..." : "Open customer portal"}
          </button>
        </div>
        <p className="copy-muted text-sm">
          Need custom terms or rollout help? <a href="/contact-sales" className="font-semibold text-slate-900">Talk to sales</a>.
        </p>
        {error ? <p className="text-sm text-[var(--error)]">{error}</p> : null}
      </section>
    </div>
  );
}
