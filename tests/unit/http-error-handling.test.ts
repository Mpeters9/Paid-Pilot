import { describe, expect, it } from "vitest";
import { AppError } from "@/server/errors";
import { withErrorHandling } from "@/server/http";

describe("withErrorHandling", () => {
  it("returns app errors as-is", async () => {
    const response = await withErrorHandling(async () => {
      throw new AppError("INVALID_CREDENTIALS", "Invalid credentials", 401);
    });
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("maps database connectivity errors to 503", async () => {
    const response = await withErrorHandling(async () => {
      throw { code: "P1001" };
    });
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.error.code).toBe("DATABASE_UNAVAILABLE");
  });

  it("maps env config errors to server config error", async () => {
    const response = await withErrorHandling(async () => {
      throw new Error("Invalid environment configuration: [{\"path\":\"EMAIL_FROM\",\"message\":\"bad\"}]");
    });
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error.code).toBe("SERVER_CONFIG_ERROR");
  });

  it("maps zod-like validation errors to 400 even when not instanceof", async () => {
    const response = await withErrorHandling(async () => {
      throw {
        name: "ZodError",
        issues: [{ path: ["email"], message: "Invalid email" }],
        flatten: () => ({ formErrors: [], fieldErrors: { email: ["Invalid email"] } }),
      };
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("VALIDATION_ERROR");
  });
});
