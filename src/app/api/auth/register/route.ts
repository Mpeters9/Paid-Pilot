import { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { hashPassword, setSessionCookie } from "@/server/auth";
import { AppError } from "@/server/errors";
import { ok, withErrorHandling } from "@/server/http";
import { defaultTemplates } from "@/server/reminders/templates";
import { toSlug } from "@/server/utils";
import { registerSchema } from "@/server/validation";

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const body = registerSchema.parse(await request.json());

    const existing = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
    });
    if (existing) {
      throw new AppError("EMAIL_IN_USE", "Email already exists", 409);
    }

    const passwordHash = await hashPassword(body.password);
    const slugBase = toSlug(body.workspaceName);

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: body.email.toLowerCase(),
          passwordHash,
        },
      });

      const workspace = await tx.workspace.create({
        data: {
          ownerUserId: user.id,
          name: body.workspaceName,
          slug: `${slugBase}-${user.id.slice(0, 6)}`,
          timezone: body.timezone,
          baseCurrency: body.baseCurrency.toUpperCase(),
        },
      });

      await tx.automationSettings.create({
        data: {
          workspaceId: workspace.id,
          tone: "FRIENDLY",
          sendWindowStart: "09:00",
          sendWindowEnd: "17:00",
          weekdaysOnly: true,
          preDueDays: 3,
          overdue1Days: 1,
          overdue2Days: 4,
          finalDays: 10,
          signatureName: body.workspaceName,
          replyToEmail: body.email.toLowerCase(),
        },
      });

      await tx.subscription.create({
        data: {
          workspaceId: workspace.id,
          status: "inactive",
        },
      });

      await Promise.all(
        Object.entries(defaultTemplates).map(([stage, template]) =>
          tx.reminderTemplate.create({
            data: {
              workspaceId: workspace.id,
              stage: stage as "PRE_DUE" | "OVERDUE_1" | "OVERDUE_2" | "FINAL",
              subjectTemplate: template.subjectTemplate,
              bodyTemplate: template.bodyTemplate,
            },
          }),
        ),
      );

      await tx.integrationConnection.createMany({
        data: [
          {
            workspaceId: workspace.id,
            provider: "STRIPE",
            status: "DISCONNECTED",
          },
          {
            workspaceId: workspace.id,
            provider: "QBO",
            status: "DISCONNECTED",
          },
        ],
      });

      return { user, workspace };
    });

    const response = ok({
      user: {
        id: created.user.id,
        email: created.user.email,
      },
      workspace: {
        id: created.workspace.id,
        name: created.workspace.name,
        timezone: created.workspace.timezone,
        baseCurrency: created.workspace.baseCurrency,
      },
    });

    setSessionCookie(response, {
      userId: created.user.id,
      workspaceId: created.workspace.id,
      email: created.user.email,
    });

    return response;
  });
}

