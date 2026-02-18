# API Contracts

All JSON endpoints return one of:

- Success: `{ "data": ... }`
- Error: `{ "error": { "code": "STRING_CODE", "message": "Human message", "details": {} } }`

## Auth

- `POST /api/auth/register`
  - Body: `{ email, password, workspaceName, timezone, baseCurrency }`
- `POST /api/auth/login`
  - Body: `{ email, password }`
- `POST /api/auth/logout`
- `GET /api/auth/me`

## Settings

- `GET /api/settings/automation`
- `PUT /api/settings/automation`
  - Body:
  ```json
  {
    "tone": "FRIENDLY",
    "timezone": "America/New_York",
    "sendWindowStart": "09:00",
    "sendWindowEnd": "17:00",
    "weekdaysOnly": true,
    "cadence": {
      "preDueDays": 3,
      "overdue1Days": 1,
      "overdue2Days": 4,
      "finalDays": 10
    },
    "signatureName": "Avery Founder",
    "replyToEmail": "owner@example.com"
  }
  ```

## Invoices

- `POST /api/invoices/import-csv` (multipart, `file`)
- `GET /api/invoices?status=&page=&pageSize=`
- `GET /api/invoices/:id`
- `PATCH /api/invoices/:id/mark-paid`
  - Body: `{ paidAt?: ISODate, amountPaidMinor?: number }`
- `POST /api/invoices/:id/send-reminder-now`

## Dashboard

- `GET /api/dashboard/metrics`
  - Returns: `{ overdueTotalMinor, recoveredTotalMinor, remindersSent, recoveryRatePercent }`

## Payment Tracking

- `GET /r/:token` (redirect + click tracking)

## Billing

- `POST /api/billing/checkout-session`
- `POST /api/billing/portal-session`
- `POST /api/stripe/webhooks`

## Integrations

- `POST /api/integrations/stripe/connect`
  - Body: `{ apiKeyEncryptedPayload }` (raw Stripe secret in MVP UI; server encrypts at rest)
- `POST /api/integrations/stripe/sync`
- `POST /api/integrations/stripe/webhook`
- `GET /api/integrations/qbo/status`
- `POST /api/integrations/qbo/connect` (returns 501, `QBO_NOT_ENABLED`)

## Health and Ops

- `GET /api/health`
  - Returns app health + DB ping status.
