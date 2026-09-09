export type AutonomousExecutionMode = "ANALYSIS" | "ASSISTED" | "AUTO_LIVE";
export type SupportedTradingMarket = "KOREA" | "US" | "UPBIT";

export interface AutonomousLiveExecutionGateInput {
  requestedMode: AutonomousExecutionMode;
  market: SupportedTradingMarket;
  side: "BUY" | "SELL";

  /** Server-owned switches only. Never trust browser/localStorage values here. */
  serverLiveTradingEnabled: boolean;
  brokerConfigured: boolean;
  brokerHealthy: boolean;
  accountSynchronized: boolean;

  marketDataVerified: boolean;
  marketDataAgeMs: number;
  maxMarketDataAgeMs?: number;

  /** Entry signals are mandatory for BUY. SELL may be driven by a verified exit/stop event. */
  signalDecision?: "YES" | "REVIEW_READY" | "WATCH" | "NO";
  signalScore?: number;
  minimumSignalScore?: number;
  riskApproved: boolean;
  exitTriggerVerified?: boolean;

  duplicateOrderDetected: boolean;
  pendingOrderExists: boolean;

  /** Explicit adapter readiness flags. Current production default is Korea-only. */
  koreaLiveAdapterReady?: boolean;
  usLiveRiskAdapterReady?: boolean;
  upbitLiveAdapterReady?: boolean;
}

export interface AutonomousLiveExecutionGateResult {
  allowed: boolean;
  mode: AutonomousExecutionMode;
  state: "ANALYSIS_ONLY" | "APPROVAL_REQUIRED" | "READY" | "BLOCKED";
  reasons: string[];
  checkedAt: string;
}

/**
 * Final server-side authorization gate for autonomous live execution.
 *
 * Architecture is inspired by the separation-of-concerns approach used by
 * open-source quantitative stacks such as FinRL and Qlib: signal generation,
 * risk approval and execution authorization are independent layers.
 *
 * This module intentionally fails closed. A YES signal alone can never place
 * a real order. Every server-owned production condition must be verified.
 */
export class AutonomousLiveExecutionGateV26 {
  static evaluate(input: AutonomousLiveExecutionGateInput): AutonomousLiveExecutionGateResult {
    const reasons: string[] = [];
    const checkedAt = new Date().toISOString();

    if (input.requestedMode === "ANALYSIS") {
      return {
        allowed: false,
        mode: input.requestedMode,
        state: "ANALYSIS_ONLY",
        reasons: ["ANALYSIS_MODE_DOES_NOT_ALLOW_ORDERS"],
        checkedAt,
      };
    }

    if (input.requestedMode === "ASSISTED") {
      return {
        allowed: false,
        mode: input.requestedMode,
        state: "APPROVAL_REQUIRED",
        reasons: ["ASSISTED_MODE_REQUIRES_EXPLICIT_ORDER_APPROVAL"],
        checkedAt,
      };
    }

    if (!input.serverLiveTradingEnabled) reasons.push("SERVER_LIVE_TRADING_DISABLED");
    if (!input.brokerConfigured) reasons.push("BROKER_NOT_CONFIGURED");
    if (!input.brokerHealthy) reasons.push("BROKER_UNHEALTHY");
    if (!input.accountSynchronized) reasons.push("ACCOUNT_NOT_SYNCHRONIZED");

    if (!input.marketDataVerified) reasons.push("MARKET_DATA_NOT_VERIFIED");
    const maxAge = Math.max(250, input.maxMarketDataAgeMs ?? 5_000);
    if (!Number.isFinite(input.marketDataAgeMs) || input.marketDataAgeMs < 0 || input.marketDataAgeMs > maxAge) {
      reasons.push("MARKET_DATA_STALE");
    }

    if (input.side === "BUY") {
      const minimumScore = Math.min(100, Math.max(0, input.minimumSignalScore ?? 82));
      if (input.signalDecision !== "YES") {
        reasons.push("BUY_SIGNAL_NOT_YES");
      }
      if (!Number.isFinite(input.signalScore) || (input.signalScore as number) < minimumScore) {
        reasons.push("SIGNAL_SCORE_BELOW_THRESHOLD");
      }
    } else if (input.exitTriggerVerified !== true) {
      reasons.push("SELL_EXIT_TRIGGER_NOT_VERIFIED");
    }

    if (!input.riskApproved) reasons.push("RISK_GATE_REJECTED");
    if (input.duplicateOrderDetected) reasons.push("DUPLICATE_ORDER_DETECTED");
    if (input.pendingOrderExists) reasons.push("PENDING_ORDER_ALREADY_EXISTS");

    if (input.market === "KOREA" && input.koreaLiveAdapterReady !== true) {
      reasons.push("KOREA_LIVE_ADAPTER_NOT_READY");
    }
    if (input.market === "US" && input.usLiveRiskAdapterReady !== true) {
      reasons.push("US_LIVE_RISK_ADAPTER_NOT_READY");
    }
    if (input.market === "UPBIT" && input.upbitLiveAdapterReady !== true) {
      reasons.push("UPBIT_LIVE_ADAPTER_NOT_READY");
    }

    return {
      allowed: reasons.length === 0,
      mode: input.requestedMode,
      state: reasons.length === 0 ? "READY" : "BLOCKED",
      reasons,
      checkedAt,
    };
  }
}
