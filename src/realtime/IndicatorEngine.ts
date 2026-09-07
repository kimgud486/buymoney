import type { LiveCandle, IndicatorSnapshot } from "./types";

export class IndicatorEngine {
  /**
   * Calculates standard EMA series for an array of numbers.
   */
  public static calcEMASeries(values: number[], period: number): number[] {
    if (values.length < period) return [];

    const result: number[] = [];
    const k = 2 / (period + 1);

    const initialSMA = values.slice(0, period).reduce((a, b) => a + b, 0) / period;

    for (let i = 0; i < period - 1; i++) {
      result.push(Number.NaN);
    }

    result.push(initialSMA);
    let ema = initialSMA;

    for (let i = period; i < values.length; i++) {
      ema = values[i] * k + ema * (1 - k);
      result.push(ema);
    }

    return result;
  }

  /**
   * Calculates comprehensive technical indicators from a list of candles.
   */
  public static calculate(
    candles: LiveCandle[],
    getSessionKey?: (c: LiveCandle) => string
  ): IndicatorSnapshot {
    if (!candles || candles.length === 0) {
      return {
        ema9: Number.NaN,
        ema20: Number.NaN,
        ema50: Number.NaN,
        ema200: Number.NaN,
        vwap: Number.NaN,
        rsi14: Number.NaN,
        macd: Number.NaN,
        macdSignal: Number.NaN,
        macdHistogram: Number.NaN,
        atr14: Number.NaN,
        rvol: 1.0,
        trendStrength: 0,
        bollingerUpper: Number.NaN,
        bollingerMiddle: Number.NaN,
        bollingerLower: Number.NaN,
        indicatorsReady: false,
        warmupReason: "NO_CANDLES_PROVIDED"
      };
    }

    const closes = candles.map((c) => c.close);
    const lastClose = closes[closes.length - 1];

    // EMA calculations
    const ema9 = this.calcEMA(closes, 9);
    const ema20 = this.calcEMA(closes, 20);
    const ema50 = this.calcEMA(closes, 50);

    // EMA 200 with strict warm-up validation (must have >= 200 bars)
    const ema200 = closes.length >= 200 ? this.calcEMA(closes, 200) : Number.NaN;

    // Session VWAP (resets at each new session key)
    const vwap = this.calculateSessionVWAP(candles, getSessionKey);

    // RSI (14 Wilder)
    const rsi14 = this.calcRSI(closes, 14);

    // Standard MACD (12, 26, 9)
    const { macd, signal, hist } = this.calcMACD(closes);

    // ATR (14 Wilder)
    const atr14 = this.calcATR(candles, 14);

    // RVOL V2: Exclude current active/closed bar from baseline denominator
    const completedCandles = candles.slice(0, candles.length - 1);
    const recent20 = completedCandles.slice(-20);
    const avgVol =
      recent20.length > 0
        ? recent20.reduce((a, b) => a + (b.volume || 0), 0) / recent20.length
        : 0;
    const currentVol = candles[candles.length - 1].volume || 0;
    const rvol = avgVol > 0 ? Number((currentVol / avgVol).toFixed(2)) : 1.0;

    // RVOL V3: Time-of-Day (TOD) normalized RVOL
    const lastTime = candles[candles.length - 1].time || (candles[candles.length - 1] as any).timestamp;
    let todWeight = 1.0;
    if (lastTime) {
      const dt = new Date(typeof lastTime === "number" && lastTime < 1e11 ? lastTime * 1000 : lastTime);
      const minutesFromOpen = (dt.getUTCHours() + 9) * 60 + dt.getUTCMinutes() - (9 * 60); // KST 09:00
      if (minutesFromOpen >= 0 && minutesFromOpen <= 390) {
        if (minutesFromOpen < 30) todWeight = 1.8;
        else if (minutesFromOpen < 60) todWeight = 1.3;
        else if (minutesFromOpen < 240) todWeight = 0.7;
        else if (minutesFromOpen < 330) todWeight = 0.9;
        else todWeight = 1.5;
      }
    }
    const todRvol = avgVol > 0 ? Number((currentVol / (avgVol * todWeight)).toFixed(2)) : rvol;

    // Bollinger Bands (20, 2)
    const slice20 = closes.slice(-20);
    const sma20 = slice20.reduce((a, b) => a + b, 0) / Math.max(1, slice20.length);
    const variance =
      slice20.reduce((acc, p) => acc + Math.pow(p - sma20, 2), 0) / Math.max(1, slice20.length);
    const stdDev = Math.sqrt(variance);
    const bollingerUpper = Math.round((sma20 + 2 * stdDev) * 100) / 100;
    const bollingerLower = Math.round((sma20 - 2 * stdDev) * 100) / 100;

    // Trend Strength (-1 to +1)
    const trendDir = ema9 > ema20 ? 1 : -1;
    const rsiScore = Number.isFinite(rsi14) ? (rsi14 - 50) / 50 : 0;
    const macdScore =
      Number.isFinite(hist) && Number.isFinite(atr14) && atr14 > 0
        ? Math.max(-1, Math.min(1, hist / (atr14 * 0.5)))
        : 0;
    const trendStrength = Math.max(-1, Math.min(1, trendDir * 0.4 + rsiScore * 0.3 + macdScore * 0.3));

    // Indicators ready check (requires >= 220 bars and finite EMA200, MACD, and Signal)
    const indicatorsReady =
      closes.length >= 220 &&
      Number.isFinite(ema200) &&
      Number.isFinite(macd) &&
      Number.isFinite(signal);

    const warmupReason = !indicatorsReady
      ? `INDICATOR_WARMUP_NOT_COMPLETE (bars: ${closes.length}/220 required, ema200: ${
          Number.isFinite(ema200) ? "VALID" : "NaN"
        })`
      : undefined;

    return {
      ema9,
      ema20,
      ema50,
      ema200,
      vwap,
      rsi14,
      macd,
      macdSignal: signal,
      macdHistogram: hist,
      atr14,
      rvol,
      todRvol,
      trendStrength,
      bollingerUpper,
      bollingerMiddle: Math.round(sma20 * 100) / 100,
      bollingerLower,
      indicatorsReady,
      warmupReason
    };
  }

  public static calcEMA(prices: number[], period: number): number {
    if (prices.length < period) return Number.NaN;
    const series = this.calcEMASeries(prices, period);
    const val = series[series.length - 1];
    return Number.isFinite(val) ? Math.round(val * 100) / 100 : Number.NaN;
  }

  public static calcRSI(prices: number[], period = 14): number {
    if (prices.length < period + 1) return Number.NaN;

    let gains = 0;
    let losses = 0;
    for (let i = 1; i <= period; i++) {
      const diff = prices[i] - prices[i - 1];
      if (diff >= 0) gains += diff;
      else losses -= diff;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period + 1; i < prices.length; i++) {
      const diff = prices[i] - prices[i - 1];
      if (diff >= 0) {
        avgGain = (avgGain * (period - 1) + diff) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) - diff) / period;
      }
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return Math.round((100 - 100 / (1 + rs)) * 100) / 100;
  }

  public static calcMACD(prices: number[]): { macd: number; signal: number; hist: number } {
    if (prices.length < 35) {
      return { macd: Number.NaN, signal: Number.NaN, hist: Number.NaN };
    }

    const ema12Series = this.calcEMASeries(prices, 12);
    const ema26Series = this.calcEMASeries(prices, 26);

    const macdSeries: number[] = [];

    for (let i = 25; i < prices.length; i++) {
      const fast = ema12Series[i];
      const slow = ema26Series[i];
      if (Number.isFinite(fast) && Number.isFinite(slow)) {
        macdSeries.push(fast - slow);
      }
    }

    if (macdSeries.length < 9) {
      return { macd: Number.NaN, signal: Number.NaN, hist: Number.NaN };
    }

    const signalSeries = this.calcEMASeries(macdSeries, 9);

    const macd = macdSeries[macdSeries.length - 1];
    const signal = signalSeries[signalSeries.length - 1];
    const hist = macd - signal;

    return {
      macd: Number.isFinite(macd) ? Number(macd.toFixed(4)) : Number.NaN,
      signal: Number.isFinite(signal) ? Number(signal.toFixed(4)) : Number.NaN,
      hist: Number.isFinite(hist) ? Number(hist.toFixed(4)) : Number.NaN
    };
  }

  public static calcATR(candles: LiveCandle[], period = 14): number {
    if (candles.length < period + 1) return Number.NaN;

    const trs: number[] = [];
    for (let i = 1; i < candles.length; i++) {
      const c = candles[i];
      const prevClose = candles[i - 1].close;
      const tr = Math.max(
        c.high - c.low,
        Math.abs(c.high - prevClose),
        Math.abs(c.low - prevClose)
      );
      trs.push(tr);
    }

    let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < trs.length; i++) {
      atr = (atr * (period - 1) + trs[i]) / period;
    }

    return Math.round(atr * 100) / 100;
  }

  public static calculateSessionVWAP(
    candles: LiveCandle[],
    getSessionKey?: (c: LiveCandle) => string
  ): number {
    if (!candles || candles.length === 0) return Number.NaN;

    let session = "";
    let cumulativeVolume = 0;
    let cumulativePV = 0;

    const defaultKeyFn = (c: LiveCandle) => {
      if (c.sessionKey) return c.sessionKey;
      const tsMs = c.time > 1e11 ? c.time : c.time * 1000;
      const date = new Date(tsMs);
      return `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`;
    };

    const keyFn = getSessionKey || defaultKeyFn;

    for (const candle of candles) {
      const key = keyFn(candle);

      if (key !== session) {
        session = key;
        cumulativeVolume = 0;
        cumulativePV = 0;
      }

      if (candle.volume > 0 && Number.isFinite(candle.volume)) {
        const typical = (candle.high + candle.low + candle.close) / 3;
        cumulativeVolume += candle.volume;
        cumulativePV += typical * candle.volume;
      }
    }

    return cumulativeVolume > 0
      ? Math.round((cumulativePV / cumulativeVolume) * 100) / 100
      : candles[candles.length - 1].close;
  }
}
