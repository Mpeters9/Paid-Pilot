import { Tone } from "@prisma/client";
import { z } from "zod";

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  workspaceName: z.string().min(2),
  timezone: z.string().min(2),
  baseCurrency: z.string().length(3).transform((value) => value.toUpperCase()),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const automationSettingsSchema = z.object({
  tone: z.nativeEnum(Tone),
  timezone: z.string().min(2),
  sendWindowStart: z.string().regex(timePattern),
  sendWindowEnd: z.string().regex(timePattern),
  weekdaysOnly: z.boolean(),
  cadence: z.object({
    preDueDays: z.number().int().nonnegative(),
    overdue1Days: z.number().int().nonnegative(),
    overdue2Days: z.number().int().nonnegative(),
    finalDays: z.number().int().nonnegative(),
  }),
  signatureName: z.string().min(2),
  replyToEmail: z.string().email(),
});

export const markPaidSchema = z.object({
  paidAt: z.string().datetime().optional(),
  amountPaidMinor: z.number().int().nonnegative().optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["PENDING", "DUE_SOON", "OVERDUE", "RECOVERED"]).optional(),
});

export const createInvoiceSchema = z.object({
  clientName: z.string().min(1),
  clientEmail: z.string().email(),
  invoiceNumber: z.string().min(1),
  amountDue: z.coerce.number().positive(),
  currency: z.string().length(3).transform((value) => value.toUpperCase()),
  dueDate: z.string().regex(isoDatePattern, "dueDate must be YYYY-MM-DD"),
  issuedDate: z.string().regex(isoDatePattern, "issuedDate must be YYYY-MM-DD").optional(),
  paymentUrl: z.string().url(),
});
