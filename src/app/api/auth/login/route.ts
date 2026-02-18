import { NextRequest } from "next/server";
import { setSessionCookie, verifyPassword } from "@/server/auth";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import { ok, withErrorHandling } from "@/server/http";
import { loginSchema } from "@/server/validation";

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const body = loginSchema.parse(await request.json());

    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
      include: { workspace: true },
    });
    if (!user || !user.workspace) {
      throw new AppError("INVALID_CREDENTIALS", "Invalid credentials", 401);
    }

    const validPassword = await verifyPassword(body.password, user.passwordHash);
    if (!validPassword) {
      throw new AppError("INVALID_CREDENTIALS", "Invalid credentials", 401);
    }

    const response = ok({
      user: {
        id: user.id,
        email: user.email,
      },
      workspace: {
        id: user.workspace.id,
        name: user.workspace.name,
      },
    });

    setSessionCookie(response, {
      userId: user.id,
      workspaceId: user.workspace.id,
      email: user.email,
    });

    return response;
  });
}

