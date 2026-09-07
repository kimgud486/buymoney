// AISTOCK v13.8 DYNAMIC EXIT ENGINE
// Re-evaluates position status on every new final candle.
// States: HOLD | PROFIT_HOLD | SELL_WATCH | SELL
// Evaluates Market Structure (HH/HL), Trailing Floor Ratchet, Momentum Weakening, and Multi-Evidence Exits.
// STRICT DIRECTIVE: No fixed percentage profit targets!

export type DynamicExitState = "HOLD" | "PROFIT_HOLD" | "SELL_WATCH" | "SELL";

export interface ExitEvaluationInputs {
  symbol: string;
  entryPrice: number;
  currentPrice: number;
  highestPriceSinceBuy: number;
  previousTrailingFloor: number;
  isNewFinalCandle: boolean;
  structure: {
    isHHHL: boolean;        // Higher Highs & Higher Lows structure intact
    isHLBreak: boolean;     // Higher Low broken (bearish structural shift)
    isSupportBreak: boolean;// Key support broken
  };
  indicators: {
    vwap: number | null;
    isVwapLoss: boolean;
    isMacdDeteriorated: boolean;
    isRsiDeteriorated: boolean;
    isVolumeCollapsed: boolean;
    isFailedBreakout: boolean;
    atr14: number | null;
  };
}

export interface DynamicExitResult {
  state: DynamicExitState;
  newTrailingFloor: number;
  profitPct: number;
  evidenceCount: number;
  evidences: string[];
  reason: string;
}

export class DynamicExitEngineV138 {
  public static evaluate(inputs: ExitEvaluationInputs): DynamicExitResult {
    const {
      entryPrice,
      currentPrice,
      highestPriceSinceBuy,
      previousTrailingFloor,
      isNewFinalCandle,
      structure,
      indicators,
    } = inputs;

    const profitPct = +(((currentPrice - entryPrice) / entryPrice) * 100).toFixed(2);
    const highestProfitPct = +(((highestPriceSinceBuy - entryPrice) / entryPrice) * 100).toFixed(2);

    // 1. Monotonic Ratchet Trailing Floor Calculation
    // Never allow trailing floor to move downward
    let calculatedFloor = previousTrailingFloor;
    const atr = indicators.atr14 ?? 0;

    if (currentPrice > entryPrice) {
      // Ratchet floor upward as highest price expands
      const dynamicRatchetFloor = highestPriceSinceBuy - (atr * 2.0);
      calculatedFloor = Math.max(previousTrailingFloor, dynamicRatchetFloor);
    }
    const newTrailingFloor = +Math.max(previousTrailingFloor, calculatedFloor).toFixed(2);

    // 2. Trailing Floor Breach -> Direct SELL
    if (currentPrice < newTrailingFloor) {
      return {
        state: "SELL",
        newTrailingFloor,
        profitPct,
        evidenceCount: 1,
        evidences: ["PREVIOUS_TRAILING_FLOOR_BREACHED"],
        reason: `Price ${currentPrice} breached trailing floor ${newTrailingFloor}`,
      };
    }

    // 3. Multi-Evidence Exit Confirmation Collection
    const evidences: string[] = [];
    if (structure.isHLBreak) evidences.push("HIGHER_LOW_BROKEN");
    if (structure.isSupportBreak) evidences.push("SUPPORT_LEVEL_BROKEN");
    if (indicators.isVwapLoss) evidences.push("VWAP_LOST");
    if (indicators.isMacdDeteriorated) evidences.push("MACD_DETERIORATED");
    if (indicators.isRsiDeteriorated) evidences.push("RSI_DETERIORATED");
    if (indicators.isVolumeCollapsed) evidences.push("VOLUME_COLLAPSED");
    if (indicators.isFailedBreakout) evidences.push("FAILED_BREAKOUT");

    const evidenceCount = evidences.length;

    // 4. Decision Logic on New Final Candle
    let nextState: DynamicExitState = "HOLD";

    if (evidenceCount >= 2) {
      // Multiple confirmations -> Trigger SELL
      nextState = "SELL";
    } else if (evidenceCount === 1) {
      // Single warning indicator -> Transition to SELL_WATCH
      nextState = "SELL_WATCH";
    } else if (structure.isHHHL && profitPct > 2.0) {
      // Strong trend continuation with profit -> PROFIT_HOLD
      nextState = "PROFIT_HOLD";
    } else {
      nextState = "HOLD";
    }

    return {
      state: nextState,
      newTrailingFloor,
      profitPct,
      evidenceCount,
      evidences,
      reason: `Exit Engine Evaluated: State=${nextState}, Evidences=${evidenceCount}`,
    };
  }
}
