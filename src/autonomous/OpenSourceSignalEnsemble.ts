/**
 * OpenSourceSignalEnsemble.ts
 *
 * Layered ensemble scoring inspired by open-source quantitative research stacks
 * such as Qlib and FinRL. Production rule: verified inputs only.
 * Missing data is never replaced with optimistic defaults.
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
  approvalRequired: boolean;
  liveAutoOrderEnabled: boolean;
  bullishReasons: string[];
  riskReasons: string[];
  summaryMessage: string;
  evaluatedAt: string;
}

const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isPositive = (v: unknown): v is number => isFiniteNumber(v) && v > 0;

export class OpenSourceSignalEnsemble {
  public static evaluateCandidate(idea: Partial<ExplainableTradeIdea>): EnsembleEvaluationResult {
    const symbol = idea.symbol || "UNKNOWN";
    const name = idea.name || symbol;
    const market = idea.market || "KOREA";
    const evaluatedAt = new Date().toISOString();

    const price = isPositive(idea.price) ? idea.price : isPositive(idea.entryHigh) ? idea.entryHigh : 0;
    const rsi = isFiniteNumber(idea.rsi) ? idea.rsi : 0;
    const rvol = isFiniteNumber(idea.rvol) ? idea.rvol : 0;
    const adx = isFiniteNumber(idea.adx) ? idea.adx : 0;
    const atrPct = isPositive(idea.atrPct) ? idea.atrPct : 0;

    const missing: string[] = [];
    if (!isPositive(price)) missing.push("price");
    if (!isFiniteNumber(idea.rsi)) missing.push("RSI");
    if (!isFiniteNumber(idea.rvol)) missing.push("RVOL");
    if (!isFiniteNumber(idea.adx)) missing.push("ADX");
    if (!isPositive(idea.atrPct)) missing.push("ATR");
    if (!idea.grade) missing.push("grade/pattern");

    if (missing.length > 0) {
      return {
        symbol,
        name,
        market,
        decision: "NO",
        ensembleScore: 0,
        rrRatio: 0,
        rvol,
        rsi,
        atrPct,
        entryPrice: price,
        stopLossPrice: 0,
        targetPrice: 0,
        approvalRequired: true,
        liveAutoOrderEnabled: false,
        bullishReasons: [],
        riskReasons: [`검증 데이터 누락: ${missing.join(", ")}`],
        summaryMessage: `NO_DATA / NO_TRADE: ${missing.join(", ")} 검증값이 없어 후보에서 제외했습니다.`,
        evaluatedAt,
      };
    }

    const entry = price;
    const stopLoss = isPositive(idea.stop) && idea.stop < entry
      ? idea.stop
      : Math.round(entry * (1 - (atrPct * 1.5) / 100));
    const targetPrice = isPositive(idea.target1) && idea.target1 > entry
      ? idea.target1
      : Math.round(entry * (1 + (atrPct * 3.5) / 100));

    const risk = Math.max(0.001, entry - stopLoss);
    const reward = Math.max(0.001, targetPrice - entry);
    const rrRatio = Math.round((reward / risk) * 100) / 100;

    let trendScore = 15;
    if (adx >= 25) trendScore += 5;
    if (rsi >= 45 && rsi <= 65) trendScore += 5;

    const volumeScore = rvol >= 2 ? 25 : rvol >= 1.5 ? 20 : rvol >= 1.2 ? 15 : 12;
    const patternScore = idea.grade === "S" || idea.grade === "A+" ? 25 : idea.grade === "A" ? 20 : 15;
    const rrScore = rrRatio >= 2.5 ? 25 : rrRatio >= 2 ? 20 : rrRatio >= 1.5 ? 15 : 10;
    const ensembleScore = Math.min(100, trendScore + volumeScore + patternScore + rrScore);

    const bullishReasons: string[] = [];
    const riskReasons: string[] = [];

    if (rrRatio >= 1.5) bullishReasons.push(`R:R ${rrRatio.toFixed(2)}:1 충족`);
    else riskReasons.push(`R:R 미달 ${rrRatio.toFixed(2)}:1`);

    if (rvol >= 1.2) bullishReasons.push(`RVOL ${rvol.toFixed(2)}x 수급 확인`);
    else riskReasons.push(`RVOL 부족 ${rvol.toFixed(2)}x`);

    if (rsi >= 30 && rsi <= 70) bullishReasons.push(`RSI ${rsi.toFixed(1)} 허용 범위`);
    else riskReasons.push(`RSI 위험 구간 ${rsi.toFixed(1)}`);

    if (atrPct <= 8) bullishReasons.push(`ATR ${atrPct.toFixed(1)}% 허용 범위`);
    else riskReasons.push(`ATR 고변동성 ${atrPct.toFixed(1)}%`);

    let decision: EnsembleEvaluationResult["decision"];
    if (riskReasons.length === 0 && ensembleScore >= 82 && rrRatio >= 1.8) decision = "REVIEW_READY";
    else if (riskReasons.length === 0 && ensembleScore >= 72) decision = "YES";
    else if (ensembleScore >= 55) decision = "WATCH";
    else decision = "NO";

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
      summaryMessage:
        decision === "YES" || decision === "REVIEW_READY"
          ? `앙상블 ${ensembleScore}점 / R:R ${rrRatio.toFixed(2)}. 검증 게이트 통과.`
          : decision === "WATCH"
            ? `앙상블 ${ensembleScore}점. 추가 확인 필요.`
            : `거래 제외: ${riskReasons.join(", ")}`,
      evaluatedAt,
    };
  }
}
