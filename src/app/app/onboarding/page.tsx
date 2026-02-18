"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    tone: "FRIENDLY",
    timezone: "America/New_York",
    sendWindowStart: "09:00",
    sendWindowEnd: "17:00",
    weekdaysOnly: true,
    preDueDays: 3,
    overdue1Days: 1,
    overdue2Days: 4,
    finalDays: 10,
    signatureName: "Founder",
    replyToEmail: "owner@example.com",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function completeOnboarding(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const response = await fetch("/api/settings/automation", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tone: form.tone,
        timezone: form.timezone,
        sendWindowStart: form.sendWindowStart,
        sendWindowEnd: form.sendWindowEnd,
        weekdaysOnly: form.weekdaysOnly,
        cadence: {
          preDueDays: Number(form.preDueDays),
          overdue1Days: Number(form.overdue1Days),
          overdue2Days: Number(form.overdue2Days),
          finalDays: Number(form.finalDays),
        },
        signatureName: form.signatureName,
        replyToEmail: form.replyToEmail,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload?.error?.message ?? "Failed to save onboarding settings");
      setSaving(false);
      return;
    }
    router.push("/app/dashboard");
    router.refresh();
  }

  return (
    <div className="space-y-6 fade-up">
      <div className="rounded-2xl border border-slate-200/60 bg-white/70 p-5">
        <p className="chip mb-3">Step 1 of 1</p>
        <h1 className="text-3xl font-extrabold text-slate-900">Onboarding</h1>
        <p className="text-sm text-slate-600">Set your reminder cadence and sending rules.</p>
      </div>

      <form className="card grid gap-4 md:grid-cols-2" onSubmit={completeOnboarding}>
        <label className="text-sm font-medium text-slate-800">
          Tone
          <select
            className="field"
            value={form.tone}
            onChange={(event) => setForm({ ...form, tone: event.target.value })}
          >
            <option value="FRIENDLY">Friendly</option>
            <option value="FIRM">Firm</option>
            <option value="DIRECT">Direct</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-800">
          Timezone
          <input
            className="field"
            value={form.timezone}
            onChange={(event) => setForm({ ...form, timezone: event.target.value })}
          />
        </label>
        <label className="text-sm font-medium text-slate-800">
          Send window start
          <input
            type="time"
            className="field"
            value={form.sendWindowStart}
            onChange={(event) => setForm({ ...form, sendWindowStart: event.target.value })}
          />
        </label>
        <label className="text-sm font-medium text-slate-800">
          Send window end
          <input
            type="time"
            className="field"
            value={form.sendWindowEnd}
            onChange={(event) => setForm({ ...form, sendWindowEnd: event.target.value })}
          />
        </label>
        <label className="text-sm font-medium text-slate-800">
          Pre-due days
          <input
            type="number"
            className="field"
            value={form.preDueDays}
            onChange={(event) => setForm({ ...form, preDueDays: Number(event.target.value) })}
          />
        </label>
        <label className="text-sm font-medium text-slate-800">
          Overdue day 1
          <input
            type="number"
            className="field"
            value={form.overdue1Days}
            onChange={(event) => setForm({ ...form, overdue1Days: Number(event.target.value) })}
          />
        </label>
        <label className="text-sm font-medium text-slate-800">
          Overdue day 2
          <input
            type="number"
            className="field"
            value={form.overdue2Days}
            onChange={(event) => setForm({ ...form, overdue2Days: Number(event.target.value) })}
          />
        </label>
        <label className="text-sm font-medium text-slate-800">
          Final reminder day
          <input
            type="number"
            className="field"
            value={form.finalDays}
            onChange={(event) => setForm({ ...form, finalDays: Number(event.target.value) })}
          />
        </label>
        <label className="text-sm font-medium text-slate-800">
          Signature name
          <input
            className="field"
            value={form.signatureName}
            onChange={(event) => setForm({ ...form, signatureName: event.target.value })}
          />
        </label>
        <label className="text-sm font-medium text-slate-800">
          Reply-to email
          <input
            className="field"
            value={form.replyToEmail}
            onChange={(event) => setForm({ ...form, replyToEmail: event.target.value })}
            type="email"
          />
        </label>
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input
            type="checkbox"
            checked={form.weekdaysOnly}
            onChange={(event) => setForm({ ...form, weekdaysOnly: event.target.checked })}
          />
          Send weekdays only
        </label>
        {error ? <p className="text-sm text-red-600 md:col-span-2">{error}</p> : null}
        <button
          type="submit"
          disabled={saving}
          className="btn-primary md:col-span-2"
        >
          {saving ? "Saving..." : "Complete onboarding"}
        </button>
      </form>
    </div>
  );
}
