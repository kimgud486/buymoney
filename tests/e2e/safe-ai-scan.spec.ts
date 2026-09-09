import { test, expect } from "@playwright/test";

const VERIFIED_SCANNER_RESPONSE = {
  success: true,
  scannedAt: "2026-09-10T06:30:00+09:00",
  topIdeas: [
    {
      symbol: "005930",
      name: "E2E 검증종목",
      market: "KOREA",
      score: 92,
      grade: "S",
      decision: "YES",
      price: 75000,
      changePct: 2.4,
      entryLow: 74800,
      entryHigh: 75200,
      stop: 73500,
      target1: 78000,
      target2: 80000,
      rsi: 58,
      rvol: 2.1,
      adx: 28,
      atrPct: 3.2,
      pattern: "BREAKOUT_RETEST",
      bullishReasons: ["VWAP 상단 유지", "RVOL 확장", "돌파 후 재확인"],
      riskReasons: [],
      thesis: "E2E 전용 검증 fixture",
      invalidation: "73500 하향 이탈",
      wouldBuy: true,
    },
  ],
};

test.describe("Safe AI scan-to-review E2E", () => {
  test("launcher calls explainable scanner, ranks verified candidate, and moves it to final chart review", async ({ page }) => {
    let scannerCalls = 0;

    await page.route("**/api/explainable-scanner**", async (route) => {
      scannerCalls += 1;
      const requestUrl = new URL(route.request().url());
      expect(requestUrl.searchParams.get("market")).toBe("ALL");
      expect(requestUrl.searchParams.get("aiExplain")).toBe("true");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(VERIFIED_SCANNER_RESPONSE),
      });
    });

    await page.goto("/");

    const launcher = page.getByTestId("safe-ai-autotrade-launcher");
    await expect(launcher).toBeVisible();
    await launcher.click();

    await expect(page.getByText("E2E 검증종목")).toBeVisible();
    await expect(page.getByText(/REVIEW_READY/)).toBeVisible();
    await expect(page.getByText(/R:R 2\.00/)).toBeVisible();
    expect(scannerCalls).toBe(1);

    const finalReview = page.getByRole("button", { name: /이 종목 메인 차트로 이동/ });
    await expect(finalReview).toBeVisible();
    await finalReview.click();

    await expect(page.getByText(/메인 차트 검토 종목으로 선택했습니다/)).toBeVisible();
    await expect(page.getByText(/AI가 브로커 주문을 직접 전송하지 않습니다/)).toBeVisible();
  });

  test("missing verified metrics fail closed instead of fabricating a review-ready candidate", async ({ page }) => {
    await page.route("**/api/explainable-scanner**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          scannedAt: "2026-09-10T06:31:00+09:00",
          topIdeas: [
            {
              symbol: "TEST-MISSING",
              name: "불완전 데이터",
              market: "US",
              score: 91,
              price: 100,
              wouldBuy: true,
            },
          ],
        }),
      });
    });

    await page.goto("/");
    await page.getByTestId("safe-ai-autotrade-launcher").click();

    await expect(page.getByText("불완전 데이터")).toBeVisible();
    await expect(page.getByText(/NO ·/)).toBeVisible();
    await expect(page.getByText(/RSI 실측값이 확인되지 않았습니다/)).toBeVisible();
    await expect(page.getByText(/RVOL 실측값이 확인되지 않았습니다/)).toBeVisible();
    await expect(page.getByText(/REVIEW_READY/)).toHaveCount(0);
  });
});
