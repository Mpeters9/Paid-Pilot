export const dynamic = "force-dynamic";

export default function InvoiceReminderTemplatesPage() {
  return (
    <article className="mx-auto max-w-4xl px-6 py-14">
      <section className="hero-panel fade-up">
        <h1 className="text-4xl font-extrabold text-slate-900">Invoice Reminder Email Templates (Free + Proven)</h1>
        <p className="mt-4 text-slate-700">
          Use these ready-to-send templates to follow up before and after invoice due dates while keeping client relationships healthy.
        </p>
      </section>
      <section className="card mt-6 fade-up fade-up-delay-1">
        <h2 className="text-2xl font-semibold">1) Friendly pre-due reminder</h2>
        <p className="mt-2 text-slate-700">
          Just a quick reminder that invoice INV-1002 is due on Friday. Payment link: ...
        </p>
        <h2 className="mt-8 text-2xl font-semibold">2) Overdue escalation</h2>
        <p className="mt-2 text-slate-700">
          Following up: invoice INV-1002 is now 4 days overdue. Outstanding amount: ...
        </p>
        <h2 className="mt-8 text-2xl font-semibold">3) Final non-legal reminder</h2>
        <p className="mt-2 text-slate-700">
          This is a final non-legal reminder that invoice INV-1002 remains unpaid...
        </p>
      </section>
    </article>
  );
}
