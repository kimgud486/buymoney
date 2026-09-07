import { RiskGovernorInputV132, ExecutionRiskGovernorResultV132 } from "./typesV132";
import { positionSizingEngineV132 } from "./PositionSizingEngineV132";
import { dailyRiskGovernorV132 } from "./DailyRiskGovernorV132";

export class ExecutionRiskGovernorV132 {
  /**
   * Master Risk Governor combining Position Sizing, Daily Loss Gate, Spread, and Slippage limits.
   */
  public evaluateRisk(input: RiskGovernorInputV132): ExecutionRiskGovernorResultV132 {
    const rejectionReasons: string[] = [];

    // 1. Evaluate Daily Loss Limit Gate
    const dailyLossGate = dailyRiskGovernorV132.evaluateDailyLossGate(input);
    if (!dailyLossGate.canTrade) {
      rejectionReasons.push(dailyLossGate.reason);
    }

    // 2. Evaluate Bid-Ask Spread Limit (if provided)
    const {
      bidAskSpreadPct = 0,
      maxSpreadLimitPct = 0.02, // 2% max spread default
      estimatedSlippagePct = 0,
      maxSlippageLimitPct = 0.015 // 1.5% max slippage default
    } = input;

    if (bidAskSpreadPct > maxSpreadLimitPct) {
      rejectionReasons.push(`EXCESSIVE_BID_ASK_SPREAD (${(bidAskSpreadPct * 100).toFixed(2)}% > ${(maxSpreadLimitPct * 100).toFixed(2)}%)`);
    }

    if (estimatedSlippagePct > maxSlippageLimitPct) {
      rejectionReasons.push(`EXCESSIVE_SLIPPAGE (${(estimatedSlippagePct * 100).toFixed(2)}% > ${(maxSlippageLimitPct * 100).toFixed(2)}%)`);
    }

    // 3. Evaluate Position Sizing Engine
    const positionSizing = positionSizingEngineV132.calculatePositionSize(input);
    if (!positionSizing.riskApproved && positionSizing.rejectionReason) {
      rejectionReasons.push(positionSizing.rejectionReason);
    }

    const approved = rejectionReasons.length === 0 && positionSizing.recommendedQty > 0;

    return {
      symbol: input.symbol,
      approved,
      proposedQty: input.proposedQty,
      approvedQty: approved ? positionSizing.recommendedQty : 0,
      allocatedCapitalKRW: approved ? positionSizing.calculatedPositionSizeKRW : 0,
      positionSizing,
      dailyLossGate,
      rejectionReasons,
      timestamp: new Date().toISOString()
    };
  }
}

export const executionRiskGovernorV132 = new ExecutionRiskGovernorV132();
