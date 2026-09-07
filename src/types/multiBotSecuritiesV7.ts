// AI MULTI-BOT TRADING SECURITIES - MASTER PROMPT v7.1 INTEGRATED TYPES

export type DataQualityState = "EXCELLENT" | "GOOD" | "DEGRADED" | "POOR" | "INVALID" | "DATA_BLOCK";
export type MarketRegimeType = "STRONG_BULL" | "BULL" | "BULL_RANGE" | "RANGE" | "BEAR_RANGE" | "BEAR" | "STRONG_BEAR" | "HIGH_VOLATILITY" | "RISK_OFF";
export type ThemeStateType = "NEW" | "DEVELOPING" | "STRONG" | "EXPANDING" | "MATURE" | "EXHAUSTING" | "FAILED";
export type LeaderClassType = "PRIMARY_LEADER" | "SECONDARY_LEADER" | "STRONG" | "FOLLOWER" | "WEAK" | "LAGGARD";
export type StructureStateType = "STRONG_BULL" | "BULL" | "BULL_TRANSITION" | "RANGE" | "BEAR_TRANSITION" | "BEAR" | "STRONG_BEAR";
export type LevelQualityType = "WEAK" | "NORMAL" | "STRONG" | "MAJOR" | "CRITICAL" | "LEVEL_CLUSTER";
export type PatternStateType = "FORMING" | "DETECTED" | "DEVELOPING" | "MATURE" | "TRIGGER_READY" | "CONFIRMED" | "RETESTING" | "EXTENDED" | "FAILED" | "INVALID" | "MISSED";
export type MicrostructureState = "STRONG_BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG_SELL" | "BLOCKED";
export type FinalDecisionOutcome = "LONG" | "SHORT" | "WAIT" | "NO_TRADE" | "BLOCKED";
export type AutoTradingExecutionMode = "FULL_AI_AUTO" | "HYBRID_CONFIRM" | "MANUAL_ONLY";

export interface DataQualityReport {
  state: DataQualityState;
  coverageScore: number; // 0 ~ 100%
  analysisConfidence: number; // 0 ~ 100%
  isBlocked: boolean;
  issues: string[];
}

export interface MarketIntelligenceReport {
  regime: MarketRegimeType;
  kospiTrend: "BULLISH" | "RANGE" | "BEARISH";
  kosdaqTrend: "BULLISH" | "RANGE" | "BEARISH";
  breadthScore: number; // Advance/Decline ratio
  marketRvol: number;
  foreignFlow: "NET_BUY" | "NEUTRAL" | "NET_SELL";
  institutionFlow: "NET_BUY" | "NEUTRAL" | "NET_SELL";
  riskMode: "RISK_ON" | "RISK_OFF";
}

export interface SectorThemeReport {
  topSector: string;
  sectorRank: number;
  themeName: string;
  themeState: ThemeStateType;
  leaderClass: LeaderClassType;
  sectorRvol: number;
}

export interface LongShortArmyReport {
  longScore: number; // 0 ~ 100
  shortScore: number; // 0 ~ 100
  dominantSide: "LONG" | "SHORT" | "BALANCED";
  conflictDetected: boolean;
  longArguments: string[];
  shortArguments: string[];
}

export interface RiskCommitteeReport {
  fakeBreakoutRisk: "LOW" | "MEDIUM" | "HIGH";
  chaseRisk: "LOW" | "MEDIUM" | "HIGH";
  exhaustionRisk: "LOW" | "MEDIUM" | "HIGH";
  marketRisk: "LOW" | "MEDIUM" | "HIGH";
  overallRiskLevel: "SAFE" | "CAUTION" | "HIGH_RISK" | "BLOCKED";
  riskWarnings: string[];
}

export interface MicroBotOutput {
  id: string;
  code: string; // e.g. M001, PT009, SC004
  name: string;
  moduleGroup: "DATA" | "MARKET" | "DISCOVERY" | "STRUCTURE" | "PATTERN" | "VOLUME" | "MICROSTRUCTURE" | "SMC" | "CATALYST" | "RISK" | "POSITION";
  status: "PASS" | "WARN" | "FAIL" | "N/A";
  score: number;
  value: string;
}

export interface MasterSecuritiesV7Analysis {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  currentPrice: number;
  changePct: number;
  tradingValue: number; // 억 원
  rvol: number;
  executionStrength: number; // %
  timestamp: string;

  // Pipeline Reports
  dataQuality: DataQualityReport;
  marketIntel: MarketIntelligenceReport;
  sectorTheme: SectorThemeReport;
  longShortArmy: LongShortArmyReport;
  riskCommittee: RiskCommitteeReport;

  // Key Technical Map
  structureState: StructureStateType;
  patterns: string[];
  smcSignal: string;
  liquiditySweep: string;
  vwapStatus: string;
  entryZoneMin: number;
  entryZoneMax: number;
  breakoutConfirmPrice: number;
  invalidationPrice: number;
  targetPrice1: number;
  targetPrice2: number;

  // Final Outcome
  setupQualityScore: number; // 0 ~ 100
  grade: "S+" | "A+" | "A" | "B" | "C";
  finalDecision: FinalDecisionOutcome;
  rationale: string;

  // All 170+ Micro Bots Array
  microBots: MicroBotOutput[];
}
