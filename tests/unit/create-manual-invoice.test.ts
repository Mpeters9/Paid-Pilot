import { InvoiceSource } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = {
  workspace: { findUnique: vi.fn() },
  client: { upsert: vi.fn() },
  invoice: { create: vi.fn() },
};

vi.mock("@/server/db", () => ({
  prisma: mockPrisma,
}));

describe("createManualInvoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates invoice with MANUAL source and normalized email", async () => {
    mockPrisma.workspace.findUnique.mockResolvedValue({ id: "ws_1", baseCurrency: "USD" });
    mockPrisma.client.upsert.mockResolvedValue({ id: "client_1" });
    mockPrisma.invoice.create.mockResolvedValue({ id: "inv_1" });

    const { createManualInvoice } = await import("@/server/invoices");
    await createManualInvoice({
      workspaceId: "ws_1",
      clientName: "Client One",
      clientEmail: "Client@One.Example",
      invoiceNumber: "INV-MAN-1",
      amountDue: 100.5,
      currency: "USD",
      dueDate: "2026-03-10",
      issuedDate: "2026-03-01",
      paymentUrl: "https://example.com/pay/INV-MAN-1",
    });

    expect(mockPrisma.client.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          workspaceId_email: {
            workspaceId: "ws_1",
            email: "client@one.example",
          },
        },
      }),
    );
    expect(mockPrisma.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: InvoiceSource.MANUAL,
          invoiceNumber: "INV-MAN-1",
        }),
      }),
    );
  });

  it("rejects workspace currency mismatch", async () => {
    mockPrisma.workspace.findUnique.mockResolvedValue({ id: "ws_1", baseCurrency: "EUR" });
    const { createManualInvoice } = await import("@/server/invoices");

    await expect(
      createManualInvoice({
        workspaceId: "ws_1",
        clientName: "Client One",
        clientEmail: "client@example.com",
        invoiceNumber: "INV-MAN-1",
        amountDue: 100,
        currency: "USD",
        dueDate: "2026-03-10",
        paymentUrl: "https://example.com/pay/INV-MAN-1",
      }),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400,
    });
    expect(mockPrisma.client.upsert).not.toHaveBeenCalled();
  });

  it("rejects invalid due date", async () => {
    mockPrisma.workspace.findUnique.mockResolvedValue({ id: "ws_1", baseCurrency: "USD" });
    const { createManualInvoice } = await import("@/server/invoices");

    await expect(
      createManualInvoice({
        workspaceId: "ws_1",
        clientName: "Client One",
        clientEmail: "client@example.com",
        invoiceNumber: "INV-MAN-1",
        amountDue: 100,
        currency: "USD",
        dueDate: "not-a-date",
        paymentUrl: "https://example.com/pay/INV-MAN-1",
      }),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400,
    });
    expect(mockPrisma.client.upsert).not.toHaveBeenCalled();
  });
});
