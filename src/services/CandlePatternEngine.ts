// ----------------------------------------------------------------------
// CANDLE PATTERN ENGINE V17 (AISTOCK V17 PRECISION PATTERN ENGINE)
// Pure OHLCV Candle Anatomy, Single/Multi-Candle & Sequence Detection
// ----------------------------------------------------------------------

import { Candle } from "./StructureBrain";

export interface CandleFeatures {
  bullish: boolean;
  bearish: boolean;
  body: number;
  range: number;
  bodyPct: number;
  upperWick: number;
  lowerWick: number;
  upperWickPct: number;
  lowerWickPct: number;
  closeLocation: number; // 0.0 (low) to 1.0 (high)
  volume: number;
}

export type CandlePatternName =
  | "HAMMER"
  | "INVERTED_HAMMER"
  | "SHOOTING_STAR"
  | "HANGING_MAN"
  | "DOJI"
  | "DRAGONFLY_DOJI"
  | "GRAVESTONE_DOJI"
  | "SPINNING_TOP"
  | "HIGH_WAVE"
  | "BULLISH_MARUBOZU"
  | "BEARISH_MARUBOZU"
  | "BULLISH_PIN_BAR"
  | "BEARISH_PIN_BAR"
  | "WIDE_RANGE_BULL"
  | "WIDE_RANGE_BEAR"
  | "BULLISH_ENGULFING"
  | "BEARISH_ENGULFING"
  | "BULLISH_HARAMI"
  | "BEARISH_HARAMI"
  | "PIERCING_LINE"
  | "DARK_CLOUD"
  | "TWEEZER_BOTTOM"
  | "TWEEZER_TOP"
  | "INSIDE_BAR"
  | "OUTSIDE_BAR"
  | "MORNING_STAR"
  | "EVENING_STAR"
  | "THREE_WHITE_SOLDIERS"
  | "THREE_BLACK_CROWS";

export interface CandlePatternSignal {
  pattern: CandlePatternName;
  direction: "BULLISH" | "BEARISH" | "NEUTRAL";
  confidence: number; // 0 ~ 100
  confirmed: boolean;
  candleIndex: number;
  evidence: string[];
  context: {
    trend: "UP" | "DOWN" | "RANGE";
    aboveVWAP: boolean | null;
    rvol: number | null;
    atSupport: boolean;
    atResistance: boolean;
  };
}

export interface CandleSequenceAnalysis {
  consecutiveBullish: number;
  consecutiveBearish: number;
  bodyExpansion: boolean;
  bodyContraction: boolean;
  volumeExpansion: boolean;
  wickExpansion: boolean;
  exhaustionRisk: boolean;
}

export class CandlePatternEngine {
  /**
   * Extract geometric features of a single candle (Anatomy)
   */
  public static extractCandleFeatures(c: Candle): CandleFeatures {
    const range = Math.max(0, c.high - c.low);
    if (range <= 0) {
      return {
        bullish: false,
        bearish: false,
        body: 0,
        range: 0,
        bodyPct: 0,
        upperWick: 0,
        lowerWick: 0,
        upperWickPct: 0,
        lowerWickPct: 0,
        closeLocation: 0.5,
        volume: c.volume
      };
    }

    const body = Math.abs(c.close - c.open);
    const bodyHigh = Math.max(c.open, c.close);
    const bodyLow = Math.min(c.open, c.close);
    const upperWick = Math.max(0, c.high - bodyHigh);
    const lowerWick = Math.max(0, bodyLow - c.low);

    return {
      bullish: c.close > c.open,
      bearish: c.close < c.open,
      body,
      range,
      bodyPct: body / range,
      upperWick,
      lowerWick,
      upperWickPct: upperWick / range,
      lowerWickPct: lowerWick / range,
      closeLocation: (c.close - c.low) / range,
      volume: c.volume
    };
  }

  /**
   * Main scan function for candle patterns across an OHLCV array
   */
  public static scan(
    candles: Candle[],
    context?: { vwap?: number | null; rvol?: number | null }
  ): CandlePatternSignal[] {
    if (!Array.isArray(candles) || candles.length === 0) return [];

    const signals: CandlePatternSignal[] = [];
    const len = candles.length;
    const lastIdx = len - 1;
    const cur = candles[lastIdx];
    const prev = lastIdx > 0 ? candles[lastIdx - 1] : null;
    const prev2 = lastIdx > 1 ? candles[lastIdx - 2] : null;

    const feat = this.extractCandleFeatures(cur);
    const vwap = context?.vwap ?? null;
    const rvol = context?.rvol ?? null;
    const aboveVWAP = vwap != null && vwap > 0 ? cur.close > vwap : null;

    // Detect Simple Trend Context (Last 10 bars)
    let trend: "UP" | "DOWN" | "RANGE" = "RANGE";
    if (len >= 5) {
      const firstClose = candles[Math.max(0, len - 10)].close;
      const lastClose = cur.close;
      const changePct = ((lastClose - firstClose) / firstClose) * 100;
      if (changePct >= 1.0) trend = "UP";
      else if (changePct <= -1.0) trend = "DOWN";
    }

    const baseContext = {
      trend,
      aboveVWAP,
      rvol,
      atSupport: trend === "DOWN" && feat.lowerWickPct >= 0.4,
      atResistance: trend === "UP" && feat.upperWickPct >= 0.4
    };

    // 1. Single Candle Patterns
    if (feat.range > 0) {
      // Hammer (lower wick >= 2x body, bodyPct <= 0.35, close near high)
      if (feat.bodyPct <= 0.35 && feat.lowerWick >= feat.body * 2 && feat.upperWickPct <= 0.15 && feat.closeLocation >= 0.6) {
        signals.push({
          pattern: "HAMMER",
          direction: "BULLISH",
          confidence: trend === "DOWN" ? 85 : 65,
          confirmed: feat.bullish,
          candleIndex: lastIdx,
          evidence: ["긴 아랫꼬리 반발 매수세", "몸통 대비 2배 이상의 하단 거절"],
          context: baseContext
        });
      }

      // Shooting Star (upper wick >= 2x body, bodyPct <= 0.35, close near low)
      if (feat.bodyPct <= 0.35 && feat.upperWick >= feat.body * 2 && feat.lowerWickPct <= 0.15 && feat.closeLocation <= 0.4) {
        signals.push({
          pattern: "SHOOTING_STAR",
          direction: "BEARISH",
          confidence: trend === "UP" ? 85 : 65,
          confirmed: feat.bearish,
          candleIndex: lastIdx,
          evidence: ["상단 윗꼬리 강력 청산 저항", "몸통 대비 2배 이상의 상단 거절"],
          context: baseContext
        });
      }

      // Doji (bodyPct <= 0.10)
      if (feat.bodyPct <= 0.10) {
        let patternName: CandlePatternName = "DOJI";
        if (feat.lowerWickPct >= 0.6 && feat.upperWickPct <= 0.1) patternName = "DRAGONFLY_DOJI";
        else if (feat.upperWickPct >= 0.6 && feat.lowerWickPct <= 0.1) patternName = "GRAVESTONE_DOJI";

        signals.push({
          pattern: patternName,
          direction: patternName === "DRAGONFLY_DOJI" ? "BULLISH" : patternName === "GRAVESTONE_DOJI" ? "BEARISH" : "NEUTRAL",
          confidence: 60,
          confirmed: true,
          candleIndex: lastIdx,
          evidence: ["팽팽한 매수/매도 균형 십자봉"],
          context: baseContext
        });
      }

      // Bullish Marubozu (bodyPct >= 0.85, bullish)
      if (feat.bodyPct >= 0.85 && feat.bullish) {
        signals.push({
          pattern: "BULLISH_MARUBOZU",
          direction: "BULLISH",
          confidence: 88,
          confirmed: true,
          candleIndex: lastIdx,
          evidence: ["꼬리 없는 강력한 장대양봉"],
          context: baseContext
        });
      }

      // Bearish Marubozu (bodyPct >= 0.85, bearish)
      if (feat.bodyPct >= 0.85 && feat.bearish) {
        signals.push({
          pattern: "BEARISH_MARUBOZU",
          direction: "BEARISH",
          confidence: 88,
          confirmed: true,
          candleIndex: lastIdx,
          evidence: ["꼬리 없는 강력한 장대음봉"],
          context: baseContext
        });
      }
    }

    // 2. Multi-Candle Patterns (2-Bar)
    if (prev) {
      const prevFeat = this.extractCandleFeatures(prev);

      // Bullish Engulfing (Prev bearish, Cur bullish, Cur body engulfs Prev body)
      if (prevFeat.bearish && feat.bullish && cur.open <= prev.close && cur.close >= prev.open) {
        signals.push({
          pattern: "BULLISH_ENGULFING",
          direction: "BULLISH",
          confidence: 88,
          confirmed: true,
          candleIndex: lastIdx,
          evidence: ["직전 음봉을 완전히 감싸안은 장대양봉 장악형"],
          context: baseContext
        });
      }

      // Bearish Engulfing (Prev bullish, Cur bearish, Cur body engulfs Prev body)
      if (prevFeat.bullish && feat.bearish && cur.open >= prev.close && cur.close <= prev.open) {
        signals.push({
          pattern: "BEARISH_ENGULFING",
          direction: "BEARISH",
          confidence: 88,
          confirmed: true,
          candleIndex: lastIdx,
          evidence: ["직전 양봉을 완전히 감싸안은 장대음봉 장악형"],
          context: baseContext
        });
      }

      // Bullish Harami (Prev large bearish, Cur small bullish inside prev body)
      if (prevFeat.bearish && feat.bullish && cur.open >= prev.close && cur.close <= prev.open && feat.body < prevFeat.body * 0.6) {
        signals.push({
          pattern: "BULLISH_HARAMI",
          direction: "BULLISH",
          confidence: 72,
          confirmed: true,
          candleIndex: lastIdx,
          evidence: ["음봉 몸통 안에 포함된 하라미 잉태형"],
          context: baseContext
        });
      }

      // Piercing Line (Prev large bearish, Cur opens below prev low, closes above 50% of prev body)
      if (prevFeat.bearish && feat.bullish && cur.open < prev.low && cur.close > (prev.open + prev.close) / 2) {
        signals.push({
          pattern: "PIERCING_LINE",
          direction: "BULLISH",
          confidence: 80,
          confirmed: true,
          candleIndex: lastIdx,
          evidence: ["직전 음봉 중심선을 강하게 관통한 양봉"],
          context: baseContext
        });
      }
    }

    // 3. Multi-Candle Patterns (3-Bar)
    if (prev && prev2) {
      const prev2Feat = this.extractCandleFeatures(prev2);
      const prevFeat = this.extractCandleFeatures(prev);

      // Morning Star (Prev2 large bear, Prev small doji/body, Cur large bull)
      if (prev2Feat.bearish && prevFeat.bodyPct <= 0.3 && feat.bullish && cur.close > (prev2.open + prev2.close) / 2) {
        signals.push({
          pattern: "MORNING_STAR",
          direction: "BULLISH",
          confidence: 90,
          confirmed: true,
          candleIndex: lastIdx,
          evidence: ["하락 추세 반전 샛별형(Morning Star) 3봉 조합"],
          context: baseContext
        });
      }

      // Three White Soldiers (3 consecutive strong bullish candles with higher closes)
      if (prev2Feat.bullish && prevFeat.bullish && feat.bullish && cur.close > prev.close && prev.close > prev2.close && feat.bodyPct >= 0.5) {
        signals.push({
          pattern: "THREE_WHITE_SOLDIERS",
          direction: "BULLISH",
          confidence: 92,
          confirmed: true,
          candleIndex: lastIdx,
          evidence: ["3연속 강력한 상승 적삼병 패턴"],
          context: baseContext
        });
      }

      // Three Black Crows (3 consecutive strong bearish candles with lower closes)
      if (prev2Feat.bearish && prevFeat.bearish && feat.bearish && cur.close < prev.close && prev.close < prev2.close && feat.bodyPct >= 0.5) {
        signals.push({
          pattern: "THREE_BLACK_CROWS",
          direction: "BEARISH",
          confidence: 92,
          confirmed: true,
          candleIndex: lastIdx,
          evidence: ["3연속 강력한 하락 흑삼병 패턴"],
          context: baseContext
        });
      }
    }

    return signals;
  }

  /**
   * Analyze consecutive candle sequence metrics
   */
  public static analyzeSequence(candles: Candle[]): CandleSequenceAnalysis {
    if (!Array.isArray(candles) || candles.length === 0) {
      return {
        consecutiveBullish: 0,
        consecutiveBearish: 0,
        bodyExpansion: false,
        bodyContraction: false,
        volumeExpansion: false,
        wickExpansion: false,
        exhaustionRisk: false
      };
    }

    let consecutiveBullish = 0;
    let consecutiveBearish = 0;

    for (let i = candles.length - 1; i >= 0; i--) {
      const c = candles[i];
      if (c.close > c.open) {
        if (consecutiveBearish > 0) break;
        consecutiveBullish++;
      } else if (c.close < c.open) {
        if (consecutiveBullish > 0) break;
        consecutiveBearish++;
      } else {
        break;
      }
    }

    const last = candles[candles.length - 1];
    const prev = candles.length > 1 ? candles[candles.length - 2] : null;

    const lastFeat = this.extractCandleFeatures(last);
    const prevFeat = prev ? this.extractCandleFeatures(prev) : null;

    const bodyExpansion = prevFeat ? lastFeat.body > prevFeat.body * 1.5 : false;
    const bodyContraction = prevFeat ? lastFeat.body < prevFeat.body * 0.6 : false;
    const volumeExpansion = prev ? last.volume > prev.volume * 1.5 : false;
    const wickExpansion = prevFeat ? (lastFeat.upperWick + lastFeat.lowerWick) > (prevFeat.upperWick + prevFeat.lowerWick) * 1.5 : false;

    // Exhaustion risk: 5+ consecutive same-direction bars with expanding upper wick or declining volume
    const exhaustionRisk = (consecutiveBullish >= 4 && lastFeat.upperWickPct >= 0.4) || (consecutiveBearish >= 4 && lastFeat.lowerWickPct >= 0.4);

    return {
      consecutiveBullish,
      consecutiveBearish,
      bodyExpansion,
      bodyContraction,
      volumeExpansion,
      wickExpansion,
      exhaustionRisk
    };
  }
}
