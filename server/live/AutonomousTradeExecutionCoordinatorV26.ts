import {
  AutonomousLiveExecutionGateV26,
  AutonomousExecutionMode,
  SupportedTradingMarket,
} from "./AutonomousLiveExecutionGateV26";
import {
  AutonomousOrderIdempotencyGuardV26,
  AutonomousOrderIdentity,
} from "./AutonomousOrderIdempotencyGuardV26";
import { LiveAccountRiskGateV252 } from "./LiveAccountRiskGateV252";

export interface AutonomousVerifiedAccountSnapshotV26 {
  accountKey: string;
  cash: number;
  portfolioValue: number;
  currentHoldingQty: number;
  synchronized: boolean;
  capturedAt: string;
}

export interface AutonomousBrokerRuntimeSnapshotV26 {
  configured: boolean;
  healthy: boolean;
  pendingOrderExists: boolean;
}

export interface AutonomousTradeCommandV26 {
  mode: AutonomousExecutionMode;
  market: SupportedTradingMarket;
  symbol: string;
  name: string;
  side: "BUY" | "SELL";
  quantity: number;
  estimatedPrice: number;
  orderType: "MARKET" | "LIMIT";

  strategyId: string;
  decisionId: string;

  marketDataVerified: boolean;
  marketDataAgeMs: number;
  signalDecision?: "YES" | "REVIEW_READY" | "WATCH" | "NO";
  signalScore?: number;
  exitTriggerVerified?: boolean;

  maxPositionWeightPct?: number;
}

export interface AutonomousBrokerDispatchRequestV26 {
  market: SupportedTradingMarket;
  symbol: string;
  name: string;
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  orderType: "MARKET" | "LIMIT";
  idempotencyKey: string;
  strategyId: string;
  decisionId: string;
}

export interface AutonomousBrokerDispatchResultV26 {
  accepted: boolean;
  orderNo?: string;
  status: string;
  message: string;
}

export interface AutonomousBrokerDispatcherV26 {
  submit(request: AutonomousBrokerDispatchRequestV26): Promise<AutonomousBrokerDispatchResultV26>;
}

export interface AutonomousCoordinatorDependenciesV26 {
  dispatcher: AutonomousBrokerDispatcherV26;
  idempotencyGuard?: AutonomousOrderIdempotencyGuardV26;
  serverLiveTradingEnabled: boolean;
  koreaLiveAdapterReady: boolean;
  usLiveRiskAdapterReady: boolean;
  upbitLiveAdapterReady: boolean;
  maxMarketDataAgeMs?: number;
  minimumSignalScore?: number;
}

export interface AutonomousExecutionResultV26 {
  state: "BLOCKED" | "SUBMITTED" | "REJECTED";
  allowed: boolean;
  reasons: string[];
  idempotencyKey?: string;
  broker?: AutonomousBrokerDispatchResultV26;
}

const validPositive = (value: number): boolean => Number.isFinite(value) && value > 0;

/**
 * Authoritative server-side autonomous execution coordinator.
 *
 * Pipeline:
 * VERIFIED COMMAND
 *   -> VERIFIED BROKER ACCOUNT RISK
 *   -> LIVE EXECUTION GATE
 *   -> IDEMPOTENCY CLAIM
 *   -> BROKER DISPATCH
 *
 * Signal generation never calls a broker directly. This keeps the same layer
 * separation used by mature open-source quant frameworks while preserving the
 * project's own fail-closed production policy.
 */
export class AutonomousTradeExecutionCoordinatorV26 {
  private readonly idempotency: AutonomousOrderIdempotencyGuardV26;

  constructor(private readonly deps: AutonomousCoordinatorDependenciesV26) {
    this.idempotency = deps.idempotencyGuard ?? new AutonomousOrderIdempotencyGuardV26();
  }

  async execute(
    command: AutonomousTradeCommandV26,
    account: AutonomousVerifiedAccountSnapshotV26,
    broker: AutonomousBrokerRuntimeSnapshotV26,
  ): Promise<AutonomousExecutionResultV26> {
    const validationReasons: string[] = [];

    if (!command.symbol.trim()) validationReasons.push("SYMBOL_REQUIRED");
    if (!validPositive(command.quantity)) validationReasons.push("INVALID_QUANTITY");
    if (!validPositive(command.estimatedPrice)) validationReasons.push("INVALID_ESTIMATED_PRICE");
    if (!account.accountKey.trim()) validationReasons.push("ACCOUNT_KEY_REQUIRED");
    if (!Number.isFinite(account.cash) || account.cash < 0) validationReasons.push("INVALID_VERIFIED_CASH");
    if (!Number.isFinite(account.portfolioValue) || account.portfolioValue < 0) {
      validationReasons.push("INVALID_VERIFIED_PORTFOLIO_VALUE");
    }
    if (!Number.isFinite(account.currentHoldingQty) || account.currentHoldingQty < 0) {
      validationReasons.push("INVALID_VERIFIED_HOLDING_QTY");
    }

    if (validationReasons.length > 0) {
      return { state: "BLOCKED", allowed: false, reasons: validationReasons };
    }

    const accountRisk = LiveAccountRiskGateV252.validateOrder({
      symbol: command.symbol,
      side: command.side,
      quantity: command.quantity,
      estimatedPrice: command.estimatedPrice,
      market: command.market,
      verifiedCash: account.cash,
      verifiedPortfolioValue: account.portfolioValue,
      verifiedCurrentHoldingQty: account.currentHoldingQty,
      maxPositionWeightPct: command.maxPositionWeightPct,
    });

    const identity: AutonomousOrderIdentity = {
      accountKey: account.accountKey,
      symbol: command.symbol,
      side: command.side,
      strategyId: command.strategyId,
      decisionId: command.decisionId,
    };
    const idempotencyKey = AutonomousOrderIdempotencyGuardV26.makeKey(identity);
    const duplicateOrderDetected = this.idempotency.hasActiveClaim(idempotencyKey);

    const gate = AutonomousLiveExecutionGateV26.evaluate({
      requestedMode: command.mode,
      market: command.market,
      side: command.side,
      serverLiveTradingEnabled: this.deps.serverLiveTradingEnabled,
      brokerConfigured: broker.configured,
      brokerHealthy: broker.healthy,
      accountSynchronized: account.synchronized,
      marketDataVerified: command.marketDataVerified,
      marketDataAgeMs: command.marketDataAgeMs,
      maxMarketDataAgeMs: this.deps.maxMarketDataAgeMs,
      signalDecision: command.signalDecision,
      signalScore: command.signalScore,
      minimumSignalScore: this.deps.minimumSignalScore,
      riskApproved: accountRisk.passed,
      exitTriggerVerified: command.exitTriggerVerified,
      duplicateOrderDetected,
      pendingOrderExists: broker.pendingOrderExists,
      koreaLiveAdapterReady: this.deps.koreaLiveAdapterReady,
      usLiveRiskAdapterReady: this.deps.usLiveRiskAdapterReady,
      upbitLiveAdapterReady: this.deps.upbitLiveAdapterReady,
    });

    if (!gate.allowed) {
      const reasons = [...gate.reasons];
      if (!accountRisk.passed && accountRisk.rejectReason) reasons.push(accountRisk.rejectReason);
      return { state: "BLOCKED", allowed: false, reasons, idempotencyKey };
    }

    if (!this.idempotency.claim(idempotencyKey)) {
      return {
        state: "BLOCKED",
        allowed: false,
        reasons: ["IDEMPOTENCY_CLAIM_CONFLICT"],
        idempotencyKey,
      };
    }

    try {
      const brokerResult = await this.deps.dispatcher.submit({
        market: command.market,
        symbol: command.symbol,
        name: command.name,
        side: command.side,
        quantity: command.quantity,
        price: command.estimatedPrice,
        orderType: command.orderType,
        idempotencyKey,
        strategyId: command.strategyId,
        decisionId: command.decisionId,
      });

      if (!brokerResult.accepted) {
        // Broker rejected before accepting responsibility for the order.
        // Release so a later, newly validated retry can be attempted.
        this.idempotency.release(idempotencyKey);
        return {
          state: "REJECTED",
          allowed: false,
          reasons: ["BROKER_REJECTED_ORDER", brokerResult.message],
          idempotencyKey,
          broker: brokerResult,
        };
      }

      return {
        state: "SUBMITTED",
        allowed: true,
        reasons: [],
        idempotencyKey,
        broker: brokerResult,
      };
    } catch (error) {
      // Network/transport uncertainty must not immediately release the claim.
      // A timeout may still mean the broker accepted the order. Reconcile first.
      return {
        state: "REJECTED",
        allowed: false,
        reasons: [
          "BROKER_DISPATCH_OUTCOME_UNKNOWN_RECONCILE_REQUIRED",
          error instanceof Error ? error.message : "UNKNOWN_BROKER_ERROR",
        ],
        idempotencyKey,
      };
    }
  }
}
