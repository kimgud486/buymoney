// AISTOCK v13.8 Net Expectancy & Profit Gate

export interface SetupStats {
  sampleSize: number;
  winRate: number;        // 0.0 - 1.0 (e.g. 0.62)
  avgWinPct: number;      // e.g. 2.5 (%)
  avgLossPct: number;     // e.g. 1.2 (%)
  profitFactor: number;   // e.g. 1.85
  oosExpectancyPct: number;          // Out-of-sample expectancy %
  walkForwardExpectancyPct: number;  // Walk-forward expectancy %
  expectedCostPct: number;           // Roundtrip fee + tax + slippage %
}

export interface ProfitGateDecision {
  decision: "TRADE_CANDIDATE" | "WAIT" | "NO_TRADE";
  reason: string;
  netExpectancyPct?: number;
}

export class ProfitGateV138 {
  public static evaluateProfitGate(stats: SetupStats): ProfitGateDecision {
    if (!stats || stats.sampleSize < 50) {
      return {
        decision: "WAIT",
        reason: "INSUFFICIENT_SAMPLE"
      };
    }

    const gross = stats.winRate * stats.avgWinPct - (1 - stats.winRate) * stats.avgLossPct;
    const net = gross - stats.expectedCostPct;

    if (net <= 0) {
      return {
        decision: "NO_TRADE",
        reason: "NEGATIVE_NET_EXPECTANCY"
      };
    }

    if (stats.profitFactor <= 1.0) {
      return {
        decision: "NO_TRADE",
        reason: "PF_NOT_ABOVE_ONE"
      };
    }

    if (stats.oosExpectancyPct <= 0 || stats.walkForwardExpectancyPct <= 0) {
      return {
        decision: "NO_TRADE",
        reason: "OOS_OR_WF_FAILED"
      };
    }

    return {
      decision: "TRADE_CANDIDATE",
      reason: "PROFIT_GATE_PASSED",
      netExpectancyPct: Number(net.toFixed(2))
    };
  }
}
