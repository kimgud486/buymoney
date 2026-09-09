import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import os from "os";
import type { ScanCandidateResult } from "../server/v20/ServerGlobalRealtimeScannerV20";
import { BuyHoldDecisionEngineV20 } from "../server/v20/BuyHoldDecisionEngineV20";
import { VerifiedPerformanceGateV20 } from "../server/v20/VerifiedPerformanceGateV20";

function scan(): ScanCandidateResult {
  return {
    symbol: "TEST",
    name: "TEST",
    market: "KR",
    exchange: "KOSPI",
    price: 100,
    changePct: 2,
    volume: 1000000,
    tradeValue: 100000000,
    rvol: 2.5,
    rs5m: 82,
    rs15m: 82,
    rs1h: 82,
    rs1d: 82,
    vwap: 98,
    ema9: 99,
    ema20: 97,
    ema50: 92,
    atr14: 2,
    rsi14: 60,
    structureTrend: "BULLISH",
    patterns: ["BREAKOUT_RETEST"],
    dataStatus: "REALTIME_VERIFIED",
    setupScore: 92,
    grade: "S",
    recommendation: "BUY_CANDIDATE",
    missingFields: [],
    dataCoveragePct: 100,
    trueMtfGate: { passed: true, hardReject: false, missingTimeframes: [], blockers: [], confirmations: [] },
    timestamp: 1800000000000
  };
}

test("BUY HOLD core remains truth-first when performance history is absent", () => {
  const performance = VerifiedPerformanceGateV20.evaluate([]);
  const result = BuyHoldDecisionEngineV20.evaluate({ scan: scan(), performance, currentPrice: 100 });
  assert.equal(result.action, "BUY");
  assert.equal(result.verifiedWinRatePct, null);
  assert.ok(result.reasons.includes("NO_VERIFIED_CLOSED_TRADES"));
});
