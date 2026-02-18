import { NextRequest } from "next/server";
import { requireSession } from "@/server/route-auth";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import { ok, withErrorHandling } from "@/server/http";

export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = requireSession(request);
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { workspace: true },
    });

    if (!user || !user.workspace) {
      throw new AppError("NOT_FOUND", "User not found", 404);
    }

    return ok({
      user: {
        id: user.id,
        email: user.email,
      },
      workspace: {
        id: user.workspace.id,
        name: user.workspace.name,
        timezone: user.workspace.timezone,
        baseCurrency: user.workspace.baseCurrency,
      },
    });
  });
}

