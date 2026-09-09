import type { ScannerCandle } from "./verifiedSignalEngine";

export type PatternDirection = "BULLISH" | "BEARISH" | "NEUTRAL";

export interface VerifiedPatternDefinition {
  id: string;
  name: string;
  direction: PatternDirection;
  weight: number;
  minBars: number;
}

export interface VerifiedPatternHit extends VerifiedPatternDefinition {
  confidence: "STRONG" | "NORMAL";
}

export const VERIFIED_PATTERN_REGISTRY: readonly VerifiedPatternDefinition[] = [
  { id: "BULLISH_ENGULFING", name: "Bullish Engulfing", direction: "BULLISH", weight: 10, minBars: 2 },
  { id: "BEARISH_ENGULFING", name: "Bearish Engulfing", direction: "BEARISH", weight: 10, minBars: 2 },
  { id: "HAMMER", name: "Hammer", direction: "BULLISH", weight: 7, minBars: 1 },
  { id: "INVERTED_HAMMER", name: "Inverted Hammer", direction: "BULLISH", weight: 6, minBars: 1 },
  { id: "SHOOTING_STAR", name: "Shooting Star", direction: "BEARISH", weight: 8, minBars: 1 },
  { id: "HANGING_MAN", name: "Hanging Man", direction: "BEARISH", weight: 7, minBars: 2 },
  { id: "MORNING_STAR", name: "Morning Star", direction: "BULLISH", weight: 10, minBars: 3 },
  { id: "EVENING_STAR", name: "Evening Star", direction: "BEARISH", weight: 10, minBars: 3 },
  { id: "THREE_WHITE_SOLDIERS", name: "Three White Soldiers", direction: "BULLISH", weight: 10, minBars: 3 },
  { id: "THREE_BLACK_CROWS", name: "Three Black Crows", direction: "BEARISH", weight: 10, minBars: 3 },
  { id: "PIERCING_LINE", name: "Piercing Line", direction: "BULLISH", weight: 8, minBars: 2 },
  { id: "DARK_CLOUD_COVER", name: "Dark Cloud Cover", direction: "BEARISH", weight: 8, minBars: 2 },
  { id: "BULLISH_HARAMI", name: "Bullish Harami", direction: "BULLISH", weight: 6, minBars: 2 },
  { id: "BEARISH_HARAMI", name: "Bearish Harami", direction: "BEARISH", weight: 6, minBars: 2 },
  { id: "DOJI", name: "Doji", direction: "NEUTRAL", weight: 2, minBars: 1 },
  { id: "DRAGONFLY_DOJI", name: "Dragonfly Doji", direction: "BULLISH", weight: 5, minBars: 1 },
  { id: "GRAVESTONE_DOJI", name: "Gravestone Doji", direction: "BEARISH", weight: 5, minBars: 1 },
  { id: "BULLISH_MARUBOZU", name: "Bullish Marubozu", direction: "BULLISH", weight: 6, minBars: 1 },
  { id: "BEARISH_MARUBOZU", name: "Bearish Marubozu", direction: "BEARISH", weight: 6, minBars: 1 },
] as const;

const EPS = 1e-9;

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

function midpoint(c: ScannerCandle): number {
  return (c.open + c.close) / 2;
}

function def(id: string): VerifiedPatternDefinition {
  const found = VERIFIED_PATTERN_REGISTRY.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown verified pattern: ${id}`);
  return found;
}

function push(hits: VerifiedPatternHit[], id: string, confidence: "STRONG" | "NORMAL" = "NORMAL"): void {
  if (hits.some((hit) => hit.id === id)) return;
  hits.push({ ...def(id), confidence });
}

export function detectVerifiedPatterns(candles: ScannerCandle[]): VerifiedPatternHit[] {
  if (!candles.length) return [];

  const hits: VerifiedPatternHit[] = [];
  const c = candles[candles.length - 1];
  const p = candles[candles.length - 2];
  const p2 = candles[candles.length - 3];
  const cBody = body(c);
  const cRange = range(c);
  const cUpper = upperWick(c);
  const cLower = lowerWick(c);
  const bodyRatio = cBody / cRange;
  const doji = bodyRatio <= 0.1;

  if (doji) {
    push(hits, "DOJI");
    if (cLower >= cRange * 0.6 && cUpper <= cRange * 0.1) push(hits, "DRAGONFLY_DOJI", "STRONG");
    if (cUpper >= cRange * 0.6 && cLower <= cRange * 0.1) push(hits, "GRAVESTONE_DOJI", "STRONG");
  }

  if (bullish(c) && cLower >= Math.max(cBody * 2, cRange * 0.45) && cUpper <= cRange * 0.15) {
    push(hits, "HAMMER", "STRONG");
  }
  if (bullish(c) && cUpper >= Math.max(cBody * 2, cRange * 0.45) && cLower <= cRange * 0.15) {
    push(hits, "INVERTED_HAMMER");
  }
  if (bearish(c) && cUpper >= Math.max(cBody * 2, cRange * 0.45) && cLower <= cRange * 0.15) {
    push(hits, "SHOOTING_STAR", "STRONG");
  }

  if (bodyRatio >= 0.85) {
    if (bullish(c)) push(hits, "BULLISH_MARUBOZU");
    if (bearish(c)) push(hits, "BEARISH_MARUBOZU");
  }

  if (p) {
    const pBody = Math.max(EPS, body(p));
    const currentInsidePreviousBody = Math.max(c.open, c.close) < Math.max(p.open, p.close)
      && Math.min(c.open, c.close) > Math.min(p.open, p.close);

    if (bearish(p) && bullish(c) && c.open <= p.close && c.close >= p.open) {
      push(hits, "BULLISH_ENGULFING", "STRONG");
    }
    if (bullish(p) && bearish(c) && c.open >= p.close && c.close <= p.open) {
      push(hits, "BEARISH_ENGULFING", "STRONG");
    }
    if (bearish(p) && bullish(c) && currentInsidePreviousBody && cBody <= pBody * 0.75) {
      push(hits, "BULLISH_HARAMI");
    }
    if (bullish(p) && bearish(c) && currentInsidePreviousBody && cBody <= pBody * 0.75) {
      push(hits, "BEARISH_HARAMI");
    }
    if (bearish(p) && bullish(c) && c.close > midpoint(p) && c.close < p.open) {
      push(hits, "PIERCING_LINE");
    }
    if (bullish(p) && bearish(c) && c.close < midpoint(p) && c.close > p.open) {
      push(hits, "DARK_CLOUD_COVER");
    }

    const priorTrendUp = candles.length >= 6
      ? candles[candles.length - 2].close > candles[candles.length - 6].close
      : false;
    if (priorTrendUp && cLower >= Math.max(cBody * 2, cRange * 0.45) && cUpper <= cRange * 0.15) {
      push(hits, "HANGING_MAN");
    }
  }

  if (p && p2) {
    const middleSmall = body(p) <= Math.max(body(p2), body(c)) * 0.55;
    if (bearish(p2) && middleSmall && bullish(c) && c.close >= midpoint(p2)) {
      push(hits, "MORNING_STAR", "STRONG");
    }
    if (bullish(p2) && middleSmall && bearish(c) && c.close <= midpoint(p2)) {
      push(hits, "EVENING_STAR", "STRONG");
    }

    if (bullish(p2) && bullish(p) && bullish(c)
      && p.close > p2.close && c.close > p.close
      && p.open >= Math.min(p2.open, p2.close) && c.open >= Math.min(p.open, p.close)) {
      push(hits, "THREE_WHITE_SOLDIERS", "STRONG");
    }
    if (bearish(p2) && bearish(p) && bearish(c)
      && p.close < p2.close && c.close < p.close
      && p.open <= Math.max(p2.open, p2.close) && c.open <= Math.max(p.open, p.close)) {
      push(hits, "THREE_BLACK_CROWS", "STRONG");
    }
  }

  return hits.sort((a, b) => {
    const directionRank = { BEARISH: 2, BULLISH: 1, NEUTRAL: 0 } as const;
    const confidenceDiff = (b.confidence === "STRONG" ? 1 : 0) - (a.confidence === "STRONG" ? 1 : 0);
    if (confidenceDiff !== 0) return confidenceDiff;
    const weightDiff = b.weight - a.weight;
    if (weightDiff !== 0) return weightDiff;
    return directionRank[b.direction] - directionRank[a.direction];
  });
}

export function summarizePatternHits(hits: VerifiedPatternHit[]): {
  bullishScore: number;
  bearishScore: number;
  strongest: VerifiedPatternHit | null;
} {
  const bullishScore = Math.min(10, hits.filter((h) => h.direction === "BULLISH").reduce((sum, h) => sum + h.weight, 0));
  const bearishScore = Math.min(10, hits.filter((h) => h.direction === "BEARISH").reduce((sum, h) => sum + h.weight, 0));
  const strongest = hits.find((h) => h.direction !== "NEUTRAL") ?? hits[0] ?? null;
  return { bullishScore, bearishScore, strongest };
}
