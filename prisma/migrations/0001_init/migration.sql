-- CreateEnum
CREATE TYPE "InvoiceSource" AS ENUM ('CSV', 'STRIPE', 'QBO');
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'DUE_SOON', 'OVERDUE', 'RECOVERED');
CREATE TYPE "ReminderStage" AS ENUM ('PRE_DUE', 'OVERDUE_1', 'OVERDUE_2', 'FINAL');
CREATE TYPE "ReminderSendStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'SKIPPED');
CREATE TYPE "Tone" AS ENUM ('FRIENDLY', 'FIRM', 'DIRECT');
CREATE TYPE "IntegrationProvider" AS ENUM ('STRIPE', 'QBO');
CREATE TYPE "IntegrationStatus" AS ENUM ('DISCONNECTED', 'CONNECTED', 'ERROR');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Workspace" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "ownerUserId" TEXT NOT NULL,
  "timezone" TEXT NOT NULL,
  "baseCurrency" TEXT NOT NULL,
  "onboardingCompletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Subscription" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "stripeCustomerId" TEXT,
  "stripeSubscriptionId" TEXT,
  "stripePriceId" TEXT,
  "status" TEXT NOT NULL,
  "currentPeriodEnd" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutomationSettings" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "tone" "Tone" NOT NULL DEFAULT 'FRIENDLY',
  "sendWindowStart" TEXT NOT NULL DEFAULT '09:00',
  "sendWindowEnd" TEXT NOT NULL DEFAULT '17:00',
  "weekdaysOnly" BOOLEAN NOT NULL DEFAULT true,
  "preDueDays" INTEGER NOT NULL DEFAULT 3,
  "overdue1Days" INTEGER NOT NULL DEFAULT 1,
  "overdue2Days" INTEGER NOT NULL DEFAULT 4,
  "finalDays" INTEGER NOT NULL DEFAULT 10,
  "signatureName" TEXT NOT NULL,
  "replyToEmail" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AutomationSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Client" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Invoice" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "source" "InvoiceSource" NOT NULL,
  "externalId" TEXT,
  "invoiceNumber" TEXT NOT NULL,
  "amountDueMinor" INTEGER NOT NULL,
  "amountPaidMinor" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "issuedDate" TIMESTAMP(3),
  "paymentUrl" TEXT NOT NULL,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
  "lastReminderAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "recoveredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReminderEvent" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "stage" "ReminderStage" NOT NULL,
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "sentAt" TIMESTAMP(3),
  "status" "ReminderSendStatus" NOT NULL DEFAULT 'QUEUED',
  "emailTo" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "bodySnapshot" TEXT NOT NULL,
  "resendMessageId" TEXT,
  "errorMessage" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReminderEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReminderTemplate" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "stage" "ReminderStage" NOT NULL,
  "subjectTemplate" TEXT NOT NULL,
  "bodyTemplate" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReminderTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentLink" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "reminderEventId" TEXT,
  "token" TEXT NOT NULL,
  "destinationUrl" TEXT NOT NULL,
  "clickCount" INTEGER NOT NULL DEFAULT 0,
  "lastClickedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentLinkClick" (
  "id" TEXT NOT NULL,
  "paymentLinkId" TEXT NOT NULL,
  "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipHash" TEXT,
  "userAgent" TEXT,
  CONSTRAINT "PaymentLinkClick_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IntegrationConnection" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "provider" "IntegrationProvider" NOT NULL,
  "status" "IntegrationStatus" NOT NULL DEFAULT 'DISCONNECTED',
  "encryptedAccessToken" TEXT,
  "encryptedRefreshToken" TEXT,
  "tokenExpiresAt" TIMESTAMP(3),
  "metadataJson" JSONB,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditEvent" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "eventType" TEXT NOT NULL,
  "payloadJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");
CREATE UNIQUE INDEX "Workspace_ownerUserId_key" ON "Workspace"("ownerUserId");
CREATE UNIQUE INDEX "Subscription_workspaceId_key" ON "Subscription"("workspaceId");
CREATE UNIQUE INDEX "AutomationSettings_workspaceId_key" ON "AutomationSettings"("workspaceId");
CREATE UNIQUE INDEX "Client_workspaceId_email_key" ON "Client"("workspaceId", "email");
CREATE UNIQUE INDEX "Invoice_workspaceId_source_externalId_key" ON "Invoice"("workspaceId", "source", "externalId");
CREATE INDEX "Invoice_workspaceId_status_dueDate_idx" ON "Invoice"("workspaceId", "status", "dueDate");
CREATE UNIQUE INDEX "ReminderEvent_invoiceId_stage_key" ON "ReminderEvent"("invoiceId", "stage");
CREATE INDEX "ReminderEvent_workspaceId_scheduledFor_status_idx" ON "ReminderEvent"("workspaceId", "scheduledFor", "status");
CREATE UNIQUE INDEX "ReminderTemplate_workspaceId_stage_key" ON "ReminderTemplate"("workspaceId", "stage");
CREATE UNIQUE INDEX "PaymentLink_token_key" ON "PaymentLink"("token");
CREATE UNIQUE INDEX "IntegrationConnection_workspaceId_provider_key" ON "IntegrationConnection"("workspaceId", "provider");

ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AutomationSettings" ADD CONSTRAINT "AutomationSettings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Client" ADD CONSTRAINT "Client_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReminderEvent" ADD CONSTRAINT "ReminderEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReminderEvent" ADD CONSTRAINT "ReminderEvent_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReminderTemplate" ADD CONSTRAINT "ReminderTemplate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentLink" ADD CONSTRAINT "PaymentLink_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentLink" ADD CONSTRAINT "PaymentLink_reminderEventId_fkey" FOREIGN KEY ("reminderEventId") REFERENCES "ReminderEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentLinkClick" ADD CONSTRAINT "PaymentLinkClick_paymentLinkId_fkey" FOREIGN KEY ("paymentLinkId") REFERENCES "PaymentLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
