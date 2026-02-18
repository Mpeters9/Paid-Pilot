import { NextRequest } from "next/server";
import { getConfig } from "@/server/config";
import { AppError } from "@/server/errors";
import { ok, withErrorHandling } from "@/server/http";
import { handleStripeInvoiceWebhookEvent } from "@/server/integrations/stripe-webhook";
import { getStripeClient } from "@/server/stripe";

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const config = getConfig();
    const webhookSecret =
      config.STRIPE_WEBHOOK_SECRET_INVOICES ?? config.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new AppError("STRIPE_NOT_CONFIGURED", "Stripe webhook secret is missing", 500);
    }

    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      throw new AppError("INVALID_SIGNATURE", "Missing Stripe signature", 400);
    }

    const payload = await request.text();
    const stripe = getStripeClient();
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    const result = await handleStripeInvoiceWebhookEvent(event);
    return ok(result);
  });
}
