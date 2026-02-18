import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import { defaultTemplates } from "@/server/reminders/templates";

export async function getAutomationSettings(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      automationSettings: true,
      templates: {
        orderBy: { stage: "asc" },
      },
    },
  });

  if (!workspace || !workspace.automationSettings) {
    throw new AppError("NOT_FOUND", "Automation settings not found", 404);
  }

  return {
    timezone: workspace.timezone,
    ...workspace.automationSettings,
    templates: workspace.templates.length > 0 ? workspace.templates : Object.entries(defaultTemplates).map(([stage, value]) => ({
      id: `${workspace.id}-${stage}`,
      workspaceId: workspace.id,
      stage,
      subjectTemplate: value.subjectTemplate,
      bodyTemplate: value.bodyTemplate,
      updatedAt: new Date(0),
    })),
  };
}

export async function updateAutomationSettings(
  workspaceId: string,
  payload: {
    tone: "FRIENDLY" | "FIRM" | "DIRECT";
    timezone: string;
    sendWindowStart: string;
    sendWindowEnd: string;
    weekdaysOnly: boolean;
    cadence: {
      preDueDays: number;
      overdue1Days: number;
      overdue2Days: number;
      finalDays: number;
    };
    signatureName: string;
    replyToEmail: string;
  },
) {
  const existing = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: { automationSettings: true },
  });
  if (!existing) {
    throw new AppError("NOT_FOUND", "Workspace not found", 404);
  }

  const settings = await prisma.automationSettings.upsert({
    where: {
      workspaceId,
    },
    update: {
      tone: payload.tone,
      sendWindowStart: payload.sendWindowStart,
      sendWindowEnd: payload.sendWindowEnd,
      weekdaysOnly: payload.weekdaysOnly,
      preDueDays: payload.cadence.preDueDays,
      overdue1Days: payload.cadence.overdue1Days,
      overdue2Days: payload.cadence.overdue2Days,
      finalDays: payload.cadence.finalDays,
      signatureName: payload.signatureName,
      replyToEmail: payload.replyToEmail,
    },
    create: {
      workspaceId,
      tone: payload.tone,
      sendWindowStart: payload.sendWindowStart,
      sendWindowEnd: payload.sendWindowEnd,
      weekdaysOnly: payload.weekdaysOnly,
      preDueDays: payload.cadence.preDueDays,
      overdue1Days: payload.cadence.overdue1Days,
      overdue2Days: payload.cadence.overdue2Days,
      finalDays: payload.cadence.finalDays,
      signatureName: payload.signatureName,
      replyToEmail: payload.replyToEmail,
    },
  });

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { timezone: payload.timezone, onboardingCompletedAt: new Date() },
  });

  return settings;
}

