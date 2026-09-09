import type { ScannerCandle } from "./verifiedSignalEngine";
import type { VerifiedPatternHit } from "./verifiedPatternEngine";
import { BULLISH_PATTERN_CATALOG } from "../lib/bullishMasterEngine";
import { BEARISH_PATTERN_CATALOG } from "../lib/bearishMasterEngine";

type Direction = "BULLISH" | "BEARISH" | "NEUTRAL";
type Confidence = "STRONG" | "NORMAL";

type Rule = {
  id: string;
  direction: Direction;
  minBars: number;
  test: (candles: ScannerCandle[]) => boolean;
  confidence?: (candles: ScannerCandle[]) => Confidence;
};

const EPS = 1e-9;

const allCatalog = [
  ...BULLISH_PATTERN_CATALOG.map((p) => ({ ...p, direction: "BULLISH" as const })),
  ...BEARISH_PATTERN_CATALOG.map((p) => ({ ...p, direction: "BEARISH" as const })),
];

const catalogByCode = new Map(allCatalog.map((p) => [p.code, p]));

function avg(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
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

function near(a: number, b: number, tolerancePct = 0.025): boolean {
  const base = Math.max(EPS, Math.abs(a), Math.abs(b));
  return Math.abs(a - b) / base <= tolerancePct;
}

function relativeVolume(candles: ScannerCandle[], lookback = 20): number {
  if (candles.length < lookback + 1) return 0;
  const current = candles[candles.length - 1].volume;
  const history = candles.slice(-(lookback + 1), -1).map((c) => c.volume);
  const mean = avg(history);
  return mean > 0 ? current / mean : 0;
}

function sessionVwap(candles: ScannerCandle[]): number {
  let pv = 0;
  let vol = 0;
  for (const c of candles) {
    const v = Math.max(0, c.volume);
    pv += ((c.high + c.low + c.close) / 3) * v;
    vol += v;
  }
  return vol > 0 ? pv / vol : candles[candles.length - 1]?.close ?? 0;
}

function extremaByChunks(candles: ScannerCandle[], chunkCount: number, lookback: number) {
  const window = candles.slice(-lookback);
  const size = Math.max(2, Math.floor(window.length / chunkCount));
  const chunks: ScannerCandle[][] = [];
  for (let i = 0; i < chunkCount; i += 1) {
    const start = i * size;
    const end = i === chunkCount - 1 ? window.length : Math.min(window.length, start + size);
    chunks.push(window.slice(start, end));
  }
  return chunks.map((chunk) => ({
    high: Math.max(...chunk.map((c) => c.high)),
    low: Math.min(...chunk.map((c) => c.low)),
    close: chunk[chunk.length - 1]?.close ?? 0,
  }));
}

function priorHigh(candles: ScannerCandle[], lookback = 20): number {
  return Math.max(...candles.slice(-(lookback + 1), -1).map((c) => c.high));
}

function priorLow(candles: ScannerCandle[], lookback = 20): number {
  return Math.min(...candles.slice(-(lookback + 1), -1).map((c) => c.low));
}

function threeInsideUp(candles: ScannerCandle[]): boolean {
  const [a, b, c] = candles.slice(-3);
  if (!a || !b || !c) return false;
  const inside = Math.max(b.open, b.close) < a.open && Math.min(b.open, b.close) > a.close;
  return bearish(a) && bullish(b) && inside && bullish(c) && c.close > a.open;
}

function threeInsideDown(candles: ScannerCandle[]): boolean {
  const [a, b, c] = candles.slice(-3);
  if (!a || !b || !c) return false;
  const inside = Math.max(b.open, b.close) < a.close && Math.min(b.open, b.close) > a.open;
  return bullish(a) && bearish(b) && inside && bearish(c) && c.close < a.open;
}

function threeOutsideUp(candles: ScannerCandle[]): boolean {
  const [a, b, c] = candles.slice(-3);
  if (!a || !b || !c) return false;
  const engulf = bearish(a) && bullish(b) && b.open <= a.close && b.close >= a.open;
  return engulf && bullish(c) && c.close > b.close;
}

function threeOutsideDown(candles: ScannerCandle[]): boolean {
  const [a, b, c] = candles.slice(-3);
  if (!a || !b || !c) return false;
  const engulf = bullish(a) && bearish(b) && b.open >= a.close && b.close <= a.open;
  return engulf && bearish(c) && c.close < b.close;
}

const RULES: Rule[] = [
  {
    id: "LONG_BULLISH",
    direction: "BULLISH",
    minBars: 21,
    test: (c) => {
      const last = c[c.length - 1];
      const mean = avg(c.slice(-21, -1).map(body));
      return bullish(last) && body(last) >= mean * 1.35 && last.close >= last.high - range(last) * 0.2;
    },
  },
  {
    id: "LONG_BEARISH",
    direction: "BEARISH",
    minBars: 21,
    test: (c) => {
      const last = c[c.length - 1];
      const mean = avg(c.slice(-21, -1).map(body));
      return bearish(last) && body(last) >= mean * 1.35 && last.close <= last.low + range(last) * 0.2;
    },
  },
  {
    id: "TWEEZER_BOTTOM",
    direction: "BULLISH",
    minBars: 2,
    test: (c) => {
      const [a, b] = c.slice(-2);
      return !!a && !!b && near(a.low, b.low, 0.006) && bearish(a) && bullish(b) && b.close > (a.open + a.close) / 2;
    },
  },
  {
    id: "TWEEZER_TOP",
    direction: "BEARISH",
    minBars: 2,
    test: (c) => {
      const [a, b] = c.slice(-2);
      return !!a && !!b && near(a.high, b.high, 0.006) && bullish(a) && bearish(b) && b.close < (a.open + a.close) / 2;
    },
  },
  { id: "THREE_INSIDE_UP", direction: "BULLISH", minBars: 3, test: threeInsideUp },
  { id: "THREE_INSIDE_DOWN", direction: "BEARISH", minBars: 3, test: threeInsideDown },
  { id: "THREE_OUTSIDE_UP", direction: "BULLISH", minBars: 3, test: threeOutsideUp },
  { id: "THREE_OUTSIDE_DOWN", direction: "BEARISH", minBars: 3, test: threeOutsideDown },
  {
    id: "DOUBLE_BOTTOM",
    direction: "BULLISH",
    minBars: 30,
    test: (c) => {
      const [a, b] = extremaByChunks(c, 2, 30);
      const neckline = Math.max(...c.slice(-30, -1).map((x) => x.high));
      const last = c[c.length - 1];
      return near(a.low, b.low, 0.035) && b.low >= a.low * 0.965 && last.close > neckline;
    },
  },
  {
    id: "DOUBLE_TOP",
    direction: "BEARISH",
    minBars: 30,
    test: (c) => {
      const [a, b] = extremaByChunks(c, 2, 30);
      const neckline = Math.min(...c.slice(-30, -1).map((x) => x.low));
      const last = c[c.length - 1];
      return near(a.high, b.high, 0.035) && b.high <= a.high * 1.035 && last.close < neckline;
    },
  },
  {
    id: "TRIPLE_BOTTOM",
    direction: "BULLISH",
    minBars: 45,
    test: (c) => {
      const [a, b, d] = extremaByChunks(c, 3, 45);
      const last = c[c.length - 1];
      const resistance = Math.max(...c.slice(-45, -1).map((x) => x.high));
      return near(a.low, b.low, 0.04) && near(b.low, d.low, 0.04) && last.close > resistance;
    },
  },
  {
    id: "TRIPLE_TOP",
    direction: "BEARISH",
    minBars: 45,
    test: (c) => {
      const [a, b, d] = extremaByChunks(c, 3, 45);
      const last = c[c.length - 1];
      const support = Math.min(...c.slice(-45, -1).map((x) => x.low));
      return near(a.high, b.high, 0.04) && near(b.high, d.high, 0.04) && last.close < support;
    },
  },
  {
    id: "INVERSE_HEAD_AND_SHOULDERS",
    direction: "BULLISH",
    minBars: 36,
    test: (c) => {
      const [left, head, right] = extremaByChunks(c, 3, 36);
      const last = c[c.length - 1];
      const neckline = Math.max(left.high, right.high);
      return head.low < left.low * 0.97 && head.low < right.low * 0.97 && near(left.low, right.low, 0.06) && last.close > neckline;
    },
  },
  {
    id: "HEAD_AND_SHOULDERS",
    direction: "BEARISH",
    minBars: 36,
    test: (c) => {
      const [left, head, right] = extremaByChunks(c, 3, 36);
      const last = c[c.length - 1];
      const neckline = Math.min(left.low, right.low);
      return head.high > left.high * 1.03 && head.high > right.high * 1.03 && near(left.high, right.high, 0.06) && last.close < neckline;
    },
  },
  {
    id: "HIGHER_LOW",
    direction: "BULLISH",
    minBars: 20,
    test: (c) => {
      const [a, b] = extremaByChunks(c, 2, 20);
      return b.low > a.low * 1.005 && b.close > b.low * 1.01;
    },
  },
  {
    id: "LOWER_HIGH",
    direction: "BEARISH",
    minBars: 20,
    test: (c) => {
      const [a, b] = extremaByChunks(c, 2, 20);
      return b.high < a.high * 0.995 && b.close < b.high * 0.99;
    },
  },
  {
    id: "HL_HH_MSS",
    direction: "BULLISH",
    minBars: 20,
    test: (c) => {
      const [a, b] = extremaByChunks(c, 2, 20);
      return b.low > a.low && b.high > a.high;
    },
  },
  {
    id: "LH_LL_MSS",
    direction: "BEARISH",
    minBars: 20,
    test: (c) => {
      const [a, b] = extremaByChunks(c, 2, 20);
      return b.low < a.low && b.high < a.high;
    },
  },
  {
    id: "RESISTANCE_BREAKOUT",
    direction: "BULLISH",
    minBars: 21,
    test: (c) => {
      const last = c[c.length - 1];
      return last.close > priorHigh(c) && relativeVolume(c) >= 1.5;
    },
    confidence: (c) => relativeVolume(c) >= 2 ? "STRONG" : "NORMAL",
  },
  {
    id: "SUPPORT_BREAKDOWN",
    direction: "BEARISH",
    minBars: 21,
    test: (c) => {
      const last = c[c.length - 1];
      return last.close < priorLow(c) && relativeVolume(c) >= 1.5;
    },
    confidence: (c) => relativeVolume(c) >= 2 ? "STRONG" : "NORMAL",
  },
  {
    id: "FAILED_BREAKDOWN",
    direction: "BULLISH",
    minBars: 21,
    test: (c) => {
      const last = c[c.length - 1];
      const support = priorLow(c);
      return last.low < support && last.close > support && lowerWick(last) >= body(last);
    },
  },
  {
    id: "FAILED_BREAKOUT",
    direction: "BEARISH",
    minBars: 21,
    test: (c) => {
      const last = c[c.length - 1];
      const resistance = priorHigh(c);
      return last.high > resistance && last.close < resistance && upperWick(last) >= body(last);
    },
  },
  {
    id: "BEAR_TRAP",
    direction: "BULLISH",
    minBars: 21,
    test: (c) => {
      const last = c[c.length - 1];
      const support = priorLow(c);
      return last.low < support * 0.995 && last.close > support && bullish(last) && relativeVolume(c) >= 1.3;
    },
  },
  {
    id: "BULL_TRAP",
    direction: "BEARISH",
    minBars: 21,
    test: (c) => {
      const last = c[c.length - 1];
      const resistance = priorHigh(c);
      return last.high > resistance * 1.005 && last.close < resistance && bearish(last) && relativeVolume(c) >= 1.3;
    },
  },
  {
    id: "VWAP_RECLAIM",
    direction: "BULLISH",
    minBars: 20,
    test: (c) => {
      const current = sessionVwap(c);
      const previous = sessionVwap(c.slice(0, -1));
      const last = c[c.length - 1];
      const prev = c[c.length - 2];
      return !!prev && prev.close < previous && last.close > current;
    },
  },
  {
    id: "VWAP_BREAKDOWN",
    direction: "BEARISH",
    minBars: 20,
    test: (c) => {
      const current = sessionVwap(c);
      const previous = sessionVwap(c.slice(0, -1));
      const last = c[c.length - 1];
      const prev = c[c.length - 2];
      return !!prev && prev.close >= previous && last.close < current;
    },
  },
  {
    id: "VWAP_REJECTION",
    direction: "BEARISH",
    minBars: 20,
    test: (c) => {
      const vwap = sessionVwap(c);
      const last = c[c.length - 1];
      return last.high >= vwap && last.close < vwap && upperWick(last) >= body(last) * 0.8;
    },
  },
  {
    id: "VOLUME_EXPANSION_BREAKOUT",
    direction: "BULLISH",
    minBars: 21,
    test: (c) => {
      const last = c[c.length - 1];
      return bullish(last) && relativeVolume(c) >= 2 && last.close > priorHigh(c);
    },
    confidence: () => "STRONG",
  },
  {
    id: "DISTRIBUTION_CANDLE",
    direction: "BEARISH",
    minBars: 21,
    test: (c) => {
      const last = c[c.length - 1];
      return bearish(last) && relativeVolume(c) >= 2 && body(last) / range(last) >= 0.55;
    },
    confidence: (c) => relativeVolume(c) >= 3 ? "STRONG" : "NORMAL",
  },
  {
    id: "ACCUMULATION_CANDLE",
    direction: "BULLISH",
    minBars: 21,
    test: (c) => {
      const last = c[c.length - 1];
      return relativeVolume(c) >= 1.8 && last.close >= last.low + range(last) * 0.7 && lowerWick(last) >= body(last) * 0.7;
    },
  },
  {
    id: "SELLING_CLIMAX_REVERSAL",
    direction: "BULLISH",
    minBars: 21,
    test: (c) => {
      const last = c[c.length - 1];
      return relativeVolume(c) >= 3 && lowerWick(last) >= range(last) * 0.45 && last.close >= last.low + range(last) * 0.65;
    },
    confidence: () => "STRONG",
  },
  {
    id: "VOLUME_CLIMAX_REVERSAL",
    direction: "BEARISH",
    minBars: 21,
    test: (c) => {
      const last = c[c.length - 1];
      return relativeVolume(c) >= 3 && upperWick(last) >= range(last) * 0.45 && last.close <= last.low + range(last) * 0.4;
    },
    confidence: () => "STRONG",
  },
  {
    id: "GAP_AND_GO",
    direction: "BULLISH",
    minBars: 2,
    test: (c) => {
      const prev = c[c.length - 2];
      const last = c[c.length - 1];
      return !!prev && last.open >= prev.close * 1.015 && last.close > last.open && last.close >= last.high - range(last) * 0.25;
    },
  },
  {
    id: "GAP_UP_FAILURE",
    direction: "BEARISH",
    minBars: 2,
    test: (c) => {
      const prev = c[c.length - 2];
      const last = c[c.length - 1];
      return !!prev && last.open >= prev.close * 1.015 && bearish(last) && last.close <= prev.close;
    },
    confidence: () => "STRONG",
  },
];

export const MASTER_EXECUTABLE_PATTERN_RULES = Object.freeze(RULES.map(({ id, direction, minBars }) => ({ id, direction, minBars })));

function hitFromRule(rule: Rule, candles: ScannerCandle[]): VerifiedPatternHit | null {
  const catalog = catalogByCode.get(rule.id);
  if (!catalog || candles.length < rule.minBars || !rule.test(candles)) return null;
  return {
    id: rule.id,
    name: catalog.nameEn || catalog.nameKr || rule.id,
    direction: rule.direction,
    weight: Math.max(1, Math.min(15, Math.round(catalog.weightScore / 1.5))),
    minBars: rule.minBars,
    confidence: rule.confidence?.(candles) ?? (catalog.importance >= 5 ? "STRONG" : "NORMAL"),
  };
}

export function detectMasterExecutablePatterns(candles: ScannerCandle[]): VerifiedPatternHit[] {
  const hits: VerifiedPatternHit[] = [];
  for (const rule of RULES) {
    const hit = hitFromRule(rule, candles);
    if (hit) hits.push(hit);
  }
  return hits.sort((a, b) => {
    const confidence = Number(b.confidence === "STRONG") - Number(a.confidence === "STRONG");
    if (confidence !== 0) return confidence;
    return b.weight - a.weight;
  });
}
