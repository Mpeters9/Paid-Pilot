# Launch Checklist

## Pricing Page Copy

- Starter: `$29/mo`, up to 100 active invoices, CSV + Stripe sync, automated reminders.
- Growth: `$79/mo`, up to 500 active invoices, priority support, advanced reporting.
- CTA: `Stop chasing invoices. Recover revenue on autopilot.`

## SEO Pages

- `/invoice-reminder-email-templates`
- `/how-to-collect-overdue-invoices`
- `/stripe-invoice-reminder-automation`

## Onboarding Email Sequence

- Day 0: welcome + 3-step setup checklist.
- Day 2: CSV import tips + template best practices.
- Day 7: activation nudge + dashboard outcomes.

### Draft copy

- Day 0 subject: `Welcome to Unpaid Invoice Autopilot`
- Day 2 subject: `Get better recovery rates from your reminder templates`
- Day 7 subject: `Your first recovery milestone this week`

## Stripe Plan Setup Notes

1. Create Stripe product: `Unpaid Invoice Autopilot`.
2. Create monthly recurring prices for Starter and Growth.
3. Set `STRIPE_PRICE_STARTER_MONTHLY` in `.env`.
4. Configure webhook endpoint: `/api/stripe/webhooks`.
5. Enable customer portal in Stripe dashboard.
6. Validate test mode flows (checkout + portal + webhook replay).

