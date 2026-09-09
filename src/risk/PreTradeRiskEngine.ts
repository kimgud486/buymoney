import { AIScanDecision } from "../ai/ScanDecisionSchema";
import { AutonomousRiskPolicy } from "./AutonomousRiskPolicy";
import { PortfolioRiskEngine } from "./PortfolioRiskEngine";
import { SlippageGuard } from "./SlippageGuard";

export interface PreTradeContext {
  decision: AIScanDecision;

  currentPositions: number;
  positionWeightPct: number;

  dailyPnlPct: number;
  portfolioDrawdownPct: number;

  spreadBps: number | null;
  estimatedSlippageBps: number | null;

  marketOpen: boolean | null;
  brokerHealthy: boolean | null;

  killSwitchActive: boolean;
}

export interface PreTradeEvaluationResult {
  pass: boolean;
  reason?: string;
  approvedQuantity?: number;
  idempotencyKey?: string;
}

export function evaluatePreTrade(
  ctx: PreTradeContext,
  policy: AutonomousRiskPolicy
): PreTradeEvaluationResult {
  if (!policy.enabled || policy.mode === "DISABLED") {
    return { pass: false, reason: "AUTONOMOUS_TRADING_DISABLED" };
  }

  if (ctx.killSwitchActive) {
    return { pass: false, reason: "KILL_SWITCH" };
  }

  if (ctx.decision.dataStatus !== "REALTIME_VERIFIED") {
    return { pass: false, reason: "DATA_NOT_VERIFIED" };
  }

  if (ctx.decision.action !== "BUY_CANDIDATE") {
    return { pass: false, reason: "NOT_BUY_CANDIDATE" };
  }

  if (ctx.marketOpen !== true) {
    return { pass: false, reason: "SESSION_NOT_CONFIRMED" };
  }

  // Broker connectivity is an execution concern. SHADOW/SIGNAL_ONLY must be
  // able to evaluate the non-broker risk gates without touching a broker.
  const isLiveExecutionMode =
    policy.mode === "LIVE_RESTRICTED" || policy.mode === "LIVE";

  if (isLiveExecutionMode && ctx.brokerHealthy !== true) {
    return { pass: false, reason: "BROKER_NOT_HEALTHY" };
  }

  const portfolioCheck = PortfolioRiskEngine.evaluate(
    {
      currentPositionsCount: ctx.currentPositions,
      newPositionWeightPct: ctx.positionWeightPct,
      dailyPnlPct: ctx.dailyPnlPct,
      portfolioDrawdownPct: ctx.portfolioDrawdownPct
    },
    policy
  );

  if (!portfolioCheck.pass) {
    return { pass: false, reason: portfolioCheck.reason };
  }

  const slipCheck = SlippageGuard.evaluate(
    ctx.spreadBps,
    ctx.estimatedSlippageBps,
    policy.maxSpreadBps,
    policy.maxSlippageBps
  );

  if (!slipCheck.pass) {
    return { pass: false, reason: slipCheck.reason };
  }

  const idempotencyKey = `auto_buy_${ctx.decision.symbol}_${Date.now()}_${Math.floor(performance.now() * 1000)}`;
  const approvedQuantity = 1; // Default minimum unit calculated by position sizing

  return {
    pass: true,
    approvedQuantity,
    idempotencyKey
  };
}

export class PreTradeRiskEngine {
  public static evaluate(ctx: PreTradeContext, policy: AutonomousRiskPolicy): PreTradeEvaluationResult {
    return evaluatePreTrade(ctx, policy);
  }
}
