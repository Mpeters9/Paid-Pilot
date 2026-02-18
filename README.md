# Unpaid Invoice Autopilot

Set-and-forget invoice recovery automation for freelancers and small agencies.

## Stack

- TypeScript end-to-end
- Next.js App Router + API routes
- Postgres + Prisma
- pg-boss worker for background jobs
- Resend for transactional email
- Stripe for SaaS billing and invoice sync
- Zod validation on all route inputs
- Vitest (unit + integration) and Playwright (e2e scaffold)

## Development

1. Install dependencies:

```bash
pnpm install
```

2. Start Postgres:

```bash
docker compose up -d postgres
```

3. Copy env file and update keys:

```bash
cp .env.example .env
```

4. Apply migrations:

```bash
pnpm prisma migrate dev
```

5. Seed demo data:

```bash
pnpm prisma db seed
```

6. Start web app:

```bash
pnpm dev
```

7. Start worker:

```bash
pnpm worker
```

## Testing

```bash
pnpm test
pnpm test:integration
pnpm test:e2e
```

`test:e2e` includes a happy-path scenario and is skipped unless `RUN_E2E=1` is set.

## Build

```bash
pnpm build
pnpm start
```

## Demo Account (after seeding)

- Email: `demo@autopilot.local`
- Password: `demo12345`

## Architecture Notes

### Core folders

- `src/app/*`: UI pages and API route handlers
- `src/server/*`: service layer (domain logic, integrations, auth, jobs)
- `prisma/*`: schema, migrations, seed
- `tests/*`: unit, integration, e2e
- `docs/api-contracts.md`: API contracts
- `docs/launch-checklist.md`: pricing copy, SEO pages, onboarding emails, Stripe launch notes

### Reminder Flow Sequence

```text
Worker cron (every 15m)
  -> runReminderScan()
    -> compute invoice statuses
    -> compute next stage from due date + cadence
    -> apply send-window + timezone
    -> queue ReminderEvent

Worker cron (every 5m)
  -> sendDueReminders()
    -> render template variables
    -> create tracked payment link /r/:token
    -> send email via Resend
    -> persist sent/failed state + audit log
    -> requeue failed reminders with exponential backoff (max 5 attempts)
```

### Security and reliability notes

- Stripe API keys are encrypted at rest with `ENCRYPTION_KEY`.
- Failed reminder sends are automatically retried with backoff.
- Use `GET /api/health` for uptime and database check probes.

## API Contracts

See `docs/api-contracts.md`.

## Launch Checklist

See `docs/launch-checklist.md`.

## Free Scheduler Mode (No Paid Worker Host)

If you deploy without a dedicated background worker, you can run reminders via a secure cron route:

- Endpoint: `POST /api/internal/cron/run-reminders`
- Auth: `Authorization: Bearer <CRON_SECRET>`

Set `CRON_SECRET` in your deployment environment, then schedule a cron trigger every 15 minutes.

This repository includes `.github/workflows/reminder-cron.yml`, which calls the endpoint on a schedule.
You must define these GitHub repository secrets:

- `APP_URL` (for example `https://your-app.example.com`)
- `CRON_SECRET` (must match your deployment env var)
