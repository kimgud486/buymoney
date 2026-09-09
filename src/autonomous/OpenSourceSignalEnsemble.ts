/**
 * OpenSourceSignalEnsemble.ts
 *
 * Inspired by FinRL-X & Qlib architecture:
 * Separates Stock Selection, Timing & Momentum, Risk Overlay, and Execution Control.
 * Applies Ensemble Scoring + R:R / RVOL / RSI / ATR Hard Risk Gates.
 *
 * STRICT SAFETY RULE:
 * - approvalRequired IS ALWAYS true
 * - liveAutoOrderEnabled IS ALWAYS false
 * AI evaluates and recommends YES/WATCH/NO; Human trader retains final authorization.
 */

import { ExplainableTradeIdea } from "../scanner/ExplainableOpportunityScannerEngine";

export interface EnsembleEvaluationResult {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  decision: "YES" | "REVIEW_READY" | "WATCH" | "NO";
  ensembleScore: number;
  rrRatio: number;
  rvol: number;
  rsi: number;
  atrPct: number;
  
  entryPrice: number;
  stopLossPrice: number;
  targetPrice: number;
  
  approvalRequired: boolean; // Always true
  liveAutoOrderEnabled: boolean; // Always false
  
  bullishReasons: string[];
  riskReasons: string[];
  summaryMessage: string;
  evaluatedAt: string;
}

export class OpenSourceSignalEnsemble {
  /**
   * Evaluates a trade idea or candidate stock through FinRL-X/Qlib multi-agent ensemble gates.
   */
  public static evaluateCandidate(idea: Partial<ExplainableTradeIdea>): EnsembleEvaluationResult {
    const symbol = idea.symbol || "UNKNOWN";
    const name = idea.name || symbol;
    const market = idea.market || "KOREA";
    const price = idea.price || idea.entryHigh || 10000;

    const rsi = idea.rsi ?? 52;
    const rvol = idea.rvol ?? 1.8;
    const adx = idea.adx ?? 28;
    const atrPct = idea.atrPct ?? 2.5;

    const entry = price;
    const stopLoss = idea.stop && idea.stop < entry ? idea.stop : Math.round(entry * (1 - (atrPct * 1.5) / 100));
    const targetPrice = idea.target1 && idea.target1 > entry ? idea.target1 : Math.round(entry * (1 + (atrPct * 3.5) / 100));

    const risk = Math.max(0.001, entry - stopLoss);
    const reward = Math.max(0.001, targetPrice - entry);
    const rawRR = reward / risk;
    const rrRatio = Math.round(rawRR * 100) / 100;

    // Component Scores (FinRL-X Layered Evaluation)
    // 1. Trend & Momentum (0-25)
    let trendScore = 15;
    if (adx >= 25) trendScore += 5;
    if (rsi >= 45 && rsi <= 65) trendScore += 5;

    // 2. Volume & RVOL (0-25)
    let volumeScore = 12;
    if (rvol >= 2.0) volumeScore = 25;
    else if (rvol >= 1.5) volumeScore = 20;
    else if (rvol >= 1.2) volumeScore = 15;

    // 3. Pattern & Structure (0-25)
    let patternScore = 15;
    if (idea.grade === "S" || idea.grade === "A+") patternScore = 25;
    else if (idea.grade === "A") patternScore = 20;

    // 4. Risk / Reward Quality (0-25)
    let rrScore = 10;
    if (rrRatio >= 2.5) rrScore = 25;
    else if (rrRatio >= 2.0) rrScore = 20;
    else if (rrRatio >= 1.5) rrScore = 15;

    const ensembleScore = Math.min(100, trendScore + volumeScore + patternScore + rrScore);

    // Hard Risk Gate Verification
    const bullishReasons: string[] = [];
    const riskReasons: string[] = [];

    if (rrRatio >= 1.5) {
      bullishReasons.push(`손익비(R:R) ${rrRatio.toFixed(2)}:1 충족 (최저 기준 1.5:1 이상)`);
    } else {
      riskReasons.push(`손익비 미달 (${rrRatio.toFixed(2)}:1 < 1.5:1)`);
    }

    if (rvol >= 1.2) {
      bullishReasons.push(`상대거래량(RVOL) ${rvol.toFixed(2)}x 거래 수급 확인`);
    } else {
      riskReasons.push(`상대거래량 부족 (${rvol.toFixed(2)}x < 1.2x)`);
    }

    if (rsi >= 30 && rsi <= 70) {
      bullishReasons.push(`RSI ${rsi.toFixed(1)} 정상 매수 가능 구간 (30~70)`);
    } else if (rsi > 70) {
      riskReasons.push(`RSI ${rsi.toFixed(1)} 과매수 추격 경고`);
    } else {
      riskReasons.push(`RSI ${rsi.toFixed(1)} 과매도 이탈 중`);
    }

    if (atrPct <= 8.0) {
      bullishReasons.push(`ATR 변동성 ${atrPct.toFixed(1)}% 안심 범위`);
    } else {
      riskReasons.push(`고변동성 위험 (${atrPct.toFixed(1)}% > 8.0%)`);
    }

    // Final Decision Categorization
    let decision: "YES" | "REVIEW_READY" | "WATCH" | "NO";
    if (riskReasons.length === 0 && ensembleScore >= 80 && rrRatio >= 1.8) {
      decision = "REVIEW_READY"; // Ready for human approval ("YES")
    } else if (riskReasons.length === 0 && ensembleScore >= 70) {
      decision = "YES";
    } else if (ensembleScore >= 55) {
      decision = "WATCH";
    } else {
      decision = "NO";
    }

    const summaryMessage =
      decision === "REVIEW_READY" || decision === "YES"
        ? `FinRL-X/Qlib 앙상블 점수 ${ensembleScore}점 / R:R ${rrRatio.toFixed(2)} - 모든 위험검증 통과. 사용자 승인 대기중.`
        : decision === "WATCH"
        ? `앙상블 점수 ${ensembleScore}점 - 관망 대상. 추세 수급 보완 필요.`
        : `앙상블 점수 ${ensembleScore}점 - 위험 요인 발견 (${riskReasons.join(", ")})`;

    return {
      symbol,
      name,
      market,
      decision,
      ensembleScore,
      rrRatio,
      rvol,
      rsi,
      atrPct,
      entryPrice: entry,
      stopLossPrice: stopLoss,
      targetPrice,
      approvalRequired: true,
      liveAutoOrderEnabled: false,
      bullishReasons,
      riskReasons,
      summaryMessage,
      evaluatedAt: new Date().toISOString(),
    };
  }
}
