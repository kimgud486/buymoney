// J.A.R.V.I.S. V4.0 Stage 1 Data Pipeline: Triple Barrier Label Generator
// Based on Marcos López de Prado's Financial Machine Learning Triple Barrier Method

import { Candle } from "./collector";
import { TechnicalIndicatorCalculator } from "./indicators";

export interface TripleBarrierLabel {
  barrierOutcome: "TAKE_PROFIT" | "STOP_LOSS" | "TIMEOUT";
  numericalLabel: 1 | -1 | 0; // +1 = Buy Win, -1 = Stop Loss, 0 = Time limit hit
  takeProfitBarrierPrice: number;
  stopLossBarrierPrice: number;
  timeHorizonBars: number;
  realizedReturnPct: number;
  holdingDurationBars: number;
  pathDescription: string;
}

export class TripleBarrierLabeler {
  /**
   * Generates Ground Truth Triple Barrier Labels for training & prediction evaluation
   * @param candles Price history candles
   * @param ptMultiplier Take Profit ATR multiplier (e.g. 2.0x ATR)
   * @param slMultiplier Stop Loss ATR multiplier (e.g. 1.0x ATR)
   * @param timeHorizon Max holding period in bars (e.g. 8 bars)
   */
  public static generateLabel(
    candles: Candle[],
    startIndex: number = candles.length - 12,
    ptMultiplier: number = 2.0,
    slMultiplier: number = 1.0,
    timeHorizon: number = 8
  ): TripleBarrierLabel {
    const startCandle = candles[startIndex] || candles[0];
    const entryPrice = startCandle.close;

    const indicators = TechnicalIndicatorCalculator.calculateAll(candles.slice(0, startIndex + 1));
    const atr = indicators.atr14 || entryPrice * 0.015;

    const takeProfitPrice = Math.round(entryPrice + atr * ptMultiplier);
    const stopLossPrice = Math.round(entryPrice - atr * slMultiplier);

    const futureCandles = candles.slice(startIndex + 1, startIndex + 1 + timeHorizon);

    let outcome: "TAKE_PROFIT" | "STOP_LOSS" | "TIMEOUT" = "TIMEOUT";
    let numericalLabel: 1 | -1 | 0 = 0;
    let realizedReturnPct = 0;
    let duration = futureCandles.length || timeHorizon;

    for (let idx = 0; idx < futureCandles.length; idx++) {
      const c = futureCandles[idx];
      
      // Check Upper Barrier Hit
      if (c.high >= takeProfitPrice) {
        outcome = "TAKE_PROFIT";
        numericalLabel = 1;
        duration = idx + 1;
        realizedReturnPct = Math.round(((takeProfitPrice - entryPrice) / entryPrice) * 1000) / 10;
        break;
      }

      // Check Lower Barrier Hit
      if (c.low <= stopLossPrice) {
        outcome = "STOP_LOSS";
        numericalLabel = -1;
        duration = idx + 1;
        realizedReturnPct = Math.round(((stopLossPrice - entryPrice) / entryPrice) * 1000) / 10;
        break;
      }
    }

    if (outcome === "TIMEOUT") {
      const exitPrice = futureCandles.length > 0 ? futureCandles[futureCandles.length - 1].close : entryPrice;
      realizedReturnPct = Math.round(((exitPrice - entryPrice) / entryPrice) * 1000) / 10;
      numericalLabel = realizedReturnPct > 0.5 ? 1 : (realizedReturnPct < -0.5 ? -1 : 0);
    }

    return {
      barrierOutcome: outcome,
      numericalLabel,
      takeProfitBarrierPrice: takeProfitPrice,
      stopLossBarrierPrice: stopLossPrice,
      timeHorizonBars: timeHorizon,
      realizedReturnPct,
      holdingDurationBars: duration,
      pathDescription: outcome === "TAKE_PROFIT"
        ? `상단 목표 장벽(${(takeProfitPrice ?? 0).toLocaleString()}원) ${duration}봉 이내 스피디 달성 (+${realizedReturnPct}%)`
        : outcome === "STOP_LOSS"
        ? `하단 손절 장벽(${(stopLossPrice ?? 0).toLocaleString()}원) 터치 자동 방어 (${realizedReturnPct}%)`
        : `시간 만료 장벽(${timeHorizon}봉) 도달 후 청산 (${realizedReturnPct}%)`
    };
  }
}
