// ----------------------------------------------------------------------
// INDICATOR HISTORY ENGINE V18.5
// Accurate Multi-Bar Indicator Point History & Trend Deterioration Analysis
// ----------------------------------------------------------------------

import { IndicatorSnapshot, MACDResult } from "./IndicatorTruthEngine";

export interface IndicatorPoint {
  timestamp: number;
  close: number;
  rsi14: number | null;
  macd: MACDResult;
  vwap: number | null;
  ema9: number | null;
  ema20: number | null;
  ema50: number | null;
  atr14: number | null;
  rvol: number | null;
}

export class IndicatorHistoryEngine {
  private static historyMap: Map<string, IndicatorPoint[]> = new Map();
  private static MAX_HISTORY = 100;

  /**
   * Record a new indicator point for a symbol
   */
  public static addPoint(
    symbol: string,
    timestamp: number,
    close: number,
    snapshot: IndicatorSnapshot
  ): IndicatorPoint {
    const history = this.historyMap.get(symbol) || [];

    const point: IndicatorPoint = {
      timestamp,
      close,
      rsi14: snapshot.rsi14,
      macd: { ...snapshot.macd },
      vwap: snapshot.vwap,
      ema9: snapshot.ema9,
      ema20: snapshot.ema20,
      ema50: snapshot.ema50,
      atr14: snapshot.atr14,
      rvol: snapshot.rvol
    };

    // Avoid duplicate points for same timestamp
    if (history.length > 0 && history[history.length - 1].timestamp === timestamp) {
      history[history.length - 1] = point;
    } else {
      history.push(point);
    }

    if (history.length > this.MAX_HISTORY) {
      history.shift();
    }

    this.historyMap.set(symbol, history);
    return point;
  }

  /**
   * Get recorded points for a symbol
   */
  public static getHistory(symbol: string, limit: number = 20): IndicatorPoint[] {
    const history = this.historyMap.get(symbol) || [];
    return history.slice(-limit);
  }

  /**
   * Check MACD Deterioration using true MACD histogram & signal line history
   */
  public static checkMacdDeterioration(symbol: string): { isDeteriorating: boolean; reason: string } {
    const history = this.getHistory(symbol, 5);
    if (history.length < 2) {
      return { isDeteriorating: false, reason: "INSUFFICIENT_HISTORY" };
    }

    const h0 = history[history.length - 1];
    const h1 = history[history.length - 2];
    const h2 = history.length >= 3 ? history[history.length - 3] : null;

    // 1. Bearish MACD Signal Cross
    if (
      h0.macd.line != null &&
      h0.macd.signal != null &&
      h1.macd.line != null &&
      h1.macd.signal != null
    ) {
      if (h1.macd.line >= h1.macd.signal && h0.macd.line < h0.macd.signal) {
        return { isDeteriorating: true, reason: "MACD_BEARISH_CROSSOVER" };
      }
    }

    // 2. Multi-Bar Histogram Decreasing (hist[t-2] > hist[t-1] > hist[t])
    if (
      h2 != null &&
      h2.macd.histogram != null &&
      h1.macd.histogram != null &&
      h0.macd.histogram != null
    ) {
      if (h2.macd.histogram > h1.macd.histogram && h1.macd.histogram > h0.macd.histogram) {
        return { isDeteriorating: true, reason: "MACD_HISTOGRAM_DECLINING_3BARS" };
      }
    }

    // 3. Negative Histogram & Line Below Signal
    if (
      h0.macd.histogram != null &&
      h0.macd.histogram < 0 &&
      h0.macd.line != null &&
      h0.macd.signal != null &&
      h0.macd.line < h0.macd.signal
    ) {
      return { isDeteriorating: true, reason: "MACD_NEGATIVE_AND_BELOW_SIGNAL" };
    }

    return { isDeteriorating: false, reason: "MACD_HEALTHY" };
  }

  /**
   * Check RSI Deterioration using true RSI value history
   */
  public static checkRsiDeterioration(symbol: string): { isDeteriorating: boolean; reason: string } {
    const history = this.getHistory(symbol, 5);
    if (history.length < 2) {
      return { isDeteriorating: false, reason: "INSUFFICIENT_HISTORY" };
    }

    const r0 = history[history.length - 1].rsi14;
    const r1 = history[history.length - 2].rsi14;
    const r2 = history.length >= 3 ? history[history.length - 3].rsi14 : null;

    if (r0 == null) return { isDeteriorating: false, reason: "NO_RSI_DATA" };

    // 1. Severe RSI Breakdown (< 40)
    if (r0 < 40) {
      return { isDeteriorating: true, reason: "RSI_BELOW_40" };
    }

    // 2. Multi-Bar RSI Declining (rsi[t-2] > rsi[t-1] > rsi[t])
    if (r2 != null && r1 != null) {
      if (r2 > r1 && r1 > r0 && r0 < 50) {
        return { isDeteriorating: true, reason: "RSI_DECLINING_3BARS_BELOW_50" };
      }
    }

    // 3. Rapid Drop from Overbought (> 70 to < 55)
    if (r1 != null && r1 > 70 && r0 < 55) {
      return { isDeteriorating: true, reason: "RSI_OVERBOUGHT_COLLAPSE" };
    }

    return { isDeteriorating: false, reason: "RSI_HEALTHY" };
  }

  /**
   * Clear history for a symbol or all
   */
  public static clearHistory(symbol?: string): void {
    if (symbol) {
      this.historyMap.delete(symbol);
    } else {
      this.historyMap.clear();
    }
  }
}
