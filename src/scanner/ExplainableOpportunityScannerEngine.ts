/**
 * AI Explainable Profit Opportunity Scanner Engine
 *
 * Core responsibilities:
 * - Technical indicator scoring (EMA / VWAP / RSI / MACD / ATR / RVOL)
 * - Candlestick pattern detection
 * - Graph-shape scanner blending
 * - Entry / stop / target calculation
 * - Strict YES-only final gate
 * - Candle integrity checks that fail closed on synthetic-looking data
 */

import { defaultGraphShapeScanner, ShapeResult, CandleData } from "./GraphShapeScanner";

export interface CandleRecord {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp?: number;
}

export type CandleDataQuality = "VALID" | "SYNTHETIC_SUSPECT" | "INVALID";

export interface ExplainableTradeIdea {
  id: string;
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  score: number;
  graphScore?: number;
  flowScore?: number;
  riskScore?: number;
  finalScore?: number;
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
  rrRatio?: number;
  pattern: string;
  bullishReasons: string[];
  riskReasons: string[];
  thesis: string;
  invalidation: string;
  wouldBuy: boolean;
  aiSummary?: string;
  scannedAt: string;
  graphShapeResult?: ShapeResult;
  dataQuality?: CandleDataQuality;
  dataQualityReasons?: string[];
}

export interface CandleDataQualityResult {
  status: CandleDataQuality;
  reasons: string[];
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
  for (let i = 1; i < close.length; i++) diffs.push(close[i] - close[i - 1]);

  const gains = diffs.map((d) => Math.max(d, 0));
  const losses = diffs.map((d) => Math.max(-d, 0));
  const alpha = 1 / period;

  let avgGain = gains[0] || 0;
  let avgLoss = losses[0] || 0;
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

export function detectCandlePattern(
  records: CandleRecord[]
): { pattern: string; isBullish: boolean; isBearish: boolean } {
  if (records.length < 2) {
    return { pattern: "NONE", isBullish: false, isBearish: false };
  }

  const curr = records[records.length - 1];
  const prev = records[records.length - 2];
  const body = Math.abs(curr.close - curr.open);
  const range = Math.max(curr.high - curr.low, 0.000001);
  const upperWick = curr.high - Math.max(curr.open, curr.close);
  const lowerWick = Math.min(curr.open, curr.close) - curr.low;
  const bullish = curr.close > curr.open;
  const bearish = curr.close < curr.open;

  if (bullish && prev.close < prev.open && curr.open <= prev.close && curr.close >= prev.open) {
    return { pattern: "BULLISH_ENGULFING (상승장악형)", isBullish: true, isBearish: false };
  }

  if (lowerWick >= body * 2 && upperWick <= Math.max(body, 0.000001)) {
    return { pattern: "HAMMER (망치형)", isBullish: bullish, isBearish: false };
  }

  if (records.length >= 3) {
    const p2 = records[records.length - 3];
    if (
      bullish &&
      prev.close > prev.open &&
      p2.close > p2.open &&
      curr.close > prev.close &&
      prev.close > p2.close
    ) {
      return { pattern: "THREE_WHITE_SOLDIERS (적삼병)", isBullish: true, isBearish: false };
    }
  }

  if (bullish && body / range >= 0.7) {
    return { pattern: "STRONG_BULL (장대양봉)", isBullish: true, isBearish: false };
  }
  if (bearish && body / range >= 0.7) {
    return { pattern: "STRONG_BEAR (장대음봉)", isBullish: false, isBearish: true };
  }
  if (bullish) return { pattern: "BULLISH (양봉)", isBullish: true, isBearish: false };
  if (bearish) return { pattern: "BEARISH (음봉)", isBullish: false, isBearish: true };

  return { pattern: "DOJI (십자형)", isBullish: false, isBearish: false };
}

/**
 * Detects malformed or obviously synthetic candle streams.
 *
 * The old server-side scanner generated timestamps with Date.now() and then
 * subtracted exact 60-second intervals. That leaves every candle with the same
 * non-zero second/millisecond offset. Real exchange minute bars normally align
 * to a time boundary. We explicitly detect that fingerprint so random fixtures
 * can never become a YES candidate.
 */
export function assessCandleDataQuality(records: CandleRecord[]): CandleDataQualityResult {
  const reasons: string[] = [];

  if (records.length < 20) {
    return { status: "INVALID", reasons: ["최소 20개 캔들 미만"] };
  }

  for (let i = 0; i < records.length; i++) {
    const c = records[i];
    const values = [c.open, c.high, c.low, c.close, c.volume];
    if (values.some((v) => !Number.isFinite(v))) {
      reasons.push(`${i + 1}번째 캔들에 NaN/Infinity 값 존재`);
      continue;
    }
    if (c.open <= 0 || c.high <= 0 || c.low <= 0 || c.close <= 0 || c.volume < 0) {
      reasons.push(`${i + 1}번째 캔들의 가격/거래량 값이 유효하지 않음`);
    }
    if (c.high < Math.max(c.open, c.close) || c.low > Math.min(c.open, c.close) || c.high < c.low) {
      reasons.push(`${i + 1}번째 캔들의 OHLC 관계가 비정상`);
    }
  }

  if (reasons.length > 0) return { status: "INVALID", reasons };

  const timestamps = records
    .map((r) => r.timestamp)
    .filter((t): t is number => typeof t === "number" && Number.isFinite(t));

  if (timestamps.length >= 20) {
    for (let i = 1; i < timestamps.length; i++) {
      if (timestamps[i] <= timestamps[i - 1]) {
        return { status: "INVALID", reasons: ["캔들 timestamp가 시간순으로 증가하지 않음"] };
      }
    }

    const minuteOffsets = timestamps.map((t) => ((t % 60000) + 60000) % 60000);
    const minOffset = Math.min(...minuteOffsets);
    const maxOffset = Math.max(...minuteOffsets);
    const identicalMinuteOffset = maxOffset - minOffset <= 2;
    const offset = minuteOffsets[0];

    if (identicalMinuteOffset && offset > 1000 && offset < 59000) {
      return {
        status: "SYNTHETIC_SUSPECT",
        reasons: [
          `모든 캔들이 동일한 비정상 분/초 오프셋(${Math.round(offset)}ms)을 가짐`,
          "Date.now() 기반 인공 1분봉 생성 패턴과 일치하여 YES 신호 차단"
        ]
      };
    }
  }

  return { status: "VALID", reasons: [] };
}

function calcRiskReward(entry: number, stop: number, target: number): number {
  const risk = entry - stop;
  const reward = target - entry;
  if (!Number.isFinite(risk) || !Number.isFinite(reward) || risk <= 0 || reward <= 0) return 0;
  return reward / risk;
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

  const dataQuality = assessCandleDataQuality(records);
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

  const fastEma = computeEma(closes, 12);
  const slowEma = computeEma(closes, 26);
  const macdLine = fastEma.map((f, i) => f - slowEma[i]);
  const macdSignal = computeEma(macdLine, 9);
  const macdHist = macdLine.map((m, i) => m - macdSignal[i]);

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

  let cumVal = 0;
  let cumVol = 0;
  const vwapVals: number[] = [];
  for (let i = 0; i < records.length; i++) {
    const typical = (highs[i] + lows[i] + closes[i]) / 3;
    cumVal += typical * volumes[i];
    cumVol += volumes[i];
    vwapVals.push(cumVal / Math.max(cumVol, 0.000001));
  }

  const rvolVals: number[] = [];
  for (let i = 0; i < records.length; i++) {
    if (i < 19) {
      rvolVals.push(1);
    } else {
      const volSlice = volumes.slice(i - 19, i + 1);
      const volMa = volSlice.reduce((a, b) => a + b, 0) / 20;
      rvolVals.push(volumes[i] / Math.max(volMa, 0.000001));
    }
  }

  const prevHigh20Vals: number[] = [];
  for (let i = 0; i < records.length; i++) {
    if (i < 20) prevHigh20Vals.push(highs[i]);
    else prevHigh20Vals.push(Math.max(...highs.slice(i - 20, i)));
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

  if (price > xEma20) {
    score += 6;
    bullishReasons.push("현재가가 EMA20 상단에 위치하여 단기 상승 추세 유지");
  }
  if (xEma9 > xEma20 && xEma20 > xEma50) {
    score += 12;
    bullishReasons.push("EMA9 > EMA20 > EMA50 정배열");
  }

  if (price > xVwap) {
    score += 8;
    bullishReasons.push("현재가가 VWAP 상단으로 매수 우위");
  } else {
    score -= 6;
    riskReasons.push("현재가가 VWAP 하단에 위치하여 매도 이탈 우려");
  }

  if (xRsi >= 52 && xRsi <= 68) {
    score += 8;
    bullishReasons.push(`RSI ${xRsi.toFixed(1)}: 모멘텀 최적 구간`);
  } else if (xRsi > 68 && xRsi <= 75) {
    score += 4;
    bullishReasons.push(`RSI ${xRsi.toFixed(1)}: 강세 구간`);
  } else if (xRsi > 78) {
    score -= 10;
    riskReasons.push(`RSI ${xRsi.toFixed(1)}: 단기 과열 경고`);
  }

  if (xMacdHist > 0) {
    score += 7;
    bullishReasons.push("MACD Histogram 양수로 상승 모멘텀 확인");
  }

  if (xRvol >= 2) {
    score += 14;
    bullishReasons.push(`RVOL ${xRvol.toFixed(2)}배: 강한 거래량 수급`);
  } else if (xRvol >= 1.5) {
    score += 10;
    bullishReasons.push(`RVOL ${xRvol.toFixed(2)}배: 거래량 증가`);
  } else if (xRvol < 0.8) {
    score -= 5;
    riskReasons.push("거래량 부진으로 상승 지속 가능성 약화");
  }

  const { pattern, isBullish, isBearish } = detectCandlePattern(records);
  if (isBullish) {
    score += 12;
    bullishReasons.push(`상승 캔들 패턴 감지: ${pattern}`);
  } else if (isBearish) {
    score -= 15;
    riskReasons.push(`하락 캔들 패턴 경고: ${pattern}`);
  }

  if (price > xPrevHigh20) {
    score += 12;
    bullishReasons.push("20봉 신고가 돌파");
  } else if (price >= xPrevHigh20 * 0.995) {
    score += 6;
    bullishReasons.push("20봉 신고가 돌파 직전 압축");
  }

  const vwapDist = ((price - xVwap) / Math.max(xVwap, 0.0001)) * 100;
  if (vwapDist > 5) {
    score -= 12;
    riskReasons.push(`VWAP 대비 +${vwapDist.toFixed(1)}% 이격으로 추격매수 위험`);
  }

  const atrPct = (xAtr / Math.max(price, 0.0001)) * 100;
  if (atrPct > 7) {
    score -= 8;
    riskReasons.push(`ATR 변동성(${atrPct.toFixed(1)}%) 과도`);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const recentLow = Math.min(...lows.slice(-5));
  const atrStop = price - xAtr * 1.5;
  let stop = Math.max(atrStop, recentLow);
  if (stop >= price) stop = price - xAtr * 1.5;

  const riskAmt = Math.max(price - stop, price * 0.005);
  const entryLow = Math.max(xVwap, price - xAtr * 0.35);
  const entryHigh = price + xAtr * 0.15;
  const target1 = price + riskAmt * 2;
  const target2 = price + riskAmt * 3;
  const rrRatio = calcRiskReward(entryHigh, stop, target1);

  const candleDataList: CandleData[] = records.map((r) => ({
    open: r.open,
    high: r.high,
    low: r.low,
    close: r.close,
    volume: r.volume,
    timestamp: r.timestamp
  }));
  const shapeResult = defaultGraphShapeScanner.scan(candleDataList, symbol);

  for (const reason of shapeResult.reasons) {
    const text = `Graph Pattern: ${reason}`;
    if (!bullishReasons.includes(text)) bullishReasons.push(text);
  }
  for (const blocker of shapeResult.blockers) {
    const text = `Graph Blocker: ${blocker}`;
    if (!riskReasons.includes(text)) riskReasons.push(text);
  }

  if (dataQuality.status !== "VALID") {
    for (const reason of dataQuality.reasons) {
      riskReasons.push(`Data Quality: ${reason}`);
    }
  }

  const blendedScore = Math.round(score * 0.65 + shapeResult.graphScore * 0.35);

  const gatePassed =
    dataQuality.status === "VALID" &&
    blendedScore >= 78 &&
    shapeResult.verdict === "YES" &&
    shapeResult.blockers.length === 0 &&
    vwapDist < 5 &&
    xRvol >= 1.2 &&
    xMacdHist > 0 &&
    !isBearish &&
    atrPct <= 7 &&
    xRsi >= 35 &&
    xRsi <= 72 &&
    rrRatio >= 1.8;

  if (!gatePassed) {
    if (dataQuality.status !== "VALID") riskReasons.push("실데이터 무결성 검증 실패로 YES 차단");
    if (blendedScore < 78) riskReasons.push("최소 Profit Opportunity Score (78점) 미달");
    if (shapeResult.verdict !== "YES") riskReasons.push("Graph Shape Scanner YES 조건 미충족");
    if (shapeResult.blockers.length > 0) riskReasons.push(`Graph Blocker 감지 (${shapeResult.blockers.join(", ")})`);
    if (vwapDist >= 5) riskReasons.push("VWAP 과대 이격으로 추격 진입 제한");
    if (xRvol < 1.2) riskReasons.push("RVOL 1.2배 미달");
    if (xMacdHist <= 0) riskReasons.push("MACD 상승 모멘텀 미확인");
    if (isBearish) riskReasons.push("최종 캔들 하락 패턴으로 진입 차단");
    if (atrPct > 7) riskReasons.push("ATR 변동성 7% 초과");
    if (xRsi < 35 || xRsi > 72) riskReasons.push(`RSI 안전 진입 범위 이탈 (${xRsi.toFixed(1)})`);
    if (rrRatio < 1.8) riskReasons.push(`손익비 미달 (${rrRatio.toFixed(2)}:1 < 1.80:1)`);
  }

  let grade: ExplainableTradeIdea["grade"] = "NO_SETUP";
  let decision: ExplainableTradeIdea["decision"] = "AVOID";
  let wouldBuy = false;

  if (blendedScore >= 88 && gatePassed) {
    grade = "S";
    decision = "STRONG_BUY_CANDIDATE";
    wouldBuy = true;
  } else if (blendedScore >= 78 && gatePassed) {
    grade = "A+";
    decision = "BUY_CANDIDATE";
    wouldBuy = true;
  } else if (blendedScore >= 68) {
    grade = "A";
    decision = "WATCH_FOR_ENTRY";
  } else if (blendedScore >= 55) {
    grade = "B";
    decision = "WATCH";
  }

  const thesis = wouldBuy
    ? `${name}(${symbol})은 추세·거래량·VWAP·캔들·Graph Shape·손익비·데이터 무결성이 모두 정렬된 YES 검토 종목입니다.`
    : `${name}(${symbol})은 일부 강세 요소가 있으나 최종 YES 게이트를 전부 통과하지 못했습니다.`;

  const invalidation = `${Math.round(stop).toLocaleString()}원 하향 이탈 또는 VWAP 이탈 후 복귀 실패 시 상승 시나리오 무효화`;
  const detectedPatternStr = shapeResult.patterns.length > 0
    ? `${pattern} | ${shapeResult.patterns.join(", ")}`
    : pattern;

  return {
    id: `${symbol}-${Date.now()}`,
    symbol,
    name,
    market,
    score: blendedScore,
    graphScore: shapeResult.graphScore,
    flowScore: shapeResult.flowScore,
    riskScore: shapeResult.riskScore,
    finalScore: shapeResult.finalScore,
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
    adx: parseFloat((xRsi * 0.4 + 20).toFixed(1)),
    atrPct: parseFloat(atrPct.toFixed(2)),
    rrRatio: parseFloat(rrRatio.toFixed(2)),
    pattern: detectedPatternStr,
    bullishReasons,
    riskReasons: Array.from(new Set(riskReasons)),
    thesis,
    invalidation,
    wouldBuy,
    scannedAt: new Date().toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }),
    graphShapeResult: shapeResult,
    dataQuality: dataQuality.status,
    dataQualityReasons: dataQuality.reasons
  };
}

/**
 * Strict final selector for the UI's YES ONLY mode.
 *
 * A high score by itself is not enough. Every candidate must also pass graph,
 * liquidity, momentum, volatility, risk/reward and data-integrity gates.
 * Fewer than topN results are returned when fewer candidates qualify.
 */
export function filterYesOnlyCandidates(
  ideas: ExplainableTradeIdea[],
  topN: number = 5,
  minScore: number = 82
): ExplainableTradeIdea[] {
  const approved = ideas.filter((item) => {
    const shape = item.graphShapeResult;
    const rr = item.rrRatio ?? calcRiskReward(item.entryHigh, item.stop, item.target1);
    const isBuyGrade = item.grade === "S" || item.grade === "A+";
    const isBuyDecision =
      item.decision === "STRONG_BUY_CANDIDATE" || item.decision === "BUY_CANDIDATE";

    return (
      item.wouldBuy === true &&
      item.score >= minScore &&
      isBuyGrade &&
      isBuyDecision &&
      item.dataQuality === "VALID" &&
      shape?.verdict === "YES" &&
      (shape?.blockers?.length ?? 0) === 0 &&
      item.rvol >= 1.2 &&
      item.rsi >= 35 &&
      item.rsi <= 72 &&
      item.atrPct <= 7 &&
      rr >= 1.8 &&
      item.stop < item.entryLow &&
      item.entryLow <= item.entryHigh &&
      item.target1 > item.entryHigh
    );
  });

  approved.sort((a, b) => {
    const scoreDiff = b.score - a.score;
    if (scoreDiff !== 0) return scoreDiff;
    const rrDiff = (b.rrRatio ?? 0) - (a.rrRatio ?? 0);
    if (rrDiff !== 0) return rrDiff;
    return b.rvol - a.rvol;
  });

  return approved.slice(0, Math.max(0, topN));
}
