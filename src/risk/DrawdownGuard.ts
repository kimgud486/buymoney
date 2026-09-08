export class DrawdownGuard {
  public static evaluate(portfolioDrawdownPct: number, maxPortfolioDrawdownPct: number): { pass: boolean; reason?: string } {
    if (portfolioDrawdownPct >= maxPortfolioDrawdownPct) {
      return {
        pass: false,
        reason: `PORTFOLIO_DRAWDOWN_LIMIT: Portfolio drawdown ${portfolioDrawdownPct.toFixed(2)}% exceeded limit ${maxPortfolioDrawdownPct}%`
      };
    }
    return { pass: true };
  }
}
