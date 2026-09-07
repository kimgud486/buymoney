export type MarketDataSource =
  | "KIS_REALTIME_WS"
  | "US_BROKER_WS"
  | "UPBIT_WS"
  | "NAVER_POLLING";

export type FeedQuality =
  | "BROKER_REALTIME"
  | "POLLING_DELAYED"
  | "STALE"
  | "DISCONNECTED";

export interface MarketTradeTickV14 {
  symbol: string;
  market: "KOSPI" | "KOSDAQ" | "US" | "UPBIT";
  source: MarketDataSource;
  feedQuality: FeedQuality;
  exchangeTimestamp: number;
  receivedTimestamp: number;
  price: number;
  tradeVolume: number;
  accumulatedVolume?: number;
  bid?: number;
  ask?: number;
  bidVolume?: number;
  askVolume?: number;
  sequence?: string;
}

export interface ExecutionFeedResult {
  valid: boolean;
  reason?: string;
  latencyMs?: number;
}

export function canGenerateExecutionSignal(source: MarketDataSource): boolean {
  return source === "KIS_REALTIME_WS" || source === "US_BROKER_WS";
}

export function validateExecutionFeed(
  tick: MarketTradeTickV14,
  maxLatencyMs = 3000
): ExecutionFeedResult {
  if (!canGenerateExecutionSignal(tick.source)) {
    return {
      valid: false,
      reason: "DISPLAY_ONLY_MARKET_DATA"
    };
  }

  if (tick.feedQuality !== "BROKER_REALTIME") {
    return {
      valid: false,
      reason: "NON_EXECUTION_GRADE_FEED"
    };
  }

  if (!Number.isFinite(tick.price) || tick.price <= 0) {
    return {
      valid: false,
      reason: "INVALID_PRICE"
    };
  }

  if (!Number.isFinite(tick.exchangeTimestamp) || tick.exchangeTimestamp <= 0) {
    return {
      valid: false,
      reason: "INVALID_EXCHANGE_TIMESTAMP"
    };
  }

  const latency = tick.receivedTimestamp - tick.exchangeTimestamp;

  if (latency < 0) {
    return {
      valid: false,
      reason: "FUTURE_TIMESTAMP"
    };
  }

  if (latency > maxLatencyMs) {
    return {
      valid: false,
      reason: "STALE_MARKET_DATA",
      latencyMs: latency
    };
  }

  return {
    valid: true,
    latencyMs: latency
  };
}
