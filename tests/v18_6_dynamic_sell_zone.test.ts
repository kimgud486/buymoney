// ----------------------------------------------------------------------
// AISTOCK V18.6 DYNAMIC SELL ZONE & POSITION METRICS TEST SUITE
// Tests Monotonic Defense SELL Ratchet, Statistical Expected SELL Zone,
// MAE/MFE Tracking, Reversible SELL_WATCH, and Fast-Path Tick Safety
// ----------------------------------------------------------------------

import test from "node:test";
import assert from "node:assert/strict";

import { DynamicSellZoneEngine } from "../src/services/DynamicSellZoneEngine";
import { LivePositionRuntimeService, LivePosition, VerifiedMarketSnapshot } from "../src/trading/LivePositionRuntimeService";
import { ExitEvidenceEngine } from "../src/services/ExitEvidenceEngine";
import { PositionStateMachine } from "../src/trading/PositionStateMachine";
import { Candle } from "../src/services/StructureBrain";

function createMockCandle(time: number, close: number, high?: number, low?: number): Candle {
  return {
    time,
    timestamp: time,
    open: close,
    high: high ?? close * 1.005,
    low: low ?? close * 0.995,
    close,
    volume: 10000
  };
}

test("Requirement 1: Defense SELL Floor follows monotonic ratchet principle (NEVER decreases)", () => {
  const result1 = DynamicSellZoneEngine.evaluate({
    symbol: "005930",
    entryPrice: 500,
    currentPrice: 530,
    highestPriceSinceBuy: 535,
    lowestPriceSinceBuy: 498,
    previousDefenseSell: 510,
    atr14: 10,
    vwap: 525,
    ema9: 528,
    ema20: 522,
    ema50: 515,
    lastSwingLow: 512,
    lastSwingHigh: 535,
    rvol: 2.0,
    rs5m: 70,
    rs15m: 65,
    structureTrend: "BULLISH",
    orderFlowStrength: "STRONG",
    exitRiskScore: 10
  });

  assert.ok(result1.defenseSellPrice >= 510, "Defense Sell Floor must be >= previous 510");
  const newFloor = result1.defenseSellPrice;

  // Pullback scenario: price drops to 520
  const result2 = DynamicSellZoneEngine.evaluate({
    symbol: "005930",
    entryPrice: 500,
    currentPrice: 520,
    highestPriceSinceBuy: 535,
    lowestPriceSinceBuy: 498,
    previousDefenseSell: newFloor, // previous floor
    atr14: 10,
    vwap: 522,
    ema9: 524,
    ema20: 520,
    ema50: 515,
    lastSwingLow: 512,
    lastSwingHigh: 535,
    rvol: 1.5,
    rs5m: 55,
    rs15m: 60,
    structureTrend: "BULLISH",
    orderFlowStrength: "NORMAL",
    exitRiskScore: 25
  });

  assert.equal(result2.defenseSellPrice, newFloor, "Defense Sell Floor MUST NOT decrease during price pullback");
});

test("Requirement 2: Expected SELL Zone calculates valid multi-projection distribution P25/P50/P75", () => {
  const result = DynamicSellZoneEngine.evaluate({
    symbol: "005930",
    entryPrice: 500,
    currentPrice: 530,
    highestPriceSinceBuy: 535,
    lowestPriceSinceBuy: 498,
    previousDefenseSell: 510,
    atr14: 10,
    vwap: 525,
    ema9: 528,
    ema20: 522,
    ema50: 515,
    lastSwingLow: 500,
    lastSwingHigh: 535,
    rvol: 2.2,
    rs5m: 75,
    rs15m: 70,
    structureTrend: "BULLISH",
    orderFlowStrength: "STRONG",
    exitRiskScore: 10
  });

  assert.ok(result.expectedSellLow != null);
  assert.ok(result.expectedSellMid != null);
  assert.ok(result.expectedSellHigh != null);

  assert.ok(result.expectedSellLow > 530, "Expected Sell Low must be strictly above current price");
  assert.ok(result.expectedSellLow <= result.expectedSellMid, "P25 <= P50");
  assert.ok(result.expectedSellMid <= result.expectedSellHigh, "P50 <= P75");
  assert.ok(result.continuationScore >= 70, "Strong trend yields high continuation score");
});

test("Requirement 3: Entering Expected SELL Zone with strong trend expands zone upward without automatic SELL", () => {
  const result1 = DynamicSellZoneEngine.evaluate({
    symbol: "NVDA",
    entryPrice: 100,
    currentPrice: 110,
    highestPriceSinceBuy: 112,
    lowestPriceSinceBuy: 99,
    previousDefenseSell: 105,
    atr14: 3,
    vwap: 108,
    ema9: 109,
    ema20: 107,
    ema50: 104,
    lastSwingLow: 103,
    lastSwingHigh: 112,
    rvol: 2.5,
    rs5m: 80,
    rs15m: 80,
    structureTrend: "BULLISH",
    orderFlowStrength: "STRONG",
    exitRiskScore: 5
  });

  const firstMid = result1.expectedSellMid!;

  // Price surges to 115 (entering previous expected zone) with continued strong momentum
  const result2 = DynamicSellZoneEngine.evaluate({
    symbol: "NVDA",
    entryPrice: 100,
    currentPrice: 115,
    highestPriceSinceBuy: 116,
    lowestPriceSinceBuy: 99,
    previousDefenseSell: result1.defenseSellPrice,
    atr14: 3.5,
    vwap: 112,
    ema9: 113,
    ema20: 110,
    ema50: 106,
    lastSwingLow: 108,
    lastSwingHigh: 116,
    rvol: 3.0,
    rs5m: 85,
    rs15m: 82,
    structureTrend: "BULLISH",
    orderFlowStrength: "STRONG",
    exitRiskScore: 5
  });

  assert.ok(result2.expectedSellMid! > firstMid, "Expected Zone expands upward when trend continuation remains strong");
});

test("Requirement 4: Accurate MAE & MFE tracking using highest and lowest prices", () => {
  const evidence = ExitEvidenceEngine.evaluate({
    currentPrice: 530,
    entryPrice: 500,
    highestPriceSinceBuy: 560,
    lowestPriceSinceBuy: 480, // -4.0% MAE
    initialStopPrice: 475,
    trailingFloorPrice: 520,
    structureValid: true,
    bearishChoch: false,
    swingLowBreak: false,
    aboveVWAP: true,
    aboveEMA20: true,
    macdWeakening: false,
    rsiWeakening: false,
    bearishCandlePatterns: [],
    orderFlowReversal: false,
    cvdDivergence: false,
    relativeStrengthLoss: false,
    marketWeakness: false
  });

  assert.equal(evidence.peakMetrics.mfePct, 12.0); // (560 - 500) / 500 = +12.0%
  assert.equal(evidence.peakMetrics.maePct, -4.0); // (480 - 500) / 500 = -4.0%
  assert.equal(evidence.peakMetrics.currentProfitPct, 6.0); // (530 - 500) / 500 = +6.0%
  assert.equal(evidence.peakMetrics.givebackPct, 6.0); // 12% peak - 6% current = 6% giveback
});

test("Requirement 5: Fast-path tick breach triggers SELL_PENDING, NOT immediate CLOSED", () => {
  const service = new LivePositionRuntimeService();

  const pos: LivePosition = {
    positionId: "POS_001",
    symbol: "005930",
    strategyId: "SCALPER_V18",
    state: "HOLD",
    entryPrice: 500,
    highestPriceSinceBuy: 520,
    lowestPriceSinceBuy: 495,
    initialStopPrice: 480,
    trailingFloor: 510,
    defenseSellPrice: 510,
    expectedSellLow: 525,
    expectedSellMid: 530,
    expectedSellHigh: 540,
    continuationScore: 70,
    quantities: {
      requestedBuyQty: 100,
      buyFilledQty: 100,
      currentPositionQty: 100,
      requestedSellQty: 100,
      sellFilledQty: 0,
      remainingPositionQty: 100
    },
    lastExitEvidence: null,
    updatedAt: Date.now()
  };

  service.registerPosition(pos);

  // Tick breaches defense sell floor (505 < 510)
  const evalResult = service.onVerifiedTick("POS_001", 505);

  assert.equal(evalResult.nextState, "SELL_PENDING");
  assert.equal(evalResult.actionRequired, "SUBMIT_SELL_ORDER");

  const updatedPos = service.getPosition("POS_001")!;
  assert.equal(updatedPos.state, "SELL_PENDING");
  assert.notEqual(updatedPos.state, "CLOSED", "Tick breach must transition to SELL_PENDING, NOT CLOSED directly");
});

test("Requirement 6: Position state transitions to CLOSED ONLY upon broker execution notice", () => {
  const service = new LivePositionRuntimeService();

  const pos: LivePosition = {
    positionId: "POS_002",
    symbol: "005930",
    strategyId: "SCALPER_V18",
    state: "SELL_PENDING",
    entryPrice: 500,
    highestPriceSinceBuy: 520,
    lowestPriceSinceBuy: 495,
    initialStopPrice: 480,
    trailingFloor: 510,
    defenseSellPrice: 510,
    expectedSellLow: 525,
    expectedSellMid: 530,
    expectedSellHigh: 540,
    continuationScore: 70,
    quantities: {
      requestedBuyQty: 100,
      buyFilledQty: 100,
      currentPositionQty: 100,
      requestedSellQty: 100,
      sellFilledQty: 0,
      remainingPositionQty: 100
    },
    lastExitEvidence: null,
    updatedAt: Date.now()
  };

  service.registerPosition(pos);

  // Broker sends execution notice for full sell fill
  service.onBrokerExecutionNotice("POS_002", {
    noticeId: "EXEC_001",
    symbol: "005930",
    side: "SELL",
    execQty: 100,
    execPrice: 508,
    remainingQty: 0,
    timestamp: Date.now()
  });

  const updatedPos = service.getPosition("POS_002")!;
  assert.equal(updatedPos.state, "CLOSED");
  assert.equal(updatedPos.quantities.remainingPositionQty, 0);
  assert.equal(updatedPos.quantities.sellFilledQty, 100);
});

test("Requirement 7: Unverified snapshot or NO_DATA yields safety default without fake zones", () => {
  const service = new LivePositionRuntimeService();

  const pos: LivePosition = {
    positionId: "POS_003",
    symbol: "AAPL",
    strategyId: "SWING_V18",
    state: "HOLD",
    entryPrice: 150,
    highestPriceSinceBuy: 150,
    lowestPriceSinceBuy: 150,
    initialStopPrice: 140,
    trailingFloor: 140,
    defenseSellPrice: 140,
    expectedSellLow: null,
    expectedSellMid: null,
    expectedSellHigh: null,
    continuationScore: null,
    quantities: {
      requestedBuyQty: 50,
      buyFilledQty: 50,
      currentPositionQty: 50,
      requestedSellQty: 50,
      sellFilledQty: 0,
      remainingPositionQty: 50
    },
    lastExitEvidence: null,
    updatedAt: Date.now()
  };

  service.registerPosition(pos);

  const unverifiedSnapshot: VerifiedMarketSnapshot = {
    symbol: "AAPL",
    market: "US",
    price: 152,
    candles: [], // empty candles
    isVerified: false
  };

  const evalResult = service.onCompletedBar("POS_003", unverifiedSnapshot);

  assert.equal(evalResult.reason, "UNVERIFIED_OR_INSUFFICIENT_MARKET_DATA");
  assert.equal(evalResult.nextState, "HOLD");
});
