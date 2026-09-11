import { test, expect } from "@playwright/test";

async function openCurrentDashboard(page: import("@playwright/test").Page) {
  const response = await page.goto("/", { waitUntil: "domcontentloaded" });
  expect(response?.ok()).toBeTruthy();
  await page.waitForTimeout(750);
}

test.describe("Current unified AI trading safety E2E", () => {
  test.describe.configure({ retries: 0 });

  test("unified dashboard mounts current account, scanner and operational truth controls", async ({ page }) => {
    await openCurrentDashboard(page);

    await expect(page.getByTestId("operational-truth-monitor-v20")).toBeVisible();
    await expect(page.getByTestId("operational-gate-state")).toBeVisible();
    await expect(page.getByTestId("open-holdings")).toBeVisible();
    await expect(page.getByTestId("open-explainable-scanner")).toBeVisible();
    await expect(page.getByTestId("theme-toggle")).toBeVisible();
  });

  test("live trading remains locked by default behind the dual-lock gate", async ({ page }) => {
    await openCurrentDashboard(page);

    await expect(page.getByText(/안전 잠금 중/).first()).toBeVisible();
    await expect(page.getByText(/이중 승인 해제 시에만 실제 증권사 매수 주문이 실행됩니다/).first()).toBeVisible();
    await expect(page.getByText(/현재:\s*DRY_RUN/).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /PAPER/ })).toHaveCount(0);
  });

  test("Safe AI auto monitor is OFF by default and becomes active only after user opt-in", async ({ page }) => {
    await openCurrentDashboard(page);

    await expect(page.getByTestId("safe-ai-autotrade-launcher")).toHaveCount(0);
    await page.getByTestId("open-explainable-scanner").click();

    await expect(page.getByTestId("safe-ai-autotrade-launcher")).toBeVisible();
    await expect(page.getByTestId("safe-ai-auto-toggle")).toBeVisible();
    await expect(page.getByTestId("safe-ai-auto-toggle")).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByText(/SCAN ONLY · AUTO OFF/).first()).toBeVisible();

    await page.getByTestId("safe-ai-auto-toggle").click();
    await expect(page.getByTestId("safe-ai-auto-toggle")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText(/LIVE_RESTRICTED · AUTO 15s/).first()).toBeVisible();
  });
});
