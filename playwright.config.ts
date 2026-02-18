import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000",
    headless: true,
  },
  webServer:
    process.env.RUN_E2E && !process.env.E2E_BASE_URL
      ? {
        command: "pnpm dev",
        port: 3000,
        timeout: 120_000,
        reuseExistingServer: true,
      }
      : undefined,
});
