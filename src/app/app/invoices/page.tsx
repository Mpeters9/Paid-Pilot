import Link from "next/link";
import { prisma } from "@/server/db";
import { requirePageSession } from "@/server/page-auth";
import { formatAmountMinor } from "@/server/utils";
import { InvoiceActions } from "@/components/invoice-actions";

export default async function InvoicesPage() {
  const session = await requirePageSession();
  const [workspace, invoices] = await Promise.all([
    prisma.workspace.findUnique({ where: { id: session.workspaceId } }),
    prisma.invoice.findMany({
      where: { workspaceId: session.workspaceId },
      include: { client: true },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
      take: 200,
    }),
  ]);

  const currency = workspace?.baseCurrency ?? "USD";

  return (
    <div className="space-y-4 fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/60 bg-white/70 p-5">
        <div>
          <p className="chip mb-2">Pipeline control</p>
          <h1 className="text-3xl font-extrabold text-slate-900">Invoices</h1>
          <p className="text-sm text-slate-600">Pipeline: pending, due soon, overdue, recovered.</p>
        </div>
        <Link href="/app/invoices/import" className="btn-accent">
          Import CSV
        </Link>
      </div>

      <section className="card p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Due date</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last reminder</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <div>{invoice.client.name}</div>
                    <div className="text-xs text-slate-500">{invoice.client.email}</div>
                  </td>
                  <td className="px-4 py-3">{invoice.invoiceNumber}</td>
                  <td className="px-4 py-3">{invoice.dueDate.toISOString().slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    {formatAmountMinor(invoice.amountDueMinor - invoice.amountPaidMinor, currency)}
                  </td>
                  <td className="px-4 py-3">{invoice.status}</td>
                  <td className="px-4 py-3">{invoice.lastReminderAt ? invoice.lastReminderAt.toISOString().slice(0, 10) : "-"}</td>
                  <td className="px-4 py-3">
                    <InvoiceActions invoiceId={invoice.id} recovered={invoice.status === "RECOVERED"} />
                  </td>
                </tr>
              ))}
              {invoices.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={7}>
                    No invoices yet. Import CSV to get started.
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
