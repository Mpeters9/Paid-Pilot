import { AppError } from "@/server/errors";
import { withErrorHandling } from "@/server/http";

export async function POST() {
  return withErrorHandling(async () => {
    throw new AppError("QBO_NOT_ENABLED", "QuickBooks support is planned for next milestone", 501);
  });
}

