// ----------------------------------------------------------------------
// AISTOCK V19.1 TRUTH-FIRST INTEGRATION UNIT TEST SUITE
// ----------------------------------------------------------------------

import test from "node:test";
import assert from "node:assert/strict";

import { PositionStateMachine, PositionContextV191 } from "../src/trading/PositionStateMachine";
import { ScalperFeatureEngine } from "../src/scanner/ScalperFeatureEngine";
import { VerifiedCandle } from "../src/realtime/MarketCandle";
import { scanGlobalRealtimeHotListV191, GlobalRealtimeScannerV191 } from "../src/services/GlobalRealtimeScannerV191";
import { realtimeMarketFeedService, LiveMarketQuote } from "../src/services/realtimeMarketFeedService";
import { realCandleStore } from "../src/services/RealCandleStore";

test("V19.1 PositionStateMachine: Multi-Factor PROFIT_HOLD Activation", () => {
  const ctx: PositionContextV191 = {
    state: "HOLD",
    symbol: "NVDA",
    strategyId: "SCALPER_15M",
    entryPrice: 100,
    currentPrice: 101.2, // +1.2% (> +0.8% threshold)
    highestPriceSinceBuy: 101.5,
    initialStopPrice: 95,
    trailingFloorPrice: 98,
    quantities: {
      requestedBuyQty: 10,
      buyFilledQty: 10,
      currentPositionQty: 10,
      requestedSellQty: 0,
      sellFilledQty: 0,
      remainingPositionQty: 10
    },
    exitEvidence: {
      hardStopHit: false,
      trailingStopHit: false,
      exitRiskScore: 10,
      evidence: []
    }
  };

  const nextState = PositionStateMachine.evaluateNextState(ctx);
  assert.equal(nextState, "PROFIT_HOLD");
});

test("V19.1 PositionStateMachine: SELL_WATCH Hysteresis Recovery Threshold", () => {
  const baseCtx: PositionContextV191 = {
    state: "SELL_WATCH",
    symbol: "005930",
    strategyId: "VWAP_RECLAIM",
    entryPrice: 70000,
    currentPrice: 71000,
    highestPriceSinceBuy: 71500,
    initialStopPrice: 68000,
    trailingFloorPrice: 69000,
    quantities: {
      requestedBuyQty: 100,
      buyFilledQty: 100,
      currentPositionQty: 100,
      requestedSellQty: 0,
      sellFilledQty: 0,
      remainingPositionQty: 100
    },
    watchThreshold: 35,
    recoveryThreshold: 25,
    sellThreshold: 65,
    exitEvidence: {
      hardStopHit: false,
      trailingStopHit: false,
      exitRiskScore: 30, // Drop to 30: Below 35 (watch) BUT above 25 (recovery)! MUST stay in SELL_WATCH due to hysteresis!
      evidence: []
    }
  };

  // Score 30 stays in SELL_WATCH
  const stateAt30 = PositionStateMachine.evaluateNextState(baseCtx);
  assert.equal(stateAt30, "SELL_WATCH");

  // Drop score further to 20 (< recoveryThreshold 25)
  const recoveredCtx: PositionContextV191 = {
    ...baseCtx,
    exitEvidence: {
      hardStopHit: false,
      trailingStopHit: false,
      exitRiskScore: 20,
      evidence: []
    }
  };

  const stateAt20 = PositionStateMachine.evaluateNextState(recoveredCtx);
  assert.equal(stateAt20, "PROFIT_HOLD");
});

test("V19.1 ScalperFeatureEngine: Rejects Insufficient Candles (<30)", () => {
  const candles: VerifiedCandle[] = [];
  assert.throws(() => {
    ScalperFeatureEngine.extractFeatures(candles);
  }, /REAL_MARKET_DATA_REQUIRED/);
});

test("V19.1 ScalperFeatureEngine: Real Feature Extraction with 35 Verified Candles", () => {
  const now = Date.now();
  const candles: VerifiedCandle[] = [];

  for (let i = 0; i < 35; i++) {
    candles.push({
      symbol: "AAPL",
      timeframe: "5m",
      open: 150 + i * 0.2,
      high: 151 + i * 0.2,
      low: 149.5 + i * 0.2,
      close: 150.8 + i * 0.2,
      volume: 10000 + i * 500,
      endedAt: now - (35 - i) * 300000,
      source: "TEST_FEED",
      verified: true
    });
  }

  const features = ScalperFeatureEngine.extractFeatures(candles);
  assert.equal(features.symbol, "AAPL");
  assert.notEqual(features.vwap.value, null);
  assert.notEqual(features.atr14.value, null);
  assert.equal(features.relativeStrengthScore, null); // Benchmark not passed -> null, no fake score!
});

test("V19.1 GlobalRealtimeScannerV191: Live Data Gate and Real Scanned Count", async () => {
  // Clear or mock test quote
  const result = await scanGlobalRealtimeHotListV191({ marketFilter: "US" });
  assert.equal(typeof result.scannedTotal, "number");
  assert.notEqual(result.scannedTotal, 3420); // Must NOT be fixed 3420!
});
