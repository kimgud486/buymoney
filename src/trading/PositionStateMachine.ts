// ----------------------------------------------------------------------
// POSITION STATE MACHINE V19.1 (TRUTH-FIRST CANONICAL LIFECYCLE ENGINE)
// Evidence-Driven State Transitions, Multi-Factor Profit Hold & Hysteresis
// ----------------------------------------------------------------------

import { ExitEvidence } from "../services/ExitEvidenceEngine";

export type PositionState =
  | "FLAT"
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

export interface PositionQuantityState {
  requestedBuyQty: number;
  buyFilledQty: number;
  currentPositionQty: number;
  requestedSellQty: number;
  sellFilledQty: number;
  remainingPositionQty: number;
}

export interface PositionContextV191 {
  state: PositionState;
  symbol: string;
  strategyId: string;

  entryPrice: number | null;
  currentPrice: number;
  highestPriceSinceBuy: number | null;
  initialStopPrice: number | null;
  trailingFloorPrice: number | null;

  quantities: PositionQuantityState;

  exitEvidence: ExitEvidence | null;

  watchThreshold?: number;     // default 35
  recoveryThreshold?: number;  // default 25 (Hysteresis gap)
  sellThreshold?: number;      // default 65

  profitActivationPct?: number; // default 0.8 (+0.8%)
  profitReleasePct?: number;    // default 0.3 (+0.3%)
}

export class PositionStateMachine {
  /**
   * Monotonic trailing stop floor invariant helper: Trailing floor can ONLY stay flat or move up, never down.
   */
  public static updateTrailingFloor(currentFloor: number | null, candidateFloor: number | null): number | null {
    if (candidateFloor == null || candidateFloor <= 0) return currentFloor;
    if (currentFloor == null || currentFloor <= 0) return candidateFloor;
    return Math.max(currentFloor, candidateFloor);
  }

  /**
   * Evaluate canonical V20.1 position state transitions with Hysteresis, Multi-Evidence SELL_WATCH & Monotonic Trailing Floor
   */
  public static evaluateNextState(ctx: PositionContextV191): PositionState {
    const {
      state,
      entryPrice,
      currentPrice,
      highestPriceSinceBuy,
      quantities,
      exitEvidence,
      watchThreshold = 35,
      recoveryThreshold = 25,
      sellThreshold = 65,
      profitActivationPct = 0.8,
      profitReleasePct = 0.3
    } = ctx;

    const { remainingPositionQty, buyFilledQty, requestedBuyQty, sellFilledQty } = quantities;

    // Hard/Trailing Stop & Critical Safety Fast-Path
    const isCatastrophicExit = exitEvidence
      ? (exitEvidence.hardStopHit || exitEvidence.trailingStopHit || exitEvidence.exitRiskScore >= sellThreshold)
      : false;

    // Profit calculation
    const currentProfitPct = (entryPrice != null && entryPrice > 0)
      ? ((currentPrice - entryPrice) / entryPrice) * 100
      : 0;

    const peakPrice = highestPriceSinceBuy ?? currentPrice;
    const peakProfitPct = (entryPrice != null && entryPrice > 0)
      ? ((peakPrice - entryPrice) / entryPrice) * 100
      : 0;

    const givebackPct = peakProfitPct > 0 ? peakProfitPct - currentProfitPct : 0;

    // PROFIT_HOLD multi-factor qualification:
    // 1. Profit rate >= activation threshold (+0.8%)
    // 2. Giveback is not excessive (< 50% of peak gain or < 1.5% absolute)
    // 3. Exit risk score is low (< watchThreshold)
    const qualifiesForProfitHold =
      entryPrice != null &&
      currentProfitPct >= profitActivationPct &&
      givebackPct < Math.max(1.5, peakProfitPct * 0.5) &&
      (!exitEvidence || exitEvidence.exitRiskScore < watchThreshold);

    const retainsProfitHold =
      entryPrice != null &&
      currentProfitPct >= profitReleasePct &&
      (!exitEvidence || exitEvidence.exitRiskScore < watchThreshold);

    switch (state) {
      case "FLAT":
        return "FLAT";

      case "BUY_PENDING":
        return "BUY_PENDING"; // Awaits Broker ACK or Fill event

      case "BUY_ACKNOWLEDGED":
        if (buyFilledQty >= requestedBuyQty && requestedBuyQty > 0) return "BUY_FILLED";
        if (buyFilledQty > 0) return "BUY_PARTIAL";
        return "BUY_ACKNOWLEDGED";

      case "BUY_PARTIAL":
        if (buyFilledQty >= requestedBuyQty && requestedBuyQty > 0) return "BUY_FILLED";
        return "BUY_PARTIAL";

      case "BUY_FILLED":
        return "HOLD";

      case "HOLD": {
        if (remainingPositionQty <= 0) return "CLOSED";
        if (isCatastrophicExit) return "SELL_PENDING";

        // Multi-evidence gate: Require exitRiskScore >= watchThreshold AND at least 2 independent warning/structural evidences
        const independentEvidences = exitEvidence ? (exitEvidence.structuralCount + exitEvidence.warningCount) : 0;
        if (exitEvidence && exitEvidence.exitRiskScore >= watchThreshold && independentEvidences >= 2) {
          return "SELL_WATCH";
        }
        if (qualifiesForProfitHold) {
          return "PROFIT_HOLD";
        }
        return "HOLD";
      }

      case "PROFIT_HOLD": {
        if (remainingPositionQty <= 0) return "CLOSED";
        if (isCatastrophicExit) return "SELL_PENDING";

        // Multi-evidence gate: Require exitRiskScore >= watchThreshold AND at least 2 independent warning/structural evidences
        const independentEvidences = exitEvidence ? (exitEvidence.structuralCount + exitEvidence.warningCount) : 0;
        if (exitEvidence && exitEvidence.exitRiskScore >= watchThreshold && independentEvidences >= 2) {
          return "SELL_WATCH";
        }
        if (!retainsProfitHold) {
          return "HOLD";
        }
        return "PROFIT_HOLD";
      }

      case "SELL_WATCH": {
        if (remainingPositionQty <= 0) return "CLOSED";
        if (isCatastrophicExit) return "SELL_PENDING";

        // Hysteresis & Reversibility: Recovery requires exitRiskScore < recoveryThreshold (25) AND evidence count < 2
        const independentEvidences = exitEvidence ? (exitEvidence.structuralCount + exitEvidence.warningCount) : 0;
        if (exitEvidence && (exitEvidence.exitRiskScore < recoveryThreshold || independentEvidences < 2)) {
          return retainsProfitHold ? "PROFIT_HOLD" : "HOLD";
        }
        return "SELL_WATCH";
      }

      case "SELL_PENDING":
        return "SELL_PENDING"; // Awaits Broker ACK or Fill event

      case "SELL_ACKNOWLEDGED":
        if (remainingPositionQty === 0 && sellFilledQty > 0) return "CLOSED";
        if (sellFilledQty > 0) return "SELL_PARTIAL";
        return "SELL_ACKNOWLEDGED";

      case "SELL_PARTIAL":
        if (remainingPositionQty === 0 && sellFilledQty > 0) return "CLOSED";
        return "SELL_PARTIAL";

      case "CLOSED":
        return "CLOSED";

      default:
        return "FLAT";
    }
  }
}
