import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";

import { evaluateV209BaselineForShadow } from "../server/v20/V209ShadowBaselineEvaluator";
import { V2010ShadowComparisonRecorder } from "../server/v20/V2010ShadowComparisonRecorder";
import {
  ServerGlobalRealtimeScannerV20,
  type ScanCandidateInput,
} from "../server/v20/ServerGlobalRealtimeScannerV20";
import type {
  TrueMTFEvidenceV20,
  TrueMTFSnapshotV20,
  TrueMTFTimeframeV20,
} from "../server/v20/TrueMTFSignalGateV20";

const INTERVALS: Record<TrueMTFTimeframeV20, number> = {
  "1m": 60_000,
  "3m": 180_000,
  "5m": 300_000,
  D: 86_400_000,
};

function makeFrame(timeframe: TrueMTFTimeframeV20): TrueMTFSnapshotV20 {
  const daily = timeframe === "D";
  return {
    timeframe,
    dataStatus: daily ? "REALTIME_DERIVED" : "REALTIME_VERIFIED",
    source: "TEST_VERIFIED_FEED",
    lastBarTimestamp: 1_800_000_000_000,
    barIntervalMs: INTERVALS[timeframe],
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

function bullishMtf(): TrueMTFEvidenceV20 {
  return {
    "1m": makeFrame("1m"),
    "3m": makeFrame("3m"),
    "5m": makeFrame("5m"),
    D: makeFrame("D"),
  };
}

function strongCandidate(overrides: Partial<ScanCandidateInput> = {}): ScanCandidateInput {
  return {
    symbol: "005930",
    name: "삼성전자",
    market: "KR",
    exchange: "KOSPI",
    price: 105,
    openPrice: 101,
    highPrice: 106,
    lowPrice: 100,
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
    trueMtf: bullishMtf(),
    dataStatus: "REALTIME_VERIFIED",
    ...overrides,
  };
}

test("V20.10 shadow baseline reconstructs V20.9 BUY while V20.10 can block it", () => {
  const candidate = strongCandidate({
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
  });

  const baseline = evaluateV209BaselineForShadow(candidate);
  const current = ServerGlobalRealtimeScannerV20.evaluateCandidate(candidate);

  assert.equal(baseline.recommendation, "BUY_CANDIDATE");
  assert.equal(current.recommendation, "WATCH");
  assert.ok(current.missingFields.includes("microstructure:MICROSTRUCTURE_MISSING"));
});

test("V20.10 shadow recorder resolves real-observation horizons without interpolation", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "v2010-shadow-"));
  const file = path.join(dir, "shadow.json");
  const recorder = new V2010ShadowComparisonRecorder(file, true);
  const start = 2_000_000_000_000;

  const baseline = {
    symbol: "AAA",
    market: "KR" as const,
    price: 100,
    setupScore: 90,
    grade: "S" as const,
    recommendation: "BUY_CANDIDATE" as const,
    patterns: ["BREAKOUT_20"],
  };
  const blocked = {
    ...baseline,
    setupScore: 85,
    grade: "A" as const,
    recommendation: "WATCH" as const,
    microstructure: {
      status: "SPREAD_TOO_WIDE",
      phase: "REGULAR",
      spreadBps: 45,
      rvol: 2,
      atrPct: 0.01,
    },
  };

  assert.ok(recorder.recordComparison(baseline, blocked, start));
  assert.equal(recorder.recordComparison(baseline, blocked, start + 30_000)?.id, `KR:AAA:${Math.floor(start / 60_000)}`);
  assert.equal(recorder.getRecords().length, 1);

  recorder.observeQuote("AAA", 102, start + 2 * 60_000);
  recorder.observeQuote("AAA", 98, start + 4 * 60_000);
  recorder.observeQuote("AAA", 101, start + 5 * 60_000);
  recorder.observeQuote("AAA", 103, start + 15 * 60_000);
  recorder.observeQuote("AAA", 97, start + 30 * 60_000);

  const record = recorder.getRecords()[0];
  assert.equal(record.outcomes["5m"]?.returnPct, 1);
  assert.equal(record.outcomes["5m"]?.mfePct, 2);
  assert.equal(record.outcomes["5m"]?.maePct, -2);
  assert.equal(record.outcomes["15m"]?.returnPct, 3);
  assert.equal(record.outcomes["30m"]?.returnPct, -3);
  assert.equal(record.outcomes["30m"]?.maePct, -3);
  assert.equal(record.outcomes["5m"]?.resolutionLagMs, 0);
  assert.equal(fs.existsSync(file), true);
});

test("V20.10 shadow summary separates kept and blocked baseline BUY samples", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "v2010-shadow-summary-"));
  const recorder = new V2010ShadowComparisonRecorder(path.join(dir, "shadow.json"), true);
  const start = 2_100_000_000_000;

  recorder.recordComparison(
    { symbol: "KEEP", market: "US", price: 100, setupScore: 90, grade: "S", recommendation: "BUY_CANDIDATE" },
    { symbol: "KEEP", market: "US", price: 100, setupScore: 90, grade: "S", recommendation: "BUY_CANDIDATE", microstructure: { status: "PASSED", phase: "REGULAR", spreadBps: 10, rvol: 2, atrPct: 0.01 } },
    start,
  );
  recorder.recordComparison(
    { symbol: "BLOCK", market: "US", price: 100, setupScore: 90, grade: "S", recommendation: "BUY_CANDIDATE" },
    { symbol: "BLOCK", market: "US", price: 100, setupScore: 82, grade: "A", recommendation: "WATCH", microstructure: { status: "RVOL_TOO_LOW", phase: "REGULAR", spreadBps: 10, rvol: 1, atrPct: 0.01 } },
    start + 60_000,
  );

  recorder.observeQuote("KEEP", 104, start + 30 * 60_000);
  recorder.observeQuote("BLOCK", 96, start + 31 * 60_000);

  const summary = recorder.summarize(2, 1);
  const h30 = summary.horizons.find((horizon) => horizon.horizon === "30m");
  assert.ok(h30);
  assert.equal(h30?.baseline.count, 2);
  assert.equal(h30?.keptByV2010.count, 1);
  assert.equal(h30?.blockedByV2010.count, 1);
  assert.equal(h30?.keptByV2010.avgReturnPct, 4);
  assert.equal(h30?.blockedByV2010.avgReturnPct, -4);
  assert.equal(h30?.reviewReady, true);
});
