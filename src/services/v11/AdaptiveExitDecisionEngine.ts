// AISTOCK v12 Adaptive Exit Decision Engine
// Replaces static +5% profit targets with real-time multi-factor structural exit AI evaluation

export interface MarketBarSnapshot {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap: number;
  ema5: number;
  ema20: number;
  macdHist: number;
  rsi: number;
  dmiPlus: number;
  dmiMinus: number;
  buyVolumeRatio: number;
  sellVolumeRatio: number;
  isCompletedBar: boolean;
}

export interface PositionContextV12 {
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

export interface ExitScoreBreakdown {
  factor: string;
  points: number;
  description: string;
}

export interface ExitDecisionResult {
  shouldExit: boolean;
  exitType: "HOLD" | "PROFIT_HOLD" | "SELL_WATCH" | "SELL";
  totalSellScore: number;
  primaryReason: string;
  breakdown: ExitScoreBreakdown[];
  suggestedExitPrice: number;
}

export class AdaptiveExitDecisionEngine {
  public evaluateExit(
    position: PositionContextV12,
    bar: MarketBarSnapshot
  ): ExitDecisionResult {
    const breakdown: ExitScoreBreakdown[] = [];
    let totalSellScore = 0;

    const currentPnlPct = Number((((position.currentPrice - position.buyPrice) / position.buyPrice) * 100).toFixed(2));

    // 1. STRUCTURE_BREAK (Weight: 22) - Loss of Higher High / Higher Low structural support
    if (bar.close < position.highPriceSinceBuy * 0.985) {
      breakdown.push({
        factor: "STRUCTURE_BREAK",
        points: 22,
        description: `고점(${(position.highPriceSinceBuy ?? 0).toLocaleString()}) 대비 -1.5% 이상 하락하여 HH/HL 상승파동 구조 붕괴`
      });
      totalSellScore += 22;
    }

    // 2. VWAP_LOST (Weight: 18) - Price lost VWAP support
    if (bar.vwap > 0 && bar.close < bar.vwap) {
      const vwapDiff = ((bar.vwap - bar.close) / bar.vwap) * 100;
      if (vwapDiff >= 0.5) {
        breakdown.push({
          factor: "VWAP_LOST",
          points: 18,
          description: `VWAP 지지선(${(bar.vwap ?? 0).toLocaleString()}) 대비 ${vwapDiff.toFixed(1)}% 이탈`
        });
        totalSellScore += 18;
      }
    }

    // 3. HIGH_SELL_SCORE (Weight: 18) - Aggressive sell side market order imbalance
    if (bar.sellVolumeRatio > 0.65) {
      breakdown.push({
        factor: "HIGH_SELL_SCORE",
        points: 18,
        description: `매도 수급 우위 ${(bar.sellVolumeRatio * 100).toFixed(0)}% 급증 포착`
      });
      totalSellScore += 18;
    }

    // 4. MACD_WEAKENING (Weight: 12) - MACD Histogram momentum breakdown
    if (bar.macdHist < 0) {
      breakdown.push({
        factor: "MACD_WEAKENING",
        points: 12,
        description: "MACD 히스토그램 음전전환 및 모멘텀 감쇠"
      });
      totalSellScore += 12;
    }

    // 5. EMA_TREND_WEAK (Weight: 12) - EMA 5 falling below EMA 20 or price below EMA 5
    if (bar.ema5 > 0 && bar.ema20 > 0) {
      if (bar.close < bar.ema5 || bar.ema5 < bar.ema20) {
        breakdown.push({
          factor: "EMA_TREND_WEAK",
          points: 12,
          description: "EMA 5일선 이탈 및 단기 이동평균선 이격 축소"
        });
        totalSellScore += 12;
      }
    }

    // 6. RSI_WEAKENING (Weight: 10) - RSI falling below 45
    if (bar.rsi < 45) {
      breakdown.push({
        factor: "RSI_WEAKENING",
        points: 10,
        description: `RSI 지수 ${bar.rsi.toFixed(1)}로 약세 구간 진입`
      });
      totalSellScore += 10;
    }

    // 7. DMI_BEARISH (Weight: 10) - DMI- greater than DMI+
    if (bar.dmiMinus > bar.dmiPlus && bar.dmiMinus > 22) {
      breakdown.push({
        factor: "DMI_BEARISH",
        points: 10,
        description: "DMI- 지표가 DMI+ 상향 돌파하여 하락 추세 가속"
      });
      totalSellScore += 10;
    }

    // 8. SELL_VOLUME (Weight: 10) - High volume on down candle
    if (bar.close < bar.open && bar.volume > 0) {
      breakdown.push({
        factor: "SELL_VOLUME",
        points: 10,
        description: "음봉 거래량 실린 강한 매도 봉 생성"
      });
      totalSellScore += 10;
    }

    // 9. BEAR_DIVERGENCE (Weight: 8) - Bearish divergence condition
    if (bar.high >= position.highPriceSinceBuy && bar.rsi < 60) {
      breakdown.push({
        factor: "BEAR_DIVERGENCE",
        points: 8,
        description: "가격 고점 시도 대비 RSI 다이버전스 약화"
      });
      totalSellScore += 8;
    }

    // 10. Hard Risk Emergency Stop Loss Check (-2.5%)
    if (currentPnlPct <= -2.5) {
      breakdown.push({
        factor: "HARD_STOP_LOSS",
        points: 50,
        description: `리스크 한도 손절선 이탈 (${currentPnlPct}%)`
      });
      totalSellScore += 50;
    }

    // Action Classification
    let exitType: ExitDecisionResult["exitType"] = "HOLD";
    let shouldExit = false;
    let primaryReason = "상승 파동 및 주요 지지선 유지 중 (HOLD)";

    if (totalSellScore >= 45) {
      exitType = "SELL";
      shouldExit = true;
      primaryReason = breakdown.length > 0
        ? `Adaptive Exit: ${breakdown[0].factor} (${breakdown[0].description}) 포함 매도 스코어 ${totalSellScore}점 도달`
        : "Adaptive Exit 조건 충족 매도 체결";
    } else if (totalSellScore >= 25) {
      exitType = "SELL_WATCH";
      primaryReason = `매도 시그널 경고 (매도 스코어: ${totalSellScore}점) - 트레일링 타이트 조정`;
    } else if (currentPnlPct > 2.0) {
      exitType = "PROFIT_HOLD";
      primaryReason = `수익 보유 중 (+${currentPnlPct}%) - 트레일링 상향 추적 중`;
    }

    return {
      shouldExit,
      exitType,
      totalSellScore,
      primaryReason,
      breakdown,
      suggestedExitPrice: position.currentPrice
    };
  }
}
