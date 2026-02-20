"use client";

import Link from "next/link";

const navItems = [
  { href: "/app/dashboard", label: "Dashboard" },
  { href: "/app/invoices", label: "Invoices" },
  { href: "/app/invoices/new", label: "Add invoice" },
  { href: "/app/invoices/import", label: "Import CSV" },
  { href: "/app/settings", label: "Settings" },
  { href: "/app/integrations", label: "Integrations" },
  { href: "/app/billing", label: "Billing" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell-bg min-h-screen">
      <header className="border-b border-white/50 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link href="/app/dashboard" className="text-xl font-extrabold tracking-tight text-slate-900">
            PaidPilot
          </Link>
          <form action="/api/auth/logout" method="post">
            <button className="btn-secondary px-3 py-1.5 text-xs" type="submit">
              Log out
            </button>
          </form>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 md:grid-cols-[240px_1fr]">
        <aside className="card h-fit p-4">
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition-all hover:bg-white hover:shadow-sm"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="card min-h-[70vh]">{children}</main>
      </div>
    </div>
  );
}
