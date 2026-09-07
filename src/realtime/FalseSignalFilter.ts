import type { LiveCandle, IndicatorSnapshot, FeedQuality } from "./types";

export interface FalseSignalCheckResult {
  pass: boolean;
  severeRisks: string[];
  warnings: string[];
  extendedFromVWAP: boolean;
  extendedFromEMA9: boolean;
  extendedFromEMA20: boolean;
  weakRVOL: boolean;
  dataStale: boolean;
}

export class FalseSignalFilter {
  public static evaluate(
    candles: LiveCandle[],
    indicators: IndicatorSnapshot,
    feedQuality: FeedQuality = "BROKER_REALTIME"
  ): FalseSignalCheckResult {
    const severeRisks: string[] = [];
    const warnings: string[] = [];

    if (!indicators.indicatorsReady) {
      severeRisks.push(`INDICATORS_NOT_READY (${indicators.warmupReason || "Warm-up incomplete"})`);
    }

    if (feedQuality !== "BROKER_REALTIME") {
      severeRisks.push(`FEED_QUALITY_NOT_REALTIME (${feedQuality})`);
    }

    if (!candles || candles.length === 0) {
      return {
        pass: false,
        severeRisks: ["NO_CANDLES"],
        warnings: [],
        extendedFromVWAP: false,
        extendedFromEMA9: false,
        extendedFromEMA20: false,
        weakRVOL: true,
        dataStale: true
      };
    }

    const currentPrice = candles[candles.length - 1].close;

    // Extension checks
    const vwapDiffPct =
      Number.isFinite(indicators.vwap) && indicators.vwap > 0
        ? ((currentPrice - indicators.vwap) / indicators.vwap) * 100
        : 0;
    const extendedFromVWAP = vwapDiffPct > 3.5;
    if (extendedFromVWAP) {
      severeRisks.push(`EXTENDED_FROM_VWAP (+${vwapDiffPct.toFixed(2)}% > 3.5%)`);
    }

    const ema9DiffPct =
      Number.isFinite(indicators.ema9) && indicators.ema9 > 0
        ? ((currentPrice - indicators.ema9) / indicators.ema9) * 100
        : 0;
    const extendedFromEMA9 = ema9DiffPct > 3.0;
    if (extendedFromEMA9) {
      warnings.push(`EXTENDED_FROM_EMA9 (+${ema9DiffPct.toFixed(2)}%)`);
    }

    const ema20DiffPct =
      Number.isFinite(indicators.ema20) && indicators.ema20 > 0
        ? ((currentPrice - indicators.ema20) / indicators.ema20) * 100
        : 0;
    const extendedFromEMA20 = ema20DiffPct > 5.0;
    if (extendedFromEMA20) {
      severeRisks.push(`EXTENDED_FROM_EMA20 (+${ema20DiffPct.toFixed(2)}% > 5.0%)`);
    }

    const weakRVOL = indicators.rvol < 0.8;
    if (weakRVOL) {
      warnings.push(`WEAK_RVOL (${indicators.rvol}x < 0.8x)`);
    }

    const pass = severeRisks.length === 0;

    return {
      pass,
      severeRisks,
      warnings,
      extendedFromVWAP,
      extendedFromEMA9,
      extendedFromEMA20,
      weakRVOL,
      dataStale: feedQuality !== "BROKER_REALTIME"
    };
  }
}
