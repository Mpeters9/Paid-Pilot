import { ReminderStage } from "@prisma/client";

export type ReminderCandidate = {
  invoiceId: string;
  stage: ReminderStage;
  scheduledFor: Date;
};

export type ReminderScheduleResult = {
  stage: ReminderStage;
  sendAt: Date;
  reason: "due-date-offset";
};

export type TemplateRenderContext = {
  clientName: string;
  invoiceNumber: string;
  amountDue: string;
  currency: string;
  dueDate: string;
  daysOverdue: string;
  paymentLink: string;
  businessName: string;
  signatureName: string;
};

export type DashboardMetrics = {
  overdueTotalMinor: number;
  recoveredTotalMinor: number;
  remindersSent: number;
  recoveryRatePercent: number;
};

export type CsvInvoiceRow = {
  clientName: string;
  clientEmail: string;
  invoiceNumber: string;
  amountDue: number;
  currency: string;
  dueDate: string;
  issuedDate?: string;
  paymentUrl: string;
  externalId?: string;
};

export interface StripeInvoiceAdapter {
  syncInvoices(workspaceId: string): Promise<{ imported: number; skipped: number }>;
}

export interface QuickBooksInvoiceAdapter {
  syncInvoices(workspaceId: string): Promise<{ imported: number; skipped: number }>;
}

