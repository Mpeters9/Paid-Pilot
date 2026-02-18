import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db";
import { encryptSecret } from "@/server/crypto";
import { AppError } from "@/server/errors";
import { ok, withErrorHandling } from "@/server/http";
import { requireSession } from "@/server/route-auth";

const schema = z.object({
  apiKeyEncryptedPayload: z.string().min(10),
});

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = requireSession(request);
    const body = schema.parse(await request.json());
    const stripeSecret = body.apiKeyEncryptedPayload.trim();

    if (!stripeSecret.startsWith("sk_")) {
      throw new AppError("INVALID_STRIPE_KEY", "Stripe secret key must start with sk_", 400);
    }

    const encryptedToken = encryptSecret(stripeSecret);

    const connection = await prisma.integrationConnection.upsert({
      where: {
        workspaceId_provider: {
          workspaceId: session.workspaceId,
          provider: "STRIPE",
        },
      },
      update: {
        status: "CONNECTED",
        encryptedAccessToken: encryptedToken,
      },
      create: {
        workspaceId: session.workspaceId,
        provider: "STRIPE",
        status: "CONNECTED",
        encryptedAccessToken: encryptedToken,
      },
    });

    return ok(connection);
  });
}
