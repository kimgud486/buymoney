import {
  evaluateVerifiedSignal,
  type ScannerCandle,
  type VerifiedSignalResult,
} from "./verifiedSignalEngine";

export type EasyScanStatus = "BUY_CHANCE" | "WAIT" | "RISK";
export type ChaseRisk = "LOW" | "MEDIUM" | "HIGH";

export interface PatternHistoryStats {
  pattern: string;
  sampleCount: number;
  successCount: number;
  failureCount: number;
  hitRate: number | null;
  averageGainPct: number | null;
  averageLossPct: number | null;
  recentHitRate: number | null;
  horizonBars: number;
  sufficient: boolean;
  message: string;
}

export interface ElementaryScanExplanation {
  status: EasyScanStatus;
  statusLabel: string;
  currentPrice: number;
  pattern: string;
  aiScore: number;
  rvol: number;
  support: number;
  pullbackLow: number;
  pullbackHigh: number;
  breakoutPrice: number;
  resistance: number;
  invalidation: number;
  target1: number;
  target2: number;
  chaseRisk: ChaseRisk;
  chaseRiskLabel: string;
  whyFound: string[];
  buyNowText: string;
  whenToWatchText: string;
  avoidText: string;
  oneLineSummary: string;
  patternHistory: PatternHistoryStats;
}

function finite(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function roundForMarket(value: number, market?: string): number {
  if (!Number.isFinite(value)) return 0;
  if (String(market || "").toUpperCase() === "US") return Number(value.toFixed(2));
  if (Math.abs(value) < 100) return Number(value.toFixed(4));
  return Math.round(value);
}

function easyReason(reason: string): string {
  const text = String(reason || "");
  const upper = text.toUpperCase();
  if (upper.includes("RVOL") || text.includes("거래량")) return "평소보다 거래가 많이 들어오는지 확인했어요.";
  if (upper.includes("VWAP")) return "가격이 중요한 평균 가격선 위에서 버티는지 확인했어요.";
  if (upper.includes("EMA")) return "짧은 평균선과 긴 평균선이 같은 방향인지 확인했어요.";
  if (upper.includes("MACD")) return "가격이 움직이는 힘이 커지고 있는지 확인했어요.";
  if (upper.includes("RSI")) return "가격이 너무 뜨겁거나 너무 약하지 않은지 확인했어요.";
  if (upper.includes("HH/HL") || upper.includes("HH_HL") || text.includes("시장구조")) return "고점과 저점이 위로 올라가는지 확인했어요.";
  if (text.includes("패턴") || upper.includes("PATTERN")) return "그래프에서 반복되는 모양이 나왔는지 확인했어요.";
  return text || "실시간 가격과 거래량을 함께 확인했어요.";
}

function emptyHistory(pattern: string, horizonBars: number, message: string): PatternHistoryStats {
  return {
    pattern,
    sampleCount: 0,
    successCount: 0,
    failureCount: 0,
    hitRate: null,
    averageGainPct: null,
    averageLossPct: null,
    recentHitRate: null,
    horizonBars,
    sufficient: false,
    message,
  };
}

/**
 * 같은 검증 패턴이 과거에 실제로 나타난 시점만 다시 계산합니다.
 * evaluateVerifiedSignal() 자체가 마지막 진행 중 캔들을 제외하므로 미래를 훔쳐보지 않습니다.
 * 성공 여부도 패턴 당시의 ATR을 이용해 시장 가격대에 맞게 판정합니다.
 */
export function calculatePatternHistory(
  inputCandles: unknown[],
  currentPattern: string,
  currentDirection: VerifiedSignalResult["direction"],
  horizonBars = 8,
  minSamples = 20,
): PatternHistoryStats {
  const candles: ScannerCandle[] = inputCandles
    .map((raw: any) => ({
      time: raw?.time ?? raw?.timestamp,
      timestamp: raw?.timestamp ?? raw?.time,
      open: finite(raw?.open),
      high: finite(raw?.high),
      low: finite(raw?.low),
      close: finite(raw?.close),
      volume: finite(raw?.volume),
    }))
    .filter((c) => c.open > 0 && c.high >= c.low && c.low > 0 && c.close > 0);

  if (!currentPattern || currentPattern === "NONE") {
    return emptyHistory("NONE", horizonBars, "아직 비교할 뚜렷한 패턴이 없어요.");
  }
  if (currentDirection === "NEUTRAL") {
    return emptyHistory(currentPattern, horizonBars, "방향이 아직 정해지지 않아 과거 적중률을 계산하지 않아요.");
  }
  if (candles.length < 70 + horizonBars) {
    return emptyHistory(currentPattern, horizonBars, "과거 캔들이 더 모이면 같은 모양의 성적을 보여줄게요.");
  }

  const events: Array<{ success: boolean; returnPct: number }> = [];
  // i는 당시의 마지막 '완료 캔들'. i+1 캔들을 일부러 붙여서 평가 함수가 그것을 진행 중 캔들로 제외하게 합니다.
  const lastUsableIndex = candles.length - horizonBars - 2;
  for (let i = 55; i <= lastUsableIndex; i += 1) {
    const snapshot = candles.slice(0, i + 2);
    const result = evaluateVerifiedSignal(snapshot);
    if (!result || result.pattern !== currentPattern || result.direction !== currentDirection) continue;

    const base = candles[i].close;
    const atr = Math.max(result.metrics.atr, base * 0.003);
    const future = candles.slice(i + 1, i + 1 + horizonBars);
    if (future.length < horizonBars) continue;

    const bullish = currentDirection === "BULLISH";
    const target = bullish ? base + atr * 1.2 : base - atr * 1.2;
    const stop = bullish ? base - atr : base + atr;
    let outcome: boolean | null = null;

    for (const bar of future) {
      const targetHit = bullish ? bar.high >= target : bar.low <= target;
      const stopHit = bullish ? bar.low <= stop : bar.high >= stop;
      // 같은 캔들에서 둘 다 닿으면 유리하게 추정하지 않고 실패 처리합니다.
      if (targetHit && stopHit) {
        outcome = false;
        break;
      }
      if (stopHit) {
        outcome = false;
        break;
      }
      if (targetHit) {
        outcome = true;
        break;
      }
    }

    if (outcome === null) {
      const finalClose = future[future.length - 1].close;
      outcome = bullish ? finalClose > base : finalClose < base;
    }
    const finalClose = future[future.length - 1].close;
    const rawReturn = ((finalClose - base) / base) * 100;
    const directionReturn = bullish ? rawReturn : -rawReturn;
    events.push({ success: outcome, returnPct: directionReturn });
  }

  const successCount = events.filter((e) => e.success).length;
  const failureCount = events.length - successCount;
  const wins = events.filter((e) => e.success).map((e) => e.returnPct);
  const losses = events.filter((e) => !e.success).map((e) => e.returnPct);
  const recent = events.slice(-20);
  const avg = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const hitRate = events.length ? (successCount / events.length) * 100 : null;
  const recentHitRate = recent.length ? (recent.filter((e) => e.success).length / recent.length) * 100 : null;
  const sufficient = events.length >= minSamples;

  return {
    pattern: currentPattern,
    sampleCount: events.length,
    successCount,
    failureCount,
    hitRate: hitRate == null ? null : Number(hitRate.toFixed(1)),
    averageGainPct: avg(wins) == null ? null : Number((avg(wins) as number).toFixed(2)),
    averageLossPct: avg(losses) == null ? null : Number((avg(losses) as number).toFixed(2)),
    recentHitRate: recentHitRate == null ? null : Number(recentHitRate.toFixed(1)),
    horizonBars,
    sufficient,
    message: sufficient
      ? `같은 모양 ${events.length}번 중 ${successCount}번이 정한 방향으로 움직였어요.`
      : `같은 모양이 ${events.length}번만 보여서 아직 자료가 적어요. 최소 ${minSamples}번은 모여야 적중률을 신뢰 표시해요.`,
  };
}

export function buildElementaryScanExplanation(
  inputCandles: unknown[],
  market?: string,
): ElementaryScanExplanation | null {
  const result = evaluateVerifiedSignal(inputCandles);
  if (!result) return null;

  const candles = inputCandles
    .map((raw: any) => ({
      open: finite(raw?.open), high: finite(raw?.high), low: finite(raw?.low), close: finite(raw?.close), volume: finite(raw?.volume),
    }))
    .filter((c) => c.open > 0 && c.high >= c.low && c.low > 0 && c.close > 0);
  // verifiedSignalEngine와 동일하게 가장 마지막 진행 중 캔들을 사용하지 않습니다.
  const complete = candles.slice(0, -1);
  if (complete.length < 55) return null;

  const current = result.metrics.close;
  const atr = Math.max(result.metrics.atr, current * 0.003);
  const recent20 = complete.slice(-21, -1);
  const recent8 = complete.slice(-8);
  const swingLow = Math.min(...recent8.map((c) => c.low));
  const resistance = recent20.length ? Math.max(...recent20.map((c) => c.high)) : Math.max(...recent8.map((c) => c.high));

  const supportCandidates = [result.metrics.vwap, result.metrics.ema20, swingLow]
    .filter((v) => Number.isFinite(v) && v > 0 && v <= current * 1.002);
  const support = supportCandidates.length ? Math.max(...supportCandidates) : swingLow;
  const pullbackCenter = Math.min(current, Math.max(support, result.entryLow));
  const pullbackLow = Math.max(result.stopLoss, pullbackCenter - atr * 0.25);
  const pullbackHigh = Math.min(current, pullbackCenter + atr * 0.2);
  const breakoutPrice = Math.max(current, resistance + atr * 0.08);
  const invalidation = Math.max(0, Math.min(result.stopLoss, support - atr * 0.15));

  const vwapDistanceAtr = (current - result.metrics.vwap) / Math.max(atr, 1e-9);
  const chaseRisk: ChaseRisk = result.metrics.rsi >= 76 || vwapDistanceAtr >= 2.0
    ? "HIGH"
    : result.metrics.rsi >= 70 || vwapDistanceAtr >= 1.2
      ? "MEDIUM"
      : "LOW";

  const status: EasyScanStatus = result.decision === "BUY_APPROVED" && chaseRisk !== "HIGH"
    ? "BUY_CHANCE"
    : result.direction === "BEARISH" || result.decision === "NO_BUY"
      ? "RISK"
      : "WAIT";

  const whyFound = Array.from(new Set(result.reasons.map(easyReason))).slice(0, 4);
  if (result.pattern !== "NONE") whyFound.push(`그래프에서 '${result.pattern.replaceAll("_", " ")}' 모양도 찾았어요.`);

  const f = (v: number) => roundForMarket(v, market).toLocaleString();
  const unit = String(market || "").toUpperCase() === "US" ? "$" : "원";
  const priceText = (v: number) => unit === "$" ? `$${f(v)}` : `${f(v)}원`;

  const statusLabel = status === "BUY_CHANCE" ? "🟢 살 기회를 확인해요" : status === "WAIT" ? "🟡 조금 기다려요" : "🔴 지금은 위험해요";
  const chaseRiskLabel = chaseRisk === "HIGH" ? "높음: 너무 빨리 올라 추격하면 위험해요" : chaseRisk === "MEDIUM" ? "보통: 확인하고 천천히 봐요" : "낮음: 그래도 조건 확인은 필요해요";
  const buyNowText = status === "BUY_CHANCE"
    ? "조건은 좋아요. 그래도 바로 따라 사기보다 아래 두 가지 진입 조건 중 하나가 확인되는지 봐요."
    : status === "WAIT"
      ? "아직 바로 살 자리는 아니에요. 가격이 지지받거나 돌파가 확인될 때까지 기다려요."
      : "지금은 새로 사지 않는 쪽이 안전해요. 위험 조건이 풀리는지 먼저 봐요.";
  const whenToWatchText = `① ${priceText(pullbackLow)}~${priceText(pullbackHigh)} 근처에서 내려오다 다시 올라가는지, 또는 ② ${priceText(breakoutPrice)} 위로 올라가서 버티는지 확인해요.`;
  const avoidText = `${priceText(invalidation)} 아래로 내려가고 다시 올라오지 못하면 이 상승 생각은 취소해요.`;
  const oneLineSummary = status === "RISK"
    ? `지금 추격 X → ${priceText(invalidation)} 위험선 회복과 새 상승 확인을 기다려요.`
    : `지금 추격 X → ${priceText(pullbackLow)}~${priceText(pullbackHigh)} 지지 반등 또는 ${priceText(breakoutPrice)} 돌파 확인.`;

  return {
    status,
    statusLabel,
    currentPrice: roundForMarket(current, market),
    pattern: result.pattern,
    aiScore: result.score,
    rvol: Number(result.metrics.rvol.toFixed(2)),
    support: roundForMarket(support, market),
    pullbackLow: roundForMarket(pullbackLow, market),
    pullbackHigh: roundForMarket(pullbackHigh, market),
    breakoutPrice: roundForMarket(breakoutPrice, market),
    resistance: roundForMarket(resistance, market),
    invalidation: roundForMarket(invalidation, market),
    target1: roundForMarket(result.target1, market),
    target2: roundForMarket(result.target2, market),
    chaseRisk,
    chaseRiskLabel,
    whyFound,
    buyNowText,
    whenToWatchText,
    avoidText,
    oneLineSummary,
    patternHistory: calculatePatternHistory(inputCandles, result.pattern, result.direction),
  };
}
