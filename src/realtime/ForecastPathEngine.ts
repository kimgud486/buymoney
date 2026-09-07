import type { LiveCandle, IndicatorSnapshot, ForecastPoint } from "./types";

/**
 * TechnicalForecastEngine: Heuristic trend & momentum projection based on EMA, RSI, MACD, and ATR.
 * Note: Outputs raw direction scores (directionConfidence), NOT statistically calibrated probability.
 */
export function generateTechnicalForecastPath(
  candles: LiveCandle[],
  indicators: IndicatorSnapshot,
  horizon = 8
): ForecastPoint[] {
  return generateForecastPath(candles, indicators, horizon);
}

/**
 * MLForecastEngine: Inference engine wrapper for ML model output.
 */
export function generateMLForecastPath(
  candles: LiveCandle[],
  indicators: IndicatorSnapshot,
  horizon = 8,
  rawModelScore?: number
): ForecastPoint[] {
  return generateForecastPath(candles, indicators, horizon, rawModelScore);
}

export function generateForecastPath(
  candles: LiveCandle[],
  indicators: IndicatorSnapshot,
  horizon = 8,
  mlProbability?: number
): ForecastPoint[] {
  const last = candles[candles.length - 1];
  if (!last) return [];

  const safeClose = Number.isFinite(last.close) && last.close > 0 ? last.close : 0;
  if (safeClose === 0) return [];

  let projected = safeClose;

  // Technical trend factor: +1 or -1
  const trend =
    Number.isFinite(indicators.ema9) && Number.isFinite(indicators.ema20)
      ? indicators.ema9 > indicators.ema20
        ? 1
        : -1
      : 0;

  // Technical momentum factor: -1 to +1
  const momentum = Number.isFinite(indicators.rsi14)
    ? Math.max(-1, Math.min(1, (indicators.rsi14 - 50) / 25))
    : 0;

  // MACD momentum direction
  const macdMomentum = Number.isFinite(indicators.macdHistogram)
    ? Math.sign(indicators.macdHistogram)
    : 0;

  // Blend with ML probability if provided
  let mlBias = 0;
  if (typeof mlProbability === "number" && Number.isFinite(mlProbability)) {
    mlBias = (mlProbability - 0.5) * 2; // -1 to +1
  }

  // Combined strength score (-1 to +1)
  const strength =
    typeof mlProbability === "number" && Number.isFinite(mlProbability)
      ? trend * 0.25 + momentum * 0.20 + macdMomentum * 0.15 + mlBias * 0.40
      : trend * 0.45 + momentum * 0.30 + macdMomentum * 0.25;

  const safeStrength = Number.isFinite(strength) ? strength : 0;

  const results: ForecastPoint[] = [];
  const safeAtr =
    Number.isFinite(indicators.atr14) && indicators.atr14 > 0
      ? indicators.atr14
      : safeClose * 0.01;

  // Time step in seconds based on recent candle spacing or default 60s
  let stepSec = 60;
  if (candles.length >= 2) {
    const prev = candles[candles.length - 2];
    const diff = Math.abs(last.time - prev.time);
    if (diff > 0 && diff <= 86400) {
      stepSec = diff;
    }
  }

  for (let i = 1; i <= horizon; i++) {
    // Exponential decay of current momentum into the future
    const decay = Math.exp(-0.15 * i);
    const drift = safeAtr * safeStrength * decay * 0.35;
    projected += drift;

    // Uncertainty expands over time via square-root of horizon
    const uncertainty = safeAtr * Math.sqrt(i) * 0.85;

    // Direction score (uncalibrated heuristic score)
    const rawProbUp = 0.5 + safeStrength * 0.28;
    const probabilityUp = Math.max(0.08, Math.min(0.92, Number(rawProbUp.toFixed(3))));
    const probabilityDown = Number((1 - probabilityUp).toFixed(3));

    const predictedVal = Math.round(projected * 100) / 100;
    const upperVal = Math.round((projected + uncertainty) * 100) / 100;
    const lowerVal = Math.round((projected - uncertainty) * 100) / 100;

    if (Number.isFinite(predictedVal) && Number.isFinite(upperVal) && Number.isFinite(lowerVal)) {
      results.push({
        time: last.time + i * stepSec,
        predicted: predictedVal,
        upper: upperVal,
        lower: lowerVal,
        probabilityUp, // Heuristic direction score
        probabilityDown
      });
    }
  }

  return results;
}

