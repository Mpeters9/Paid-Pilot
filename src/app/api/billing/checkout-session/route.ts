import { NextRequest } from "next/server";
import { createCheckoutSession } from "@/server/billing";
import { ok, parseJsonBody, withErrorHandling } from "@/server/http";
import { getRequestOrigin } from "@/server/request-origin";
import { requireSession } from "@/server/route-auth";
import { billingCheckoutSchema } from "@/server/validation";

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = requireSession(request);
    let payload: unknown = {};
    try {
      payload = await request.json();
    } catch {
      payload = {};
    }

    const body = parseJsonBody(payload, billingCheckoutSchema);
    const result = await createCheckoutSession(session.workspaceId, body.plan, getRequestOrigin(request));
    return ok(result);
  });
}
