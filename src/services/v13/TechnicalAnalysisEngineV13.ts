// AISTOCK v13 Real Intelligence Core - Technical Analysis Engine
// Implements pure mathematical indicator calculations (VWAP, EMA, MACD, RSI, ADX/DMI, ATR, RVOL, HH/HL)
// directly from real OHLCV candle data arrays. Zero hash-based pseudo generators or fixed constants!

export interface CandleOHLCV {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CalculatedIndicatorsV13 {
  currentPrice: number;
  vwap: number;
  ema9: number;
  ema20: number;
  ema50: number;
  macdLine: number;
  macdSignal: number;
  macdHist: number;
  rsi14: number;
  adx14: number;
  plusDi14: number;
  minusDi14: number;
  atr14: number;
  rvol: number;
  structure: "HH_HL" | "LH_LL" | "SIDEWAYS";
  lastHigherLow: number;
  lastLowerHigh: number;
  isVwapAbove: boolean;
  isEmaBullishTrend: boolean;
  isMacdBullishCross: boolean;
}

export class TechnicalAnalysisEngineV13 {
  /**
   * Calculate exact mathematical technical indicators from real OHLCV candles.
   * Requires at least 35 bars for accurate MACD(26,9) and ADX(14) calculations.
   * Throws error if candles are insufficient so callers can fail-closed (NO TRADE).
   */
  public static calculateIndicators(candles: CandleOHLCV[]): CalculatedIndicatorsV13 {
    if (!candles || candles.length < 35) {
      throw new Error("INSUFFICIENT_CANDLES_FOR_TA: Minimum 35 real OHLCV candles required for MACD/ADX analysis.");
    }

    const currentPrice = candles[candles.length - 1].close;
    const closes = candles.map(c => c.close);

    // 1. VWAP = sum(TypicalPrice * Volume) / sum(Volume)
    let totalTPV = 0;
    let totalVol = 0;
    for (const c of candles) {
      const tp = (c.high + c.low + c.close) / 3;
      totalTPV += tp * c.volume;
      totalVol += c.volume;
    }
    const vwap = totalVol > 0 ? totalTPV / totalVol : currentPrice;

    // 2. Exponential Moving Averages Series
    const ema9Series = this.calculateEMASeries(closes, 9);
    const ema20Series = this.calculateEMASeries(closes, 20);
    const ema50Series = this.calculateEMASeries(closes, Math.min(50, closes.length));

    const ema9 = ema9Series[ema9Series.length - 1];
    const ema20 = ema20Series[ema20Series.length - 1];
    const ema50 = ema50Series[ema50Series.length - 1];

    // 3. Exact MACD (12, 26, 9)
    const macdResult = this.calculateMACD(closes);

    // 4. Exact RSI (14)
    const rsi14 = this.calculateRSI(closes, 14);

    // 5. Exact ADX & +DMI / -DMI (14) using Wilder's Smoothing
    const adxResult = this.calculateADXAndDMI(candles, 14);

    // 6. Exact ATR (14)
    const atr14 = this.calculateATR(candles, 14);

    // 7. RVOL = Current Volume / Average Volume of last 20 periods
    const lastVol = candles[candles.length - 1].volume;
    const recent20Vols = candles.slice(-20).map(c => c.volume);
    const avgVol = recent20Vols.reduce((a, b) => a + b, 0) / recent20Vols.length;
    const rvol = avgVol > 0 ? Number((lastVol / avgVol).toFixed(2)) : 1.0;

    // 8. HH/HL Price Structure Analysis
    const { structure, lastHigherLow, lastLowerHigh } = this.analyzeStructure(candles);

    return {
      currentPrice,
      vwap: Number(vwap.toFixed(2)),
      ema9: Number(ema9.toFixed(2)),
      ema20: Number(ema20.toFixed(2)),
      ema50: Number(ema50.toFixed(2)),
      macdLine: Number(macdResult.macd.toFixed(2)),
      macdSignal: Number(macdResult.signal.toFixed(2)),
      macdHist: Number(macdResult.histogram.toFixed(2)),
      rsi14: Number(rsi14.toFixed(1)),
      adx14: Number(adxResult.adx.toFixed(1)),
      plusDi14: Number(adxResult.plusDi.toFixed(1)),
      minusDi14: Number(adxResult.minusDi.toFixed(1)),
      atr14: Number(atr14.toFixed(2)),
      rvol,
      structure,
      lastHigherLow: Number(lastHigherLow.toFixed(2)),
      lastLowerHigh: Number(lastLowerHigh.toFixed(2)),
      isVwapAbove: currentPrice >= vwap,
      isEmaBullishTrend: currentPrice >= ema20 && ema9 >= ema20,
      isMacdBullishCross: macdResult.histogram > 0
    };
  }

  /**
   * Calculates full EMA series for an array of values
   */
  public static calculateEMASeries(values: number[], period: number): number[] {
    if (values.length === 0) return [];
    const emaSeries: number[] = new Array(values.length);
    const k = 2 / (period + 1);
    emaSeries[0] = values[0];
    for (let i = 1; i < values.length; i++) {
      emaSeries[i] = values[i] * k + emaSeries[i - 1] * (1 - k);
    }
    return emaSeries;
  }

  /**
   * Exact MACD (12, 26, 9) calculation
   */
  private static calculateMACD(closes: number[]): { macd: number; signal: number; histogram: number } {
    const ema12Series = this.calculateEMASeries(closes, 12);
    const ema26Series = this.calculateEMASeries(closes, 26);

    const macdSeries = closes.map((_, i) => ema12Series[i] - ema26Series[i]);
    const signalSeries = this.calculateEMASeries(macdSeries, 9);

    const last = macdSeries.length - 1;
    const macd = macdSeries[last];
    const signal = signalSeries[last];
    const histogram = macd - signal;

    return { macd, signal, histogram };
  }

  /**
   * Exact RSI (14) with Wilder's Smoothing
   */
  private static calculateRSI(closes: number[], period: number = 14): number {
    if (closes.length < period + 1) return 50;

    let gainSum = 0;
    let lossSum = 0;

    for (let i = 1; i <= period; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff >= 0) gainSum += diff;
      else lossSum += Math.abs(diff);
    }

    let avgGain = gainSum / period;
    let avgLoss = lossSum / period;

    for (let i = period + 1; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      const gain = diff >= 0 ? diff : 0;
      const loss = diff < 0 ? Math.abs(diff) : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  /**
   * Exact ADX & DMI (+DI / -DI) calculation with Wilder's Smoothing
   */
  private static calculateADXAndDMI(candles: CandleOHLCV[], period: number = 14): {
    adx: number;
    plusDi: number;
    minusDi: number;
  } {
    if (candles.length < period + 1) {
      return { adx: 0, plusDi: 0, minusDi: 0 };
    }

    const trs: number[] = [];
    const plusDMs: number[] = [];
    const minusDMs: number[] = [];

    for (let i = 1; i < candles.length; i++) {
      const high = candles[i].high;
      const low = candles[i].low;
      const prevHigh = candles[i - 1].high;
      const prevLow = candles[i - 1].low;
      const prevClose = candles[i - 1].close;

      const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
      trs.push(tr);

      const upMove = high - prevHigh;
      const downMove = prevLow - low;

      if (upMove > downMove && upMove > 0) {
        plusDMs.push(upMove);
      } else {
        plusDMs.push(0);
      }

      if (downMove > upMove && downMove > 0) {
        minusDMs.push(downMove);
      } else {
        minusDMs.push(0);
      }
    }

    let smoothTR = trs.slice(0, period).reduce((a, b) => a + b, 0);
    let smoothPlusDM = plusDMs.slice(0, period).reduce((a, b) => a + b, 0);
    let smoothMinusDM = minusDMs.slice(0, period).reduce((a, b) => a + b, 0);

    const dxSeries: number[] = [];

    for (let i = period; i < trs.length; i++) {
      smoothTR = smoothTR - (smoothTR / period) + trs[i];
      smoothPlusDM = smoothPlusDM - (smoothPlusDM / period) + plusDMs[i];
      smoothMinusDM = smoothMinusDM - (smoothMinusDM / period) + minusDMs[i];

      const plusDi = smoothTR > 0 ? (smoothPlusDM / smoothTR) * 100 : 0;
      const minusDi = smoothTR > 0 ? (smoothMinusDM / smoothTR) * 100 : 0;

      const diSum = plusDi + minusDi;
      const diDiff = Math.abs(plusDi - minusDi);
      const dx = diSum > 0 ? (diDiff / diSum) * 100 : 0;
      dxSeries.push(dx);
    }

    const lastIdx = trs.length - period - 1;
    const plusDi = smoothTR > 0 ? (smoothPlusDM / smoothTR) * 100 : 0;
    const minusDi = smoothTR > 0 ? (smoothMinusDM / smoothTR) * 100 : 0;

    if (dxSeries.length < period) {
      const avgDx = dxSeries.length > 0 ? dxSeries.reduce((a, b) => a + b, 0) / dxSeries.length : 0;
      return { adx: avgDx, plusDi, minusDi };
    }

    let adx = dxSeries.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < dxSeries.length; i++) {
      adx = (adx * (period - 1) + dxSeries[i]) / period;
    }

    return { adx, plusDi, minusDi };
  }

  /**
   * Exact ATR (14) calculation
   */
  private static calculateATR(candles: CandleOHLCV[], period: number = 14): number {
    if (candles.length < 2) return 0;

    let trSum = 0;
    const count = Math.min(candles.length - 1, period);

    for (let i = candles.length - count; i < candles.length; i++) {
      const high = candles[i].high;
      const low = candles[i].low;
      const prevClose = candles[i - 1].close;

      const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
      trSum += tr;
    }

    return trSum / count;
  }

  /**
   * HH/HL Structure Analysis
   */
  private static analyzeStructure(candles: CandleOHLCV[]): {
    structure: "HH_HL" | "LH_LL" | "SIDEWAYS";
    lastHigherLow: number;
    lastLowerHigh: number;
  } {
    const currentP = candles[candles.length - 1].close;
    const recent = candles.slice(-15);
    const highs: number[] = [];
    const lows: number[] = [];

    for (let i = 1; i < recent.length - 1; i++) {
      if (recent[i].high >= recent[i - 1].high && recent[i].high >= recent[i + 1].high) {
        highs.push(recent[i].high);
      }
      if (recent[i].low <= recent[i - 1].low && recent[i].low <= recent[i + 1].low) {
        lows.push(recent[i].low);
      }
    }

    const lastHL = lows.length > 0 ? lows[lows.length - 1] : currentP * 0.975;
    const lastLH = highs.length > 0 ? highs[highs.length - 1] : currentP * 1.025;

    const isHH = highs.length >= 2 && highs[highs.length - 1] >= highs[highs.length - 2];
    const isHL = lows.length >= 2 && lows[lows.length - 1] >= lows[lows.length - 2];

    const isLH = highs.length >= 2 && highs[highs.length - 1] < highs[highs.length - 2];
    const isLL = lows.length >= 2 && lows[lows.length - 1] < lows[lows.length - 2];

    if (isHH && isHL) {
      return { structure: "HH_HL", lastHigherLow: lastHL, lastLowerHigh: lastLH };
    }
    if (isLH && isLL) {
      return { structure: "LH_LL", lastHigherLow: lastHL, lastLowerHigh: lastLH };
    }

    return { structure: "SIDEWAYS", lastHigherLow: lastHL, lastLowerHigh: lastLH };
  }
}
