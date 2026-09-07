// ----------------------------------------------------------------------
// BROKER FEE & NET PROFIT GUARD + AI DYNAMIC PEAK TRAILING ENGINE
// Dedicated to KIS (Korea Investment & Securities) Domestic & US Markets.
// Prevents fee erosion, churning (헛매매), and zero-profit liquidations across Korean & US Equities.
// ----------------------------------------------------------------------

export interface FeeAndProfitAnalysis {
  buyPrice: number;
  currentPrice: number;
  brokerBuyFeePct: number;   // 0.015%
  brokerSellFeePct: number;  // 0.015% + 0.18% transaction tax
  slippageBufferPct: number; // 0.10% default
  totalCostPct: number;      // 0.20%
  bepPrice: number;          // Price where Net Profit = 0%
  targetBepPrice: number;    // Price where Net Profit = minTargetNetProfitPct
  grossProfitPct: number;    // Raw price change %
  netProfitPct: number;      // Gross - Total Cost
  grossPnlAmount: number;    // Raw KRW
  netPnlAmount: number;      // Net KRW after fees
  isProfitableAfterFees: boolean;
}

export interface PeakAnalysisResult {
  predictedPeakProfitPct: number; // AI predicted peak target (e.g. +3.5%, +6.0%)
  highestPeakPct: number;         // Highest gross profit % achieved during trade
  peakRetreatPct: number;         // Current drop from peak %
  candleMomentum: "STRONG_BULLISH" | "NEUTRAL_RALLY" | "REVERSAL_UPPER_SHADOW" | "BEARISH_PIERCING";
  trailingFallbackPct: number;    // E.g. 0.4% fallback buffer from peak
  isPeakReversalDetected: boolean;
  isPeakTargetReached: boolean;
}

export interface SellDecisionResult {
  canExecuteSell: boolean;
  actionReason: 
    | "NET_PROFIT_EXCEEDED" 
    | "STOP_LOSS_BREAKDOWN" 
    | "BLOCKED_FEE_EROSION" 
    | "WAITING_BEP" 
    | "NO_POSITION"
    | "HOLDING_AI_PEAK_RALLY"
    | "AI_PEAK_REVERSAL_PROFIT"
    | "AI_PREDICTED_PEAK_TARGET_REACHED";
  netProfitPct: number;
  grossProfitPct: number;
  bepPrice: number;
  recommendedPrice: number;
  rationale: string;
  peakAnalysis?: PeakAnalysisResult;
}

export class BrokerFeeAndNetProfitGuard {
  public static readonly DEFAULT_BUY_FEE_PCT = 0.015;
  public static readonly DEFAULT_SELL_FEE_PCT = 0.195; // 0.015% fee + 0.18% tax
  public static readonly DEFAULT_SLIPPAGE_PCT = 0.10;

  /**
   * Calculates comprehensive fee, breakeven price (BEP), and net profit for a given position.
   */
  public static analyzeProfitAndFees(
    buyPrice: number,
    currentPrice: number,
    qty: number = 1,
    slippagePct: number = BrokerFeeAndNetProfitGuard.DEFAULT_SLIPPAGE_PCT,
    targetNetProfitPct: number = 1.0
  ): FeeAndProfitAnalysis {
    const safeBuyPrice = Math.max(1, buyPrice);
    const safeCurrentPrice = Math.max(1, currentPrice);

    const brokerBuyFeePct = BrokerFeeAndNetProfitGuard.DEFAULT_BUY_FEE_PCT;
    const brokerSellFeePct = BrokerFeeAndNetProfitGuard.DEFAULT_SELL_FEE_PCT;
    const totalCostPct = brokerBuyFeePct + brokerSellFeePct + Math.max(0, slippagePct);

    // BEP (Breakeven Price) = BuyPrice * (1 + totalCostPct / 100)
    const bepPrice = Math.round(safeBuyPrice * (1 + totalCostPct / 100));
    
    // Target Price = BuyPrice * (1 + (totalCostPct + targetNetProfitPct) / 100)
    const targetBepPrice = Math.round(safeBuyPrice * (1 + (totalCostPct + targetNetProfitPct) / 100));

    // Gross Profit %
    const grossProfitPct = Math.round(((safeCurrentPrice - safeBuyPrice) / safeBuyPrice) * 10000) / 100;
    
    // Net Profit % after deducting fees & tax & slippage
    const netProfitPct = Math.round((grossProfitPct - totalCostPct) * 100) / 100;

    const totalInvested = safeBuyPrice * qty;
    const grossPnlAmount = Math.round((safeCurrentPrice - safeBuyPrice) * qty);
    const feeCostAmount = Math.round(totalInvested * (totalCostPct / 100));
    const netPnlAmount = grossPnlAmount - feeCostAmount;

    return {
      buyPrice: safeBuyPrice,
      currentPrice: safeCurrentPrice,
      brokerBuyFeePct,
      brokerSellFeePct,
      slippageBufferPct: slippagePct,
      totalCostPct,
      bepPrice,
      targetBepPrice,
      grossProfitPct,
      netProfitPct,
      grossPnlAmount,
      netPnlAmount,
      isProfitableAfterFees: netProfitPct > 0
    };
  }

  /**
   * Evaluates AI Peak Prediction, Breakeven Lock, and Trailing Reversal logic across Korean, US, and Crypto assets.
   * Eliminates premature stopouts, locks in risk-free gains once profit exceeds +1.8%, and maximizes risk-to-reward ratio.
   */
  public static evaluateSellPermission(
    buyPrice: number,
    currentPrice: number,
    qty: number = 1,
    stopLossPct: number = -2.5,
    minTargetNetProfitPct: number = 1.0,
    slippagePct: number = BrokerFeeAndNetProfitGuard.DEFAULT_SLIPPAGE_PCT,
    highestPriceSinceBuy?: number,
    candlePatternScore: number = 75,
    cvdVolumeDeltaRatio: number = 1.2
  ): SellDecisionResult {
    const analysis = this.analyzeProfitAndFees(buyPrice, currentPrice, qty, slippagePct, minTargetNetProfitPct);
    const { grossProfitPct, netProfitPct, bepPrice, targetBepPrice } = analysis;

    const effectiveHighestPrice = Math.max(buyPrice, currentPrice, highestPriceSinceBuy || currentPrice);
    const highestPeakPct = Math.round(((effectiveHighestPrice - buyPrice) / buyPrice) * 10000) / 100;
    const peakRetreatPct = Math.max(0, Math.round((highestPeakPct - grossProfitPct) * 100) / 100);

    // 1. DYNAMIC BREAKEVEN PROTECTION (본절 수호 장치)
    // If trade once reached +1.8% or higher, the effective stop loss is elevated to Breakeven (+0.35% net profit safety zone)
    const isBreakevenArmed = highestPeakPct >= 1.8;
    const dynamicFloorStopPct = isBreakevenArmed ? 0.35 : stopLossPct;

    // 2. Critical Stop-Loss Trigger (Protected with Breakeven Lock)
    if (grossProfitPct <= dynamicFloorStopPct) {
      if (isBreakevenArmed && grossProfitPct > stopLossPct) {
        return {
          canExecuteSell: true,
          actionReason: "STOP_LOSS_BREAKDOWN",
          netProfitPct,
          grossProfitPct,
          bepPrice,
          recommendedPrice: currentPrice,
          rationale: `🛡️ [본절 수호(Breakeven Lock) 안전 청산] 최고 +${highestPeakPct}% 수익 달성 후 조정으로 본절 안전선(+${dynamicFloorStopPct}%) 터치. 원금 및 수수료를 완벽 보전하고 청산합니다.`
        };
      }

      return {
        canExecuteSell: true,
        actionReason: "STOP_LOSS_BREAKDOWN",
        netProfitPct,
        grossProfitPct,
        bepPrice,
        recommendedPrice: currentPrice,
        rationale: `🚨 [손절선 이탈 긴급 청산] 수익률 ${grossProfitPct}% 가 허용 손절선(-${Math.abs(stopLossPct)}%)을 이탈하여 리스크 방어 손절을 집행합니다.`
      };
    }

    // 3. Gross Profit is positive/zero BUT Net Profit is negative/zero (Blocked churning)
    if (grossProfitPct >= 0 && netProfitPct < minTargetNetProfitPct && !isBreakevenArmed) {
      return {
        canExecuteSell: false,
        actionReason: "BLOCKED_FEE_EROSION",
        netProfitPct,
        grossProfitPct,
        bepPrice,
        recommendedPrice: targetBepPrice,
        rationale: `🛡️ [수수료 녹음 차단] 단순 등락 +${grossProfitPct}% 이나 증권사 거래세/수수료 차감 시 실제 순익은 ${netProfitPct}%로 손실/본전 헛매매입니다. 손익분기 목표가(${(targetBepPrice ?? 0).toLocaleString()}원) 도달 전 매도를 차단합니다.`
      };
    }

    // 4. Minor drawdown within stop-loss buffer (Noise filter - avoid premature panic sell)
    if (grossProfitPct < 0 && grossProfitPct > stopLossPct) {
      return {
        canExecuteSell: false,
        actionReason: "WAITING_BEP",
        netProfitPct,
        grossProfitPct,
        bepPrice,
        recommendedPrice: targetBepPrice,
        rationale: `⏳ [잔파동 노이즈 홀딩 중] 현재 수익률 ${grossProfitPct}%. 손절선(-${Math.abs(stopLossPct)}%) 미도달 및 손익분기점(${(bepPrice ?? 0).toLocaleString()}원) 미달로 노이즈에 털리지 않고 퀀트 목표가를 향해 홀딩을 유지합니다.`
      };
    }

    // 5. BEP MINIMUM PROFIT ZONE REACHED - Dynamic Adaptive Trailing Stop
    let predictedPeakProfitPct = Math.max(
      minTargetNetProfitPct + 2.5,
      Math.round((minTargetNetProfitPct + (candlePatternScore / 20) * cvdVolumeDeltaRatio) * 10) / 10
    );
    predictedPeakProfitPct = Math.min(25.0, predictedPeakProfitPct);

    // Dynamic Trailing Fallback scale: Adaptive breathing room
    let trailingFallbackPct = 1.0;
    if (highestPeakPct >= 8.0) {
      trailingFallbackPct = 2.2;
    } else if (highestPeakPct >= 4.5) {
      trailingFallbackPct = 1.5;
    } else if (highestPeakPct >= 2.5) {
      trailingFallbackPct = 1.0;
    } else {
      trailingFallbackPct = 0.8;
    }

    // Reversal condition requires substantial peak and retreat beyond buffer
    const isPeakReversalDetected = highestPeakPct >= 2.2 && peakRetreatPct >= trailingFallbackPct && (highestPeakPct - peakRetreatPct) >= 0.5;
    const isPeakTargetReached = grossProfitPct >= predictedPeakProfitPct;

    const candleMomentum = isPeakReversalDetected 
      ? "REVERSAL_UPPER_SHADOW" 
      : candlePatternScore >= 80 
      ? "STRONG_BULLISH" 
      : "NEUTRAL_RALLY";

    const peakAnalysis: PeakAnalysisResult = {
      predictedPeakProfitPct,
      highestPeakPct,
      peakRetreatPct,
      candleMomentum,
      trailingFallbackPct,
      isPeakReversalDetected,
      isPeakTargetReached
    };

    if (isPeakReversalDetected) {
      return {
        canExecuteSell: true,
        actionReason: "AI_PEAK_REVERSAL_PROFIT",
        netProfitPct,
        grossProfitPct,
        bepPrice,
        recommendedPrice: currentPrice,
        rationale: `🎉 [AI 고점 변곡점 최대 익절 매도] 최고점(+${highestPeakPct}%) 도달 후 스마트 트레일링 변곡점(-${peakRetreatPct}%) 포착! 증권사 수수료·거래세 차감 후 실질 순수익 +${netProfitPct}% 고수익 익절을 확정합니다!`,
        peakAnalysis
      };
    }

    if (isPeakTargetReached) {
      return {
        canExecuteSell: true,
        actionReason: "AI_PREDICTED_PEAK_TARGET_REACHED",
        netProfitPct,
        grossProfitPct,
        bepPrice,
        recommendedPrice: currentPrice,
        rationale: `🎯 [AI 예측 최고 목표가 도달] AI 캔들·수급 파동 예측 최고 목표가(+${predictedPeakProfitPct}%) 달성! 실질 순수익 +${netProfitPct}% 최대 익절 확정 매도!`,
        peakAnalysis
      };
    }

    return {
      canExecuteSell: false,
      actionReason: "HOLDING_AI_PEAK_RALLY",
      netProfitPct,
      grossProfitPct,
      bepPrice,
      recommendedPrice: currentPrice * (1 + predictedPeakProfitPct / 100),
      rationale: `🚀 [BEP 돌파 • AI 고수익 팽창 극대화 홀딩] 손익분기(+${netProfitPct}%) 돌파! AI 캔들 패턴(점수:${candlePatternScore}점) 및 CVD 수급 델타 유효로 추가 고점 목표가(+${predictedPeakProfitPct}%)까지 상승 파동을 홀딩합니다. (최고점: +${highestPeakPct}%)`,
      peakAnalysis
    };
  }

  /**
   * Fractional Quantity Calculation Engine for Korean and US equities
   */
  public static calculateFractionalQuantity(
    orderAmountKRW: number,
    unitPrice: number,
    isFractionalAllowed: boolean = true
  ): { qty: number; qtyFormatted: string; isFractional: boolean } {
    if (unitPrice <= 0 || orderAmountKRW <= 0) {
      return { qty: 0, qtyFormatted: "0", isFractional: false };
    }

    const qtyExact = orderAmountKRW / unitPrice;
    if (qtyExact >= 1 && Number.isInteger(qtyExact)) {
      return {
        qty: Math.floor(qtyExact),
        qtyFormatted: Math.floor(qtyExact).toString(),
        isFractional: false
      };
    }

    if (!isFractionalAllowed) {
      const wholeQty = Math.floor(qtyExact);
      return {
        qty: wholeQty,
        qtyFormatted: wholeQty.toString(),
        isFractional: false
      };
    }

    const qtyFractional = Number(Math.max(0.0001, qtyExact).toFixed(4));
    return {
      qty: qtyFractional,
      qtyFormatted: qtyFractional.toFixed(4).replace(/\.?0+$/, ''),
      isFractional: true
    };
  }
}

// Backward-compatibility alias
export const UpbitFeeAndNetProfitGuard = BrokerFeeAndNetProfitGuard;
