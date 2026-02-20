"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ApiErrorPayload = {
  error?: {
    message?: string;
  };
};

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
    workspaceName: "",
    timezone: "America/New_York",
    baseCurrency: "USD",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function tryParseJson(response: Response): Promise<ApiErrorPayload | null> {
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return null;
    }
    try {
      return (await response.json()) as ApiErrorPayload;
    } catch {
      return null;
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await tryParseJson(response);

      if (!response.ok) {
        const fallback = response.status === 503 ? "Database unavailable. Please try again in a minute." : "Failed to register";
        setError(payload?.error?.message ?? fallback);
        return;
      }

      router.push("/app/onboarding");
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-6 py-12">
      <div className="grid gap-8 md:grid-cols-[1fr_520px]">
        <section className="hero-panel fade-up hidden md:block">
          <p className="chip mb-3">Set-and-forget collections</p>
          <h1 className="text-5xl font-extrabold leading-tight text-slate-900">Launch PaidPilot in minutes.</h1>
          <p className="mt-4 text-slate-700">
            Automate reminders, track payment-link clicks, and recover overdue revenue without manual chasing.
          </p>
        </section>

        <form onSubmit={onSubmit} className="card fade-up fade-up-delay-1 grid gap-4">
          <h1 className="text-3xl font-bold text-slate-900">Create your account</h1>
          <p className="text-sm text-slate-600">Set up invoice reminders in under 5 minutes.</p>
          <label className="text-sm font-medium text-slate-800">
            Business name
            <input
              className="field"
              value={form.workspaceName}
              onChange={(event) => setForm({ ...form, workspaceName: event.target.value })}
              required
            />
          </label>
          <label className="text-sm font-medium text-slate-800">
            Email
            <input
              className="field"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              type="email"
              required
            />
          </label>
          <label className="text-sm font-medium text-slate-800">
            Password
            <input
              className="field"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              type="password"
              required
              minLength={8}
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-800">
              Timezone
              <input
                className="field"
                value={form.timezone}
                onChange={(event) => setForm({ ...form, timezone: event.target.value })}
                required
              />
            </label>
            <label className="text-sm font-medium text-slate-800">
              Base currency
              <input
                className="field"
                value={form.baseCurrency}
                onChange={(event) => setForm({ ...form, baseCurrency: event.target.value.toUpperCase() })}
                required
                maxLength={3}
              />
            </label>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button type="submit" disabled={loading} className="btn-accent disabled:opacity-70">
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
