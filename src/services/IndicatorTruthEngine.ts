// ----------------------------------------------------------------------
// INDICATOR TRUTH ENGINE (V14.1)
// Pure Mathematical Calculation of Technical Indicators from Real OHLCV
// ----------------------------------------------------------------------

import { Candle } from "./StructureBrain";

export interface MACDResult {
  line: number | null;
  signal: number | null;
  histogram: number | null;
}

export interface DMIResult {
  plusDI: number | null;
  minusDI: number | null;
  adx: number | null;
}

export interface BollingerBandsResult {
  upper: number | null;
  middle: number | null;
  lower: number | null;
}

export interface IndicatorSnapshot {
  vwap: number | null;
  rvol: number | null;
  ema9: number | null;
  ema20: number | null;
  ema50: number | null;
  ema200: number | null;
  sma20: number | null;
  rsi14: number | null;
  macd: MACDResult;
  dmi: DMIResult;
  atr14: number | null;
  bollinger: BollingerBandsResult;
  obv: number | null;
}

export class IndicatorTruthEngine {
  /**
   * Helper: Calculate Exponential Moving Average (EMA) array
   */
  public static ema(values: number[], period: number): number[] {
    if (values.length < period || period <= 0) return [];
    const k = 2 / (period + 1);
    const result: number[] = [];
    let current = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
    result.push(current);

    for (let i = period; i < values.length; i++) {
      current = values[i] * k + current * (1 - k);
      result.push(current);
    }
    return result;
  }

  /**
   * Helper: Calculate Simple Moving Average (SMA)
   */
  public static sma(values: number[], period: number): number | null {
    if (values.length < period || period <= 0) return null;
    const slice = values.slice(-period);
    const sum = slice.reduce((a, b) => a + b, 0);
    return sum / period;
  }

  /**
   * True MACD Calculation (12, 26, 9)
   */
  public static calculateMACD(closes: number[]): MACDResult {
    if (closes.length < 35) {
      return { line: null, signal: null, histogram: null };
    }

    const ema12 = this.ema(closes, 12);
    const ema26 = this.ema(closes, 26);

    if (!ema12.length || !ema26.length) {
      return { line: null, signal: null, histogram: null };
    }

    const offset = ema12.length - ema26.length;
    const macdLine = ema26.map((v, i) => ema12[i + offset] - v);

    const signalLine = this.ema(macdLine, 9);
    if (!signalLine.length) {
      return { line: null, signal: null, histogram: null };
    }

    const line = macdLine[macdLine.length - 1];
    const signal = signalLine[signalLine.length - 1];
    const histogram = line - signal;

    return {
      line: +line.toFixed(4),
      signal: +signal.toFixed(4),
      histogram: +histogram.toFixed(4)
    };
  }

  /**
   * True Wilder DMI & ADX Calculation (14 period)
   */
  public static calculateDMI(candles: Candle[], period = 14): DMIResult {
    if (candles.length < period * 2) {
      return { plusDI: null, minusDI: null, adx: null };
    }

    const tr: number[] = [];
    const plusDM: number[] = [];
    const minusDM: number[] = [];

    for (let i = 1; i < candles.length; i++) {
      const c = candles[i];
      const prev = candles[i - 1];

      tr.push(
        Math.max(
          c.high - c.low,
          Math.abs(c.high - prev.close),
          Math.abs(c.low - prev.close)
        )
      );

      const upMove = c.high - prev.high;
      const downMove = prev.low - c.low;

      plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
      minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    }

    const smooth = (values: number[], p: number) => {
      let value = values.slice(0, p).reduce((a, b) => a + b, 0);
      const out = [value];
      for (let i = p; i < values.length; i++) {
        value = value - value / p + values[i];
        out.push(value);
      }
      return out;
    };

    const trSmooth = smooth(tr, period);
    const plusSmooth = smooth(plusDM, period);
    const minusSmooth = smooth(minusDM, period);

    const dx: number[] = [];
    let latestPlusDI = 0;
    let latestMinusDI = 0;

    for (let i = 0; i < trSmooth.length; i++) {
      const atr = trSmooth[i];
      if (atr <= 0) continue;

      latestPlusDI = 100 * (plusSmooth[i] / atr);
      latestMinusDI = 100 * (minusSmooth[i] / atr);

      const denom = latestPlusDI + latestMinusDI;
      if (denom > 0) {
        dx.push((100 * Math.abs(latestPlusDI - latestMinusDI)) / denom);
      }
    }

    if (dx.length < period) {
      return {
        plusDI: +latestPlusDI.toFixed(2),
        minusDI: +latestMinusDI.toFixed(2),
        adx: null
      };
    }

    const adx = dx.slice(-period).reduce((a, b) => a + b, 0) / period;

    return {
      plusDI: +latestPlusDI.toFixed(2),
      minusDI: +latestMinusDI.toFixed(2),
      adx: +adx.toFixed(2)
    };
  }

  /**
   * True RSI Calculation (14 period)
   */
  public static calculateRSI(closes: number[], period = 14): number | null {
    if (closes.length <= period) return null;

    let gains = 0;
    let losses = 0;
    for (let i = 1; i <= period; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff >= 0) gains += diff;
      else losses -= diff;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period + 1; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
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
    return +(100 - 100 / (1 + rs)).toFixed(2);
  }

  /**
   * True ATR Calculation (14 period)
   */
  public static calculateATR(candles: Candle[], period = 14): number | null {
    if (candles.length <= period) return null;

    const tr: number[] = [];
    for (let i = 1; i < candles.length; i++) {
      const c = candles[i];
      const prev = candles[i - 1];
      tr.push(
        Math.max(
          c.high - c.low,
          Math.abs(c.high - prev.close),
          Math.abs(c.low - prev.close)
        )
      );
    }

    let atr = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < tr.length; i++) {
      atr = (atr * (period - 1) + tr[i]) / period;
    }
    return +atr.toFixed(2);
  }

  /**
   * Bollinger Bands (20, 2)
   */
  public static calculateBollingerBands(closes: number[], period = 20, multiplier = 2): BollingerBandsResult {
    if (closes.length < period) {
      return { upper: null, middle: null, lower: null };
    }

    const middle = this.sma(closes, period);
    if (middle === null) return { upper: null, middle: null, lower: null };

    const slice = closes.slice(-period);
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - middle, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    return {
      upper: +(middle + multiplier * stdDev).toFixed(2),
      middle: +middle.toFixed(2),
      lower: +(middle - multiplier * stdDev).toFixed(2)
    };
  }

  /**
   * RVOL V2 Calculation: Excludes current active candle from baseline volume average
   */
  public static calculateRVOL(candles: Candle[], baseline = 20): number | null {
    if (!candles || candles.length < baseline + 1) {
      return null;
    }
    const current = candles[candles.length - 1];
    const historical = candles.slice(-(baseline + 1), -1);
    const avgVolume = historical.reduce((sum, c) => sum + c.volume, 0) / historical.length;
    if (avgVolume <= 0) return null;
    return +(current.volume / avgVolume).toFixed(2);
  }

  /**
   * Session VWAP: Resets cumulative Typical Price * Volume at session start
   */
  public static calculateSessionVWAP(candles: Candle[], sessionStartTimestamp?: number): number | null {
    if (!candles || candles.length === 0) return null;

    let targetCandles = candles;
    if (sessionStartTimestamp && sessionStartTimestamp > 0) {
      targetCandles = candles.filter((c) => Number(c.timestamp) >= sessionStartTimestamp);
    }

    if (!targetCandles.length) return null;

    let sumPV = 0;
    let sumV = 0;
    for (const c of targetCandles) {
      const tp = (c.high + c.low + c.close) / 3;
      sumPV += tp * c.volume;
      sumV += c.volume;
    }
    return sumV > 0 ? +(sumPV / sumV).toFixed(2) : null;
  }

  /**
   * On-Balance Volume (OBV)
   */
  public static calculateOBV(candles: Candle[]): number | null {
    if (candles.length === 0) return null;

    let obv = 0;
    for (let i = 1; i < candles.length; i++) {
      if (candles[i].close > candles[i - 1].close) {
        obv += candles[i].volume;
      } else if (candles[i].close < candles[i - 1].close) {
        obv -= candles[i].volume;
      }
    }
    return obv;
  }

  /**
   * Complete Snapshot Calculation
   */
  public static computeSnapshot(candles: Candle[], sessionStartTimestamp?: number): IndicatorSnapshot {
    if (!candles || candles.length < 10) {
      return {
        vwap: null,
        rvol: null,
        ema9: null,
        ema20: null,
        ema50: null,
        ema200: null,
        sma20: null,
        rsi14: null,
        macd: { line: null, signal: null, histogram: null },
        dmi: { plusDI: null, minusDI: null, adx: null },
        atr14: null,
        bollinger: { upper: null, middle: null, lower: null },
        obv: null
      };
    }

    const closes = candles.map((c) => c.close);

    const vwap = this.calculateSessionVWAP(candles, sessionStartTimestamp);
    const rvol = this.calculateRVOL(candles, 20);

    const ema9Arr = this.ema(closes, 9);
    const ema20Arr = this.ema(closes, 20);
    const ema50Arr = this.ema(closes, 50);
    const ema200Arr = this.ema(closes, 200);

    const ema9 = ema9Arr.length ? +ema9Arr[ema9Arr.length - 1].toFixed(2) : null;
    const ema20 = ema20Arr.length ? +ema20Arr[ema20Arr.length - 1].toFixed(2) : null;
    const ema50 = ema50Arr.length ? +ema50Arr[ema50Arr.length - 1].toFixed(2) : null;
    const ema200 = ema200Arr.length ? +ema200Arr[ema200Arr.length - 1].toFixed(2) : null;

    const sma20Val = this.sma(closes, 20);
    const sma20 = sma20Val !== null ? +sma20Val.toFixed(2) : null;

    const rsi14 = this.calculateRSI(closes, 14);
    const macd = this.calculateMACD(closes);
    const dmi = this.calculateDMI(candles, 14);
    const atr14 = this.calculateATR(candles, 14);
    const bollinger = this.calculateBollingerBands(closes, 20, 2);
    const obv = this.calculateOBV(candles);

    return {
      vwap,
      rvol,
      ema9,
      ema20,
      ema50,
      ema200,
      sma20,
      rsi14,
      macd,
      dmi,
      atr14,
      bollinger,
      obv
    };
  }
}
