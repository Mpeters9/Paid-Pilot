import Stripe from "stripe";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";

export async function handleStripeInvoiceWebhookEvent(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  if (!invoice?.id) {
    throw new AppError("INVALID_EVENT", "Missing invoice id", 400);
  }

  const existing = await prisma.invoice.findFirst({
    where: {
      source: "STRIPE",
      externalId: invoice.id,
    },
  });

  if (!existing) {
    return { updated: false };
  }

  if (event.type === "invoice.paid" || event.type === "invoice.payment_succeeded") {
    await prisma.invoice.update({
      where: { id: existing.id },
      data: {
        amountPaidMinor: invoice.amount_paid ?? existing.amountPaidMinor,
        paidAt: new Date(),
        status: "RECOVERED",
        recoveredAt: existing.status === "OVERDUE" ? new Date() : existing.recoveredAt,
      },
    });
  }

  if (event.type === "invoice.updated") {
    await prisma.invoice.update({
      where: { id: existing.id },
      data: {
        amountDueMinor: invoice.amount_due ?? existing.amountDueMinor,
        amountPaidMinor: invoice.amount_paid ?? existing.amountPaidMinor,
      },
    });
  }

  return { updated: true };
}
