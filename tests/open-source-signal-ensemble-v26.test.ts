import { test } from "node:test";
import assert from "node:assert/strict";
import { OpenSourceSignalEnsemble } from "../src/autonomous/OpenSourceSignalEnsemble";

const verifiedCandidate = () => ({
  id: "idea-005930",
  symbol: "005930",
  name: "삼성전자",
  market: "KOREA" as const,
  score: 92,
  grade: "A+" as const,
  decision: "STRONG_BUY_CANDIDATE" as const,
  price: 100_000,
  changePct: 2.1,
  entryLow: 99_500,
  entryHigh: 100_500,
  stop: 96_000,
  target1: 109_000,
  target2: 113_000,
  rsi: 58,
  rvol: 2.4,
  adx: 29,
  atrPct: 2.1,
  pattern: "BREAKOUT_RETEST",
  bullishReasons: ["verified"],
  riskReasons: [],
  thesis: "verified test candidate",
  invalidation: "stop",
  wouldBuy: true,
  scannedAt: new Date().toISOString(),
});

test("missing indicators are rejected instead of receiving synthetic defaults", () => {
  const result = OpenSourceSignalEnsemble.evaluateCandidate({
    symbol: "005930",
    name: "삼성전자",
    market: "KOREA",
    price: 100_000,
  });

  assert.equal(result.dataComplete, false);
  assert.equal(result.decision, "NO");
  assert.equal(result.ensembleScore, 0);
  assert.equal(result.liveAutoOrderEnabled, false);
  assert.ok(result.riskReasons.includes("RSI_MISSING"));
  assert.ok(result.riskReasons.includes("RVOL_MISSING"));
});

test("high quality complete candidate can become YES", () => {
  const result = OpenSourceSignalEnsemble.evaluateCandidate(verifiedCandidate(), {
    mode: "ANALYSIS",
  });
  assert.equal(result.dataComplete, true);
  assert.equal(result.decision, "YES");
  assert.equal(result.liveAutoOrderEnabled, false);
});

test("AUTO_LIVE remains disabled when browser/client has no server authorization", () => {
  const result = OpenSourceSignalEnsemble.evaluateCandidate(verifiedCandidate(), {
    mode: "AUTO_LIVE",
    serverExecutionAuthorized: false,
  });
  assert.equal(result.decision, "YES");
  assert.equal(result.liveAutoOrderEnabled, false);
});

test("AUTO_LIVE can only be marked enabled after explicit server authorization", () => {
  const result = OpenSourceSignalEnsemble.evaluateCandidate(verifiedCandidate(), {
    mode: "AUTO_LIVE",
    serverExecutionAuthorized: true,
  });
  assert.equal(result.decision, "YES");
  assert.equal(result.liveAutoOrderEnabled, true);
});
