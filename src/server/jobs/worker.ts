import { getConfig } from "@/server/config";
import { logger } from "@/server/logger";
import { JOBS, startBoss, stopBoss } from "@/server/jobs/boss";
import { requeueFailedReminders, runReminderScan, sendDueReminders } from "@/server/reminders/workflows";

function describeStartupError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const aggregate = error as Error & { code?: string; errors?: Array<{ message?: string; code?: string }> };
  if (Array.isArray(aggregate.errors) && aggregate.errors.length > 0) {
    const parts = aggregate.errors
      .map((item) => item?.message ?? item?.code)
      .filter((value): value is string => Boolean(value));
    if (parts.length > 0) {
      return parts.join(" | ");
    }
  }

  return error.message || error.name || "Unknown startup error";
}

async function main() {
  getConfig();
  console.log("[worker] booting...");
  const boss = await startBoss();

  await boss.createQueue(JOBS.REMINDER_SCAN);
  await boss.createQueue(JOBS.REMINDER_SEND_BATCH);

  await boss.schedule(JOBS.REMINDER_SCAN, "*/15 * * * *", {});
  await boss.schedule(JOBS.REMINDER_SEND_BATCH, "*/5 * * * *", {});

  await boss.work(JOBS.REMINDER_SCAN, async () => {
    const result = await runReminderScan();
    logger.info({ result }, "Reminder scan completed");
  });

  await boss.work(JOBS.REMINDER_SEND_BATCH, async () => {
    const result = await sendDueReminders();
    const retryResult = await requeueFailedReminders();
    logger.info({ result, retryResult }, "Reminder send batch completed");
  });

  logger.info("Worker is running");
  console.log("[worker] running");
}

main().catch((error) => {
  logger.error(
    {
      err: error,
      message: describeStartupError(error),
      stack: error instanceof Error ? error.stack : undefined,
    },
    "Worker failed to start",
  );
  process.exitCode = 1;
});

process.on("SIGTERM", async () => {
  await stopBoss();
  process.exit(0);
});

process.on("SIGINT", async () => {
  await stopBoss();
  process.exit(0);
});