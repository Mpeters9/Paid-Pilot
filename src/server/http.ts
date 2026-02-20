import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { AppError, isAppError } from "@/server/errors";
import { logger } from "@/server/logger";

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

export function fail(error: AppError): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    },
    { status: error.status },
  );
}

export function parseJsonBody<T>(input: unknown, validator: { parse: (value: unknown) => T }): T {
  return validator.parse(input);
}

export async function withErrorHandling(handler: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await handler();
  } catch (error) {
    if (isAppError(error)) {
      return fail(error);
    }
    if (isZodErrorLike(error)) {
      return fail(new AppError("VALIDATION_ERROR", "Invalid request payload", 400, getZodDetails(error)));
    }
    if (isDatabaseConnectionError(error)) {
      logger.error({ error }, "Database unavailable");
      return fail(new AppError("DATABASE_UNAVAILABLE", "Database unavailable. Please try again.", 503));
    }
    if (isConfigError(error)) {
      logger.error({ error }, "Server configuration error");
      return fail(new AppError("SERVER_CONFIG_ERROR", "Server configuration error", 500));
    }
    logger.error({ error }, "Unhandled route error");
    return fail(new AppError("INTERNAL_ERROR", "Something went wrong", 500));
  }
}

function isZodErrorLike(error: unknown): error is ZodError {
  if (error instanceof ZodError) {
    return true;
  }
  if (!error || typeof error !== "object") {
    return false;
  }
  const candidate = error as { name?: unknown; issues?: unknown; flatten?: unknown };
  return (
    candidate.name === "ZodError" ||
    (Array.isArray(candidate.issues) && typeof candidate.flatten === "function")
  );
}

function getZodDetails(error: ZodError): unknown {
  if (error instanceof ZodError) {
    return error.flatten();
  }
  const candidate = error as { flatten?: unknown; issues?: unknown };
  if (typeof candidate.flatten === "function") {
    return (candidate.flatten as () => unknown)();
  }
  return { issues: candidate.issues };
}

function isDatabaseConnectionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && ["P1001", "P1002"].includes(error.code)) {
    return true;
  }
  if (error && typeof error === "object") {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" && ["P1001", "P1002"].includes(code)) {
      return true;
    }
  }
  return false;
}

function isConfigError(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith("Invalid environment configuration:");
}
