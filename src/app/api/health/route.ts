import { ok, withErrorHandling } from "@/server/http";
import { prisma } from "@/server/db";

export async function GET() {
  return withErrorHandling(async () => {
    await prisma.$queryRaw`SELECT 1`;
    return ok({
      status: "ok",
      time: new Date().toISOString(),
      checks: {
        database: "ok",
      },
    });
  });
}

