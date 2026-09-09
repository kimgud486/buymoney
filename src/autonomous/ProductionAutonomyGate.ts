export type TradingMode = "ANALYSIS" | "ASSISTED" | "AUTO_LIVE";
export type AutonomyGateState = "LOCKED" | "READY" | "BLOCKED" | "ACTIVE";

export interface ProductionAutonomyGateInput {
  mode: TradingMode;
  explicitLiveEnabled: boolean;
  confirmationText: string;
  brokerConfigured: boolean;
  brokerHealthy: boolean;
  accountVerified: boolean;
  accountSynced: boolean;
  realtimeDataVerified: boolean;
  marketOpen: boolean;
  supportedMarket: boolean;
  dailyLossGuardPassed: boolean;
  drawdownGuardPassed: boolean;
  exposureGuardPassed: boolean;
  slippageGuardPassed: boolean;
  duplicateOrderFree: boolean;
  staleData: boolean;
}

export interface ProductionAutonomyGateResult {
  state: AutonomyGateState;
  canAnalyze: boolean;
  canRecommend: boolean;
  canSubmitLiveOrder: boolean;
  blockers: string[];
}

const LIVE_CONFIRMATION = "ENABLE AUTO LIVE";

/**
 * Central fail-closed activation gate.
 * Inspired by safety/interlock patterns used in open-source trading engines:
 * decision generation is separated from order permission.
 */
export class ProductionAutonomyGate {
  static evaluate(input: ProductionAutonomyGateInput): ProductionAutonomyGateResult {
    if (input.mode === "ANALYSIS") {
      return {
        state: "READY",
        canAnalyze: true,
        canRecommend: false,
        canSubmitLiveOrder: false,
        blockers: [],
      };
    }

    if (input.mode === "ASSISTED") {
      return {
        state: "READY",
        canAnalyze: true,
        canRecommend: true,
        canSubmitLiveOrder: false,
        blockers: [],
      };
    }

    const blockers: string[] = [];
    if (!input.explicitLiveEnabled) blockers.push("LIVE_NOT_EXPLICITLY_ENABLED");
    if (input.confirmationText.trim().toUpperCase() !== LIVE_CONFIRMATION) blockers.push("LIVE_CONFIRMATION_MISMATCH");
    if (!input.brokerConfigured) blockers.push("BROKER_NOT_CONFIGURED");
    if (!input.brokerHealthy) blockers.push("BROKER_UNHEALTHY");
    if (!input.accountVerified) blockers.push("ACCOUNT_NOT_VERIFIED");
    if (!input.accountSynced) blockers.push("ACCOUNT_NOT_SYNCED");
    if (!input.realtimeDataVerified) blockers.push("REALTIME_DATA_NOT_VERIFIED");
    if (!input.marketOpen) blockers.push("MARKET_CLOSED");
    if (!input.supportedMarket) blockers.push("MARKET_NOT_SUPPORTED_FOR_AUTO_LIVE");
    if (!input.dailyLossGuardPassed) blockers.push("DAILY_LOSS_GUARD_BLOCK");
    if (!input.drawdownGuardPassed) blockers.push("DRAWDOWN_GUARD_BLOCK");
    if (!input.exposureGuardPassed) blockers.push("EXPOSURE_GUARD_BLOCK");
    if (!input.slippageGuardPassed) blockers.push("SLIPPAGE_GUARD_BLOCK");
    if (!input.duplicateOrderFree) blockers.push("DUPLICATE_ORDER_RISK");
    if (input.staleData) blockers.push("STALE_MARKET_DATA");

    if (blockers.length > 0) {
      return {
        state: "BLOCKED",
        canAnalyze: true,
        canRecommend: true,
        canSubmitLiveOrder: false,
        blockers,
      };
    }

    return {
      state: "ACTIVE",
      canAnalyze: true,
      canRecommend: true,
      canSubmitLiveOrder: true,
      blockers: [],
    };
  }
}
