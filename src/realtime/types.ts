export type FeedQuality =
  | "BROKER_REALTIME"
  | "POLLING_DELAYED"
  | "STALE"
  | "DISCONNECTED";

export interface MarketDataEnvelope {
  source: "KIS_REALTIME_WS" | "US_BROKER_WS" | "NAVER_POLLING";
  quality: FeedQuality;
  symbol: string;
  market?: "KOSPI" | "KOSDAQ" | "UPBIT" | "US" | "KOREA";
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
  timestamp: number; // Unix ms
  exchangeTimestamp?: number;
  receivedTimestamp?: number;
  price: number;
  volume: number;
  source?: "KIS_REALTIME_WS" | "US_BROKER_WS" | "NAVER_POLLING";
  quality?: FeedQuality;
  isRealtime?: boolean;
  isDelayed?: boolean;
  sequence?: number;
  bid?: number;
  ask?: number;
  bidVolume?: number;
  askVolume?: number;
}

export interface LiveCandle {
  time: number; // Unix timestamp in seconds (for Lightweight Charts) or ms
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
}

export interface IndicatorSnapshot {
  ema9: number;
  ema20: number;
  ema50: number;
  ema200: number; // NaN if < 200 bars
  vwap: number; // Session VWAP
  rsi14: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  atr14: number;
  rvol: number; // Excludes current bar from baseline
  todRvol?: number; // Time-of-day normalized volume ratio
  trendStrength: number;
  bollingerUpper?: number;
  bollingerMiddle?: number;
  bollingerLower?: number;
  stochK?: number;
  stochD?: number;
  indicatorsReady: boolean; // True if candles >= 220 and finite EMA200
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
  time: number; // seconds
  predicted: number;
  upper: number;
  lower: number;
  probabilityUp: number;
  probabilityDown: number;
}

export interface TradingMarker {
  time: number; // seconds
  position: "aboveBar" | "belowBar" | "inBar";
  color: string;
  shape: "arrowUp" | "arrowDown" | "circle" | "square";
  text: string;
  size?: number;
}

export interface MarketStructureSnapshot {
  trend: "BULLISH" | "BEARISH" | "SIDEWAYS";
  hhhlValid: boolean;
  lhllValid: boolean;

  higherHigh: boolean;
  higherLow: boolean;
  lowerHigh: boolean;
  lowerLow: boolean;

  lastHigherHigh?: number;
  lastHigherLow?: number;
  lastLowerHigh?: number;
  lastLowerLow?: number;

  lastConfirmedSwingHigh?: number;
  lastConfirmedSwingLow?: number;
  confirmedSupport?: number;

  structure: "HH_HL" | "LH_LL" | "SIDEWAYS";

  breakoutValid: boolean;
  pullbackValid: boolean;
  vwapReclaim: boolean;
  volumeExpansion: boolean;
  chochDetected: boolean;
  bosDetected: boolean;
}
