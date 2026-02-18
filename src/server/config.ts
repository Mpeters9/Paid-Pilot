import { loadEnvConfig } from "@next/env";
import { z } from "zod";

const simpleEmail = z.string().email();

function isValidEmailOrMailbox(value: string): boolean {
  if (simpleEmail.safeParse(value).success) {
    return true;
  }
  const mailboxMatch = value.match(/<([^>]+)>/);
  if (!mailboxMatch?.[1]) {
    return false;
  }
  return simpleEmail.safeParse(mailboxMatch[1].trim()).success;
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  APP_URL: z.string().url().default("http://localhost:3000"),
  AUTH_SECRET: z.string().min(16).default("dev-auth-secret-change-me"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z
    .string()
    .refine(isValidEmailOrMailbox, "EMAIL_FROM must be an email or 'Name <email>'")
    .default("no-reply@example.com"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_WEBHOOK_SECRET_BILLING: z.string().optional(),
  STRIPE_WEBHOOK_SECRET_INVOICES: z.string().optional(),
  STRIPE_PRICE_STARTER_MONTHLY: z.string().optional(),
  ENCRYPTION_KEY: z.string().min(16).default("dev-encryption-key-change"),
  CRON_SECRET: z.string().min(16).optional(),
  PG_BOSS_SCHEMA: z.string().default("pgboss"),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5),
});

export type AppConfig = z.infer<typeof envSchema>;

let cachedConfig: AppConfig | null = null;
let envLoaded = false;

function ensureEnvLoaded() {
  if (envLoaded) return;
  loadEnvConfig(process.cwd());
  envLoaded = true;
}

export function getConfig(): AppConfig {
  ensureEnvLoaded();

  if (cachedConfig) {
    return cachedConfig;
  }

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    throw new Error(`Invalid environment configuration: ${JSON.stringify(details)}`);
  }

  cachedConfig = parsed.data;
  return cachedConfig;
}
