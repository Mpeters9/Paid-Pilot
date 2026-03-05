import Stripe from "stripe";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import { getConfig } from "@/server/config";
import { getStripeClient } from "@/server/stripe";

export type CheckoutPlan = "starter" | "growth" | "scale";

type WorkspaceBillingStatus = {
  status: string;
  plan: CheckoutPlan | null;
  stripePriceId: string | null;
  currentPeriodEnd: string | null;
  hasCustomer: boolean;
  hasSubscription: boolean;
};

type CheckoutSessionConfirmation = {
  status: string;
  stripePriceId: string | null;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
};

type BillingStatusOptions = {
  syncFromStripe?: boolean;
};

function resolveStripePriceId(plan: CheckoutPlan): string {
  const config = getConfig();

  if (plan === "starter") {
    if (!config.STRIPE_PRICE_STARTER_MONTHLY) {
      throw new AppError("STRIPE_NOT_CONFIGURED", "Stripe Starter price is not configured", 500);
    }
    return config.STRIPE_PRICE_STARTER_MONTHLY;
  }

  if (plan === "growth") {
    if (!config.STRIPE_PRICE_GROWTH_MONTHLY) {
      throw new AppError("STRIPE_NOT_CONFIGURED", "Stripe Growth price is not configured", 500);
    }
    return config.STRIPE_PRICE_GROWTH_MONTHLY;
  }

  if (!config.STRIPE_PRICE_SCALE_MONTHLY) {
    throw new AppError("STRIPE_NOT_CONFIGURED", "Stripe Scale price is not configured", 500);
  }
  return config.STRIPE_PRICE_SCALE_MONTHLY;
}

function resolveAppUrl(appUrlOverride?: string): string {
  if (appUrlOverride) {
    return appUrlOverride;
  }
  return getConfig().APP_URL;
}

function resolvePlanFromPriceId(stripePriceId: string | null): CheckoutPlan | null {
  if (!stripePriceId) {
    return null;
  }

  const config = getConfig();
  if (config.STRIPE_PRICE_STARTER_MONTHLY && stripePriceId === config.STRIPE_PRICE_STARTER_MONTHLY) {
    return "starter";
  }
  if (config.STRIPE_PRICE_GROWTH_MONTHLY && stripePriceId === config.STRIPE_PRICE_GROWTH_MONTHLY) {
    return "growth";
  }
  if (config.STRIPE_PRICE_SCALE_MONTHLY && stripePriceId === config.STRIPE_PRICE_SCALE_MONTHLY) {
    return "scale";
  }
  return null;
}

function readPriceIdFromSubscription(subscription: Stripe.Subscription | null): string | null {
  return subscription?.items?.data?.[0]?.price?.id ?? null;
}

function readCurrentPeriodEndFromSubscription(subscription: Stripe.Subscription | null): Date | null {
  const currentPeriodEnd = subscription?.items?.data?.[0]?.current_period_end;
  if (!currentPeriodEnd) {
    return null;
  }
  return new Date(currentPeriodEnd * 1000);
}

function isActiveCustomer(
  customer: Stripe.Customer | Stripe.DeletedCustomer,
): customer is Stripe.Customer {
  return !("deleted" in customer && customer.deleted);
}

async function syncWorkspaceBillingFromStripe(workspaceId: string): Promise<void> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: { ownerUser: true, subscription: true },
  });
  if (!workspace) {
    throw new AppError("NOT_FOUND", "Workspace not found", 404);
  }

  const stripe = getStripeClient();

  let stripeCustomerId = workspace.subscription?.stripeCustomerId ?? null;
  if (!stripeCustomerId) {
    const customers = await stripe.customers.list({
      email: workspace.ownerUser.email,
      limit: 10,
    });
    const activeCustomer = customers.data.find(isActiveCustomer);
    stripeCustomerId = activeCustomer?.id ?? null;
  }

  if (!stripeCustomerId) {
    return;
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: "all",
    limit: 10,
  });

  const prioritizedSubscription =
    subscriptions.data.find((subscription) => subscription.status === "active" || subscription.status === "trialing") ??
    subscriptions.data.find((subscription) => subscription.status === "past_due" || subscription.status === "unpaid") ??
    subscriptions.data[0] ??
    null;

  const stripeSubscriptionId = prioritizedSubscription?.id ?? workspace.subscription?.stripeSubscriptionId ?? null;
  const stripePriceId = readPriceIdFromSubscription(prioritizedSubscription) ?? workspace.subscription?.stripePriceId ?? null;
  const status = prioritizedSubscription?.status ?? workspace.subscription?.status ?? "inactive";
  const currentPeriodEnd =
    readCurrentPeriodEndFromSubscription(prioritizedSubscription) ?? workspace.subscription?.currentPeriodEnd ?? null;

  await prisma.subscription.upsert({
    where: { workspaceId },
    update: {
      stripeCustomerId,
      stripeSubscriptionId,
      stripePriceId,
      status,
      currentPeriodEnd,
    },
    create: {
      workspaceId,
      stripeCustomerId,
      stripeSubscriptionId,
      stripePriceId,
      status,
      currentPeriodEnd,
    },
  });
}

export async function createCheckoutSession(
  workspaceId: string,
  plan: CheckoutPlan = "starter",
  appUrlOverride?: string,
): Promise<{ url: string }> {
  const stripePriceId = resolveStripePriceId(plan);
  const appUrl = resolveAppUrl(appUrlOverride);

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
        price: stripePriceId,
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/app/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/app/billing?checkout=cancelled`,
    metadata: {
      workspaceId: workspace.id,
      plan,
      stripePriceId,
    },
  });

  if (!session.url) {
    throw new AppError("STRIPE_ERROR", "Stripe checkout URL missing", 502);
  }

  return { url: session.url };
}

export async function createPortalSession(workspaceId: string, appUrlOverride?: string): Promise<{ url: string }> {
  let workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: { ownerUser: true, subscription: true },
  });
  if (!workspace) {
    throw new AppError("NOT_FOUND", "Workspace not found", 404);
  }
  if (!workspace.subscription?.stripeCustomerId) {
    await syncWorkspaceBillingFromStripe(workspaceId);
    workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { ownerUser: true, subscription: true },
    });
  }
  if (!workspace?.subscription?.stripeCustomerId) {
    throw new AppError("NOT_FOUND", "No Stripe customer is linked yet", 404);
  }

  const stripe = getStripeClient();
  const appUrl = resolveAppUrl(appUrlOverride);
  const session = await stripe.billingPortal.sessions.create({
    customer: workspace.subscription.stripeCustomerId,
    return_url: `${appUrl}/app/billing`,
  });

  return { url: session.url };
}

export async function getWorkspaceBillingStatus(
  workspaceId: string,
  options: BillingStatusOptions = {},
): Promise<WorkspaceBillingStatus> {
  if (options.syncFromStripe) {
    try {
      await syncWorkspaceBillingFromStripe(workspaceId);
    } catch {
      // Fallback to local subscription state when Stripe sync fails.
    }
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: { subscription: true },
  });
  if (!workspace) {
    throw new AppError("NOT_FOUND", "Workspace not found", 404);
  }

  const subscription = workspace.subscription;
  if (!subscription) {
    return {
      status: "inactive",
      plan: null,
      stripePriceId: null,
      currentPeriodEnd: null,
      hasCustomer: false,
      hasSubscription: false,
    };
  }

  return {
    status: subscription.status,
    plan: resolvePlanFromPriceId(subscription.stripePriceId),
    stripePriceId: subscription.stripePriceId,
    currentPeriodEnd: subscription.currentPeriodEnd ? subscription.currentPeriodEnd.toISOString() : null,
    hasCustomer: Boolean(subscription.stripeCustomerId),
    hasSubscription: Boolean(subscription.stripeSubscriptionId),
  };
}

async function upsertSubscriptionFromCheckoutSession(
  workspaceId: string,
  session: Stripe.Checkout.Session,
): Promise<CheckoutSessionConfirmation> {
  const stripeSubscription =
    typeof session.subscription === "string" ? null : (session.subscription as Stripe.Subscription | null);
  const stripePriceId =
    (typeof session.metadata?.stripePriceId === "string" ? session.metadata.stripePriceId : null) ??
    readPriceIdFromSubscription(stripeSubscription);
  const stripeCustomerId = typeof session.customer === "string" ? session.customer : null;
  const stripeSubscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;
  const currentPeriodEnd = readCurrentPeriodEndFromSubscription(stripeSubscription);

  await prisma.subscription.upsert({
    where: { workspaceId },
    update: {
      stripeCustomerId,
      stripeSubscriptionId,
      stripePriceId,
      status: "active",
      currentPeriodEnd,
    },
    create: {
      workspaceId,
      stripeCustomerId,
      stripeSubscriptionId,
      stripePriceId,
      status: "active",
      currentPeriodEnd,
    },
  });

  return {
    status: "active",
    stripePriceId,
    stripeSubscriptionId,
    stripeCustomerId,
  };
}

export async function confirmCheckoutSession(
  workspaceId: string,
  checkoutSessionId: string,
): Promise<CheckoutSessionConfirmation> {
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
    expand: ["subscription"],
  });

  if (session.mode !== "subscription") {
    throw new AppError("VALIDATION_ERROR", "Checkout session is not a subscription session", 400);
  }
  if (session.status !== "complete") {
    throw new AppError("VALIDATION_ERROR", "Checkout session is not complete yet", 400);
  }

  const metadataWorkspaceId = session.metadata?.workspaceId;
  if (metadataWorkspaceId && metadataWorkspaceId !== workspaceId) {
    throw new AppError("FORBIDDEN", "Checkout session does not belong to this workspace", 403);
  }

  return upsertSubscriptionFromCheckoutSession(workspaceId, session);
}

export async function handleStripeSubscriptionWebhook(event: Stripe.Event) {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const workspaceId = session.metadata?.workspaceId;
    if (!workspaceId) return;
    await upsertSubscriptionFromCheckoutSession(workspaceId, session);
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
        stripePriceId: subscription.items.data[0]?.price?.id ?? existing.stripePriceId,
        status: subscription.status ?? existing.status,
        currentPeriodEnd: subscription.items.data[0]?.current_period_end
          ? new Date(subscription.items.data[0].current_period_end * 1000)
          : null,
      },
    });
  }
}
