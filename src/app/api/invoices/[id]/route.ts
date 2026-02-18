import { NextRequest } from "next/server";
import { getInvoiceById } from "@/server/invoices";
import { ok, withErrorHandling } from "@/server/http";
import { requireSession } from "@/server/route-auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  return withErrorHandling(async () => {
    const session = requireSession(request);
    const { id } = await params;
    const invoice = await getInvoiceById(session.workspaceId, id);
    return ok(invoice);
  });
}

