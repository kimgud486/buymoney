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
  { id: "TRIPLE_BOTTOM", name: "Triple Bottom", direction: "BULLISH", weight: 9, minBars: 32 },
  { id: "INVERSE_HEAD_AND_SHOULDERS", name: "Inverse Head & Shoulders", direction: "BULLISH", weight: 10, minBars: 32 },
  { id: "HIGHER_LOW", name: "Higher Low", direction: "BULLISH", weight: 7, minBars: 16 },
  { id: "HL_HH_MSS", name: "HL + HH Market Structure Shift", direction: "BULLISH", weight: 10, minBars: 18 },
  { id: "RESISTANCE_BREAKOUT", name: "Resistance Breakout", direction: "BULLISH", weight: 10, minBars: 22 },
  { id: "BREAKOUT_RETEST_HOLD", name: "Breakout + Retest Hold", direction: "BULLISH", weight: 10, minBars: 28 },
  { id: "FAILED_BREAKDOWN", name: "Failed Breakdown", direction: "BULLISH", weight: 9, minBars: 22 },
  { id: "BEAR_TRAP", name: "Bear Trap", direction: "BULLISH", weight: 10, minBars: 22 },
  { id: "VWAP_RECLAIM", name: "VWAP Reclaim", direction: "BULLISH", weight: 8, minBars: 22 },
  { id: "VOLUME_EXPANSION_BREAKOUT", name: "Volume Expansion Breakout", direction: "BULLISH", weight: 10, minBars: 22 },
  { id: "FIRST_PULLBACK_HOLD", name: "First Pullback Hold", direction: "BULLISH", weight: 8, minBars: 28 },
  { id: "RSI_BULLISH_DIVERGENCE", name: "RSI Bullish Divergence", direction: "BULLISH", weight: 8, minBars: 32 },
  { id: "MACD_BULLISH_DIVERGENCE", name: "MACD Bullish Divergence", direction: "BULLISH", weight: 7, minBars: 36 },
  { id: "SELLING_CLIMAX_REVERSAL", name: "Selling Climax Reversal", direction: "BULLISH", weight: 10, minBars: 22 },
  { id: "ACCUMULATION_CANDLE", name: "Accumulation Candle", direction: "BULLISH", weight: 8, minBars: 22 },
  { id: "GAP_AND_GO", name: "Gap & Go", direction: "BULLISH", weight: 9, minBars: 22 },
] as const;

const EPS = 1e-9;

function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
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

function rsiSeries(values: number[], period = 14): number[] {
  const out = new Array(values.length).fill(50);
  if (values.length < period + 1) return out;
  for (let end = period; end < values.length; end += 1) {
    let gain = 0;
    let loss = 0;
    for (let i = end - period + 1; i <= end; i += 1) {
      const diff = values[i] - values[i - 1];
      if (diff >= 0) gain += diff;
      else loss -= diff;
    }
    const avgGain = gain / period;
    const avgLoss = loss / period;
    out[end] = avgLoss <= EPS ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

function macdHistSeries(values: number[]): number[] {
  const fast = ema(values, 12);
  const slow = ema(values, 26);
  const macd = fast.map((value, index) => value - slow[index]);
  const signal = ema(macd, 9);
  return macd.map((value, index) => value - signal[index]);
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
  const lastRange = Math.max(EPS, last.high - last.low);
  const lastBody = Math.abs(last.close - last.open);
  const lastLowerWick = Math.max(0, Math.min(last.open, last.close) - last.low);
  const closeLocation = (last.close - last.low) / lastRange;

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

  // Resistance / breakdown / volume setups.
  if (candles.length >= 22) {
    const prior20 = candles.slice(-21, -1);
    const resistance = Math.max(...prior20.map((c) => c.high));
    const support = Math.min(...prior20.map((c) => c.low));

    if (last.close > resistance * 1.001 && rvol >= 1.5) push("RESISTANCE_BREAKOUT", rvol >= 2 ? "STRONG" : "NORMAL");
    if (last.close > resistance * 1.001 && rvol >= 2) push("VOLUME_EXPANSION_BREAKOUT", "STRONG");

    if (last.low < support * 0.997 && last.close > support && last.close > last.open) {
      push("FAILED_BREAKDOWN", "STRONG");
      if (rvol >= 1.5 && closeLocation >= 0.65) push("BEAR_TRAP", "STRONG");
    }

    // Selling climax: extreme volume, deep lower rejection, bullish recovery near the high.
    if (rvol >= 3 && lastLowerWick >= Math.max(lastBody * 1.8, lastRange * 0.4) && closeLocation >= 0.65) {
      push("SELLING_CLIMAX_REVERSAL", "STRONG");
    }

    // Accumulation candle: expanded volume but little downside progress and a high close.
    const priorLow5 = Math.min(...candles.slice(-6, -1).map((c) => c.low));
    if (rvol >= 1.8 && last.low >= priorLow5 * 0.985 && last.close > last.open && closeLocation >= 0.75) {
      push("ACCUMULATION_CANDLE", rvol >= 2.5 ? "STRONG" : "NORMAL");
    }

    // Daily Gap & Go. ORB is intentionally excluded because it requires intraday opening-range candles.
    const gapPct = previous.close > 0 ? (last.open - previous.close) / previous.close : 0;
    if (gapPct >= 0.015 && last.close > last.open && closeLocation >= 0.7 && rvol >= 1.5) {
      push("GAP_AND_GO", rvol >= 2 ? "STRONG" : "NORMAL");
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

  // Double / triple bottom and inverse H&S use separated swing lows and require a neckline reclaim.
  if (candles.length >= 24) {
    const start = Math.max(0, candles.length - 42);
    const lows = localLowIndices(candles, start, candles.length - 3);

    outerDouble: for (let a = lows.length - 2; a >= 0; a -= 1) {
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
          break outerDouble;
        }
      }
    }

    if (candles.length >= 32 && lows.length >= 3) {
      outerTriple: for (let a = Math.max(0, lows.length - 6); a < lows.length - 2; a += 1) {
        for (let b = a + 1; b < lows.length - 1; b += 1) {
          for (let d = b + 1; d < lows.length; d += 1) {
            const i1 = lows[a];
            const i2 = lows[b];
            const i3 = lows[d];
            if (i2 - i1 < 4 || i3 - i2 < 4 || candles.length - 1 - i3 > 10) continue;
            const values = [candles[i1].low, candles[i2].low, candles[i3].low];
            const mean = avg(values);
            const maxDeviation = Math.max(...values.map((value) => Math.abs(value - mean) / Math.max(EPS, mean)));
            if (maxDeviation > 0.025) continue;
            const neckline = Math.max(
              ...candles.slice(i1 + 1, i2).map((c) => c.high),
              ...candles.slice(i2 + 1, i3).map((c) => c.high),
            );
            if (last.close > neckline * 1.001) {
              push("TRIPLE_BOTTOM", rvol >= 1.5 ? "STRONG" : "NORMAL");
              break outerTriple;
            }
          }
        }
      }

      // Inverse H&S: middle swing low is materially lower, shoulders are similar, then neckline breaks.
      outerIhs: for (let a = Math.max(0, lows.length - 6); a < lows.length - 2; a += 1) {
        for (let b = a + 1; b < lows.length - 1; b += 1) {
          for (let d = b + 1; d < lows.length; d += 1) {
            const i1 = lows[a];
            const headIndex = lows[b];
            const i3 = lows[d];
            if (headIndex - i1 < 4 || i3 - headIndex < 4 || candles.length - 1 - i3 > 10) continue;
            const left = candles[i1].low;
            const head = candles[headIndex].low;
            const right = candles[i3].low;
            const shoulderSimilarity = Math.abs(left - right) / Math.max(EPS, (left + right) / 2);
            if (shoulderSimilarity > 0.04) continue;
            if (!(head < Math.min(left, right) * 0.97)) continue;
            const leftNeck = Math.max(...candles.slice(i1 + 1, headIndex).map((c) => c.high));
            const rightNeck = Math.max(...candles.slice(headIndex + 1, i3).map((c) => c.high));
            const neckline = Math.min(leftNeck, rightNeck);
            if (last.close > neckline * 1.001) {
              push("INVERSE_HEAD_AND_SHOULDERS", rvol >= 1.5 ? "STRONG" : "NORMAL");
              break outerIhs;
            }
          }
        }
      }
    }
  }

  // Price/momentum bullish divergence. Requires two separated swing lows.
  if (candles.length >= 32) {
    const closes = candles.map((c) => c.close);
    const rsi = rsiSeries(closes);
    const macdHist = macdHistSeries(closes);
    const lows = localLowIndices(candles, Math.max(15, candles.length - 40), candles.length - 3);
    if (lows.length >= 2) {
      const i2 = lows[lows.length - 1];
      let i1 = lows[lows.length - 2];
      for (let index = lows.length - 2; index >= 0; index -= 1) {
        if (i2 - lows[index] >= 5) {
          i1 = lows[index];
          break;
        }
      }
      const priceLowerLow = candles[i2].low < candles[i1].low * 0.997;
      if (priceLowerLow && rsi[i2] > rsi[i1] + 3 && last.close > previous.close) {
        push("RSI_BULLISH_DIVERGENCE", rsi[i2] - rsi[i1] >= 6 ? "STRONG" : "NORMAL");
      }
      if (priceLowerLow && macdHist[i2] > macdHist[i1] && last.close > previous.close && macdHist[macdHist.length - 1] > macdHist[macdHist.length - 2]) {
        push("MACD_BULLISH_DIVERGENCE", "NORMAL");
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
