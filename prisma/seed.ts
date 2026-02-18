import { InvoiceStatus, InvoiceSource, ReminderSendStatus, ReminderStage } from "@prisma/client";
import { addDays, subDays } from "date-fns";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/server/auth";
import { defaultTemplates } from "../src/server/reminders/templates";

const prisma = new PrismaClient();

async function main() {
  await prisma.paymentLinkClick.deleteMany();
  await prisma.paymentLink.deleteMany();
  await prisma.reminderEvent.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.client.deleteMany();
  await prisma.reminderTemplate.deleteMany();
  await prisma.integrationConnection.deleteMany();
  await prisma.automationSettings.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await hashPassword("demo12345");
  const user = await prisma.user.create({
    data: {
      email: "demo@autopilot.local",
      passwordHash,
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      ownerUserId: user.id,
      name: "Demo Studio",
      slug: "demo-studio",
      timezone: "America/New_York",
      baseCurrency: "USD",
      onboardingCompletedAt: new Date(),
    },
  });

  await prisma.subscription.create({
    data: {
      workspaceId: workspace.id,
      status: "inactive",
    },
  });

  await prisma.automationSettings.create({
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
      signatureName: "Avery Founder",
      replyToEmail: "demo@autopilot.local",
    },
  });

  await prisma.integrationConnection.createMany({
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

  await Promise.all(
    Object.entries(defaultTemplates).map(([stage, template]) =>
      prisma.reminderTemplate.create({
        data: {
          workspaceId: workspace.id,
          stage: stage as ReminderStage,
          subjectTemplate: template.subjectTemplate,
          bodyTemplate: template.bodyTemplate,
        },
      }),
    ),
  );

  const clients = await Promise.all(
    [
      { name: "Northstar Labs", email: "finance@northstar.test" },
      { name: "Mintline Agency", email: "accounts@mintline.test" },
      { name: "Blue Tide Media", email: "billing@bluetide.test" },
    ].map((item) =>
      prisma.client.create({
        data: {
          workspaceId: workspace.id,
          name: item.name,
          email: item.email,
        },
      }),
    ),
  );

  const statuses: InvoiceStatus[] = [
    "PENDING",
    "DUE_SOON",
    "OVERDUE",
    "RECOVERED",
    "OVERDUE",
    "PENDING",
    "DUE_SOON",
    "OVERDUE",
    "RECOVERED",
    "PENDING",
    "OVERDUE",
    "RECOVERED",
  ];

  const invoices = await Promise.all(
    statuses.map((status, index) => {
      const amount = 120000 + index * 2500;
      const dueDate =
        status === "PENDING"
          ? addDays(new Date(), 7 + index)
          : status === "DUE_SOON"
            ? addDays(new Date(), 1 + (index % 2))
            : status === "OVERDUE"
              ? subDays(new Date(), 3 + index)
              : subDays(new Date(), 12 + index);

      const client = clients[index % clients.length];
      const amountPaid = status === "RECOVERED" ? amount : 0;
      const paidAt = status === "RECOVERED" ? subDays(new Date(), index % 5) : null;
      const recoveredAt = status === "RECOVERED" ? paidAt : null;

      return prisma.invoice.create({
        data: {
          workspaceId: workspace.id,
          clientId: client.id,
          source: InvoiceSource.CSV,
          externalId: `seed-${index + 1}`,
          invoiceNumber: `INV-${1000 + index}`,
          amountDueMinor: amount,
          amountPaidMinor: amountPaid,
          currency: "USD",
          dueDate,
          issuedDate: subDays(dueDate, 14),
          paymentUrl: `https://example.com/pay/INV-${1000 + index}`,
          status,
          paidAt,
          recoveredAt,
        },
      });
    }),
  );

  const overdueInvoice = invoices.find((invoice) => invoice.status === "OVERDUE");
  if (overdueInvoice) {
    const reminder = await prisma.reminderEvent.create({
      data: {
        workspaceId: workspace.id,
        invoiceId: overdueInvoice.id,
        stage: ReminderStage.OVERDUE_1,
        scheduledFor: subDays(new Date(), 1),
        sentAt: subDays(new Date(), 1),
        status: ReminderSendStatus.SENT,
        emailTo: clients[0].email,
        subject: "Reminder: invoice overdue",
        bodySnapshot: "Please pay the invoice using the link.",
        resendMessageId: "seed-message-id",
      },
    });

    const link = await prisma.paymentLink.create({
      data: {
        invoiceId: overdueInvoice.id,
        reminderEventId: reminder.id,
        token: "seed-link-token-123",
        destinationUrl: overdueInvoice.paymentUrl,
        clickCount: 2,
        lastClickedAt: subDays(new Date(), 1),
      },
    });

    await prisma.paymentLinkClick.createMany({
      data: [
        {
          paymentLinkId: link.id,
          ipHash: "seedhash1",
          userAgent: "Mozilla/5.0",
          clickedAt: subDays(new Date(), 1),
        },
        {
          paymentLinkId: link.id,
          ipHash: "seedhash2",
          userAgent: "Mozilla/5.0",
          clickedAt: new Date(),
        },
      ],
    });
  }

  console.log("Seed complete");
  console.log("Demo login: demo@autopilot.local / demo12345");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
