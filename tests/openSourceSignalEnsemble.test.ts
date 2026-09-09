import { describe, it, expect } from "vitest";
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

    expect(result.approvalRequired).toBe(true);
    expect(result.liveAutoOrderEnabled).toBe(false);
    expect(result.rrRatio).toBeGreaterThanOrEqual(1.8);
    expect(result.ensembleScore).toBeGreaterThanOrEqual(80);
    expect(["YES", "REVIEW_READY"]).toContain(result.decision);
    expect(result.riskReasons.length).toBe(0);
  });

  it("catches high RSI risk and flags REVIEW_READY/YES as false", () => {
    const result = OpenSourceSignalEnsemble.evaluateCandidate({
      symbol: "000660",
      name: "SK하이닉스",
      price: 180000,
      rsi: 78, // Overbought
      rvol: 1.1,
      atrPct: 9.5,
    });

    expect(result.approvalRequired).toBe(true);
    expect(result.riskReasons.some((r) => r.includes("RSI"))).toBe(true);
    expect(result.decision).not.toBe("REVIEW_READY");
  });
});
