import { describe, expect, it } from "vitest";
import { clampToSendWindow, computeInvoiceStatus, getStageSchedule, nextStageForInvoice } from "@/server/reminders/schedule";
import { renderTemplate } from "@/server/reminders/templates";

describe("reminder scheduling", () => {
  it("computes stage dates from due date and cadence", () => {
    const dueDate = new Date("2026-03-10T00:00:00.000Z");
    const stages = getStageSchedule(dueDate, {
      preDueDays: 3,
      overdue1Days: 1,
      overdue2Days: 4,
      finalDays: 10,
    });

    expect(Math.round((dueDate.getTime() - stages.PRE_DUE.getTime()) / (1000 * 60 * 60 * 24))).toBe(3);
    expect(Math.round((stages.OVERDUE_1.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))).toBe(1);
    expect(Math.round((stages.OVERDUE_2.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))).toBe(4);
    expect(Math.round((stages.FINAL.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))).toBe(10);
  });

  it("moves send time into allowed send window and weekdays", () => {
    const saturday = new Date("2026-03-14T22:30:00.000Z");
    const adjusted = clampToSendWindow(saturday, {
      timezone: "America/New_York",
      sendWindowStart: "09:00",
      sendWindowEnd: "17:00",
      weekdaysOnly: true,
    });

    // Monday morning in NY window.
    expect(adjusted.getUTCDay()).toBe(1);
  });

  it("blocks duplicate stages by selecting the next unsent stage", () => {
    const result = nextStageForInvoice({
      dueDate: new Date("2026-03-10T00:00:00.000Z"),
      cadence: {
        preDueDays: 3,
        overdue1Days: 1,
        overdue2Days: 4,
        finalDays: 10,
      },
      sentStages: ["PRE_DUE", "OVERDUE_1"],
      now: new Date("2026-03-16T00:00:00.000Z"),
    });

    expect(result?.stage).toBe("OVERDUE_2");
  });

  it("computes pending/due soon/overdue/recovered states", () => {
    const now = new Date("2026-03-10T00:00:00.000Z");
    expect(
      computeInvoiceStatus(
        { dueDate: new Date("2026-03-20T00:00:00.000Z"), amountDueMinor: 1000, amountPaidMinor: 0, paidAt: null },
        now,
      ),
    ).toBe("PENDING");
    expect(
      computeInvoiceStatus(
        { dueDate: new Date("2026-03-12T00:00:00.000Z"), amountDueMinor: 1000, amountPaidMinor: 0, paidAt: null },
        now,
      ),
    ).toBe("DUE_SOON");
    expect(
      computeInvoiceStatus(
        { dueDate: new Date("2026-03-01T00:00:00.000Z"), amountDueMinor: 1000, amountPaidMinor: 0, paidAt: null },
        now,
      ),
    ).toBe("OVERDUE");
    expect(
      computeInvoiceStatus(
        { dueDate: new Date("2026-03-01T00:00:00.000Z"), amountDueMinor: 1000, amountPaidMinor: 1000, paidAt: null },
        now,
      ),
    ).toBe("RECOVERED");
  });

  it("renders template variables and rejects unknown keys", () => {
    const rendered = renderTemplate("Hi {{clientName}} - {{amountDue}}", {
      clientName: "Taylor",
      invoiceNumber: "INV-12",
      amountDue: "$1200.00",
      currency: "USD",
      dueDate: "2026-03-10",
      daysOverdue: "4",
      paymentLink: "https://example.com",
      businessName: "Studio",
      signatureName: "Taylor",
    });

    expect(rendered).toContain("Taylor");
    expect(() =>
      renderTemplate("{{unknown}}", {
        clientName: "Taylor",
        invoiceNumber: "INV-12",
        amountDue: "$1200.00",
        currency: "USD",
        dueDate: "2026-03-10",
        daysOverdue: "4",
        paymentLink: "https://example.com",
        businessName: "Studio",
        signatureName: "Taylor",
      }),
    ).toThrowError(/unsupported variables/i);
  });
});
