/**
 * OpenSourceSignalEnsemble.ts
 *
 * Safe scan-to-review ensemble for buymoney.
 * Architecture inspiration: FinRL-X / Qlib style separation of
 * signal generation, timing/liquidity overlays, risk gates, and execution.
 *
 * IMPORTANT:
 * - This module never sends broker orders.
 * - approvalRequired is always true.
 * - liveAutoOrderEnabled is always false.
 * - Missing market data is treated as a risk, never replaced by synthetic values.
 */

import type { ExplainableTradeIdea } from "../scanner/ExplainableOpportunityScannerEngine";

export type EnsembleDecision = "REVIEW_READY" | "WATCH" | "NO";

export interface EnsembleEvaluationResult {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  decision: EnsembleDecision;
  ensembleScore: number;
  sourceScore: number;
  rrRatio: number;
  rvol: number;
  rsi: number;
  atrPct: number;
  adx: number;
  entryLow: number;
  entryHigh: number;
  entryPrice: number;
  stopLossPrice: number;
  targetPrice: number;
  target2Price: number;
  approvalRequired: true;
  liveAutoOrderEnabled: false;
  bullishReasons: string[];
  riskReasons: string[];
  summaryMessage: string;
  evaluatedAt: string;
}

export interface ScannerEvidenceInput {
  symbol: string;
  name: string;
  market: "KR" | "US" | "CRYPTO";
  sourceScore: number;
  dataCoveragePct: number;
  dataStatus: string;
  rvol: number | null | undefined;
  rsi: number | null | undefined;
  atrPct: number | null | undefined;
  hasRelativeStrength: boolean;
  hasVwap: boolean;
  hasEma20: boolean;
  hasPattern: boolean;
  trueMtfPassed: boolean;
  sourceRecommendation: "BUY_CANDIDATE" | "WATCH" | "REJECT";
}

export interface ScannerEvidenceEvaluation {
  decision: EnsembleDecision;
  ensembleScore: number;
  approvalRequired: true;
  liveAutoOrderEnabled: false;
  riskReasons: string[];
  bullishReasons: string[];
}

export interface EnsemblePolicy {
  minimumSourceScore: number;
  minimumReviewScore: number;
  minimumRiskReward: number;
  minimumRvol: number;
  preferredRsiLow: number;
  preferredRsiHigh: number;
  maximumAtrPct: number;
}

export const DEFAULT_ENSEMBLE_POLICY: EnsemblePolicy = {
  minimumSourceScore: 78,
  minimumReviewScore: 78,
  minimumRiskReward: 1.5,
  minimumRvol: 1.2,
  preferredRsiLow: 45,
  preferredRsiHigh: 70,
  maximumAtrPct: 8,
};

const finiteOrNull = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const clamp = (value: number, low = 0, high = 100): number =>
  Math.max(low, Math.min(high, value));

const normalizeMarket = (value: unknown): "KOREA" | "US" | "BTC" => {
  const market = String(value || "").toUpperCase();
  if (market === "US") return "US";
  if (market === "BTC" || market === "UPBIT" || market === "CRYPTO") return "BTC";
  return "KOREA";
};

export class OpenSourceSignalEnsemble {
  public static evaluateScannerEvidence(
    input: ScannerEvidenceInput,
    policy: EnsemblePolicy = DEFAULT_ENSEMBLE_POLICY,
  ): ScannerEvidenceEvaluation {
    const riskReasons: string[] = [];
    const bullishReasons: string[] = [];
    const sourceScore = clamp(input.sourceScore);
    const coverage = clamp(input.dataCoveragePct);
    const rvol = finiteOrNull(input.rvol);
    const rsi = finiteOrNull(input.rsi);
    const atrPct = finiteOrNull(input.atrPct);

    if (input.dataStatus !== "REALTIME_VERIFIED") riskReasons.push(`데이터 상태 ${input.dataStatus}`);
    if (coverage < 75) riskReasons.push(`검증 데이터 커버리지 ${coverage}% < 75%`);
    else bullishReasons.push(`검증 데이터 커버리지 ${coverage}%`);
    if (!input.hasRelativeStrength) riskReasons.push("상대강도 실측값이 없습니다.");
    if (!input.hasVwap) riskReasons.push("VWAP 실측값이 없습니다.");
    if (!input.hasEma20) riskReasons.push("EMA20 실측값이 없습니다.");
    if (!input.hasPattern) riskReasons.push("실행 가능한 패턴 검증이 없습니다.");
    if (!input.trueMtfPassed) riskReasons.push("실제 다중시간봉 검증을 통과하지 못했습니다.");
    if (rvol === null) riskReasons.push("RVOL 실측값이 없습니다.");
    else if (rvol < policy.minimumRvol) riskReasons.push(`RVOL ${rvol.toFixed(2)}x < ${policy.minimumRvol}x`);
    else bullishReasons.push(`RVOL ${rvol.toFixed(2)}x`);
    if (rsi === null) riskReasons.push("RSI 실측값이 없습니다.");
    else if (rsi < policy.preferredRsiLow || rsi > policy.preferredRsiHigh) riskReasons.push(`RSI ${rsi.toFixed(1)}이 선호 구간 밖입니다.`);
    else bullishReasons.push(`RSI ${rsi.toFixed(1)}`);
    if (atrPct === null) riskReasons.push("ATR% 실측값이 없습니다.");
    else if (atrPct > policy.maximumAtrPct) riskReasons.push(`ATR 변동성 ${atrPct.toFixed(1)}% > ${policy.maximumAtrPct}%`);
    if (sourceScore < policy.minimumSourceScore) riskReasons.push(`원본 스캐너 점수 ${sourceScore} < ${policy.minimumSourceScore}`);
    if (input.sourceRecommendation !== "BUY_CANDIDATE") riskReasons.push(`원본 추천 ${input.sourceRecommendation}`);

    const evidenceFlags = [
      input.dataStatus === "REALTIME_VERIFIED",
      coverage >= 75,
      input.hasRelativeStrength,
      input.hasVwap,
      input.hasEma20,
      input.hasPattern,
      input.trueMtfPassed,
      rvol !== null && rvol >= policy.minimumRvol,
      rsi !== null && rsi >= policy.preferredRsiLow && rsi <= policy.preferredRsiHigh,
      atrPct !== null && atrPct <= policy.maximumAtrPct,
    ];
    const evidenceQuality = (evidenceFlags.filter(Boolean).length / evidenceFlags.length) * 100;
    const ensembleScore = Math.round(clamp(sourceScore * 0.65 + coverage * 0.15 + evidenceQuality * 0.20));

    const hardGateFailed =
      input.dataStatus !== "REALTIME_VERIFIED" ||
      coverage < 75 ||
      !input.hasRelativeStrength ||
      !input.hasVwap ||
      !input.hasEma20 ||
      !input.hasPattern ||
      !input.trueMtfPassed ||
      rvol === null || rvol < policy.minimumRvol ||
      rsi === null ||
      atrPct === null || atrPct > policy.maximumAtrPct ||
      sourceScore < policy.minimumSourceScore ||
      input.sourceRecommendation !== "BUY_CANDIDATE";

    let decision: EnsembleDecision = "NO";
    if (!hardGateFailed && ensembleScore >= policy.minimumReviewScore) decision = "REVIEW_READY";
    else if (input.dataStatus === "REALTIME_VERIFIED" && coverage >= 60 && sourceScore >= 60) decision = "WATCH";

    return {
      decision,
      ensembleScore,
      approvalRequired: true,
      liveAutoOrderEnabled: false,
      riskReasons: Array.from(new Set(riskReasons)).slice(0, 10),
      bullishReasons: Array.from(new Set(bullishReasons)).slice(0, 8),
    };
  }

  public static evaluateCandidate(
    idea: Partial<ExplainableTradeIdea>,
    policy: EnsemblePolicy = DEFAULT_ENSEMBLE_POLICY,
  ): EnsembleEvaluationResult {
    const symbol = String(idea.symbol || "").trim() || "UNKNOWN";
    const name = String(idea.name || symbol);
    const market = normalizeMarket(idea.market);

    const price = finiteOrNull(idea.price);
    const entryLowRaw = finiteOrNull(idea.entryLow);
    const entryHighRaw = finiteOrNull(idea.entryHigh);
    const stop = finiteOrNull(idea.stop);
    const target1 = finiteOrNull(idea.target1);
    const target2 = finiteOrNull(idea.target2);
    const sourceScoreRaw = finiteOrNull(idea.score);
    const rsiRaw = finiteOrNull(idea.rsi);
    const rvolRaw = finiteOrNull(idea.rvol);
    const atrPctRaw = finiteOrNull(idea.atrPct);
    const adxRaw = finiteOrNull(idea.adx);

    const sourceScore = clamp(sourceScoreRaw ?? 0);
    const rsi = clamp(rsiRaw ?? 0, 0, 100);
    const rvol = Math.max(0, rvolRaw ?? 0);
    const atrPct = Math.max(0, atrPctRaw ?? 0);
    const adx = Math.max(0, adxRaw ?? 0);

    const entryLow = entryLowRaw ?? price ?? 0;
    const entryHigh = entryHighRaw ?? price ?? 0;
    const entryPrice = entryLow > 0 && entryHigh > 0 ? (entryLow + entryHigh) / 2 : price ?? 0;
    const stopLossPrice = stop ?? 0;
    const targetPrice = target1 ?? 0;
    const target2Price = target2 ?? 0;

    const risk = entryPrice > 0 && stopLossPrice > 0 ? entryPrice - stopLossPrice : 0;
    const reward = entryPrice > 0 && targetPrice > 0 ? targetPrice - entryPrice : 0;
    const rrRatio = risk > 0 && reward > 0 ? Number((reward / risk).toFixed(2)) : 0;

    const bullishReasons = Array.isArray(idea.bullishReasons) ? [...idea.bullishReasons] : [];
    const riskReasons = Array.isArray(idea.riskReasons) ? [...idea.riskReasons] : [];

    if (price === null || price <= 0) riskReasons.push("실시간 현재가가 확인되지 않았습니다.");
    if (sourceScoreRaw === null) riskReasons.push("Opportunity Score가 확인되지 않았습니다.");
    if (rsiRaw === null) riskReasons.push("RSI 실측값이 확인되지 않았습니다.");
    if (rvolRaw === null) riskReasons.push("RVOL 실측값이 확인되지 않았습니다.");
    if (atrPctRaw === null) riskReasons.push("ATR 변동성 실측값이 확인되지 않았습니다.");
    if (entryLowRaw === null || entryHighRaw === null || entryLow <= 0 || entryHigh < entryLow) riskReasons.push("검증된 진입구간이 확인되지 않았습니다.");
    if (stop === null || stopLossPrice <= 0 || stopLossPrice >= entryLow) riskReasons.push("유효한 손절가가 진입구간 아래에 확인되지 않았습니다.");
    if (target1 === null || targetPrice <= entryHigh) riskReasons.push("유효한 목표1 가격이 진입구간 위에 확인되지 않았습니다.");
    if (idea.wouldBuy !== true) riskReasons.push("기존 Explainable Scanner의 wouldBuy=true 검증이 확인되지 않았습니다.");
    if (sourceScore < policy.minimumSourceScore) riskReasons.push(`Opportunity Score ${sourceScore} < ${policy.minimumSourceScore}`);
    if (rrRatio < policy.minimumRiskReward) riskReasons.push(`손익비 ${rrRatio.toFixed(2)} < ${policy.minimumRiskReward}`); else bullishReasons.push(`목표1 기준 손익비 ${rrRatio.toFixed(2)}:1`);
    if (rvolRaw !== null && rvol < policy.minimumRvol) riskReasons.push(`RVOL ${rvol.toFixed(2)}x < ${policy.minimumRvol}x`); else if (rvolRaw !== null) bullishReasons.push(`RVOL ${rvol.toFixed(2)}x`);
    if (rsiRaw !== null && (rsi < policy.preferredRsiLow || rsi > policy.preferredRsiHigh)) riskReasons.push(`RSI ${rsi.toFixed(1)}이 선호 구간 ${policy.preferredRsiLow}~${policy.preferredRsiHigh} 밖입니다.`);
    if (atrPctRaw !== null && atrPct > policy.maximumAtrPct) riskReasons.push(`ATR 변동성 ${atrPct.toFixed(1)}% > ${policy.maximumAtrPct}%`);

    const alphaComponent = sourceScore * 0.60;
    const rrComponent = clamp((rrRatio / 3) * 100) * 0.20;
    const liquidityComponent = clamp((rvol / 2.5) * 100) * 0.10;
    const timingDistance = rsiRaw === null ? 20 : rsi < policy.preferredRsiLow ? policy.preferredRsiLow - rsi : rsi > policy.preferredRsiHigh ? rsi - policy.preferredRsiHigh : 0;
    const timingComponent = clamp(100 - timingDistance * 5) * 0.10;
    const ensembleScore = Math.round(clamp(alphaComponent + rrComponent + liquidityComponent + timingComponent));

    const hardDataMissing = price === null || sourceScoreRaw === null || rsiRaw === null || rvolRaw === null || atrPctRaw === null || entryLowRaw === null || entryHighRaw === null || stop === null || target1 === null;
    const hardGateFailed = hardDataMissing || idea.wouldBuy !== true || sourceScore < policy.minimumSourceScore || rrRatio < policy.minimumRiskReward || rvol < policy.minimumRvol || entryLow <= 0 || entryHigh < entryLow || stopLossPrice <= 0 || stopLossPrice >= entryLow || targetPrice <= entryHigh || atrPct > policy.maximumAtrPct;

    let decision: EnsembleDecision = "NO";
    if (!hardGateFailed && ensembleScore >= policy.minimumReviewScore) decision = "REVIEW_READY";
    else if (!hardDataMissing && sourceScore >= 60 && ensembleScore >= 55) decision = "WATCH";

    const summaryMessage = decision === "REVIEW_READY"
      ? `앙상블 ${ensembleScore}/100, R:R ${rrRatio.toFixed(2)}. 위험 게이트 통과, 사용자 최종 검토 가능.`
      : decision === "WATCH"
        ? `앙상블 ${ensembleScore}/100. 일부 조건이 부족하여 관망 대상으로 분류되었습니다.`
        : `앙상블 ${ensembleScore}/100. 데이터 또는 위험 게이트를 통과하지 못했습니다.`;

    return {
      symbol, name, market, decision, ensembleScore, sourceScore, rrRatio, rvol, rsi, atrPct, adx,
      entryLow, entryHigh, entryPrice, stopLossPrice, targetPrice, target2Price,
      approvalRequired: true, liveAutoOrderEnabled: false,
      bullishReasons: Array.from(new Set(bullishReasons)).slice(0, 8),
      riskReasons: Array.from(new Set(riskReasons)).slice(0, 10),
      summaryMessage, evaluatedAt: new Date().toISOString(),
    };
  }

  public static rankCandidates(ideas: Partial<ExplainableTradeIdea>[], limit = 5, policy: EnsemblePolicy = DEFAULT_ENSEMBLE_POLICY): EnsembleEvaluationResult[] {
    const rank = (decision: EnsembleDecision): number => decision === "REVIEW_READY" ? 2 : decision === "WATCH" ? 1 : 0;
    return ideas.map((idea) => this.evaluateCandidate(idea, policy)).sort((a, b) => {
      const decisionDiff = rank(b.decision) - rank(a.decision);
      if (decisionDiff !== 0) return decisionDiff;
      return b.ensembleScore - a.ensembleScore;
    }).slice(0, Math.max(1, limit));
  }
}
