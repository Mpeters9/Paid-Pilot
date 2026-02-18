"use client";

import { useState } from "react";

type ImportResult = {
  importedCount: number;
  skippedCount: number;
  errors: Array<{ row: number; message: string }>;
};

export default function InvoiceImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Please select a CSV file");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    const data = new FormData();
    data.append("file", file);

    const response = await fetch("/api/invoices/import-csv", {
      method: "POST",
      body: data,
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload?.error?.message ?? "Import failed");
      setLoading(false);
      return;
    }
    setResult(payload.data);
    setLoading(false);
  }

  return (
    <div className="space-y-6 fade-up">
      <div className="rounded-2xl border border-slate-200/60 bg-white/70 p-5">
        <p className="chip mb-3">Fast onboarding</p>
        <h1 className="text-3xl font-extrabold text-slate-900">Import invoices from CSV</h1>
        <p className="text-sm text-slate-600">
          Required columns: clientName, clientEmail, invoiceNumber, amountDue, currency, dueDate, paymentUrl.
        </p>
      </div>

      <form onSubmit={onSubmit} className="card space-y-4">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="field block w-full p-2 text-sm"
        />
        <button type="submit" disabled={loading} className="btn-primary disabled:opacity-70">
          {loading ? "Importing..." : "Import invoices"}
        </button>
      </form>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      {result ? (
        <section className="card">
          <h2 className="text-lg font-semibold text-slate-900">Import result</h2>
          <p className="mt-2 text-sm text-slate-700">
            Imported: {result.importedCount} | Skipped: {result.skippedCount}
          </p>
          {result.errors.length > 0 ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {result.errors.map((item) => (
                <li key={`${item.row}-${item.message}`}>
                  Row {item.row}: {item.message}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
