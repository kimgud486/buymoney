// ----------------------------------------------------------------------
// BUYMONEY UNIFIED PATTERN SIGNAL ENGINE V20.8
// One deterministic OHLCV engine for KOREA / US / UPBIT.
// Read-only analytics: never submits or simulates orders.
// ----------------------------------------------------------------------

import { Candle } from "../../src/services/StructureBrain";
import { sessionVwapV20 } from "./SessionAwareMarketMathV20";

export type UnifiedMarketV20 = "KOREA" | "US" | "UPBIT";
export type UnifiedSignalV20 = "BUY" | "BUY_WATCH" | "HOLD" | "TAKE_PROFIT" | "SELL" | "AVOID";

export interface UnifiedPatternSignalInputV20 {
  symbol: string;
  name: string;
  market: UnifiedMarketV20;
  candles: Candle[];
  lastPrice?: number;
  bidPrice?: number;
  askPrice?: number;
  dataGrade?: string;
}

export interface UnifiedPatternSignalResultV20 {
  symbol: string;
  name: string;
  market: UnifiedMarketV20;
  signal: UnifiedSignalV20;
  score: number;
  grade: "S" | "A" | "B" | "C" | "NO_SETUP";
  pattern: string;
  price: number;
  entryLow: number | null;
  entryHigh: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  indicators: {
    ema9: number;
    ema20: number;
    ema50: number;
    rsi14: number;
    macdHistogram: number;
    atr14: number;
    atrPct: number;
    vwap: number;
    vwapDistancePct: number;
    rvol20: number;
  } | null;
  reasons: string[];
  risks: string[];
  candleCount: number;
  dataStatus: "READY" | "WARMING_UP" | "INVALID";
  updatedAt: number;
}

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const safe = (v: number, fallback = 0) => finite(v) ? v : fallback;

function ema(values: number[], period: number): number[] {
  if (!values.length) return [];
  const alpha = 2 / (period + 1);
  const out = [values[0]];
  for (let i = 1; i < values.length; i++) out.push(alpha * values[i] + (1 - alpha) * out[i - 1]);
  return out;
}

function rsi(values: number[], period = 14): number[] {
  if (values.length < 2) return values.map(() => 50);
  const out = new Array(values.length).fill(50);
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    const gain = Math.max(diff, 0);
    const loss = Math.max(-diff, 0);
    if (i <= period) {
      avgGain += gain;
      avgLoss += loss;
      if (i === period) {
        avgGain /= period;
        avgLoss /= period;
      }
    } else {
      avgGain = ((avgGain * (period - 1)) + gain) / period;
      avgLoss = ((avgLoss * (period - 1)) + loss) / period;
    }
    if (i >= period) out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

function trueRanges(candles: Candle[]): number[] {
  return candles.map((c, i) => {
    if (i === 0) return Math.max(0, c.high - c.low);
    const prev = candles[i - 1].close;
    return Math.max(c.high - c.low, Math.abs(c.high - prev), Math.abs(c.low - prev));
  });
}

function detectPattern(candles: Candle[]): { name: string; bias: number } {
  if (candles.length < 2) return { name: "NO_PATTERN", bias: 0 };
  const c = candles[candles.length - 1];
  const p = candles[candles.length - 2];
  const body = Math.abs(c.close - c.open);
  const range = Math.max(c.high - c.low, Number.EPSILON);
  const upper = c.high - Math.max(c.open, c.close);
  const lower = Math.min(c.open, c.close) - c.low;
  const bullish = c.close > c.open;
  const bearish = c.close < c.open;

  if (bullish && p.close < p.open && c.open <= p.close && c.close >= p.open) return { name: "BULLISH_ENGULFING", bias: 12 };
  if (bearish && p.close > p.open && c.open >= p.close && c.close <= p.open) return { name: "BEARISH_ENGULFING", bias: -15 };
  if (lower >= Math.max(body * 2, range * 0.45) && upper <= Math.max(body, range * 0.2)) return { name: "HAMMER", bias: bullish ? 10 : 5 };
  if (upper >= Math.max(body * 2, range * 0.45) && lower <= Math.max(body, range * 0.2)) return { name: "SHOOTING_STAR", bias: -12 };

  if (candles.length >= 3) {
    const p2 = candles[candles.length - 3];
    if (bullish && p.close > p.open && p2.close > p2.open && c.close > p.close && p.close > p2.close) return { name: "THREE_WHITE_SOLDIERS", bias: 12 };
    if (bearish && p.close < p.open && p2.close < p2.open && c.close < p.close && p.close < p2.close) return { name: "THREE_BLACK_CROWS", bias: -15 };
  }

  const prior20 = candles.slice(-21, -1);
  if (prior20.length >= 10) {
    const high20 = Math.max(...prior20.map(x => x.high));
    const low20 = Math.min(...prior20.map(x => x.low));
    if (c.close > high20 && c.volume > 0) return { name: "BREAKOUT_20", bias: 12 };
    if (c.close < low20 && c.volume > 0) return { name: "BREAKDOWN_20", bias: -15 };
  }

  if (bullish && body / range >= 0.7) return { name: "STRONG_BULL", bias: 7 };
  if (bearish && body / range >= 0.7) return { name: "STRONG_BEAR", bias: -9 };
  return { name: "NO_PATTERN", bias: 0 };
}

export class UnifiedPatternSignalEngineV20 {
  static analyze(input: UnifiedPatternSignalInputV20): UnifiedPatternSignalResultV20 {
    const candles = Array.isArray(input.candles)
      ? input.candles.filter(c => finite(c.open) && finite(c.high) && finite(c.low) && finite(c.close) && finite(c.volume) && c.open > 0 && c.high > 0 && c.low > 0 && c.close > 0)
      : [];
    const base = {
      symbol: String(input.symbol || "").toUpperCase(),
      name: input.name || input.symbol,
      market: input.market,
      updatedAt: Date.now(),
    };

    if (!base.symbol || candles.length === 0) {
      return { ...base, signal: "AVOID", score: 0, grade: "NO_SETUP", pattern: "NO_PATTERN", price: safe(input.lastPrice || 0), entryLow: null, entryHigh: null, stop: null, target1: null, target2: null, indicators: null, reasons: [], risks: ["유효한 OHLCV 캔들이 없습니다."], candleCount: candles.length, dataStatus: "INVALID" };
    }

    const price = safe(input.lastPrice || candles[candles.length - 1].close, candles[candles.length - 1].close);
    if (candles.length < 55) {
      return { ...base, signal: "BUY_WATCH", score: 0, grade: "NO_SETUP", pattern: "WARMING_UP", price, entryLow: null, entryHigh: null, stop: null, target1: null, target2: null, indicators: null, reasons: [`공통 패턴 엔진 워밍업 중: ${candles.length}/55 candles`], risks: ["55개 미만의 캔들로는 BUY/HOLD/SELL 확정 금지"], candleCount: candles.length, dataStatus: "WARMING_UP" };
    }

    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const closes = candles.map(c => c.close);
    const volumes = candles.map(c => Math.max(0, c.volume));
    const ema9s = ema(closes, 9);
    const ema20s = ema(closes, 20);
    const ema50s = ema(closes, 50);
    const rsi14s = rsi(closes, 14);
    const fast = ema(closes, 12);
    const slow = ema(closes, 26);
    const macd = fast.map((v, i) => v - slow[i]);
    const macdSignal = ema(macd, 9);
    const macdHist = macd.map((v, i) => v - macdSignal[i]);
    const atrs = ema(trueRanges(candles), 14);

    const last = candles.length - 1;
    const volumeBase = volumes.slice(-21, -1);
    const avgVol20 = volumeBase.length ? volumeBase.reduce((a, b) => a + b, 0) / volumeBase.length : 0;
    const rvol20 = avgVol20 > 0 ? volumes[last] / avgVol20 : 0;
    const ema9v = ema9s[last];
    const ema20v = ema20s[last];
    const ema50v = ema50s[last];
    const rsi14v = rsi14s[last];
    const macdHistogram = macdHist[last];
    const atr14 = atrs[last];
    // Intraday VWAP must reset at the active market session boundary.
    // Falling back to the latest close is safer than mixing previous sessions.
    const vwap = sessionVwapV20(candles, input.market) ?? closes[last];
    const atrPct = price > 0 ? atr14 / price * 100 : 0;
    const vwapDistancePct = vwap > 0 ? (price - vwap) / vwap * 100 : 0;
    const pattern = detectPattern(candles);
    const reasons: string[] = [];
    const risks: string[] = [];
    let score = 35;

    if (price > ema20v) { score += 8; reasons.push("가격이 EMA20 위"); } else { score -= 8; risks.push("가격이 EMA20 아래"); }
    if (ema9v > ema20v && ema20v > ema50v) { score += 16; reasons.push("EMA9 > EMA20 > EMA50 정배열"); }
    if (ema9v < ema20v && ema20v < ema50v) { score -= 18; risks.push("EMA9 < EMA20 < EMA50 역배열"); }
    if (price > vwap) { score += 8; reasons.push("가격이 VWAP 위"); } else { score -= 7; risks.push("가격이 VWAP 아래"); }
    if (rsi14v >= 52 && rsi14v <= 68) { score += 8; reasons.push(`RSI ${rsi14v.toFixed(1)} 상승 모멘텀`); }
    else if (rsi14v > 78) { score -= 12; risks.push(`RSI ${rsi14v.toFixed(1)} 과열`); }
    else if (rsi14v < 38) { score -= 7; risks.push(`RSI ${rsi14v.toFixed(1)} 약세`); }
    if (macdHistogram > 0) { score += 8; reasons.push("MACD histogram 양수"); } else { score -= 6; risks.push("MACD histogram 음수"); }
    if (rvol20 >= 2) { score += 14; reasons.push(`RVOL ${rvol20.toFixed(2)}x 거래량 확장`); }
    else if (rvol20 >= 1.2) { score += 7; reasons.push(`RVOL ${rvol20.toFixed(2)}x 거래량 확인`); }
    else if (rvol20 > 0 && rvol20 < 0.7) { score -= 7; risks.push(`RVOL ${rvol20.toFixed(2)}x 거래량 부족`); }
    score += pattern.bias;
    if (pattern.bias > 0) reasons.push(`상승 패턴 ${pattern.name}`);
    if (pattern.bias < 0) risks.push(`하락 패턴 ${pattern.name}`);
    if (vwapDistancePct > 5) { score -= 12; risks.push(`VWAP +${vwapDistancePct.toFixed(1)}% 과대이격`); }
    if (atrPct > 8) { score -= 8; risks.push(`ATR ${atrPct.toFixed(1)}% 고변동성`); }

    score = Math.max(0, Math.min(100, Math.round(score)));
    const bearishPattern = pattern.bias < 0;
    const trendBroken = price < ema20v && ema9v < ema20v;
    const strongDown = price < ema50v && macdHistogram < 0 && rsi14v < 45;
    const overheated = rsi14v > 78 || vwapDistancePct > 7;

    let signal: UnifiedSignalV20;
    if (bearishPattern && (trendBroken || strongDown)) signal = "SELL";
    else if (strongDown) signal = "SELL";
    else if (overheated && score >= 65) signal = "TAKE_PROFIT";
    else if (score >= 82 && rvol20 >= 1.2 && macdHistogram > 0 && price > ema20v && !bearishPattern) signal = "BUY";
    else if (score >= 68 && price > ema20v && !bearishPattern) signal = "BUY_WATCH";
    else if (score >= 50 && !trendBroken) signal = "HOLD";
    else signal = "AVOID";

    const grade: UnifiedPatternSignalResultV20["grade"] = score >= 88 ? "S" : score >= 76 ? "A" : score >= 62 ? "B" : score >= 50 ? "C" : "NO_SETUP";
    const recentLow = Math.min(...lows.slice(-5));
    let stop = Math.max(price - atr14 * 1.5, recentLow);
    if (!(stop > 0 && stop < price)) stop = price - atr14 * 1.5;
    const risk = Math.max(price - stop, price * 0.005);
    const entryLow = Math.max(vwap, price - atr14 * 0.35);
    const entryHigh = price + atr14 * 0.15;

    return {
      ...base,
      signal,
      score,
      grade,
      pattern: pattern.name,
      price,
      entryLow: finite(entryLow) ? entryLow : null,
      entryHigh: finite(entryHigh) ? entryHigh : null,
      stop: finite(stop) ? stop : null,
      target1: finite(price + risk * 2) ? price + risk * 2 : null,
      target2: finite(price + risk * 3) ? price + risk * 3 : null,
      indicators: { ema9: ema9v, ema20: ema20v, ema50: ema50v, rsi14: rsi14v, macdHistogram, atr14, atrPct, vwap, vwapDistancePct, rvol20 },
      reasons,
      risks,
      candleCount: candles.length,
      dataStatus: "READY",
    };
  }
}
