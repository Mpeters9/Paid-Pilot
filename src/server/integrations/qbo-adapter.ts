import { AppError } from "@/server/errors";
import { QuickBooksInvoiceAdapter } from "@/server/types";

export class QuickBooksAdapter implements QuickBooksInvoiceAdapter {
  public async syncInvoices(): Promise<{ imported: number; skipped: number }> {
    throw new AppError("QBO_NOT_ENABLED", "QuickBooks support is planned for next milestone", 501);
  }
}

export const quickBooksAdapter = new QuickBooksAdapter();

