export type FeedQuality =
  | "BROKER_REALTIME"
  | "EXCHANGE_REALTIME"
  | "POLLING_DELAYED"
  | "STALE"
  | "DISCONNECTED";

export type FeedSource =
  | "KIS_REALTIME_WS"
  | "US_BROKER_WS"
  | "UPBIT_WS"
  | "SERVER_STREAM"
  | "NAVER_POLLING"
  | "UPBIT_PUBLIC_TICKER"
  | "API_STOCKS";

export interface MarketDataEnvelope {
  source: FeedSource;
  quality: FeedQuality;
  symbol: string;
  market?: "KOSPI" | "KOSDAQ" | "UPBIT" | "US" | "KOREA" | "CRYPTO";
  exchangeTimestamp: number;
  receivedTimestamp: number;
  sequence?: number;
  price: number;
  tradeVolume: number;
  accumulatedVolume?: number;
  isRealtime: boolean;
  isDelayed: boolean;
}

export interface LiveTick {
  symbol: string;
  timestamp: number;
  exchangeTimestamp?: number;
  receivedTimestamp?: number;
  receivedAt?: number;
  providerTimestamp?: number;
  price: number;
  volume: number;
  accumulatedVolume?: number;
  source?: FeedSource;
  quality?: FeedQuality;
  feedQuality?: FeedQuality;
  isRealtime?: boolean;
  isDelayed?: boolean;
  sequence?: number;
  bid?: number;
  ask?: number;
  bidVolume?: number;
  askVolume?: number;
  market?: "KOREA" | "US" | "UPBIT" | "CRYPTO";
}

export interface LiveCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  bidVolume?: number;
  askVolume?: number;
  isClosed?: boolean;
  sessionKey?: string;
  source?: string;
  quality?: FeedQuality;
  feedQuality?: FeedQuality;
  receivedAt?: number;
  providerTimestamp?: number;
}

export interface IndicatorSnapshot {
  ema9: number;
  ema20: number;
  ema50: number;
  ema200: number;
  vwap: number;
  rsi14: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  atr14: number;
  rvol: number;
  todRvol?: number;
  trendStrength: number;
  bollingerUpper?: number;
  bollingerMiddle?: number;
  bollingerLower?: number;
  stochK?: number;
  stochD?: number;
  indicatorsReady: boolean;
  warmupReason?: string;
}

export interface NetEdgeResult {
  expectedGrossEdgePct: number;
  expectedCostPct: number;
  expectedSlippagePct: number;
  expectedNetEdgePct: number;
  rewardRisk: number;
  allowEntry: boolean;
  reason?: string;
}

export type TradingState =
  | "BUY"
  | "BUY_WATCH"
  | "HOLD"
  | "PROFIT_HOLD"
  | "SELL_WATCH"
  | "SELL"
  | "NO_TRADE";

export interface DecisionInput {
  price: number;
  ema9: number;
  ema20: number;
  vwap: number;
  rsi: number;
  macdHistogram: number;
  hhhlValid: boolean;
  breakoutValid: boolean;
  volumeExpansion: boolean;
  modelProbability: number;
  currentState: TradingState;
  trailingExitPrice?: number;
}

export interface ForecastPoint {
  time: number;
  predicted: number;
  upper: number;
  lower: number;
  probabilityUp: number;
  probabilityDown: number;
}
