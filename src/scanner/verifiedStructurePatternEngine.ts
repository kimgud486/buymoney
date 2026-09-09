import type { ScannerCandle } from "./verifiedSignalEngine";
import type { VerifiedPatternHit } from "./verifiedPatternEngine";

export interface VerifiedStructurePatternDefinition {
  id: string;
  name: string;
  direction: "BULLISH" | "BEARISH" | "NEUTRAL";
  weight: number;
  minBars: number;
}

export const VERIFIED_STRUCTURE_PATTERN_REGISTRY: readonly VerifiedStructurePatternDefinition[] = [
  { id: "DOUBLE_BOTTOM", name: "Double Bottom", direction: "BULLISH", weight: 9, minBars: 24 },
  { id: "HIGHER_LOW", name: "Higher Low", direction: "BULLISH", weight: 7, minBars: 16 },
  { id: "HL_HH_MSS", name: "HL + HH Market Structure Shift", direction: "BULLISH", weight: 10, minBars: 18 },
  { id: "RESISTANCE_BREAKOUT", name: "Resistance Breakout", direction: "BULLISH", weight: 10, minBars: 22 },
  { id: "BREAKOUT_RETEST_HOLD", name: "Breakout + Retest Hold", direction: "BULLISH", weight: 10, minBars: 28 },
  { id: "FAILED_BREAKDOWN", name: "Failed Breakdown", direction: "BULLISH", weight: 9, minBars: 22 },
  { id: "VWAP_RECLAIM", name: "VWAP Reclaim", direction: "BULLISH", weight: 8, minBars: 22 },
  { id: "VOLUME_EXPANSION_BREAKOUT", name: "Volume Expansion Breakout", direction: "BULLISH", weight: 10, minBars: 22 },
  { id: "FIRST_PULLBACK_HOLD", name: "First Pullback Hold", direction: "BULLISH", weight: 8, minBars: 28 },
] as const;

const EPS = 1e-9;

function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function relativeVolume(candles: ScannerCandle[], lookback = 20): number {
  if (candles.length < lookback + 1) return 0;
  const current = Math.max(0, candles[candles.length - 1].volume);
  const history = candles.slice(-(lookback + 1), -1).map((c) => Math.max(0, c.volume));
  const baseline = avg(history);
  return baseline > 0 ? current / baseline : 0;
}

function rollingVwap(candles: ScannerCandle[], lookback = 20): number {
  const slice = candles.slice(-lookback);
  let pv = 0;
  let volume = 0;
  for (const candle of slice) {
    const v = Math.max(0, candle.volume);
    const typical = (candle.high + candle.low + candle.close) / 3;
    pv += typical * v;
    volume += v;
  }
  return volume > 0 ? pv / volume : slice[slice.length - 1]?.close ?? 0;
}

function localLowIndices(candles: ScannerCandle[], from: number, to: number): number[] {
  const out: number[] = [];
  for (let i = Math.max(1, from); i <= Math.min(candles.length - 2, to); i += 1) {
    if (candles[i].low <= candles[i - 1].low && candles[i].low <= candles[i + 1].low) out.push(i);
  }
  return out;
}

function makeHit(
  definition: VerifiedStructurePatternDefinition,
  confidence: "STRONG" | "NORMAL" = "NORMAL",
): VerifiedPatternHit {
  return { ...definition, confidence };
}

export function detectVerifiedStructurePatterns(candles: ScannerCandle[]): VerifiedPatternHit[] {
  if (candles.length < 16) return [];

  const hits: VerifiedPatternHit[] = [];
  const seen = new Set<string>();
  const push = (id: string, confidence: "STRONG" | "NORMAL" = "NORMAL") => {
    if (seen.has(id)) return;
    const definition = VERIFIED_STRUCTURE_PATTERN_REGISTRY.find((item) => item.id === id);
    if (!definition || candles.length < definition.minBars) return;
    seen.add(id);
    hits.push(makeHit(definition, confidence));
  };

  const last = candles[candles.length - 1];
  const previous = candles[candles.length - 2];
  const rvol = relativeVolume(candles);

  // Higher-low and higher-high market structure use two non-overlapping windows.
  const priorWindow = candles.slice(-16, -8);
  const recentWindow = candles.slice(-8);
  if (priorWindow.length === 8 && recentWindow.length === 8) {
    const priorLow = Math.min(...priorWindow.map((c) => c.low));
    const recentLow = Math.min(...recentWindow.map((c) => c.low));
    const priorHigh = Math.max(...priorWindow.map((c) => c.high));
    const recentHigh = Math.max(...recentWindow.map((c) => c.high));
    if (recentLow > priorLow * 1.002 && last.close > previous.close) push("HIGHER_LOW");
    if (recentLow > priorLow * 1.002 && recentHigh > priorHigh * 1.002 && last.close >= recentHigh * 0.985) {
      push("HL_HH_MSS", "STRONG");
    }
  }

  // Resistance breakout: the completed bar closes above the prior 20-bar ceiling with volume confirmation.
  if (candles.length >= 22) {
    const prior20 = candles.slice(-21, -1);
    const resistance = Math.max(...prior20.map((c) => c.high));
    if (last.close > resistance * 1.001 && rvol >= 1.5) push("RESISTANCE_BREAKOUT", rvol >= 2 ? "STRONG" : "NORMAL");
    if (last.close > resistance * 1.001 && rvol >= 2) push("VOLUME_EXPANSION_BREAKOUT", "STRONG");

    const support = Math.min(...prior20.map((c) => c.low));
    if (last.low < support * 0.997 && last.close > support && last.close > last.open) {
      push("FAILED_BREAKDOWN", "STRONG");
    }
  }

  // Rolling VWAP reclaim. This is deliberately named rolling VWAP, not intraday session VWAP.
  if (candles.length >= 22) {
    const prevVwap = rollingVwap(candles.slice(0, -1));
    const currentVwap = rollingVwap(candles);
    if (previous.close < prevVwap && last.close > currentVwap && last.close > last.open) {
      push("VWAP_RECLAIM", rvol >= 1.5 ? "STRONG" : "NORMAL");
    }
  }

  // Double bottom: two separated swing lows of similar depth, followed by a neckline close breakout.
  if (candles.length >= 24) {
    const start = Math.max(0, candles.length - 36);
    const lows = localLowIndices(candles, start, candles.length - 3);
    outer: for (let a = lows.length - 2; a >= 0; a -= 1) {
      for (let b = lows.length - 1; b > a; b -= 1) {
        const i1 = lows[a];
        const i2 = lows[b];
        if (i2 - i1 < 5 || candles.length - 1 - i2 > 12) continue;
        const low1 = candles[i1].low;
        const low2 = candles[i2].low;
        const similarity = Math.abs(low2 - low1) / Math.max(EPS, (low1 + low2) / 2);
        if (similarity > 0.025) continue;
        const between = candles.slice(i1 + 1, i2);
        if (!between.length) continue;
        const neckline = Math.max(...between.map((c) => c.high));
        if (last.close > neckline * 1.001) {
          push("DOUBLE_BOTTOM", rvol >= 1.5 ? "STRONG" : "NORMAL");
          break outer;
        }
      }
    }
  }

  // Breakout + retest: breakout must precede the latest bar, then price retests near the old ceiling and holds.
  if (candles.length >= 28) {
    for (let breakoutOffset = 3; breakoutOffset <= 8; breakoutOffset += 1) {
      const breakoutIndex = candles.length - 1 - breakoutOffset;
      if (breakoutIndex < 20) continue;
      const baseline = candles.slice(breakoutIndex - 20, breakoutIndex);
      const resistance = Math.max(...baseline.map((c) => c.high));
      const breakout = candles[breakoutIndex];
      if (breakout.close <= resistance * 1.001) continue;
      const after = candles.slice(breakoutIndex + 1);
      const retestLow = Math.min(...after.map((c) => c.low));
      const held = retestLow >= resistance * 0.985 && retestLow <= resistance * 1.025;
      if (held && last.close > resistance && last.close > last.open) {
        push("BREAKOUT_RETEST_HOLD", "STRONG");

        const breakoutVolume = Math.max(EPS, breakout.volume);
        const pullbackVolume = avg(after.slice(0, -1).map((c) => Math.max(0, c.volume)));
        if (pullbackVolume > 0 && pullbackVolume < breakoutVolume * 0.8 && last.close > previous.close) {
          push("FIRST_PULLBACK_HOLD");
        }
        break;
      }
    }
  }

  return hits.sort((a, b) => {
    const strongDiff = (b.confidence === "STRONG" ? 1 : 0) - (a.confidence === "STRONG" ? 1 : 0);
    if (strongDiff !== 0) return strongDiff;
    return b.weight - a.weight;
  });
}
