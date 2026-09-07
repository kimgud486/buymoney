// ----------------------------------------------------------------------
// EXIT EVIDENCE ENGINE V18.5 (AISTOCK V18 MULTI-FACTOR EXIT INTELLIGENCE)
// Quantitative Evidence-Based Exit Scoring & Peak Giveback Tracking
// ----------------------------------------------------------------------

import { CandlePatternSignal } from "./CandlePatternEngine";

export interface ExitEvidenceInput {
  currentPrice: number;
  entryPrice: number;
  highestPriceSinceBuy: number;
  lowestPriceSinceBuy?: number;
  initialStopPrice: number | null;
  trailingFloorPrice: number | null;

  structureValid: boolean;
  bearishChoch: boolean;
  swingLowBreak: boolean;

  aboveVWAP: boolean;
  aboveEMA20: boolean;

  macdWeakening: boolean;
  rsiWeakening: boolean;

  bearishCandlePatterns: CandlePatternSignal[];

  orderFlowReversal: boolean;
  cvdDivergence: boolean;

  relativeStrengthLoss: boolean;
  marketWeakness: boolean;
}

export interface PeakMetrics {
  mfePct: number;
  maePct: number;
  peakProfitPct: number;
  currentProfitPct: number;
  givebackPct: number;
}

export interface ExitEvidence {
  hardStopHit: boolean;
  trailingStopHit: boolean;

  structureBreak: boolean;
  bearishChoch: boolean;
  swingLowBreak: boolean;

  vwapLost: boolean;
  ema20Lost: boolean;

  macdWeakening: boolean;
  rsiWeakening: boolean;

  bearishCandlePattern: boolean;

  orderFlowReversal: boolean;
  cvdDivergence: boolean;

  relativeStrengthLoss: boolean;
  marketWeakness: boolean;

  hardExit: boolean;
  structuralCount: number;
  warningCount: number;

  peakMetrics: PeakMetrics;

  exitRiskScore: number; // 0 ~ 100
  confidence: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  recommendedAction: "HOLD" | "PROFIT_HOLD" | "SELL_WATCH" | "SELL";
  profitHoldStrength?: "STRONG" | "NORMAL" | "WEAK";
  sellWatchLevel?: "LOW" | "MEDIUM" | "HIGH";
  reasons: string[];
}

export class ExitEvidenceEngine {
  /**
   * Evaluate all technical, structure, indicator, and order flow evidence to produce an ExitEvidence report
   */
  public static evaluate(input: ExitEvidenceInput): ExitEvidence {
    const {
      currentPrice,
      entryPrice,
      highestPriceSinceBuy,
      initialStopPrice,
      trailingFloorPrice,
      structureValid,
      bearishChoch,
      swingLowBreak,
      aboveVWAP,
      aboveEMA20,
      macdWeakening,
      rsiWeakening,
      bearishCandlePatterns,
      orderFlowReversal,
      cvdDivergence,
      relativeStrengthLoss,
      marketWeakness
    } = input;

    // Peak Metrics Calculation
    const currentProfitPct = entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0;
    const peakPrice = Math.max(highestPriceSinceBuy || currentPrice, currentPrice);
    const lowestPrice = Math.min(input.lowestPriceSinceBuy || currentPrice, currentPrice);
    const peakProfitPct = entryPrice > 0 ? Math.max(0, ((peakPrice - entryPrice) / entryPrice) * 100) : 0;
    const givebackPct = Math.max(0, peakProfitPct - currentProfitPct);
    const mfePct = peakProfitPct;
    const maePct = entryPrice > 0 ? Math.min(0, ((lowestPrice - entryPrice) / entryPrice) * 100) : 0;

    const peakMetrics: PeakMetrics = {
      mfePct: +mfePct.toFixed(2),
      maePct: +maePct.toFixed(2),
      peakProfitPct: +peakProfitPct.toFixed(2),
      currentProfitPct: +currentProfitPct.toFixed(2),
      givebackPct: +givebackPct.toFixed(2)
    };

    const hardStopHit = initialStopPrice != null && currentPrice <= initialStopPrice;
    const trailingStopHit = trailingFloorPrice != null && currentPrice <= trailingFloorPrice;
    const structureBreak = !structureValid;
    const vwapLost = !aboveVWAP;
    const ema20Lost = !aboveEMA20;

    const hasBearishCandlePattern = Array.isArray(bearishCandlePatterns) && bearishCandlePatterns.some((p) => p.direction === "BEARISH" && p.confidence >= 70);

    const reasons: string[] = [];
    let score = 0;

    // Hard Stop / Trailing Stop
    if (hardStopHit) {
      score += 100;
      reasons.push("🚨 [Hard Stop] 초기 손절가 하향 이탈");
    }
    if (trailingStopHit) {
      score += 100;
      reasons.push("🚨 [Trailing Stop] 수익 보존 트레일링 스탑 이탈");
    }

    // Structure Evidence
    if (structureBreak) {
      score += 35;
      reasons.push("⚠️ [구조 붕괴] HH/HL 상승 구조 이탈");
    }
    if (bearishChoch) {
      score += 30;
      reasons.push("⚠️ [CHoCH 발생] 하락 추세 전환 신호");
    }
    if (swingLowBreak) {
      score += 25;
      reasons.push("⚠️ [Swing Low Break] 직전 지지 저점 이탈");
    }

    // Indicator Evidence
    if (vwapLost) {
      score += 20;
      reasons.push("📉 [VWAP 이탈] 일중 당일 평균 단가 하회");
    }
    if (ema20Lost) {
      score += 15;
      reasons.push("📉 [EMA20 이탈] 20단위 단기 추세선 이탈");
    }
    if (macdWeakening) {
      score += 10;
      reasons.push("📉 [MACD 약화] 모멘텀 히스토그램 감소");
    }
    if (rsiWeakening) {
      score += 10;
      reasons.push("📉 [RSI 둔화] 모멘텀 지수 하락");
    }

    // Candle Pattern Evidence
    if (hasBearishCandlePattern) {
      score += 15;
      const patternNames = bearishCandlePatterns.filter((p) => p.direction === "BEARISH").map((p) => p.pattern).join(", ");
      reasons.push(`🕯️ [음봉 캔들 패턴] ${patternNames}`);
    }

    // Order Flow Evidence
    if (orderFlowReversal) {
      score += 20;
      reasons.push("📊 [Order Flow 반전] 매도 체결 수급 우위 전환");
    }
    if (cvdDivergence) {
      score += 20;
      reasons.push("📊 [CVD Divergence] 고점 형성 대비 순매수 수급 이탈");
    }

    // Giveback Evidence
    if (givebackPct >= 3) {
      score += 15;
      reasons.push(`📉 [Peak Giveback] 최고점 대비 ${givebackPct.toFixed(1)}%p 수익 반납`);
    }

    // Market & Sector
    if (relativeStrengthLoss) {
      score += 10;
      reasons.push("🌐 [상대강도 약화] 시장 지수 대비 약세 전환");
    }
    if (marketWeakness) {
      score += 10;
      reasons.push("🌐 [시장 약세] 지수 전체 급락 변동성");
    }

    const hardExit = hardStopHit || trailingStopHit;

    // Count Structural evidence
    let structuralCount = 0;
    if (structureBreak) structuralCount++;
    if (bearishChoch) structuralCount++;
    if (swingLowBreak) structuralCount++;

    // Count Warning (Momentum/Flow/Market/Giveback) evidence
    let warningCount = 0;
    if (vwapLost) warningCount++;
    if (ema20Lost) warningCount++;
    if (macdWeakening) warningCount++;
    if (rsiWeakening) warningCount++;
    if (hasBearishCandlePattern) warningCount++;
    if (orderFlowReversal) warningCount++;
    if (cvdDivergence) warningCount++;
    if (givebackPct >= 3) warningCount++;
    if (relativeStrengthLoss) warningCount++;
    if (marketWeakness) warningCount++;

    const exitRiskScore = Math.min(100, score);

    // V18.5 Decision Matrix & PROFIT_HOLD / SELL_WATCH Granular Classification
    let confidence: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
    let recommendedAction: "HOLD" | "PROFIT_HOLD" | "SELL_WATCH" | "SELL" = "HOLD";

    let profitHoldStrength: "STRONG" | "NORMAL" | "WEAK" | undefined;
    let sellWatchLevel: "LOW" | "MEDIUM" | "HIGH" | undefined;

    if (currentProfitPct > 0) {
      if (structuralCount === 0 && warningCount === 0 && aboveVWAP && aboveEMA20 && !relativeStrengthLoss && givebackPct < 1.5) {
        profitHoldStrength = "STRONG";
      } else if (warningCount >= 2 || relativeStrengthLoss || cvdDivergence || givebackPct >= 3.0) {
        profitHoldStrength = "WEAK";
      } else {
        profitHoldStrength = "NORMAL";
      }
    }

    if (hardExit) {
      confidence = "CRITICAL";
      recommendedAction = "SELL";
    } else if (structuralCount >= 2 && warningCount >= 1) {
      confidence = "HIGH";
      recommendedAction = "SELL";
    } else if (structuralCount >= 1 || warningCount >= 2) {
      confidence = "MEDIUM";
      recommendedAction = "SELL_WATCH";

      if (structuralCount >= 1 && warningCount >= 2) {
        sellWatchLevel = "HIGH";
      } else if (warningCount >= 2 || structuralCount >= 1) {
        sellWatchLevel = "MEDIUM";
      } else {
        sellWatchLevel = "LOW";
      }
    } else if (warningCount === 1) {
      confidence = "LOW";
      if (currentProfitPct > 0) {
        recommendedAction = "PROFIT_HOLD";
      } else {
        recommendedAction = "SELL_WATCH";
        sellWatchLevel = "LOW";
      }
    } else {
      confidence = "LOW";
      recommendedAction = currentProfitPct > 0 ? "PROFIT_HOLD" : "HOLD";
    }

    return {
      hardStopHit,
      trailingStopHit,
      structureBreak,
      bearishChoch,
      swingLowBreak,
      vwapLost,
      ema20Lost,
      macdWeakening,
      rsiWeakening,
      bearishCandlePattern: hasBearishCandlePattern,
      orderFlowReversal,
      cvdDivergence,
      relativeStrengthLoss,
      marketWeakness,
      hardExit,
      structuralCount,
      warningCount,
      peakMetrics,
      exitRiskScore,
      confidence,
      recommendedAction,
      profitHoldStrength,
      sellWatchLevel,
      reasons
    };
  }
}
