import type { LivePosition } from "./LivePositionRuntimeService";

export interface PositionRuntimeSnapshot {
  positionId: string;
  symbol: string;
  strategyId: string;

  state: string;

  entryPrice: number;
  currentPositionQty: number;

  trailingFloor: number | null;
  initialStopPrice: number | null;

  defenseSellPrice: number | null;

  expectedSellLow: number | null;
  expectedSellMid: number | null;
  expectedSellHigh: number | null;

  continuationScore: number | null;

  exitRiskScore: number | null;
  profitHoldStrength: string | null;
  sellWatchLevel: string | null;

  recommendedAction: string | null;

  updatedAt: number;
}

export function toPositionRuntimeSnapshot(
  position: LivePosition
): PositionRuntimeSnapshot {
  return {
    positionId: position.positionId,
    symbol: position.symbol,
    strategyId: position.strategyId,
    state: position.state,
    entryPrice: position.entryPrice,
    currentPositionQty: position.quantities?.currentPositionQty ?? 0,
    trailingFloor: position.trailingFloor,
    initialStopPrice: position.initialStopPrice,
    defenseSellPrice: position.defenseSellPrice,
    expectedSellLow: position.expectedSellLow,
    expectedSellMid: position.expectedSellMid,
    expectedSellHigh: position.expectedSellHigh,
    continuationScore: position.continuationScore,
    exitRiskScore: position.lastExitEvidence?.exitRiskScore ?? null,
    profitHoldStrength: position.lastExitEvidence?.profitHoldStrength ?? null,
    sellWatchLevel: position.lastExitEvidence?.sellWatchLevel ?? null,
    recommendedAction: position.lastExitEvidence?.recommendedAction ?? null,
    updatedAt: position.updatedAt
  };
}
