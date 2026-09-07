import { RiskGovernorInputV132, DailyLossGateResultV132 } from "./typesV132";

export class DailyRiskGovernorV132 {
  /**
   * Checks daily drawdown and daily loss limit budget.
   */
  public evaluateDailyLossGate(input: RiskGovernorInputV132): DailyLossGateResultV132 {
    const {
      totalAccountCapitalKRW,
      dailyRealizedLossKRW,
      maxDailyLossLimitKRW
    } = input;

    if (totalAccountCapitalKRW <= 0) {
      return {
        canTrade: false,
        dailyLossPct: 0,
        remainingLossBudgetKRW: 0,
        isDailyLossLimitHit: true,
        reason: "INVALID_ACCOUNT_CAPITAL"
      };
    }

    const dailyLossPct = dailyRealizedLossKRW / totalAccountCapitalKRW;
    const remainingLossBudgetKRW = Math.max(0, maxDailyLossLimitKRW - dailyRealizedLossKRW);
    const isDailyLossLimitHit = dailyRealizedLossKRW >= maxDailyLossLimitKRW;

    if (isDailyLossLimitHit) {
      return {
        canTrade: false,
        dailyLossPct,
        remainingLossBudgetKRW: 0,
        isDailyLossLimitHit: true,
        reason: "MAX_DAILY_LOSS_LIMIT_BREACHED"
      };
    }

    return {
      canTrade: true,
      dailyLossPct,
      remainingLossBudgetKRW,
      isDailyLossLimitHit: false,
      reason: "OK"
    };
  }
}

export const dailyRiskGovernorV132 = new DailyRiskGovernorV132();
