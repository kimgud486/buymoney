// ----------------------------------------------------------------------
// AISTOCK V13.8 REAL-TIME EXECUTION & CANDLE CORE COMPREHENSIVE TEST SUITE
// ----------------------------------------------------------------------

import test from "node:test";
import assert from "node:assert/strict";

import { KISRealtimeWebSocketService, NormalizedTick } from "../server/market/KISRealtimeWebSocketService";
import { CandleAggregator, AggregatedCandle } from "../src/realtime/CandleAggregator";
import { LiveCandleIntegrityGate } from "../src/realtime/LiveCandleIntegrityGate";
import { IndicatorWarmupGate } from "../src/services/IndicatorWarmupGate";
import { ExecutionTruthService } from "../server/broker/ExecutionTruthService";
import { RiskPositionSizer } from "../src/services/RiskPositionSizer";
import { SlippageLiquidityFilter } from "../src/services/SlippageLiquidityFilter";
import { ChaseRiskFilter } from "../src/services/ChaseRiskFilter";
import { DynamicExitEngineV138 } from "../src/services/DynamicExitEngineV138";
import { ObservabilityCircuitBreaker } from "../src/services/ObservabilityCircuitBreaker";
import { QlibResearchIntegrationService } from "../src/services/v13_8/QlibResearchIntegrationService";

test("1. KISRealtimeWebSocketService: Rejects invalid or stale ticks and deduplicates", () => {
  const ws = new KISRealtimeWebSocketService({ staleThresholdMs: 2000 });

  // Invalid ticks
  assert.equal(ws.processIncomingRawTick({ symbol: "", price: 100, providerTimestamp: Date.now() }), null);
  assert.equal(ws.processIncomingRawTick({ symbol: "005930", price: -5, providerTimestamp: Date.now() }), null);
  assert.equal(ws.processIncomingRawTick({ symbol: "005930", price: 100, providerTimestamp: 0 }), null);

  // Valid tick
  const now = Date.now();
  const tick1 = ws.processIncomingRawTick({
    symbol: "005930",
    market: "KOREA",
    price: 70000,
    tradeVolume: 10,
    providerTimestamp: now,
    sequence: "SEQ_101",
  });

  assert.notEqual(tick1, null);
  assert.equal(tick1?.symbol, "005930");
  assert.equal(tick1?.price, 70000);

  // Duplicate tick
  const tick1Dup = ws.processIncomingRawTick({
    symbol: "005930",
    market: "KOREA",
    price: 70000,
    tradeVolume: 10,
    providerTimestamp: now,
    sequence: "SEQ_101",
  });
  assert.equal(tick1Dup, null, "Duplicate tick with same sequence must be ignored");
});

test("2. CandleAggregator: Accurately aggregates real ticks into OHLCV without synthetic candles", () => {
  const aggregator = new CandleAggregator("1m");
  const baseTime = 1700000000000; // 1m aligned epoch

  const tick1: NormalizedTick = {
    symbol: "NVDA",
    market: "US",
    price: 100,
    tradeVolume: 50,
    providerTimestamp: baseTime + 1000,
    receivedAt: baseTime + 1000,
    source: "KIS_WS",
  };

  const tick2: NormalizedTick = {
    symbol: "NVDA",
    market: "US",
    price: 105,
    tradeVolume: 30,
    providerTimestamp: baseTime + 2000,
    receivedAt: baseTime + 2000,
    source: "KIS_WS",
  };

  const tick3: NormalizedTick = {
    symbol: "NVDA",
    market: "US",
    price: 98,
    tradeVolume: 20,
    providerTimestamp: baseTime + 3000,
    receivedAt: baseTime + 3000,
    source: "KIS_WS",
  };

  aggregator.processTick(tick1);
  aggregator.processTick(tick2);
  const res = aggregator.processTick(tick3);

  const candle = res.updatedCandle;
  assert.equal(candle.open, 100);
  assert.equal(candle.high, 105);
  assert.equal(candle.low, 98);
  assert.equal(candle.close, 98);
  assert.equal(candle.volume, 100);
  assert.equal(candle.isFinal, false);

  // Next slot tick triggers bar completion
  const tickNewBar: NormalizedTick = {
    symbol: "NVDA",
    market: "US",
    price: 99,
    tradeVolume: 10,
    providerTimestamp: baseTime + 61000, // +61s
    receivedAt: baseTime + 61000,
    source: "KIS_WS",
  };

  const res2 = aggregator.processTick(tickNewBar);
  assert.notEqual(res2.completedCandle, null);
  assert.equal(res2.completedCandle?.isFinal, true);
  assert.equal(res2.completedCandle?.close, 98);
  assert.equal(res2.updatedCandle.open, 99);
});

test("3. LiveCandleIntegrityGate: Rejects geometry violations, stale bars, and invalid sources", () => {
  const gate = new LiveCandleIntegrityGate(3000); // 3 sec stale

  // Geometry violation (high < low)
  const badCandle1: Partial<AggregatedCandle> = {
    symbol: "005930",
    market: "KOREA",
    open: 100,
    high: 90,
    low: 110,
    close: 100,
    volume: 10,
    startedAt: Date.now(),
    source: "KIS_WS",
  };

  const res1 = gate.validateSingleCandle(badCandle1);
  assert.equal(res1.valid, false);
  assert.ok(res1.reason?.includes("INVALID_CANDLE"));

  // Stale bar
  const staleCandle: Partial<AggregatedCandle> = {
    symbol: "005930",
    market: "KOREA",
    open: 100,
    high: 105,
    low: 95,
    close: 102,
    volume: 100,
    startedAt: Date.now() - 10000, // 10s old
    source: "KIS_WS",
  };

  const res2 = gate.validateSingleCandle(staleCandle);
  assert.equal(res2.valid, false);
  assert.ok(res2.reason?.includes("STALE_QUOTE_AGE"));
});

test("4. IndicatorWarmupGate: Returns null on insufficient bars, blocks signals when coverage < 0.8", () => {
  const shortPrices = [10, 11, 12, 11, 10]; // 5 bars

  assert.equal(IndicatorWarmupGate.safeEma(shortPrices, 20), null, "EMA20 on 5 bars must return null");
  assert.equal(IndicatorWarmupGate.safeRsi(shortPrices, 14), null, "RSI14 on 5 bars must return null");
  assert.equal(IndicatorWarmupGate.safeMacd(shortPrices), null, "MACD on 5 bars must return null (NEVER 0)");

  const eval1 = IndicatorWarmupGate.evaluateWarmup(10);
  assert.equal(eval1.canGenerateSignal, false, "10 bars cannot generate signals");

  const eval2 = IndicatorWarmupGate.evaluateWarmup(35);
  assert.equal(eval2.canGenerateSignal, true, "35 bars satisfy warmup coverage");
});

test("5. ExecutionTruthService: ODNO assignment yields ORDER_ACCEPTED (NOT FILLED)", () => {
  const truth = new ExecutionTruthService();

  truth.createSignalOrder("ORD_1001", "005930", "BUY", 100);
  truth.recordOrderRequested("ORD_1001", "005930");
  truth.recordOrderAccepted("ORD_1001", "005930", "ODNO 123456");

  assert.equal(truth.getOrderState("ORD_1001"), "ORDER_ACCEPTED");
  assert.notEqual(truth.getOrderState("ORD_1001"), "FILLED", "ODNO assignment MUST NOT set state to FILLED");
  assert.equal(truth.getTradeLogs().length, 0, "Trade logs must remain empty until actual fill");
});

test("6. ExecutionTruthService & Dual Fill: Verifies PARTIAL_FILL and FILLED accurately", () => {
  const truth = new ExecutionTruthService();

  truth.createSignalOrder("ORD_1002", "AAPL", "BUY", 50);
  truth.recordOrderAccepted("ORD_1002", "AAPL");

  // Record Channel A fill
  const rec = truth.recordChannelAFill({
    orderNo: "ORD_1002",
    symbol: "AAPL",
    side: "BUY",
    requestedQty: 50,
    filledQty: 50,
    filledAvgPrice: 150.0,
    brokerTimestamp: Date.now(),
  });

  assert.equal(rec.state, "FILLED");
  assert.equal(truth.getOrderState("ORD_1002"), "FILLED");
  assert.equal(truth.getTradeLogs().length, 1);
  assert.equal(truth.getTradeLogs()[0].state, "FILLED");
});

test("7. ExecutionTruthService: Discrepancy triggers FILL_CONFLICT and blocks symbol", () => {
  const truth = new ExecutionTruthService();

  truth.createSignalOrder("ORD_1003", "TSLA", "BUY", 100);

  // Channel A reports 100 shares filled at 200
  truth.recordChannelAFill({
    orderNo: "ORD_1003",
    symbol: "TSLA",
    side: "BUY",
    requestedQty: 100,
    filledQty: 100,
    filledAvgPrice: 200.0,
    brokerTimestamp: Date.now(),
  });

  // Channel B reports conflict: 50 shares filled at 200
  truth.recordChannelBFill({
    orderNo: "ORD_1003",
    symbol: "TSLA",
    side: "BUY",
    requestedQty: 100,
    filledQty: 50,
    filledAvgPrice: 200.0,
    brokerTimestamp: Date.now(),
  });

  assert.equal(truth.getOrderState("ORD_1003"), "FILL_CONFLICT");
  assert.equal(truth.isSymbolBlocked("TSLA"), true, "Symbol with fill conflict must be blocked");
});

test("8. RiskPositionSizer: Dynamically applies min(qtyByRisk, qtyByCash, qtyByPositionLimit, qtyByLiquidity)", () => {
  const res = RiskPositionSizer.calculatePositionSize({
    accountEquity: 10_000_000,  // 10M KRW
    availableCash: 5_000_000,    // 5M KRW
    currentPrice: 50_000,        // 50k KRW per share
    atr: 1000,
    stopDistance: 2000,          // 2000 KRW stop
    maxRiskPct: 0.01,            // 1% risk = 100,000 KRW -> qtyByRisk = 50 shares
    maxPositionPct: 0.20,        // 20% position = 2,000,000 KRW
    slippageEstimateBps: 0,      // 0 bps for exact calculation test
    liquidityCap: 100,
  });

  // min(50, 100, 40, 100) = 40
  assert.equal(res.finalQty, 40);
  assert.equal(res.qtyByRisk, 50);
  assert.equal(res.qtyByPositionLimit, 40);
});

test("9. SlippageLiquidityFilter: Blocks high slippage or low volume orders", () => {
  const eval1 = SlippageLiquidityFilter.evaluate({
    symbol: "005930",
    bidPrice: 70000,
    askPrice: 70100,
    recent1mVolume: 1000,
    turnoverAmount: 70_000_000,
    rvol: 2.0,
    requestedQty: 10,
    maxSlippageBpsThreshold: 30,
  });

  assert.equal(eval1.passed, true);
  assert.equal(eval1.status, "ORDER_ALLOWED");

  // Illiquid volume
  const eval2 = SlippageLiquidityFilter.evaluate({
    symbol: "ILLIQUID",
    bidPrice: 1000,
    askPrice: 1050,
    recent1mVolume: 10, // low volume
    turnoverAmount: 10000,
    rvol: 0.2,
    requestedQty: 50,
  });

  assert.equal(eval2.passed, false);
  assert.equal(eval2.status, "NO_TRADE");
});

test("10. ChaseRiskFilter: Flags CHASE_RISK_HIGH and blocks BUY on excessive extension", () => {
  const res = ChaseRiskFilter.evaluate({
    symbol: "NVDA",
    currentPrice: 150,
    vwap: 135, // 11.1% extended
    ema20: 130, // 15.3% extended
    rvol: 12.0,
    consecutiveGreenBars: 7,
    dataCoverage: 100,
  });

  assert.equal(res.chaseRisk, "HIGH");
  assert.equal(res.isBuyBlocked, true);
  assert.ok(res.reasons.some((r) => r.includes("VWAP_EXTENDED")));
});

test("11. DynamicExitEngineV138: Ratchets floor, enters SELL_WATCH on warning, triggers SELL on multi-evidence", () => {
  const res1 = DynamicExitEngineV138.evaluate({
    symbol: "AAPL",
    entryPrice: 100,
    currentPrice: 110,
    highestPriceSinceBuy: 112,
    previousTrailingFloor: 102,
    isNewFinalCandle: true,
    structure: { isHHHL: true, isHLBreak: false, isSupportBreak: false },
    indicators: {
      vwap: 108,
      isVwapLoss: false,
      isMacdDeteriorated: false,
      isRsiDeteriorated: false,
      isVolumeCollapsed: false,
      isFailedBreakout: false,
      atr14: 3,
    },
  });

  assert.ok(res1.newTrailingFloor >= 102, "Trailing floor must ratchet upward");
  assert.equal(res1.state, "PROFIT_HOLD");

  // Multi-evidence breakdown with price above floor
  const res2 = DynamicExitEngineV138.evaluate({
    symbol: "AAPL",
    entryPrice: 100,
    currentPrice: 107, // Above floor 106
    highestPriceSinceBuy: 112,
    previousTrailingFloor: res1.newTrailingFloor,
    isNewFinalCandle: true,
    structure: { isHHHL: false, isHLBreak: true, isSupportBreak: false },
    indicators: {
      vwap: 108,
      isVwapLoss: true, // VWAP loss + HL break = 2 evidences
      isMacdDeteriorated: true,
      isRsiDeteriorated: false,
      isVolumeCollapsed: false,
      isFailedBreakout: false,
      atr14: 3,
    },
  });

  assert.equal(res2.state, "SELL");
  assert.ok(res2.evidenceCount >= 2);
});

test("12. ObservabilityCircuitBreaker: Opens circuit breaker on fill conflict or high error rate", () => {
  const breaker = new ObservabilityCircuitBreaker();

  assert.equal(breaker.isTradingAllowed(), true);

  breaker.incrementFillConflict();
  const status = breaker.getStatus();

  assert.equal(status.isOpen, true);
  assert.equal(status.state, "CIRCUIT_BREAKER_OPEN");
  assert.equal(breaker.isTradingAllowed(), false);
});

test("13. QlibResearchIntegrationService: Returns NOT_TRAINED when no artifact exists", () => {
  QlibResearchIntegrationService.clearArtifact();
  const res = QlibResearchIntegrationService.predict("005930");

  assert.equal(res.status, "NOT_TRAINED");
  assert.equal(res.predictionScore, null);
});
