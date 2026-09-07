export type { StockItem } from "./data/stockUniverse";

export interface InsufficientFundItem {
  id: string;
  symbol: string;
  name: string;
  market: 'KOREA' | 'US' | 'BTC';
  side: 'BUY' | 'SELL';
  price: number;
  qty: number;
  cost: number;
  reason: string;
  timestamp: string;
}

export interface BrokerErrorDetails {
  brokerName: string;
  errorCode: string;
  errorMessage: string;
  endpoint?: string;
  httpStatus?: number;
  timestamp: string;
  rawResponse?: any;
  resolutionGuide?: string[];
}

export interface WatchlistItem {
  id: string;
  symbol: string;
  name: string;
  market: 'KOREA' | 'US' | 'BTC';
  addedAt: string;
  targetBuyPrice?: number;
  memo?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  userName?: string;
  phoneNumber?: string;
  phoneVerified?: boolean;
  familyRelation?: '본인' | '배우자' | '자녀' | '부모' | '형제자매' | '기타';
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  isAdmin?: boolean;
  balance: number;
  cash?: number;
  initialBalance: number;
  riskLimitPerTrade: number;
  dailyLossLimit: number;
  maxPositionWeight: number;
  autoTradingEnabled: boolean;
  autoTradingTargetMarket?: 'ALL' | 'KOREA' | 'US';
  // AI Auto-Trading Filter Settings
  maxHoldingsCount?: number; // 최대 전체 보유 종목 수 (기본 5개)
  minAiConfidenceScore?: number; // 최소 AI 신뢰도 점수 (기본 85점 이상)
  maxAllocPercentPerPosition?: number; // 1종목당 최대 진입 비중 % (기본 15%)
  // AI Real-time Risk Gate & Auto-Tune Controls
  apiGateStatus?: 'GATE_OPEN' | 'GATE_THROTTLED' | 'GATE_LOCKED';
  aiDynamicRiskAutoTune?: boolean;
  aiProfitOptimization?: boolean; // AI Profit Optimization Toggle
  aiAggressivenessLevel?: 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE' | 'DYNAMIC';
  maxSingleOrderAmount?: number;
  maxAllowedSlippage?: number;
  consecutiveLossKillCount?: number;
  trailingStopTriggerPct?: number;
  aiRiskAutoTunedAt?: string;
  isDemoMode?: false;
  isRealTrade?: boolean;
  disableTradeGuardPrompt?: boolean; // 실시간 주문 수동 설정/확인 팝업 차단 (자동 즉시 주문)
  isLiveTradingActive?: boolean;
  apiEnvironmentMode?: 'PRODUCTION';
  isProductionLocked?: boolean;
  tradingMode: 'analysis' | 'approval' | 'semi' | 'auto';
  createdAt: string;
  koreaAppKey?: string;
  koreaAppSecret?: string;
  koreaAccountNo?: string;
  koreaAccountCode?: string;
  upbitAccessKey?: string;
  upbitSecretKey?: string;
  geminiApiKey?: string;
  watchlist?: WatchlistItem[];
}

export interface TradingStrategy {
  id: string;
  userId: string;
  name: string;
  description: string;
  type: 'trend' | 'pullback' | 'volatility' | 'mean_reversion' | 'news' | 'value';
  isActive: boolean;
  conditions: StrategyCondition[];
  allocation: number; // percentage of portfolio
  createdAt: string;
}

export interface StrategyCondition {
  indicator: string; // 'volume' | 'ma_cross' | 'rsi' | 'bollinger' | 'sentiment' | 'market_risk'
  operator: 'greater_than' | 'less_than' | 'equals' | 'crosses_above' | 'crosses_below';
  value: string;
}

export interface StockPosition {
  id: string;
  userId: string;
  symbol: string;
  name: string;
  market: 'KOREA' | 'US' | 'BTC';
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  updatedAt: string;
  broker?: string;
  currency?: 'KRW' | 'USD';
}

export interface TradeLog {
  id: string;
  userId: string;
  symbol: string;
  name: string;
  market: 'KOREA' | 'US' | 'BTC';
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  strategyName: string;
  aiRationale: string;
  timestamp: string;
  isRealTrade?: boolean;
  executionType?: 'REAL_BROKER' | 'PAPER_SIMULATION';
  brokerName?: string;
  brokerOrderId?: string;
  fee?: number;
  balanceAfter?: number;
  verificationStatus?: 'VERIFIED_BROKER' | 'PENDING_CONFIRM';
  orderType?: string;
  rawBrokerResponse?: any;
  pnl?: number;
  pnlRate?: number;
  entryPrice?: number;
  exitPrice?: number;
  netProfit?: number;
}

export type OrderType = 'MARKET' | 'LIMIT' | 'LOC' | 'OCO' | 'TWAP';

export interface Order {
  id: string;
  userId: string;
  symbol: string;
  name: string;
  market: 'KOREA' | 'US' | 'BTC';
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  orderType?: OrderType;
  triggerPrice?: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  splitCount?: number; // TWAP 분할 횟수
  status: 'FILLED' | 'PENDING' | 'CANCELED'; // 체결, 미체결, 취소
  strategyName: string;
  timestamp: string;
  aiRationale?: string;
  brokerOrderId?: string;
  isRealTrade?: boolean;
  executionType?: 'REAL_BROKER' | 'PAPER_SIMULATION';
}

export interface AIAnalysis {
  id: string;
  symbol: string;
  name: string;
  market: 'KOREA' | 'US' | 'BTC';
  score: number; // 0-100
  opinion: 'BUY' | 'WAIT' | 'SELL';
  positionDirection?: 'LONG' | 'SHORT';
  autoExecutionTiming?: string;
  technicalScore: number;
  fundamentalScore: number;
  sentimentScore: number;
  volatilityScore?: number;
  momentumScore?: number;
  targetPrice: number;
  stopLoss: number;
  atrValue?: number;
  var95Pct?: number;
  splitEntrySchedule?: {
    step1Price: number;
    step1Ratio: number;
    step2Price: number;
    step2Ratio: number;
  };
  aiRiskAutoTuneRecommendation?: {
    dailyLossLimit: number;
    maxPositionWeight: number;
    maxSingleOrderAmount: number;
    maxAllowedSlippage: number;
    consecutiveLossKillCount: number;
    rationale: string;
  };
  rationale: string;
  timestamp: string;
  technicalDetails?: string;
  fundamentalDetails?: string;
  sentimentDetails?: string;
  winRate?: number;
  kellyAllocation?: number;
  riskRewardRatio?: number;
  entryStrategy?: string;
  exitStrategy?: string;
  orderbookDepthScore?: number;
  institutionalNetBuying?: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL';
  multiTimeframeTrend?: string;
  volatilityRiskIndex?: 'LOW' | 'MEDIUM' | 'HIGH';
  portfolioRebalanceSuggestion?: string;
  // Enhanced analysis engine fields
  chartPattern?: string;
  volumeAnomaly?: string;
  newsDisclosureSentiment?: string;
  snsSentiment?: string;
  macroImpact?: string;
  sectorRotation?: string;
  upProbability?: number;
  downProbability?: number;
  // Macro-Risk Overlay with VIX
  vixIndex?: number;
  vixLevel?: 'LOW' | 'NORMAL' | 'ELEVATED' | 'EXTREME';
  macroRiskOverlay?: string;
  technicalIndicators?: {
    rsi: number;
    macd: string;
    bollinger: string;
    maCross: string;
  };
}

export interface CurrencyPairInfo {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  value: number;
  change: number;
  pct: number;
  high52w?: number;
  low52w?: number;
  trend?: number[];
  updatedAt?: string;
}

export interface MarketStatus {
  kospi: { value: number; change: number; pct: number };
  kosdaq: { value: number; change: number; pct: number };
  sp500: { value: number; change: number; pct: number };
  nasdaq: { value: number; change: number; pct: number };
  exchangeRate: { value: number; change: number; pct: number };
  currencies?: {
    usdKrw: CurrencyPairInfo;
    jpyKrw: CurrencyPairInfo;
    eurKrw: CurrencyPairInfo;
    cnyKrw: CurrencyPairInfo;
    gbpKrw?: CurrencyPairInfo;
  };
  riskLevel: 'LOW' | 'NORMAL' | 'WARNING' | 'CRITICAL';
  opinion: string;
}

export interface StockProfitContribution {
  symbol: string;
  name: string;
  market: 'KOREA' | 'US' | 'BTC';
  realizedPnl: number;
  unrealizedPnl: number;
  totalPnl: number;
  totalPnlKrw: number;
  returnRate: number;
  winTradesCount: number;
  lossTradesCount: number;
  totalTradesCount: number;
  winRate: number;
  aiAttributionScore: number; // 0-100% how much was driven by AI recommendation
  aiReasoningSummary: string;
  avgHoldingDays: number;
  lastTradeDate?: string;
}

export interface BacktestResult {
  cumulativeReturn: number;
  annualizedReturn: number;
  mdd: number; // max drawdown
  winRate: number;
  sharpeRatio: number;
  tradesCount: number;
  trades: {
    date: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    price: number;
    qty: number;
    profit?: number;
  }[];
  equityCurve: { date: string; value: number }[];
}

export interface CashBreakdown {
  koreaCash: number;
  koreaInvested?: number;
  koreaTotal?: number;

  usCash?: number;
  usInvested?: number;
  usTotal?: number;

  upbitCash?: number;
  upbitInvested?: number;
  upbitTotal?: number;

  totalCash: number;
  totalInvested?: number;
  grandTotalAssets?: number;
}

export interface AIDecisionLog {
  id: string;
  timestamp: string;
  symbol: string;
  name: string;
  market: 'KOREA' | 'US' | 'BTC';
  action: 'ANALYZE' | 'BUY_SIGNAL' | 'SELL_SIGNAL' | 'HOLD_SIGNAL' | 'SAFETY_REJECT' | 'STOP_LOSS';
  positionDirection?: 'LONG' | 'SHORT';
  entryRationale?: string; // 진입 근거 (롱/숏 판단 사유)
  patternAnalysis?: string; // 실행된 패턴 분석 결과
  candlePattern?: string; // 음봉/양봉 캔들 패턴
  smcStructure?: string; // SMC 구조 (BOS/CHoCH/FVG)
  orderbookDelta?: string; // 호가 잔량 수급
  message: string;
  confidence: number;
  currentPrice?: number;
  entryPrice?: number;
  targetPrice?: number;
  stopLossPrice?: number;
  targetGainPct?: number;
  volumeRatio?: number;
  rsi?: number;
  isRealTrade?: boolean;
  executionType?: 'REAL_BROKER' | 'PAPER_SIMULATION';
  safetyStatus: {
    holdingsLimit: 'PASS' | 'FAIL' | 'SKIP';
    dailyLossLimit: 'PASS' | 'FAIL' | 'SKIP';
    marketRisk: 'PASS' | 'FAIL' | 'SKIP';
    brokerAuth: 'PASS' | 'FAIL' | 'SKIP';
  };
}

export interface ActiveChartStock {
  symbol: string;
  name: string;
  market?: 'KOREA' | 'US' | 'BTC';
  currentPrice?: number;
  changeRate?: number;
  volumePower?: number;
}

export interface BlockedSymbolDetail {
  symbol: string;
  name: string;
  market?: 'KOREA' | 'US' | 'BTC';
  blockedAt: number; // timestamp ms
  unblockAt: number; // timestamp ms (cooldown expiry)
  reason: string;
  lossPct?: number;
  triggerSource?: string; // e.g. "-3% 자동 손절", "사용자 수동 차단", "변동성 과열"
}

export type KillSwitchMode = 'SOFT_GUARD' | 'HARD_HALT';
