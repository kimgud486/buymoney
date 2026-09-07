import { test } from "node:test";
import assert from "node:assert/strict";
import { IndicatorHistoryEngine } from "../src/services/IndicatorHistoryEngine";
import { KISRealtimeStreamBus } from "../src/services/kis/KISRealtimeStreamBus";
import { ExitEvidenceEngine } from "../src/services/ExitEvidenceEngine";
import { PositionStateMachine, PositionContextV18 } from "../src/trading/PositionStateMachine";

test("IndicatorHistoryEngine - MACD & RSI Multi-Bar Deterioration Analysis", () => {
  IndicatorHistoryEngine.clearHistory("005930");

  const baseSnapshot = {
    vwap: 70000,
    rvol: 1.5,
    ema9: 70100,
    ema20: 70000,
    ema50: 69500,
    ema200: 68000,
    sma20: 70000,
    rsi14: 65,
    macd: { line: 50, signal: 40, histogram: 10 },
    dmi: { plusDI: 25, minusDI: 15, adx: 20 },
    atr14: 500,
    bollinger: { upper: 71000, middle: 70000, lower: 69000 },
    obv: 100000
  };

  // Bar 1: Strong MACD hist 10, RSI 65
  IndicatorHistoryEngine.addPoint("005930", 1000, 70500, { ...baseSnapshot, rsi14: 65, macd: { line: 50, signal: 40, histogram: 10 } });

  // Bar 2: Declining MACD hist 5, RSI 58
  IndicatorHistoryEngine.addPoint("005930", 2000, 70400, { ...baseSnapshot, rsi14: 58, macd: { line: 45, signal: 41, histogram: 4 } });

  // Bar 3: Declining MACD hist 1, RSI 48
  IndicatorHistoryEngine.addPoint("005930", 3000, 70200, { ...baseSnapshot, rsi14: 48, macd: { line: 40, signal: 41, histogram: -1 } });

  const macdCheck = IndicatorHistoryEngine.checkMacdDeterioration("005930");
  assert.equal(macdCheck.isDeteriorating, true);
  assert.ok(macdCheck.reason.includes("MACD_HISTOGRAM_DECLINING_3BARS") || macdCheck.reason.includes("MACD_BEARISH_CROSSOVER"));

  const rsiCheck = IndicatorHistoryEngine.checkRsiDeterioration("005930");
  assert.equal(rsiCheck.isDeteriorating, true);
  assert.equal(rsiCheck.reason, "RSI_DECLINING_3BARS_BELOW_50");
});

test("KISRealtimeStreamBus - Session Flow Reset & Order Flow Tracking", () => {
  KISRealtimeStreamBus.resetSessionFlow("005930");

  let flow = KISRealtimeStreamBus.getOrderFlow("005930");
  assert.equal(flow.sessionCvd, 0);
  assert.equal(flow.sessionDelta, 0);

  // Simulate trade tick
  const rawData = new Array(20).fill("0");
  rawData[2] = "70500"; // PRICE
  rawData[5] = "1.0";   // CHANGE_RATE
  rawData[10] = "70500"; // ASK1
  rawData[11] = "70400"; // BID1
  rawData[12] = "200";   // TRADE_VOLUME

  KISRealtimeStreamBus.parseTradeTick("005930", rawData);

  flow = KISRealtimeStreamBus.getOrderFlow("005930");
  assert.equal(flow.sessionDelta, 200);
  assert.equal(flow.sessionCvd, 200);

  // Session reset on market open
  KISRealtimeStreamBus.resetSessionFlow("005930");
  flow = KISRealtimeStreamBus.getOrderFlow("005930");
  assert.equal(flow.sessionCvd, 0);
  assert.equal(flow.sessionDelta, 0);
});

test("ExitEvidenceEngine - Peak Metrics & PROFIT_HOLD Strength & SELL_WATCH Granular Levels", () => {
  const result = ExitEvidenceEngine.evaluate({
    currentPrice: 72000, // +2.85% PnL from 70000 entry
    entryPrice: 70000,
    highestPriceSinceBuy: 75000, // Peak +7.14% PnL -> Giveback = 4.29%p
    initialStopPrice: 68000,
    trailingFloorPrice: 69000,
    structureValid: true,
    bearishChoch: false,
    swingLowBreak: false,
    aboveVWAP: true,
    aboveEMA20: true,
    macdWeakening: true,
    rsiWeakening: true,
    bearishCandlePatterns: [],
    orderFlowReversal: false,
    cvdDivergence: true,
    relativeStrengthLoss: false,
    marketWeakness: false
  });

  assert.equal(result.peakMetrics.peakProfitPct, 7.14);
  assert.equal(result.peakMetrics.currentProfitPct, 2.86);
  assert.ok(Math.abs(result.peakMetrics.givebackPct - 4.28) <= 0.02);

  // Peak giveback >= 3%p downgrades profitHoldStrength to WEAK
  assert.equal(result.profitHoldStrength, "WEAK");
});

test("PositionStateMachine - Reversible Recovery from SELL_WATCH back to PROFIT_HOLD", () => {
  const sellWatchEvidence = ExitEvidenceEngine.evaluate({
    currentPrice: 72000,
    entryPrice: 70000,
    highestPriceSinceBuy: 73000,
    initialStopPrice: 68000,
    trailingFloorPrice: 69000,
    structureValid: false, // 1 structure break (+35 risk score)
    bearishChoch: false,
    swingLowBreak: false,
    aboveVWAP: false,     // +20
    aboveEMA20: false,
    macdWeakening: true,
    rsiWeakening: true,
    bearishCandlePatterns: [],
    orderFlowReversal: false,
    cvdDivergence: false,
    relativeStrengthLoss: false,
    marketWeakness: false
  });

  const ctx: PositionContextV18 = {
    state: "SELL_WATCH",
    symbol: "005930",
    strategyId: "ORB_V18",
    entryPrice: 70000,
    currentPrice: 72000,
    highestPriceSinceBuy: 73000,
    initialStopPrice: 68000,
    trailingFloorPrice: 69000,
    quantities: {
      requestedBuyQty: 10,
      buyFilledQty: 10,
      currentPositionQty: 10,
      requestedSellQty: 0,
      sellFilledQty: 0,
      remainingPositionQty: 10
    },
    exitEvidence: sellWatchEvidence
  };

  // In SELL_WATCH state with high risk score, stays in SELL_WATCH or SELL_PENDING
  assert.ok(sellWatchEvidence.exitRiskScore >= 35);

  // Now simulate market recovery (VWAP regained, structure valid)
  const recoveredEvidence = ExitEvidenceEngine.evaluate({
    currentPrice: 74000,
    entryPrice: 70000,
    highestPriceSinceBuy: 74000,
    initialStopPrice: 68000,
    trailingFloorPrice: 70000,
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

  ctx.exitEvidence = recoveredEvidence;
  ctx.currentPrice = 74000;

  const nextState = PositionStateMachine.evaluateNextState(ctx);
  assert.equal(nextState, "PROFIT_HOLD");
});
