import assert from "node:assert/strict";
import test from "node:test";
import { OpenSourceSignalEnsemble } from "../src/autonomous/OpenSourceSignalEnsemble";

const verifiedIdea = {
  symbol: "005930",
  name: "테스트종목",
  market: "KOREA" as const,
  score: 92,
  grade: "A+" as const,
  decision: "BUY_CANDIDATE" as const,
  price: 100,
  changePct: 2.1,
  entryLow: 98,
  entryHigh: 100,
  stop: 95,
  target1: 108,
  target2: 113,
  rsi: 61,
  rvol: 2.1,
  adx: 29,
  atrPct: 3.2,
  pattern: "BULLISH_ENGULFING",
  bullishReasons: ["trend", "volume"],
  riskReasons: [],
  thesis: "verified",
  invalidation: "stop",
  wouldBuy: true,
  scannedAt: new Date(0).toISOString(),
};

test("verified candidate can become REVIEW_READY but never live auto-order enabled", () => {
  const result = OpenSourceSignalEnsemble.evaluateCandidate(verifiedIdea);
  assert.equal(result.decision, "REVIEW_READY");
  assert.equal(result.approvalRequired, true);
  assert.equal(result.liveAutoOrderEnabled, false);
  assert.ok(result.rrRatio >= 1.5);
});

test("missing real metrics are rejected instead of being filled with synthetic defaults", () => {
  const result = OpenSourceSignalEnsemble.evaluateCandidate({
    symbol: "MISSING",
    name: "missing-data",
    market: "US",
    score: 90,
    price: 100,
    wouldBuy: true,
  });
  assert.equal(result.decision, "NO");
  assert.ok(result.riskReasons.some((reason) => reason.includes("RSI")));
  assert.ok(result.riskReasons.some((reason) => reason.includes("RVOL")));
  assert.equal(result.liveAutoOrderEnabled, false);
});

test("risk gate blocks weak liquidity and scanner NO", () => {
  const result = OpenSourceSignalEnsemble.evaluateCandidate({
    ...verifiedIdea,
    score: 70,
    rvol: 0.7,
    wouldBuy: false,
  });
  assert.notEqual(result.decision, "REVIEW_READY");
  assert.ok(result.riskReasons.length >= 2);
});

test("ranking places REVIEW_READY before WATCH/NO", () => {
  const ranked = OpenSourceSignalEnsemble.rankCandidates([
    { ...verifiedIdea, symbol: "READY" },
    { ...verifiedIdea, symbol: "NO", score: 50, rvol: 0.5, wouldBuy: false },
  ]);
  assert.equal(ranked[0].symbol, "READY");
  assert.equal(ranked[0].decision, "REVIEW_READY");
});
