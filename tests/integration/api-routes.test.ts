import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/server/errors";

const mockRequireSession = vi.fn(() => ({
  userId: "user_1",
  workspaceId: "ws_1",
  email: "demo@test.com",
}));

const mockImportInvoicesFromCsv = vi.fn();
const mockCreateManualInvoice = vi.fn();
const mockListInvoices = vi.fn();
const mockMarkInvoicePaid = vi.fn();
const mockSendReminderNow = vi.fn();
const mockGetDashboardMetrics = vi.fn();
const mockUpdateAutomationSettings = vi.fn();
const mockHandleStripeWebhook = vi.fn();
const mockRunReminderScan = vi.fn();
const mockSendDueReminders = vi.fn();
const mockRequeueFailedReminders = vi.fn();

vi.mock("@/server/route-auth", () => ({
  requireSession: mockRequireSession,
}));

vi.mock("@/server/invoices", () => ({
  createManualInvoice: mockCreateManualInvoice,
  listInvoices: mockListInvoices,
  importInvoicesFromCsv: mockImportInvoicesFromCsv,
  markInvoicePaid: mockMarkInvoicePaid,
  sendReminderNow: mockSendReminderNow,
}));

vi.mock("@/server/dashboard", () => ({
  getDashboardMetrics: mockGetDashboardMetrics,
}));

vi.mock("@/server/settings", () => ({
  getAutomationSettings: vi.fn(),
  updateAutomationSettings: mockUpdateAutomationSettings,
}));

vi.mock("@/server/config", () => ({
  getConfig: () => ({
    STRIPE_WEBHOOK_SECRET: "whsec_test",
    CRON_SECRET: "cron_secret_test",
  }),
}));

vi.mock("@/server/stripe", () => ({
  getStripeClient: () => ({
    webhooks: {
      constructEvent: () => ({ type: "checkout.session.completed", data: { object: {} } }),
    },
  }),
}));

vi.mock("@/server/billing", () => ({
  handleStripeSubscriptionWebhook: mockHandleStripeWebhook,
}));

vi.mock("@/server/reminders/workflows", () => ({
  runReminderScan: mockRunReminderScan,
  sendDueReminders: mockSendDueReminders,
  requeueFailedReminders: mockRequeueFailedReminders,
}));

describe("core API route integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("imports CSV through /api/invoices/import-csv", async () => {
    mockImportInvoicesFromCsv.mockResolvedValue({
      importedCount: 2,
      skippedCount: 1,
      errors: [{ row: 3, message: "Invalid dueDate format" }],
    });

    const { POST } = await import("@/app/api/invoices/import-csv/route");
    const formData = new FormData();
    formData.append(
      "file",
      new File(
        [
          "clientName,clientEmail,invoiceNumber,amountDue,currency,dueDate,paymentUrl\nAcme,acme@example.com,INV-1,1200,USD,2026-03-10,https://example.com",
        ],
        "invoices.csv",
        { type: "text/csv" },
      ),
    );

    const request = new NextRequest("http://localhost/api/invoices/import-csv", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.importedCount).toBe(2);
    expect(mockImportInvoicesFromCsv).toHaveBeenCalledWith("ws_1", expect.stringContaining("clientName"));
  });

  it("creates invoice manually through POST /api/invoices", async () => {
    mockCreateManualInvoice.mockResolvedValue({
      id: "inv_manual_1",
      invoiceNumber: "INV-MAN-1",
      source: "MANUAL",
      client: { id: "client_1", name: "Client One", email: "client@example.com" },
    });

    const { POST } = await import("@/app/api/invoices/route");
    const request = new NextRequest("http://localhost/api/invoices", {
      method: "POST",
      body: JSON.stringify({
        clientName: "Client One",
        clientEmail: "client@example.com",
        invoiceNumber: "INV-MAN-1",
        amountDue: 123.45,
        currency: "USD",
        dueDate: "2026-03-15",
        issuedDate: "2026-03-01",
        paymentUrl: "https://example.com/pay/INV-MAN-1",
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.data.id).toBe("inv_manual_1");
    expect(mockCreateManualInvoice).toHaveBeenCalledWith({
      workspaceId: "ws_1",
      clientName: "Client One",
      clientEmail: "client@example.com",
      invoiceNumber: "INV-MAN-1",
      amountDue: 123.45,
      currency: "USD",
      dueDate: "2026-03-15",
      issuedDate: "2026-03-01",
      paymentUrl: "https://example.com/pay/INV-MAN-1",
    });
  });

  it("rejects invalid manual invoice payload through POST /api/invoices", async () => {
    const { POST } = await import("@/app/api/invoices/route");
    const request = new NextRequest("http://localhost/api/invoices", {
      method: "POST",
      body: JSON.stringify({
        clientName: "Client One",
        clientEmail: "not-an-email",
        invoiceNumber: "INV-MAN-1",
        amountDue: 0,
        currency: "USD",
        dueDate: "03/15/2026",
        paymentUrl: "not-a-url",
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("VALIDATION_ERROR");
    expect(mockCreateManualInvoice).not.toHaveBeenCalled();
  });

  it("returns business error for currency mismatch through POST /api/invoices", async () => {
    mockCreateManualInvoice.mockRejectedValue(
      new AppError("VALIDATION_ERROR", "Currency EUR does not match workspace base currency USD", 400),
    );

    const { POST } = await import("@/app/api/invoices/route");
    const request = new NextRequest("http://localhost/api/invoices", {
      method: "POST",
      body: JSON.stringify({
        clientName: "Client One",
        clientEmail: "client@example.com",
        invoiceNumber: "INV-MAN-1",
        amountDue: 123.45,
        currency: "EUR",
        dueDate: "2026-03-15",
        paymentUrl: "https://example.com/pay/INV-MAN-1",
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("VALIDATION_ERROR");
  });

  it("marks invoice paid through /api/invoices/:id/mark-paid", async () => {
    mockMarkInvoicePaid.mockResolvedValue({ id: "inv_1", status: "RECOVERED" });
    const { PATCH } = await import("@/app/api/invoices/[id]/mark-paid/route");

    const request = new NextRequest("http://localhost/api/invoices/inv_1/mark-paid", {
      method: "PATCH",
      body: JSON.stringify({ amountPaidMinor: 1000 }),
      headers: { "content-type": "application/json" },
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: "inv_1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.status).toBe("RECOVERED");
    expect(mockMarkInvoicePaid).toHaveBeenCalledWith("ws_1", "inv_1", undefined, 1000);
  });

  it("returns dashboard metrics through /api/dashboard/metrics", async () => {
    mockGetDashboardMetrics.mockResolvedValue({
      overdueTotalMinor: 1000,
      recoveredTotalMinor: 5000,
      remindersSent: 12,
      recoveryRatePercent: 45.3,
    });
    const { GET } = await import("@/app/api/dashboard/metrics/route");
    const response = await GET(new NextRequest("http://localhost/api/dashboard/metrics"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.remindersSent).toBe(12);
  });

  it("enforces settings validation for /api/settings/automation", async () => {
    const { PUT } = await import("@/app/api/settings/automation/route");
    const request = new NextRequest("http://localhost/api/settings/automation", {
      method: "PUT",
      body: JSON.stringify({
        tone: "FRIENDLY",
        timezone: "America/New_York",
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await PUT(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("VALIDATION_ERROR");
    expect(mockUpdateAutomationSettings).not.toHaveBeenCalled();
  });

  it("handles stripe webhooks through /api/stripe/webhooks", async () => {
    mockHandleStripeWebhook.mockResolvedValue(undefined);
    const { POST } = await import("@/app/api/stripe/webhooks/route");
    const request = new NextRequest("http://localhost/api/stripe/webhooks", {
      method: "POST",
      body: JSON.stringify({ id: "evt_1" }),
      headers: { "stripe-signature": "t=1,v1=test" },
    });

    const response = await POST(request);
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.data.received).toBe(true);
    expect(mockHandleStripeWebhook).toHaveBeenCalled();
  });

  it("queues manual reminder through /api/invoices/:id/send-reminder-now", async () => {
    mockSendReminderNow.mockResolvedValue({ id: "rem_1", status: "QUEUED" });
    const { POST } = await import("@/app/api/invoices/[id]/send-reminder-now/route");
    const response = await POST(new NextRequest("http://localhost"), {
      params: Promise.resolve({ id: "inv_1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.status).toBe("QUEUED");
    expect(mockSendReminderNow).toHaveBeenCalledWith("ws_1", "inv_1");
  });

  it("runs cron reminder endpoint with bearer auth", async () => {
    mockRunReminderScan.mockResolvedValue({ queued: 2 });
    mockSendDueReminders.mockResolvedValue({ sent: 1, failed: 0, skipped: 0 });
    mockRequeueFailedReminders.mockResolvedValue({ requeued: 1, exhausted: 0 });

    const { POST } = await import("@/app/api/internal/cron/run-reminders/route");
    const response = await POST(
      new NextRequest("http://localhost/api/internal/cron/run-reminders", {
        method: "POST",
        headers: { authorization: "Bearer cron_secret_test" },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.scan.queued).toBe(2);
    expect(payload.data.send.sent).toBe(1);
    expect(payload.data.retry.requeued).toBe(1);
  });
});
