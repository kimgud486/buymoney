// AISTOCK v13.6 Strategy Statistics Engine
import { StrategyPerformanceMetrics, TradeRecordV136 } from "./typesV136";

export class StrategyStatsEngineV136 {
  public calculateMetrics(strategyId: string, trades: TradeRecordV136[]): StrategyPerformanceMetrics {
    if (!trades || trades.length === 0) {
      return {
        strategyId,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRatePct: 0,
        avgReturnPct: 0,
        avgRealizedR: 0,
        expectancyR: 0,
        profitFactor: 0,
        maxDrawdownPct: 0,
        avgSlippageBp: 0,
        lastEvaluatedAt: new Date().toISOString()
      };
    }

    const totalTrades = trades.length;
    const winningTrades = trades.filter(t => t.pnl > 0).length;
    const losingTrades = trades.filter(t => t.pnl < 0).length;
    const winRatePct = Math.round((winningTrades / totalTrades) * 10000) / 100;

    const totalReturnPct = trades.reduce((acc, t) => acc + t.returnPct, 0);
    const avgReturnPct = Math.round((totalReturnPct / totalTrades) * 100) / 100;

    const totalR = trades.reduce((acc, t) => acc + t.realizedR, 0);
    const avgRealizedR = Math.round((totalR / totalTrades) * 100) / 100;

    const winsR = trades.filter(t => t.pnl > 0).map(t => t.realizedR);
    const lossesR = trades.filter(t => t.pnl < 0).map(t => Math.abs(t.realizedR));

    const avgWinR = winsR.length > 0 ? winsR.reduce((a, b) => a + b, 0) / winsR.length : 0;
    const avgLossR = lossesR.length > 0 ? lossesR.reduce((a, b) => a + b, 0) / lossesR.length : 0;

    const winRateFrac = winningTrades / totalTrades;
    const lossRateFrac = 1 - winRateFrac;
    const expectancyR = Math.round((winRateFrac * avgWinR - lossRateFrac * avgLossR) * 100) / 100;

    const totalGrossProfit = trades.filter(t => t.pnl > 0).reduce((acc, t) => acc + t.pnl, 0);
    const totalGrossLoss = trades.filter(t => t.pnl < 0).reduce((acc, t) => acc + Math.abs(t.pnl), 0);

    const profitFactor = totalGrossLoss > 0
      ? Math.round((totalGrossProfit / totalGrossLoss) * 100) / 100
      : totalGrossProfit > 0 ? 99.0 : 0;

    // Max Drawdown Calculation
    let cumulative = 0;
    let peak = 0;
    let maxDd = 0;

    for (const t of trades) {
      cumulative += t.returnPct;
      if (cumulative > peak) {
        peak = cumulative;
      }
      const dd = peak - cumulative;
      if (dd > maxDd) {
        maxDd = dd;
      }
    }

    const totalSlippageBp = trades.reduce((acc, t) => acc + t.slippageBp, 0);
    const avgSlippageBp = Math.round((totalSlippageBp / totalTrades) * 10) / 10;

    return {
      strategyId,
      totalTrades,
      winningTrades,
      losingTrades,
      winRatePct,
      avgReturnPct,
      avgRealizedR,
      expectancyR,
      profitFactor,
      maxDrawdownPct: Math.round(maxDd * 100) / 100,
      avgSlippageBp,
      lastEvaluatedAt: new Date().toISOString()
    };
  }
}

export const globalStrategyStatsEngineV136 = new StrategyStatsEngineV136();
