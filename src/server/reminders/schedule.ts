import { Invoice, ReminderStage } from "@prisma/client";
import { addDays } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { AppError } from "@/server/errors";
import { ReminderScheduleResult } from "@/server/types";

type CadenceSettings = {
  preDueDays: number;
  overdue1Days: number;
  overdue2Days: number;
  finalDays: number;
};

type SendWindowSettings = {
  timezone: string;
  sendWindowStart: string;
  sendWindowEnd: string;
  weekdaysOnly: boolean;
};

export function computeInvoiceStatus(invoice: Pick<Invoice, "dueDate" | "amountDueMinor" | "amountPaidMinor" | "paidAt">, now = new Date()): "PENDING" | "DUE_SOON" | "OVERDUE" | "RECOVERED" {
  if (invoice.paidAt || invoice.amountPaidMinor >= invoice.amountDueMinor) {
    return "RECOVERED";
  }

  const dueSoonEdge = addDays(now, 3);
  if (invoice.dueDate < now) {
    return "OVERDUE";
  }
  if (invoice.dueDate <= dueSoonEdge) {
    return "DUE_SOON";
  }
  return "PENDING";
}

export function getStageSchedule(dueDate: Date, cadence: CadenceSettings): Record<ReminderStage, Date> {
  return {
    PRE_DUE: addDays(dueDate, -cadence.preDueDays),
    OVERDUE_1: addDays(dueDate, cadence.overdue1Days),
    OVERDUE_2: addDays(dueDate, cadence.overdue2Days),
    FINAL: addDays(dueDate, cadence.finalDays),
  };
}

export function nextStageForInvoice(params: {
  dueDate: Date;
  cadence: CadenceSettings;
  sentStages: ReminderStage[];
  now?: Date;
}): ReminderScheduleResult | null {
  const now = params.now ?? new Date();
  const stages = getStageSchedule(params.dueDate, params.cadence);
  const ordered: ReminderStage[] = ["PRE_DUE", "OVERDUE_1", "OVERDUE_2", "FINAL"];

  for (const stage of ordered) {
    if (params.sentStages.includes(stage)) continue;
    if (stages[stage] <= now) {
      return {
        stage,
        sendAt: stages[stage],
        reason: "due-date-offset",
      };
    }
  }
  return null;
}

function parseTimeToMinutes(value: string): number {
  const parts = value.split(":");
  if (parts.length !== 2) throw new AppError("INVALID_TIME", "Time must be HH:mm");
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    throw new AppError("INVALID_TIME", "Time must be HH:mm");
  }
  return hours * 60 + minutes;
}

function setMinutesOnDate(date: Date, minutes: number): Date {
  const result = new Date(date);
  result.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return result;
}

export function clampToSendWindow(sendAt: Date, settings: SendWindowSettings): Date {
  const startMinutes = parseTimeToMinutes(settings.sendWindowStart);
  const endMinutes = parseTimeToMinutes(settings.sendWindowEnd);
  if (startMinutes >= endMinutes) {
    throw new AppError("INVALID_SEND_WINDOW", "sendWindowStart must be earlier than sendWindowEnd");
  }

  let zoned = toZonedTime(sendAt, settings.timezone);

  while (true) {
    const day = zoned.getDay();
    const minutes = zoned.getHours() * 60 + zoned.getMinutes();
    const weekend = day === 0 || day === 6;

    if (settings.weekdaysOnly && weekend) {
      zoned.setDate(zoned.getDate() + 1);
      zoned = setMinutesOnDate(zoned, startMinutes);
      continue;
    }

    if (minutes < startMinutes) {
      zoned = setMinutesOnDate(zoned, startMinutes);
      break;
    }

    if (minutes >= endMinutes) {
      zoned.setDate(zoned.getDate() + 1);
      zoned = setMinutesOnDate(zoned, startMinutes);
      continue;
    }

    break;
  }

  return fromZonedTime(zoned, settings.timezone);
}
