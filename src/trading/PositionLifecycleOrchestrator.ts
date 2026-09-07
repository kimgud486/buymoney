// ----------------------------------------------------------------------
// POSITION LIFECYCLE ORCHESTRATOR V18 (AISTOCK V18 UNIFIED RUNTIME ENGINE)
// Unified Heartbeat Connecting Trailing Engine, Exit Evidence & State Machine
// ----------------------------------------------------------------------

import { PositionState, PositionQuantityState, PositionStateMachine } from "./PositionStateMachine";
import { ExitEvidence, ExitEvidenceEngine } from "../services/ExitEvidenceEngine";
import { AdaptiveTrailingExitEngineV18, TrailingCalculationResult } from "../services/AdaptiveTrailingExitEngineV18";
import { CandlePatternSignal } from "../services/CandlePatternEngine";

export interface LifecycleInput {
  positionId: string;
  symbol: string;
  strategyId: string;
  state: PositionState;

  entryPrice: number;
  currentPrice: number;
  highestPriceSinceBuy: number;
  lowestPriceSinceBuy?: number;
  previousTrailingFloor: number | null;

  quantities: PositionQuantityState;

  atr14: number | null;
  vwap: number | null;
  ema20: number | null;
  swingLow: number | null;

  structureValid: boolean;
  bearishChoch: boolean;
  swingLowBreak: boolean;

  macdWeakening: boolean;
  rsiWeakening: boolean;
  bearishPatterns: CandlePatternSignal[];

  orderFlowReversal: boolean;
  cvdDivergence: boolean;

  relativeStrengthLoss: boolean;
  marketWeakness: boolean;

  strategyAtrMultiplier?: number;
  watchThreshold?: number;
  sellThreshold?: number;
}

export interface LifecycleOutput {
  nextState: PositionState;
  trailing: TrailingCalculationResult;
  exitEvidence: ExitEvidence;
  isActionableSellIntent: boolean;
}

export class PositionLifecycleOrchestrator {
  /**
   * Unified evaluation cycle run on every new candle or market update
   */
  public static evaluate(input: LifecycleInput): LifecycleOutput {
    // 1. Calculate Adaptive Trailing Floor & Initial Risk Stop
    const trailing = AdaptiveTrailingExitEngineV18.calculateTrailingFloor({
      symbol: input.symbol,
      entryPrice: input.entryPrice,
      currentPrice: input.currentPrice,
      highestPriceSinceBuy: Math.max(input.highestPriceSinceBuy, input.currentPrice),
      previousTrailingFloor: input.previousTrailingFloor,
      atr14: input.atr14,
      vwap: input.vwap,
      ema20: input.ema20,
      swingLow: input.swingLow,
      strategyAtrMultiplier: input.strategyAtrMultiplier
    });

    // 2. Evaluate Multi-Factor Exit Evidence
    const exitEvidence = ExitEvidenceEngine.evaluate({
      currentPrice: input.currentPrice,
      entryPrice: input.entryPrice,
      highestPriceSinceBuy: Math.max(input.highestPriceSinceBuy, input.currentPrice),
      lowestPriceSinceBuy: Math.min(input.lowestPriceSinceBuy || input.currentPrice, input.currentPrice),
      initialStopPrice: trailing.initialRiskStop,
      trailingFloorPrice: trailing.newTrailingFloor,

      structureValid: input.structureValid,
      bearishChoch: input.bearishChoch,
      swingLowBreak: input.swingLowBreak,

      aboveVWAP: input.vwap != null && input.currentPrice > input.vwap,
      aboveEMA20: input.ema20 != null && input.currentPrice > input.ema20,

      macdWeakening: input.macdWeakening,
      rsiWeakening: input.rsiWeakening,

      bearishCandlePatterns: input.bearishPatterns,

      orderFlowReversal: input.orderFlowReversal,
      cvdDivergence: input.cvdDivergence,

      relativeStrengthLoss: input.relativeStrengthLoss,
      marketWeakness: input.marketWeakness
    });

    // 3. Evaluate State Transition
    const nextState = PositionStateMachine.evaluateNextState({
      state: input.state,
      symbol: input.symbol,
      strategyId: input.strategyId,

      entryPrice: input.entryPrice,
      currentPrice: input.currentPrice,
      highestPriceSinceBuy: Math.max(input.highestPriceSinceBuy, input.currentPrice),
      initialStopPrice: trailing.initialRiskStop,
      trailingFloorPrice: trailing.newTrailingFloor,

      quantities: input.quantities,
      exitEvidence,

      watchThreshold: input.watchThreshold,
      sellThreshold: input.sellThreshold
    });

    const isActionableSellIntent = nextState === "SELL_PENDING";

    return {
      nextState,
      trailing,
      exitEvidence,
      isActionableSellIntent
    };
  }

  /**
   * Fast-path check for tick-level emergency/hard stop triggers
   */
  public static checkFastPathHardStop(
    currentPrice: number,
    initialStopPrice: number | null,
    trailingFloorPrice: number | null,
    defenseSellPrice: number | null = null
  ): boolean {
    const executionFloor = Math.max(
      initialStopPrice ?? -Infinity,
      trailingFloorPrice ?? -Infinity,
      defenseSellPrice ?? -Infinity
    );
    return Number.isFinite(executionFloor) && currentPrice <= executionFloor;
  }
}
