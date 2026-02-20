"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type NewInvoiceFormProps = {
  baseCurrency: string;
};

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function formatDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function NewInvoiceForm({ baseCurrency }: NewInvoiceFormProps) {
  const router = useRouter();
  const defaultDueDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return formatDateInput(date);
  }, []);

  const [form, setForm] = useState({
    clientName: "",
    clientEmail: "",
    invoiceNumber: "",
    amountDue: "",
    dueDate: defaultDueDate,
    issuedDate: "",
    paymentUrl: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const amountDue = Number(form.amountDue);
    if (!Number.isFinite(amountDue) || amountDue <= 0) {
      setError("Amount due must be greater than 0.");
      return;
    }
    if (!isoDatePattern.test(form.dueDate)) {
      setError("Due date must be in YYYY-MM-DD format.");
      return;
    }
    if (form.issuedDate && !isoDatePattern.test(form.issuedDate)) {
      setError("Issued date must be in YYYY-MM-DD format.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amountDue,
          currency: baseCurrency.toUpperCase(),
          issuedDate: form.issuedDate || undefined,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error?.message ?? "Failed to create invoice");
        return;
      }

      router.push("/app/invoices");
      router.refresh();
    } catch {
      setError("Failed to create invoice");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card grid gap-4">
      <h1 className="text-3xl font-extrabold text-slate-900">Add invoice manually</h1>
      <p className="text-sm text-slate-600">Create an invoice without CSV import.</p>

      <label className="text-sm font-medium text-slate-800">
        Client name
        <input
          className="field"
          value={form.clientName}
          onChange={(event) => setForm((prev) => ({ ...prev, clientName: event.target.value }))}
          required
        />
      </label>

      <label className="text-sm font-medium text-slate-800">
        Client email
        <input
          className="field"
          type="email"
          value={form.clientEmail}
          onChange={(event) => setForm((prev) => ({ ...prev, clientEmail: event.target.value }))}
          required
        />
      </label>

      <label className="text-sm font-medium text-slate-800">
        Invoice number
        <input
          className="field"
          value={form.invoiceNumber}
          onChange={(event) => setForm((prev) => ({ ...prev, invoiceNumber: event.target.value }))}
          required
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-800">
          Amount due ({baseCurrency})
          <input
            className="field"
            type="number"
            min="0.01"
            step="0.01"
            value={form.amountDue}
            onChange={(event) => setForm((prev) => ({ ...prev, amountDue: event.target.value }))}
            required
          />
        </label>
        <label className="text-sm font-medium text-slate-800">
          Due date
          <input
            className="field"
            type="date"
            value={form.dueDate}
            onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
            required
          />
        </label>
      </div>

      <label className="text-sm font-medium text-slate-800">
        Issued date (optional)
        <input
          className="field"
          type="date"
          value={form.issuedDate}
          onChange={(event) => setForm((prev) => ({ ...prev, issuedDate: event.target.value }))}
        />
      </label>

      <label className="text-sm font-medium text-slate-800">
        Payment URL
        <input
          className="field"
          type="url"
          placeholder="https://..."
          value={form.paymentUrl}
          onChange={(event) => setForm((prev) => ({ ...prev, paymentUrl: event.target.value }))}
          required
        />
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button type="submit" disabled={loading} className="btn-primary disabled:opacity-70">
        {loading ? "Creating..." : "Create invoice"}
      </button>
    </form>
  );
}
