// JUSIK2 V21 TRADE PLAN ENGINE
// Generates trade plans with structural invalidation SL and TP1/TP2/TP3 targets.

import { roundToKRXTick } from "./priceRules";
import { IndicatorSnapshotV21, MarketTypeV21, TradePlanV21 } from "./types";

export class TradePlanEngineV21 {
  public static createTradePlan(
    symbol: string,
    market: MarketTypeV21,
    entryPrice: number,
    indicators: IndicatorSnapshotV21,
    minRiskPct = 1.0,
    maxRiskPct = 4.0
  ): TradePlanV21 {
    if (!entryPrice || entryPrice <= 0) {
      throw new Error("[TradePlanEngineV21] Entry price must be positive");
    }

    // 1. Structural Stop Loss Candidates
    const candidates: number[] = [];

    if (indicators.lastSwingLow && indicators.lastSwingLow < entryPrice) {
      candidates.push(indicators.lastSwingLow * 0.998);
    }
    if (indicators.atr14 && indicators.atr14 > 0) {
      candidates.push(entryPrice - 1.5 * indicators.atr14);
    }
    if (indicators.vwap && indicators.vwap < entryPrice) {
      candidates.push(indicators.vwap * 0.995);
    }
    if (indicators.ema20 && indicators.ema20 < entryPrice) {
      candidates.push(indicators.ema20 * 0.995);
    }
    candidates.push(entryPrice * 0.98); // 2% fallback

    const maxStopPrice = entryPrice * (1 - minRiskPct / 100);
    const minStopPrice = entryPrice * (1 - maxRiskPct / 100);

    let rawStop = candidates.reduce((prev, curr) => {
      if (curr >= minStopPrice && curr <= maxStopPrice) {
        return Math.max(prev, curr);
      }
      return prev;
    }, minStopPrice);

    let stopLossPrice = market === "KOREA" ? roundToKRXTick(rawStop, "floor") : Number(rawStop.toFixed(2));
    if (stopLossPrice >= entryPrice) {
      stopLossPrice = market === "KOREA" ? roundToKRXTick(entryPrice * 0.98, "floor") : Number((entryPrice * 0.98).toFixed(2));
    }

    const riskAmount = entryPrice - stopLossPrice;
    const riskPct = Number(((riskAmount / entryPrice) * 100).toFixed(2));

    // 2. Derive Targets (TP1: ~0.75R, TP2: ~1.25R, TP3: ~2.00R)
    let rawTp1 = entryPrice + 0.75 * riskAmount;
    let rawTp2 = entryPrice + 1.25 * riskAmount;
    let rawTp3 = entryPrice + 2.00 * riskAmount;

    // Ensure strict TP1 < TP2 < TP3 monotonicity
    if (rawTp2 <= rawTp1) rawTp2 = rawTp1 + 0.5 * riskAmount;
    if (rawTp3 <= rawTp2) rawTp3 = rawTp2 + 0.75 * riskAmount;

    const tp1 = market === "KOREA" ? roundToKRXTick(rawTp1, "ceil") : Number(rawTp1.toFixed(2));
    const tp2 = market === "KOREA" ? roundToKRXTick(rawTp2, "ceil") : Number(rawTp2.toFixed(2));
    const tp3 = market === "KOREA" ? roundToKRXTick(rawTp3, "ceil") : Number(rawTp3.toFixed(2));

    const id = `PLAN_${symbol}_${Date.now()}`;

    return {
      id,
      symbol,
      market,
      createdAt: Date.now(),
      entryPrice,
      stopLossPrice,
      riskAmount,
      riskPct,
      tp1,
      tp2,
      tp3,
      rMultipliers: {
        tp1: Number(((tp1 - entryPrice) / riskAmount).toFixed(2)),
        tp2: Number(((tp2 - entryPrice) / riskAmount).toFixed(2)),
        tp3: Number(((tp3 - entryPrice) / riskAmount).toFixed(2)),
      },
    };
  }
}
