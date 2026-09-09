import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { OpenSourceSignalEnsemble } from "../src/autonomous/OpenSourceSignalEnsemble";

describe("OpenSourceSignalEnsemble Unit Tests", () => {
  it("computes REVIEW_READY score and maintains human approval requirement", () => {
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
    assert.ok(["YES", "REVIEW_READY"].includes(result.decision));
    assert.equal(result.riskReasons.length, 0);
  });

  it("catches high RSI risk and flags REVIEW_READY/YES as false", () => {
    const result = OpenSourceSignalEnsemble.evaluateCandidate({
      symbol: "000660",
      name: "SK하이닉스",
      price: 180000,
      rsi: 78,
      rvol: 1.1,
      atrPct: 9.5,
    });

    assert.equal(result.approvalRequired, true);
    assert.ok(result.riskReasons.some((r) => r.includes("RSI")));
    assert.notEqual(result.decision, "REVIEW_READY");
  });
});
