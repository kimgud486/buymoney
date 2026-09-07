// AISTOCK v13.8 Exit Decision Bridge
import type { AdaptiveTrailingResult } from "../v13_7/AdaptiveTrailingExitEngineV137";

export type UnifiedExitAction =
  | "HOLD"
  | "PROFIT_HOLD"
  | "TRAIL_UP"
  | "SELL_WATCH"
  | "SELL"
  | "EMERGENCY_EXIT";

export interface ExitBridgeInput {
  adaptive: AdaptiveTrailingResult;

  feedVerified: boolean;
  indicatorsReady: boolean;
  completedBar: boolean;

  currentPositionQty: number;

  brokerHealthy: boolean;
  heartbeatHealthy: boolean;
}

export interface ExitBridgeResult {
  action: UnifiedExitAction;
  shouldSubmitSellOrder: boolean;
  sellReason: string | null;
  failClosed: boolean;
}

export class ExitDecisionBridgeV138 {
  public static resolve(input: ExitBridgeInput): ExitBridgeResult {
    const {
      adaptive,
      feedVerified,
      indicatorsReady,
      completedBar,
      currentPositionQty,
      brokerHealthy,
      heartbeatHealthy,
    } = input;

    /*
     * 1. No active position
     */
    if (!Number.isFinite(currentPositionQty) || currentPositionQty <= 0) {
      return {
        action: "HOLD",
        shouldSubmitSellOrder: false,
        sellReason: null,
        failClosed: false,
      };
    }

    /*
     * 2. Execution Infrastructure Unhealthy (Broker/Heartbeat)
     * Freeze automated order submission and transition to SELL_WATCH alert
     */
    if (!brokerHealthy || !heartbeatHealthy) {
      return {
        action: "SELL_WATCH",
        shouldSubmitSellOrder: false,
        sellReason: "EXECUTION_INFRASTRUCTURE_UNHEALTHY",
        failClosed: true,
      };
    }

    /*
     * 3. Emergency Exit Breach
     * Overrides normal indicator confirmation for risk safety
     */
    if (adaptive.state === "EMERGENCY_EXIT") {
      return {
        action: "EMERGENCY_EXIT",
        shouldSubmitSellOrder: true,
        sellReason: adaptive.reasons[0] ?? "EMERGENCY_EXIT",
        failClosed: false,
      };
    }

    /*
     * 4. Persisted Trailing Floor Breach
     * Hard floor breach is immediate SELL
     */
    if (
      adaptive.state === "SELL" &&
      adaptive.reasons.includes("PREVIOUS_TRAILING_STOP_BREACHED")
    ) {
      return {
        action: "SELL",
        shouldSubmitSellOrder: true,
        sellReason: "TRAILING_STOP_BREACHED",
        failClosed: false,
      };
    }

    /*
     * 5. Indicator-based SELL
     * Requires verified market feed, ready indicators, and completed candle bar
     */
    if (adaptive.state === "SELL") {
      if (!feedVerified || !indicatorsReady || !completedBar) {
        return {
          action: "SELL_WATCH",
          shouldSubmitSellOrder: false,
          sellReason: "SELL_SIGNAL_NOT_VERIFIED",
          failClosed: true,
        };
      }

      return {
        action: "SELL",
        shouldSubmitSellOrder: true,
        sellReason: adaptive.reasons.join("|"),
        failClosed: false,
      };
    }

    return {
      action: adaptive.state,
      shouldSubmitSellOrder: false,
      sellReason: null,
      failClosed: false,
    };
  }
}
