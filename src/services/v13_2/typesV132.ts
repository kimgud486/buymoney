// AISTOCK v13.2 Execution & Risk Governor - Type Definitions

export interface RiskGovernorInputV132 {
  symbol: string;
  targetPrice: number;
  proposedQty: number;
  totalAccountCapitalKRW: number;
  currentOpenExposureKRW: number;
  dailyRealizedLossKRW: number;
  maxDailyLossLimitKRW: number; // e.g., 500,000 KRW
  maxPositionSizePct?: number;  // e.g., 0.20 (20% of account capital per position)
  maxAccountExposurePct?: number; // e.g., 0.80 (80% total account exposure)
  bidAskSpreadPct?: number;    // e.g., 0.005 (0.5% spread)
  maxSpreadLimitPct?: number;  // e.g., 0.02 (2.0% max allowed spread)
  estimatedSlippagePct?: number; // e.g., 0.003 (0.3% estimated slippage)
  maxSlippageLimitPct?: number; // e.g., 0.015 (1.5% max allowed slippage)
}

export interface PositionSizingResultV132 {
  symbol: string;
  targetPrice: number;
  recommendedQty: number;
  calculatedPositionSizeKRW: number;
  positionSizePctOfAccount: number;
  riskApproved: boolean;
  rejectionReason?: string;
}

export interface DailyLossGateResultV132 {
  canTrade: boolean;
  dailyLossPct: number;
  remainingLossBudgetKRW: number;
  isDailyLossLimitHit: boolean;
  reason: string;
}

export interface ExecutionRiskGovernorResultV132 {
  symbol: string;
  approved: boolean;
  proposedQty: number;
  approvedQty: number;
  allocatedCapitalKRW: number;
  positionSizing: PositionSizingResultV132;
  dailyLossGate: DailyLossGateResultV132;
  rejectionReasons: string[];
  timestamp: string;
}
