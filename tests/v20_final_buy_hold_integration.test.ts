import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";

import { FinalBuyHoldDecisionServiceV20 } from "../server/v20/FinalBuyHoldDecisionServiceV20";
import { buyHoldPerformanceStoreV20 } from "../server/v20/BuyHoldPerformanceStoreV20";
import type { ScanCandidateInput } from "../server/v20/ServerGlobalRealtimeScannerV20";
import type {
  TrueMTFEvidenceV20,
  TrueMTFSnapshotV20,
  TrueMTFTimeframeV20
} from "../server/v20/TrueMTFSignalGateV20";

const intervals: Record<TrueMTFTimeframeV20, number> = {
  "1m": 60_000,
  "3m": 180_000,
  "5m": 300_000,
  D: 86_400_000
};

function frame(timeframe: TrueMTFTimeframeV20): TrueMTFSnapshotV20 {
  const daily = timeframe === "D";
  return {
    timeframe,
    dataStatus: daily ? "REALTIME_DERIVED" : "REALTIME_VERIFIED",
    source: "VERIFIED_TEST_FEED",
    lastBarTimestamp: 1_800_000_000_000,
    barIntervalMs: intervals[timeframe],
    close: daily ? 112 : 105,
    high: daily ? 113 : 106,
    ema9: daily ? 108 : 103,
    ema20: daily ? 104 : 101,
    ema50: daily ? 98 : 97,
    rsi14: 62,
    macdHist: 1.1,
    rvol: daily ? 1.5 : 2.0,
    vwap: daily ? undefined : 102,
    previousHigh20: daily ? undefined : 104
  };
}

function mtf(): TrueMTFEvidenceV20 {
  return { "1m": frame("1m"), "3m": frame("3m"), "5m": frame("5m"), D: frame("D") };
}

function candidate(overrides: Partial<ScanCandidateInput> = {}): ScanCandidateInput {
  return {
    symbol: "005930",
    name: "삼성전자",
    market: "KR",
    exchange: "KOSPI",
    price: 105,
    changePct: 3.5,
    volume: 2_000_000,
    tradeValue: 220_000_000,
    rvol: 3.1,
    rs5m: 86,
    rs15m: 84,
    rs1h: 82,
    rs1d: 80,
    vwap: 102,
    ema9: 103,
    ema20: 101,
    ema50: 97,
    atr14: 2,
    rsi14: 63,
    spreadBps: 10,
    orderbookImbalance: 0.3,
    signedFlow: 1,
    patterns: ["BREAKOUT_RETEST", "VWAP_RECLAIM"],
    structureTrend: "BULLISH",
    isBreakout: true,
    isRetest: true,
    chaseRisk: false,
    exhaustionRisk: false,
    trueMtf: mtf(),
    dataStatus: "REALTIME_VERIFIED",
    ...overrides
  };
}

test("final service produces no verified plan when True MTF evidence is missing", () => {
  const result = FinalBuyHoldDecisionServiceV20.evaluate({
    candidate: candidate({ trueMtf: undefined }),
    performanceKey: { setup: "BREAKOUT_RETEST", market: "KR" }
  });

  assert.notEqual(result.action, "STRONG_BUY");
  assert.notEqual(result.action, "BUY");
  assert.equal(result.trueMtfPassed, false);
  assert.equal(result.plan.source, "NO_VERIFIED_PLAN");
  assert.equal(result.plan.entry, null);
});

test("final service builds entry/stop/TP only after V20 BUY and verified True MTF", () => {
  const result = FinalBuyHoldDecisionServiceV20.evaluate({
    candidate: candidate(),
    performanceKey: { setup: "NO_HISTORY_SETUP", market: "KR" }
  });

  assert.equal(result.recommendation, "BUY_CANDIDATE");
  assert.equal(result.action, "BUY");
  assert.equal(result.trueMtfPassed, true);
  assert.equal(result.plan.source, "ATR_STRUCTURE");
  assert.ok((result.plan.entry || 0) > (result.plan.stop || 0));
  assert.ok((result.plan.tp1 || 0) > (result.plan.entry || 0));
  assert.ok(result.blockers.includes("NO_VERIFIED_CLOSED_TRADES"));
});

test("final service exits an existing position when hard stop is breached", () => {
  const result = FinalBuyHoldDecisionServiceV20.evaluate({
    candidate: candidate({ price: 93 }),
    performanceKey: { setup: "BREAKOUT_RETEST", market: "KR" },
    currentPrice: 93,
    position: {
      quantity: 10,
      averagePrice: 100,
      stopPrice: 94,
      highestPriceSinceEntry: 110
    }
  });

  assert.equal(result.action, "EXIT");
  assert.ok(result.reasons.includes("HARD_STOP_BREACHED"));
});
