import { NextRequest } from "next/server";
import { getWorkspaceBillingStatus } from "@/server/billing";
import { ok, withErrorHandling } from "@/server/http";
import { requireSession } from "@/server/route-auth";

export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = requireSession(request);
    const syncFromStripe = request.nextUrl.searchParams.get("sync") === "1";
    const result = await getWorkspaceBillingStatus(session.workspaceId, { syncFromStripe });
    return ok(result);
  });
}
