import { ReminderStage, Tone } from "@prisma/client";
import { AppError } from "@/server/errors";
import { TemplateRenderContext } from "@/server/types";

const allowedKeys: Array<keyof TemplateRenderContext> = [
  "clientName",
  "invoiceNumber",
  "amountDue",
  "currency",
  "dueDate",
  "daysOverdue",
  "paymentLink",
  "businessName",
  "signatureName",
];

export const defaultTemplates: Record<ReminderStage, { subjectTemplate: string; bodyTemplate: string }> = {
  PRE_DUE: {
    subjectTemplate: "Friendly reminder: invoice {{invoiceNumber}} is due on {{dueDate}}",
    bodyTemplate:
      "Hi {{clientName}},\n\nJust a quick reminder that invoice {{invoiceNumber}} for {{amountDue}} ({{currency}}) is due on {{dueDate}}.\n\nYou can pay securely here: {{paymentLink}}\n\nThank you,\n{{signatureName}}\n{{businessName}}",
  },
  OVERDUE_1: {
    subjectTemplate: "Invoice {{invoiceNumber}} is now overdue",
    bodyTemplate:
      "Hi {{clientName}},\n\nInvoice {{invoiceNumber}} is now {{daysOverdue}} day(s) overdue. The outstanding amount is {{amountDue}}.\n\nPayment link: {{paymentLink}}\n\nThanks for taking care of this,\n{{signatureName}}\n{{businessName}}",
  },
  OVERDUE_2: {
    subjectTemplate: "Second reminder: invoice {{invoiceNumber}} remains unpaid",
    bodyTemplate:
      "Hi {{clientName}},\n\nFollowing up again on invoice {{invoiceNumber}}. It is currently {{daysOverdue}} day(s) overdue, with {{amountDue}} still outstanding.\n\nPay here: {{paymentLink}}\n\nPlease reply if you need anything clarified.\n{{signatureName}}\n{{businessName}}",
  },
  FINAL: {
    subjectTemplate: "Final reminder for invoice {{invoiceNumber}}",
    bodyTemplate:
      "Hi {{clientName}},\n\nThis is a final non-legal reminder that invoice {{invoiceNumber}} remains unpaid ({{daysOverdue}} day(s) overdue, {{amountDue}} outstanding).\n\nPlease complete payment here: {{paymentLink}}\n\nIf payment has already been processed, please ignore this message.\n{{signatureName}}\n{{businessName}}",
  },
};

export function tonePrefix(tone: Tone): string {
  if (tone === "DIRECT") return "[Action Required]";
  if (tone === "FIRM") return "[Reminder]";
  return "[Friendly Reminder]";
}

export function renderTemplate(template: string, context: TemplateRenderContext): string {
  const unknownVariables = Array.from(template.matchAll(/\{\{(\w+)\}\}/g))
    .map((match) => match[1] as keyof TemplateRenderContext)
    .filter((variable) => !allowedKeys.includes(variable));

  if (unknownVariables.length > 0) {
    throw new AppError("UNKNOWN_TEMPLATE_VARIABLE", "Template includes unsupported variables", 400, {
      unknownVariables,
    });
  }

  return template.replace(/\{\{(\w+)\}\}/g, (_, key: keyof TemplateRenderContext) => context[key] ?? "");
}

