import Stripe from "stripe";
import { getConfig } from "@/server/config";

let stripeClient: Stripe | null = null;

export function getStripeClient(secretKey?: string): Stripe {
  const key = secretKey ?? getConfig().STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Stripe secret key is not configured");
  }
  if (secretKey) {
    return new Stripe(secretKey);
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

