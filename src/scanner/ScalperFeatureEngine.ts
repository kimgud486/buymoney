// ----------------------------------------------------------------------
// AISTOCK SCALPER FEATURE ENGINE V19.1
// Pure Data-Grounded Feature Extraction using IndicatorTruthEngine
// ----------------------------------------------------------------------

import { VerifiedCandle } from "../realtime/MarketCandle";
import { IndicatorTruthEngine } from "../services/IndicatorTruthEngine";
import { Candle } from "../services/StructureBrain";

export interface FeatureValueWithProvenance {
  featureName: string;
  value: number | null;
  timestamp: number;
  source: string;
  dataAgeMs: number;
  verified: boolean;
}

export interface ScalperFeatureSetV191 {
  symbol: string;
  timeframe: string;
  vwap: FeatureValueWithProvenance;
  anchoredVwap: FeatureValueWithProvenance;
  rvol: FeatureValueWithProvenance;
  ema9: FeatureValueWithProvenance;
  ema20: FeatureValueWithProvenance;
  rsi14: FeatureValueWithProvenance;
  macdHist: FeatureValueWithProvenance;
  atr14: FeatureValueWithProvenance;
  bollingerBandwidth: FeatureValueWithProvenance;
  openingRangeHigh: FeatureValueWithProvenance;
  openingRangeLow: FeatureValueWithProvenance;
  breakoutValid: boolean;
  firstPullbackValid: boolean;
  vwapReclaimValid: boolean;
  volumeSurgeValid: boolean;
  momentumBurstValid: boolean;
  relativeStrengthScore: number | null;
}

export class ScalperFeatureEngine {
  public static extractFeatures(candles: VerifiedCandle[], benchmarkCandles?: VerifiedCandle[]): ScalperFeatureSetV191 {
    if (!candles || candles.length < 30) {
      throw new Error("REAL_MARKET_DATA_REQUIRED: ScalperFeatureEngine requires at least 30 verified candles.");
    }

    const last = candles[candles.length - 1];
    const now = Date.now();
    const dataAgeMs = Math.max(0, now - last.endedAt);

    // Convert VerifiedCandles to Candle structure for IndicatorTruthEngine
    const rawCandles: Candle[] = candles.map(c => ({
      timestamp: c.endedAt,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume
    }));

    // Single Truth Engine Snapshot
    const snapshot = IndicatorTruthEngine.computeSnapshot(rawCandles);

    // Opening Range (first 5 bars)
    const orBars = candles.slice(0, 5);
    const orHigh = Math.max(...orBars.map(c => c.high));
    const orLow = Math.min(...orBars.map(c => c.low));

    // Bollinger Bandwidth calculation from real Bollinger Bands
    let bbBandwidth: number | null = null;
    if (snapshot.bollinger.upper != null && snapshot.bollinger.lower != null && snapshot.bollinger.middle != null && snapshot.bollinger.middle > 0) {
      bbBandwidth = +(((snapshot.bollinger.upper - snapshot.bollinger.lower) / snapshot.bollinger.middle) * 100).toFixed(2);
    }

    // Benchmark Relative Strength (only when benchmark is available)
    let relativeStrengthScore: number | null = null;
    if (benchmarkCandles && benchmarkCandles.length >= 30) {
      const bLast = benchmarkCandles[benchmarkCandles.length - 1];
      const stockReturn = (last.close - candles[0].close) / candles[0].close;
      const benchReturn = (bLast.close - benchmarkCandles[0].close) / benchmarkCandles[0].close;
      const alpha = stockReturn - benchReturn;
      relativeStrengthScore = Math.min(100, Math.max(0, Math.round(50 + alpha * 500)));
    }

    const makeMeta = (name: string, value: number | null): FeatureValueWithProvenance => ({
      featureName: name,
      value: value != null ? Math.round(value * 100) / 100 : null,
      timestamp: last.endedAt,
      source: last.source,
      dataAgeMs,
      verified: true
    });

    const vwapVal = snapshot.vwap;
    const rvolVal = snapshot.rvol;
    const ema9Val = snapshot.ema9;
    const rsi14Val = snapshot.rsi14;

    const prevCandle = candles[candles.length - 2];

    return {
      symbol: last.symbol,
      timeframe: last.timeframe,
      vwap: makeMeta("VWAP", vwapVal),
      anchoredVwap: makeMeta("AnchoredVWAP", vwapVal),
      rvol: makeMeta("RVOL", rvolVal),
      ema9: makeMeta("EMA9", ema9Val),
      ema20: makeMeta("EMA20", snapshot.ema20),
      rsi14: makeMeta("RSI14", rsi14Val),
      macdHist: makeMeta("MACD_HIST", snapshot.macd.histogram),
      atr14: makeMeta("ATR14", snapshot.atr14),
      bollingerBandwidth: makeMeta("BB_BANDWIDTH", bbBandwidth),
      openingRangeHigh: makeMeta("OR_HIGH", orHigh),
      openingRangeLow: makeMeta("OR_LOW", orLow),
      breakoutValid: last.close > orHigh && (rvolVal != null && rvolVal > 1.5),
      firstPullbackValid: vwapVal != null && ema9Val != null ? (last.close < vwapVal && last.close > ema9Val) : false,
      vwapReclaimValid: vwapVal != null ? (last.close > vwapVal && prevCandle.close <= vwapVal) : false,
      volumeSurgeValid: rvolVal != null && rvolVal > 2.0,
      momentumBurstValid: rsi14Val != null && rvolVal != null ? (rsi14Val > 60 && rvolVal > 1.8) : false,
      relativeStrengthScore
    };
  }
}
