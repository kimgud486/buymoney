// ----------------------------------------------------------------------
// ADAPTIVE TRAILING EXIT ENGINE V18 (AISTOCK V18 RATCHET STOP ENGINE)
// Monotonic Trailing Ratchet & Dynamic Initial Risk Controls
// ----------------------------------------------------------------------

import { Candle } from "./StructureBrain";

export interface TrailingCalculationInput {
  symbol: string;
  entryPrice: number;
  currentPrice: number;
  highestPriceSinceBuy: number;
  previousTrailingFloor: number | null;

  atr14: number | null;
  vwap: number | null;
  ema20: number | null;
  swingLow: number | null;

  strategyAtrMultiplier?: number; // e.g. 1.5 for Scalping, 2.5 for Swing
}

export interface TrailingCalculationResult {
  initialRiskStop: number;
  newTrailingFloor: number;
  isRatchetUpdated: boolean;
  distanceToFloorPct: number;
  peakGivebackPct: number;
}

export class AdaptiveTrailingExitEngineV18 {
  /**
   * Calculate dynamic initial stop and monotonic ratchet trailing floor
   */
  public static calculateTrailingFloor(input: TrailingCalculationInput): TrailingCalculationResult {
    const {
      entryPrice,
      currentPrice,
      highestPriceSinceBuy,
      previousTrailingFloor,
      atr14,
      vwap,
      swingLow,
      strategyAtrMultiplier = 2.0
    } = input;

    // 1. Dynamic Initial Risk Calculation
    let structureRiskStop = swingLow != null && swingLow > 0 && swingLow < entryPrice ? swingLow : null;
    let atrRiskStop = atr14 != null && atr14 > 0 ? entryPrice - atr14 * strategyAtrMultiplier : null;

    // Fallback cap to max -5.0% if no technical anchor available
    let initialRiskStop = Math.max(
      entryPrice * 0.95,
      structureRiskStop ?? atrRiskStop ?? entryPrice * 0.97
    );

    // 2. Trailing Floor Proposal (Peak Chandelier / VWAP / Swing Low)
    const peakPrice = Math.max(entryPrice, highestPriceSinceBuy, currentPrice);
    const pnlPct = ((peakPrice - entryPrice) / entryPrice) * 100;

    let proposedFloor = initialRiskStop;

    if (pnlPct >= 1.5) {
      // Lock Break-even + fee buffer
      proposedFloor = Math.max(proposedFloor, entryPrice * 1.002);
    }

    if (pnlPct >= 3.0) {
      // Dynamic Trail behind peak based on ATR or % trail
      const trailDistance = atr14 != null && atr14 > 0 ? atr14 * 1.5 : peakPrice * 0.02;
      proposedFloor = Math.max(proposedFloor, peakPrice - trailDistance);
    }

    if (vwap != null && vwap > 0 && currentPrice > vwap) {
      // Keep trailing floor near VWAP - 0.2%
      proposedFloor = Math.max(proposedFloor, vwap * 0.998);
    }

    // Monotonic Ratchet Rule: Never lower the trailing stop for long positions
    const previousFloor = previousTrailingFloor ?? initialRiskStop;
    const finalTrailingFloor = +Math.max(previousFloor, proposedFloor).toFixed(2);
    const isRatchetUpdated = finalTrailingFloor > previousFloor;

    const distanceToFloorPct = +(((currentPrice - finalTrailingFloor) / currentPrice) * 100).toFixed(2);
    const peakGivebackPct = peakPrice > entryPrice ? +(((peakPrice - currentPrice) / peakPrice) * 100).toFixed(2) : 0;

    return {
      initialRiskStop: +initialRiskStop.toFixed(2),
      newTrailingFloor: finalTrailingFloor,
      isRatchetUpdated,
      distanceToFloorPct,
      peakGivebackPct
    };
  }
}
