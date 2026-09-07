// JUSIK2 V21 CORE TYPES & INTERFACES

export type MarketTypeV21 = "KOREA" | "US" | "UPBIT" | "CRYPTO";

export type SetupGradeV21 = "S" | "A" | "B" | "WATCH" | "NO_SETUP";

export type FeedStatusV21 = "REALTIME_VERIFIED" | "REALTIME_DERIVED" | "STALE" | "NO_DATA";

export interface TickV21 {
  symbol: string;
  market: MarketTypeV21;
  price: number;
  volume: number;
  timestamp: number; // Unix ms
  status: FeedStatusV21;
  providerTimestamp?: number;
  source?: string;
}

export interface BarV21 {
  symbol: string;
  market: MarketTypeV21;
  timeframe: "1m" | "3m" | "5m" | "15m" | "60m" | string;
  time: number; // Epoch sec
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  startedAt: number; // Epoch ms
  endedAt: number; // Epoch ms
  isClosed: boolean;
  tickCount: number;
}

export interface IndicatorSnapshotV21 {
  ema9: number | null;
  ema20: number | null;
  ema50: number | null;
  vwap: number | null;
  atr14: number | null;
  rsi14: number | null;
  macdLine: number | null;
  macdSignal: number | null;
  macdHist: number | null;
  rvol: number | null;
  lastSwingLow: number | null;
  lastSwingHigh: number | null;
}

export interface MarketStructureV21 {
  trend: "BULLISH" | "BEARISH" | "SIDEWAYS";
  isHigherHighHigherLow: boolean;
  isLowerHighLowerLow: boolean;
  isBreakout: boolean;
  isBreakdown: boolean;
  isVwapReclaim: boolean;
  isVwapLoss: boolean;
}

export interface SetupScoreV21 {
  symbol: string;
  score: number; // 0 to 100
  grade: SetupGradeV21;
  reasons: string[];
  blockers: string[];
  isQualified: boolean;
}

export interface TradePlanV21 {
  id: string;
  symbol: string;
  market: MarketTypeV21;
  createdAt: number;
  entryPrice: number;
  stopLossPrice: number;
  riskAmount: number;
  riskPct: number;
  tp1: number; // ~0.75R
  tp2: number; // ~1.25R
  tp3: number; // ~2.00R
  rMultipliers: {
    tp1: number;
    tp2: number;
    tp3: number;
  };
}

export type SignalOutcomeV21 =
  | "PENDING"
  | "TP1_HIT"
  | "TP2_HIT"
  | "TP3_HIT"
  | "STOP_FIRST"
  | "AMBIGUOUS";

export interface SignalLifecycleV21 {
  id: string;
  plan: TradePlanV21;
  currentTrailingFloor: number;
  highestPriceSinceBuy: number;
  lowestPriceSinceBuy: number;
  tp1Hit: boolean;
  tp2Hit: boolean;
  tp3Hit: boolean;
  slHit: boolean;
  outcome: SignalOutcomeV21;
  createdAt: number;
  closedAt?: number;
}

export interface PerformanceStatsV21 {
  totalSignals: number;
  activeSignalsCount: number;
  completedSignalsCount: number;
  tp1HitCount: number;
  tp2HitCount: number;
  tp3HitCount: number;
  stopFirstCount: number;
  ambiguousCount: number;
  tp1FirstTouchRatePct: number;
  tp2HitRatePct: number;
  tp3HitRatePct: number;
  stopFirstRatePct: number;
  expectancyR: number;
  profitFactor: number;
  maxDrawdownPct: number;
}
