import { NextRequest } from "next/server";
import { getConfig } from "@/server/config";
import { AppError } from "@/server/errors";
import { ok, withErrorHandling } from "@/server/http";
import { requeueFailedReminders, runReminderScan, sendDueReminders } from "@/server/reminders/workflows";

function validateCronAuth(request: NextRequest): void {
  const config = getConfig();
  if (!config.CRON_SECRET) {
    throw new AppError("CRON_NOT_CONFIGURED", "Cron secret is missing", 500);
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${config.CRON_SECRET}`) {
    throw new AppError("UNAUTHORIZED", "Invalid cron credentials", 401);
  }
}

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    validateCronAuth(request);
    const scan = await runReminderScan();
    const send = await sendDueReminders();
    const retry = await requeueFailedReminders();
    return ok({ scan, send, retry });
  });
}
