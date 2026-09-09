import test from "node:test";
import assert from "node:assert/strict";
import { OpenSourceSignalEnsemble } from "../src/autonomous/OpenSourceSignalEnsemble";

test("ensemble accepts a fully verified high-quality candidate", () => {
  const result = OpenSourceSignalEnsemble.evaluateCandidate({
    symbol: "005930",
    name: "삼성전자",
    market: "KOREA",
    price: 74200,
    rsi: 54,
    rvol: 2.1,
    adx: 29,
    atrPct: 2.1,
    grade: "S",
    stop: 71000,
    target1: 82000,
  });

  assert.equal(result.approvalRequired, true);
  assert.equal(result.liveAutoOrderEnabled, false);
  assert.ok(result.rrRatio >= 1.8);
  assert.ok(result.ensembleScore >= 80);
  assert.ok(result.decision === "YES" || result.decision === "REVIEW_READY");
  assert.equal(result.riskReasons.length, 0);
});

test("ensemble rejects missing verified indicators instead of inventing defaults", () => {
  const result = OpenSourceSignalEnsemble.evaluateCandidate({
    symbol: "000660",
    name: "SK하이닉스",
    market: "KOREA",
    price: 180000,
  });

  assert.equal(result.decision, "NO");
  assert.equal(result.ensembleScore, 0);
  assert.match(result.summaryMessage, /NO_DATA \/ NO_TRADE/);
  assert.ok(result.riskReasons.some((r) => r.includes("RSI")));
  assert.ok(result.riskReasons.some((r) => r.includes("RVOL")));
});

test("ensemble blocks overbought and high volatility candidate", () => {
  const result = OpenSourceSignalEnsemble.evaluateCandidate({
    symbol: "000660",
    name: "SK하이닉스",
    market: "KOREA",
    price: 180000,
    rsi: 78,
    rvol: 1.1,
    adx: 30,
    atrPct: 9.5,
    grade: "A",
  });

  assert.ok(result.riskReasons.some((r) => r.includes("RSI")));
  assert.notEqual(result.decision, "REVIEW_READY");
});
