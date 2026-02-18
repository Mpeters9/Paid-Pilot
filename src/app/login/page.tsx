"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const router = useRouter();
  const [nextPath] = useState(() => {
    if (typeof window === "undefined") {
      return "/app/dashboard";
    }
    const params = new URLSearchParams(window.location.search);
    return params.get("next") ?? "/app/dashboard";
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload?.error?.message ?? "Failed to login");
      setLoading(false);
      return;
    }
    router.push(nextPath);
    router.refresh();
  }

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-6 py-14">
      <div className="grid gap-8 md:grid-cols-[1fr_420px]">
        <section className="hero-panel fade-up hidden md:block">
          <p className="chip mb-3">Welcome back</p>
          <h1 className="text-4xl font-extrabold leading-tight text-slate-900">Resume your recovery pipeline.</h1>
          <p className="mt-4 text-slate-700">
            Your invoice autopilot is ready. Log in to monitor overdue balances and reminder performance.
          </p>
        </section>

        <form onSubmit={onSubmit} className="card fade-up fade-up-delay-1 flex flex-col gap-4">
          <h1 className="text-3xl font-bold text-slate-900 md:text-2xl">Log in</h1>
          <p className="text-sm text-slate-600">Resume invoice automation.</p>
          <label className="text-sm font-medium text-slate-800">
          Email
          <input
            className="field"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            required
          />
        </label>
        <label className="text-sm font-medium text-slate-800">
          Password
          <input
            className="field"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            required
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary disabled:opacity-70"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>
        </form>
      </div>
    </div>
  );
}
