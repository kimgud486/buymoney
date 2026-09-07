/**
 * STOCK AI NEXT V6.2 - 30 AI Securities Research & Trading System Types
 * Based on TradingAgents Framework, OpenBB, FinGPT, TA-Lib, Qlib, VectorBT & LangGraph orchestration
 */

export type AgentDepartment = 
  | "MARKET"
  | "TECHNICAL"
  | "FLOW"
  | "INTELLIGENCE"
  | "BULL_TEAM"
  | "BEAR_TEAM"
  | "RISK_COMMITTEE"
  | "CIO";

export type AgentStatus = 
  | "OFFLINE"
  | "IDLE"
  | "FETCHING_DATA"
  | "ANALYZING"
  | "WAITING_EVIDENCE"
  | "CONFIRMED"
  | "REJECTED"
  | "WARNING"
  | "DEBATING"
  | "DECIDING"
  | "COMPLETE";

export type TradingDirection = 
  | "STRONG_LONG"
  | "LONG"
  | "NEUTRAL"
  | "SHORT"
  | "STRONG_SHORT";

export type TradingAction = 
  | "OBSERVE"
  | "WATCH"
  | "READY"
  | "BUY"
  | "ADD"
  | "HOLD"
  | "REDUCE"
  | "EXIT";

export type SetupLifecycleState = 
  | "DETECTED"
  | "WATCH"
  | "READY"
  | "TRIGGERED"
  | "ACTIVE"
  | "INVALIDATED"
  | "COMPLETED";

export interface EvidenceItem {
  id: string; // e.g. E001, E004, E019
  code: string;
  category: "TECHNICAL" | "FLOW" | "MOMENTUM" | "NEWS" | "FUNDAMENTAL" | "RISK" | "PATTERN";
  title: string;
  description: string;
  sentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
  strength: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  score: number; // 0 - 100
  isValid: boolean;
  timestamp: string;
}

export interface AgentProfile {
  id: string;
  name: string;
  nameEn: string;
  department: AgentDepartment;
  avatar: string;
  roleTitle: string;
  frameworkSource: "TradingAgents" | "OpenBB" | "FinGPT" | "TA-Lib" | "Qlib" | "VectorBT" | "LangGraph";
  status: AgentStatus;
  currentTask: string;
  primaryMetric: string;
  currentValue: string;
  score: number; // 0 - 100
  weight: number; // e.g. 1.28x
  precision30D: number; // e.g. 68.7%
  profitFactor: number; // e.g. 1.71
  signalsCount30D: number;
  bestCondition: string;
  weakCondition: string;
  recentEvidenceIds: string[];
  reasoningText: string;
  lastUpdated: string;
}

export interface TargetStockScanItem {
  id: string;
  rank: number;
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "CRYPTO";
  currentPrice: number;
  changePct: number;
  opportunityScore: number; // 0 - 100
  setupScore: number;
  entryScore: number;
  riskScore: number; // 0 - 100 (lower is better)
  rvol: number;
  relativeStrength: number;
  moneyFlowKRW: string;
  catalystTag: string;
  primarySetup: string;
  action: TradingAction;
  direction: TradingDirection;
  idealEntryRange: [number, number];
  acceptableEntryRange: [number, number];
  chaseThreshold: number;
  stopLossPrice: number;
  targetPrice1: number;
  targetPrice2: number;
  invalidationLevel: number;
  consensusScore: number; // 0 - 100
  historicalEdge: number; // %
  bullCount: number;
  bearCount: number;
  neutralCount: number;
  sectorName: string;
}

export interface MarketRegimeState {
  regime: "RISK-ON" | "RISK-OFF" | "NEUTRAL" | "HIGH_VOLATILITY";
  overallScore: number; // 0 - 100
  trendScore: number;
  breadthScore: number;
  momentumScore: number;
  liquidityScore: number;
  volatilityScore: number;
  foreignFlowScore: number;
  kospiChange: number;
  kosdaqChange: number;
  usdKrw: number;
  leadingSectors: Array<{ rank: number; name: string; score: number; changePct: number }>;
  preferredStrategies: Array<{ name: string; grade: "A+" | "A" | "B+" | "B" | "C"; winRate: number; reason: string }>;
  avoidStrategies: Array<{ name: string; grade: "C" | "C-" | "D"; riskReason: string }>;
}

export interface PositionGuardianState {
  symbol: string;
  name: string;
  entryPrice: number;
  currentPrice: number;
  pnlPct: number;
  pnlAmountKRW: number;
  positionHealthScore: number; // 0 - 100
  exitRiskScore: number; // 0 - 100
  structureStatus: "HEALTHY" | "WEAKENING" | "BROKEN";
  vwapStatus: "ABOVE_HOLD" | "TESTING" | "LOST";
  momentumStatus: "EXPANDING" | "NORMAL" | "SOFTENING" | "EXHAUSTED";
  flowStatus: "STRONG_BUY" | "POSITIVE" | "NEUTRAL" | "OUTFLOW";
  recommendedAction: "HOLD" | "TRAIL_STOP" | "REDUCE_50" | "EXIT_ALL";
  trailingStopPrice: number;
  tp1Hit: boolean;
  tp2Hit: boolean;
}
