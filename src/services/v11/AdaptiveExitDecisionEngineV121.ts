// AISTOCK v12.1 Adaptive Exit Decision Engine
// Evaluates completed OHLCV candle bars with ATR trailing stop and HH-HL structural preservation.

import { ComputedTechnicalIndicators } from "../v12_1/RealMarketIndicatorProvider";

export interface CompletedMarketBar {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isCompletedBar: boolean;
  indicators: ComputedTechnicalIndicators;
}

export interface PositionContextV121 {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  buyPrice: number;
  currentPrice: number;
  qty: number;
  buyTimestamp: number;
  highPriceSinceBuy: number;
  trailingExitPrice: number;
}

export interface ExitScoreBreakdownV121 {
  factor: string;
  points: number;
  description: string;
}

export interface ExitDecisionResultV121 {
  shouldExit: boolean;
  exitType: "HOLD" | "PROFIT_HOLD" | "SELL_WATCH" | "SELL";
  totalSellScore: number;
  primaryReason: string;
  breakdown: ExitScoreBreakdownV121[];
  suggestedExitPrice: number;
  dynamicATRTrailingStop: number;
}

export class AdaptiveExitDecisionEngineV121 {
  public evaluateExitOnCompletedBar(
    position: PositionContextV121,
    bar: CompletedMarketBar
  ): ExitDecisionResultV121 {
    // RULE 1: Only evaluate on completed bars!
    if (!bar.isCompletedBar) {
      return {
        shouldExit: false,
        exitType: "HOLD",
        totalSellScore: 0,
        primaryReason: "미완성 진행 중 봉 (완료 봉 생성 대기 중)",
        breakdown: [],
        suggestedExitPrice: position.currentPrice,
        dynamicATRTrailingStop: position.trailingExitPrice
      };
    }

    const breakdown: ExitScoreBreakdownV121[] = [];
    let totalSellScore = 0;

    const ind = bar.indicators;
    const currentPnlPct = Number((((bar.close - position.buyPrice) / position.buyPrice) * 100).toFixed(2));
    const highestPrice = Math.max(position.highPriceSinceBuy, bar.high);

    // Dynamic ATR Trailing Stop calculation (High - ATR * 2.0)
    const atrMultiplier = 2.0;
    const atrVal = ind.atr14 > 0 ? ind.atr14 : bar.close * 0.015;
    const dynamicATRTrailingStop = Math.round(highestPrice - atrVal * atrMultiplier);

    // 1. ATR_TRAILING_STOP_BROKEN (Weight: 30) - Trailing Stop Hit
    if (bar.close < dynamicATRTrailingStop) {
      breakdown.push({
        factor: "ATR_TRAILING_STOP_BROKEN",
        points: 30,
        description: `ATR Trailing Stop (${(dynamicATRTrailingStop ?? 0).toLocaleString()}원) 이탈`
      });
      totalSellScore += 30;
    }

    // 2. STRUCTURE_BREAK (Weight: 22) - HH/HL Wave structure lost
    if (!ind.isHigherHigh && !ind.isHigherLow && bar.close < position.highPriceSinceBuy * 0.985) {
      breakdown.push({
        factor: "STRUCTURE_BREAK",
        points: 22,
        description: `최고가(${(position.highPriceSinceBuy ?? 0).toLocaleString()}원) 대비 -1.5% 하락하여 HH-HL 상승파동 구조 붕괴`
      });
      totalSellScore += 22;
    }

    // 3. VWAP_LOST (Weight: 18) - Lost VWAP support
    if (ind.vwap > 0 && bar.close < ind.vwap) {
      const vwapDiff = Number((((ind.vwap - bar.close) / ind.vwap) * 100).toFixed(1));
      if (vwapDiff >= 0.5) {
        breakdown.push({
          factor: "VWAP_LOST",
          points: 18,
          description: `VWAP 지지선(${(ind.vwap ?? 0).toLocaleString()}원) 대비 ${vwapDiff}% 이탈`
        });
        totalSellScore += 18;
      }
    }

    // 4. HIGH_SELL_SCORE (Weight: 18) - Bearish Candle with High Relative Volume
    if (bar.close < bar.open && ind.rvol >= 1.8) {
      breakdown.push({
        factor: "HIGH_SELL_SCORE",
        points: 18,
        description: `RVOL ${ind.rvol}배 거래량 실린 음봉 매도세 수급 급증`
      });
      totalSellScore += 18;
    }

    // 5. MACD_WEAKENING (Weight: 12) - MACD Histogram negative
    if (ind.macd.histogram < 0) {
      breakdown.push({
        factor: "MACD_WEAKENING",
        points: 12,
        description: "MACD 히스토그램 음전 전환 (하방 모멘텀 가속)"
      });
      totalSellScore += 12;
    }

    // 6. EMA_TREND_WEAK (Weight: 12) - Close below EMA 5 or EMA 5 below EMA 20
    if (bar.close < ind.ema5 || ind.ema5 < ind.ema20) {
      breakdown.push({
        factor: "EMA_TREND_WEAK",
        points: 12,
        description: "EMA 5일선 이탈 및 이동평균선 정배열 이격 축소"
      });
      totalSellScore += 12;
    }

    // 7. RSI_WEAKENING (Weight: 10) - RSI < 45
    if (ind.rsi < 45) {
      breakdown.push({
        factor: "RSI_WEAKENING",
        points: 10,
        description: `RSI 지수 ${ind.rsi}로 약세 구간 진입`
      });
      totalSellScore += 10;
    }

    // 8. DMI_BEARISH (Weight: 10) - DMI- > DMI+
    if (ind.dmiMinus > ind.dmiPlus && ind.dmiMinus > 22) {
      breakdown.push({
        factor: "DMI_BEARISH",
        points: 10,
        description: "DMI- 지표가 DMI+ 상향 크로스 (하락 추세 전이)"
      });
      totalSellScore += 10;
    }

    // 9. Hard Stop Loss Check (-2.5%)
    if (currentPnlPct <= -2.5) {
      breakdown.push({
        factor: "HARD_STOP_LOSS",
        points: 50,
        description: `리스크 한도 하드 손절선 이탈 (${currentPnlPct}%)`
      });
      totalSellScore += 50;
    }

    // Action Classification
    let exitType: ExitDecisionResultV121["exitType"] = "HOLD";
    let shouldExit = false;
    let primaryReason = "상승 파동 및 주요 지지선 유지 중 (HOLD)";

    if (totalSellScore >= 45) {
      exitType = "SELL";
      shouldExit = true;
      primaryReason = breakdown.length > 0
        ? `Adaptive Exit: ${breakdown[0].factor} (${breakdown[0].description}) 매도 스코어 ${totalSellScore}점 도달`
        : "Adaptive Exit 조건 충족 청산";
    } else if (totalSellScore >= 25) {
      exitType = "SELL_WATCH";
      primaryReason = `매도 시그널 경고 (매도 스코어: ${totalSellScore}점) - Trailing Stop 추적`;
    } else if (currentPnlPct > 2.0) {
      exitType = "PROFIT_HOLD";
      primaryReason = `수익 보유 중 (+${currentPnlPct}%) - ATR Trailing(${(dynamicATRTrailingStop ?? 0).toLocaleString()}원) 상향 추적`;
    }

    return {
      shouldExit,
      exitType,
      totalSellScore,
      primaryReason,
      breakdown,
      suggestedExitPrice: bar.close,
      dynamicATRTrailingStop
    };
  }
}
