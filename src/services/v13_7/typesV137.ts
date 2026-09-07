// AISTOCK v13.7 Regime-Aware Scanner Weight Engine Types

export type MarketRegimeV137 =
  | "TREND_UP"
  | "TREND_DOWN"
  | "RANGE"
  | "HIGH_VOL"
  | "LOW_VOL"
  | "UNKNOWN";

export type StrategyGradeV137 = "PROMOTE" | "KEEP" | "WATCH" | "DEMOTE" | "DISABLE";

export type ScannerSetupType =
  | "ORB"
  | "GAP_AND_GO"
  | "BREAKOUT_RETEST"
  | "VWAP_RECLAIM"
  | "MEAN_REVERSION";

export interface CandidateStockInput {
  symbol: string;
  name?: string;
  market: "KOREA" | "US" | "CRYPTO";
  price: number;
  setup: ScannerSetupType;
  strategyGrade?: StrategyGradeV137;
  rvol: number; // Relative Volume (e.g., 1.8)
  todRvol?: number; // Time-of-Day normalized RVOL
  relativeStrength: number; // 0 - 100 vs index/benchmark
  vwapAligned: boolean;
  liquidityPass: boolean;
  chaseRisk: boolean; // True if price extended too far above EMA20/VWAP
  spreadBps?: number;
  expectedNetEdgePct?: number;
  dataCoveragePct?: number;
  isStaleData?: boolean;
}

export interface MarketRegimeDataInput {
  indexCloses: number[];
  indexAtr: number;
  volatilityPct: number;
  dataAgeMs?: number;
  isStaleFeed?: boolean;
}

export interface ScannerFilterResult {
  symbol: string;
  market: string;
  price: number;
  setup: ScannerSetupType;
  regime: MarketRegimeV137;
  baseWeight: number;
  regimeMultiplier: number;
  statusMultiplier: number;
  finalWeight: number;
  finalScore: number;
  chaseRiskBlocked: boolean;
  liquidityBlocked: boolean;
  rvolBlocked: boolean;
  relativeStrengthBlocked: boolean;
  vwapAlignmentBlocked: boolean;
  passSafetyGate: boolean;
  recommendation: "BUY_READY" | "BUY_WATCH" | "REJECTED";
  reason: string;
}
