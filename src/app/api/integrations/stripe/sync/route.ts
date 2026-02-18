import { NextRequest } from "next/server";
import { stripeAdapter } from "@/server/integrations/stripe-adapter";
import { ok, withErrorHandling } from "@/server/http";
import { requireSession } from "@/server/route-auth";

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = requireSession(request);
    const result = await stripeAdapter.syncInvoices(session.workspaceId);
    return ok(result);
  });
}

