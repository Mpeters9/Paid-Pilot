import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen">
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12 md:py-16">
        <header className="fade-up flex items-center justify-between">
          <div className="text-2xl font-extrabold tracking-tight text-slate-900">Unpaid Invoice Autopilot</div>
          <div className="flex gap-3">
            <Link href="/login" className="btn-secondary px-4 py-2 text-sm">
              Log in
            </Link>
            <Link href="/register" className="btn-primary px-4 py-2 text-sm">
              Start free
            </Link>
          </div>
        </header>

        <section className="hero-panel fade-up fade-up-delay-1">
          <p className="chip mb-4">
            For freelancers and small agencies
          </p>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight text-slate-900 md:text-6xl">
            Stop chasing late invoices. Recover revenue on autopilot.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-700">
            Import invoices, configure cadence once, and let automated friendly-to-firm follow-ups recover revenue while
            you focus on delivery.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/register" className="btn-accent px-6 py-3 text-base">
              Create account
            </Link>
            <Link href="/pricing" className="btn-secondary px-6 py-3 text-base">
              View pricing
            </Link>
          </div>
        </section>

        <section className="fade-up fade-up-delay-2 grid gap-4 md:grid-cols-3">
          <div className="card">
            <h2 className="text-xl font-bold">Start in 5 minutes</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Upload CSV invoices instantly. Stripe sync is built in when you are ready.
            </p>
          </div>
          <div className="card">
            <h2 className="text-xl font-bold">Smart reminder engine</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Pre-due and overdue sequences with tracked payment links and retry handling.
            </p>
          </div>
          <div className="card">
            <h2 className="text-xl font-bold">Live recovery dashboard</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              See overdue total, reminders sent, recovered revenue, and your recovery rate in one view.
            </p>
          </div>
        </section>

        <section className="fade-up fade-up-delay-3 card">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Why it converts</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <p className="text-slate-700">
              Your clients get polished reminders with one-click payment links. You get paid faster without chasing.
            </p>
            <p className="text-slate-700">
              Built for solo operators: no enterprise setup, no legal fluff, no operations overhead.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
