import { test, expect, type Page } from "@playwright/test";

async function mockEmptyScanner(page: Page) {
  await page.route("**/api/scanner/small-midcap**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });
  await page.route("**/api/stocks**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });
}

async function openDashboard(page: Page) {
  const response = await page.goto("/", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);
  await expect(page.getByText("AI 스캔 포착 리스트", { exact: true })).toBeVisible();
}

test.describe("Merged AI scanner E2E", () => {
  test.describe.configure({ retries: 0 });

  test("main dashboard exposes the merged scanner instead of requiring a separate launcher", async ({ page }) => {
    await mockEmptyScanner(page);
    await openDashboard(page);

    await expect(page.getByText(/국내 · 미국 · 업비트/)).toBeVisible();
    await expect(page.getByRole("button", { name: "KOREA", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "US", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "UPBIT", exact: true })).toBeVisible();
  });

  test("empty verified universe does not fabricate LONG or SHORT recommendations", async ({ page }) => {
    await mockEmptyScanner(page);
    await openDashboard(page);
    await page.waitForTimeout(1200);

    await expect(page.getByRole("button", { name: /LONG 분석/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /SHORT 분석/ })).toHaveCount(0);
    await expect(page.getByText("AI 스캔 포착 리스트", { exact: true })).toBeVisible();
  });

  test("market filter controls remain available on the same scanner list", async ({ page }) => {
    await mockEmptyScanner(page);
    await openDashboard(page);

    for (const name of ["KOREA", "US", "UPBIT"] as const) {
      const button = page.getByRole("button", { name, exact: true });
      await button.click();
      await expect(button).toBeVisible();
      await expect(page.getByText("AI 스캔 포착 리스트", { exact: true })).toBeVisible();
    }
  });

  test("current scanner keeps automatic rescanning and manual refresh controls", async ({ page }) => {
    await mockEmptyScanner(page);
    await openDashboard(page);

    const autoOn = page.getByRole("button", { name: "자동스캔 ON", exact: true });
    await expect(autoOn).toBeVisible();
    await autoOn.click();
    await expect(page.getByRole("button", { name: "자동스캔 OFF", exact: true })).toBeVisible();

    const refresh = page.getByTitle("지금 다시 스캔");
    await expect(refresh).toBeVisible();
    await refresh.click();
    await expect(page.getByText("AI 스캔 포착 리스트", { exact: true })).toBeVisible();
  });
});
