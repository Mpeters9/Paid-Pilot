import { NextRequest } from "next/server";
import { sendReminderNow } from "@/server/invoices";
import { ok, withErrorHandling } from "@/server/http";
import { requireSession } from "@/server/route-auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  return withErrorHandling(async () => {
    const session = requireSession(request);
    const { id } = await params;
    const reminderEvent = await sendReminderNow(session.workspaceId, id);
    return ok(reminderEvent);
  });
}

