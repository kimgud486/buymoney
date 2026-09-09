export type FinalBuyHoldActionV20 =
  | "STRONG_BUY"
  | "BUY"
  | "WATCH"
  | "NO"
  | "KEEP_HOLD"
  | "REDUCE"
  | "EXIT";

export interface FinalTradePlanDtoV20 {
  entry: number | null;
  stop: number | null;
  tp1: number | null;
  tp2: number | null;
  tp3: number | null;
  riskRewardTp1: number | null;
  source: "ATR_STRUCTURE" | "NO_VERIFIED_PLAN";
}

export interface FinalPatternGateDtoV20 {
  passed: boolean;
  catalogCount: number;
  executableCount: number;
  coveragePct: number;
  suppliedPatterns: string[];
  executableMatches: string[];
  nonExecutableOrUnknown: string[];
  blockers: string[];
}

export interface FinalBuyHoldDecisionDtoV20 {
  symbol: string;
  name: string;
  action: FinalBuyHoldActionV20;
  aiScore: number;
  grade: "S" | "A" | "B" | "C" | "REJECT";
  recommendation: "BUY_CANDIDATE" | "WATCH" | "REJECT";
  verifiedWinRatePct: number | null;
  sampleSize: number;
  profitFactor: number | null;
  expectancyPct: number | null;
  holdScore: number;
  trueMtfPassed: boolean;
  patternGate: FinalPatternGateDtoV20;
  blockers: string[];
  confirmations: string[];
  reasons: string[];
  plan: FinalTradePlanDtoV20;
  dataCoveragePct: number;
  dataStatus: "REALTIME_VERIFIED" | "REALTIME_DERIVED" | "STALE" | "NO_DATA" | "INVALID" | "CLOSED";
  timestamp: number;
}
