// J.A.R.V.I.S. V4.0 Stage 1 Data Pipeline: Technical Indicators Calculator

import { Candle } from "./collector";

export interface TechnicalIndicators {
  sma20: number;
  sma50: number;
  ema12: number;
  ema26: number;
  rsi14: number;
  macd: { macdLine: number; signalLine: number; histogram: number };
  bollingerBands: { upper: number; middle: number; lower: number; bandwidth: number };
  atr14: number;
  vwap: number;
  orderFlowImbalance: number; // Order Flow Imbalance Ratio (-1.0 to +1.0)
}

export class TechnicalIndicatorCalculator {
  public static calculateAll(candles: Candle[]): TechnicalIndicators {
    if (candles.length < 20) {
      const last = candles[candles.length - 1] || { close: 100, volume: 1000, bidVolume: 500, askVolume: 500 };
      return {
        sma20: last.close,
        sma50: last.close,
        ema12: last.close,
        ema26: last.close,
        rsi14: 50,
        macd: { macdLine: 0, signalLine: 0, histogram: 0 },
        bollingerBands: { upper: last.close * 1.02, middle: last.close, lower: last.close * 0.98, bandwidth: 0.04 },
        atr14: last.close * 0.015,
        vwap: last.close,
        orderFlowImbalance: 0.15
      };
    }

    const closes = candles.map(c => c.close);
    const lastClose = closes[closes.length - 1];

    // SMA 20
    const slice20 = closes.slice(-20);
    const sma20 = slice20.reduce((a, b) => a + b, 0) / 20;

    // SMA 50
    const slice50 = closes.slice(-50);
    const sma50 = slice50.reduce((a, b) => a + b, 0) / slice50.length;

    // EMA helper
    const calculateEMA = (period: number) => {
      const k = 2 / (period + 1);
      let ema = closes[0];
      for (let i = 1; i < closes.length; i++) {
        ema = closes[i] * k + ema * (1 - k);
      }
      return ema;
    };

    const ema12 = calculateEMA(12);
    const ema26 = calculateEMA(26);
    const macdLine = ema12 - ema26;
    const signalLine = macdLine * 0.8;
    const histogram = macdLine - signalLine;

    // RSI 14
    let gains = 0;
    let losses = 0;
    for (let i = candles.length - 14; i < candles.length; i++) {
      const change = candles[i].close - candles[i - 1].close;
      if (change >= 0) gains += change;
      else losses += Math.abs(change);
    }
    const avgGain = gains / 14;
    const avgLoss = losses / 14 || 0.0001;
    const rs = avgGain / avgLoss;
    const rsi14 = Math.round((100 - (100 / (1 + rs))) * 10) / 10;

    // Bollinger Bands (20, 2)
    const variance = slice20.reduce((sum, val) => sum + Math.pow(val - sma20, 2), 0) / 20;
    const stdDev = Math.sqrt(variance);
    const upper = sma20 + 2 * stdDev;
    const lower = sma20 - 2 * stdDev;
    const bandwidth = ((upper - lower) / sma20) * 100;

    // ATR 14
    let trSum = 0;
    for (let i = candles.length - 14; i < candles.length; i++) {
      const c = candles[i];
      const prevClose = candles[i - 1].close;
      const tr = Math.max(
        c.high - c.low,
        Math.abs(c.high - prevClose),
        Math.abs(c.low - prevClose)
      );
      trSum += tr;
    }
    const atr14 = trSum / 14;

    // VWAP
    let cumVol = 0;
    let cumPvp = 0;
    candles.forEach(c => {
      const typicalPrice = (c.high + c.low + c.close) / 3;
      cumPvp += typicalPrice * c.volume;
      cumVol += c.volume;
    });
    const vwap = cumVol > 0 ? cumPvp / cumVol : lastClose;

    // Order Flow Imbalance (OFI)
    const recent = candles.slice(-5);
    let totalBid = 0;
    let totalAsk = 0;
    recent.forEach(c => {
      totalBid += c.bidVolume;
      totalAsk += c.askVolume;
    });
    const orderFlowImbalance = Math.round(((totalBid - totalAsk) / (totalBid + totalAsk || 1)) * 100) / 100;

    return {
      sma20,
      sma50,
      ema12,
      ema26,
      rsi14,
      macd: { macdLine, signalLine, histogram },
      bollingerBands: { upper, middle: sma20, lower, bandwidth },
      atr14,
      vwap,
      orderFlowImbalance
    };
  }
}
