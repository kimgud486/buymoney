export type TradingModeV132 = "PAPER" | "DRY_RUN" | "LIVE";

export interface PromotionCriteriaV132 {
  minTradesCount?: number;     // Minimum required trades in PAPER/DRY_RUN (default 20)
  minWinRatePct?: number;      // Minimum required win rate % (default 55%)
  maxDrawdownPct?: number;     // Maximum allowable drawdown % (default 3.0%)
  accountVerified?: boolean;   // KIS real account verification flag
}

export interface PromotionEvaluationV132 {
  currentMode: TradingModeV132;
  allowLiveTrading: boolean;
  actualTradesCount: number;
  actualWinRatePct: number;
  actualMaxDrawdownPct: number;
  rejectionReasons: string[];
  timestamp: string;
}

export class PaperDryRunLiveGateV132 {
  /**
   * Evaluates whether the system is qualified to promote to real LIVE trading mode.
   */
  public evaluateLivePromotion(
    currentMode: TradingModeV132,
    stats: {
      totalTradesCount: number;
      winningTradesCount: number;
      maxDrawdownPct: number;
      accountVerified?: boolean;
    },
    criteria: PromotionCriteriaV132 = {}
  ): PromotionEvaluationV132 {
    const minTrades = criteria.minTradesCount ?? 20;
    const minWinRate = criteria.minWinRatePct ?? 55.0;
    const maxDrawdown = criteria.maxDrawdownPct ?? 3.0;
    const isAccountVerified = criteria.accountVerified ?? stats.accountVerified ?? true;

    const rejectionReasons: string[] = [];

    // 1. Trades Count Gate
    if (stats.totalTradesCount < minTrades) {
      rejectionReasons.push(`INSUFFICIENT_TEST_TRADES (${stats.totalTradesCount}/${minTrades})`);
    }

    // 2. Win Rate Gate
    const winRate = stats.totalTradesCount > 0
      ? (stats.winningTradesCount / stats.totalTradesCount) * 100
      : 0;

    if (winRate < minWinRate) {
      rejectionReasons.push(`WIN_RATE_BELOW_THRESHOLD (${winRate.toFixed(1)}% < ${minWinRate}%)`);
    }

    // 3. Max Drawdown Gate
    if (stats.maxDrawdownPct > maxDrawdown) {
      rejectionReasons.push(`MAX_DRAWDOWN_EXCEEDED (${stats.maxDrawdownPct.toFixed(2)}% > ${maxDrawdown}%)`);
    }

    // 4. KIS Real Account Verification Gate
    if (!isAccountVerified) {
      rejectionReasons.push("KIS_REAL_ACCOUNT_NOT_VERIFIED");
    }

    const allowLiveTrading = rejectionReasons.length === 0;

    return {
      currentMode,
      allowLiveTrading,
      actualTradesCount: stats.totalTradesCount,
      actualWinRatePct: winRate,
      actualMaxDrawdownPct: stats.maxDrawdownPct,
      rejectionReasons,
      timestamp: new Date().toISOString()
    };
  }
}

export const paperDryRunLiveGateV132 = new PaperDryRunLiveGateV132();
