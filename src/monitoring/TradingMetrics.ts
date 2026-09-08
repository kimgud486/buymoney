export interface PerformanceMetrics {
  totalTrades: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  expectancy: number;
  profitFactor: number;
  maxDrawdownPct: number;
  rejectedOrdersCount: number;
  partialFillRate: number;
}

export class TradingMetrics {
  public static calculate(trades: Array<{ pnl: number; isWin: boolean }>): PerformanceMetrics {
    if (trades.length === 0) {
      return {
        totalTrades: 0,
        winRate: 0,
        averageWin: 0,
        averageLoss: 0,
        expectancy: 0,
        profitFactor: 0,
        maxDrawdownPct: 0,
        rejectedOrdersCount: 0,
        partialFillRate: 0
      };
    }

    const wins = trades.filter(t => t.isWin);
    const losses = trades.filter(t => !t.isWin);

    const winRate = wins.length / trades.length;
    const avgWin = wins.length > 0 ? wins.reduce((sum, w) => sum + w.pnl, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, l) => sum + l.pnl, 0)) / losses.length : 0;

    const expectancy = winRate * avgWin - (1 - winRate) * avgLoss;
    const profitFactor = avgLoss > 0 ? (wins.reduce((sum, w) => sum + w.pnl, 0)) / Math.abs(losses.reduce((sum, l) => sum + l.pnl, 0)) : 1.0;

    return {
      totalTrades: trades.length,
      winRate,
      averageWin: avgWin,
      averageLoss: avgLoss,
      expectancy,
      profitFactor,
      maxDrawdownPct: 0,
      rejectedOrdersCount: 0,
      partialFillRate: 0
    };
  }
}
