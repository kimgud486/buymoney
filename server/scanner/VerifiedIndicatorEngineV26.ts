import type { VerifiedSignalCandidate } from "../../src/autonomous/OpenSourceSignalEnsemble";

export type ScannerMarketV26 = "KOREA" | "US" | "BTC";

export interface VerifiedCandleV26 {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface VerifiedCandleBatchV26 {
  symbol: string;
  name: string;
  market: ScannerMarketV26;
  source: string;
  receivedAt: number;
  candles: VerifiedCandleV26[];
}

export interface CandleVerificationOptionsV26 {
  minBars?: number;
  maxLastBarAgeMs?: number;
  now?: number;
}

export interface CandleVerificationResultV26 {
  verified: boolean;
  reasons: string[];
  lastMarketTimestamp?: number;
}

const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/**
 * Validates exchange/feed candles before any indicator calculation.
 * This intentionally rejects incomplete or stale data instead of fabricating bars.
 */
export function verifyCandleBatchV26(
  batch: VerifiedCandleBatchV26,
  options: CandleVerificationOptionsV26 = {},
): CandleVerificationResultV26 {
  const reasons: string[] = [];
  const minBars = Math.max(30, options.minBars ?? 30);
  const maxAge = Math.max(1_000, options.maxLastBarAgeMs ?? 5 * 60_000);
  const now = options.now ?? Date.now();

  if (!batch.source.trim()) reasons.push("DATA_SOURCE_REQUIRED");
  if (!finite(batch.receivedAt) || batch.receivedAt <= 0) reasons.push("INVALID_RECEIVED_AT");
  if (!Array.isArray(batch.candles) || batch.candles.length < minBars) {
    reasons.push(`INSUFFICIENT_BARS_${batch.candles?.length ?? 0}_OF_${minBars}`);
  }

  let previousTimestamp = -Infinity;
  for (let i = 0; i < batch.candles.length; i += 1) {
    const candle = batch.candles[i];
    if (
      !finite(candle.timestamp) ||
      !finite(candle.open) ||
      !finite(candle.high) ||
      !finite(candle.low) ||
      !finite(candle.close) ||
      !finite(candle.volume)
    ) {
      reasons.push(`NON_FINITE_CANDLE_${i}`);
      continue;
    }

    if (candle.timestamp <= previousTimestamp) reasons.push(`NON_MONOTONIC_TIMESTAMP_${i}`);
    previousTimestamp = candle.timestamp;

    if (candle.open <= 0 || candle.high <= 0 || candle.low <= 0 || candle.close <= 0) {
      reasons.push(`NON_POSITIVE_PRICE_${i}`);
    }
    if (candle.volume < 0) reasons.push(`NEGATIVE_VOLUME_${i}`);
    if (candle.high < Math.max(candle.open, candle.close, candle.low)) {
      reasons.push(`INVALID_HIGH_${i}`);
    }
    if (candle.low > Math.min(candle.open, candle.close, candle.high)) {
      reasons.push(`INVALID_LOW_${i}`);
    }
  }

  const last = batch.candles.at(-1);
  if (last && finite(last.timestamp)) {
    const age = now - last.timestamp;
    if (age < -30_000) reasons.push("LAST_BAR_FROM_FUTURE");
    if (age > maxAge) reasons.push("LAST_BAR_STALE");
  }

  if (finite(batch.receivedAt)) {
    const receiveAge = now - batch.receivedAt;
    if (receiveAge < -30_000) reasons.push("RECEIVED_AT_FROM_FUTURE");
    if (receiveAge > maxAge) reasons.push("FEED_BATCH_STALE");
  }

  return {
    verified: reasons.length === 0,
    reasons: Array.from(new Set(reasons)),
    lastMarketTimestamp: last?.timestamp,
  };
}

function wilderAverage(values: number[], period: number): number[] {
  if (values.length < period) return [];
  const result: number[] = [];
  let average = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  result.push(average);
  for (let i = period; i < values.length; i += 1) {
    average = (average * (period - 1) + values[i]) / period;
    result.push(average);
  }
  return result;
}

export function computeRsiWilderV26(candles: VerifiedCandleV26[], period = 14): number {
  if (candles.length < period + 1) throw new Error("RSI_INSUFFICIENT_BARS");
  const gains: number[] = [];
  const losses: number[] = [];
  for (let i = 1; i < candles.length; i += 1) {
    const delta = candles[i].close - candles[i - 1].close;
    gains.push(Math.max(delta, 0));
    losses.push(Math.max(-delta, 0));
  }
  const avgGains = wilderAverage(gains, period);
  const avgLosses = wilderAverage(losses, period);
  const avgGain = avgGains.at(-1) ?? 0;
  const avgLoss = avgLosses.at(-1) ?? 0;
  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function computeAtrWilderV26(candles: VerifiedCandleV26[], period = 14): number {
  if (candles.length < period + 1) throw new Error("ATR_INSUFFICIENT_BARS");
  const trueRanges: number[] = [];
  for (let i = 1; i < candles.length; i += 1) {
    const current = candles[i];
    const previousClose = candles[i - 1].close;
    trueRanges.push(
      Math.max(
        current.high - current.low,
        Math.abs(current.high - previousClose),
        Math.abs(current.low - previousClose),
      ),
    );
  }
  const smoothed = wilderAverage(trueRanges, period);
  const atr = smoothed.at(-1);
  if (!finite(atr) || atr <= 0) throw new Error("ATR_INVALID");
  return atr;
}

export function computeRvolV26(candles: VerifiedCandleV26[], lookback = 20): number {
  if (candles.length < lookback + 1) throw new Error("RVOL_INSUFFICIENT_BARS");
  const currentVolume = candles.at(-1)?.volume ?? 0;
  const previous = candles.slice(-(lookback + 1), -1);
  const average = previous.reduce((sum, candle) => sum + candle.volume, 0) / previous.length;
  if (!finite(average) || average <= 0) throw new Error("RVOL_BASELINE_INVALID");
  return currentVolume / average;
}

/** Standard Wilder-style ADX using high/low/close directional movement. */
export function computeAdxWilderV26(candles: VerifiedCandleV26[], period = 14): number {
  if (candles.length < period * 2 + 1) throw new Error("ADX_INSUFFICIENT_BARS");

  const tr: number[] = [];
  const plusDm: number[] = [];
  const minusDm: number[] = [];

  for (let i = 1; i < candles.length; i += 1) {
    const current = candles[i];
    const previous = candles[i - 1];
    const upMove = current.high - previous.high;
    const downMove = previous.low - current.low;

    plusDm.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDm.push(downMove > upMove && downMove > 0 ? downMove : 0);
    tr.push(
      Math.max(
        current.high - current.low,
        Math.abs(current.high - previous.close),
        Math.abs(current.low - previous.close),
      ),
    );
  }

  const smoothedTr = wilderAverage(tr, period);
  const smoothedPlus = wilderAverage(plusDm, period);
  const smoothedMinus = wilderAverage(minusDm, period);
  const dx: number[] = [];

  for (let i = 0; i < smoothedTr.length; i += 1) {
    const trValue = smoothedTr[i];
    if (!finite(trValue) || trValue <= 0) {
      dx.push(0);
      continue;
    }
    const plusDi = 100 * (smoothedPlus[i] / trValue);
    const minusDi = 100 * (smoothedMinus[i] / trValue);
    const denominator = plusDi + minusDi;
    dx.push(denominator === 0 ? 0 : 100 * Math.abs(plusDi - minusDi) / denominator);
  }

  const adxSeries = wilderAverage(dx, period);
  const adx = adxSeries.at(-1);
  if (!finite(adx)) throw new Error("ADX_INVALID");
  return Math.max(0, Math.min(100, adx));
}

export interface BuildVerifiedSignalOptionsV26 {
  maxLastBarAgeMs?: number;
  minimumBars?: number;
}

/**
 * Builds a provenance-stamped candidate directly from verified candles.
 * It never invents indicator values or prices.
 */
export function buildVerifiedSignalCandidateV26(
  batch: VerifiedCandleBatchV26,
  options: BuildVerifiedSignalOptionsV26 = {},
): VerifiedSignalCandidate {
  const verification = verifyCandleBatchV26(batch, {
    minBars: options.minimumBars ?? 30,
    maxLastBarAgeMs: options.maxLastBarAgeMs,
  });
  if (!verification.verified) {
    throw new Error(`MARKET_DATA_VERIFICATION_FAILED:${verification.reasons.join("|")}`);
  }

  const price = batch.candles.at(-1)?.close;
  if (!finite(price) || price <= 0) throw new Error("CURRENT_PRICE_INVALID");

  const rsi = computeRsiWilderV26(batch.candles, 14);
  const rvol = computeRvolV26(batch.candles, 20);
  const atr = computeAtrWilderV26(batch.candles, 14);
  const adx = computeAdxWilderV26(batch.candles, 14);
  const atrPct = (atr / price) * 100;

  const previous20 = batch.candles.slice(-21, -1);
  const previous20High = Math.max(...previous20.map((candle) => candle.high));
  const breakout = price > previous20High;
  const stop = Math.max(0.000001, price - atr * 1.5);
  const risk = price - stop;
  const target1 = price + risk * 2.2;
  const target2 = price + risk * 3.2;

  let grade: "S" | "A+" | "A" | "B" | "NO_SETUP" = "B";
  if (breakout && adx >= 25 && rvol >= 2 && rsi >= 45 && rsi <= 68) grade = "S";
  else if (adx >= 25 && rvol >= 1.5 && rsi >= 45 && rsi <= 68) grade = "A+";
  else if (adx >= 20 && rvol >= 1.2 && rsi >= 40 && rsi <= 70) grade = "A";
  else if (adx < 15 || rvol < 0.8) grade = "NO_SETUP";

  const bullishReasons: string[] = [];
  const riskReasons: string[] = [];
  if (breakout) bullishReasons.push("VERIFIED_20_BAR_BREAKOUT");
  if (adx >= 20) bullishReasons.push(`VERIFIED_ADX_${adx.toFixed(1)}`);
  else riskReasons.push(`WEAK_ADX_${adx.toFixed(1)}`);
  if (rvol >= 1.2) bullishReasons.push(`VERIFIED_RVOL_${rvol.toFixed(2)}X`);
  else riskReasons.push(`LOW_RVOL_${rvol.toFixed(2)}X`);
  if (rsi > 70) riskReasons.push(`RSI_OVERBOUGHT_${rsi.toFixed(1)}`);

  return {
    id: `verified-${batch.market}-${batch.symbol}-${verification.lastMarketTimestamp}`,
    symbol: batch.symbol,
    name: batch.name,
    market: batch.market,
    price,
    stop,
    target1,
    target2,
    entryLow: Math.max(stop, price - atr * 0.25),
    entryHigh: price + atr * 0.1,
    rsi,
    rvol,
    adx,
    atrPct,
    grade,
    pattern: breakout ? "VERIFIED_BREAKOUT_20" : "VERIFIED_TREND_MOMENTUM",
    bullishReasons,
    riskReasons,
    changePct: 0,
    score: 0,
    decision: "WATCH",
    thesis: "Verified candle/indicator candidate for ensemble evaluation",
    invalidation: `close below ${stop}`,
    wouldBuy: false,
    scannedAt: new Date().toISOString(),
    marketDataVerified: true,
    indicatorDataVerified: true,
    dataSource: batch.source,
    marketTimestamp: new Date(verification.lastMarketTimestamp as number).toISOString(),
  };
}
