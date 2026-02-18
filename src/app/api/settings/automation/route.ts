import { NextRequest } from "next/server";
import { requireSession } from "@/server/route-auth";
import { getAutomationSettings, updateAutomationSettings } from "@/server/settings";
import { ok, withErrorHandling } from "@/server/http";
import { automationSettingsSchema } from "@/server/validation";

export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = requireSession(request);
    const settings = await getAutomationSettings(session.workspaceId);
    return ok(settings);
  });
}

export async function PUT(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = requireSession(request);
    const body = automationSettingsSchema.parse(await request.json());
    const updated = await updateAutomationSettings(session.workspaceId, body);
    return ok(updated);
  });
}

