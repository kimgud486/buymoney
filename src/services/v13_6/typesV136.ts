// AISTOCK v13.6 Strategy Evaluation Types

export type StrategyEvaluationGrade = "PROMOTE" | "KEEP" | "WATCH" | "DEMOTE" | "DISABLE";

export type MarketRegime = "TREND" | "RANGE" | "HIGH_VOL" | "LOW_VOL";

export type TimeWindow = "OPEN" | "MID" | "CLOSE" | "AFTER_HOURS";

export interface TradeRecordV136 {
  tradeId: string;
  strategyId: string;
  symbol: string;
  market: string;
  regime: MarketRegime;
  timeWindow: TimeWindow;
  entryPrice: number;
  exitPrice: number;
  qty: number;
  pnl: number;
  returnPct: number;
  riskAmount: number; // R-unit denominator
  realizedR: number;  // pnl / riskAmount
  slippageBp: number;
  holdTimeMinutes: number;
  entryTimestamp: number;
  exitTimestamp: number;
}

export interface StrategyPerformanceMetrics {
  strategyId: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRatePct: number;
  avgReturnPct: number;
  avgRealizedR: number;
  expectancyR: number; // (WinRate * AvgWinR) - (LossRate * AvgLossR)
  profitFactor: number;
  maxDrawdownPct: number;
  avgSlippageBp: number;
  lastEvaluatedAt: string;
}

export interface StrategySelfEvaluationResult {
  strategyId: string;
  grade: StrategyEvaluationGrade;
  currentMetrics: StrategyPerformanceMetrics;
  regimeBreakdown: Record<MarketRegime, Partial<StrategyPerformanceMetrics>>;
  timeWindowBreakdown: Record<TimeWindow, Partial<StrategyPerformanceMetrics>>;
  recommendationReason: string;
  suggestedSizeMultiplier: number; // 0.0 to 1.5
}
