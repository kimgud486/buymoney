import type { ScannerCandle } from "./verifiedSignalEngine";
import type { VerifiedPatternHit } from "./verifiedPatternEngine";
import { BULLISH_PATTERN_CATALOG } from "../lib/bullishMasterEngine";
import { BEARISH_PATTERN_CATALOG } from "../lib/bearishMasterEngine";

type Direction = "BULLISH" | "BEARISH";
type Confidence = "STRONG" | "NORMAL";

type ExpansionRule = {
  id: string;
  direction: Direction;
  minBars: number;
  test: (candles: ScannerCandle[]) => boolean;
  confidence?: (candles: ScannerCandle[]) => Confidence;
};

const EPS = 1e-9;

const catalogByKey = new Map<string, (typeof BULLISH_PATTERN_CATALOG)[number] | (typeof BEARISH_PATTERN_CATALOG)[number]>();
for (const pattern of BULLISH_PATTERN_CATALOG) catalogByKey.set(`BULLISH:${pattern.code}`, pattern);
for (const pattern of BEARISH_PATTERN_CATALOG) catalogByKey.set(`BEARISH:${pattern.code}`, pattern);

function avg(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function body(c: ScannerCandle): number {
  return Math.abs(c.close - c.open);
}

function range(c: ScannerCandle): number {
  return Math.max(EPS, c.high - c.low);
}

function upperWick(c: ScannerCandle): number {
  return Math.max(0, c.high - Math.max(c.open, c.close));
}

function lowerWick(c: ScannerCandle): number {
  return Math.max(0, Math.min(c.open, c.close) - c.low);
}

function bullish(c: ScannerCandle): boolean {
  return c.close > c.open;
}

function bearish(c: ScannerCandle): boolean {
  return c.close < c.open;
}

function isDoji(c: ScannerCandle): boolean {
  return body(c) / range(c) <= 0.12;
}

function ema(values: number[], period: number): number[] {
  if (!values.length) return [];
  const alpha = 2 / (period + 1);
  const out = [values[0]];
  for (let i = 1; i < values.length; i += 1) out.push(alpha * values[i] + (1 - alpha) * out[i - 1]);
  return out;
}

function rsiSeries(values: number[], period = 14): number[] {
  if (!values.length) return [];
  const out = new Array(values.length).fill(50);
  if (values.length <= period) return out;

  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i += 1) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  out[period] = avgLoss <= EPS ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < values.length; i += 1) {
    const diff = values[i] - values[i - 1];
    const nextGain = diff > 0 ? diff : 0;
    const nextLoss = diff < 0 ? -diff : 0;
    avgGain = ((avgGain * (period - 1)) + nextGain) / period;
    avgLoss = ((avgLoss * (period - 1)) + nextLoss) / period;
    out[i] = avgLoss <= EPS ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

function macdHistogram(values: number[]): number[] {
  const fast = ema(values, 12);
  const slow = ema(values, 26);
  const macd = values.map((_, index) => (fast[index] ?? 0) - (slow[index] ?? 0));
  const signal = ema(macd, 9);
  return macd.map((value, index) => value - (signal[index] ?? 0));
}

function rollingVwap(candles: ScannerCandle[]): number {
  let pv = 0;
  let volume = 0;
  for (const candle of candles) {
    const v = Math.max(0, candle.volume);
    pv += ((candle.high + candle.low + candle.close) / 3) * v;
    volume += v;
  }
  return volume > 0 ? pv / volume : candles[candles.length - 1]?.close ?? 0;
}

function localLowIndexes(candles: ScannerCandle[], lookback = 45): number[] {
  const start = Math.max(2, candles.length - lookback);
  const indexes: number[] = [];
  for (let i = start; i < candles.length - 2; i += 1) {
    if (candles[i].low <= candles[i - 1].low && candles[i].low <= candles[i + 1].low) indexes.push(i);
  }
  return indexes;
}

function localHighIndexes(candles: ScannerCandle[], lookback = 45): number[] {
  const start = Math.max(2, candles.length - lookback);
  const indexes: number[] = [];
  for (let i = start; i < candles.length - 2; i += 1) {
    if (candles[i].high >= candles[i - 1].high && candles[i].high >= candles[i + 1].high) indexes.push(i);
  }
  return indexes;
}

function bullishDivergence(candles: ScannerCandle[], oscillator: number[]): boolean {
  const lows = localLowIndexes(candles);
  if (lows.length < 2) return false;
  const a = lows[lows.length - 2];
  const b = lows[lows.length - 1];
  return candles[b].low < candles[a].low && oscillator[b] > oscillator[a];
}

function bearishDivergence(candles: ScannerCandle[], oscillator: number[]): boolean {
  const highs = localHighIndexes(candles);
  if (highs.length < 2) return false;
  const a = highs[highs.length - 2];
  const b = highs[highs.length - 1];
  return candles[b].high > candles[a].high && oscillator[b] < oscillator[a];
}

function breakoutRetestReject(candles: ScannerCandle[]): boolean {
  if (candles.length < 25) return false;
  const prior = candles.slice(-25, -5);
  const support = Math.min(...prior.map((c) => c.low));
  const post = candles.slice(-5);
  const broke = post.slice(0, 3).some((c) => c.close < support * 0.997);
  const last = post[post.length - 1];
  const retested = last.high >= support * 0.995 && last.high <= support * 1.015;
  return broke && retested && bearish(last) && last.close < support;
}

function vwapRetestHold(candles: ScannerCandle[]): boolean {
  if (candles.length < 22) return false;
  const prevWindow = candles.slice(0, -1);
  const prevVwap = rollingVwap(prevWindow);
  const last = candles[candles.length - 1];
  const recent = candles.slice(-5, -1);
  const wasAbove = recent.some((c) => c.close > prevVwap * 1.003);
  return wasAbove && last.low <= prevVwap * 1.008 && last.low >= prevVwap * 0.985 && last.close > prevVwap && bullish(last);
}

const RULES: ExpansionRule[] = [
  {
    id: "LONG_LOWER_WICK",
    direction: "BULLISH",
    minBars: 2,
    test: (c) => {
      const last = c[c.length - 1];
      return bullish(last) && lowerWick(last) >= Math.max(body(last) * 1.8, range(last) * 0.45);
    },
  },
  {
    id: "LONG_UPPER_WICK",
    direction: "BEARISH",
    minBars: 2,
    test: (c) => {
      const last = c[c.length - 1];
      return bearish(last) && upperWick(last) >= Math.max(body(last) * 1.8, range(last) * 0.45);
    },
  },
  {
    id: "HARAMI_CROSS",
    direction: "BULLISH",
    minBars: 2,
    test: (c) => {
      const [prev, last] = c.slice(-2);
      if (!prev || !last) return false;
      const inside = Math.max(last.open, last.close) < prev.open && Math.min(last.open, last.close) > prev.close;
      return bearish(prev) && isDoji(last) && inside;
    },
  },
  {
    id: "HARAMI_CROSS",
    direction: "BEARISH",
    minBars: 2,
    test: (c) => {
      const [prev, last] = c.slice(-2);
      if (!prev || !last) return false;
      const inside = Math.max(last.open, last.close) < prev.close && Math.min(last.open, last.close) > prev.open;
      return bullish(prev) && isDoji(last) && inside;
    },
  },
  {
    id: "BULLISH_KICKER",
    direction: "BULLISH",
    minBars: 2,
    test: (c) => {
      const [prev, last] = c.slice(-2);
      return !!prev && !!last && bearish(prev) && bullish(last) && last.open > prev.open && body(last) / range(last) >= 0.65;
    },
    confidence: () => "STRONG",
  },
  {
    id: "BEARISH_KICKER",
    direction: "BEARISH",
    minBars: 2,
    test: (c) => {
      const [prev, last] = c.slice(-2);
      return !!prev && !!last && bullish(prev) && bearish(last) && last.open < prev.open && body(last) / range(last) >= 0.65;
    },
    confidence: () => "STRONG",
  },
  {
    id: "MORNING_DOJI_STAR",
    direction: "BULLISH",
    minBars: 3,
    test: (c) => {
      const [a, b, d] = c.slice(-3);
      return !!a && !!b && !!d && bearish(a) && isDoji(b) && bullish(d) && d.close > (a.open + a.close) / 2;
    },
    confidence: () => "STRONG",
  },
  {
    id: "EVENING_DOJI_STAR",
    direction: "BEARISH",
    minBars: 3,
    test: (c) => {
      const [a, b, d] = c.slice(-3);
      return !!a && !!b && !!d && bullish(a) && isDoji(b) && bearish(d) && d.close < (a.open + a.close) / 2;
    },
    confidence: () => "STRONG",
  },
  { id: "BREAKDOWN_RETEST_REJECT", direction: "BEARISH", minBars: 25, test: breakoutRetestReject, confidence: () => "STRONG" },
  { id: "VWAP_RETEST_HOLD", direction: "BULLISH", minBars: 22, test: vwapRetestHold },
  {
    id: "RSI_BULLISH_DIVERGENCE",
    direction: "BULLISH",
    minBars: 35,
    test: (c) => bullishDivergence(c, rsiSeries(c.map((x) => x.close))),
  },
  {
    id: "RSI_BEARISH_DIVERGENCE",
    direction: "BEARISH",
    minBars: 35,
    test: (c) => bearishDivergence(c, rsiSeries(c.map((x) => x.close))),
  },
  {
    id: "MACD_BULLISH_DIVERGENCE",
    direction: "BULLISH",
    minBars: 40,
    test: (c) => bullishDivergence(c, macdHistogram(c.map((x) => x.close))),
  },
  {
    id: "MACD_BEARISH_DIVERGENCE",
    direction: "BEARISH",
    minBars: 40,
    test: (c) => bearishDivergence(c, macdHistogram(c.map((x) => x.close))),
  },
  {
    id: "GAP_DOWN_FAILURE",
    direction: "BULLISH",
    minBars: 2,
    test: (c) => {
      const [prev, last] = c.slice(-2);
      return !!prev && !!last && last.open <= prev.close * 0.985 && bullish(last) && last.close >= prev.close;
    },
    confidence: () => "STRONG",
  },
  {
    id: "GAP_RECLAIM",
    direction: "BULLISH",
    minBars: 3,
    test: (c) => {
      const [base, gap, last] = c.slice(-3);
      return !!base && !!gap && !!last && gap.high < base.low && last.close > base.low && bullish(last);
    },
  },
  {
    id: "GAP_FILL_BREAKDOWN",
    direction: "BEARISH",
    minBars: 3,
    test: (c) => {
      const [base, gap, last] = c.slice(-3);
      return !!base && !!gap && !!last && gap.low > base.high && last.close < base.high && bearish(last);
    },
  },
];

export const MASTER_PATTERN_EXPANSION_RULES = Object.freeze(
  RULES.map(({ id, direction, minBars }) => ({ id, direction, minBars })),
);

function toHit(rule: ExpansionRule, candles: ScannerCandle[]): VerifiedPatternHit | null {
  if (candles.length < rule.minBars || !rule.test(candles)) return null;
  const catalog = catalogByKey.get(`${rule.direction}:${rule.id}`);
  if (!catalog) return null;
  return {
    id: rule.id,
    name: catalog.nameEn || catalog.nameKr || rule.id,
    direction: rule.direction,
    weight: Math.max(1, Math.min(15, Math.round(catalog.weightScore / 1.5))),
    minBars: rule.minBars,
    confidence: rule.confidence?.(candles) ?? (catalog.importance >= 5 ? "STRONG" : "NORMAL"),
  };
}

export function detectMasterPatternExpansions(candles: ScannerCandle[]): VerifiedPatternHit[] {
  const hits = RULES
    .map((rule) => toHit(rule, candles))
    .filter((hit): hit is VerifiedPatternHit => Boolean(hit));

  return hits.sort((a, b) => {
    const confidence = Number(b.confidence === "STRONG") - Number(a.confidence === "STRONG");
    if (confidence !== 0) return confidence;
    return b.weight - a.weight;
  });
}
