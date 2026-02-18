import { NextRequest } from "next/server";
import { createPortalSession } from "@/server/billing";
import { ok, withErrorHandling } from "@/server/http";
import { requireSession } from "@/server/route-auth";

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = requireSession(request);
    const result = await createPortalSession(session.workspaceId);
    return ok(result);
  });
}

