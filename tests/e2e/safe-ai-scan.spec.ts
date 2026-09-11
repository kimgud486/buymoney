import { test, expect } from "@playwright/test";

async function openStockGpt(page: import("@playwright/test").Page) {
  const response = await page.goto("/", { waitUntil: "domcontentloaded" });
  expect(response?.ok()).toBeTruthy();
  await page.waitForTimeout(750);
}

test.describe("Stock GPT verified-data safety E2E", () => {
  test.describe.configure({ retries: 0 });

  test("Stock GPT mounts the new chat-first shell while operational truth stays mounted", async ({ page }) => {
    await openStockGpt(page);

    await expect(page.getByRole("heading", { name: "주식 전용 ChatGPT" })).toBeVisible();
    await expect(page.getByPlaceholder(/무엇을 분석할까요/)).toBeVisible();
    await expect(page.getByRole("button", { name: "지금 강한 종목 찾아줘" })).toBeVisible();

    // The legacy truth monitor remains mounted behind the new UI so its runtime checks keep running,
    // but the old dashboard chrome is intentionally not visible anymore.
    await expect(page.getByTestId("operational-truth-monitor-v20")).toHaveCount(1);
  });

  test("direct auto-order controls are absent from the Stock GPT landing screen", async ({ page }) => {
    await openStockGpt(page);

    await expect(page.getByTestId("safe-ai-autotrade-launcher")).toHaveCount(0);
    await expect(page.getByTestId("safe-ai-auto-toggle")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /PAPER/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /자동.*주문|주문.*실행|실매수|실매도/ })).toHaveCount(0);
  });

  test("a stock question enters verified-data analysis and never fabricates an execution path", async ({ page }) => {
    await openStockGpt(page);

    const input = page.getByPlaceholder(/무엇을 분석할까요/);
    await input.fill("삼성전자 지금 어때?");
    await input.press("Enter");

    await expect(page.getByText("VERIFIED DATA ONLY")).toBeVisible();

    const longReview = page.getByRole("button", { name: /LONG 검토/ });
    if ((await longReview.count()) > 0) {
      await longReview.first().click();
      await expect(page.getByText(/검토 단계만 열립니다/)).toBeVisible();
      await expect(page.getByRole("button", { name: /주문.*실행|실행.*주문|매수.*확인|매도.*확인/ })).toHaveCount(0);
    } else {
      // CI often has no broker/provider credentials. That must resolve to an explicit NO_DATA posture,
      // never a demo price, synthetic candle or auto-order button.
      await expect(page.getByText(/NO_DATA|실제 시세를 요청했습니다|가짜 캔들을 대신 넣지 않습니다/).first()).toBeVisible();
    }
  });
});
