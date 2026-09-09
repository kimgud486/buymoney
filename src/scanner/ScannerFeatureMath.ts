// ----------------------------------------------------------------------
// SHARED SCANNER FEATURE MATH
// ----------------------------------------------------------------------
// Compatibility math for GraphShapeScanner and explainability scanners.
// Production execution authority remains IndicatorTruthEngine + V20 truth gates.
// Every function here is deterministic and preserves the historical formulas of
// its caller so refactoring does not silently change scanner scores.
// ----------------------------------------------------------------------

export interface ScannerOhlcvLike {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp?: number;
}

export interface ScannerMacdSeries {
  macd: number[];
  signal: number[];
  hist: number[];
}

export interface ScannerBollingerSeries {
  upper: number[];
  middle: number[];
  lower: number[];
  bandwidth: number[];
}

export type ZeroVolumeVwapPolicy = "USE_CLOSE" | "EPSILON_DENOMINATOR";
export type ZeroMeanRvolPolicy = "ONE" | "EPSILON_DENOMINATOR";

/** EMA seeded from the first value. Preserves the historical scanner formula. */
export function computeSeededEma(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const alpha = 2 / (period + 1);
  const result: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(alpha * values[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

/**
 * Wilder RSI with a simple-average seed at `period`.
 * This is the exact historical GraphShapeScanner calculation.
 */
export function computeWilderRsi(
  close: number[],
  period: number = 14,
): number[] {
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
    rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  return rsi;
}

/**
 * Recursive RSI seeded from the first price difference.
 * This preserves ExplainableOpportunityScannerEngine output exactly.
 */
export function computeRecursiveRsi(
  close: number[],
  period: number = 14,
): number[] {
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

export function computeSeededMacd(
  close: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): ScannerMacdSeries {
  const fastEma = computeSeededEma(close, fastPeriod);
  const slowEma = computeSeededEma(close, slowPeriod);
  const macd = fastEma.map((value, i) => value - slowEma[i]);
  const signal = computeSeededEma(macd, signalPeriod);
  const hist = macd.map((value, i) => value - signal[i]);
  return { macd, signal, hist };
}

export function computeBollingerBands(
  close: number[],
  period = 20,
  stdDevMult = 2,
): ScannerBollingerSeries {
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

    middle.push(mean);
    upper.push(up);
    lower.push(low);
    bandwidth.push(mean > 0 ? (up - low) / mean : 0);
  }

  return { upper, middle, lower, bandwidth };
}

export function computeSessionVwap(
  candles: ScannerOhlcvLike[],
  zeroVolumePolicy: ZeroVolumeVwapPolicy = "USE_CLOSE",
): number[] {
  const result: number[] = [];
  let cumulativeValue = 0;
  let cumulativeVolume = 0;

  for (const candle of candles) {
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    cumulativeValue += typicalPrice * candle.volume;
    cumulativeVolume += candle.volume;

    if (zeroVolumePolicy === "EPSILON_DENOMINATOR") {
      result.push(cumulativeValue / Math.max(cumulativeVolume, 0.000001));
    } else {
      result.push(cumulativeVolume > 0 ? cumulativeValue / cumulativeVolume : candle.close);
    }
  }

  return result;
}

export function computeRollingRvol(
  volume: number[],
  period = 20,
  zeroMeanPolicy: ZeroMeanRvolPolicy = "ONE",
): number[] {
  const result: number[] = [];

  for (let i = 0; i < volume.length; i++) {
    if (i < period - 1) {
      result.push(1.0);
      continue;
    }

    const slice = volume.slice(i - period + 1, i + 1);
    const meanVolume = slice.reduce((a, b) => a + b, 0) / period;

    if (zeroMeanPolicy === "EPSILON_DENOMINATOR") {
      result.push(volume[i] / Math.max(meanVolume, 0.000001));
    } else {
      result.push(meanVolume > 0 ? volume[i] / meanVolume : 1.0);
    }
  }

  return result;
}

export function computeTrueRangeSeries(candles: ScannerOhlcvLike[]): number[] {
  const result: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      result.push(candles[0].high - candles[0].low);
      continue;
    }

    result.push(Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close),
    ));
  }
  return result;
}

export function computePreviousHighSeries(
  highs: number[],
  lookback = 20,
): number[] {
  const result: number[] = [];
  for (let i = 0; i < highs.length; i++) {
    if (i < lookback) {
      result.push(highs[i]);
    } else {
      result.push(Math.max(...highs.slice(i - lookback, i)));
    }
  }
  return result;
}
