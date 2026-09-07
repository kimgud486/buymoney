// AISTOCK Profit Gate & Execution Reality Engine
// Evaluates net expectancy after trading costs (commission, tax, bid-ask spread, slippage, market impact).

export interface ProfitGateInput {
  strategyId: string;
  winRatePct: number; // e.g. 60.0
  avgWinR: number;    // e.g. 2.0
  avgLossR: number;   // e.g. 1.0
  riskAmountWon: number; // Avg win in currency
  riskAmountLost: number; // Avg loss in currency
  commissionBp?: number;  // Broker commission (default 15 bp)
  taxBp?: number;         // Transaction tax (default 20 bp)
  spreadBp?: number;      // Bid-ask spread (default 10 bp)
  slippageBp?: number;    // Slippage (default 5 bp)
  marketImpactBp?: number;// Market impact (default 5 bp)
  isStrategyVerifiedOOS?: boolean;
}

export interface ProfitGateOutput {
  setupScore: number;
  validationScore: number;
  executionScore: number;
  grossExpectancyCurrency: number;
  expectedTradingCostsCurrency: number;
  netExpectancyCurrency: number;
  netExpectancyR: number;
  mlProbability: number | null; // null when no real ML model is executed
  liveSignalWeight: number; // 0.0 to 1.0 (0.0 for unverified strategies)
  aiCouncilVote: "ENABLED" | "DISABLED";
  decision: "BUY_READY" | "TRADE_CANDIDATE" | "WAIT" | "NO_TRADE";
  reason: string;
}

export class ProfitGate {
  public static evaluate(input: ProfitGateInput): ProfitGateOutput {
    const commissionBp = input.commissionBp ?? 15;
    const taxBp = input.taxBp ?? 20;
    const spreadBp = input.spreadBp ?? 10;
    const slippageBp = input.slippageBp ?? 5;
    const marketImpactBp = input.marketImpactBp ?? 5;

    const totalCostBp = commissionBp + taxBp + spreadBp + slippageBp + marketImpactBp;
    const totalCostPct = totalCostBp / 10000;

    const winRate = input.winRatePct / 100;
    const lossRate = 1 - winRate;

    const grossExpectancyCurrency = winRate * input.riskAmountWon - lossRate * input.riskAmountLost;
    const avgTradeNotional = (input.riskAmountWon + input.riskAmountLost) / 2 * 10;
    const expectedTradingCostsCurrency = avgTradeNotional * totalCostPct;
    const netExpectancyCurrency = grossExpectancyCurrency - expectedTradingCostsCurrency;

    const riskUnit = input.riskAmountLost > 0 ? input.riskAmountLost : 1;
    const netExpectancyR = netExpectancyCurrency / riskUnit;

    const setupScore = Math.min(100, Math.max(0, Math.round(input.winRatePct * 1.2)));
    const validationScore = input.isStrategyVerifiedOOS ? 85 : 40;
    const executionScore = totalCostBp <= 50 ? 90 : 60;

    const isVerified = input.isStrategyVerifiedOOS === true;
    const liveSignalWeight = isVerified && netExpectancyR > 0.1 ? 1.0 : 0.0;
    const aiCouncilVote = isVerified ? "ENABLED" as const : "DISABLED" as const;

    let decision: ProfitGateOutput["decision"] = "NO_TRADE";
    let reason = "";

    if (!isVerified) {
      decision = "TRADE_CANDIDATE";
      reason = "Strategy is not OOS verified. Live signal weight forced to 0 (TRADE_CANDIDATE mode).";
    } else if (netExpectancyCurrency <= 0) {
      decision = "NO_TRADE";
      reason = `Negative net expectancy after trading costs (${totalCostBp} bps). Net Expectancy: ${netExpectancyCurrency.toFixed(2)}`;
    } else if (netExpectancyR < 0.15) {
      decision = "WAIT";
      reason = `Net Expectancy R (${netExpectancyR.toFixed(2)}) is below minimal live execution threshold (0.15 R).`;
    } else {
      decision = "BUY_READY";
      reason = `Passed all Profit Gate cost deductions (${totalCostBp} bps). Net Expectancy R: +${netExpectancyR.toFixed(2)} R.`;
    }

    return {
      setupScore,
      validationScore,
      executionScore,
      grossExpectancyCurrency,
      expectedTradingCostsCurrency,
      netExpectancyCurrency,
      netExpectancyR: Math.round(netExpectancyR * 100) / 100,
      mlProbability: null, // Strictly null when no real trained ML model is loaded
      liveSignalWeight,
      aiCouncilVote,
      decision,
      reason
    };
  }
}
