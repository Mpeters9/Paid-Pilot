import { test, expect } from "@playwright/test";

test.skip(!process.env.RUN_E2E, "Set RUN_E2E=1 after local database/email configuration");

test("import invoice -> send reminders -> mark recovered", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Business name").fill("E2E Studio");
  await page.getByLabel("Email").fill(`e2e-${Date.now()}@example.test`);
  await page.getByLabel("Password").fill("e2e-password-123");
  await page.getByLabel("Timezone").fill("America/New_York");
  await page.getByLabel("Base currency").fill("USD");
  await page.getByRole("button", { name: "Create account" }).click();

  await page.waitForURL("**/app/onboarding");
  await page.getByRole("button", { name: "Complete onboarding" }).click();
  await page.waitForURL("**/app/dashboard");

  await page.goto("/app/invoices/new");
  await page.getByLabel("Client name").fill("Manual Client");
  await page.getByLabel("Client email").fill("manual-client@example.test");
  await page.getByLabel("Invoice number").fill("INV-E2E-MANUAL-1");
  await page.getByLabel(/Amount due/).fill("850");
  await page.getByLabel("Due date").fill("2026-12-15");
  await page.getByLabel("Payment URL").fill("https://example.com/pay/INV-E2E-MANUAL-1");
  await page.getByRole("button", { name: "Create invoice" }).click();
  await page.waitForURL("**/app/invoices");
  await expect(page.getByText("INV-E2E-MANUAL-1")).toBeVisible();

  await page.goto("/app/invoices/import");
  const csv = [
    "clientName,clientEmail,invoiceNumber,amountDue,currency,dueDate,paymentUrl",
    "Client One,client1@example.test,INV-E2E-1,1200,USD,2026-01-01,https://example.com/pay/INV-E2E-1",
  ].join("\n");
  await page.setInputFiles('input[type=\"file\"]', {
    name: "invoices.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await page.getByRole("button", { name: "Import invoices" }).click();
  await expect(page.getByText("Import result")).toBeVisible();

  await page.request.post("/api/internal/run-reminders");
  await page.goto("/app/invoices");
  await expect(page.getByText("INV-E2E-1")).toBeVisible();

  await page.getByRole("button", { name: "Mark paid" }).first().click();
  await expect(page.getByText("RECOVERED")).toBeVisible();
});
