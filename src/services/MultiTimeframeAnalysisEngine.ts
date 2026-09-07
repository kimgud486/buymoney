// ----------------------------------------------------------------------
// MULTI TIMEFRAME ANALYSIS ENGINE (V14.1)
// Pure Multi-Timeframe Structure & Indicator Consensus Engine
// ----------------------------------------------------------------------

import { Candle, StructureBrain, StructureBrainAnalysisResult } from "./StructureBrain";
import { IndicatorSnapshot, IndicatorTruthEngine } from "./IndicatorTruthEngine";
import { realCandleStore } from "./RealCandleStore";

export type Timeframe = "1m" | "3m" | "5m" | "15m" | "30m" | "1h" | "1d";

export interface SingleTimeframeAnalysis {
  timeframe: Timeframe;
  hasCandles: boolean;
  candleCount: number;
  indicators: IndicatorSnapshot;
  structure: StructureBrainAnalysisResult;
  isBullish: boolean;
  isBearish: boolean;
}

export interface MultiTimeframeResult {
  m1: SingleTimeframeAnalysis | null;
  m3: SingleTimeframeAnalysis | null;
  m5: SingleTimeframeAnalysis | null;
  m15: SingleTimeframeAnalysis | null;
  m30: SingleTimeframeAnalysis | null;
  h1: SingleTimeframeAnalysis | null;
  d1: SingleTimeframeAnalysis | null;

  bullishCount: number;
  bearishCount: number;
  timeframesEvaluated: number;
  consensus: "STRONG_BULL" | "BULL" | "NEUTRAL" | "BEAR" | "STRONG_BEAR" | "NO_DATA";
}

export class MultiTimeframeAnalysisEngine {
  public static analyzeTimeframe(symbol: string, timeframe: Timeframe): SingleTimeframeAnalysis | null {
    const candles = realCandleStore.getCachedCandles(symbol, timeframe);
    if (!candles || candles.length < 10) {
      return null;
    }

    const indicators = IndicatorTruthEngine.computeSnapshot(candles);
    const structure = StructureBrain.analyze(candles, { swingWindowLeft: 2, swingWindowRight: 2 }, symbol);

    const isTrendUp = structure.currentStructureTrend.startsWith("BULLISH");
    const isEmaBullish = indicators.ema20 !== null && indicators.vwap !== null && indicators.ema20 >= indicators.vwap;
    const isMacdBullish = indicators.macd.histogram !== null && indicators.macd.histogram > 0;

    const isBullish = isTrendUp || (isEmaBullish && isMacdBullish);
    const isBearish = structure.currentStructureTrend.startsWith("BEARISH");

    return {
      timeframe,
      hasCandles: true,
      candleCount: candles.length,
      indicators,
      structure,
      isBullish,
      isBearish
    };
  }

  public static analyzeSymbol(symbol: string): MultiTimeframeResult {
    const m1 = this.analyzeTimeframe(symbol, "1m");
    const m3 = this.analyzeTimeframe(symbol, "3m");
    const m5 = this.analyzeTimeframe(symbol, "5m");
    const m15 = this.analyzeTimeframe(symbol, "15m");
    const m30 = this.analyzeTimeframe(symbol, "30m");
    const h1 = this.analyzeTimeframe(symbol, "1h");
    const d1 = this.analyzeTimeframe(symbol, "1d");

    const tfList = [m1, m3, m5, m15, m30, h1, d1].filter((tf): tf is SingleTimeframeAnalysis => tf !== null);

    if (tfList.length === 0) {
      return {
        m1, m3, m5, m15, m30, h1, d1,
        bullishCount: 0,
        bearishCount: 0,
        timeframesEvaluated: 0,
        consensus: "NO_DATA"
      };
    }

    let weightedBullScore = 0;
    let weightedBearScore = 0;
    let totalWeight = 0;

    // Weight higher timeframes more heavily
    const weights: Record<Timeframe, number> = {
      "1m": 1,
      "3m": 1.5,
      "5m": 2,
      "15m": 3,
      "30m": 3.5,
      "1h": 4,
      "1d": 5
    };

    let bullishCount = 0;
    let bearishCount = 0;

    for (const tf of tfList) {
      const w = weights[tf.timeframe];
      totalWeight += w;
      if (tf.isBullish) {
        bullishCount++;
        weightedBullScore += w;
      }
      if (tf.isBearish) {
        bearishCount++;
        weightedBearScore += w;
      }
    }

    const bullRatio = weightedBullScore / (totalWeight || 1);
    const bearRatio = weightedBearScore / (totalWeight || 1);

    let consensus: MultiTimeframeResult["consensus"] = "NEUTRAL";
    if (bullRatio >= 0.75) consensus = "STRONG_BULL";
    else if (bullRatio >= 0.55) consensus = "BULL";
    else if (bearRatio >= 0.75) consensus = "STRONG_BEAR";
    else if (bearRatio >= 0.55) consensus = "BEAR";

    return {
      m1, m3, m5, m15, m30, h1, d1,
      bullishCount,
      bearishCount,
      timeframesEvaluated: tfList.length,
      consensus
    };
  }
}
