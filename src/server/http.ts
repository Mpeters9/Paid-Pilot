import { NextResponse } from "next/server";
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
    if (error instanceof ZodError) {
      return fail(new AppError("VALIDATION_ERROR", "Invalid request payload", 400, error.flatten()));
    }
    logger.error({ error }, "Unhandled route error");
    return fail(new AppError("INTERNAL_ERROR", "Something went wrong", 500));
  }
}

