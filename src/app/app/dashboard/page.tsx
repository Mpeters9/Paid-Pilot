import Link from "next/link";
import { prisma } from "@/server/db";
import { getDashboardMetrics } from "@/server/dashboard";
import { requirePageSession } from "@/server/page-auth";
import { formatAmountMinor } from "@/server/utils";

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-extrabold text-slate-900">{value}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await requirePageSession();
  const [metrics, recentReminders, workspace] = await Promise.all([
    getDashboardMetrics(session.workspaceId),
    prisma.reminderEvent.findMany({
      where: { workspaceId: session.workspaceId },
      include: { invoice: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.workspace.findUnique({ where: { id: session.workspaceId } }),
  ]);

  const currency = workspace?.baseCurrency ?? "USD";

  return (
    <div className="space-y-6 fade-up">
      <div className="rounded-2xl border border-slate-200/60 bg-white/70 p-5">
        <p className="chip mb-3">Revenue command center</p>
        <h1 className="text-3xl font-extrabold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-600">Track outstanding invoices and recovery performance.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Overdue total" value={formatAmountMinor(metrics.overdueTotalMinor, currency)} />
        <MetricCard label="Recovered total" value={formatAmountMinor(metrics.recoveredTotalMinor, currency)} />
        <MetricCard label="Reminders sent" value={metrics.remindersSent.toString()} />
        <MetricCard label="Recovery rate" value={`${metrics.recoveryRatePercent}%`} />
      </div>

      <section className="card p-0">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold text-slate-900">Recent reminder activity</h2>
          <Link href="/app/invoices" className="btn-secondary px-3 py-1 text-xs">
            View invoices
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Scheduled</th>
              </tr>
            </thead>
            <tbody>
              {recentReminders.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{item.invoice.invoiceNumber}</td>
                  <td className="px-4 py-3">{item.stage}</td>
                  <td className="px-4 py-3">{item.status}</td>
                  <td className="px-4 py-3">{item.scheduledFor.toISOString().slice(0, 10)}</td>
                </tr>
              ))}
              {recentReminders.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={4}>
                    No reminder activity yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
