import { NextRequest } from "next/server";
import { ok, withErrorHandling } from "@/server/http";
import { requireSession } from "@/server/route-auth";
import { requeueFailedReminders, runReminderScan, sendDueReminders } from "@/server/reminders/workflows";

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = requireSession(request);
    const scan = await runReminderScan(session.workspaceId);
    const send = await sendDueReminders();
    const retry = await requeueFailedReminders();
    return ok({ scan, send, retry });
  });
}
