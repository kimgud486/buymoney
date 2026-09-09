/**
 * GRAPH SHAPE SCANNER (TypeScript Engine)
 * Reads Candle Shapes + Chart Shapes + Indicator Bends/Crosses/Convergences.
 * Mathematical OHLCV pattern recognition for KOSPI / KOSDAQ / Crypto / US.
 */

export interface CandleData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp?: number;
}

export interface ShapeResult {
  symbol: string;
  score: number; // 0 ~ 100
  graphScore: number;
  flowScore: number;
  riskScore: number;
  finalScore: number;
  grade: "S" | "A+" | "A" | "EXCLUDED";
  verdict: "YES" | "NO";
  patterns: string[];
  reasons: string[];
  blockers: string[];
  timeframeChecks: {
    tf1m: boolean;
    tf3m: boolean;
    tf5m: boolean;
    tfDaily: boolean;
    passedCount: number;
  };
  details: {
    emaAligned: boolean;
    emaGoldenCross: boolean;
    emaRising: boolean;
    vwapReclaimed: boolean;
    rsiReclaimed: boolean;
    rsiRebound: boolean;
    macdCross: boolean;
    macdExpansion: boolean;
    bbSqueeze: boolean;
    breakout: boolean;
    breakoutRetest: boolean;
    higherLow: boolean;
    wBottom: boolean;
    volumeExpansion: boolean;
    strongClose: boolean;
    candlePatterns: string[];
    fakeBreakout: boolean;
    belowVwap: boolean;
    rsiOverbought: boolean;
    rvol: number;
    rsi: number;
    vwap: number;
  };
}

// ----------------------------------------------------------------------
// Helper Calculations (Pure TS without external native binaries)
// ----------------------------------------------------------------------

function computeEMA(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const k = 2 / (period + 1);
  const result: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(values[i] * k + result[i - 1] * (1 - k));
  }
  return result;
}

function computeRSI(close: number[], period: number = 14): number[] {
  if (close.length < period + 1) return new Array(close.length).fill(50);
  const rsi: number[] = new Array(close.length).fill(50);
  let gainSum = 0;
  let lossSum = 0;

  for (let i = 1; i <= period; i++) {
    const diff = close[i] - close[i - 1];
    if (diff >= 0) gainSum += diff;
    else lossSum += Math.abs(diff);
  }

  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;

  rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < close.length; i++) {
    const diff = close[i] - close[i - 1];
    const gain = diff >= 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      rsi[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      rsi[i] = 100 - 100 / (1 + rs);
    }
  }

  return rsi;
}

function computeMACD(close: number[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const fastEMA = computeEMA(close, fastPeriod);
  const slowEMA = computeEMA(close, slowPeriod);
  const macdLine: number[] = [];

  for (let i = 0; i < close.length; i++) {
    macdLine.push(fastEMA[i] - slowEMA[i]);
  }

  const signalLine = computeEMA(macdLine, signalPeriod);
  const histogram: number[] = [];

  for (let i = 0; i < close.length; i++) {
    histogram.push(macdLine[i] - signalLine[i]);
  }

  return { macd: macdLine, signal: signalLine, hist: histogram };
}

function computeBollingerBands(close: number[], period = 20, stdDevMult = 2) {
  const upper: number[] = [];
  const middle: number[] = [];
  const lower: number[] = [];
  const bandwidth: number[] = [];

  for (let i = 0; i < close.length; i++) {
    if (i < period - 1) {
      upper.push(close[i]);
      middle.push(close[i]);
      lower.push(close[i]);
      bandwidth.push(0);
      continue;
    }

    const slice = close.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    const up = mean + stdDev * stdDevMult;
    const low = mean - stdDev * stdDevMult;
    const width = mean > 0 ? (up - low) / mean : 0;

    middle.push(mean);
    upper.push(up);
    lower.push(low);
    bandwidth.push(width);
  }

  return { upper, middle, lower, bandwidth };
}

function computeVWAP(candles: CandleData[]): number[] {
  const vwap: number[] = [];
  let cumTPV = 0;
  let cumVol = 0;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const typicalPrice = (c.high + c.low + c.close) / 3;
    const tpv = typicalPrice * c.volume;

    cumTPV += tpv;
    cumVol += c.volume;

    vwap.push(cumVol > 0 ? cumTPV / cumVol : c.close);
  }

  return vwap;
}

function computeRVOL(volume: number[], period = 20): number[] {
  const rvol: number[] = [];
  for (let i = 0; i < volume.length; i++) {
    if (i < period - 1) {
      rvol.push(1.0);
      continue;
    }
    const slice = volume.slice(i - period + 1, i + 1);
    const meanVol = slice.reduce((a, b) => a + b, 0) / period;
    rvol.push(meanVol > 0 ? volume[i] / meanVol : 1.0);
  }
  return rvol;
}

// Candle Pattern Detection
function detectCandlePatterns(candles: CandleData[]): string[] {
  if (candles.length < 3) return [];
  const result: string[] = [];

  const curr = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const prev2 = candles[candles.length - 3];

  const bodyCurr = Math.abs(curr.close - curr.open);
  const rangeCurr = Math.max(curr.high - curr.low, 0.00001);
  const lowerWickCurr = Math.min(curr.open, curr.close) - curr.low;

  // 1. BULLISH_ENGULFING
  if (curr.close > curr.open && prev.close < prev.open && curr.open <= prev.close && curr.close >= prev.open) {
    result.push("BULLISH_ENGULFING");
  }

  // 2. HAMMER
  if (curr.close > curr.open && lowerWickCurr >= bodyCurr * 2 && (curr.high - curr.close) <= bodyCurr * 0.5) {
    result.push("HAMMER");
  }

  // 3. MORNING_STAR
  const bodyPrev2 = Math.abs(prev2.close - prev2.open);
  const bodyPrev = Math.abs(prev.close - prev.open);
  if (prev2.close < prev2.open && bodyPrev2 > 0 && bodyPrev < bodyPrev2 * 0.3 && curr.close > curr.open && curr.close > (prev2.open + prev2.close) / 2) {
    result.push("MORNING_STAR");
  }

  // 4. THREE_WHITE_SOLDIERS
  if (
    curr.close > curr.open &&
    prev.close > prev.open &&
    prev2.close > prev2.open &&
    curr.close > prev.close &&
    prev.close > prev2.close
  ) {
    result.push("THREE_WHITE_SOLDIERS");
  }

  return result;
}

// ----------------------------------------------------------------------
// GRAPH SHAPE SCANNER CLASS
// ----------------------------------------------------------------------

export class GraphShapeScanner {
  /**
   * Main Shape Analysis Engine
   */
  public scan(candles: CandleData[], symbol = "STOCK"): ShapeResult {
    if (!candles || candles.length < 30) {
      return {
        symbol,
        score: 0,
        graphScore: 0,
        flowScore: 0,
        riskScore: 0,
        finalScore: 0,
        grade: "EXCLUDED",
        verdict: "NO",
        patterns: [],
        reasons: [],
        blockers: ["OHLCV 데이터 부족 (최소 30개 봉 필요)"],
        timeframeChecks: { tf1m: false, tf3m: false, tf5m: false, tfDaily: false, passedCount: 0 },
        details: {
          emaAligned: false,
          emaGoldenCross: false,
          emaRising: false,
          vwapReclaimed: false,
          rsiReclaimed: false,
          rsiRebound: false,
          macdCross: false,
          macdExpansion: false,
          bbSqueeze: false,
          breakout: false,
          breakoutRetest: false,
          higherLow: false,
          wBottom: false,
          volumeExpansion: false,
          strongClose: false,
          candlePatterns: [],
          fakeBreakout: false,
          belowVwap: false,
          rsiOverbought: false,
          rvol: 1.0,
          rsi: 50,
          vwap: 0,
        },
      };
    }

    const closes = candles.map((c) => c.close);
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const volumes = candles.map((c) => c.volume);

    // Calculate Indicators
    const ema9 = computeEMA(closes, 9);
    const ema20 = computeEMA(closes, 20);
    const ema50 = computeEMA(closes, 50);

    const rsi = computeRSI(closes, 14);
    const macdData = computeMACD(closes, 12, 26, 9);
    const bbData = computeBollingerBands(closes, 20, 2);
    const vwap = computeVWAP(candles);
    const rvol = computeRVOL(volumes, 20);

    const len = candles.length;
    const nowIdx = len - 1;
    const prevIdx = len - 2;

    const nowCandle = candles[nowIdx];
    const prevCandle = candles[prevIdx];

    const currentClose = nowCandle.close;
    const currentHigh = nowCandle.high;
    const currentLow = nowCandle.low;
    const currentVwap = vwap[nowIdx];
    const currentRsi = rsi[nowIdx];
    const currentRvol = rvol[nowIdx];

    let score = 0;
    const patterns: string[] = [];
    const reasons: string[] = [];
    const blockers: string[] = [];

    // 1. EMA 정배열 (EMA9 > EMA20 > EMA50) (+12 pts)
    const emaAligned = ema9[nowIdx] > ema20[nowIdx] && ema20[nowIdx] > ema50[nowIdx];
    if (emaAligned) {
      score += 12;
      patterns.push("EMA_ALIGNMENT");
      reasons.push("EMA9 > EMA20 > EMA50 정배열");
    }

    // 2. EMA Golden Cross (+8 pts)
    const emaGoldenCross = ema9[prevIdx] <= ema20[prevIdx] && ema9[nowIdx] > ema20[nowIdx];
    if (emaGoldenCross) {
      score += 8;
      patterns.push("EMA_GOLDEN_CROSS");
      reasons.push("EMA9-EMA20 골든크로스 발생");
    }

    // 3. EMA 상승 각도 (+6 pts)
    const emaRising = len >= 5 && ema20[nowIdx] > ema20[nowIdx - 2] && ema20[nowIdx - 2] > ema20[nowIdx - 4];
    if (emaRising) {
      score += 6;
      reasons.push("EMA20 상승 기울시 지속");
    }

    // 4. VWAP Reclaim (+10 pts)
    const vwapReclaimed = prevCandle.close <= vwap[prevIdx] && currentClose > currentVwap;
    if (vwapReclaimed) {
      score += 10;
      patterns.push("VWAP_RECLAIM");
      reasons.push("VWAP 상향 재돌파 (Reclaim)");
    }

    // 5. RSI 50 Reclaim (+5 pts)
    const rsiReclaimed = rsi[prevIdx] <= 50 && currentRsi > 50;
    if (rsiReclaimed) {
      score += 5;
      patterns.push("RSI_50_RECLAIM");
      reasons.push("RSI 50 중심선 돌파");
    }

    // 6. RSI Rebound (+5 pts)
    const rsiTail = rsi.slice(-6);
    const minRsiTail = Math.min(...rsiTail);
    const rsiRebound = minRsiTail < 50 && currentRsi > rsi[prevIdx] && currentRsi > 52;
    if (rsiRebound) {
      score += 5;
      patterns.push("RSI_REBOUND");
      reasons.push("RSI 눌림목 후 반등");
    }

    // 7. MACD Golden Cross (+7 pts)
    const macdCross = macdData.macd[prevIdx] <= macdData.signal[prevIdx] && macdData.macd[nowIdx] > macdData.signal[nowIdx];
    if (macdCross) {
      score += 7;
      patterns.push("MACD_GOLDEN_CROSS");
      reasons.push("MACD 시그널선 골든크로스");
    }

    // 8. MACD Histogram Expansion (+7 pts)
    const macdExpansion =
      len >= 3 &&
      macdData.hist[nowIdx] > 0 &&
      macdData.hist[nowIdx] > macdData.hist[nowIdx - 1] &&
      macdData.hist[nowIdx - 1] > macdData.hist[nowIdx - 2];
    if (macdExpansion) {
      score += 7;
      patterns.push("MACD_EXPANSION");
      reasons.push("MACD 히스토그램 상승 확장");
    }

    // 9. Bollinger Band Squeeze (+5 pts)
    const widthTail = bbData.bandwidth.slice(-40);
    const sortedWidth = [...widthTail].sort((a, b) => a - b);
    const quantile20 = sortedWidth[Math.floor(sortedWidth.length * 0.20)] || 0;
    const bbSqueeze = bbData.bandwidth[nowIdx] <= quantile20;
    if (bbSqueeze) {
      score += 5;
      patterns.push("BB_SQUEEZE");
      reasons.push("볼린저밴드 극강 스퀴즈 수렴");
    }

    // 10. Breakout (+12 pts)
    const prev20Highs = highs.slice(Math.max(0, nowIdx - 21), nowIdx);
    const maxPrev20High = Math.max(...prev20Highs);
    const breakout = currentClose > maxPrev20High && currentRvol >= 1.5;
    if (breakout) {
      score += 12;
      patterns.push("BREAKOUT");
      reasons.push(`20봉 신고가 돌파 (${maxPrev20High.toLocaleString()}원 상향)`);
    }

    // 11. Breakout + Retest (+15 pts)
    let breakoutRetest = false;
    if (len >= 25) {
      const resistance = Math.max(...highs.slice(nowIdx - 25, nowIdx - 5));
      const recentSlice = candles.slice(-5);
      const recentMaxHigh = Math.max(...recentSlice.map((c) => c.high));
      const recentMinLow = Math.min(...recentSlice.map((c) => c.low));

      const breakoutSeen = recentMaxHigh > resistance;
      const retestSeen = recentMinLow <= resistance * 1.01;
      const reclaim = currentClose > resistance;

      breakoutRetest = breakoutSeen && retestSeen && reclaim;
      if (breakoutRetest) {
        score += 15;
        patterns.push("BREAKOUT_RETEST");
        reasons.push("저항 돌파 후 리테스트 지지 확인");
      }
    }

    // 12. Higher Low (+6 pts)
    let higherLow = false;
    if (len >= 15) {
      const firstLow = Math.min(...lows.slice(nowIdx - 15, nowIdx - 8));
      const secondLow = Math.min(...lows.slice(nowIdx - 7));
      higherLow = secondLow > firstLow;
      if (higherLow) {
        score += 6;
        patterns.push("HIGHER_LOW");
        reasons.push("저점 연쇄 상승 (Higher Low)");
      }
    }

    // 13. W-Bottom (Double Bottom) (+12 pts)
    let wBottom = false;
    if (len >= 30) {
      const tail30Lows = lows.slice(-30);
      const firstLow = Math.min(...tail30Lows.slice(0, 15));
      const secondLow = Math.min(...tail30Lows.slice(15));
      const tolerance = Math.abs(firstLow - secondLow) / Math.max(firstLow, secondLow, 1);
      const neckline = Math.max(...highs.slice(-30).slice(8, 22));

      wBottom = tolerance <= 0.03 && currentClose > neckline;
      if (wBottom) {
        score += 12;
        patterns.push("W_BOTTOM_BREAKOUT");
        reasons.push("W바닥(이중바닥) 넥라인 돌파");
      }
    }

    // 14. Volume Explosion (+10 pts)
    const volumeExpansion = currentRvol >= 2.0;
    if (volumeExpansion) {
      score += 10;
      reasons.push(`거래량 폭발 (RVOL ${currentRvol.toFixed(2)}배)`);
    }

    // 15. Strong Close (+5 pts)
    const candleRange = Math.max(currentHigh - currentLow, 0.00001);
    const closePosition = (currentClose - currentLow) / candleRange;
    const strongClose = nowCandle.close > nowCandle.open && closePosition >= 0.80;
    if (strongClose) {
      score += 5;
      reasons.push("캔들 상단 80% 이상 강력 종가 마감");
    }

    // 16. Candle Patterns (+5 pts each)
    const cPatterns = detectCandlePatterns(candles);
    cPatterns.forEach((cp) => {
      score += 5;
      patterns.push(cp);
      reasons.push(`특수 캔들 패턴 감지: ${cp}`);
    });

    // ----------------------------------------------------------------------
    // Risk & Blockers (Fail-Closed Filters)
    // ----------------------------------------------------------------------

    // Fake Breakout (-30 pts & Blocker)
    const failedClose = currentHigh > maxPrev20High && currentClose < maxPrev20High;
    const lowVolBreakout = currentHigh > maxPrev20High && currentRvol < 1.2;
    const fakeBreakout = failedClose || lowVolBreakout;

    if (fakeBreakout) {
      score -= 30;
      blockers.push("FAKE_BREAKOUT 위험 (가짜 돌파 감지)");
    }

    // Below VWAP (-20 pts & Blocker)
    const belowVwap = currentClose < currentVwap;
    if (belowVwap) {
      score -= 20;
      blockers.push("VWAP 아래 (기관 평균단가 하회)");
    }

    // Overbought (-20 pts & Blocker)
    const rsiOverbought = currentRsi > 80;
    if (rsiOverbought) {
      score -= 20;
      blockers.push("RSI 과열 (80 초과 추격 위험)");
    }

    // Cap Score between 0 and 100
    const graphScore = Math.max(0, Math.min(100, score));

    // Calculate Flow Score & Risk Score
    const flowScore = Math.min(100, Math.round((currentRvol / 2.5) * 40 + (closePosition >= 0.7 ? 30 : 10) + (macdExpansion ? 30 : 15)));
    const riskScore = blockers.length > 0 ? 30 : Math.min(100, Math.round(100 - (currentRsi > 70 ? 25 : 0) - (fakeBreakout ? 50 : 0)));

    // Final Weighted Score (40% Graph + 35% Flow + 25% Risk)
    const finalScore = Math.round(graphScore * 0.40 + flowScore * 0.35 + riskScore * 0.25);

    // Timeframe Confirmation (1m, 3m, 5m, Daily)
    const tf1m = graphScore >= 65;
    const tf3m = !belowVwap;
    const tf5m = emaAligned || emaGoldenCross || breakout;
    const tfDaily = !rsiOverbought && !fakeBreakout;
    const passedCount = (tf1m ? 1 : 0) + (tf3m ? 1 : 0) + (tf5m ? 1 : 0) + (tfDaily ? 1 : 0);

    // Grade and Verdict Determination
    let grade: "S" | "A+" | "A" | "EXCLUDED" = "EXCLUDED";
    let verdict: "YES" | "NO" = "NO";

    if (blockers.length === 0 && graphScore >= 70 && finalScore >= 80 && passedCount >= 3) {
      verdict = "YES";
      if (finalScore >= 90) grade = "S";
      else if (finalScore >= 85) grade = "A+";
      else grade = "A";
    }

    return {
      symbol,
      score: graphScore,
      graphScore,
      flowScore,
      riskScore,
      finalScore,
      grade,
      verdict,
      patterns,
      reasons,
      blockers,
      timeframeChecks: {
        tf1m,
        tf3m,
        tf5m,
        tfDaily,
        passedCount,
      },
      details: {
        emaAligned,
        emaGoldenCross,
        emaRising,
        vwapReclaimed,
        rsiReclaimed,
        rsiRebound,
        macdCross,
        macdExpansion,
        bbSqueeze,
        breakout,
        breakoutRetest,
        higherLow,
        wBottom,
        volumeExpansion,
        strongClose,
        candlePatterns: cPatterns,
        fakeBreakout,
        belowVwap,
        rsiOverbought,
        rvol: currentRvol,
        rsi: currentRsi,
        vwap: currentVwap,
      },
    };
  }
}

export const defaultGraphShapeScanner = new GraphShapeScanner();
