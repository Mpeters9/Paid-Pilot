"use client";

import { useEffect, useState } from "react";

type SettingsState = {
  tone: "FRIENDLY" | "FIRM" | "DIRECT";
  timezone: string;
  sendWindowStart: string;
  sendWindowEnd: string;
  weekdaysOnly: boolean;
  cadence: {
    preDueDays: number;
    overdue1Days: number;
    overdue2Days: number;
    finalDays: number;
  };
  signatureName: string;
  replyToEmail: string;
};

const defaults: SettingsState = {
  tone: "FRIENDLY",
  timezone: "America/New_York",
  sendWindowStart: "09:00",
  sendWindowEnd: "17:00",
  weekdaysOnly: true,
  cadence: {
    preDueDays: 3,
    overdue1Days: 1,
    overdue2Days: 4,
    finalDays: 10,
  },
  signatureName: "Founder",
  replyToEmail: "owner@example.com",
};

export default function SettingsPage() {
  const [form, setForm] = useState<SettingsState>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/settings/automation");
      const payload = await response.json();
      if (response.ok) {
        setForm({
          tone: payload.data.tone,
          timezone: payload.data.timezone,
          sendWindowStart: payload.data.sendWindowStart,
          sendWindowEnd: payload.data.sendWindowEnd,
          weekdaysOnly: payload.data.weekdaysOnly,
          cadence: {
            preDueDays: payload.data.preDueDays,
            overdue1Days: payload.data.overdue1Days,
            overdue2Days: payload.data.overdue2Days,
            finalDays: payload.data.finalDays,
          },
          signatureName: payload.data.signatureName,
          replyToEmail: payload.data.replyToEmail,
        });
      }
      setLoading(false);
    }
    load();
  }, []);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    const response = await fetch("/api/settings/automation", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload?.error?.message ?? "Failed to save settings");
      setSaving(false);
      return;
    }
    setMessage("Settings saved");
    setSaving(false);
  }

  if (loading) {
    return <p className="text-sm text-slate-600 fade-up">Loading settings...</p>;
  }

  return (
    <div className="space-y-6 fade-up">
      <div className="rounded-2xl border border-slate-200/60 bg-white/70 p-5">
        <p className="chip mb-3">Automation controls</p>
        <h1 className="text-3xl font-extrabold text-slate-900">Automation settings</h1>
        <p className="text-sm text-slate-600">Control cadence, tone, timezone, and send windows.</p>
      </div>
      <form className="card grid gap-4 md:grid-cols-2" onSubmit={save}>
        <label className="text-sm font-medium text-slate-800">
          Tone
          <select
            className="field"
            value={form.tone}
            onChange={(event) => setForm({ ...form, tone: event.target.value as SettingsState["tone"] })}
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
            value={form.cadence.preDueDays}
            onChange={(event) =>
              setForm({ ...form, cadence: { ...form.cadence, preDueDays: Number(event.target.value) } })
            }
          />
        </label>
        <label className="text-sm font-medium text-slate-800">
          Overdue 1 days
          <input
            type="number"
            className="field"
            value={form.cadence.overdue1Days}
            onChange={(event) =>
              setForm({ ...form, cadence: { ...form.cadence, overdue1Days: Number(event.target.value) } })
            }
          />
        </label>
        <label className="text-sm font-medium text-slate-800">
          Overdue 2 days
          <input
            type="number"
            className="field"
            value={form.cadence.overdue2Days}
            onChange={(event) =>
              setForm({ ...form, cadence: { ...form.cadence, overdue2Days: Number(event.target.value) } })
            }
          />
        </label>
        <label className="text-sm font-medium text-slate-800">
          Final days
          <input
            type="number"
            className="field"
            value={form.cadence.finalDays}
            onChange={(event) => setForm({ ...form, cadence: { ...form.cadence, finalDays: Number(event.target.value) } })}
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
            type="email"
            className="field"
            value={form.replyToEmail}
            onChange={(event) => setForm({ ...form, replyToEmail: event.target.value })}
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
        {message ? <p className="text-sm text-green-700 md:col-span-2">{message}</p> : null}
        <button disabled={saving} className="btn-primary md:col-span-2">
          {saving ? "Saving..." : "Save settings"}
        </button>
      </form>
    </div>
  );
}
