import { test, expect } from "@playwright/test";

async function openCurrentDashboard(page: import("@playwright/test").Page) {
  const response = await page.goto("/", { waitUntil: "domcontentloaded" });
  expect(response?.ok()).toBeTruthy();
  await page.waitForTimeout(750);
}

test.describe("Current unified AI trading safety E2E", () => {
  test.describe.configure({ retries: 0 });

  test("unified dashboard mounts the current scanner and safety controls", async ({ page }) => {
    await openCurrentDashboard(page);

    await expect(page.getByText("검증형 AI 포착 종목", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("지금 스캔", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/긴급 킬스위치/).first()).toBeVisible();
    await expect(page.getByText(/계좌·보유잔고/).first()).toBeVisible();
  });

  test("live trading remains locked by default behind the dual-lock gate", async ({ page }) => {
    await openCurrentDashboard(page);

    await expect(page.getByText(/안전 잠금 중/).first()).toBeVisible();
    await expect(page.getByText(/이중 승인 해제 시에만 실제 증권사 매수 주문이 실행됩니다/).first()).toBeVisible();
    await expect(page.getByText(/현재:\s*PAPER/).first()).toBeVisible();
  });

  test("removed legacy Safe AI launcher stays unmounted while the unified scanner remains visible", async ({ page }) => {
    await openCurrentDashboard(page);

    await expect(page.getByTestId("safe-ai-autotrade-launcher")).toHaveCount(0);
    await expect(page.getByText("검증형 AI 포착 종목", { exact: true }).first()).toBeVisible();
  });
});
