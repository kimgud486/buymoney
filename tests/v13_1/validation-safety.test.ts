// AISTOCK v13.1 Validation & Safety Engine Unit & Integration Test Suite
// Standard Node.js Test Runner (node:test)

import { test, describe } from "node:test";
import assert from "node:assert";

import { FreshnessAndCompletedBarGateV131 } from "../../src/services/v13_1/FreshnessAndCompletedBarGateV131";
import { UsExchangeRouterV131 } from "../../src/services/v13_1/UsExchangeRouterV131";
import { CompletedBarBuyGateV131 } from "../../src/services/v13_1/CompletedBarBuyGateV131";
import { PendingOrderCoordinatorV131 } from "../../src/services/v13_1/PendingOrderCoordinatorV131";
import { PartialFillAccountingV131 } from "../../src/services/v13_1/PartialFillAccountingV131";
import { PendingOrderStoreV131 } from "../../src/services/v13_1/PendingOrderStoreV131";
import { ValidationSafetyEngineV131 } from "../../src/services/v13_1/ValidationSafetyEngineV131";
import { RealTimePriceFeedV131, CandleOHLCV131, PendingOrderV131 } from "../../src/services/v13_1/typesV131";
import { CalculatedIndicatorsV13 } from "../../src/services/v13/TechnicalAnalysisEngineV13";

describe("AISTOCK v13.1 Validation & Safety Engine Test Suite", () => {

  test("1. Freshness Gate: Rejects stale data (>15s)", () => {
    const staleFeed: RealTimePriceFeedV131 = {
      symbol: "AAPL",
      name: "Apple Inc",
      market: "US",
      currentPrice: 180,
      changeRatePct: 1.2,
      volume: 100000,
      tradingValueKRW: 24000000,
      candles: Array.from({ length: 50 }, (_, i) => ({
        time: i, open: 175, high: 181, low: 174, close: 180, volume: 1000, isClosed: true
      })),
      lastUpdatedTimestamp: Date.now() - 20000 // 20s old
    };

    const res = FreshnessAndCompletedBarGateV131.evaluate(staleFeed);
    assert.strictEqual(res.allowTrading, false);
    assert.strictEqual(res.reasonCode, "STALE_DATA");
  });

  test("2. Completed Bar Gate: Rejects feeds with <50 completed bars", () => {
    const insufficientFeed: RealTimePriceFeedV131 = {
      symbol: "005930",
      name: "삼성전자",
      market: "KOREA",
      currentPrice: 70000,
      changeRatePct: 0.5,
      volume: 500000,
      tradingValueKRW: 35000000000,
      candles: Array.from({ length: 30 }, (_, i) => ({
        time: i, open: 69000, high: 70500, low: 68900, close: 70000, volume: 10000, isClosed: true
      })),
      lastUpdatedTimestamp: Date.now()
    };

    const res = FreshnessAndCompletedBarGateV131.evaluate(insufficientFeed);
    assert.strictEqual(res.allowTrading, false);
    assert.strictEqual(res.reasonCode, "INSUFFICIENT_COMPLETED_BARS");
    assert.strictEqual(res.completedBarCount, 30);
  });

  test("3. US Exchange Router: Resolves NASD/NYSE/AMEX and rejects UNKNOWN or Crypto", () => {
    const nasRes = UsExchangeRouterV131.routeExchange("US", "NASDAQ");
    assert.strictEqual(nasRes.isValid, true);
    assert.strictEqual(nasRes.resolvedExchange, "NASD");

    const nyseRes = UsExchangeRouterV131.routeExchange("US", "NYS");
    assert.strictEqual(nyseRes.isValid, true);
    assert.strictEqual(nyseRes.resolvedExchange, "NYSE");

    const amexRes = UsExchangeRouterV131.routeExchange("US", "AMS");
    assert.strictEqual(amexRes.isValid, true);
    assert.strictEqual(amexRes.resolvedExchange, "AMEX");

    const unknownRes = UsExchangeRouterV131.routeExchange("US", "INVALID_EX");
    assert.strictEqual(unknownRes.isValid, false);
    assert.strictEqual(unknownRes.resolvedExchange, "UNKNOWN");

    const cryptoRes = UsExchangeRouterV131.routeExchange("BTC", "UPBIT", "KRW-BTC");
    assert.strictEqual(cryptoRes.allowKisRouting, false);
    assert.strictEqual(cryptoRes.isCrypto, true);
  });

  test("4. Individual Indicator Check: High scores with MACD=false results in BUY WATCH (NO BUY APPROVED)", () => {
    const mockIndicators: CalculatedIndicatorsV13 = {
      vwap: 100,
      ema9: 102,
      ema20: 101,
      ema50: 98,
      ema200: 90,
      macdLine: 1.5,
      macdSignal: 2.0,
      macdHist: -0.5,
      rsi14: 55,
      adx14: 30,
      plusDI14: 25,
      minusDI14: 15,
      atr14: 2.5,
      rvol: 1.5,
      structure: "HH_HL",
      isVwapAbove: true,
      isEmaBullishTrend: true,
      isMacdBullishCross: false, // ❌ MACD Failure
      dataValid: true,
      candleCount: 50
    };

    const res = CompletedBarBuyGateV131.evaluate({
      symbol: "NVDA",
      name: "NVIDIA",
      market: "US",
      exchange: "NASD",
      currentPrice: 105,
      scannerScore: 90,
      unifiedShapeScore: 91,
      confirmationScore: 92,
      direction: "BULLISH",
      indicators: mockIndicators,
      freshness: {
        isValid: true,
        isStale: false,
        staleSeconds: 2,
        completedBarCount: 50,
        totalBarCount: 50,
        allowTrading: true,
        reasonCode: "OK",
        message: "OK"
      },
      exchangeRoute: {
        isValid: true,
        market: "US",
        resolvedExchange: "NASD",
        isCrypto: false,
        allowKisRouting: true
      },
      riskApproved: true
    });

    assert.strictEqual(res.approved, false);
    assert.strictEqual(res.decision, "BUY WATCH");
    assert.ok(res.failedChecks.includes("MACD_NO_BULL_CROSS"));
  });

  test("5. Duplicate Order Guard & Partial Fill Accounting", () => {
    const store = new PendingOrderStoreV131();
    const coordinator = new PendingOrderCoordinatorV131(store);

    // Initial check: No duplicate
    const check1 = coordinator.assertNoDuplicate("US", "AAPL", "BUY");
    assert.strictEqual(check1.allowed, true);

    // Register AAPL BUY order
    const order = coordinator.registerAcceptedOrder({
      odno: "ODNO_10001",
      symbol: "AAPL",
      name: "Apple Inc",
      market: "US",
      exchange: "NASD",
      side: "BUY",
      orderQty: 10,
      orderPrice: 150
    });

    // Second check: Duplicate detected!
    const check2 = coordinator.assertNoDuplicate("US", "AAPL", "BUY");
    assert.strictEqual(check2.allowed, false);

    // Position creation before fill: NOT ALLOWED
    assert.strictEqual(PartialFillAccountingV131.canCreatePosition(order), false);

    // Partial fill 1: 3 shares @ 149
    const fill1Res = coordinator.applyCumulativeFill("US", "AAPL", "BUY", 3, 149);
    assert.strictEqual(fill1Res.order?.status, "PARTIAL");
    assert.strictEqual(fill1Res.order?.filledQty, 3);
    assert.strictEqual(fill1Res.canCreatePosition, false);

    // Partial fill 2: 7 shares cumulative @ 149.50
    const fill2Res = coordinator.applyCumulativeFill("US", "AAPL", "BUY", 7, 149.50);
    assert.strictEqual(fill2Res.order?.status, "PARTIAL");
    assert.strictEqual(fill2Res.order?.filledQty, 7);
    assert.strictEqual(fill2Res.canCreatePosition, false);

    // Final fill 3: 10 shares cumulative @ 150
    const fill3Res = coordinator.applyCumulativeFill("US", "AAPL", "BUY", 10, 150);
    assert.strictEqual(fill3Res.order?.status, "FILLED");
    assert.strictEqual(fill3Res.order?.filledQty, 10);
    assert.strictEqual(fill3Res.canCreatePosition, true);
  });

  test("6. ValidationSafetyEngineV131 Master Integration Pipeline", () => {
    const engine = new ValidationSafetyEngineV131();

    const validFeed: RealTimePriceFeedV131 = {
      symbol: "005930",
      name: "삼성전자",
      market: "KOREA",
      currentPrice: 72000,
      changeRatePct: 1.5,
      volume: 1000000,
      tradingValueKRW: 72000000000,
      candles: Array.from({ length: 55 }, (_, i) => ({
        time: i, open: 71000 + i * 10, high: 71500 + i * 10, low: 70900 + i * 10, close: 71200 + i * 10, volume: 10000 + i * 100, isClosed: true
      })),
      lastUpdatedTimestamp: Date.now()
    };

    const report = engine.evaluateBuy({
      feed: validFeed,
      scannerScore: 85,
      unifiedShapeScore: 80,
      confirmationScore: 78,
      direction: "BULLISH",
      riskApproved: true
    });

    assert.strictEqual(report.freshness.allowTrading, true);
    assert.strictEqual(report.exchangeRoute.allowKisRouting, true);
    assert.ok(report.freshness.completedBarCount >= 50);
  });
});
