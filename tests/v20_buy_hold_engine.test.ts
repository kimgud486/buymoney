import test from "node:test";
import assert from "node:assert/strict";

import { BuyHoldDecisionEngineV20 } from "../server/v20/BuyHoldDecisionEngineV20";
import { VerifiedPerformanceGateV20 } from "../server/v20/VerifiedPerformanceGateV20";
import type { ScanCandidateResult } from "../server/v20/ServerGlobalRealtimeScannerV20";

function makeScan(overrides: Partial<ScanCandidateResult> = {}): ScanCandidateResult {
  return {
    symbol: "TEST",
    name: "TEST",
    market: "KR",
    exchange: "KOSPI",
    price: 100,
    changePct: 2,
    volume: 1_000_000,
    tradeValue: 100_000_000,
    rvol: 2.2,
    rs5m: 80,
    rs15m: 82,
    rs1h: 84,
    rs1d: 86,
    vwap: 98,
    ema9: 99,
    ema20: 97,
    ema50: 92,
    atr14: 2,
    rsi14: 63,
    spreadBps: 10,
    structureTrend: "BULLISH",
    patterns: ["BREAKOUT_RETEST"],
    dataStatus: "REALTIME_VERIFIED",
    setupScore: 94,
    grade: "S",
    recommendation: "BUY_CANDIDATE",
    missingFields: [],
    dataCoveragePct: 100,
    trueMtfGate: {
      passed: true,
      hardReject: false,
      missingTimeframes: [],
      blockers: [],
      confirmations: ["D:TREND", "5m:SETUP", "3m:CONFIRM", "1m:ENTRY"]
    },
    timestamp: 1_800_000_000_000,
    ...overrides
  };
}

function verifiedPerformance() {
  const trades = [
    ...Array.from({ length: 25 }, () => ({ pnlPct: 1.2 })),
    ...Array.from({ length: 5 }, () => ({ pnlPct: -0.5 }))
  ];
  return VerifiedPerformanceGateV20.evaluate(trades);
}

test("performance gate only marks 80%+ when sample, PF and expectancy are all valid", () => {
  const result = verifiedPerformance();
  assert.equal(result.sampleSize, 30);
  assert.ok((result.winRatePct || 0) >= 80);
  assert.ok((result.profitFactor || 0) >= 1.5);
  assert.ok((result.expectancyPct || 0) > 0);
  assert.equal(result.verified80Plus, true);
});

test("performance gate refuses impressive win rate with insufficient sample", () => {
  const result = VerifiedPerformanceGateV20.evaluate([
    { pnlPct: 1 }, { pnlPct: 1 }, { pnlPct: 1 }, { pnlPct: 1 }, { pnlPct: -0.2 }
  ]);
  assert.equal(result.verified80Plus, false);
  assert.ok(result.blockers.some((x) => x.startsWith("INSUFFICIENT_SAMPLE")));
});

test("new position becomes STRONG_BUY only when V20 BUY and verified 80+ both pass", () => {
  const result = BuyHoldDecisionEngineV20.evaluate({
    scan: makeScan(),
    performance: verifiedPerformance(),
    currentPrice: 100
  });
  assert.equal(result.action, "STRONG_BUY");
  assert.ok(result.reasons.includes("VERIFIED_80_PLUS_SETUP"));
});

test("existing position stays HOLD while trend and risk gates remain healthy", () => {
  const result = BuyHoldDecisionEngineV20.evaluate({
    scan: makeScan(),
    performance: verifiedPerformance(),
    currentPrice: 108,
    position: {
      quantity: 10,
      averagePrice: 100,
      stopPrice: 94,
      highestPriceSinceEntry: 108,
      partialProfitTaken: false
    }
  });
  assert.equal(result.action, "KEEP_HOLD");
  assert.ok(result.holdScore >= 80);
});

test("existing position exits immediately when hard stop is breached", () => {
  const result = BuyHoldDecisionEngineV20.evaluate({
    scan: makeScan(),
    performance: verifiedPerformance(),
    currentPrice: 93,
    position: {
      quantity: 10,
      averagePrice: 100,
      stopPrice: 94,
      highestPriceSinceEntry: 108
    }
  });
  assert.equal(result.action, "EXIT");
  assert.ok(result.reasons.includes("HARD_STOP_BREACHED"));
});

test("profitable position requests partial reduction instead of full exit at target zone", () => {
  const result = BuyHoldDecisionEngineV20.evaluate({
    scan: makeScan(),
    performance: verifiedPerformance(),
    currentPrice: 113,
    partialTakeProfitPct: 12,
    position: {
      quantity: 10,
      averagePrice: 100,
      stopPrice: 94,
      highestPriceSinceEntry: 113,
      partialProfitTaken: false
    }
  });
  assert.equal(result.action, "REDUCE");
  assert.ok(result.reasons.includes("PARTIAL_PROFIT_ZONE"));
});
