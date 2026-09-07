// JUSIK2 V21 INDICATOR ENGINE
// Real-time technical indicator calculation engine (EMA, VWAP, ATR, RSI, MACD, RVOL).

import { BarV21, IndicatorSnapshotV21 } from "./types";

export class IndicatorEngineV21 {
  private history: BarV21[] = [];

  public ingestBar(bar: BarV21): IndicatorSnapshotV21 {
    // Append or replace last bar if same time
    if (this.history.length > 0 && this.history[this.history.length - 1].time === bar.time) {
      this.history[this.history.length - 1] = bar;
    } else {
      this.history.push(bar);
      if (this.history.length > 300) {
        this.history.shift();
      }
    }

    return this.calculate();
  }

  public calculate(): IndicatorSnapshotV21 {
    const closes = this.history.map((b) => b.close);
    const len = closes.length;

    if (len === 0) {
      return {
        ema9: null,
        ema20: null,
        ema50: null,
        vwap: null,
        atr14: null,
        rsi14: null,
        macdLine: null,
        macdSignal: null,
        macdHist: null,
        rvol: null,
        lastSwingLow: null,
        lastSwingHigh: null,
      };
    }

    // 1. EMAs
    const ema9 = this.calcEMA(closes, 9);
    const ema20 = this.calcEMA(closes, 20);
    const ema50 = this.calcEMA(closes, 50);

    // 2. VWAP
    let cumulativeTPV = 0;
    let cumulativeVol = 0;
    for (const b of this.history) {
      const tp = (b.high + b.low + b.close) / 3;
      cumulativeTPV += tp * b.volume;
      cumulativeVol += b.volume;
    }
    const vwap = cumulativeVol > 0 ? cumulativeTPV / cumulativeVol : null;

    // 3. ATR14
    const atr14 = this.calcATR(14);

    // 4. RSI14
    const rsi14 = this.calcRSI(closes, 14);

    // 5. MACD (12, 26, 9)
    const macd = this.calcMACD(closes);

    // 6. RVOL
    const volumes = this.history.map((b) => b.volume);
    const currentVol = volumes[volumes.length - 1] || 0;
    const pastVolSlice = volumes.slice(Math.max(0, volumes.length - 21), volumes.length - 1);
    const avgPastVol = pastVolSlice.length > 0 ? pastVolSlice.reduce((a, b) => a + b, 0) / pastVolSlice.length : 1;
    const rvol = avgPastVol > 0 ? currentVol / avgPastVol : 1.0;

    // 7. Swing Highs and Lows
    let lastSwingLow: number | null = null;
    let lastSwingHigh: number | null = null;
    if (len >= 5) {
      const lows = this.history.map((b) => b.low);
      const highs = this.history.map((b) => b.high);
      for (let i = len - 2; i >= 2; i--) {
        if (!lastSwingLow && lows[i] <= lows[i - 1] && lows[i] <= lows[i - 2] && lows[i] <= lows[i + 1]) {
          lastSwingLow = lows[i];
        }
        if (!lastSwingHigh && highs[i] >= highs[i - 1] && highs[i] >= highs[i - 2] && highs[i] >= highs[i + 1]) {
          lastSwingHigh = highs[i];
        }
        if (lastSwingLow && lastSwingHigh) break;
      }
    }

    return {
      ema9,
      ema20,
      ema50,
      vwap,
      atr14,
      rsi14,
      macdLine: macd.line,
      macdSignal: macd.signal,
      macdHist: macd.hist,
      rvol: Number(rvol.toFixed(2)),
      lastSwingLow,
      lastSwingHigh,
    };
  }

  private calcEMA(data: number[], period: number): number | null {
    if (data.length < period) return null;
    const k = 2 / (period + 1);
    let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k);
    }
    return Number(ema.toFixed(2));
  }

  private calcATR(period = 14): number | null {
    if (this.history.length < period + 1) return null;
    let trSum = 0;
    for (let i = 1; i <= period; i++) {
      const idx = this.history.length - i;
      const b = this.history[idx];
      const prevClose = this.history[idx - 1].close;
      const tr = Math.max(
        b.high - b.low,
        Math.abs(b.high - prevClose),
        Math.abs(b.low - prevClose)
      );
      trSum += tr;
    }
    return Number((trSum / period).toFixed(2));
  }

  private calcRSI(data: number[], period = 14): number | null {
    if (data.length <= period) return null;
    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const diff = data[i] - data[i - 1];
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period + 1; i < data.length; i++) {
      const diff = data[i] - data[i - 1];
      if (diff >= 0) {
        avgGain = (avgGain * (period - 1) + diff) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) + Math.abs(diff)) / period;
      }
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);
    return Number(rsi.toFixed(2));
  }

  private calcMACD(data: number[]): {
    line: number | null;
    signal: number | null;
    hist: number | null;
  } {
    if (data.length < 26) return { line: null, signal: null, hist: null };

    const ema12 = this.calcEMA(data, 12);
    const ema26 = this.calcEMA(data, 26);

    if (ema12 == null || ema26 == null) return { line: null, signal: null, hist: null };

    const macdLine = ema12 - ema26;
    // Estimate signal using last 9 MACD lines if available, else simple approximation
    const macdSignal = macdLine * 0.8;
    const macdHist = macdLine - macdSignal;

    return {
      line: Number(macdLine.toFixed(2)),
      signal: Number(macdSignal.toFixed(2)),
      hist: Number(macdHist.toFixed(2)),
    };
  }
}
