// AISTOCK v13.6 Strategy Self-Evaluator
import { StrategyEvaluationGrade, StrategyPerformanceMetrics, StrategySelfEvaluationResult, TradeRecordV136 } from "./typesV136";
import { StrategyStatsEngineV136 } from "./StrategyStatsEngineV136";

export class StrategySelfEvaluatorV136 {
  private statsEngine = new StrategyStatsEngineV136();

  public evaluate(strategyId: string, trades: TradeRecordV136[]): StrategySelfEvaluationResult {
    const metrics = this.statsEngine.calculateMetrics(strategyId, trades);

    // Filter breakdowns
    const trendTrades = trades.filter(t => t.regime === "TREND");
    const rangeTrades = trades.filter(t => t.regime === "RANGE");
    const highVolTrades = trades.filter(t => t.regime === "HIGH_VOL");
    const lowVolTrades = trades.filter(t => t.regime === "LOW_VOL");

    const regimeBreakdown = {
      TREND: this.statsEngine.calculateMetrics(strategyId, trendTrades),
      RANGE: this.statsEngine.calculateMetrics(strategyId, rangeTrades),
      HIGH_VOL: this.statsEngine.calculateMetrics(strategyId, highVolTrades),
      LOW_VOL: this.statsEngine.calculateMetrics(strategyId, lowVolTrades)
    };

    const timeWindowBreakdown = {
      OPEN: this.statsEngine.calculateMetrics(strategyId, trades.filter(t => t.timeWindow === "OPEN")),
      MID: this.statsEngine.calculateMetrics(strategyId, trades.filter(t => t.timeWindow === "MID")),
      CLOSE: this.statsEngine.calculateMetrics(strategyId, trades.filter(t => t.timeWindow === "CLOSE")),
      AFTER_HOURS: this.statsEngine.calculateMetrics(strategyId, trades.filter(t => t.timeWindow === "AFTER_HOURS"))
    };

    let grade: StrategyEvaluationGrade = "KEEP";
    let suggestedSizeMultiplier = 1.0;
    let recommendationReason = "Performance within normal expected parameters.";

    if (metrics.totalTrades < 5) {
      grade = "KEEP";
      suggestedSizeMultiplier = 0.5; // Half size during initial sample gathering
      recommendationReason = `Insufficient sample size (${metrics.totalTrades} < 5 trades). Keeping standard monitoring.`;
    } else if (metrics.expectancyR < -0.2 || metrics.profitFactor < 0.8 || metrics.maxDrawdownPct > 15.0) {
      grade = "DISABLE";
      suggestedSizeMultiplier = 0.0;
      recommendationReason = `Negative expectancy (R=${metrics.expectancyR}), profit factor (${metrics.profitFactor}), or excessive drawdown (${metrics.maxDrawdownPct}%). Strategy disabled for live execution.`;
    } else if (metrics.expectancyR < 0 || metrics.profitFactor < 1.0 || metrics.winRatePct < 40.0) {
      grade = "DEMOTE";
      suggestedSizeMultiplier = 0.25;
      recommendationReason = `Sub-par performance metrics (Expectancy R=${metrics.expectancyR}, PF=${metrics.profitFactor}). Demoting position size.`;
    } else if (metrics.expectancyR < 0.15 || metrics.profitFactor < 1.3) {
      grade = "WATCH";
      suggestedSizeMultiplier = 0.75;
      recommendationReason = `Borderline performance metrics. Position size reduced for close monitoring.`;
    } else if (metrics.expectancyR >= 0.4 && metrics.profitFactor >= 1.8 && metrics.totalTrades >= 15 && metrics.maxDrawdownPct <= 8.0) {
      grade = "PROMOTE";
      suggestedSizeMultiplier = 1.25;
      recommendationReason = `Exceptional performance (Expectancy R=${metrics.expectancyR}, PF=${metrics.profitFactor}, MaxDD=${metrics.maxDrawdownPct}%). Strategy promoted with increased allocation.`;
    }

    return {
      strategyId,
      grade,
      currentMetrics: metrics,
      regimeBreakdown,
      timeWindowBreakdown,
      recommendationReason,
      suggestedSizeMultiplier
    };
  }
}

export const globalStrategySelfEvaluatorV136 = new StrategySelfEvaluatorV136();
