// AISTOCK v13 Real Intelligence Core - Position & Dynamic Trailing Exit AI Engine
// Post-fill position management completely INDEPENDENT of Scanner AI!
// Calculates dynamic trailing exit floor: max(last_higher_low, vwap_support, ema_support, atr_stop, breakout_support)

import { CalculatedIndicatorsV13 } from "./TechnicalAnalysisEngineV13";
import { AdaptiveTrailingExitEngineV137 } from "../v13_7/AdaptiveTrailingExitEngineV137";

export type PositionStateV13 =
  | "HOLD"
  | "PROFIT HOLD"
  | "TRAIL UP"
  | "SELL WATCH"
  | "SELL"
  | "EMERGENCY EXIT";

export interface ActivePositionInfoV13 {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  buyPrice: number;
  currentPrice: number;
  qty: number;
  pnlPct: number;
  pnlAmount: number;
  highestPriceSinceBuy: number;
  previousTrailingFloor?: number;
  indicators: CalculatedIndicatorsV13;
}

export interface PositionEvaluationResultV13 {
  symbol: string;
  state: PositionStateV13;
  dynamicExitFloor: number;
  previousTrailingFloor: number;
  pnlPct: number;
  sellRiskPct: number; // 0 ~ 100%
  actionAdvice: "HOLD" | "TRAIL_FLOOR_RAISED" | "PREPARE_SELL" | "EXECUTE_SELL";
  explanation: string;
  reasons: string[];
  scannerIndependent: boolean; // Always true
  timestamp: string;
}

export class PositionAndExitEngineV13 {
  /**
   * Evaluate active position on every price update or bar close
   */
  public static evaluatePosition(position: ActivePositionInfoV13): PositionEvaluationResultV13 {
    const { buyPrice, currentPrice, pnlPct, highestPriceSinceBuy, previousTrailingFloor = 0, indicators: ind } = position;

    const res = AdaptiveTrailingExitEngineV137.evaluate({
      symbol: position.symbol,
      market: position.market === "US" ? "US" : "KOREA",
      entryPrice: buyPrice,
      currentPrice,
      highestPriceSinceBuy,
      previousTrailingFloor,
      atr14: ind.atr14,
      sessionVwap: ind.vwap,
      ema20: ind.ema20,
      recentSwingLow: ind.lastHigherLow,
      structure: ind.structure === "LH_LL" ? "LH_LL" : ind.structure === "HH_HL" ? "HH_HL" : "SIDEWAYS",
      rsi14: ind.rsi14,
      macdHist: ind.macdHist
    });

    let stateStr: PositionStateV13 = "HOLD";
    let actionAdvice: "HOLD" | "TRAIL_FLOOR_RAISED" | "PREPARE_SELL" | "EXECUTE_SELL" = "HOLD";

    if (res.state === "SELL") {
      stateStr = "SELL";
      actionAdvice = "EXECUTE_SELL";
    } else if (res.state === "EMERGENCY_EXIT") {
      stateStr = "EMERGENCY EXIT";
      actionAdvice = "EXECUTE_SELL";
    } else if (res.state === "SELL_WATCH") {
      stateStr = "SELL WATCH";
      actionAdvice = "PREPARE_SELL";
    } else if (res.state === "TRAIL_UP") {
      stateStr = "TRAIL UP";
      actionAdvice = "TRAIL_FLOOR_RAISED";
    } else if (res.state === "PROFIT_HOLD") {
      stateStr = "PROFIT HOLD";
      actionAdvice = "HOLD";
    } else {
      stateStr = "HOLD";
      actionAdvice = "HOLD";
    }

    const explanation = res.reasons.join(", ") || `PnL: ${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%`;

    return {
      symbol: position.symbol,
      state: stateStr,
      dynamicExitFloor: res.trailingFloor,
      previousTrailingFloor: res.previousTrailingFloor,
      pnlPct: res.pnlPct,
      sellRiskPct: res.sellRiskScore,
      actionAdvice,
      explanation,
      reasons: res.reasons,
      scannerIndependent: true,
      timestamp: new Date().toLocaleTimeString("ko-KR")
    };
  }
}
