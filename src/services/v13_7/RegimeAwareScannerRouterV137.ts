import type {
  CandidateStockInput,
  MarketRegimeDataInput,
  ScannerFilterResult
} from "./typesV137";
import { MarketRegimeClassifierV137 } from "./MarketRegimeClassifierV137";
import { StrategyWeightEngineV137 } from "./StrategyWeightEngineV137";
import { ScannerSafetyGateV137 } from "./ScannerSafetyGateV137";

export class RegimeAwareScannerRouterV137 {
  /**
   * Scans and ranks candidate stocks based on market regime and safety gates.
   */
  public static processCandidates(
    candidates: CandidateStockInput[],
    regimeInput: MarketRegimeDataInput
  ): ScannerFilterResult[] {
    const regime = MarketRegimeClassifierV137.classify(regimeInput);

    const results: ScannerFilterResult[] = candidates.map(candidate => {
      const weightOutput = StrategyWeightEngineV137.calculateWeight(
        candidate.setup,
        regime,
        candidate.strategyGrade || "KEEP"
      );

      const safetyResult = ScannerSafetyGateV137.evaluate(candidate);

      // Base candidate setup quality score (0 to 100)
      const baseSetupScore = Math.min(
        100,
        Math.max(
          0,
          candidate.relativeStrength * 0.4 +
            (candidate.todRvol ?? candidate.rvol) * 25 +
            (candidate.vwapAligned ? 20 : 0)
        )
      );

      const finalScore =
        Math.round(baseSetupScore * weightOutput.finalWeight * safetyResult.finalScoreMultiplier * 10) /
        10;

      let recommendation: "BUY_READY" | "BUY_WATCH" | "REJECTED" = "REJECTED";
      let reason = safetyResult.rejectionReason || "PASS_SAFETY_GATE";

      if (safetyResult.passSafetyGate) {
        if (finalScore >= 75) {
          recommendation = "BUY_READY";
        } else if (finalScore >= 50) {
          recommendation = "BUY_WATCH";
        } else {
          recommendation = "REJECTED";
          reason = `SCORE_BELOW_THRESHOLD:${finalScore}<50`;
        }
      }

      return {
        symbol: candidate.symbol,
        market: candidate.market,
        price: candidate.price,
        setup: candidate.setup,
        regime,
        baseWeight: weightOutput.baseWeight,
        regimeMultiplier: weightOutput.regimeMultiplier,
        statusMultiplier: weightOutput.statusMultiplier,
        finalWeight: weightOutput.finalWeight,
        finalScore,
        chaseRiskBlocked: safetyResult.chaseRiskBlocked,
        liquidityBlocked: safetyResult.liquidityBlocked,
        rvolBlocked: safetyResult.rvolBlocked,
        relativeStrengthBlocked: safetyResult.relativeStrengthBlocked,
        vwapAlignmentBlocked: safetyResult.vwapAlignmentBlocked,
        passSafetyGate: safetyResult.passSafetyGate,
        recommendation,
        reason
      };
    });

    // Rank candidates by final score descending
    return results.sort((a, b) => b.finalScore - a.finalScore);
  }
}
