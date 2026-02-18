export default function HowToCollectOverdueInvoicesPage() {
  return (
    <article className="mx-auto max-w-4xl px-6 py-14">
      <section className="hero-panel fade-up">
        <h1 className="text-4xl font-extrabold text-slate-900">
          How to Collect Overdue Invoices Without Damaging Client Relationships
        </h1>
        <p className="mt-4 text-slate-700">
          Set clear due dates, automate polite reminders, and track payment links so you can escalate based on behavior rather than emotion.
        </p>
      </section>
      <section className="card mt-6 fade-up fade-up-delay-1">
        <ol className="list-decimal space-y-3 pl-6 text-slate-700">
          <li>Send a friendly reminder before due date.</li>
          <li>Use structured escalation windows after due date.</li>
          <li>Include a one-click payment link in every reminder.</li>
          <li>Track outcomes and tune cadence by recovery rate.</li>
        </ol>
      </section>
    </article>
  );
}
