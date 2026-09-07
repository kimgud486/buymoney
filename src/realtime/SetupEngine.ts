import type { LiveCandle, IndicatorSnapshot } from "./types";

export interface SetupDetectionResult {
  setupName: string;
  detected: boolean;
  score: number; // 0 to 100
  entryZone: { min: number; max: number };
  invalidationPrice: number;
  evidence: string[];
  warnings: string[];
}

export class SetupEngine {
  public static evaluateSetups(
    candles: LiveCandle[],
    indicators: IndicatorSnapshot
  ): SetupDetectionResult[] {
    if (!candles || candles.length < 5 || !indicators.indicatorsReady) {
      return [];
    }

    const current = candles[candles.length - 1];
    const prev = candles[candles.length - 2];
    const results: SetupDetectionResult[] = [];

    // 1. VWAP Reclaim Setup
    const isVwapReclaim = prev.close < indicators.vwap && current.close > indicators.vwap && current.volume > 0;
    if (isVwapReclaim) {
      results.push({
        setupName: "VWAP_RECLAIM",
        detected: true,
        score: Math.min(95, 70 + (indicators.rvol > 1.5 ? 20 : 10)),
        entryZone: { min: indicators.vwap, max: current.close },
        invalidationPrice: Math.min(prev.low, current.low),
        evidence: [
          `Crossed above Session VWAP (${(indicators.vwap ?? 0).toLocaleString()})`,
          `RVOL: ${indicators.rvol}x`
        ],
        warnings: indicators.rvol < 1.0 ? ["Low RVOL on VWAP reclaim"] : []
      });
    }

    // 2. Volume Expansion Breakout
    const isVolumeExpansion = indicators.rvol >= 1.5 && current.close > prev.high;
    if (isVolumeExpansion) {
      results.push({
        setupName: "VOLUME_EXPANSION_BREAKOUT",
        detected: true,
        score: Math.min(95, 65 + Math.round(indicators.rvol * 10)),
        entryZone: { min: prev.high, max: current.close },
        invalidationPrice: current.low,
        evidence: [
          `Volume expansion detected (RVOL: ${indicators.rvol}x)`,
          `Broke previous candle high (${(prev.high ?? 0).toLocaleString()})`
        ],
        warnings: []
      });
    }

    // 3. Opening Range Breakout (ORB)
    if (candles.length >= 6) {
      const openingRangeHigh = Math.max(...candles.slice(0, 3).map((c) => c.high));
      if (current.close > openingRangeHigh && prev.close <= openingRangeHigh) {
        results.push({
          setupName: "OPENING_RANGE_BREAKOUT",
          detected: true,
          score: 85,
          entryZone: { min: openingRangeHigh, max: current.close },
          invalidationPrice: openingRangeHigh * 0.995,
          evidence: [`Breakout above Opening Range High (${(openingRangeHigh ?? 0).toLocaleString()})`],
          warnings: []
        });
      }
    }

    return results;
  }
}
