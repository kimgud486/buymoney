import { AIScanDecision } from "../ai/ScanDecisionSchema";
import { PreTradeRiskEngine, PreTradeContext } from "../risk/PreTradeRiskEngine";
import { AutonomousRiskPolicy, DEFAULT_AUTONOMOUS_RISK_POLICY } from "../risk/AutonomousRiskPolicy";
import { BrokerGatewayRouter } from "../execution/BrokerGatewayRouter";
import { OrderManager } from "../execution/OrderManager";
import { ExecutionReconciler } from "../execution/ExecutionReconciler";
import { KillSwitch } from "./KillSwitch";
import { AutonomousAuditLog } from "../monitoring/AutonomousAuditLog";
import { BrokerExecutionEvent } from "../execution/BrokerGateway";

export interface ExitEvidence {
  hardFloorBreached: boolean;

  vwapLost: boolean | null;
  structureBroken: boolean | null;
  rsWeakening: boolean | null;
  cvdDivergence: boolean | null;
  orderflowReversal: boolean | null;
  marketWeakening: boolean | null;
  sectorWeakening: boolean | null;

  peakGivebackPctPoints: number | null;
}

export function shouldSubmitSell(e: ExitEvidence) {
  if (e.hardFloorBreached) {
    return {
      submit: true,
      reason: "HARD_DEFENSE_BREACH",
    };
  }

  const weaknessCount = [
    e.vwapLost,
    e.structureBroken,
    e.rsWeakening,
    e.cvdDivergence,
    e.orderflowReversal,
    e.marketWeakening,
    e.sectorWeakening,
  ].filter(x => x === true).length;

  if (weaknessCount >= 3) {
    return {
      submit: true,
      reason: "MULTI_EVIDENCE_EXIT",
    };
  }

  if (e.peakGivebackPctPoints !== null && e.peakGivebackPctPoints >= 2.0) {
    return {
      submit: true,
      reason: "PROFIT_PROTECTION_GIVEBACK"
    };
  }

  return {
    submit: false,
    reason: "CONTINUE_MONITORING",
  };
}

const normalizeAutonomousSymbol = (symbol: string): string =>
  String(symbol || "")
    .trim()
    .toUpperCase()
    .replace(/^KRW-/, "");

export type AutonomousPositionState =
  | "FLAT"
  | "BUY_CANDIDATE"
  | "BUY_PENDING"
  | "BUY_ACKNOWLEDGED"
  | "BUY_PARTIAL"
  | "BUY_FILLED"
  | "HOLD"
  | "PROFIT_HOLD"
  | "SELL_WATCH"
  | "SELL_PENDING"
  | "SELL_ACKNOWLEDGED"
  | "SELL_PARTIAL"
  | "CLOSED";

export interface ManagedPosition {
  symbol: string;
  market: "KR" | "US" | "CRYPTO";
  state: AutonomousPositionState;
  profitHoldLevel?: "STRONG" | "NORMAL" | "WEAK";
  sellWatchLevel?: "LOW" | "MEDIUM" | "HIGH";
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  highestPriceSinceBuy: number;
  lowestPriceSinceBuy: number;
  trailingFloor: number;
  pendingOrderId?: string;
  pnlNet?: number;
}

export class AutonomousTradingOrchestrator {
  private policy: AutonomousRiskPolicy;
  private managedPositions = new Map<string, ManagedPosition>();

  constructor(
    private brokerRouter: BrokerGatewayRouter,
    private orderManager: OrderManager,
    private killSwitch: KillSwitch,
    private reconciler: ExecutionReconciler,
    policy?: AutonomousRiskPolicy
  ) {
    this.policy = policy ?? DEFAULT_AUTONOMOUS_RISK_POLICY;
  }

  public getPolicy(): AutonomousRiskPolicy {
    return this.policy;
  }

  public updatePolicy(newPolicy: Partial<AutonomousRiskPolicy>): void {
    this.policy = { ...this.policy, ...newPolicy };
  }

  public getManagedPositions(): ManagedPosition[] {
    return Array.from(this.managedPositions.values());
  }

  public hasPartialExposure(): boolean {
    for (const pos of this.managedPositions.values()) {
      if (pos.state === "BUY_PARTIAL" || pos.state === "SELL_PARTIAL") {
        return true;
      }
    }
    return false;
  }

  public async evaluateCandidateAndTrade(
    candidate: AIScanDecision,
    marketContext: {
      dailyPnlPct: number;
      portfolioDrawdownPct: number;
      spreadBps: number;
      estimatedSlippageBps: number;
      marketOpen: boolean;
    }
  ): Promise<{ executed: boolean; reason: string }> {
    if (this.killSwitch.active()) {
      return { executed: false, reason: "KILL_SWITCH_ACTIVE" };
    }

    if (this.policy.mode === "DISABLED") {
      return { executed: false, reason: "AUTONOMOUS_TRADING_DISABLED" };
    }

    // PARTIAL FILL EXPOSURE LOCK: Block new entries if partial fills exist
    if (this.hasPartialExposure()) {
      return { executed: false, reason: "PARTIAL_FILL_EXPOSURE_LOCKED" };
    }

    // Same-symbol exposure lock: a repeated scanner hit must never create another
    // autonomous BUY while that symbol already has an active/pending position.
    // CLOSED/FLAT are allowed to become a fresh entry later.
    const candidateSymbol = normalizeAutonomousSymbol(candidate.symbol);
    const activeSameSymbol = Array.from(this.managedPositions.values()).find((pos) => {
      const sameSymbol = normalizeAutonomousSymbol(pos.symbol) === candidateSymbol;
      const sameMarket = pos.market === candidate.market;
      const activeState = pos.state !== "CLOSED" && pos.state !== "FLAT";
      return sameSymbol && sameMarket && activeState;
    });

    if (activeSameSymbol) {
      return {
        executed: false,
        reason: `DUPLICATE_SYMBOL_EXPOSURE_LOCKED_${activeSameSymbol.state}`
      };
    }

    const gateway = this.brokerRouter.forMarket(candidate.market);
    const brokerHealthy = gateway.isHealthy();

    const ctx: PreTradeContext = {
      decision: candidate,
      currentPositions: this.managedPositions.size,
      positionWeightPct: 10.0,
      dailyPnlPct: marketContext.dailyPnlPct,
      portfolioDrawdownPct: marketContext.portfolioDrawdownPct,
      spreadBps: marketContext.spreadBps,
      estimatedSlippageBps: marketContext.estimatedSlippageBps,
      marketOpen: marketContext.marketOpen,
      brokerHealthy,
      killSwitchActive: this.killSwitch.active()
    };

    const riskResult = PreTradeRiskEngine.evaluate(ctx, this.policy);

    AutonomousAuditLog.log({
      timestamp: Date.now(),
      symbol: candidate.symbol,
      market: candidate.market,
      action: candidate.action,
      dataStatus: candidate.dataStatus,
      evidence: candidate.evidence,
      riskGateResult: { pass: riskResult.pass, reason: riskResult.reason }
    });

    if (!riskResult.pass) {
      return { executed: false, reason: riskResult.reason ?? "RISK_REJECTED" };
    }

    if (this.policy.mode === "SHADOW" || this.policy.mode === "SIGNAL_ONLY") {
      return {
        executed: false,
        reason: `MODE_${this.policy.mode}_RECORDED_INTENDED_BUY`
      };
    }

    // Submit BUY Order
    const quantity = riskResult.approvedQuantity ?? 1;
    const idempotencyKey = riskResult.idempotencyKey ?? `buy_${candidate.symbol}_${Date.now()}`;

    const orderRes = await this.orderManager.submitOrder(
      {
        symbol: candidate.symbol,
        market: candidate.market,
        quantity,
        idempotencyKey
      },
      gateway,
      "BUY"
    );

    if (!orderRes.success) {
      return { executed: false, reason: orderRes.message };
    }

    // Record BUY_PENDING / BUY_ACKNOWLEDGED
    this.managedPositions.set(candidate.symbol, {
      symbol: candidate.symbol,
      market: candidate.market,
      state: "BUY_ACKNOWLEDGED",
      quantity: 0,
      entryPrice: 0,
      currentPrice: 0,
      highestPriceSinceBuy: 0,
      lowestPriceSinceBuy: 0,
      trailingFloor: candidate.invalidationPrice ?? 0,
      pendingOrderId: orderRes.orderId
    });

    return { executed: true, reason: "BUY_ORDER_SUBMITTED_WAITING_BROKER_EXECUTION" };
  }

  public handleBrokerExecutionEvent(event: BrokerExecutionEvent): void {
    const pos = this.managedPositions.get(event.symbol);
    if (!pos) return;

    if (event.side === "BUY") {
      if (event.status === "ACKNOWLEDGED") {
        pos.state = "BUY_ACKNOWLEDGED";
      } else if (event.status === "PARTIAL") {
        pos.state = "BUY_PARTIAL";
        pos.quantity = event.filledQuantity;
        if (event.averageFillPrice) pos.entryPrice = event.averageFillPrice;
      } else if (event.status === "FILLED") {
        pos.state = "BUY_FILLED";
        pos.quantity = event.filledQuantity;
        if (event.averageFillPrice) {
          pos.entryPrice = event.averageFillPrice;
          pos.currentPrice = event.averageFillPrice;
          pos.highestPriceSinceBuy = event.averageFillPrice;
          pos.lowestPriceSinceBuy = event.averageFillPrice;
        }
        // Move to HOLD after fill verified
        pos.state = "HOLD";
        pos.profitHoldLevel = "NORMAL";
      } else if (event.status === "REJECTED" || event.status === "CANCELLED") {
        this.managedPositions.delete(event.symbol);
      }
    } else if (event.side === "SELL") {
      if (event.status === "ACKNOWLEDGED") {
        pos.state = "SELL_ACKNOWLEDGED";
      } else if (event.status === "PARTIAL") {
        pos.state = "SELL_PARTIAL";
      } else if (event.status === "FILLED") {
        pos.state = "CLOSED";
        if (event.averageFillPrice && pos.entryPrice > 0) {
          pos.pnlNet = (event.averageFillPrice - pos.entryPrice) * pos.quantity;
        }
      }
    }
  }

  public async evaluateExitAndTrade(
    symbol: string,
    currentPrice: number,
    exitEvidence: ExitEvidence
  ): Promise<{ executed: boolean; reason: string }> {
    const pos = this.managedPositions.get(symbol);
    if (!pos) return { executed: false, reason: "NO_ACTIVE_POSITION" };

    if (pos.state !== "HOLD" && pos.state !== "PROFIT_HOLD" && pos.state !== "SELL_WATCH") {
      return { executed: false, reason: `CANNOT_SELL_FROM_STATE_${pos.state}` };
    }

    pos.currentPrice = currentPrice;
    if (currentPrice > pos.highestPriceSinceBuy) pos.highestPriceSinceBuy = currentPrice;
    if (currentPrice < pos.lowestPriceSinceBuy) pos.lowestPriceSinceBuy = currentPrice;

    const exitCheck = shouldSubmitSell(exitEvidence);

    if (!exitCheck.submit) {
      // Manage transition between PROFIT_HOLD and SELL_WATCH
      const weaknessCount = [
        exitEvidence.vwapLost,
        exitEvidence.structureBroken,
        exitEvidence.rsWeakening
      ].filter(Boolean).length;

      if (weaknessCount >= 1) {
        pos.state = "SELL_WATCH";
        pos.sellWatchLevel = weaknessCount >= 2 ? "MEDIUM" : "LOW";
      } else {
        // Recover to PROFIT_HOLD
        pos.state = "PROFIT_HOLD";
        pos.profitHoldLevel = currentPrice > pos.entryPrice * 1.02 ? "STRONG" : "NORMAL";
      }

      return { executed: false, reason: "CONTINUE_MONITORING" };
    }

    // Submit SELL Order
    pos.state = "SELL_PENDING";
    const gateway = this.brokerRouter.forMarket(pos.market);

    const idempotencyKey = `sell_${symbol}_${Date.now()}`;
    const orderRes = await this.orderManager.submitOrder(
      {
        symbol: pos.symbol,
        market: pos.market,
        quantity: pos.quantity,
        idempotencyKey
      },
      gateway,
      "SELL"
    );

    if (!orderRes.success) {
      pos.state = "SELL_WATCH";
      return { executed: false, reason: orderRes.message };
    }

    pos.pendingOrderId = orderRes.orderId;
    pos.state = "SELL_ACKNOWLEDGED";

    return { executed: true, reason: `SELL_ORDER_SUBMITTED_${exitCheck.reason}` };
  }

  public async reconcilePositions(): Promise<void> {
    const local = Array.from(this.managedPositions.values()).map(p => ({
      symbol: p.symbol,
      quantity: p.quantity,
      market: p.market
    }));

    const report = await this.reconciler.reconcile(local);
    if (!report.synchronized) {
      if (this.policy.killSwitchEnabled) {
        this.killSwitch.trigger("ORDER_RECONCILIATION_FAILED", report.discrepancies.join("; "));
      }
    }
  }
}