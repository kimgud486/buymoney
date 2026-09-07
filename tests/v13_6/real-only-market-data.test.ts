// AISTOCK v13.6 Real-Only Market Data & Scalper Foundation Test Suite
// Standard Node.js Test Runner (node:test)

import { test, describe } from "node:test";
import assert from "node:assert";

import { VerifiedCandle } from "../../src/realtime/MarketCandle";
import { LiveCandleIntegrityGate, globalLiveCandleIntegrityGate } from "../../src/realtime/LiveCandleIntegrityGate";
import { MarketDataCollector } from "../../src/data/collector";
import { runPredictionPipeline } from "../../src/prediction";
import { TechnicalScoringEngine } from "../../src/prediction/lightgbmEngine";
import { ProfitGate } from "../../src/strategy/ProfitGate";
import { RealTimeBarBuilder } from "../../src/realtime/RealTimeBarBuilder";
import { ScalperFeatureEngine } from "../../src/scanner/ScalperFeatureEngine";

function generateTestVerifiedCandles(
  count: number = 35,
  source: "KIS_REALTIME_WS" | "KIS_REST_HISTORY" = "KIS_REALTIME_WS",
  verified: boolean = true
): VerifiedCandle[] {
  const now = Date.now();
  const intervalMs = 60000;
  const candles: VerifiedCandle[] = [];
  let basePrice = 70000;

  for (let i = 0; i < count; i++) {
    const startedAt = now - (count - i) * intervalMs;
    const endedAt = startedAt + intervalMs;
    const open = basePrice;
    const high = basePrice + 200;
    const low = basePrice - 150;
    const close = basePrice + 50;
    const volume = 1000 + i * 50;

    candles.push({
      symbol: "005930",
      market: "KOREA",
      timeframe: "1m",
      open,
      high,
      low,
      close,
      volume,
      startedAt,
      endedAt,
      source: source as any,
      receivedAt: now,
      verified: verified as any
    });

    basePrice = close;
  }

  return candles;
}

describe("AISTOCK v13.6 REAL-ONLY Market Data & Integrity Gate", () => {
  test("Requirement 1 & 2: MarketDataCollector synthetic fetchOHLCV fails closed", () => {
    assert.throws(
      () => MarketDataCollector.fetchOHLCV("005930", "KOREA", "15m", 60),
      /LEGACY_SYNTHETIC_COLLECTOR_DISABLED/
    );
  });

  test("Requirement 3 & 4: LiveCandleIntegrityGate validates authentic KIS candles", () => {
    const validRealtime = generateTestVerifiedCandles(35, "KIS_REALTIME_WS", true);
    const result1 = globalLiveCandleIntegrityGate.validateCandles(validRealtime, "005930", "KOREA", "1m");
    assert.strictEqual(result1.valid, true);

    const validHistory = generateTestVerifiedCandles(35, "KIS_REST_HISTORY", true);
    const result2 = globalLiveCandleIntegrityGate.validateCandles(validHistory, "005930", "KOREA", "1m");
    assert.strictEqual(result2.valid, true);
  });

  test("Requirement 3 & 4: LiveCandleIntegrityGate rejects unverified candles", () => {
    const unverified = generateTestVerifiedCandles(35, "KIS_REALTIME_WS", false);
    const result = globalLiveCandleIntegrityGate.validateCandles(unverified, "005930", "KOREA", "1m");
    assert.strictEqual(result.valid, false);
    assert.ok(result.reason?.includes("UNVERIFIED_CANDLE"));
  });

  test("Requirement 3 & 4: LiveCandleIntegrityGate rejects fake/non-real source tags", () => {
    const fakeSourceCandles = generateTestVerifiedCandles(35, "KIS_REALTIME_WS", true);
    (fakeSourceCandles[10] as any).source = "MOCK_SYNTHETIC_GENERATOR";

    const result = globalLiveCandleIntegrityGate.validateCandles(fakeSourceCandles, "005930", "KOREA", "1m");
    assert.strictEqual(result.valid, false);
    assert.ok(result.reason?.includes("NON_REAL_CANDLE_SOURCE:MOCK_SYNTHETIC_GENERATOR"));
  });

  test("Requirement 4: LiveCandleIntegrityGate rejects invalid OHLC structure (high < low)", () => {
    const invalidCandles = generateTestVerifiedCandles(35, "KIS_REALTIME_WS", true);
    invalidCandles[15].high = invalidCandles[15].low - 100;

    const result = globalLiveCandleIntegrityGate.validateCandles(invalidCandles, "005930", "KOREA", "1m");
    assert.strictEqual(result.valid, false);
    assert.ok(result.reason?.includes("INVALID_OHLC_STRUCTURE"));
  });

  test("Requirement 4: LiveCandleIntegrityGate rejects future timestamps", () => {
    const futureCandles = generateTestVerifiedCandles(35, "KIS_REALTIME_WS", true);
    futureCandles[34].endedAt = Date.now() + 3600000;

    const result = globalLiveCandleIntegrityGate.validateCandles(futureCandles, "005930", "KOREA", "1m");
    assert.strictEqual(result.valid, false);
    assert.ok(result.reason?.includes("FUTURE_TIMESTAMP"));
  });

  test("Requirement 5: Prediction Pipeline throws REAL_MARKET_DATA_REQUIRED when insufficient candles are given", () => {
    assert.throws(
      () => runPredictionPipeline({ symbol: "005930", candles: [] }),
      /REAL_MARKET_DATA_REQUIRED/
    );
  });

  test("Requirement 5: Prediction Pipeline throws UNVERIFIED_MARKET_DATA for unverified candles", () => {
    const unverifiedCandles = generateTestVerifiedCandles(35, "KIS_REALTIME_WS", false);
    assert.throws(
      () => runPredictionPipeline({ symbol: "005930", candles: unverifiedCandles }),
      /UNVERIFIED_CANDLE|UNVERIFIED_MARKET_DATA/
    );
  });

  test("Requirement 5 & 6: Prediction Pipeline executes cleanly with authentic verified candles", () => {
    const validCandles = generateTestVerifiedCandles(35, "KIS_REALTIME_WS", true);
    const result = runPredictionPipeline({ symbol: "005930", candles: validCandles });

    assert.strictEqual(result.symbol, "005930");
    assert.strictEqual(result.rawModelOutput.engineType, "DETERMINISTIC_TECHNICAL");
    assert.strictEqual(result.rawModelOutput.probability, null);
    assert.strictEqual(result.rawModelOutput.treeModelAgreement, null);
  });

  test("Requirement 6: TechnicalScoringEngine removes Math.random and outputs deterministic score", () => {
    const candles = generateTestVerifiedCandles(35, "KIS_REALTIME_WS", true);
    const indicators: any = {
      orderFlowImbalance: 0.15,
      rsi14: 55,
      bollingerBands: { bandwidth: 3.2 },
      macd: { histogram: 120 },
      vwap: 70000
    };
    const patterns: any[] = [{ patternName: "Double Bottom", confidence: 85, description: "Bullish reversal" }];

    const output1 = TechnicalScoringEngine.calculate(candles as any, indicators, patterns);
    const output2 = TechnicalScoringEngine.calculate(candles as any, indicators, patterns);

    assert.strictEqual(output1.score, output2.score);
    assert.strictEqual(output1.probability, null);
    assert.strictEqual(output1.modelAgreement, null);
    assert.strictEqual(output1.engineType, "DETERMINISTIC_TECHNICAL");
  });

  test("Requirement 7: RealTimeBarBuilder constructs VerifiedCandle from ticks", () => {
    const builder = new RealTimeBarBuilder();
    const tick = {
      symbol: "005930",
      price: 71000,
      volume: 100,
      timestamp: Date.now()
    };

    const { candle } = builder.update(tick, "1m", "KOREA");
    assert.strictEqual(candle.symbol, "005930");
    assert.strictEqual(candle.open, 71000);
    assert.strictEqual(candle.high, 71000);
    assert.strictEqual(candle.low, 71000);
    assert.strictEqual(candle.close, 71000);
    assert.strictEqual(candle.volume, 100);
    assert.strictEqual(candle.source, "KIS_REALTIME_WS");
    assert.strictEqual(candle.verified, true);
  });

  test("Requirement 8: ScalperFeatureEngine computes real features with provenance metadata", () => {
    const candles = generateTestVerifiedCandles(35, "KIS_REALTIME_WS", true);
    const features = ScalperFeatureEngine.extractFeatures(candles);

    assert.strictEqual(features.symbol, "005930");
    assert.strictEqual(features.vwap.verified, true);
    assert.strictEqual(features.vwap.source, "KIS_REALTIME_WS");
    assert.ok(features.rsi14.value > 0);
    assert.ok(features.rvol.value > 0);
  });

  test("Requirement 9 & 10: ProfitGate deducts costs, calculates net expectancy, and restricts unverified strategies", () => {
    const unverifiedEval = ProfitGate.evaluate({
      strategyId: "SCALPER_V1",
      winRatePct: 60,
      avgWinR: 2,
      avgLossR: 1,
      riskAmountWon: 200000,
      riskAmountLost: 100000,
      isStrategyVerifiedOOS: false
    });

    assert.strictEqual(unverifiedEval.decision, "TRADE_CANDIDATE");
    assert.strictEqual(unverifiedEval.liveSignalWeight, 0.0);
    assert.strictEqual(unverifiedEval.aiCouncilVote, "DISABLED");

    const verifiedEval = ProfitGate.evaluate({
      strategyId: "SCALPER_V1",
      winRatePct: 65,
      avgWinR: 2.2,
      avgLossR: 1,
      riskAmountWon: 220000,
      riskAmountLost: 100000,
      isStrategyVerifiedOOS: true
    });

    assert.strictEqual(verifiedEval.decision, "BUY_READY");
    assert.strictEqual(verifiedEval.liveSignalWeight, 1.0);
    assert.strictEqual(verifiedEval.aiCouncilVote, "ENABLED");
    assert.ok(verifiedEval.expectedTradingCostsCurrency > 0);
    assert.ok(verifiedEval.netExpectancyCurrency < verifiedEval.grossExpectancyCurrency);
  });
});
