import { InvoiceSource, Prisma, ReminderStage } from "@prisma/client";
import { parse } from "csv-parse/sync";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import { clampToSendWindow, computeInvoiceStatus, nextStageForInvoice } from "@/server/reminders/schedule";
import { markReminderForImmediateSend } from "@/server/reminders/workflows";
import { CsvInvoiceRow } from "@/server/types";
import { z } from "zod";

const csvInvoiceSchema = z.object({
  clientName: z.string().min(1),
  clientEmail: z.string().email(),
  invoiceNumber: z.string().min(1),
  amountDue: z.coerce.number().positive(),
  currency: z.string().length(3).transform((value) => value.toUpperCase()),
  dueDate: z.string(),
  issuedDate: z.string().optional(),
  paymentUrl: z.string().url(),
  externalId: z.string().optional(),
});

export async function importInvoicesFromCsv(workspaceId: string, csvText: string): Promise<{
  importedCount: number;
  skippedCount: number;
  errors: Array<{ row: number; message: string }>;
}> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: { automationSettings: true },
  });
  if (!workspace) {
    throw new AppError("NOT_FOUND", "Workspace not found", 404);
  }

  const rows = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CsvInvoiceRow[];

  let importedCount = 0;
  let skippedCount = 0;
  const errors: Array<{ row: number; message: string }> = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const parsed = csvInvoiceSchema.safeParse(row);
    if (!parsed.success) {
      skippedCount += 1;
      errors.push({
        row: index + 2,
        message: parsed.error.issues[0]?.message ?? "Invalid row",
      });
      continue;
    }

    const record = parsed.data;
    if (record.currency !== workspace.baseCurrency.toUpperCase()) {
      skippedCount += 1;
      errors.push({
        row: index + 2,
        message: `Currency ${record.currency} does not match workspace base currency ${workspace.baseCurrency}`,
      });
      continue;
    }

    const dueDate = new Date(record.dueDate);
    if (Number.isNaN(dueDate.getTime())) {
      skippedCount += 1;
      errors.push({ row: index + 2, message: "Invalid dueDate format" });
      continue;
    }

    const issuedDate = record.issuedDate ? new Date(record.issuedDate) : null;
    if (issuedDate && Number.isNaN(issuedDate.getTime())) {
      skippedCount += 1;
      errors.push({ row: index + 2, message: "Invalid issuedDate format" });
      continue;
    }

    try {
      const amountDueMinor = Math.round(record.amountDue * 100);
      const status = computeInvoiceStatus(
        {
          dueDate,
          paidAt: null,
          amountDueMinor,
          amountPaidMinor: 0,
        },
        new Date(),
      );

      const client = await prisma.client.upsert({
        where: {
          workspaceId_email: {
            workspaceId,
            email: record.clientEmail.toLowerCase(),
          },
        },
        update: {
          name: record.clientName,
        },
        create: {
          workspaceId,
          name: record.clientName,
          email: record.clientEmail.toLowerCase(),
        },
      });

      await prisma.invoice.create({
        data: {
          workspaceId,
          clientId: client.id,
          source: InvoiceSource.CSV,
          externalId: record.externalId ?? null,
          invoiceNumber: record.invoiceNumber,
          amountDueMinor,
          currency: record.currency,
          dueDate,
          issuedDate,
          paymentUrl: record.paymentUrl,
          status,
        },
      });

      importedCount += 1;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        skippedCount += 1;
        errors.push({ row: index + 2, message: "Duplicate invoice (workspaceId/source/externalId)" });
      } else {
        skippedCount += 1;
        errors.push({ row: index + 2, message: "Failed to import row" });
      }
    }
  }

  return { importedCount, skippedCount, errors };
}

export async function listInvoices(args: {
  workspaceId: string;
  status?: "PENDING" | "DUE_SOON" | "OVERDUE" | "RECOVERED";
  page: number;
  pageSize: number;
}) {
  const where: Prisma.InvoiceWhereInput = { workspaceId: args.workspaceId };
  if (args.status) {
    where.status = args.status;
  }

  const [items, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { client: true },
      orderBy: [{ dueDate: "asc" }],
      skip: (args.page - 1) * args.pageSize,
      take: args.pageSize,
    }),
    prisma.invoice.count({ where }),
  ]);

  return { items, total, page: args.page, pageSize: args.pageSize };
}

export async function getInvoiceById(workspaceId: string, invoiceId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, workspaceId },
    include: {
      client: true,
      reminders: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });
  if (!invoice) {
    throw new AppError("NOT_FOUND", "Invoice not found", 404);
  }
  return invoice;
}

export async function markInvoicePaid(workspaceId: string, invoiceId: string, paidAt?: string, amountPaidMinor?: number) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, workspaceId },
  });
  if (!invoice) {
    throw new AppError("NOT_FOUND", "Invoice not found", 404);
  }

  const effectivePaidAt = paidAt ? new Date(paidAt) : new Date();
  const wasOverdue = invoice.status === "OVERDUE";
  const nextAmountPaidMinor = amountPaidMinor ?? invoice.amountDueMinor;

  const updated = await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      amountPaidMinor: nextAmountPaidMinor,
      paidAt: effectivePaidAt,
      status: "RECOVERED",
      recoveredAt: wasOverdue ? effectivePaidAt : invoice.recoveredAt,
    },
  });

  return updated;
}

export async function sendReminderNow(workspaceId: string, invoiceId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: { automationSettings: true },
  });
  if (!workspace?.automationSettings) {
    throw new AppError("NOT_FOUND", "Automation settings missing", 404);
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, workspaceId },
    include: { reminders: true },
  });

  if (!invoice) {
    throw new AppError("NOT_FOUND", "Invoice not found", 404);
  }
  if (invoice.status === "RECOVERED") {
    throw new AppError("INVALID_STATE", "Recovered invoices cannot receive reminders", 400);
  }

  const nextStage = nextStageForInvoice({
    dueDate: invoice.dueDate,
    cadence: workspace.automationSettings,
    sentStages: invoice.reminders.map((item) => item.stage),
    now: new Date(),
  });

  const stage: ReminderStage = nextStage?.stage ?? "FINAL";
  const schedule = clampToSendWindow(new Date(), {
    timezone: workspace.timezone,
    sendWindowStart: workspace.automationSettings.sendWindowStart,
    sendWindowEnd: workspace.automationSettings.sendWindowEnd,
    weekdaysOnly: workspace.automationSettings.weekdaysOnly,
  });

  return markReminderForImmediateSend({
    workspaceId,
    invoiceId: invoice.id,
    stage,
    scheduledFor: schedule,
  });
}

