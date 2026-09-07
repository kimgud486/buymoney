import type { DecisionInput, TradingState, FeedQuality } from "./types";

export interface ExtendedDecisionInput extends DecisionInput {
  indicatorsReady?: boolean;
  feedQuality?: FeedQuality;
  isClosedBar?: boolean;
  netEdgePositive?: boolean;
}

/**
 * Real-time BUY -> PROFIT_HOLD -> SELL_WATCH -> SELL State Machine
 * Strictly avoids arbitrary static +3% exit targets; follows bullish structure & trailing stops.
 */
export function decideTradingState(x: ExtendedDecisionInput): TradingState {
  // Executable gate: Must be real-time broker feed, indicators ready, closed bar, and positive net edge
  const isExecutable =
    x.feedQuality === "BROKER_REALTIME" &&
    x.indicatorsReady === true &&
    x.isClosedBar === true &&
    x.netEdgePositive === true;

  const bullishStructure =
    x.price > x.vwap &&
    x.ema9 > x.ema20 &&
    x.hhhlValid;

  const bullishMomentum =
    x.rsi >= 52 &&
    x.rsi <= 78 &&
    x.macdHistogram > 0;

  const strongBuy =
    isExecutable &&
    bullishStructure &&
    bullishMomentum &&
    x.breakoutValid &&
    x.volumeExpansion &&
    x.modelProbability >= 0.72;

  const watchBuy =
    bullishStructure &&
    (x.breakoutValid || x.modelProbability >= 0.65);

  // 1. When in NO_TRADE state
  if (x.currentState === "NO_TRADE") {
    if (strongBuy) return "BUY";
    if (watchBuy) return "BUY_WATCH";
    return "NO_TRADE";
  }

  // 2. When in BUY_WATCH state
  if (x.currentState === "BUY_WATCH") {
    if (strongBuy) return "BUY";
    if (!bullishStructure && x.price < x.vwap) return "NO_TRADE";
    return "BUY_WATCH";
  }

  // 3. When in active position (BUY, HOLD, PROFIT_HOLD)
  if (["BUY", "HOLD", "PROFIT_HOLD"].includes(x.currentState)) {
    // Check dynamic trailing exit trigger
    if (x.trailingExitPrice && x.price <= x.trailingExitPrice) {
      return "SELL";
    }

    // Still in strong bullish expansion -> Stay in PROFIT_HOLD
    if (bullishStructure && bullishMomentum) {
      return "PROFIT_HOLD";
    }

    // Structure weakening warning signs -> Degrade to SELL_WATCH
    if (
      x.price < x.vwap ||
      !x.hhhlValid ||
      x.macdHistogram < 0 ||
      x.rsi < 48
    ) {
      return "SELL_WATCH";
    }

    return "HOLD";
  }

  // 4. When in SELL_WATCH state
  if (x.currentState === "SELL_WATCH") {
    // Structural confirmation of collapse -> Final SELL
    if (
      x.price < x.vwap &&
      (!x.hhhlValid || x.macdHistogram < 0 || (x.trailingExitPrice && x.price <= x.trailingExitPrice))
    ) {
      return "SELL";
    }

    // If market suddenly reclaims bullish structure, recover to HOLD
    if (bullishStructure && bullishMomentum && x.price > x.vwap) {
      return "PROFIT_HOLD";
    }

    return "SELL_WATCH";
  }

  // 5. When in SELL state
  if (x.currentState === "SELL") {
    // Order was executed, reset to NO_TRADE
    return "NO_TRADE";
  }

  return x.currentState;
}

/**
 * Calculates a dynamic trailing stop that ratchets upwards with price gains
 * and NEVER lowers once raised.
 */
export function calculateDynamicTrailingExit(
  currentPrice: number,
  entryPrice: number,
  atr: number,
  currentState: TradingState,
  previousTrailingExit: number = 0
): number {
  if (currentState === "NO_TRADE" || currentState === "BUY_WATCH") {
    return 0;
  }

  // Initial stop loss is 1.5 * ATR below entry
  const initialStop = Math.round(entryPrice - 1.5 * atr);

  // If in profit, ratchet trailing exit based on ATR distance
  let calculatedStop = initialStop;
  if (currentPrice > entryPrice) {
    const profit = currentPrice - entryPrice;
    // Trailing distance tightens as profit grows
    const multiplier = profit > 2 * atr ? 1.0 : 1.5;
    calculatedStop = Math.round(currentPrice - multiplier * atr);
  }

  // Ratchet rule: Stop must NEVER be lowered once increased
  return Math.max(previousTrailingExit, calculatedStop);
}
