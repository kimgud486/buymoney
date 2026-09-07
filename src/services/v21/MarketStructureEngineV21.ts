// JUSIK2 V21 MARKET STRUCTURE ENGINE
// Classifies HH/HL, LH/LL, Breakout, Breakdown, VWAP Reclaim/Loss.

import { BarV21, IndicatorSnapshotV21, MarketStructureV21 } from "./types";

export class MarketStructureEngineV21 {
  public static evaluate(
    bars: BarV21[],
    indicators: IndicatorSnapshotV21
  ): MarketStructureV21 {
    if (!bars || bars.length < 3) {
      return {
        trend: "SIDEWAYS",
        isHigherHighHigherLow: false,
        isLowerHighLowerLow: false,
        isBreakout: false,
        isBreakdown: false,
        isVwapReclaim: false,
        isVwapLoss: false,
      };
    }

    const currentBar = bars[bars.length - 1];
    const prevBar = bars[bars.length - 2];
    const prev2Bar = bars[bars.length - 3];

    // 1. HH/HL & LH/LL Check
    const isHigherHighHigherLow =
      currentBar.high > prevBar.high &&
      currentBar.low > prevBar.low &&
      prevBar.high > prev2Bar.high;

    const isLowerHighLowerLow =
      currentBar.high < prevBar.high &&
      currentBar.low < prevBar.low &&
      prevBar.low < prev2Bar.low;

    // 2. Trend Classification
    let trend: MarketStructureV21["trend"] = "SIDEWAYS";
    if (isHigherHighHigherLow || (indicators.ema9 && indicators.ema20 && indicators.ema9 > indicators.ema20)) {
      trend = "BULLISH";
    } else if (isLowerHighLowerLow || (indicators.ema9 && indicators.ema20 && indicators.ema9 < indicators.ema20)) {
      trend = "BEARISH";
    }

    // 3. Breakout / Breakdown against 10-bar max/min
    const recentBars = bars.slice(Math.max(0, bars.length - 11), bars.length - 1);
    const recentHigh = recentBars.length > 0 ? Math.max(...recentBars.map((b) => b.high)) : currentBar.high;
    const recentLow = recentBars.length > 0 ? Math.min(...recentBars.map((b) => b.low)) : currentBar.low;

    const isBreakout = currentBar.close > recentHigh;
    const isBreakdown = currentBar.close < recentLow;

    // 4. VWAP Reclaim / Loss
    let isVwapReclaim = false;
    let isVwapLoss = false;
    if (indicators.vwap) {
      isVwapReclaim = prevBar.close <= indicators.vwap && currentBar.close > indicators.vwap;
      isVwapLoss = prevBar.close >= indicators.vwap && currentBar.close < indicators.vwap;
    }

    return {
      trend,
      isHigherHighHigherLow,
      isLowerHighLowerLow,
      isBreakout,
      isBreakdown,
      isVwapReclaim,
      isVwapLoss,
    };
  }
}
