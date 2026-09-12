import {
  ScanCandidateInput,
  ScanCandidateResult
} from "./ServerGlobalRealtimeScannerV20";
import { evaluateCandidateWithV2010ShadowPolicy } from "./V2010ShadowDecisionPolicy";
import {
  BuyHoldActionV20,
  BuyHoldDecisionResultV20,
  PositionStateV20
} from "./BuyHoldDecisionEngineV20";
import {
  BuyHoldSystemFacadeV20
} from "./BuyHoldSystemFacadeV20";
import {
  StrategyPerformanceKeyV20,
  buyHoldPerformanceStoreV20
} from "./BuyHoldPerformanceStoreV20";
import {
  ExecutablePatternGateResultV20,
  ExecutablePatternGateV20
} from "./ExecutablePatternGateV20";

export interface FinalTradePlanV20 {
  entry: number | null;
  stop: number | null;
  tp1: number | null;
  tp2: number | null;
  tp3: number | null;
  riskRewardTp1: number | null;
  source: "ATR_STRUCTURE" | "NO_VERIFIED_PLAN";
}

export interface FinalBuyHoldRequestV20 {
  candidate: ScanCandidateInput;
  performanceKey: StrategyPerformanceKeyV20;
  position?: PositionStateV20;
  currentPrice?: number;
}

export interface FinalBuyHoldResponseV20 {
  symbol: string;
  name: string;
  action: BuyHoldActionV20;
  aiScore: number;
  grade: ScanCandidateResult["grade"];
  recommendation: ScanCandidateResult["recommendation"];
  verifiedWinRatePct: number | null;
  sampleSize: number;
  profitFactor: number | null;
  expectancyPct: number | null;
  holdScore: number;
  trueMtfPassed: boolean;
  patternGate: ExecutablePatternGateResultV20;
  blockers: string[];
  confirmations: string[];
  reasons: string[];
  plan: FinalTradePlanV20;
  dataCoveragePct: number;
  dataStatus: ScanCandidateInput["dataStatus"];
  timestamp: number;
}

function finitePositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function roundPrice(value: number): number {
  return Number(value.toFixed(2));
}

function noPlan(): FinalTradePlanV20 {
  return {
    entry: null,
    stop: null,
    tp1: null,
    tp2: null,
    tp3: null,
    riskRewardTp1: null,
    source: "NO_VERIFIED_PLAN"
  };
}

function buildTradePlan(scan: ScanCandidateResult, patternPassed: boolean): FinalTradePlanV20 {
  if (
    scan.recommendation !== "BUY_CANDIDATE" ||
    !scan.trueMtfGate.passed ||
    !patternPassed ||
    !finitePositive(scan.price) ||
    !finitePositive(scan.atr14)
  ) {
    return noPlan();
  }

  const entry = scan.price;
  const atr = scan.atr14;
  const structuralStop = finitePositive(scan.vwap)
    ? Math.min(entry - atr, scan.vwap - atr * 0.25)
    : entry - atr;
  const stop = Math.max(0.01, structuralStop);
  const risk = entry - stop;

  if (!(risk > 0)) return noPlan();

  const tp1 = entry + risk * 1.5;
  const tp2 = entry + risk * 2.5;
  const tp3 = entry + risk * 4;

  return {
    entry: roundPrice(entry),
    stop: roundPrice(stop),
    tp1: roundPrice(tp1),
    tp2: roundPrice(tp2),
    tp3: roundPrice(tp3),
    riskRewardTp1: 1.5,
    source: "ATR_STRUCTURE"
  };
}

function applyPatternAuthority(
  decision: BuyHoldDecisionResultV20,
  patternGate: ExecutablePatternGateResultV20,
  hasOpenPosition: boolean
): BuyHoldDecisionResultV20 {
  if (hasOpenPosition) return decision;
  if (patternGate.passed) return decision;
  if (decision.action !== "BUY" && decision.action !== "STRONG_BUY") return decision;

  return {
    ...decision,
    action: "WATCH",
    reasons: ["FINAL_PATTERN_GATE_BLOCK", ...patternGate.blockers, ...decision.reasons]
  };
}

/**
 * Final server-side BUY & HOLD authority.
 *
 * V20.10 runs beside V20.9 in Shadow mode by default. Production decisions
 * stay on the V20.9 baseline until AISTOCK_V20_10_ENFORCE=1 is explicitly
 * enabled after reviewing real Shadow outcomes.
 *
 * It intentionally does not place orders. Execution remains behind the
 * existing live-account, broker-ack, idempotency and kill-switch gates.
 */
export class FinalBuyHoldDecisionServiceV20 {
  public static evaluate(request: FinalBuyHoldRequestV20): FinalBuyHoldResponseV20 {
    const scan = evaluateCandidateWithV2010ShadowPolicy(request.candidate).production;
    const currentPrice = finitePositive(request.currentPrice)
      ? request.currentPrice
      : scan.price;
    const patternGate = ExecutablePatternGateV20.evaluate(scan.patterns);

    const rawDecision: BuyHoldDecisionResultV20 = BuyHoldSystemFacadeV20.evaluate({
      scan,
      performanceKey: request.performanceKey,
      position: request.position,
      currentPrice
    });

    const hasOpenPosition = Boolean(request.position && request.position.quantity > 0);
    const decision = applyPatternAuthority(rawDecision, patternGate, hasOpenPosition);
    const performance = buyHoldPerformanceStoreV20.evaluate(request.performanceKey);
    const plan = buildTradePlan(scan, patternGate.passed);

    return {
      symbol: scan.symbol,
      name: scan.name,
      action: decision.action,
      aiScore: scan.setupScore,
      grade: scan.grade,
      recommendation: scan.recommendation,
      verifiedWinRatePct: performance.winRatePct,
      sampleSize: performance.sampleSize,
      profitFactor: performance.profitFactor,
      expectancyPct: performance.expectancyPct,
      holdScore: decision.holdScore,
      trueMtfPassed: scan.trueMtfGate.passed,
      patternGate,
      blockers: [
        ...scan.trueMtfGate.blockers,
        ...patternGate.blockers,
        ...performance.blockers
      ],
      confirmations: scan.trueMtfGate.confirmations,
      reasons: decision.reasons,
      plan,
      dataCoveragePct: scan.dataCoveragePct,
      dataStatus: scan.dataStatus,
      timestamp: Date.now()
    };
  }
}
