import { NextRequest } from "next/server";
import { requireSession } from "@/server/route-auth";
import { importInvoicesFromCsv } from "@/server/invoices";
import { AppError } from "@/server/errors";
import { ok, withErrorHandling } from "@/server/http";

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = requireSession(request);
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new AppError("INVALID_FILE", "Missing CSV file", 400);
    }

    const text = await file.text();
    const result = await importInvoicesFromCsv(session.workspaceId, text);
    return ok(result);
  });
}

