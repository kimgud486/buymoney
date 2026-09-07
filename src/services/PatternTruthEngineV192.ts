// ----------------------------------------------------------------------
// AISTOCK PATTERN TRUTH ENGINE V19.2
// Pure Data-Grounded Candlestick & Chart Pattern Recognition
// ----------------------------------------------------------------------

import { Candle } from "./StructureBrain";
import { IndicatorTruthEngine } from "./IndicatorTruthEngine";

export type PatternDirection = "BULLISH" | "BEARISH" | "NEUTRAL";
export type PatternStage = "DETECTED" | "CONFIRMED" | "INVALIDATED";

export interface PatternTruthResultV192 {
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

export class PatternTruthEngineV192 {
  /**
   * Evaluate verified candlestick & chart patterns from real historical candles.
   */
  public static evaluatePatterns(candles: Candle[]): PatternTruthResultV192[] {
    if (!candles || candles.length < 5) {
      return [];
    }

    const snapshot = IndicatorTruthEngine.computeSnapshot(candles);
    const results: PatternTruthResultV192[] = [];

    const n = candles.length;
    const curr = candles[n - 1];
    const prev1 = candles[n - 2];
    const prev2 = candles[n - 3];

    const currBody = Math.abs(curr.close - curr.open);
    const currRange = curr.high - curr.low || 1;
    const currUpperWick = curr.high - Math.max(curr.open, curr.close);
    const currLowerWick = Math.min(curr.open, curr.close) - curr.low;

    const prev1Body = Math.abs(prev1.close - prev1.open);
    const prev1Range = prev1.high - prev1.low || 1;

    const tsNum = typeof curr.timestamp === "number" ? curr.timestamp : (Date.parse(curr.timestamp) || Date.now());

    // Helper for adding detected pattern
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
      currBody > prev1Body
    ) {
      const isConfirmed = snapshot.rvol != null && snapshot.rvol > 1.2;
      addResult(
        "BULLISH_ENGULFING",
        "상승장악형 (Bullish Engulfing)",
        "BULLISH",
        isConfirmed ? "CONFIRMED" : "DETECTED",
        isConfirmed ? 85 : 70,
        [
          `직전 음봉 몸통(${prev1Body.toFixed(1)})을 현재 양봉(${currBody.toFixed(1)})이 완전히 감싸안음`,
          snapshot.rvol != null ? `상대거래량 RVOL ${snapshot.rvol.toFixed(2)}배` : "거래량 수급 확인 중"
        ],
        [n - 2, n - 1]
      );
    }

    // 2. Hammer
    if (currLowerWick >= currBody * 2 && currUpperWick <= currBody * 0.5 && currLowerWick / currRange >= 0.5) {
      const isConfirmed = curr.close > prev1.high;
      addResult(
        "HAMMER",
        "망치형 (Hammer)",
        "BULLISH",
        isConfirmed ? "CONFIRMED" : "DETECTED",
        isConfirmed ? 80 : 65,
        [
          `하단 꼬리 길이(${currLowerWick.toFixed(1)})가 몸통(${currBody.toFixed(1)})의 2배 이상`,
          `상단 꼬리 수급 제어 확인 (${currUpperWick.toFixed(1)})`
        ],
        [n - 1]
      );
    }

    // 3. Morning Star
    if (
      prev2.close < prev2.open &&
      prev1Body / (prev2.high - prev2.low || 1) < 0.3 &&
      curr.close > curr.open &&
      curr.close > (prev2.open + prev2.close) / 2
    ) {
      addResult(
        "MORNING_STAR",
        "샛별형 (Morning Star)",
        "BULLISH",
        "CONFIRMED",
        88,
        [
          "3봉 연계 바닥 변곡 파동 완성",
          `첫 번째 장대음봉 중심값(${((prev2.open + prev2.close) / 2).toFixed(1)}) 상방 돌파`
        ],
        [n - 3, n - 2, n - 1]
      );
    }

    // 4. VWAP Reclaim
    if (snapshot.vwap != null && curr.close > snapshot.vwap && prev1.close <= snapshot.vwap) {
      const isConfirmed = snapshot.rvol != null && snapshot.rvol >= 1.3;
      addResult(
        "VWAP_RECLAIM",
        "VWAP 돌파 재안착 (VWAP Reclaim)",
        "BULLISH",
        isConfirmed ? "CONFIRMED" : "DETECTED",
        isConfirmed ? 90 : 75,
        [
          `현재가 ${curr.close}가 당일 VWAP $${snapshot.vwap.toFixed(2)} 상향 돌파`,
          snapshot.rvol != null ? `RVOL ${snapshot.rvol.toFixed(2)}배 동반` : "거래량 확인 중"
        ],
        [n - 2, n - 1]
      );
    }

    // 5. 20-Bar Breakout
    if (candles.length >= 20) {
      const window20 = candles.slice(n - 21, n - 1);
      const max20 = Math.max(...window20.map(c => c.high));
      if (curr.close > max20) {
        const isConfirmed = snapshot.rvol != null && snapshot.rvol >= 1.5;
        addResult(
          "BREAKOUT_20BAR",
          "20봉 최고가 신고가 돌파 (20-Bar Breakout)",
          "BULLISH",
          isConfirmed ? "CONFIRMED" : "DETECTED",
          isConfirmed ? 92 : 78,
          [
            `20봉 최고 저항가 $${max20.toFixed(2)} 돌파 완료`,
            snapshot.rvol != null ? `RVOL ${snapshot.rvol.toFixed(2)}배 매수세 집중` : "거래량 수급 확인"
          ],
          [n - 1]
        );
      }
    }

    // 6. Volume Surge
    if (snapshot.rvol != null && snapshot.rvol >= 2.0 && curr.close > curr.open) {
      addResult(
        "VOLUME_SURGE",
        "거래량 급증 돌파 (Volume Surge)",
        "BULLISH",
        "CONFIRMED",
        88,
        [
          `상대 거래량 RVOL ${snapshot.rvol.toFixed(2)}배 급증`,
          `양봉 종가 마감 ($${curr.close.toFixed(2)})`
        ],
        [n - 1]
      );
    }

    // ------------------------------------------------------------------
    // BEARISH PATTERNS
    // ------------------------------------------------------------------

    // 1. Bearish Engulfing
    if (
      prev1.close > prev1.open &&
      curr.close < curr.open &&
      curr.open >= prev1.close &&
      curr.close <= prev1.open &&
      currBody > prev1Body
    ) {
      addResult(
        "BEARISH_ENGULFING",
        "하락장악형 (Bearish Engulfing)",
        "BEARISH",
        "CONFIRMED",
        86,
        [
          `직전 양봉 몸통(${prev1Body.toFixed(1)})을 현재 음봉(${currBody.toFixed(1)})이 완전 하향 이탈`,
          `매도 수급 우위 전환`
        ],
        [n - 2, n - 1]
      );
    }

    // 2. Shooting Star
    if (currUpperWick >= currBody * 2 && currLowerWick <= currBody * 0.5 && currUpperWick / currRange >= 0.5) {
      addResult(
        "SHOOTING_STAR",
        "유성형 (Shooting Star)",
        "BEARISH",
        "CONFIRMED",
        82,
        [
          `상단 윗꼬리(${currUpperWick.toFixed(1)})가 몸통의 2배 이상 형성`,
          "고점 매도 압력 강력 출회"
        ],
        [n - 1]
      );
    }

    // 3. VWAP Loss
    if (snapshot.vwap != null && curr.close < snapshot.vwap && prev1.close >= snapshot.vwap) {
      addResult(
        "VWAP_LOSS",
        "VWAP 하향 이탈 (VWAP Loss)",
        "BEARISH",
        "CONFIRMED",
        89,
        [
          `현재가 $${curr.close.toFixed(2)}가 VWAP $${snapshot.vwap.toFixed(2)} 하향 하회`,
          "당일 지지 파동 붕괴"
        ],
        [n - 2, n - 1]
      );
    }

    // 4. 20-Bar Breakdown
    if (candles.length >= 20) {
      const window20 = candles.slice(n - 21, n - 1);
      const min20 = Math.min(...window20.map(c => c.low));
      if (curr.close < min20) {
        addResult(
          "BREAKDOWN_20BAR",
          "20봉 신저가 하향 이탈 (20-Bar Breakdown)",
          "BEARISH",
          "CONFIRMED",
          91,
          [
            `20봉 최저 지지가 $${min20.toFixed(2)} 하향 이탈`,
            "하락 추세 이탈 확정"
          ],
          [n - 1]
        );
      }
    }

    // ------------------------------------------------------------------
    // NEUTRAL / RISK PATTERNS
    // ------------------------------------------------------------------

    // 1. Doji
    if (currBody / currRange <= 0.1) {
      addResult(
        "DOJI",
        "도지 (Doji)",
        "NEUTRAL",
        "DETECTED",
        60,
        [
          `시가와 종가 오차 ${currBody.toFixed(2)} (전체 범주의 ${(currBody / currRange * 100).toFixed(1)}%)`,
          "매수·매도 공방 팽팽한 변곡 구간"
        ],
        [n - 1]
      );
    }

    // 2. Chase Risk / Overextended
    if (snapshot.rsi14 != null && snapshot.rsi14 >= 78) {
      addResult(
        "CHASE_RISK",
        "과매수 추격 매수 위험 (Overbought Chase Risk)",
        "NEUTRAL",
        "CONFIRMED",
        95,
        [
          `RSI14 ${snapshot.rsi14.toFixed(1)} 과열 영역 진입`,
          "단기 과열로 인한 추격 매수 금지 경고"
        ],
        [n - 1]
      );
    }

    return results;
  }
}
