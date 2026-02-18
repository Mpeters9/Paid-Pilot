import { prisma } from "@/server/db";
import { DashboardMetrics } from "@/server/types";

export async function getDashboardMetrics(workspaceId: string): Promise<DashboardMetrics> {
  const [overdueAggregate, recoveredAggregate, sentCount, invoiceCount, recoveredCount] = await Promise.all([
    prisma.invoice.aggregate({
      where: { workspaceId, status: "OVERDUE" },
      _sum: { amountDueMinor: true, amountPaidMinor: true },
    }),
    prisma.invoice.aggregate({
      where: { workspaceId, status: "RECOVERED" },
      _sum: { amountPaidMinor: true },
    }),
    prisma.reminderEvent.count({
      where: { workspaceId, status: "SENT" },
    }),
    prisma.invoice.count({
      where: { workspaceId },
    }),
    prisma.invoice.count({
      where: { workspaceId, status: "RECOVERED" },
    }),
  ]);

  const overdueTotalMinor =
    (overdueAggregate._sum.amountDueMinor ?? 0) - (overdueAggregate._sum.amountPaidMinor ?? 0);
  const recoveredTotalMinor = recoveredAggregate._sum.amountPaidMinor ?? 0;
  const recoveryRatePercent = invoiceCount === 0 ? 0 : Number(((recoveredCount / invoiceCount) * 100).toFixed(2));

  return {
    overdueTotalMinor,
    recoveredTotalMinor,
    remindersSent: sentCount,
    recoveryRatePercent,
  };
}

