// ----------------------------------------------------------------------
// DYNAMIC SELL ZONE ENGINE V18.6 (AISTOCK DUAL SELL INTEL)
// Dual Sell Targets: Live Defense SELL Floor vs Expected SELL Zone
// ----------------------------------------------------------------------

import { AdaptiveTrailingExitEngineV18 } from "./AdaptiveTrailingExitEngineV18";

export interface DynamicSellZoneInput {
  positionId?: string;
  symbol: string;
  strategyId?: string;

  entryPrice: number;
  currentPrice: number;
  highestPriceSinceBuy: number;
  lowestPriceSinceBuy: number;

  previousDefenseSell: number | null;

  atr14: number | null;
  vwap: number | null;
  ema9: number | null;
  ema20: number | null;
  ema50: number | null;

  lastSwingLow: number | null;
  lastSwingHigh: number | null;

  rvol: number | null;

  rs5m?: number | null;
  rs15m?: number | null;
  rs1h?: number | null;
  rs1d?: number | null;

  marketStrength?: number | null; // 0~100
  sectorStrength?: number | null;
  themeStrength?: number | null;

  structureTrend?: "BULLISH" | "NEUTRAL" | "BEARISH";
  orderFlowStrength?: "STRONG" | "NORMAL" | "WEAK";

  delta?: number;
  cvd?: number;
  orderbookImbalance?: number;

  exitRiskScore?: number;
  profitHoldStrength?: "STRONG" | "NORMAL" | "WEAK" | null;
  sellWatchLevel?: "LOW" | "MEDIUM" | "HIGH" | null;
}

export interface DynamicSellZoneResult {
  defenseSellPrice: number;

  expectedSellLow: number | null;
  expectedSellMid: number | null;
  expectedSellHigh: number | null;

  estimatedUpsidePct: number | null;

  continuationScore: number; // 0 ~ 100
  exitRiskScore: number; // 0 ~ 100

  zoneConfidence: "LOW" | "MEDIUM" | "HIGH";

  reasons: string[];
}

export class DynamicSellZoneEngine {
  /**
   * Evaluate Dual Sell targets for an active position:
   * 1. Monotonic Ratchet DEFENSE SELL Floor
   * 2. Statistical Multi-Projection EXPECTED SELL Zone
   */
  public static evaluate(input: DynamicSellZoneInput): DynamicSellZoneResult {
    const {
      entryPrice,
      currentPrice,
      highestPriceSinceBuy,
      previousDefenseSell,
      atr14,
      vwap,
      ema20,
      lastSwingLow,
      lastSwingHigh,
      rvol,
      rs5m,
      rs15m,
      sectorStrength,
      structureTrend = "NEUTRAL",
      orderFlowStrength = "NORMAL",
      delta = 0,
      exitRiskScore = 0
    } = input;

    const reasons: string[] = [];

    // 1. Calculate DEFENSE SELL Floor using Adaptive Trailing Engine
    const trailingRes = AdaptiveTrailingExitEngineV18.calculateTrailingFloor({
      symbol: input.symbol,
      entryPrice,
      currentPrice,
      highestPriceSinceBuy,
      previousTrailingFloor: previousDefenseSell,
      atr14,
      vwap,
      ema20,
      swingLow: lastSwingLow
    });

    // Monotonic Ratchet Rule: Never lower defense sell price
    const floorCandidate = trailingRes.newTrailingFloor;
    const defenseSellPrice = +Math.max(previousDefenseSell || 0, floorCandidate).toFixed(2);

    if (defenseSellPrice > (previousDefenseSell || 0)) {
      reasons.push(`🛡️ [Defense Sell 상향] 방어 매도가 ${previousDefenseSell ?? entryPrice}원 ➔ ${defenseSellPrice}원 상향 Ratchet`);
    }

    // 2. Compute Trend Continuation Score (0 ~ 100)
    let continuationScore = 50; // base score

    if (structureTrend === "BULLISH") continuationScore += 15;
    if (structureTrend === "BEARISH") continuationScore -= 20;

    if (rs5m != null && rs5m >= 60) continuationScore += 10;
    if (rs15m != null && rs15m >= 60) continuationScore += 10;

    if (rvol != null && rvol >= 1.5) continuationScore += 10;
    if (vwap != null && currentPrice > vwap) continuationScore += 10;

    if (orderFlowStrength === "STRONG" || delta > 0) continuationScore += 10;
    if (sectorStrength != null && sectorStrength >= 60) continuationScore += 5;

    // Deduct for exit risk score
    continuationScore = Math.max(0, Math.min(100, continuationScore - exitRiskScore * 0.3));
    continuationScore = +continuationScore.toFixed(0);

    // 3. Multi-Projection EXPECTED SELL Zone (Strict Data Truth - No Synthetic Fallbacks)
    const projections: number[] = [];

    // Projection 1: ATR Expansion Projection (Requires valid ATR)
    if (atr14 != null && atr14 > 0) {
      const atrMult = continuationScore >= 70 ? 2.5 : continuationScore >= 50 ? 1.8 : 1.2;
      projections.push(currentPrice + atr14 * atrMult);
    }

    // Projection 2: Swing High Measured Move
    if (lastSwingHigh != null && lastSwingLow != null && lastSwingHigh > lastSwingLow) {
      const swingRange = lastSwingHigh - lastSwingLow;
      projections.push(lastSwingHigh + swingRange * 0.382);
    }

    // Projection 3: Volatility & RVOL Expansion (Requires valid RVOL)
    if (rvol != null && rvol > 0) {
      const rvolMult = Math.min(3.0, Math.max(1.0, rvol));
      projections.push(currentPrice * (1 + 0.015 * rvolMult));
    }

    // Projection 4: VWAP Continuation Anchor (Requires valid VWAP)
    if (vwap != null && vwap > 0) {
      projections.push(vwap * 1.035);
    }

    // Filter projections that are strictly above currentPrice
    const validProjections = projections
      .filter((p) => p > currentPrice)
      .sort((a, b) => a - b);

    let expectedSellLow: number | null = null;
    let expectedSellMid: number | null = null;
    let expectedSellHigh: number | null = null;

    if (validProjections.length >= 3) {
      expectedSellLow = +validProjections[0].toFixed(2);
      expectedSellMid = +validProjections[Math.floor(validProjections.length / 2)].toFixed(2);
      expectedSellHigh = +validProjections[validProjections.length - 1].toFixed(2);
    } else if (validProjections.length === 2) {
      expectedSellLow = +validProjections[0].toFixed(2);
      expectedSellMid = +((validProjections[0] + validProjections[1]) / 2).toFixed(2);
      expectedSellHigh = +validProjections[1].toFixed(2);
    }
    // Single projection or no projections -> NO_DATA / null zone (no fake 1.01/1.02 targets)

    const estimatedUpsidePct = expectedSellMid != null
      ? +(((expectedSellMid - currentPrice) / currentPrice) * 100).toFixed(2)
      : null;

    // Zone Confidence
    let zoneConfidence: "LOW" | "MEDIUM" | "HIGH" = "LOW";
    if (continuationScore >= 70 && validProjections.length >= 3) {
      zoneConfidence = "HIGH";
    } else if (continuationScore >= 50 && validProjections.length >= 2) {
      zoneConfidence = "MEDIUM";
    }

    if (expectedSellMid != null) {
      reasons.push(`🎯 [Expected Sell Zone] 목표 익절 영역 ${expectedSellLow}원 ~ ${expectedSellHigh}원 (기대 상승폭: +${estimatedUpsidePct}%)`);
    }

    return {
      defenseSellPrice,
      expectedSellLow,
      expectedSellMid,
      expectedSellHigh,
      estimatedUpsidePct,
      continuationScore,
      exitRiskScore,
      zoneConfidence,
      reasons
    };
  }
}
