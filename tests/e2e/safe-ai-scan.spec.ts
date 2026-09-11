import { test, expect } from "@playwright/test";

async function openStockGpt(page: import("@playwright/test").Page) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const response = await page.goto("/", { waitUntil: "domcontentloaded" });
  expect(response?.ok()).toBeTruthy();
  await page.waitForTimeout(750);
}

test.describe("Stock GPT verified-data safety E2E", () => {
  test.describe.configure({ retries: 0 });

  test("approved Stock GPT desktop composition mounts while operational truth stays mounted", async ({ page }) => {
    await openStockGpt(page);

    await expect(page.getByTestId("stock-gpt-approved-layout")).toBeVisible();
    await expect(page.getByRole("heading", { name: "주식 전용 ChatGPT" })).toBeVisible();
    await expect(page.getByPlaceholder(/무엇을 분석할까요/)).toBeVisible();
    await expect(page.getByRole("button", { name: /오늘의 강한 종목 찾아줘/ })).toBeVisible();

    await expect(page.getByRole("button", { name: "새 분석" })).toBeVisible();
    await expect(page.getByRole("button", { name: "이전 대화" })).toBeVisible();
    await expect(page.getByRole("button", { name: "관심종목" })).toBeVisible();
    await expect(page.getByRole("button", { name: "보유종목" })).toBeVisible();
    await expect(page.getByRole("button", { name: "실시간 스캐너" })).toBeVisible();
    await expect(page.getByRole("button", { name: "알림 기록" })).toBeVisible();
    await expect(page.getByText("시장 상태", { exact: true })).toBeVisible();
    await expect(page.getByText("강한 섹터/테마 TOP 5", { exact: true })).toBeVisible();
    await expect(page.getByText("실시간 급상승 종목", { exact: true })).toBeVisible();
    await expect(page.getByText("위험 신호 종목", { exact: true })).toBeVisible();

    await expect(page.getByTestId("operational-truth-monitor-v20")).toHaveCount(1);
  });

  test("existing features open in the approved center workspace and truth modules stay connected", async ({ page }) => {
    await openStockGpt(page);

    await page.getByRole("button", { name: "관심종목" }).click();
    await expect(page.getByTestId("stock-gpt-watchlist-panel")).toBeVisible();

    await page.getByRole("button", { name: "보유종목" }).click();
    await expect(page.getByTestId("stock-gpt-holdings-panel")).toBeVisible();

    await page.getByRole("button", { name: "이전 대화" }).click();
    await expect(page.getByTestId("stock-gpt-history-panel")).toBeVisible();
    await expect(page.getByTestId("stock-gpt-transaction-history")).toBeVisible();

    await page.getByRole("button", { name: "실시간 스캐너" }).click();
    await expect(page.getByTestId("stock-gpt-real-scanner-panel")).toBeVisible();
    await expect(page.getByTestId("stock-gpt-v20-final-scanner")).toBeVisible();
    await expect(page.getByTestId("stock-gpt-intraday-pattern-panel")).toBeVisible();
    await expect(page.getByTestId("stock-gpt-bot-truth-panel")).toBeVisible();
    await expect(page.getByText("PRECHECK ≠ FINAL BUY")).toBeVisible();

    await page.getByRole("button", { name: "알림 기록" }).click();
    await expect(page.getByTestId("stock-gpt-alerts-panel")).toBeVisible();
    await expect(page.getByTestId("stock-gpt-live-volatility-alerts")).toBeVisible();
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
      await expect(page.getByText(/NO_DATA|실제 시세를 요청했습니다|가짜 캔들을 대신 넣지 않습니다/).first()).toBeVisible();
    }
  });
});