import { InvoiceSource } from "@prisma/client";
import { decryptSecretOrReturnRaw } from "@/server/crypto";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import { computeInvoiceStatus } from "@/server/reminders/schedule";
import { getStripeClient } from "@/server/stripe";
import { StripeInvoiceAdapter } from "@/server/types";

export class StripeAdapter implements StripeInvoiceAdapter {
  public async syncInvoices(workspaceId: string): Promise<{ imported: number; skipped: number }> {
    const connection = await prisma.integrationConnection.findUnique({
      where: {
        workspaceId_provider: {
          workspaceId,
          provider: "STRIPE",
        },
      },
    });
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });

    if (!workspace) {
      throw new AppError("NOT_FOUND", "Workspace not found", 404);
    }
    if (!connection?.encryptedAccessToken) {
      throw new AppError("STRIPE_NOT_CONNECTED", "Stripe integration is not connected", 400);
    }

    const stripeSecretKey = decryptSecretOrReturnRaw(connection.encryptedAccessToken);
    const stripe = getStripeClient(stripeSecretKey);
    const invoices = await stripe.invoices.list({ status: "open", limit: 100 });

    let imported = 0;
    let skipped = 0;
    for (const item of invoices.data) {
      const customerEmail = item.customer_email;
      if (!customerEmail) {
        skipped += 1;
        continue;
      }

      const currency = item.currency.toUpperCase();
      if (currency !== workspace.baseCurrency.toUpperCase()) {
        skipped += 1;
        continue;
      }

      const dueDateUnix = item.due_date ?? item.created;
      const dueDate = new Date(dueDateUnix * 1000);
      const amountDueMinor = item.amount_remaining ?? item.amount_due ?? 0;
      const amountPaidMinor = (item.amount_paid ?? 0) > 0 ? item.amount_paid : 0;
      const paidAt = item.status === "paid" ? new Date() : null;
      const status = computeInvoiceStatus(
        {
          dueDate,
          paidAt,
          amountDueMinor,
          amountPaidMinor,
        },
        new Date(),
      );

      const client = await prisma.client.upsert({
        where: {
          workspaceId_email: {
            workspaceId,
            email: customerEmail.toLowerCase(),
          },
        },
        update: {
          name: item.customer_name ?? customerEmail,
        },
        create: {
          workspaceId,
          name: item.customer_name ?? customerEmail,
          email: customerEmail.toLowerCase(),
        },
      });

      await prisma.invoice.upsert({
        where: {
          workspaceId_source_externalId: {
            workspaceId,
            source: InvoiceSource.STRIPE,
            externalId: item.id,
          },
        },
        update: {
          clientId: client.id,
          invoiceNumber: item.number ?? item.id,
          amountDueMinor: item.amount_due ?? amountDueMinor,
          amountPaidMinor,
          currency,
          dueDate,
          issuedDate: new Date(item.created * 1000),
          paymentUrl: item.hosted_invoice_url ?? item.invoice_pdf ?? "https://stripe.com",
          paidAt,
          status,
          recoveredAt: status === "RECOVERED" ? new Date() : null,
        },
        create: {
          workspaceId,
          clientId: client.id,
          source: InvoiceSource.STRIPE,
          externalId: item.id,
          invoiceNumber: item.number ?? item.id,
          amountDueMinor: item.amount_due ?? amountDueMinor,
          amountPaidMinor,
          currency,
          dueDate,
          issuedDate: new Date(item.created * 1000),
          paymentUrl: item.hosted_invoice_url ?? item.invoice_pdf ?? "https://stripe.com",
          paidAt,
          status,
          recoveredAt: status === "RECOVERED" ? new Date() : null,
        },
      });

      imported += 1;
    }

    return { imported, skipped };
  }
}

export const stripeAdapter = new StripeAdapter();
