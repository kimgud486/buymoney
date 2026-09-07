import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MarketRegimeClassifierV137 } from "../../src/services/v13_7/MarketRegimeClassifierV137";
import { StrategyWeightEngineV137 } from "../../src/services/v13_7/StrategyWeightEngineV137";
import { ScannerSafetyGateV137 } from "../../src/services/v13_7/ScannerSafetyGateV137";
import { RegimeAwareScannerRouterV137 } from "../../src/services/v13_7/RegimeAwareScannerRouterV137";
import type { CandidateStockInput, MarketRegimeDataInput } from "../../src/services/v13_7/typesV137";

describe("AISTOCK v13.7 Regime-Aware Scanner Weight Engine Test Suite", () => {
  it("1. MarketRegimeClassifierV137: Classifies TREND_UP when price & slope are positive", () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 + i * 1.5);
    const regime = MarketRegimeClassifierV137.classify({
      indexCloses: closes,
      indexAtr: 2.0,
      volatilityPct: 1.2,
      isStaleFeed: false
    });
    assert.equal(regime, "TREND_UP");
  });

  it("2. MarketRegimeClassifierV137: Returns UNKNOWN when market feed is stale", () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 + i * 1.5);
    const regime = MarketRegimeClassifierV137.classify({
      indexCloses: closes,
      indexAtr: 2.0,
      volatilityPct: 1.2,
      isStaleFeed: true
    });
    assert.equal(regime, "UNKNOWN");
  });

  it("3. StrategyWeightEngineV137: Boosts ORB in TREND_UP and caps UNKNOWN regime to 1.0", () => {
    const trendWeight = StrategyWeightEngineV137.calculateWeight("ORB", "TREND_UP", "PROMOTE");
    assert.equal(trendWeight.regimeMultiplier, 1.3);
    assert.equal(trendWeight.statusMultiplier, 1.2);
    assert.equal(trendWeight.finalWeight, 1.56);

    const unknownWeight = StrategyWeightEngineV137.calculateWeight("ORB", "UNKNOWN", "PROMOTE");
    assert.ok(unknownWeight.finalWeight <= 1.0);
  });

  it("4. ScannerSafetyGateV137: Zeroes out final score when chaseRisk is true", () => {
    const candidate: CandidateStockInput = {
      symbol: "005930",
      market: "KOREA",
      price: 75000,
      setup: "ORB",
      rvol: 2.5,
      relativeStrength: 78,
      vwapAligned: true,
      liquidityPass: true,
      chaseRisk: true
    };
    const gate = ScannerSafetyGateV137.evaluate(candidate);
    assert.equal(gate.chaseRiskBlocked, true);
    assert.equal(gate.passSafetyGate, false);
    assert.equal(gate.finalScoreMultiplier, 0.0);
  });

  it("5. ScannerSafetyGateV137: Blocks candidates with RVOL < 1.2 or RS < 55", () => {
    const candidateLowRvol: CandidateStockInput = {
      symbol: "000660",
      market: "KOREA",
      price: 120000,
      setup: "BREAKOUT_RETEST",
      rvol: 0.9,
      relativeStrength: 70,
      vwapAligned: true,
      liquidityPass: true,
      chaseRisk: false
    };
    const gateLowRvol = ScannerSafetyGateV137.evaluate(candidateLowRvol);
    assert.equal(gateLowRvol.rvolBlocked, true);
    assert.equal(gateLowRvol.passSafetyGate, false);

    const candidateLowRS: CandidateStockInput = {
      symbol: "035420",
      market: "KOREA",
      price: 200000,
      setup: "VWAP_RECLAIM",
      rvol: 2.0,
      relativeStrength: 45,
      vwapAligned: true,
      liquidityPass: true,
      chaseRisk: false
    };
    const gateLowRS = ScannerSafetyGateV137.evaluate(candidateLowRS);
    assert.equal(gateLowRS.relativeStrengthBlocked, true);
    assert.equal(gateLowRS.passSafetyGate, false);
  });

  it("6. RegimeAwareScannerRouterV137: Evaluates candidates and ranks by final score", () => {
    const candidates: CandidateStockInput[] = [
      {
        symbol: "005930",
        market: "KOREA",
        price: 75000,
        setup: "ORB",
        strategyGrade: "PROMOTE",
        rvol: 2.2,
        relativeStrength: 82,
        vwapAligned: true,
        liquidityPass: true,
        chaseRisk: false
      },
      {
        symbol: "000660",
        market: "KOREA",
        price: 120000,
        setup: "ORB",
        strategyGrade: "KEEP",
        rvol: 1.5,
        relativeStrength: 65,
        vwapAligned: true,
        liquidityPass: true,
        chaseRisk: false
      },
      {
        symbol: "035720",
        market: "KOREA",
        price: 50000,
        setup: "ORB",
        strategyGrade: "KEEP",
        rvol: 2.5,
        relativeStrength: 88,
        vwapAligned: true,
        liquidityPass: true,
        chaseRisk: true // Chase risk!
      }
    ];

    const regimeInput: MarketRegimeDataInput = {
      indexCloses: Array.from({ length: 30 }, (_, i) => 100 + i * 1.0),
      indexAtr: 1.5,
      volatilityPct: 1.0,
      isStaleFeed: false
    };

    const results = RegimeAwareScannerRouterV137.processCandidates(candidates, regimeInput);

    assert.equal(results.length, 3);
    assert.equal(results[0].symbol, "005930");
    assert.equal(results[0].recommendation, "BUY_READY");
    assert.ok(results[0].finalScore > results[1].finalScore);

    // Chase risk item should be rejected with final score 0
    const chaseRiskResult = results.find(r => r.symbol === "035720");
    assert.ok(chaseRiskResult);
    assert.equal(chaseRiskResult.recommendation, "REJECTED");
    assert.equal(chaseRiskResult.finalScore, 0);
  });
});
