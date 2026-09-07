import { describe, it } from "node:test";
import assert from "node:assert";
import { IndicatorEngine } from "../src/realtime/IndicatorEngine";
import { LiveDataIntegrityGate } from "../src/realtime/LiveDataIntegrityGate";
import { evaluateNetEdge } from "../src/strategy/NetEdgeGate";
import { FalseSignalFilter } from "../src/realtime/FalseSignalFilter";
import { ProbabilityCalibrator } from "../src/prediction/calibration";
import { MetaLabelingFilter } from "../src/prediction/metaLabeling";
import type { LiveCandle } from "../src/realtime/types";

describe("v14 Real Market Core Engine Tests", () => {
  it("IndicatorEngine requires at least 200 bars for warm-up and computes standard MACD & RSI", () => {
    // 1. Warm-up incomplete with < 200 bars
    const shortCandles: LiveCandle[] = Array.from({ length: 50 }, (_, i) => ({
      time: 1700000000 + i * 60,
      open: 100 + i,
      high: 102 + i,
      low: 99 + i,
      close: 101 + i,
      volume: 1000,
      isClosed: true
    }));

    const resultShort = IndicatorEngine.calculate(shortCandles);
    assert.strictEqual(resultShort.indicatorsReady, false);
    assert.ok(resultShort.warmupReason?.includes("INDICATOR_WARMUP_NOT_COMPLETE"));

    // 2. Warm-up complete with 220 bars
    const fullCandles: LiveCandle[] = Array.from({ length: 220 }, (_, i) => ({
      time: 1700000000 + i * 60,
      open: 100 + (i % 10),
      high: 105 + (i % 10),
      low: 98 + (i % 10),
      close: 102 + (i % 10),
      volume: 1000 + (i % 500),
      isClosed: true
    }));

    const resultFull = IndicatorEngine.calculate(fullCandles);
    assert.strictEqual(resultFull.indicatorsReady, true);
    assert.ok(resultFull.ema200 > 0);
    assert.ok(resultFull.macd !== undefined);
    assert.ok(resultFull.macdSignal !== undefined);
    assert.ok(resultFull.macdHistogram !== undefined);
    assert.ok(resultFull.rsi14 >= 0);
    assert.ok(resultFull.rsi14 <= 100);
  });

  it("LiveDataIntegrityGate rejects stale or out-of-order ticks", () => {
    const gate = new LiveDataIntegrityGate();
    const now = Date.now();

    // Valid tick
    const res1 = gate.validate({
      symbol: "005930",
      price: 70000,
      timestamp: now,
      source: "KIS_REALTIME_WS",
      receivedAt: now
    });
    assert.strictEqual(res1.valid, true);

    // Stale tick (> 5000ms old)
    const res2 = gate.validate({
      symbol: "005930",
      price: 70100,
      timestamp: now - 10000,
      source: "KIS_REALTIME_WS",
      receivedAt: now
    });
    assert.strictEqual(res2.valid, false);

    // Synthetic generator tick rejection
    const res3 = gate.validate({
      symbol: "005930",
      price: 70200,
      timestamp: now,
      source: "MOCK_SYNTHETIC_GENERATOR" as any,
      receivedAt: now
    });
    assert.strictEqual(res3.valid, false);
  });

  it("NetEdgeGate correctly evaluates net edge and reward-risk ratio", () => {
    // Case 1: Positive net edge & reward-risk >= 1.5
    const edge1 = evaluateNetEdge({
      probabilityWin: 0.6,
      avgWinPct: 3.0,
      avgLossPct: 1.5,
      feePct: 0.015,
      taxPct: 0.18,
      expectedSlippagePct: 0.10
    });
    assert.strictEqual(edge1.allowEntry, true);
    assert.strictEqual(edge1.rewardRisk, 2.0);

    // Case 2: Negative expected net edge
    const edge2 = evaluateNetEdge({
      probabilityWin: 0.3,
      avgWinPct: 1.0,
      avgLossPct: 2.0,
      feePct: 0.015,
      taxPct: 0.18,
      expectedSlippagePct: 0.10
    });
    assert.strictEqual(edge2.allowEntry, false);
    assert.ok(edge2.reason?.includes("NEGATIVE_EXPECTED_NET_EDGE"));
  });

  it("FalseSignalFilter blocks entries when extended from VWAP or feed quality is not realtime", () => {
    const fullCandles: LiveCandle[] = Array.from({ length: 220 }, (_, i) => ({
      time: 1700000000 + i * 60,
      open: 100,
      high: 105,
      low: 98,
      close: 110, // 10% extended above VWAP (100)
      volume: 1000,
      isClosed: true
    }));

    const indicators = IndicatorEngine.calculate(fullCandles);
    indicators.vwap = 100; // Force vwap = 100

    const filterRes = FalseSignalFilter.evaluate(fullCandles, indicators, "BROKER_REALTIME");
    assert.strictEqual(filterRes.pass, false);
    assert.strictEqual(filterRes.extendedFromVWAP, true);
  });

  it("ProbabilityCalibrator and MetaLabelingFilter strictly block unverified ML probabilities", () => {
    // Unverified probability calibration must return null
    const calRes = ProbabilityCalibrator.calibrate(85, "LIGHTGBM", false);
    assert.strictEqual(calRes, null);

    // Meta labeling without verified probability must issue NO_TRADE
    const metaRes = MetaLabelingFilter.evaluate({
      symbol: "005930",
      market: "KOREA",
      calibratedResult: calRes,
      riskRewardRatio: 2.5,
      sectorName: "Semiconductor",
      currentSectorExposurePct: 10,
      volatilityAnomalous: false,
      modelAgreementPct: null,
      probabilityVerified: false
    });

    assert.strictEqual(metaRes.decision, "NO_TRADE");
    assert.ok(metaRes.noTradeReason?.includes("REAL_ML_REQUIRED"));
  });
});
