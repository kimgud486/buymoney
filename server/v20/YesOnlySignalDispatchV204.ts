import { AIScanDecision } from "../../src/ai/ScanDecisionSchema";
import {
  AutonomousRiskPolicy,
  DEFAULT_AUTONOMOUS_RISK_POLICY,
} from "../../src/risk/AutonomousRiskPolicy";
import {
  PreTradeContext,
  PreTradeRiskEngine,
} from "../../src/risk/PreTradeRiskEngine";
import { ScanCandidateResult } from "./ServerGlobalRealtimeScannerV20";

export interface CandidateExecutionPortV204 {
  evaluateCandidateAndTrade(
    candidate: AIScanDecision,
    marketContext: {
      dailyPnlPct: number;
      portfolioDrawdownPct: number;
      spreadBps: number;
      estimatedSlippageBps: number;
      marketOpen: boolean;
    }
  ): Promise<{ executed: boolean; reason: string }>;
}

export interface SignalDispatchContextV204 {
  historyStatus: "HISTORY_VERIFIED" | "HISTORY_UNVERIFIED";
  currentPositions: number;
  positionWeightPct: number;
  dailyPnlPct: number;
  portfolioDrawdownPct: number;
  estimatedSlippageBps: number;
  marketOpen: boolean;
  killSwitchActive: boolean;
}

export interface SignalDispatchResultV204 {
  symbol: string;
  dispatched: boolean;
  executed: boolean;
  verdict: "SIGNAL_APPROVED" | "LIVE_DISPATCHED" | "REJECTED";
  reason: string;
  decision?: AIScanDecision;
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function average(values: Array<number | undefined>): number | null {
  const valid = values.filter(finite);
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

export function scanCandidateToDecisionV204(
  candidate: ScanCandidateResult,
): AIScanDecision {
  const rsAverage = average([
    candidate.rs5m,
    candidate.rs15m,
    candidate.rs1h,
    candidate.rs1d,
  ]);

  const pattern = Array.isArray(candidate.patterns) && candidate.patterns.length
    ? candidate.patterns[0]
    : null;

  return {
    symbol: candidate.symbol,
    market: candidate.market,
    action: candidate.recommendation === "BUY_CANDIDATE"
      ? "BUY_CANDIDATE"
      : candidate.recommendation,
    setupScore: candidate.setupScore,
    pattern,
    patternStatus: pattern ? "CONFIRMED" : null,
    evidence: {
      relativeStrength: rsAverage === null ? null : rsAverage >= 60,
      rvolExpansion: finite(candidate.rvol) ? candidate.rvol >= 1.2 : null,
      aboveVwap: finite(candidate.vwap) && candidate.vwap > 0
        ? candidate.price > candidate.vwap
        : null,
      trendAligned: candidate.structureTrend
        ? candidate.structureTrend === "BULLISH"
        : null,
      breakoutConfirmed: typeof candidate.isBreakout === "boolean"
        ? candidate.isBreakout
        : null,
      retestConfirmed: typeof candidate.isRetest === "boolean"
        ? candidate.isRetest
        : null,
      orderflowPositive: finite(candidate.signedFlow)
        ? candidate.signedFlow > 0
        : null,
      cvdPositive: null,
      marketLeader: finite(candidate.rs1d) ? candidate.rs1d >= 70 : null,
      sectorLeader: null,
    },
    risks: {
      chaseRisk: typeof candidate.chaseRisk === "boolean"
        ? (candidate.chaseRisk ? 100 : 0)
        : null,
      exhaustionRisk: typeof candidate.exhaustionRisk === "boolean"
        ? (candidate.exhaustionRisk ? 100 : 0)
        : null,
      falseBreakoutRisk: candidate.trueMtfGate.hardReject ? 100 : 0,
      slippageRisk: finite(candidate.spreadBps) ? candidate.spreadBps : null,
    },
    invalidationPrice: finite(candidate.lowPrice) && candidate.lowPrice > 0
      ? candidate.lowPrice
      : finite(candidate.atr14) && candidate.atr14 > 0
        ? Math.max(0, candidate.price - candidate.atr14 * 1.5)
        : null,
    dataStatus: candidate.dataStatus,
    reasons: [
      `SETUP_SCORE:${candidate.setupScore}`,
      ...candidate.trueMtfGate.confirmations,
    ],
  };
}

/**
 * Final V20.4 bridge between the YES-only scanner and the execution system.
 *
 * SIGNAL_ONLY / SHADOW:
 *   - evaluates all non-broker pre-trade risk gates
 *   - never invokes the execution port
 *   - therefore cannot touch a broker or submit an order
 *
 * LIVE_RESTRICTED / LIVE:
 *   - first passes the same non-broker risk prefilter
 *   - only then delegates to the existing AutonomousTradingOrchestrator,
 *     which performs its own broker-health and execution risk checks.
 */
export class YesOnlySignalDispatchV204 {
  constructor(
    private executor: CandidateExecutionPortV204,
    private policy: AutonomousRiskPolicy = DEFAULT_AUTONOMOUS_RISK_POLICY,
  ) {}

  public async dispatch(
    candidate: ScanCandidateResult,
    context: SignalDispatchContextV204,
  ): Promise<SignalDispatchResultV204> {
    const reject = (reason: string): SignalDispatchResultV204 => ({
      symbol: candidate.symbol,
      dispatched: false,
      executed: false,
      verdict: "REJECTED",
      reason,
    });

    if (context.historyStatus !== "HISTORY_VERIFIED") {
      return reject("HISTORY_UNVERIFIED");
    }

    if (candidate.dataStatus !== "REALTIME_VERIFIED") {
      return reject(`REALTIME_NOT_VERIFIED:${candidate.dataStatus}`);
    }

    if (candidate.recommendation !== "BUY_CANDIDATE") {
      return reject(`NOT_YES_CANDIDATE:${candidate.recommendation}`);
    }

    if (!candidate.trueMtfGate.passed) {
      return reject(`TRUE_MTF_REJECT:${candidate.trueMtfGate.blockers.join("|")}`);
    }

    const decision = scanCandidateToDecisionV204(candidate);

    // Pre-filter with execution-independent risk. We deliberately use
    // SIGNAL_ONLY semantics here so broker health is not queried before a
    // candidate has cleared portfolio/session/spread/slippage controls.
    const prefilterPolicy: AutonomousRiskPolicy = {
      ...this.policy,
      enabled: true,
      mode: "SIGNAL_ONLY",
    };

    const pretradeContext: PreTradeContext = {
      decision,
      currentPositions: context.currentPositions,
      positionWeightPct: context.positionWeightPct,
      dailyPnlPct: context.dailyPnlPct,
      portfolioDrawdownPct: context.portfolioDrawdownPct,
      spreadBps: finite(candidate.spreadBps) ? candidate.spreadBps : null,
      estimatedSlippageBps: context.estimatedSlippageBps,
      marketOpen: context.marketOpen,
      brokerHealthy: null,
      killSwitchActive: context.killSwitchActive,
    };

    const risk = PreTradeRiskEngine.evaluate(pretradeContext, prefilterPolicy);
    if (!risk.pass) {
      return reject(risk.reason || "PRE_TRADE_RISK_REJECTED");
    }

    if (this.policy.mode === "DISABLED") {
      return reject("AUTONOMOUS_TRADING_DISABLED");
    }

    if (this.policy.mode === "SIGNAL_ONLY" || this.policy.mode === "SHADOW") {
      return {
        symbol: candidate.symbol,
        dispatched: false,
        executed: false,
        verdict: "SIGNAL_APPROVED",
        reason: `MODE_${this.policy.mode}_BROKER_NOT_CALLED`,
        decision,
      };
    }

    const result = await this.executor.evaluateCandidateAndTrade(decision, {
      dailyPnlPct: context.dailyPnlPct,
      portfolioDrawdownPct: context.portfolioDrawdownPct,
      spreadBps: finite(candidate.spreadBps) ? candidate.spreadBps : 0,
      estimatedSlippageBps: context.estimatedSlippageBps,
      marketOpen: context.marketOpen,
    });

    return {
      symbol: candidate.symbol,
      dispatched: true,
      executed: result.executed,
      verdict: "LIVE_DISPATCHED",
      reason: result.reason,
      decision,
    };
  }

  public async dispatchTop5(
    candidates: ScanCandidateResult[],
    contextBySymbol: (symbol: string) => SignalDispatchContextV204,
  ): Promise<SignalDispatchResultV204[]> {
    const yesOnly = candidates
      .filter((candidate) => candidate.recommendation === "BUY_CANDIDATE")
      .slice(0, 5);

    const results: SignalDispatchResultV204[] = [];
    for (const candidate of yesOnly) {
      results.push(await this.dispatch(candidate, contextBySymbol(candidate.symbol)));
    }
    return results;
  }
}
