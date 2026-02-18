import { NextRequest } from "next/server";
import { handleStripeSubscriptionWebhook } from "@/server/billing";
import { getConfig } from "@/server/config";
import { AppError } from "@/server/errors";
import { ok, withErrorHandling } from "@/server/http";
import { getStripeClient } from "@/server/stripe";

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const config = getConfig();
    const webhookSecret =
      config.STRIPE_WEBHOOK_SECRET_BILLING ?? config.STRIPE_WEBHOOK_SECRET;

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
    await handleStripeSubscriptionWebhook(event);
    return ok({ received: true });
  });
}
