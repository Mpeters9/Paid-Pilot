export class AppError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(code: string, message: string, status = 400, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function isAppError(error: unknown): error is AppError {
  if (error instanceof AppError) {
    return true;
  }

  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as Partial<AppError> & { message?: unknown };
  return (
    typeof candidate.code === "string" &&
    typeof candidate.status === "number" &&
    typeof candidate.message === "string"
  );
}
