import type { MarketRegimeV137, MarketRegimeDataInput } from "./typesV137";

export class MarketRegimeClassifierV137 {
  /**
   * Classifies current market regime using trend, volatility, and data freshness metrics.
   * If market data is stale or incomplete, returns UNKNOWN to strictly prevent strategy weight amplification.
   */
  public static classify(input: MarketRegimeDataInput): MarketRegimeV137 {
    // 1. Data Freshness & Stale Guard
    if (input.isStaleFeed === true) {
      return "UNKNOWN";
    }

    if (input.dataAgeMs !== undefined && input.dataAgeMs > 15000) {
      return "UNKNOWN";
    }

    const closes = input.indexCloses;
    if (!closes || !Array.isArray(closes) || closes.length < 20) {
      return "UNKNOWN";
    }

    const currentPrice = closes[closes.length - 1];
    if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
      return "UNKNOWN";
    }

    // 2. High/Low Volatility checks
    if (input.volatilityPct >= 2.5) {
      return "HIGH_VOL";
    }

    if (input.volatilityPct <= 0.6 && input.volatilityPct > 0) {
      return "LOW_VOL";
    }

    // 3. Simple Trend calculations (EMA20 & slope over 10 bars)
    const period = Math.min(20, closes.length);
    const recentCloses = closes.slice(-period);
    const sum = recentCloses.reduce((a, b) => a + b, 0);
    const ma20 = sum / period;

    const tenBarsAgoPrice = closes[closes.length - Math.min(10, closes.length)];
    const priceChangePct = ((currentPrice - tenBarsAgoPrice) / tenBarsAgoPrice) * 100;

    if (currentPrice > ma20 && priceChangePct > 0.4) {
      return "TREND_UP";
    }

    if (currentPrice < ma20 && priceChangePct < -0.4) {
      return "TREND_DOWN";
    }

    return "RANGE";
  }
}
