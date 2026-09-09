/**
 * OpenSourceSignalEnsemble.ts
 *
 * Architecture inspired by MIT-licensed open-source quantitative stacks such as
 * FinRL and Microsoft Qlib: stock selection, timing/momentum, risk overlay and
 * execution authorization stay separate. This implementation is original project
 * code and deliberately fails closed.
 *
 * IMPORTANT:
 * - Missing market/indicator inputs are never replaced with synthetic defaults.
 * - Numeric completeness alone is not enough. Production YES requires explicit
 *   verified market-data and verified-indicator provenance from the server.
 * - A strong signal is not an execution authorization.
 * - AUTO_LIVE can only be reported as enabled when a server-side execution gate has
 *   already authorized the exact decision.
 */

import { ExplainableTradeIdea } from "../scanner/ExplainableOpportunityScannerEngine";

export type SignalExecutionMode = "ANALYSIS" | "ASSISTED" | "AUTO_LIVE";

export interface SignalExecutionContext {
  mode: SignalExecutionMode;
  serverExecutionAuthorized?: boolean;
}

export type VerifiedSignalCandidate = Partial<ExplainableTradeIdea> & {
  /** Must be asserted by a server-owned verified market-data adapter. */
  marketDataVerified?: boolean;
  /** Must be asserted after indicators are calculated from the verified candles. */
  indicatorDataVerified?: boolean;
  /** Human-readable provider/runtime identifier, never used as authorization by itself. */
  dataSource?: string;
  /** Exchange/feed event time for freshness/audit display. */
  marketTimestamp?: string;
};

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

  executionMode: SignalExecutionMode;
  approvalRequired: boolean;
  liveAutoOrderEnabled: boolean;
  dataComplete: boolean;
  marketDataVerified: boolean;
  indicatorDataVerified: boolean;
  dataSource?: string;
  marketTimestamp?: string;

  bullishReasons: string[];
  riskReasons: string[];
  summaryMessage: string;
  evaluatedAt: string;
}

const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export class OpenSourceSignalEnsemble {
  /**
   * Evaluate a verified scanner candidate. The caller must provide real values and
   * explicit server-side provenance. No price, RSI, RVOL, ADX, ATR, stop or target
   * fallback is generated here.
   */
  public static evaluateCandidate(
    idea: VerifiedSignalCandidate,
    execution: SignalExecutionContext = { mode: "ANALYSIS" },
  ): EnsembleEvaluationResult {
    const symbol = typeof idea.symbol === "string" && idea.symbol.trim() ? idea.symbol.trim() : "UNKNOWN";
    const name = typeof idea.name === "string" && idea.name.trim() ? idea.name.trim() : symbol;
    const market: "KOREA" | "US" | "BTC" =
      idea.market === "US" || idea.market === "BTC" ? idea.market : "KOREA";

    const missing: string[] = [];
    if (idea.marketDataVerified !== true) missing.push("MARKET_DATA_NOT_VERIFIED");
    if (idea.indicatorDataVerified !== true) missing.push("INDICATOR_DATA_NOT_VERIFIED");
    if (!finite(idea.price) || idea.price <= 0) missing.push("PRICE_MISSING_OR_INVALID");
    if (!finite(idea.rsi)) missing.push("RSI_MISSING");
    if (!finite(idea.rvol)) missing.push("RVOL_MISSING");
    if (!finite(idea.adx)) missing.push("ADX_MISSING");
    if (!finite(idea.atrPct) || idea.atrPct <= 0) missing.push("ATR_MISSING_OR_INVALID");
    if (!finite(idea.stop) || !finite(idea.price) || idea.stop <= 0 || idea.stop >= idea.price) {
      missing.push("STOP_MISSING_OR_INVALID");
    }
    if (!finite(idea.target1) || !finite(idea.price) || idea.target1 <= idea.price) {
      missing.push("TARGET_MISSING_OR_INVALID");
    }
    if (!idea.grade) missing.push("PATTERN_GRADE_MISSING");

    if (missing.length > 0) {
      return {
        symbol,
        name,
        market,
        decision: "NO",
        ensembleScore: 0,
        rrRatio: 0,
        rvol: finite(idea.rvol) ? idea.rvol : 0,
        rsi: finite(idea.rsi) ? idea.rsi : 0,
        atrPct: finite(idea.atrPct) ? idea.atrPct : 0,
        entryPrice: finite(idea.price) ? idea.price : 0,
        stopLossPrice: finite(idea.stop) ? idea.stop : 0,
        targetPrice: finite(idea.target1) ? idea.target1 : 0,
        executionMode: execution.mode,
        approvalRequired: execution.mode === "ASSISTED",
        liveAutoOrderEnabled: false,
        dataComplete: false,
        marketDataVerified: idea.marketDataVerified === true,
        indicatorDataVerified: idea.indicatorDataVerified === true,
        dataSource: idea.dataSource,
        marketTimestamp: idea.marketTimestamp,
        bullishReasons: [],
        riskReasons: missing,
        summaryMessage: `검증 가능한 실시간 입력/출처 부족으로 NO_TRADE: ${missing.join(", ")}`,
        evaluatedAt: new Date().toISOString(),
      };
    }

    const price = idea.price as number;
    const rsi = idea.rsi as number;
    const rvol = idea.rvol as number;
    const adx = idea.adx as number;
    const atrPct = idea.atrPct as number;
    const stopLoss = idea.stop as number;
    const targetPrice = idea.target1 as number;

    const risk = price - stopLoss;
    const reward = targetPrice - price;
    const rrRatio = Math.round((reward / risk) * 100) / 100;

    let trendScore = 10;
    if (adx >= 20) trendScore += 5;
    if (adx >= 25) trendScore += 5;
    if (rsi >= 45 && rsi <= 65) trendScore += 5;

    let volumeScore = 0;
    if (rvol >= 2.0) volumeScore = 25;
    else if (rvol >= 1.5) volumeScore = 20;
    else if (rvol >= 1.2) volumeScore = 15;
    else if (rvol >= 1.0) volumeScore = 8;

    let patternScore = 0;
    if (idea.grade === "S" || idea.grade === "A+") patternScore = 25;
    else if (idea.grade === "A") patternScore = 20;
    else if (idea.grade === "B") patternScore = 12;
    else patternScore = 5;

    let rrScore = 0;
    if (rrRatio >= 2.5) rrScore = 25;
    else if (rrRatio >= 2.0) rrScore = 20;
    else if (rrRatio >= 1.5) rrScore = 15;
    else if (rrRatio >= 1.0) rrScore = 7;

    const ensembleScore = Math.min(100, trendScore + volumeScore + patternScore + rrScore);
    const bullishReasons: string[] = [];
    const riskReasons: string[] = [];

    if (rrRatio >= 1.5) bullishReasons.push(`손익비(R:R) ${rrRatio.toFixed(2)}:1 충족`);
    else riskReasons.push(`손익비 미달 (${rrRatio.toFixed(2)}:1 < 1.5:1)`);

    if (rvol >= 1.2) bullishReasons.push(`상대거래량(RVOL) ${rvol.toFixed(2)}x 확인`);
    else riskReasons.push(`상대거래량 부족 (${rvol.toFixed(2)}x < 1.2x)`);

    if (rsi >= 30 && rsi <= 70) bullishReasons.push(`RSI ${rsi.toFixed(1)} 허용 범위`);
    else if (rsi > 70) riskReasons.push(`RSI ${rsi.toFixed(1)} 과매수 추격 위험`);
    else riskReasons.push(`RSI ${rsi.toFixed(1)} 과매도 구간`);

    if (adx >= 20) bullishReasons.push(`ADX ${adx.toFixed(1)} 추세 강도 확인`);
    else riskReasons.push(`ADX ${adx.toFixed(1)} 추세 강도 부족`);

    if (atrPct <= 8.0) bullishReasons.push(`ATR 변동성 ${atrPct.toFixed(1)}% 허용 범위`);
    else riskReasons.push(`고변동성 위험 (${atrPct.toFixed(1)}% > 8.0%)`);

    let decision: "YES" | "REVIEW_READY" | "WATCH" | "NO";
    if (riskReasons.length === 0 && ensembleScore >= 82 && rrRatio >= 1.8) decision = "YES";
    else if (riskReasons.length === 0 && ensembleScore >= 70) decision = "REVIEW_READY";
    else if (ensembleScore >= 55) decision = "WATCH";
    else decision = "NO";

    const serverAuthorized = execution.serverExecutionAuthorized === true;
    const liveAutoOrderEnabled =
      execution.mode === "AUTO_LIVE" && serverAuthorized && decision === "YES";
    const approvalRequired = execution.mode === "ASSISTED" && (decision === "YES" || decision === "REVIEW_READY");

    const summaryMessage =
      decision === "YES"
        ? execution.mode === "AUTO_LIVE"
          ? serverAuthorized
            ? `앙상블 ${ensembleScore}점 / R:R ${rrRatio.toFixed(2)}. 서버 실행 게이트 승인 완료.`
            : `앙상블 ${ensembleScore}점 / R:R ${rrRatio.toFixed(2)}. 서버 실행 게이트 검증 필요.`
          : `앙상블 ${ensembleScore}점 / R:R ${rrRatio.toFixed(2)}. 실행 모드 ${execution.mode}.`
        : decision === "REVIEW_READY"
          ? `앙상블 ${ensembleScore}점. 추가 검토 대상이며 자동주문 대상이 아닙니다.`
          : decision === "WATCH"
            ? `앙상블 ${ensembleScore}점. 관망 대상입니다.`
            : `앙상블 ${ensembleScore}점. 위험 요인: ${riskReasons.join(", ")}`;

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
      entryPrice: price,
      stopLossPrice: stopLoss,
      targetPrice,
      executionMode: execution.mode,
      approvalRequired,
      liveAutoOrderEnabled,
      dataComplete: true,
      marketDataVerified: true,
      indicatorDataVerified: true,
      dataSource: idea.dataSource,
      marketTimestamp: idea.marketTimestamp,
      bullishReasons,
      riskReasons,
      summaryMessage,
      evaluatedAt: new Date().toISOString(),
    };
  }
}
