import { test, expect, type Page } from "@playwright/test";

async function mockEmptyServerDiscovery(page: Page) {
  await page.route("**/api/explainable-scanner**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        authority: "REAL_PRECHECK_ONLY",
        finalAuthority: "SERVER_V20_FINAL_REQUIRED",
        scannedAt: new Date().toISOString(),
        totalScanned: 3210,
        passedCount: 0,
        dataStatus: "REALTIME_VERIFIED",
        topIdeas: [],
      }),
    });
  });
}

async function openDashboard(page: Page) {
  const response = await page.goto("/", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);
  await expect(page.getByText("AI 스캔 포착 리스트", { exact: true })).toBeVisible();
}

test.describe("Merged AI scanner E2E", () => {
  test.describe.configure({ retries: 0 });

  test("main dashboard exposes server-first merged scanner", async ({ page }) => {
    await mockEmptyServerDiscovery(page);
    await openDashboard(page);

    await expect(page.getByText(/서버 전체 3,210종목/)).toBeVisible();
    await expect(page.getByText(/국내 · 미국 · 업비트/)).toBeVisible();
    await expect(page.getByRole("button", { name: "KOREA", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "US", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "UPBIT", exact: true })).toBeVisible();
  });

  test("empty server discovery does not fabricate LONG or SHORT recommendations", async ({ page }) => {
    await mockEmptyServerDiscovery(page);
    await openDashboard(page);

    await expect(page.getByText("지금 조건에 맞는 종목이 없어요. 억지로 추천하지 않습니다.")).toBeVisible();
    await expect(page.getByRole("button", { name: /LONG 분석/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /SHORT 분석/ })).toHaveCount(0);
  });

  test("market filter controls remain available on the same scanner list", async ({ page }) => {
    await mockEmptyServerDiscovery(page);
    await openDashboard(page);

    for (const name of ["KOREA", "US", "UPBIT"] as const) {
      const button = page.getByRole("button", { name, exact: true });
      await button.click();
      await expect(button).toBeVisible();
      await expect(page.getByText("AI 스캔 포착 리스트", { exact: true })).toBeVisible();
    }
  });

  test("automatic rescanning and manual refresh call the server discovery endpoint", async ({ page }) => {
    let discoveryCalls = 0;
    await page.route("**/api/explainable-scanner**", async (route) => {
      discoveryCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          authority: "REAL_PRECHECK_ONLY",
          finalAuthority: "SERVER_V20_FINAL_REQUIRED",
          scannedAt: new Date().toISOString(),
          totalScanned: 3210,
          passedCount: 0,
          dataStatus: "REALTIME_VERIFIED",
          topIdeas: [],
        }),
      });
    });

    await openDashboard(page);
    await expect(page.getByRole("button", { name: "자동스캔 ON", exact: true })).toBeVisible();

    const refresh = page.getByTitle("지금 다시 스캔");
    await refresh.click();
    await expect.poll(() => discoveryCalls).toBeGreaterThanOrEqual(2);
  });
});
