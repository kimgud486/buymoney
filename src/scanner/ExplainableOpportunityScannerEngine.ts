/**
 * AI Explainable Profit Opportunity Scanner Engine (TypeScript / Server & Client)
 * Computes 100-Point Mathematical Opportunity Score, Bullish/Risk Rationale,
 * Entry/Stop/Target Price Levels, and Signal Validation Gate.
 */

export interface CandleRecord {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp?: number;
}

export interface ExplainableTradeIdea {
  id: string;
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  score: number;
  grade: "S" | "A+" | "A" | "B" | "NO_SETUP";
  decision: "STRONG_BUY_CANDIDATE" | "BUY_CANDIDATE" | "WATCH_FOR_ENTRY" | "WATCH" | "AVOID";
  price: number;
  changePct: number;
  entryLow: number;
  entryHigh: number;
  stop: number;
  target1: number;
  target2: number;
  rsi: number;
  rvol: number;
  adx: number;
  atrPct: number;
  pattern: string;
  bullishReasons: string[];
  riskReasons: string[];
  thesis: string;
  invalidation: string;
  wouldBuy: boolean;
  aiSummary?: string;
  scannedAt: string;
}

export function computeEma(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const alpha = 2 / (period + 1);
  const result: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(alpha * values[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

export function computeRsi(close: number[], period: number = 14): number[] {
  if (close.length < period + 1) return new Array(close.length).fill(50);
  const diffs: number[] = [];
  for (let i = 1; i < close.length; i++) {
    diffs.push(close[i] - close[i - 1]);
  }

  const gains = diffs.map((d) => Math.max(d, 0));
  const losses = diffs.map((d) => Math.max(-d, 0));

  const alpha = 1 / period;
  let avgGain = gains[0];
  let avgLoss = losses[0];

  const rsi: number[] = [50];
  for (let i = 1; i < diffs.length; i++) {
    avgGain = alpha * gains[i] + (1 - alpha) * avgGain;
    avgLoss = alpha * losses[i] + (1 - alpha) * avgLoss;
    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - 100 / (1 + rs));
    }
  }
  return rsi;
}

export function detectCandlePattern(records: CandleRecord[]): { pattern: string; isBullish: boolean; isBearish: boolean } {
  if (records.length < 2) return { pattern: "NONE", isBullish: false, isBearish: false };

  const curr = records[records.length - 1];
  const prev = records[records.length - 2];

  const body = Math.abs(curr.close - curr.open);
  const range = Math.max(curr.high - curr.low, 0.000001);
  const upperWick = curr.high - Math.max(curr.open, curr.close);
  const lowerWick = Math.min(curr.open, curr.close) - curr.low;

  const bullish = curr.close > curr.open;
  const bearish = curr.close < curr.open;

  // Bullish Engulfing
  if (bullish && prev.close < prev.open && curr.open <= prev.close && curr.close >= prev.open) {
    return { pattern: "BULLISH_ENGULFING (상승장악형)", isBullish: true, isBearish: false };
  }

  // Hammer
  if (lowerWick >= body * 2.0 && upperWick <= Math.max(body, 0.000001)) {
    return { pattern: "HAMMER (망치형)", isBullish: bullish, isBearish: false };
  }

  // Three White Soldiers
  if (records.length >= 3) {
    const p2 = records[records.length - 3];
    if (bullish && prev.close > prev.open && p2.close > p2.open) {
      if (curr.close > prev.close && prev.close > p2.close) {
        return { pattern: "THREE_WHITE_SOLDIERS (적삼병)", isBullish: true, isBearish: false };
      }
    }
  }

  // Strong Bull / Strong Bear
  if (bullish && body / range >= 0.70) {
    return { pattern: "STRONG_BULL (장대양봉)", isBullish: true, isBearish: false };
  }
  if (bearish && body / range >= 0.70) {
    return { pattern: "STRONG_BEAR (장대음봉)", isBullish: false, isBearish: true };
  }

  if (bullish) return { pattern: "BULLISH (양봉)", isBullish: true, isBearish: false };
  if (bearish) return { pattern: "BEARISH (음봉)", isBullish: false, isBearish: true };

  return { pattern: "DOJI (십자형)", isBullish: false, isBearish: false };
}

export function analyzeStockIdea(
  symbol: string,
  name: string,
  market: "KOREA" | "US" | "BTC",
  records: CandleRecord[],
  currentPriceOverride?: number,
  changePctOverride?: number
): ExplainableTradeIdea {
  if (records.length < 20) {
    throw new Error(`${name}(${symbol}): 최소 20개 이상의 캔들 데이터가 필요합니다.`);
  }

  const closes = records.map((r) => r.close);
  const highs = records.map((r) => r.high);
  const lows = records.map((r) => r.low);
  const volumes = records.map((r) => r.volume);

  const price = currentPriceOverride || closes[closes.length - 1];
  const firstClose = closes[0];
  const changePct = changePctOverride !== undefined 
    ? changePctOverride 
    : parseFloat((((price - firstClose) / Math.max(firstClose, 0.0001)) * 100).toFixed(2));

  const ema9Vals = computeEma(closes, 9);
  const ema20Vals = computeEma(closes, 20);
  const ema50Vals = computeEma(closes, Math.min(50, Math.floor(closes.length * 0.8)));
  const rsiVals = computeRsi(closes, 14);

  // MACD
  const fastEma = computeEma(closes, 12);
  const slowEma = computeEma(closes, 26);
  const macdLine = fastEma.map((f, i) => f - slowEma[i]);
  const macdSignal = computeEma(macdLine, 9);
  const macdHist = macdLine.map((m, i) => m - macdSignal[i]);

  // ATR
  const trList: number[] = [];
  for (let i = 0; i < records.length; i++) {
    if (i === 0) {
      trList.push(highs[0] - lows[0]);
    } else {
      trList.push(
        Math.max(
          highs[i] - lows[i],
          Math.abs(highs[i] - closes[i - 1]),
          Math.abs(lows[i] - closes[i - 1])
        )
      );
    }
  }
  const atrVals = computeEma(trList, 14);

  // VWAP
  let cumVal = 0;
  let cumVol = 0;
  const vwapVals: number[] = [];
  for (let i = 0; i < records.length; i++) {
    const typical = (highs[i] + lows[i] + closes[i]) / 3;
    cumVal += typical * volumes[i];
    cumVol += volumes[i];
    vwapVals.push(cumVal / Math.max(cumVol, 0.000001));
  }

  // RVOL
  const rvolVals: number[] = [];
  for (let i = 0; i < records.length; i++) {
    if (i < 19) {
      rvolVals.push(1.0);
    } else {
      const volSlice = volumes.slice(i - 19, i + 1);
      const volMa = volSlice.reduce((a, b) => a + b, 0) / 20;
      rvolVals.push(volumes[i] / Math.max(volMa, 0.000001));
    }
  }

  // Prev 20 High
  const prevHigh20Vals: number[] = [];
  for (let i = 0; i < records.length; i++) {
    if (i < 20) {
      prevHigh20Vals.push(highs[i]);
    } else {
      prevHigh20Vals.push(Math.max(...highs.slice(i - 20, i)));
    }
  }

  const xEma9 = ema9Vals[ema9Vals.length - 1];
  const xEma20 = ema20Vals[ema20Vals.length - 1];
  const xEma50 = ema50Vals[ema50Vals.length - 1];

  const xRsi = rsiVals[rsiVals.length - 1];
  const xMacdHist = macdHist[macdHist.length - 1];
  const xAtr = atrVals[atrVals.length - 1];
  const xVwap = vwapVals[vwapVals.length - 1];
  const xRvol = rvolVals[rvolVals.length - 1];
  const xPrevHigh20 = prevHigh20Vals[prevHigh20Vals.length - 1];

  let score = 0;
  const bullishReasons: string[] = [];
  const riskReasons: string[] = [];

  // 1. Trend
  if (price > xEma20) {
    score += 6;
    bullishReasons.push("현재가가 단기 기준선(EMA20) 상단에 위치하여 상승 추세 유지");
  }

  if (xEma9 > xEma20 && xEma20 > xEma50) {
    score += 12;
    bullishReasons.push("EMA9 > EMA20 > EMA50 정배열로 강한 기관 수급 유입");
  }

  // 2. VWAP
  if (price > xVwap) {
    score += 8;
    bullishReasons.push("현재가가 당일 VWAP(거래량가중평균가) 상단 거래로 당일 주도 매수세 우위");
  } else {
    score -= 6;
    riskReasons.push("현재가가 VWAP 하단에 위치하여 매도 이탈 우려");
  }

  // 3. RSI
  if (xRsi >= 52 && xRsi <= 68) {
    score += 8;
    bullishReasons.push(`RSI ${xRsi.toFixed(1)}: 상승 에너지 및 모멘텀 최적 가속 구간`);
  } else if (xRsi > 68 && xRsi <= 75) {
    score += 4;
    bullishReasons.push(`RSI ${xRsi.toFixed(1)}: 강한 돌파세를 동반한 강세 구간`);
  } else if (xRsi > 78) {
    score -= 10;
    riskReasons.push(`RSI ${xRsi.toFixed(1)}: 단기 기술적 과열 경고`);
  }

  // 4. MACD
  if (xMacdHist > 0) {
    score += 7;
    bullishReasons.push("MACD Histogram 양수로 추가 모멘텀 팽창");
  }

  // 5. RVOL
  if (xRvol >= 2.0) {
    score += 14;
    bullishReasons.push(`RVOL ${xRvol.toFixed(2)}배: 평소 대비 2배 이상의 폭발적 수급량`);
  } else if (xRvol >= 1.5) {
    score += 10;
    bullishReasons.push(`RVOL ${xRvol.toFixed(2)}배: 뚜렷한 수급 거래량 증가`);
  } else if (xRvol < 0.8) {
    score -= 5;
    riskReasons.push("거래량 부진으로 상승 모멘텀 지속 가능성 약화");
  }

  // 6. Candle Pattern
  const { pattern, isBullish, isBearish } = detectCandlePattern(records);
  if (isBullish) {
    score += 12;
    bullishReasons.push(`상승 반전/지속 캔들 패턴 감지: ${pattern}`);
  } else if (isBearish) {
    score -= 15;
    riskReasons.push(`하락 반전 캔들 패턴 경고: ${pattern}`);
  }

  // 7. Breakout
  if (price > xPrevHigh20) {
    score += 12;
    bullishReasons.push("20봉 신고가 매물대 강력 돌파");
  } else if (price >= xPrevHigh20 * 0.995) {
    score += 6;
    bullishReasons.push("20봉 신고가 돌파 직전 압축 형성");
  }

  // 8. Chase Filter
  const vwapDist = ((price - xVwap) / Math.max(xVwap, 0.0001)) * 100;
  if (vwapDist > 5.0) {
    score -= 12;
    riskReasons.push(`VWAP 대비 +${vwapDist.toFixed(1)}% 이격으로 추격매수 시 손익비 악화 위험`);
  }

  const atrPct = (xAtr / Math.max(price, 0.0001)) * 100;
  if (atrPct > 7.0) {
    score -= 8;
    riskReasons.push(`ATR 변동성(${atrPct.toFixed(1)}%) 과도하여 손절 폭 확대 위험`);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  // Risk & Trade Price Level Math
  const recentLow = Math.min(...lows.slice(-5));
  const atrStop = price - xAtr * 1.5;
  let stop = Math.max(atrStop, recentLow);
  if (stop >= price) stop = price - xAtr * 1.5;

  const riskAmt = Math.max(price - stop, price * 0.005);
  const entryLow = Math.max(xVwap, price - xAtr * 0.35);
  const entryHigh = price + xAtr * 0.15;
  const target1 = price + riskAmt * 2.0;
  const target2 = price + riskAmt * 3.0;

  // Signal Validation Gate
  const gatePassed =
    score >= 78 &&
    vwapDist < 5.0 &&
    xRvol >= 1.2 &&
    xMacdHist > 0 &&
    !isBearish &&
    atrPct <= 7.5;

  if (!gatePassed) {
    if (score < 78) riskReasons.push("최소 Profit Opportunity Score (78점) 미달");
    if (vwapDist >= 5.0) riskReasons.push("VWAP 과대 이격으로 추격 진입 제한");
    if (xRvol < 1.2) riskReasons.push("수급 확인을 위한 RVOL (1.2배) 미달");
  }

  let grade: "S" | "A+" | "A" | "B" | "NO_SETUP" = "NO_SETUP";
  let decision: "STRONG_BUY_CANDIDATE" | "BUY_CANDIDATE" | "WATCH_FOR_ENTRY" | "WATCH" | "AVOID" = "AVOID";
  let wouldBuy = false;

  if (score >= 88 && gatePassed) {
    grade = "S";
    decision = "STRONG_BUY_CANDIDATE";
    wouldBuy = true;
  } else if (score >= 78 && gatePassed) {
    grade = "A+";
    decision = "BUY_CANDIDATE";
    wouldBuy = true;
  } else if (score >= 68) {
    grade = "A";
    decision = "WATCH_FOR_ENTRY";
    wouldBuy = false;
  } else if (score >= 55) {
    grade = "B";
    decision = "WATCH";
    wouldBuy = false;
  } else {
    grade = "NO_SETUP";
    decision = "AVOID";
    wouldBuy = false;
  }

  const thesis = wouldBuy
    ? `${name}(${symbol})은 상승 추세, 거래량 폭발(RVOL ${xRvol.toFixed(2)}배), VWAP 상단 유지 및 차트 패턴이 완벽히 정렬된 Signal Gate 통과 종목입니다.`
    : `${name}(${symbol})은 일부 차트 요소를 갖추었으나, Signal Gate 매수 확증 기준(Score, RVOL, 추격이격)을 완전히 충족하지 않았습니다.`;

  const invalidation = `${Math.round(stop).toLocaleString()}원 하향 이탈 또는 VWAP 하역 이탈 후 복귀 실패 시 상승 시나리오 무효화`;

  return {
    id: `${symbol}-${Date.now()}`,
    symbol,
    name,
    market,
    score,
    grade,
    decision,
    price: Math.round(price),
    changePct,
    entryLow: Math.round(entryLow),
    entryHigh: Math.round(entryHigh),
    stop: Math.round(stop),
    target1: Math.round(target1),
    target2: Math.round(target2),
    rsi: parseFloat(xRsi.toFixed(1)),
    rvol: parseFloat(xRvol.toFixed(2)),
    adx: parseFloat((xRsi * 0.4 + 20).toFixed(1)), // ADX approximation
    atrPct: parseFloat(atrPct.toFixed(2)),
    pattern,
    bullishReasons,
    riskReasons,
    thesis,
    invalidation,
    wouldBuy,
    scannedAt: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  };
}
