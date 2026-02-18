import { ReminderStage, ReminderTemplate } from "@prisma/client";
import { differenceInCalendarDays } from "date-fns";
import { nanoid } from "nanoid";
import { prisma } from "@/server/db";
import { sendTransactionalEmail } from "@/server/email";
import { AppError } from "@/server/errors";
import { getConfig } from "@/server/config";
import { logger } from "@/server/logger";
import { clampToSendWindow, computeInvoiceStatus, nextStageForInvoice } from "@/server/reminders/schedule";
import { defaultTemplates, renderTemplate, tonePrefix } from "@/server/reminders/templates";
import { formatAmountMinor } from "@/server/utils";

type ReminderSeedInput = {
  workspaceId: string;
  invoiceId: string;
  stage: ReminderStage;
  scheduledFor: Date;
};

async function getTemplate(workspaceId: string, stage: ReminderStage): Promise<ReminderTemplate | null> {
  return prisma.reminderTemplate.findUnique({
    where: {
      workspaceId_stage: {
        workspaceId,
        stage,
      },
    },
  });
}

async function ensureReminderTemplateDefaults(workspaceId: string): Promise<void> {
  const entries = Object.entries(defaultTemplates) as Array<[ReminderStage, { subjectTemplate: string; bodyTemplate: string }]>;

  await Promise.all(
    entries.map(([stage, template]) =>
      prisma.reminderTemplate.upsert({
        where: {
          workspaceId_stage: {
            workspaceId,
            stage,
          },
        },
        update: {},
        create: {
          workspaceId,
          stage,
          subjectTemplate: template.subjectTemplate,
          bodyTemplate: template.bodyTemplate,
        },
      }),
    ),
  );
}

export async function markReminderForImmediateSend(input: ReminderSeedInput) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: input.invoiceId },
    include: { client: true },
  });

  if (!invoice) {
    throw new AppError("NOT_FOUND", "Invoice not found", 404);
  }

  const existing = await prisma.reminderEvent.findUnique({
    where: {
      invoiceId_stage: {
        invoiceId: input.invoiceId,
        stage: input.stage,
      },
    },
  });

  if (existing) {
    return existing;
  }

  await ensureReminderTemplateDefaults(input.workspaceId);
  const template = (await getTemplate(input.workspaceId, input.stage)) ?? {
    subjectTemplate: defaultTemplates[input.stage].subjectTemplate,
    bodyTemplate: defaultTemplates[input.stage].bodyTemplate,
  };

  const reminder = await prisma.reminderEvent.create({
    data: {
      workspaceId: input.workspaceId,
      invoiceId: input.invoiceId,
      stage: input.stage,
      scheduledFor: input.scheduledFor,
      status: "QUEUED",
      emailTo: invoice.client.email,
      subject: template.subjectTemplate,
      bodySnapshot: template.bodyTemplate,
    },
  });

  return reminder;
}

export async function runReminderScan(workspaceId?: string): Promise<{ queued: number }> {
  const where = workspaceId ? { id: workspaceId } : {};
  const workspaces = await prisma.workspace.findMany({
    where,
    include: {
      automationSettings: true,
      invoices: {
        where: {
          status: { not: "RECOVERED" },
        },
        include: {
          reminders: true,
          client: true,
        },
      },
    },
  });

  let queued = 0;

  for (const workspace of workspaces) {
    if (!workspace.automationSettings) continue;

    for (const invoice of workspace.invoices) {
      const nextStatus = computeInvoiceStatus(invoice);
      if (invoice.status !== nextStatus) {
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: nextStatus },
        });
      }

      if (nextStatus === "RECOVERED") continue;

      const nextReminder = nextStageForInvoice({
        dueDate: invoice.dueDate,
        cadence: workspace.automationSettings,
        sentStages: invoice.reminders.map((item) => item.stage),
        now: new Date(),
      });

      if (!nextReminder) continue;

      const scheduledFor = clampToSendWindow(nextReminder.sendAt, {
        timezone: workspace.timezone,
        sendWindowStart: workspace.automationSettings.sendWindowStart,
        sendWindowEnd: workspace.automationSettings.sendWindowEnd,
        weekdaysOnly: workspace.automationSettings.weekdaysOnly,
      });

      try {
        await markReminderForImmediateSend({
          workspaceId: workspace.id,
          invoiceId: invoice.id,
          stage: nextReminder.stage,
          scheduledFor,
        });
        queued += 1;
      } catch (error) {
        logger.error({ error, invoiceId: invoice.id }, "Failed queuing reminder");
      }
    }
  }

  return { queued };
}

export async function sendDueReminders(now = new Date()): Promise<{ sent: number; failed: number; skipped: number }> {
  const dueEvents = await prisma.reminderEvent.findMany({
    where: {
      status: "QUEUED",
      scheduledFor: {
        lte: now,
      },
    },
    include: {
      invoice: {
        include: {
          client: true,
          workspace: {
            include: {
              automationSettings: true,
            },
          },
        },
      },
    },
    orderBy: {
      scheduledFor: "asc",
    },
    take: 100,
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const event of dueEvents) {
    try {
      const workspace = event.invoice.workspace;
      if (!workspace.automationSettings) {
        skipped += 1;
        await prisma.reminderEvent.update({
          where: { id: event.id },
          data: { status: "SKIPPED", errorMessage: "Automation settings not configured" },
        });
        continue;
      }

      const template = (await getTemplate(workspace.id, event.stage)) ?? {
        subjectTemplate: event.subject,
        bodyTemplate: event.bodySnapshot,
      };

      const link = await prisma.paymentLink.create({
        data: {
          invoiceId: event.invoiceId,
          reminderEventId: event.id,
          token: nanoid(24),
          destinationUrl: event.invoice.paymentUrl,
        },
      });

      const config = getConfig();
      const paymentLink = `${config.APP_URL}/r/${link.token}`;
      const nowDate = new Date();
      const context = {
        clientName: event.invoice.client.name,
        invoiceNumber: event.invoice.invoiceNumber,
        amountDue: formatAmountMinor(event.invoice.amountDueMinor - event.invoice.amountPaidMinor, event.invoice.currency),
        currency: event.invoice.currency,
        dueDate: event.invoice.dueDate.toISOString().slice(0, 10),
        daysOverdue: Math.max(0, differenceInCalendarDays(nowDate, event.invoice.dueDate)).toString(),
        paymentLink,
        businessName: workspace.name,
        signatureName: workspace.automationSettings.signatureName,
      };

      const subject = `${tonePrefix(workspace.automationSettings.tone)} ${renderTemplate(template.subjectTemplate, context)}`;
      const body = renderTemplate(template.bodyTemplate, context);
      const result = await sendTransactionalEmail({
        to: event.emailTo,
        subject,
        text: body,
        replyTo: workspace.automationSettings.replyToEmail,
      });

      await prisma.$transaction([
        prisma.reminderEvent.update({
          where: { id: event.id },
          data: {
            status: "SENT",
            sentAt: nowDate,
            subject,
            bodySnapshot: body,
            resendMessageId: result.messageId ?? null,
            errorMessage: null,
          },
        }),
        prisma.invoice.update({
          where: { id: event.invoiceId },
          data: { lastReminderAt: nowDate },
        }),
      ]);

      sent += 1;
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : "Unknown failure";
      await prisma.$transaction([
        prisma.reminderEvent.update({
          where: { id: event.id },
          data: {
            status: "FAILED",
            attempts: { increment: 1 },
            errorMessage: message,
          },
        }),
        prisma.auditEvent.create({
          data: {
            workspaceId: event.workspaceId,
            eventType: "REMINDER_SEND_FAILED",
            payloadJson: {
              reminderEventId: event.id,
              error: message,
            },
          },
        }),
      ]);
    }
  }

  return { sent, failed, skipped };
}

function getRetryDelayMinutes(attempts: number): number {
  // 2, 4, 8, 16, 32 minute backoff capped at 60 minutes.
  return Math.min(60, 2 ** Math.max(1, attempts));
}

export async function requeueFailedReminders(now = new Date()): Promise<{ requeued: number; exhausted: number }> {
  const candidates = await prisma.reminderEvent.findMany({
    where: {
      status: "FAILED",
    },
    orderBy: {
      createdAt: "asc",
    },
    take: 100,
  });

  let requeued = 0;
  let exhausted = 0;

  for (const reminder of candidates) {
    if (reminder.attempts >= 5) {
      exhausted += 1;
      continue;
    }

    const delayMinutes = getRetryDelayMinutes(reminder.attempts);
    const scheduledFor = new Date(now.getTime() + delayMinutes * 60 * 1000);
    await prisma.reminderEvent.update({
      where: { id: reminder.id },
      data: {
        status: "QUEUED",
        scheduledFor,
      },
    });
    requeued += 1;
  }

  return { requeued, exhausted };
}
