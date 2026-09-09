import test from "node:test";
import assert from "node:assert/strict";

import { GlobalRealtimeScannerV191 } from "../src/services/GlobalRealtimeScannerV191";
import { GlobalRealtimeScannerV192 } from "../src/services/GlobalRealtimeScannerV192";
import { ServerGlobalRealtimeScannerV20 } from "../server/v20/ServerGlobalRealtimeScannerV20";

test("V19.1 compatibility facade delegates empty scans without inventing candidates", () => {
  const legacy = GlobalRealtimeScannerV191.scanMarket([], "US", {
    exchangeFilter: "ALL",
    minSetupScore: 50,
  });
  const currentLegacy = GlobalRealtimeScannerV192.scanMarket([], "US", {
    exchangeFilter: "ALL",
    minSetupScore: 50,
  });

  assert.deepEqual(legacy, {
    items: [],
    scannedCount: 0,
  });
  assert.deepEqual(currentLegacy, {
    items: [],
    scannedCount: 0,
  });
});

test("V20 rejects candidates when data truth is not realtime verified/derived", () => {
  const result = ServerGlobalRealtimeScannerV20.evaluateCandidate({
    symbol: "TEST",
    name: "Test Candidate",
    market: "US",
    exchange: "NASDAQ",
    price: 100,
    changePct: 1,
    volume: 1000,
    tradeValue: 100000,
    rvol: 2,
    dataStatus: "STALE",
  });

  assert.equal(result.recommendation, "REJECT");
  assert.equal(result.grade, "REJECT");
  assert.equal(result.setupScore, 0);
  assert.match(result.rejectionReason ?? "", /^DATA_TRUTH_REJECT:/);
});

test("V20 never promotes REALTIME_DERIVED data to BUY_CANDIDATE", () => {
  const result = ServerGlobalRealtimeScannerV20.evaluateCandidate({
    symbol: "TEST",
    name: "Test Candidate",
    market: "US",
    exchange: "NASDAQ",
    price: 100,
    changePct: 5,
    volume: 1_000_000,
    tradeValue: 100_000_000,
    rvol: 4,
    rs15m: 90,
    vwap: 98,
    ema9: 99,
    ema20: 97,
    ema50: 95,
    atr14: 3,
    rsi14: 62,
    spreadBps: 10,
    structureTrend: "BULLISH",
    patterns: ["BREAKOUT_RETEST"],
    isBreakout: true,
    isRetest: true,
    dataStatus: "REALTIME_DERIVED",
  });

  assert.notEqual(result.recommendation, "BUY_CANDIDATE");
});
