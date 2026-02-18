import Stripe from "stripe";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import { getConfig } from "@/server/config";
import { getStripeClient } from "@/server/stripe";

export async function createCheckoutSession(workspaceId: string): Promise<{ url: string }> {
  const config = getConfig();
  if (!config.STRIPE_PRICE_STARTER_MONTHLY) {
    throw new AppError("STRIPE_NOT_CONFIGURED", "Stripe price is not configured", 500);
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: { ownerUser: true, subscription: true },
  });
  if (!workspace) {
    throw new AppError("NOT_FOUND", "Workspace not found", 404);
  }

  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: workspace.ownerUser.email,
    line_items: [
      {
        price: config.STRIPE_PRICE_STARTER_MONTHLY,
        quantity: 1,
      },
    ],
    success_url: `${config.APP_URL}/app/billing?checkout=success`,
    cancel_url: `${config.APP_URL}/app/billing?checkout=cancelled`,
    metadata: {
      workspaceId: workspace.id,
    },
  });

  if (!session.url) {
    throw new AppError("STRIPE_ERROR", "Stripe checkout URL missing", 502);
  }

  return { url: session.url };
}

export async function createPortalSession(workspaceId: string): Promise<{ url: string }> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: { subscription: true },
  });
  if (!workspace?.subscription?.stripeCustomerId) {
    throw new AppError("NOT_FOUND", "No Stripe customer is linked yet", 404);
  }

  const stripe = getStripeClient();
  const config = getConfig();
  const session = await stripe.billingPortal.sessions.create({
    customer: workspace.subscription.stripeCustomerId,
    return_url: `${config.APP_URL}/app/billing`,
  });

  return { url: session.url };
}

export async function handleStripeSubscriptionWebhook(event: Stripe.Event) {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const workspaceId = session.metadata?.workspaceId;
    if (!workspaceId) return;

    await prisma.subscription.upsert({
      where: { workspaceId },
      update: {
        stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
        stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : null,
        status: "active",
      },
      create: {
        workspaceId,
        stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
        stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : null,
        stripePriceId: null,
        status: "active",
      },
    });
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const existing = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });
    if (!existing) return;

    await prisma.subscription.update({
      where: { id: existing.id },
      data: {
        status: subscription.status ?? existing.status,
        currentPeriodEnd: subscription.items.data[0]?.current_period_end
          ? new Date(subscription.items.data[0].current_period_end * 1000)
          : null,
      },
    });
  }
}
