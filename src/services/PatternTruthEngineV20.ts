// ----------------------------------------------------------------------
// AISTOCK PATTERN TRUTH ENGINE V20
// Expanded Comprehensive Candlestick & Chart Pattern Recognition
// ----------------------------------------------------------------------

import { Candle } from "./StructureBrain";
import { IndicatorTruthEngine } from "./IndicatorTruthEngine";

export type PatternDirection = "BULLISH" | "BEARISH" | "NEUTRAL";
export type PatternStage = "DETECTED" | "CONFIRMED" | "INVALIDATED";

export interface PatternTruthResultV20 {
  patternId: string;
  patternName: string;
  direction: PatternDirection;
  stage: PatternStage;
  detectedAt: number;
  confirmedAt: number | null;
  invalidatedAt: number | null;
  confidence: number;
  evidence: string[];
  sourceIndexes: number[];
}

export class PatternTruthEngineV20 {
  /**
   * Evaluate comprehensive V20 candlestick and chart pattern evidence.
   */
  public static evaluatePatterns(candles: Candle[]): PatternTruthResultV20[] {
    if (!candles || candles.length < 5) {
      return [];
    }

    const snapshot = IndicatorTruthEngine.computeSnapshot(candles);
    const results: PatternTruthResultV20[] = [];

    const n = candles.length;
    const curr = candles[n - 1];
    const prev1 = candles[n - 2];
    const prev2 = candles[n - 3];

    const currBody = Math.abs(curr.close - curr.open);
    const currRange = curr.high - curr.low || 1;
    const prev1Body = Math.abs(prev1.close - prev1.open);
    const prev1Range = prev1.high - prev1.low || 1;

    const tsNum = typeof curr.timestamp === "number" ? curr.timestamp : (Date.parse(curr.timestamp) || Date.now());

    const addResult = (
      patternId: string,
      patternName: string,
      direction: PatternDirection,
      stage: PatternStage,
      confidence: number,
      evidence: string[],
      sourceIndexes: number[]
    ) => {
      results.push({
        patternId,
        patternName,
        direction,
        stage,
        detectedAt: tsNum,
        confirmedAt: stage === "CONFIRMED" ? tsNum : null,
        invalidatedAt: null,
        confidence,
        evidence,
        sourceIndexes
      });
    };

    // ------------------------------------------------------------------
    // BULLISH PATTERNS
    // ------------------------------------------------------------------

    // 1. Bullish Engulfing
    if (
      prev1.close < prev1.open &&
      curr.close > curr.open &&
      curr.open <= prev1.close &&
      curr.close >= prev1.open &&
      currBody > prev1Body * 1.1
    ) {
      addResult(
        "BULLISH_ENGULFING",
        "상승장악형 (Bullish Engulfing)",
        "BULLISH",
        "CONFIRMED",
        88,
        ["직전 음봉 몸통을 양봉이 완전히 장악", `거래량 증가 (비율: ${(curr.volume / (prev1.volume || 1)).toFixed(1)}x)`],
        [n - 2, n - 1]
      );
    }

    // 2. Hammer / Pinbar Reversal
    const lowerShadow = Math.min(curr.open, curr.close) - curr.low;
    const upperShadow = curr.high - Math.max(curr.open, curr.close);
    if (lowerShadow >= currBody * 2.2 && upperShadow <= currBody * 0.8) {
      addResult(
        "HAMMER_REVERSAL",
        "망치형 반등 (Hammer Pinbar)",
        "BULLISH",
        "CONFIRMED",
        82,
        ["아래꼬리가 몸통의 2.2배 이상 긴 강한 하방 매물 흡수", `하단 거절 파동 확정`],
        [n - 1]
      );
    }

    // 3. Morning Star (3-Candle)
    if (
      prev2.close < prev2.open &&
      Math.abs(prev1.close - prev1.open) <= (prev2.high - prev2.low) * 0.3 &&
      curr.close > curr.open &&
      curr.close >= prev2.open - (prev2.open - prev2.close) * 0.5
    ) {
      addResult(
        "MORNING_STAR",
        "샛별형 (Morning Star)",
        "BULLISH",
        "CONFIRMED",
        90,
        ["3봉 합성 샛별형 완성: 장대음봉 -> 십자선/도지 -> 장대양봉 관통"],
        [n - 3, n - 2, n - 1]
      );
    }

    // 4. Piercing Line
    if (
      prev1.close < prev1.open &&
      curr.open < prev1.low &&
      curr.close > prev1.close + (prev1.open - prev1.close) * 0.5 &&
      curr.close < prev1.open
    ) {
      addResult(
        "PIERCING_LINE",
        "관통형 (Piercing Line)",
        "BULLISH",
        "CONFIRMED",
        80,
        ["음봉 하단 갭하락 출발 후 50% 이상을 상향 관통"],
        [n - 2, n - 1]
      );
    }

    // 5. Bullish Harami
    if (
      prev1.close < prev1.open &&
      curr.close > curr.open &&
      curr.open > prev1.close &&
      curr.close < prev1.open
    ) {
      addResult(
        "BULLISH_HARAMI",
        "상승잉태형 (Bullish Harami)",
        "BULLISH",
        "DETECTED",
        72,
        ["장대음봉 안쪽에 시가/종가가 잉태된 양봉 출현"],
        [n - 2, n - 1]
      );
    }

    // 6. Three White Soldiers
    if (
      prev2.close > prev2.open &&
      prev1.close > prev1.open &&
      curr.close > curr.open &&
      prev1.close > prev2.close &&
      curr.close > prev1.close
    ) {
      addResult(
        "THREE_WHITE_SOLDIERS",
        "적삼병 (Three White Soldiers)",
        "BULLISH",
        "CONFIRMED",
        92,
        ["연속 3개 양봉 고점/종가 지속 상승 우상향 진행"],
        [n - 3, n - 2, n - 1]
      );
    }

    // 7. VWAP Reclaim
    if (snapshot.vwap !== null && prev1.close < snapshot.vwap && curr.close > snapshot.vwap) {
      addResult(
        "VWAP_RECLAIM",
        "VWAP 탈환 (VWAP Reclaim)",
        "BULLISH",
        "CONFIRMED",
        85,
        [`당일 VWAP (₩${snapshot.vwap.toLocaleString()}) 돌파 완성`],
        [n - 2, n - 1]
      );
    }

    // 8. 20-bar Breakout
    const last20High = Math.max(...candles.slice(Math.max(0, n - 21), n - 1).map(c => c.high));
    if (curr.close > last20High) {
      addResult(
        "BREAKOUT_20BAR",
        "20봉 신고가 돌파 (20-Bar Breakout)",
        "BULLISH",
        "CONFIRMED",
        89,
        [`최근 20봉 최고가 (₩${last20High.toLocaleString()}) 상향 돌파`],
        [n - 1]
      );
    }

    // ------------------------------------------------------------------
    // BEARISH PATTERNS
    // ------------------------------------------------------------------

    // 9. Bearish Engulfing
    if (
      prev1.close > prev1.open &&
      curr.close < curr.open &&
      curr.open >= prev1.close &&
      curr.close <= prev1.open &&
      currBody > prev1Body * 1.1
    ) {
      addResult(
        "BEARISH_ENGULFING",
        "하락장악형 (Bearish Engulfing)",
        "BEARISH",
        "CONFIRMED",
        88,
        ["직전 양봉 몸통을 음봉이 완전히 하향 장악"],
        [n - 2, n - 1]
      );
    }

    // 10. Shooting Star / Gravestone
    if (upperShadow >= currBody * 2.2 && lowerShadow <= currBody * 0.8) {
      addResult(
        "SHOOTING_STAR",
        "유성형 (Shooting Star)",
        "BEARISH",
        "CONFIRMED",
        82,
        ["위꼬리가 긴 강한 상방 매도 저항 파동"],
        [n - 1]
      );
    }

    // 11. Evening Star
    if (
      prev2.close > prev2.open &&
      Math.abs(prev1.close - prev1.open) <= (prev2.high - prev2.low) * 0.3 &&
      curr.close < curr.open &&
      curr.close <= prev2.open + (prev2.close - prev2.open) * 0.5
    ) {
      addResult(
        "EVENING_STAR",
        "석별형 (Evening Star)",
        "BEARISH",
        "CONFIRMED",
        90,
        ["3봉 석별형 하락 반전 패턴 완성"],
        [n - 3, n - 2, n - 1]
      );
    }

    // 12. Dark Cloud Cover
    if (
      prev1.close > prev1.open &&
      curr.open > prev1.high &&
      curr.close < prev1.close - (prev1.close - prev1.open) * 0.5 &&
      curr.close > prev1.open
    ) {
      addResult(
        "DARK_CLOUD_COVER",
        "먹구름형 (Dark Cloud Cover)",
        "BEARISH",
        "CONFIRMED",
        80,
        ["양봉 고점 위 갭상승 출발 후 50% 이상 하향 관통"],
        [n - 2, n - 1]
      );
    }

    // 13. Three Black Crows
    if (
      prev2.close < prev2.open &&
      prev1.close < prev1.open &&
      curr.close < curr.open &&
      prev1.close < prev2.close &&
      curr.close < prev1.close
    ) {
      addResult(
        "THREE_BLACK_CROWS",
        "흑삼병 (Three Black Crows)",
        "BEARISH",
        "CONFIRMED",
        92,
        ["연속 3개 음봉 종가 지속 하락 주저앉음"],
        [n - 3, n - 2, n - 1]
      );
    }

    // 14. VWAP Loss
    if (snapshot.vwap !== null && prev1.close > snapshot.vwap && curr.close < snapshot.vwap) {
      addResult(
        "VWAP_LOSS",
        "VWAP 이탈 (VWAP Loss)",
        "BEARISH",
        "CONFIRMED",
        85,
        [`당일 VWAP (₩${snapshot.vwap.toLocaleString()}) 하향 이탈`],
        [n - 2, n - 1]
      );
    }

    // ------------------------------------------------------------------
    // NEUTRAL / INDECISION PATTERNS
    // ------------------------------------------------------------------

    // 15. Doji / Spinning Top
    if (currBody <= currRange * 0.12) {
      addResult(
        "DOJI_INDECISION",
        "도지/십자선 (Doji Indecision)",
        "NEUTRAL",
        "DETECTED",
        65,
        ["매수/매도 세력 팽팽한 팽이형 도지 수렴"],
        [n - 1]
      );
    }

    return results;
  }
}
