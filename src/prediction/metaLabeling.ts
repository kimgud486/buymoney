// J.A.R.V.I.S. V4.0 Stage 2 Meta Labeling & NO_TRADE Filtering Engine
// Secondary ML Classifier evaluating secondary execution risk factors to filter out false positives.

import { CalibratedProbabilityOutput } from "./calibration";

export interface MetaLabelingInput {
  symbol: string;
  market: "KOREA" | "US" | "CRYPTO";
  calibratedResult: CalibratedProbabilityOutput | null;
  riskRewardRatio: number; // Target / Stop Loss (e.g. 2.35)
  sectorName: string;
  currentSectorExposurePct: number; // e.g. 62.5% in Semiconductor
  maxSectorExposureLimitPct?: number; // Default limit 65.0%
  volatilityAnomalous: boolean;
  modelAgreementPct: number | null; // null when unverified/deterministic
  probabilityVerified?: boolean;
}

export interface MetaLabelingOutput {
  decision: "BUY_READY" | "NO_TRADE";
  executionProbability: number; // Meta probability after filtering
  noTradeReason?: string;
  positionSizingPct: number; // Recommended portfolio allocation % (e.g. 15%)
  riskAssessment: {
    sectorExposurePass: boolean;
    riskRewardPass: boolean;
    confidenceThresholdPass: boolean;
    volatilityPass: boolean;
    consensusPass: boolean;
  };
  filterExplanation: string;
}

export class MetaLabelingFilter {
  /**
   * Filters Stage 1 & Stage 2 outputs to issue final execution decision (BUY_READY vs NO_TRADE)
   */
  public static evaluate(input: MetaLabelingInput): MetaLabelingOutput {
    const minHitRateThreshold = 70.0;
    const maxSectorLimit = input.maxSectorExposureLimitPct || 65.0;

    const probVerified = input.probabilityVerified ?? false;
    const calibratedProb = input.calibratedResult?.calibratedProbability ?? 0;

    const confidenceThresholdPass = probVerified && calibratedProb >= minHitRateThreshold;
    const sectorExposurePass = input.currentSectorExposurePct < maxSectorLimit;
    const riskRewardPass = input.riskRewardRatio >= 1.8;
    const volatilityPass = !input.volatilityAnomalous;
    const consensusPass = input.modelAgreementPct === null || input.modelAgreementPct >= 75.0;

    let decision: "BUY_READY" | "NO_TRADE" = "BUY_READY";
    let noTradeReason = "";

    if (!probVerified) {
      decision = "NO_TRADE";
      noTradeReason = "ML 확률 및 Calibration 미검증 (REAL_ML_REQUIRED) - 자율 체결 차단";
    } else if (!sectorExposurePass) {
      decision = "NO_TRADE";
      noTradeReason = `${input.sectorName} 업종 한도 (현재 ${input.currentSectorExposurePct}% / 제한 ${maxSectorLimit}%) 초과 위험 방지 차단`;
    } else if (!confidenceThresholdPass) {
      decision = "NO_TRADE";
      noTradeReason = `보정 점수(${calibratedProb}%) < 기준 임계치(${minHitRateThreshold}%) 미달`;
    } else if (!riskRewardPass) {
      decision = "NO_TRADE";
      noTradeReason = `손익비(${input.riskRewardRatio.toFixed(2)}) < 최소 손익비(1.80) 기준 미달`;
    } else if (!volatilityPass) {
      decision = "NO_TRADE";
      noTradeReason = "돌발 변동성 이상 징후 (Macro Volatility Anomaly) 차단";
    } else if (!consensusPass) {
      decision = "NO_TRADE";
      noTradeReason = `다중 AI 모델 합의율(${input.modelAgreementPct}%) < 최소 기준(75%) 미달`;
    }

    const basePosition = decision === "BUY_READY" ? Math.min(25, Math.max(5, Math.round((calibratedProb - 50) * 0.6))) : 0;

    return {
      decision,
      executionProbability: decision === "BUY_READY" ? calibratedProb : 0,
      noTradeReason: decision === "NO_TRADE" ? noTradeReason : undefined,
      positionSizingPct: basePosition,
      riskAssessment: {
        sectorExposurePass,
        riskRewardPass,
        confidenceThresholdPass,
        volatilityPass,
        consensusPass
      },
      filterExplanation: decision === "BUY_READY"
        ? `모든 5대 리스크 검증 관문 통과. 보정 점수 ${calibratedProb}% / 포트폴리오 비중 ${basePosition}% 자율 체결 승인.`
        : `NO_TRADE 리스크 게이트 차단: ${noTradeReason}`
    };
  }
}
