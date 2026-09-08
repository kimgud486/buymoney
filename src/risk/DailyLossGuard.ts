export class DailyLossGuard {
  public static evaluate(dailyPnlPct: number, maxDailyLossPct: number): { pass: boolean; reason?: string } {
    if (dailyPnlPct <= -maxDailyLossPct) {
      return {
        pass: false,
        reason: `DAILY_LOSS_LIMIT: Daily PnL ${dailyPnlPct.toFixed(2)}% breached max allowed loss -${maxDailyLossPct}%`
      };
    }
    return { pass: true };
  }
}
