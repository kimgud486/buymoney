import { TradingModeV132 } from "../v13_2/PaperDryRunLiveGateV132";

export interface PromotionHardenedEvaluationV134 {
  allowLiveTrading: boolean;
  rejectionReasons: string[];
  accountVerified: boolean;
  timestamp: string;
}

export class PromotionGateHardeningV134 {
  /**
   * Strictly evaluates if account is eligible for LIVE promotion.
   * Key Rule: accountVerified MUST be explicitly true. Undefined or false -> FAIL-CLOSED.
   */
  public evaluateLivePromotion(
    currentMode: TradingModeV132,
    stats: {
      totalTradesCount: number;
      winningTradesCount: number;
      maxDrawdownPct: number;
      accountVerified?: boolean;
    },
    criteria?: {
      minTradesCount?: number;
      minWinRatePct?: number;
      maxDrawdownPct?: number;
      accountVerified?: boolean;
    }
  ): PromotionHardenedEvaluationV134 {
    const rejectionReasons: string[] = [];

    // STRICT FAIL-CLOSED GATE: accountVerified MUST be explicitly true
    const isAccountVerified = criteria?.accountVerified ?? stats.accountVerified;
    if (isAccountVerified !== true) {
      rejectionReasons.push("KIS_REAL_ACCOUNT_NOT_VERIFIED_STRICT_BLOCK");
    }

    const minTrades = criteria?.minTradesCount ?? 20;
    const minWinRate = criteria?.minWinRatePct ?? 55.0;
    const maxDrawdown = criteria?.maxDrawdownPct ?? 3.0;

    if (stats.totalTradesCount < minTrades) {
      rejectionReasons.push(`INSUFFICIENT_TEST_TRADES (${stats.totalTradesCount}/${minTrades})`);
    }

    const winRate = stats.totalTradesCount > 0 ? (stats.winningTradesCount / stats.totalTradesCount) * 100 : 0;
    if (winRate < minWinRate) {
      rejectionReasons.push(`WIN_RATE_BELOW_THRESHOLD (${winRate.toFixed(1)}% < ${minWinRate}%)`);
    }

    if (stats.maxDrawdownPct > maxDrawdown) {
      rejectionReasons.push(`MAX_DRAWDOWN_EXCEEDED (${stats.maxDrawdownPct.toFixed(2)}% > ${maxDrawdown}%)`);
    }

    return {
      allowLiveTrading: rejectionReasons.length === 0,
      rejectionReasons,
      accountVerified: isAccountVerified === true,
      timestamp: new Date().toISOString()
    };
  }
}

export const promotionGateHardeningV134 = new PromotionGateHardeningV134();
