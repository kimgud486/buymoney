// Multi-Agent Trading System Architecture Types (6 Layers, 30 Specialized Bots + 4 Master Orchestrators)

export type BotStatusType = "PASS" | "WARN" | "FAIL" | "SCANNING" | "INACTIVE";

export interface BotOutput {
  id: string;
  name: string;
  layer: 1 | 2 | 3 | 4 | 5 | 6;
  category: "MARKET" | "DISCOVERY" | "CHART" | "ENTRY" | "RISK" | "POSITION";
  icon: string;
  status: BotStatusType;
  score: number; // 0 ~ 100
  summary: string;
  detail: string;
  metrics?: Record<string, string | number>;
}

export interface DiscoveryMasterOutput {
  marketTrend: "BULLISH" | "NEUTRAL" | "BEARISH";
  topSector: string;
  themeMomentum: string;
  leaderType: "LEADER" | "2ND" | "FOLLOWER";
  relativeStrengthScore: number;
  moneyFlowGrade: "SUPER_INFLOW" | "HEALTHY" | "WEAK";
  discoveryBots: BotOutput[];
}

export interface AnalysisMasterOutput {
  structureStatus: "상승구조 유지 (HH/HL)" | "하락구조 (LH/LL)" | "박스권 수렴";
  patternsDetected: string[];
  smcSignal: "Bullish CHoCH -> BOS" | "Bearish FVG Retest" | "Liquidity Grab" | "Neutral";
  liquiditySweep: "SSL Sweep 확인" | "BSL Sweep 확인" | "미발생";
  vwapStatus: "VWAP 상단 유지" | "VWAP 돌파 재테스트" | "VWAP 이탈";
  volumeProfilePoc: number;
  supportResistance: {
    support1: number;
    support2: number;
    resistance1: number;
    resistance2: number;
  };
  analysisBots: BotOutput[];
}

export interface DecisionMasterOutput {
  setupQualityScore: number; // 0 ~ 100 (Internal Setup Quality, NOT raw probability)
  grade: "S+" | "A+" | "A" | "B" | "C";
  state: "DETECTED" | "WATCHING" | "CONFIRMING" | "CONFIRMED" | "REJECTED";
  targetEntryRange: [number, number];
  breakoutConfirmPrice: number;
  invalidationPrice: number;
  targetResistance1: number;
  targetResistance2: number;
  fakeBreakoutRisk: "LOW" | "MEDIUM" | "HIGH";
  chaseRisk: "LOW" | "MEDIUM" | "HIGH";
  exhaustionRisk: "LOW" | "MEDIUM" | "HIGH";
  marketRisk: "LOW" | "MEDIUM" | "HIGH";
  decisionBots: BotOutput[];
}

export interface PositionMasterOutput {
  holdingStatus: "STRUCTURE_INTACT" | "WARNING_PULLBACK" | "EXIT_REQUIRED";
  profitShieldLevel: number;
  exitWatchTriggers: string[];
  emergencyAlert: boolean;
  positionBots: BotOutput[];
}

export interface MultiAgentStockAnalysis {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  currentPrice: number;
  changePct: number;
  tradingValue: number;
  rvol: number;
  updatedAt: string;

  // Master Engine Outputs
  discoveryMaster: DiscoveryMasterOutput;
  analysisMaster: AnalysisMasterOutput;
  decisionMaster: DecisionMasterOutput;
  positionMaster: PositionMasterOutput;

  // Full 30 Bot Array
  all30Bots: BotOutput[];
}
