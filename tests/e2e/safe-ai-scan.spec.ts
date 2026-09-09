import { test, expect, type Page } from "@playwright/test";

const freshTimestamp = () => new Date().toISOString();

const makeVerifiedIdea = (
  symbol: string,
  name: string,
  score = 92,
  market: "KOREA" | "US" | "BTC" = "KOREA",
) => ({
  symbol,
  name,
  market,
  score,
  grade: "S",
  decision: "YES",
  price: market === "US" ? 150 : 75000,
  changePct: 2.4,
  entryLow: market === "US" ? 149 : 74800,
  entryHigh: market === "US" ? 151 : 75200,
  stop: market === "US" ? 145 : 73500,
  target1: market === "US" ? 160 : 78000,
  target2: market === "US" ? 165 : 80000,
  rsi: 58,
  rvol: 2.1,
  adx: 28,
  atrPct: 3.2,
  pattern: "BREAKOUT_RETEST",
  bullishReasons: ["VWAP 상단 유지", "RVOL 확장", "돌파 후 재확인"],
  riskReasons: [],
  thesis: "E2E 전용 검증 fixture",
  invalidation: market === "US" ? "145 하향 이탈" : "73500 하향 이탈",
  wouldBuy: true,
});

const scannerResponse = (topIdeas: unknown[], scannedAt = freshTimestamp()) => ({
  success: true,
  scannedAt,
  topIdeas,
});

async function openDashboardAndGetLauncher(page: Page) {
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.stack || error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(`console.error: ${message.text()}`);
  });

  const response = await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(750);

  const launcher = page.getByTestId("safe-ai-autotrade-launcher");
  if ((await launcher.count()) === 0) {
    const bodyText = (await page.locator("body").innerText().catch(() => "<body unavailable>"))
      .replace(/\s+/g, " ")
      .slice(0, 4000);
    throw new Error(
      [
        `Safe AI launcher missing. HTTP=${response?.status() ?? "unknown"}`,
        `URL=${page.url()}`,
        `RUNTIME=${runtimeErrors.join(" | ") || "none captured"}`,
        `BODY=${bodyText}`,
      ].join("\n"),
    );
  }

  await expect(launcher).toBeVisible();
  return launcher;
}

test.describe("Safe AI scan-to-review E2E", () => {
  test.describe.configure({ retries: 0 });

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
        body: JSON.stringify(scannerResponse([makeVerifiedIdea("005930", "E2E 검증종목")])),
      });
    });

    const launcher = await openDashboardAndGetLauncher(page);
    await launcher.click();

    const candidateButton = page.getByTestId("safe-ai-candidate-1");
    await expect(candidateButton).toBeVisible();
    await expect(candidateButton).toContainText("E2E 검증종목");
    await expect(candidateButton).toContainText("REVIEW_READY");
    await expect(candidateButton).toContainText("R:R 2.00");
    await expect(page.getByRole("heading", { name: /E2E 검증종목 005930/ })).toBeVisible();
    expect(scannerCalls).toBe(1);

    const finalReview = page.getByRole("button", { name: /이 종목 메인 차트로 이동/ });
    await expect(finalReview).toBeVisible();
    await finalReview.click();

    await expect(page.getByText(/메인 차트 검토 종목으로 선택했습니다/).first()).toBeVisible();
    await expect(page.getByText(/AI가 브로커 주문을 직접 전송하지 않습니다/).first()).toBeVisible();
  });

  test("missing verified metrics fail closed instead of fabricating a review-ready candidate", async ({ page }) => {
    await page.route("**/api/explainable-scanner**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(scannerResponse([
          {
            symbol: "TEST-MISSING",
            name: "불완전 데이터",
            market: "US",
            score: 91,
            price: 100,
            wouldBuy: true,
          },
        ])),
      });
    });

    const launcher = await openDashboardAndGetLauncher(page);
    await launcher.click();

    const rejectedCandidate = page.getByTestId("safe-ai-candidate-1");
    await expect(rejectedCandidate).toBeVisible();
    await expect(rejectedCandidate).toContainText("불완전 데이터");
    await expect(rejectedCandidate).toContainText("NO ·");
    await expect(page.getByRole("heading", { name: /불완전 데이터 TEST-MISSING/ })).toBeVisible();

    const riskPanel = page.getByText("위험 / 미충족 조건").locator("..");
    await expect(riskPanel).toContainText("RSI 실측값이 확인되지 않았습니다");
    await expect(riskPanel).toContainText("RVOL 실측값이 확인되지 않았습니다");
    await expect(page.getByText(/REVIEW_READY/)).toHaveCount(0);
  });

  test("market controls request KOREA, US and BTC explicitly and clear prior market results", async ({ page }) => {
    const requestedMarkets: string[] = [];

    await page.route("**/api/explainable-scanner**", async (route) => {
      const requestUrl = new URL(route.request().url());
      requestedMarkets.push(requestUrl.searchParams.get("market") || "");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(scannerResponse([])),
      });
    });

    const launcher = await openDashboardAndGetLauncher(page);

    for (const [testId, expectedMarket] of [
      ["safe-ai-market-korea", "KOREA"],
      ["safe-ai-market-us", "US"],
      ["safe-ai-market-btc", "BTC"],
    ] as const) {
      await page.getByTestId(testId).click();
      await expect(page.getByTestId(testId)).toHaveAttribute("aria-pressed", "true");
      await launcher.click();
      await expect(page.getByTestId("safe-ai-empty-state")).toBeVisible();
      expect(requestedMarkets.at(-1)).toBe(expectedMarket);
    }

    expect(requestedMarkets).toEqual(["KOREA", "US", "BTC"]);
  });

  test("TOP 5 ranking keeps the strongest five verified candidates and omits the sixth", async ({ page }) => {
    await page.route("**/api/explainable-scanner**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(scannerResponse([
          makeVerifiedIdea("TOP-6", "후보6", 90),
          makeVerifiedIdea("TOP-3", "후보3", 96),
          makeVerifiedIdea("TOP-1", "후보1", 99),
          makeVerifiedIdea("TOP-5", "후보5", 92),
          makeVerifiedIdea("TOP-2", "후보2", 98),
          makeVerifiedIdea("TOP-4", "후보4", 94),
        ])),
      });
    });

    const launcher = await openDashboardAndGetLauncher(page);
    await launcher.click();

    await expect(page.getByTestId("safe-ai-candidate-1")).toContainText("TOP-1");
    await expect(page.getByTestId("safe-ai-candidate-2")).toContainText("TOP-2");
    await expect(page.getByTestId("safe-ai-candidate-3")).toContainText("TOP-3");
    await expect(page.getByTestId("safe-ai-candidate-4")).toContainText("TOP-4");
    await expect(page.getByTestId("safe-ai-candidate-5")).toContainText("TOP-5");
    await expect(page.getByTestId("safe-ai-candidate-6")).toHaveCount(0);
    await expect(page.getByText("TOP-6")).toHaveCount(0);
  });

  test("empty production scanner response stays empty without synthetic fallback candidates", async ({ page }) => {
    await page.route("**/api/explainable-scanner**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(scannerResponse([])),
      });
    });

    const launcher = await openDashboardAndGetLauncher(page);
    await launcher.click();

    const emptyState = page.getByTestId("safe-ai-empty-state");
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText("임의 후보나 임의 지표값은 생성하지 않았습니다");
    await expect(page.locator('[data-testid^="safe-ai-candidate-"]')).toHaveCount(0);
  });

  test("stale scanner timestamp downgrades otherwise valid candidates to NO", async ({ page }) => {
    const staleTimestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    await page.route("**/api/explainable-scanner**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(scannerResponse([
          makeVerifiedIdea("STALE-1", "오래된 검증후보", 99),
        ], staleTimestamp)),
      });
    });

    const launcher = await openDashboardAndGetLauncher(page);
    await launcher.click();

    const warning = page.getByTestId("safe-ai-freshness-warning");
    await expect(warning).toBeVisible();
    await expect(warning).toContainText(/분 전 데이터라 실시간 검토 대상에서 차단했습니다/);

    const staleCandidate = page.getByTestId("safe-ai-candidate-1");
    await expect(staleCandidate).toContainText("NO ·");
    await expect(staleCandidate).not.toContainText("REVIEW_READY");
    await expect(page.getByText(/실시간성 차단/)).toBeVisible();
    await expect(page.getByText(/검토 가능:\s*0/)).toBeVisible();
  });

  test("scanner API failure clears stale UI state and a second click can retry successfully", async ({ page }) => {
    let calls = 0;

    await page.route("**/api/explainable-scanner**", async (route) => {
      calls += 1;
      if (calls === 1) {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ success: false, message: "E2E scanner unavailable" }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(scannerResponse([
          makeVerifiedIdea("RETRY-1", "재시도 성공후보", 97),
        ])),
      });
    });

    const launcher = await openDashboardAndGetLauncher(page);
    await launcher.click();

    await expect(page.getByTestId("safe-ai-scan-error")).toContainText("E2E scanner unavailable");
    await expect(page.locator('[data-testid^="safe-ai-candidate-"]')).toHaveCount(0);

    await launcher.click();

    await expect(page.getByTestId("safe-ai-scan-error")).toHaveCount(0);
    await expect(page.getByTestId("safe-ai-candidate-1")).toContainText("재시도 성공후보");
    await expect(page.getByTestId("safe-ai-candidate-1")).toContainText("REVIEW_READY");
    expect(calls).toBe(2);
  });
});
