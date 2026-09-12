import test from "node:test";
import assert from "node:assert/strict";

import {
  evaluateCandidateWithV2010ShadowPolicy,
  v2010EnforcementEnabled,
} from "../server/v20/V2010ShadowDecisionPolicy";
import type { ScanCandidateInput } from "../server/v20/ServerGlobalRealtimeScannerV20";
import type {
  TrueMTFEvidenceV20,
  TrueMTFSnapshotV20,
  TrueMTFTimeframeV20,
} from "../server/v20/TrueMTFSignalGateV20";

const intervals: Record<TrueMTFTimeframeV20, number> = {
  "1m": 60_000,
  "3m": 180_000,
  "5m": 300_000,
  D: 86_400_000,
};

function frame(timeframe: TrueMTFTimeframeV20): TrueMTFSnapshotV20 {
  const daily = timeframe === "D";
  return {
    timeframe,
    dataStatus: daily ? "REALTIME_DERIVED" : "REALTIME_VERIFIED",
    source: "TEST_VERIFIED_FEED",
    lastBarTimestamp: 1_800_000_000_000,
    barIntervalMs: intervals[timeframe],
    close: daily ? 112 : 105,
    high: daily ? 113 : 106,
    ema9: daily ? 108 : 103,
    ema20: daily ? 104 : 101,
    ema50: daily ? 98 : 97,
    rsi14: 62,
    macdHist: 1.2,
    rvol: daily ? 1.4 : 1.8,
    vwap: daily ? undefined : 102,
    previousHigh20: daily ? undefined : 104,
  };
}

function mtf(): TrueMTFEvidenceV20 {
  return {
    "1m": frame("1m"),
    "3m": frame("3m"),
    "5m": frame("5m"),
    D: frame("D"),
  };
}

function candidate(): ScanCandidateInput {
  return {
    symbol: "005930",
    name: "삼성전자",
    market: "KR",
    exchange: "KOSPI",
    price: 105,
    changePct: 4,
    volume: 2_000_000,
    tradeValue: 210_000_000,
    rvol: 3.2,
    rs5m: 86,
    rs15m: 84,
    rs1h: 82,
    rs1d: 80,
    vwap: 102,
    ema9: 103,
    ema20: 101,
    ema50: 97,
    atr14: 2.1,
    rsi14: 64,
    spreadBps: 12,
    patterns: ["DOUBLE_BOTTOM"],
    structureTrend: "BULLISH",
    isBreakout: true,
    isRetest: true,
    chaseRisk: false,
    exhaustionRisk: false,
    trueMtf: mtf(),
    dataStatus: "REALTIME_VERIFIED",
    microstructure: {
      required: true,
      passed: false,
      status: "MICROSTRUCTURE_MISSING",
      phase: "REGULAR",
      quoteAgeMs: 100,
      spreadBps: null,
      atrPct: 0.02,
      rvol: 3.2,
      missingFields: ["bidPrice", "askPrice"],
      thresholds: {
        maxQuoteAgeMs: 10_000,
        maxSpreadBps: 30,
        minRvol: 1.15,
        minAtrPct: 0.0015,
      },
    },
  };
}

test("V20.10 enforcement flag is OFF unless explicitly set to 1", () => {
  assert.equal(v2010EnforcementEnabled(undefined), false);
  assert.equal(v2010EnforcementEnabled("0"), false);
  assert.equal(v2010EnforcementEnabled("true"), false);
  assert.equal(v2010EnforcementEnabled("1"), true);
});

test("V20.10 shadow policy keeps V20.9 production decision by default", () => {
  const result = evaluateCandidateWithV2010ShadowPolicy(candidate(), {
    enforce: false,
    record: false,
  });

  assert.equal(result.baseline.recommendation, "BUY_CANDIDATE");
  assert.equal(result.v2010.recommendation, "WATCH");
  assert.equal(result.production.recommendation, "BUY_CANDIDATE");
  assert.equal(result.enforced, false);
});

test("V20.10 policy only changes production decision when enforcement is explicit", () => {
  const result = evaluateCandidateWithV2010ShadowPolicy(candidate(), {
    enforce: true,
    record: false,
  });

  assert.equal(result.baseline.recommendation, "BUY_CANDIDATE");
  assert.equal(result.v2010.recommendation, "WATCH");
  assert.equal(result.production.recommendation, "WATCH");
  assert.equal(result.enforced, true);
});
