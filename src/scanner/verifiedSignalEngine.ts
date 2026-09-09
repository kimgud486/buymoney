import {
  VERIFIED_PATTERN_REGISTRY,
  detectVerifiedPatterns,
  summarizePatternHits,
  type VerifiedPatternHit,
} from "./verifiedPatternEngine";
import {
  VERIFIED_STRUCTURE_PATTERN_REGISTRY,
  detectVerifiedStructurePatterns,
} from "./verifiedStructurePatternEngine";
import {
  MASTER_EXECUTABLE_PATTERN_RULES,
  detectMasterExecutablePatterns,
} from "./masterPatternDetectionEngine";

export type ScannerDecision = "BUY_APPROVED" | "BUY_WATCH" | "NO_BUY";

export interface ScannerCandle {
  time?: string | number;
  timestamp?: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface VerifiedSignalResult {
  decision: ScannerDecision;
  score: number;
  direction: "BULLISH" | "NEUTRAL" | "BEARISH";
  pattern: string;
  patternHits: VerifiedPatternHit[];
  patternRegistry: {
    registered: number;
    evaluated: number;
    matched: number;
    bullishMatched: number;
    bearishMatched: number;
    candleRegistered: number;
    structureRegistered: number;
    masterExecutableRegistered: number;
    candleMatched: number;
    structureMatched: number;
    masterExecutableMatched: number;
  };
  reasons: string[];
  failedChecks: string[];
  metrics: {
    close: number;
    ema9: number;
    ema20: number;
    ema50: number;
    vwap: number;
    rsi: number;
    macd: number;
    macdSignal: number;
    macdHist: number;
    rvol: number;
    atr: number;
    hhhl: boolean;
  };
  entryLow: number;
  entryHigh: number;
  stopLoss: number;
  target1: number;
  target2: number;
  riskReward: number;
  evaluatedBars: number;
}

const EPS = 1e-9;

function finite(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function ema(values: number[], period: number): number[] {
  if (!values.length) return [];
  const alpha = 2 / (period + 1);
  const out = [values[0]];
  for (let i = 1; i < values.length; i += 1) {
    out.push(alpha * values[i] + (1 - alpha) * out[i - 1]);
  }
  return out;
}

function rsi(values: number[], period = 14): number {
  if (values.length < period + 1) return 50;
  let gain = 0;
  let loss = 0;
  for (let i = values.length - period; i < values.length; i += 1) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  const avgGain = gain / period;
  const avgLoss = loss / period;
  if (avgLoss <= EPS) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function atr(candles: ScannerCandle[], period = 14): number {
  if (candles.length < 2) return 0;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i += 1) {
    const c = candles[i];
    const prevClose = candles[i - 1].close;
    trs.push(Math.max(
      c.high - c.low,
      Math.abs(c.high - prevClose),
      Math.abs(c.low - prevClose),
    ));
  }
  const tail = trs.slice(-period);
  return tail.reduce((a, b) => a + b, 0) / Math.max(1, tail.length);
}

function rollingVwap(candles: ScannerCandle[]): number {
  let pv = 0;
  let vol = 0;
  for (const c of candles) {
    const typical = (c.high + c.low + c.close) / 3;
    const v = Math.max(0, c.volume);
    pv += typical * v;
    vol += v;
  }
  return vol > 0 ? pv / vol : candles[candles.length - 1]?.close ?? 0;
}

function relativeVolume(candles: ScannerCandle[], lookback = 20): number {
  if (candles.length < lookback + 1) return 0;
  const current = candles[candles.length - 1].volume;
  const history = candles.slice(-(lookback + 1), -1).map((c) => c.volume);
  const avg = history.reduce((a, b) => a + b, 0) / Math.max(1, history.length);
  return avg > 0 ? current / avg : 0;
}

function detectHHHL(candles: ScannerCandle[]): boolean {
  if (candles.length < 8) return false;
  const a = candles.slice(-8, -4);
  const b = candles.slice(-4);
  const aHigh = Math.max(...a.map((c) => c.high));
  const bHigh = Math.max(...b.map((c) => c.high));
  const aLow = Math.min(...a.map((c) => c.low));
  const bLow = Math.min(...b.map((c) => c.low));
  return bHigh > aHigh && bLow > aLow;
}

function mergePatternHits(...groups: VerifiedPatternHit[][]): VerifiedPatternHit[] {
  const merged = new Map<string, VerifiedPatternHit>();
  for (const group of groups) {
    for (const hit of group) {
      const existing = merged.get(hit.id);
      if (!existing) {
        merged.set(hit.id, hit);
        continue;
      }
      const existingRank = (existing.confidence === "STRONG" ? 100 : 0) + existing.weight;
      const nextRank = (hit.confidence === "STRONG" ? 100 : 0) + hit.weight;
      if (nextRank > existingRank) merged.set(hit.id, hit);
    }
  }
  return Array.from(merged.values()).sort((a, b) => {
    const strongDiff = Number(b.confidence === "STRONG") - Number(a.confidence === "STRONG");
    if (strongDiff !== 0) return strongDiff;
    return b.weight - a.weight;
  });
}

function executableRegistryStats(candlesLength: number): { registered: number; evaluated: number } {
  const defs = new Map<string, number>();
  for (const item of VERIFIED_PATTERN_REGISTRY) defs.set(item.id, item.minBars);
  for (const item of VERIFIED_STRUCTURE_PATTERN_REGISTRY) {
    const existing = defs.get(item.id);
    defs.set(item.id, existing == null ? item.minBars : Math.min(existing, item.minBars));
  }
  for (const item of MASTER_EXECUTABLE_PATTERN_RULES) {
    const existing = defs.get(item.id);
    defs.set(item.id, existing == null ? item.minBars : Math.min(existing, item.minBars));
  }
  const values = Array.from(defs.values());
  return {
    registered: values.length,
    evaluated: values.filter((minBars) => candlesLength >= minBars).length,
  };
}

export function evaluateVerifiedSignal(inputCandles: unknown[]): VerifiedSignalResult | null {
  const normalized = inputCandles
    .map((raw: any) => ({
      time: raw?.time ?? raw?.timestamp,
      timestamp: raw?.timestamp ?? raw?.time,
      open: finite(raw?.open),
      high: finite(raw?.high),
      low: finite(raw?.low),
      close: finite(raw?.close),
      volume: finite(raw?.volume),
    }))
    .filter((c) => c.open > 0 && c.high > 0 && c.low > 0 && c.close > 0 && c.high >= c.low);

  // Fail closed on insufficient history. The newest bar is intentionally excluded
  // so an in-progress candle never becomes a BUY confirmation source.
  if (normalized.length < 56) return null;
  const candles = normalized.slice(0, -1);
  if (candles.length < 55) return null;

  const closes = candles.map((c) => c.close);
  const ema9Series = ema(closes, 9);
  const ema20Series = ema(closes, 20);
  const ema50Series = ema(closes, 50);
  const fast = ema(closes, 12);
  const slow = ema(closes, 26);
  const macdSeries = fast.map((v, i) => v - slow[i]);
  const macdSignalSeries = ema(macdSeries, 9);

  const last = candles[candles.length - 1];
  const ema9 = ema9Series[ema9Series.length - 1];
  const ema20 = ema20Series[ema20Series.length - 1];
  const ema50 = ema50Series[ema50Series.length - 1];
  const macd = macdSeries[macdSeries.length - 1];
  const macdSignal = macdSignalSeries[macdSignalSeries.length - 1];
  const macdHist = macd - macdSignal;
  const currentRsi = rsi(closes);
  const currentAtr = atr(candles);
  const vwap = rollingVwap(candles);
  const rvol = relativeVolume(candles);
  const hhhl = detectHHHL(candles);

  const candlePatternHits = detectVerifiedPatterns(candles);
  const structurePatternHits = detectVerifiedStructurePatterns(candles);
  const masterExecutableHits = detectMasterExecutablePatterns(candles);
  const patternHits = mergePatternHits(candlePatternHits, structurePatternHits, masterExecutableHits);

  const patternSummary = summarizePatternHits(patternHits);
  const strongestPattern = patternSummary.strongest;
  const strongBearishPattern = patternHits.some(
    (hit) => hit.direction === "BEARISH" && (hit.confidence === "STRONG" || hit.weight >= 8),
  );

  let score = 0;
  const reasons: string[] = [];
  const failedChecks: string[] = [];

  const fullTrend = last.close > ema9 && ema9 > ema20 && ema20 > ema50;
  const baseTrend = last.close > ema20 && ema20 > ema50;
  if (fullTrend) {
    score += 20;
    reasons.push("EMA9 > EMA20 > EMA50 정배열");
  } else if (baseTrend) {
    score += 14;
    reasons.push("가격 > EMA20 > EMA50 상승 구조");
  } else {
    failedChecks.push("EMA_TREND");
  }

  if (last.close >= vwap) {
    score += 15;
    reasons.push("가격이 rolling VWAP 위에서 유지");
  } else {
    failedChecks.push("VWAP");
  }

  if (macdHist > 0 && macd > macdSignal) {
    score += 15;
    reasons.push("MACD 상승 확인");
  } else {
    failedChecks.push("MACD");
  }

  if (currentRsi >= 52 && currentRsi <= 74) {
    score += 10;
    reasons.push(`RSI ${currentRsi.toFixed(1)} 건강한 상승 구간`);
  } else if (currentRsi >= 48 && currentRsi < 78) {
    score += 5;
  } else {
    failedChecks.push("RSI");
  }

  if (rvol >= 2) {
    score += 15;
    reasons.push(`RVOL ${rvol.toFixed(2)}x 강한 거래량`);
  } else if (rvol >= 1.5) {
    score += 11;
    reasons.push(`RVOL ${rvol.toFixed(2)}x 거래량 확인`);
  } else if (rvol >= 1.2) {
    score += 6;
  } else {
    failedChecks.push("RVOL");
  }

  if (hhhl) {
    score += 15;
    reasons.push("HH/HL 상승 시장구조 확인");
  } else {
    failedChecks.push("HH_HL");
  }

  if (patternSummary.bullishScore > 0) {
    score += patternSummary.bullishScore;
    const bullishNames = patternHits
      .filter((hit) => hit.direction === "BULLISH")
      .slice(0, 5)
      .map((hit) => hit.id)
      .join(", ");
    reasons.push(`검증 패턴 동시탐지: ${bullishNames}`);
  }

  if (structurePatternHits.length > 0) reasons.push(`차트 구조 ${structurePatternHits.length}개 실제 탐지`);
  if (masterExecutableHits.length > 0) reasons.push(`마스터 규칙 ${masterExecutableHits.length}개 실제 탐지`);

  if (strongBearishPattern) failedChecks.push("BEARISH_PATTERN");

  score = Math.min(100, Math.round(score));

  const requiredBuy = fullTrend
    && last.close >= vwap
    && macdHist > 0
    && currentRsi >= 52
    && currentRsi <= 74
    && rvol >= 1.5
    && hhhl
    && !strongBearishPattern;

  const decision: ScannerDecision = requiredBuy && score >= 82
    ? "BUY_APPROVED"
    : score >= 70
      ? "BUY_WATCH"
      : "NO_BUY";

  const riskUnit = Math.max(currentAtr * 1.2, last.close * 0.012);
  const stopLoss = Math.max(0, last.close - riskUnit);
  const entryLow = Math.max(stopLoss, Math.min(last.close, ema9, vwap));
  const entryHigh = last.close;
  const target1 = last.close + riskUnit * 2;
  const target2 = last.close + riskUnit * 3;

  const technicalDirection: "BULLISH" | "NEUTRAL" | "BEARISH" = strongBearishPattern
    ? "BEARISH"
    : fullTrend || baseTrend
      ? "BULLISH"
      : last.close < ema20
        ? "BEARISH"
        : "NEUTRAL";

  const registryStats = executableRegistryStats(candles.length);

  return {
    decision,
    score,
    direction: technicalDirection,
    pattern: strongestPattern?.id ?? "NONE",
    patternHits,
    patternRegistry: {
      registered: registryStats.registered,
      evaluated: registryStats.evaluated,
      matched: patternHits.length,
      bullishMatched: patternHits.filter((hit) => hit.direction === "BULLISH").length,
      bearishMatched: patternHits.filter((hit) => hit.direction === "BEARISH").length,
      candleRegistered: VERIFIED_PATTERN_REGISTRY.length,
      structureRegistered: VERIFIED_STRUCTURE_PATTERN_REGISTRY.length,
      masterExecutableRegistered: MASTER_EXECUTABLE_PATTERN_RULES.length,
      candleMatched: candlePatternHits.length,
      structureMatched: structurePatternHits.length,
      masterExecutableMatched: masterExecutableHits.length,
    },
    reasons,
    failedChecks,
    metrics: {
      close: last.close,
      ema9,
      ema20,
      ema50,
      vwap,
      rsi: currentRsi,
      macd,
      macdSignal,
      macdHist,
      rvol,
      atr: currentAtr,
      hhhl,
    },
    entryLow,
    entryHigh,
    stopLoss,
    target1,
    target2,
    riskReward: 2,
    evaluatedBars: candles.length,
  };
}
