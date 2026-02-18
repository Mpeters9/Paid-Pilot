import { PgBoss } from "pg-boss";
import { getConfig } from "@/server/config";
import { logger } from "@/server/logger";

export const JOBS = {
  REMINDER_SCAN: "reminder-scan",
  REMINDER_SEND_BATCH: "reminder-send-batch",
} as const;

let boss: PgBoss | null = null;

export function getBoss(): PgBoss {
  if (boss) {
    return boss;
  }
  const config = getConfig();
  boss = new PgBoss({
    connectionString: config.DATABASE_URL,
    schema: config.PG_BOSS_SCHEMA,
  });
  return boss;
}

export async function startBoss(): Promise<PgBoss> {
  const instance = getBoss();
  await instance.start();
  logger.info("pg-boss started");
  return instance;
}

export async function stopBoss(): Promise<void> {
  if (!boss) return;
  await boss.stop();
  boss = null;
}
