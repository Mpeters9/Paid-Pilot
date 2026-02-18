import { NextRequest } from "next/server";
import { markInvoicePaid } from "@/server/invoices";
import { ok, withErrorHandling } from "@/server/http";
import { requireSession } from "@/server/route-auth";
import { markPaidSchema } from "@/server/validation";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  return withErrorHandling(async () => {
    const session = requireSession(request);
    const { id } = await params;
    const body = markPaidSchema.parse(await request.json());
    const result = await markInvoicePaid(session.workspaceId, id, body.paidAt, body.amountPaidMinor);
    return ok(result);
  });
}

