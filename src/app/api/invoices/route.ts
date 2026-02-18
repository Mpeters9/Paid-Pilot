import { NextRequest } from "next/server";
import { listInvoices } from "@/server/invoices";
import { ok, withErrorHandling } from "@/server/http";
import { requireSession } from "@/server/route-auth";
import { paginationSchema } from "@/server/validation";

export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = requireSession(request);
    const query = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = paginationSchema.parse(query);

    const result = await listInvoices({
      workspaceId: session.workspaceId,
      status: parsed.status,
      page: parsed.page,
      pageSize: parsed.pageSize,
    });

    return ok(result);
  });
}

