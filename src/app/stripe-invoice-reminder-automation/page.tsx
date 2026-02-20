export const dynamic = "force-dynamic";

export default function StripeInvoiceReminderAutomationPage() {
  return (
    <article className="mx-auto max-w-4xl px-6 py-14">
      <section className="hero-panel fade-up">
        <h1 className="text-4xl font-extrabold text-slate-900">Stripe Invoice Reminder Automation for Freelancers</h1>
        <p className="mt-4 text-slate-700">
          Connect Stripe, sync open invoices, and automatically run pre-due and overdue reminders with tracked payment-link clicks.
        </p>
      </section>
      <section className="card mt-6 fade-up fade-up-delay-1">
        <h2 className="text-2xl font-semibold">What you get</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-700">
          <li>Sync unpaid Stripe invoices in one click</li>
          <li>Reminder sequence with editable templates</li>
          <li>Recovery metrics on a single dashboard</li>
        </ul>
      </section>
    </article>
  );
}
