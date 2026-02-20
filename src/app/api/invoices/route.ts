import { NextRequest } from "next/server";
import { createManualInvoice, listInvoices } from "@/server/invoices";
import { ok, parseJsonBody, withErrorHandling } from "@/server/http";
import { requireSession } from "@/server/route-auth";
import { createInvoiceSchema, paginationSchema } from "@/server/validation";

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

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = requireSession(request);
    const payload = parseJsonBody(await request.json(), createInvoiceSchema);

    const invoice = await createManualInvoice({
      workspaceId: session.workspaceId,
      clientName: payload.clientName,
      clientEmail: payload.clientEmail,
      invoiceNumber: payload.invoiceNumber,
      amountDue: payload.amountDue,
      currency: payload.currency,
      dueDate: payload.dueDate,
      issuedDate: payload.issuedDate,
      paymentUrl: payload.paymentUrl,
    });

    return ok(invoice, 201);
  });
}
