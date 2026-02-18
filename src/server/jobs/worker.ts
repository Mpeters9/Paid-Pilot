import { getConfig } from "@/server/config";
import { logger } from "@/server/logger";
import { JOBS, startBoss, stopBoss } from "@/server/jobs/boss";
import { requeueFailedReminders, runReminderScan, sendDueReminders } from "@/server/reminders/workflows";

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
      message: error instanceof Error ? error.message : String(error),
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
