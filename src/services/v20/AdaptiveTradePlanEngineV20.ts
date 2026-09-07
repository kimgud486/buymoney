// AISTOCK V20 ADAPTIVE TRADE PLAN ENGINE
// Generates frozen, non-repainting trade plans with structural SL and TP1/TP2/TP3 targets.

import { DynamicSellZoneEngine, DynamicSellZoneInput } from "../DynamicSellZoneEngine";
import { roundToKRXTick } from "../../lib/stockTickRules";

export interface TradePlanInput {
  symbol: string;
  market?: "KOREA" | "US" | "UPBIT" | "CRYPTO" | string;
  entryPrice: number;
  atr14?: number | null;
  vwap?: number | null;
  ema20?: number | null;
  lastSwingLow?: number | null;
  rvol?: number | null;
  minRiskPct?: number; // default 1.0%
  maxRiskPct?: number; // default 4.0%
}

export interface TradePlanResult {
  symbol: string;
  entryPrice: number;
  stopLossPrice: number;
  riskAmount: number; // Entry - SL
  riskPct: number; // (Entry - SL) / Entry * 100
  tp1: number; // 0.75R
  tp2: number; // 1.25R
  tp3: number; // 2.00R+
  rMultipliers: {
    tp1: number;
    tp2: number;
    tp3: number;
  };
  expectedSellZone?: {
    low: number | null;
    mid: number | null;
    high: number | null;
    confidence: "LOW" | "MEDIUM" | "HIGH";
  };
}

export class AdaptiveTradePlanEngineV20 {
  public static createTradePlan(input: TradePlanInput): TradePlanResult {
    const {
      symbol,
      market = "KOREA",
      entryPrice,
      atr14 = null,
      vwap = null,
      ema20 = null,
      lastSwingLow = null,
      minRiskPct = 1.0,
      maxRiskPct = 4.0,
    } = input;

    if (!entryPrice || entryPrice <= 0) {
      throw new Error("[AdaptiveTradePlanEngineV20] Entry price must be positive");
    }

    // 1. Calculate Candidate Structural Stop Losses
    const candidates: number[] = [];

    // Candidate A: Swing Low Support
    if (lastSwingLow != null && lastSwingLow > 0 && lastSwingLow < entryPrice) {
      candidates.push(lastSwingLow * 0.998); // slightly below swing low
    }

    // Candidate B: ATR Stop (1.5x ATR)
    if (atr14 != null && atr14 > 0) {
      candidates.push(entryPrice - 1.5 * atr14);
    }

    // Candidate C: VWAP Support
    if (vwap != null && vwap > 0 && vwap < entryPrice) {
      candidates.push(vwap * 0.995);
    }

    // Candidate D: EMA20 Support
    if (ema20 != null && ema20 > 0 && ema20 < entryPrice) {
      candidates.push(ema20 * 0.995);
    }

    // Default Fallback: 2.0% Risk Stop
    candidates.push(entryPrice * 0.98);

    // Pick highest valid stop loss candidate that stays within maxRiskPct
    const maxStopPrice = entryPrice * (1 - minRiskPct / 100);
    const minStopPrice = entryPrice * (1 - maxRiskPct / 100);

    let rawStop = candidates.reduce((prev, curr) => {
      if (curr >= minStopPrice && curr <= maxStopPrice) {
        return Math.max(prev, curr);
      }
      return prev;
    }, minStopPrice);

    // Round Stop Loss to tick size if KRX
    let stopLossPrice = market === "KOREA" ? roundToKRXTick(rawStop, "floor") : Number(rawStop.toFixed(2));
    if (stopLossPrice >= entryPrice) {
      stopLossPrice = market === "KOREA" ? roundToKRXTick(entryPrice * 0.98, "floor") : Number((entryPrice * 0.98).toFixed(2));
    }

    const riskAmount = entryPrice - stopLossPrice;
    const riskPct = (riskAmount / entryPrice) * 100;

    // 2. Base Take Profit Levels (0.75R, 1.25R, 2.0R)
    let rawTp1 = entryPrice + 0.75 * riskAmount;
    let rawTp2 = entryPrice + 1.25 * riskAmount;
    let rawTp3 = entryPrice + 2.00 * riskAmount;

    // 3. Integrate DynamicSellZoneEngine if inputs available
    let sellZoneInfo: TradePlanResult["expectedSellZone"];
    try {
      const dszInput: DynamicSellZoneInput = {
        symbol,
        entryPrice,
        currentPrice: entryPrice,
        highestPriceSinceBuy: entryPrice,
        lowestPriceSinceBuy: entryPrice,
        previousDefenseSell: stopLossPrice,
        atr14,
        vwap,
        ema9: null,
        ema20,
        ema50: null,
        lastSwingLow,
        lastSwingHigh: null,
        rvol: input.rvol ?? null,
      };

      const dsz = DynamicSellZoneEngine.evaluate(dszInput);
      if (dsz.expectedSellLow && dsz.expectedSellLow > rawTp1) {
        rawTp1 = dsz.expectedSellLow;
      }
      if (dsz.expectedSellMid && dsz.expectedSellMid > rawTp2) {
        rawTp2 = dsz.expectedSellMid;
      }
      if (dsz.expectedSellHigh && dsz.expectedSellHigh > rawTp3) {
        rawTp3 = dsz.expectedSellHigh;
      }

      sellZoneInfo = {
        low: dsz.expectedSellLow,
        mid: dsz.expectedSellMid,
        high: dsz.expectedSellHigh,
        confidence: dsz.zoneConfidence,
      };
    } catch {
      // Graceful fallback to R-multipliers
    }

    // Ensure strict monotonicity: TP1 < TP2 < TP3
    if (rawTp2 <= rawTp1) rawTp2 = rawTp1 + 0.5 * riskAmount;
    if (rawTp3 <= rawTp2) rawTp3 = rawTp2 + 0.75 * riskAmount;

    const tp1 = market === "KOREA" ? roundToKRXTick(rawTp1, "ceil") : Number(rawTp1.toFixed(2));
    const tp2 = market === "KOREA" ? roundToKRXTick(rawTp2, "ceil") : Number(rawTp2.toFixed(2));
    const tp3 = market === "KOREA" ? roundToKRXTick(rawTp3, "ceil") : Number(rawTp3.toFixed(2));

    return {
      symbol,
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
      expectedSellZone: sellZoneInfo,
    };
  }
}
