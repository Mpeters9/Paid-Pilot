export default function PricingPage() {
  return (
    <div className="mx-auto min-h-screen max-w-6xl px-6 py-14">
      <div className="hero-panel fade-up">
        <h1 className="text-4xl font-extrabold text-slate-900 md:text-5xl">Pricing built for solo operators</h1>
        <p className="mt-3 text-slate-700">Stop chasing invoices. Recover revenue automatically.</p>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="card fade-up fade-up-delay-1">
          <p className="chip">Most freelancers</p>
          <h2 className="text-2xl font-bold">Starter</h2>
          <p className="mt-2 text-4xl font-extrabold">$29<span className="text-base font-medium text-slate-500">/mo</span></p>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            <li>Up to 100 active invoices</li>
            <li>CSV import + Stripe sync</li>
            <li>Automated reminder sequences</li>
          </ul>
          <a href="/register" className="btn-primary mt-6">
            Choose Starter
          </a>
        </div>
        <div className="card fade-up fade-up-delay-2">
          <p className="chip">Small agencies</p>
          <h2 className="text-2xl font-bold">Growth</h2>
          <p className="mt-2 text-4xl font-extrabold">$79<span className="text-base font-medium text-slate-500">/mo</span></p>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            <li>Up to 500 active invoices</li>
            <li>Priority support</li>
            <li>Advanced reporting</li>
          </ul>
          <a href="/register" className="btn-accent mt-6">
            Choose Growth
          </a>
        </div>
      </div>
    </div>
  );
}
