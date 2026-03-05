import { NextRequest } from "next/server";
import { confirmCheckoutSession } from "@/server/billing";
import { ok, parseJsonBody, withErrorHandling } from "@/server/http";
import { requireSession } from "@/server/route-auth";
import { billingCheckoutConfirmSchema } from "@/server/validation";

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = requireSession(request);
    let payload: unknown = {};
    try {
      payload = await request.json();
    } catch {
      payload = {};
    }

    const body = parseJsonBody(payload, billingCheckoutConfirmSchema);
    const result = await confirmCheckoutSession(session.workspaceId, body.sessionId);
    return ok(result);
  });
}
