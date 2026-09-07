import type { ScannerSetupType, MarketRegimeV137, StrategyGradeV137 } from "./typesV137";

export interface WeightCalculationOutput {
  baseWeight: number;
  regimeMultiplier: number;
  statusMultiplier: number;
  finalWeight: number;
}

export class StrategyWeightEngineV137 {
  /**
   * Calculates dynamic scanner priority weight for a strategy setup under the current market regime.
   * Note: PROMOTE increases scanner priority ONLY; it does NOT bypass entry/risk gates.
   */
  public static calculateWeight(
    setup: ScannerSetupType,
    regime: MarketRegimeV137,
    grade: StrategyGradeV137 = "KEEP"
  ): WeightCalculationOutput {
    const baseWeight = 1.0;

    // 1. Strategy Grade Status Multiplier
    let statusMultiplier = 1.0;
    switch (grade) {
      case "PROMOTE":
        statusMultiplier = 1.2;
        break;
      case "KEEP":
        statusMultiplier = 1.0;
        break;
      case "WATCH":
        statusMultiplier = 0.7;
        break;
      case "DEMOTE":
        statusMultiplier = 0.3;
        break;
      case "DISABLE":
        statusMultiplier = 0.0;
        break;
    }

    // 2. Setup vs Regime Multiplier Matrix
    let regimeMultiplier = 1.0;

    if (regime === "UNKNOWN") {
      // In UNKNOWN regime, NO weight amplification is allowed!
      regimeMultiplier = 1.0;
    } else {
      switch (setup) {
        case "ORB":
          if (regime === "TREND_UP" || regime === "HIGH_VOL") regimeMultiplier = 1.3;
          else if (regime === "RANGE") regimeMultiplier = 0.9;
          else if (regime === "LOW_VOL") regimeMultiplier = 0.7;
          else if (regime === "TREND_DOWN") regimeMultiplier = 0.6;
          break;

        case "GAP_AND_GO":
          if (regime === "TREND_UP" || regime === "HIGH_VOL") regimeMultiplier = 1.35;
          else if (regime === "RANGE") regimeMultiplier = 0.8;
          else if (regime === "TREND_DOWN") regimeMultiplier = 0.5;
          break;

        case "BREAKOUT_RETEST":
          if (regime === "TREND_UP") regimeMultiplier = 1.3;
          else if (regime === "HIGH_VOL") regimeMultiplier = 1.1;
          else if (regime === "RANGE") regimeMultiplier = 0.85;
          else if (regime === "TREND_DOWN") regimeMultiplier = 0.5;
          break;

        case "VWAP_RECLAIM":
          if (regime === "TREND_UP") regimeMultiplier = 1.25;
          else if (regime === "RANGE") regimeMultiplier = 1.15;
          else if (regime === "TREND_DOWN") regimeMultiplier = 0.7;
          break;

        case "MEAN_REVERSION":
          if (regime === "RANGE") regimeMultiplier = 1.3;
          else if (regime === "LOW_VOL") regimeMultiplier = 1.2;
          else if (regime === "TREND_UP") regimeMultiplier = 0.8;
          else if (regime === "TREND_DOWN") regimeMultiplier = 0.7;
          break;
      }
    }

    let finalWeight = baseWeight * regimeMultiplier * statusMultiplier;

    // Strict Rule: In UNKNOWN regime, final weight cannot exceed 1.0
    if (regime === "UNKNOWN") {
      finalWeight = Math.min(1.0, finalWeight);
    }

    return {
      baseWeight,
      regimeMultiplier,
      statusMultiplier,
      finalWeight: Math.round(finalWeight * 100) / 100
    };
  }
}
