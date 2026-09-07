import React, { useState, useMemo } from "react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart,
  Pie,
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  RadarChart, 
  Radar, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis,
  ComposedChart
} from "recharts";
import { 
  TrendingUp, 
  BarChart3, 
  ShieldCheck, 
  Zap, 
  Award, 
  Calendar, 
  Filter, 
  RefreshCw, 
  Download, 
  Sparkles, 
  ArrowUpRight, 
  CheckCircle2, 
  PieChart as PieIcon,
  Sliders,
  SlidersHorizontal,
  Brain,
  GitCompare,
  Activity,
  Target,
  AlertTriangle,
  Cpu,
  Layers,
  ShieldAlert,
  Flame,
  CheckCircle,
  Info,
  Check,
  Copy,
  ArrowRightLeft,
  DollarSign,
  Trophy,
  Scale,
  ArrowUpDown,
  LayoutGrid
} from "lucide-react";
import { PortfolioVaRPanel } from "./PortfolioVaRPanel";

// ==========================================
// TYPES & DATA STRUCTURES FOR SIDE-BY-SIDE
// ==========================================

export type MarketScenario = "FULL" | "BULL" | "BEAR" | "SIDEWAYS";

export interface StrategyScenarioData {
  totalReturn: number;
  cagr: number;
  winRate: number;
  profitFactor: number;
  monthlyAvgReturn: number;
  mdd: number;
  sharpe: number;
  sortino: number;
  calmar: number;
  var95: number;
  volatility: number;
  tradesPerMonth: number;
}

export interface AIStrategyDetail {
  id: string;
  name: string;
  shortName: string;
  badge: string;
  badgeColor: string;
  icon: string;
  type: string;
  color: string;
  bestRegime: string;
  avgHoldingTime: string;
  stopLossFreq: string;
  description: string;
  scenarios: Record<MarketScenario, StrategyScenarioData>;
}

// 6 COMPREHENSIVE AI TRADING STRATEGIES DATASET
export const ALL_STRATEGIES: AIStrategyDetail[] = [
  {
    id: "metaEnsemble",
    name: "🧠 메타 앙상블 복합 AI",
    shortName: "메타 앙상블",
    badge: "최우수 종합 1위",
    badgeColor: "bg-indigo-500/20 text-indigo-400 border-indigo-500/50",
    icon: "🧠",
    type: "Meta-Labeling Composite",
    color: "#818cf8",
    bestRegime: "전천후 시장 (Bull/Bear/Sideways)",
    avgHoldingTime: "18시간",
    stopLossFreq: "월 1.2회 (극저)",
    description: "LightGBM + Transformer + OrderFlow 3종 모델 합성 및 메타 라벨링으로 승인된 고확률 체결만 집행",
    scenarios: {
      FULL: { totalReturn: 48.9, cagr: 46.1, winRate: 86.8, profitFactor: 3.15, monthlyAvgReturn: 4.08, mdd: -1.8, sharpe: 3.45, sortino: 4.80, calmar: 25.6, var95: 0.52, volatility: 10.8, tradesPerMonth: 42 },
      BULL: { totalReturn: 62.4, cagr: 58.2, winRate: 89.5, profitFactor: 3.65, monthlyAvgReturn: 5.20, mdd: -1.2, sharpe: 3.92, sortino: 5.40, calmar: 48.5, var95: 0.45, volatility: 9.5, tradesPerMonth: 48 },
      BEAR: { totalReturn: 28.5, cagr: 26.8, winRate: 81.2, profitFactor: 2.45, monthlyAvgReturn: 2.38, mdd: -2.4, sharpe: 2.65, sortino: 3.40, calmar: 11.2, var95: 0.68, volatility: 12.1, tradesPerMonth: 32 },
      SIDEWAYS: { totalReturn: 52.1, cagr: 49.5, winRate: 87.4, profitFactor: 3.28, monthlyAvgReturn: 4.34, mdd: -1.9, sharpe: 3.55, sortino: 4.95, calmar: 26.0, var95: 0.55, volatility: 11.2, tradesPerMonth: 54 }
    }
  },
  {
    id: "hftScalper",
    name: "⚡ HFT 초단타 스캘퍼",
    shortName: "HFT 스캘퍼",
    badge: "초고속 스캘핑",
    badgeColor: "bg-cyan-500/20 text-cyan-400 border-cyan-500/50",
    icon: "⚡",
    type: "High-Frequency Order Flow",
    color: "#06b6d4",
    bestRegime: "고변동성 박스권 / 체결 불균형",
    avgHoldingTime: "12분",
    stopLossFreq: "월 2.8회",
    description: "호가창 불균형(OFI) 및 Micro-Structure 체결 강도 포착 초단타 알고리즘",
    scenarios: {
      FULL: { totalReturn: 45.2, cagr: 42.1, winRate: 85.4, profitFactor: 2.85, monthlyAvgReturn: 3.77, mdd: -2.1, sharpe: 3.12, sortino: 4.25, calmar: 20.0, var95: 0.65, volatility: 12.4, tradesPerMonth: 128 },
      BULL: { totalReturn: 51.0, cagr: 48.2, winRate: 87.2, profitFactor: 3.10, monthlyAvgReturn: 4.25, mdd: -1.8, sharpe: 3.40, sortino: 4.60, calmar: 26.7, var95: 0.58, volatility: 11.5, tradesPerMonth: 140 },
      BEAR: { totalReturn: 32.4, cagr: 30.1, winRate: 80.5, profitFactor: 2.22, monthlyAvgReturn: 2.70, mdd: -2.8, sharpe: 2.35, sortino: 3.10, calmar: 10.7, var95: 0.82, volatility: 14.2, tradesPerMonth: 98 },
      SIDEWAYS: { totalReturn: 58.6, cagr: 55.4, winRate: 88.6, profitFactor: 3.42, monthlyAvgReturn: 4.88, mdd: -1.6, sharpe: 3.75, sortino: 5.10, calmar: 34.6, var95: 0.50, volatility: 11.8, tradesPerMonth: 165 }
    }
  },
  {
    id: "alphaMomentum",
    name: "🚀 알파 모멘텀 AI",
    shortName: "알파 모멘텀",
    badge: "추세 추종 주력",
    badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/50",
    icon: "🚀",
    type: "Multi-Factor Transformer",
    color: "#a855f7",
    bestRegime: "강한 상승 추세장 (Bull Market)",
    avgHoldingTime: "1.5일",
    stopLossFreq: "월 3.5회",
    description: "다중 요인 모멘텀 및 기관 수급 결합 상승 파동 집중 공략",
    scenarios: {
      FULL: { totalReturn: 38.4, cagr: 36.2, winRate: 78.6, profitFactor: 2.42, monthlyAvgReturn: 3.20, mdd: -3.8, sharpe: 2.84, sortino: 3.80, calmar: 9.5, var95: 0.95, volatility: 15.2, tradesPerMonth: 28 },
      BULL: { totalReturn: 58.2, cagr: 54.8, winRate: 84.5, profitFactor: 3.20, monthlyAvgReturn: 4.85, mdd: -2.2, sharpe: 3.50, sortino: 4.80, calmar: 24.9, var95: 0.72, volatility: 13.0, tradesPerMonth: 34 },
      BEAR: { totalReturn: 12.8, cagr: 11.9, winRate: 68.2, profitFactor: 1.62, monthlyAvgReturn: 1.07, mdd: -5.8, sharpe: 1.42, sortino: 1.85, calmar: 2.0, var95: 1.45, volatility: 18.5, tradesPerMonth: 18 },
      SIDEWAYS: { totalReturn: 31.5, cagr: 29.8, winRate: 75.4, profitFactor: 2.15, monthlyAvgReturn: 2.62, mdd: -4.1, sharpe: 2.20, sortino: 2.90, calmar: 7.2, var95: 1.10, volatility: 16.0, tradesPerMonth: 26 }
    }
  },
  {
    id: "pullbackFlow",
    name: "🎯 수급 세력 눌림목 AI",
    shortName: "수급 눌림목",
    badge: "세력 수급 추적",
    badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/50",
    icon: "🎯",
    type: "Smart Money Pullback",
    color: "#10b981",
    bestRegime: "주요 대장주 눌림목 반등 구간",
    avgHoldingTime: "3.5일",
    stopLossFreq: "월 1.8회",
    description: "외국인/기관 스마트머니 대량 이탈 없는 눌림목에서 VWAP 지지선 기반 손익비 우위 매수",
    scenarios: {
      FULL: { totalReturn: 34.6, cagr: 32.8, winRate: 81.2, profitFactor: 2.56, monthlyAvgReturn: 2.88, mdd: -2.9, sharpe: 2.78, sortino: 3.92, calmar: 11.3, var95: 0.78, volatility: 13.5, tradesPerMonth: 22 },
      BULL: { totalReturn: 44.8, cagr: 42.1, winRate: 85.0, profitFactor: 2.95, monthlyAvgReturn: 3.73, mdd: -1.9, sharpe: 3.25, sortino: 4.50, calmar: 22.1, var95: 0.62, volatility: 11.8, tradesPerMonth: 26 },
      BEAR: { totalReturn: 21.5, cagr: 20.2, winRate: 74.8, profitFactor: 1.98, monthlyAvgReturn: 1.79, mdd: -4.2, sharpe: 1.95, sortino: 2.55, calmar: 4.8, var95: 1.05, volatility: 15.8, tradesPerMonth: 16 },
      SIDEWAYS: { totalReturn: 36.0, cagr: 34.1, winRate: 82.0, profitFactor: 2.62, monthlyAvgReturn: 3.00, mdd: -2.8, sharpe: 2.85, sortino: 4.02, calmar: 12.1, var95: 0.75, volatility: 13.0, tradesPerMonth: 22 }
    }
  },
  {
    id: "volBreakout",
    name: "🛡️ 변동성 돌파 AI",
    shortName: "변동성 돌파",
    badge: "K-Factor 리스크 방어",
    badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/50",
    icon: "🛡️",
    type: "K-Factor LightGBM",
    color: "#3b82f6",
    bestRegime: "변동성 확장 및 고가 돌파",
    avgHoldingTime: "1일 (당일종가 청산)",
    stopLossFreq: "월 2.2회",
    description: "동적 K-Factor 적용 변동성 돌파 시 당일 오버나이트 리스크 배제 기계적 당일 청산",
    scenarios: {
      FULL: { totalReturn: 29.1, cagr: 27.5, winRate: 74.2, profitFactor: 2.10, monthlyAvgReturn: 2.42, mdd: -4.2, sharpe: 2.35, sortino: 3.10, calmar: 6.5, var95: 1.15, volatility: 14.8, tradesPerMonth: 25 },
      BULL: { totalReturn: 39.5, cagr: 37.0, winRate: 79.2, profitFactor: 2.55, monthlyAvgReturn: 3.29, mdd: -2.8, sharpe: 2.88, sortino: 3.85, calmar: 13.2, var95: 0.90, volatility: 13.2, tradesPerMonth: 30 },
      BEAR: { totalReturn: 14.2, cagr: 13.2, winRate: 66.5, profitFactor: 1.52, monthlyAvgReturn: 1.18, mdd: -6.1, sharpe: 1.35, sortino: 1.72, calmar: 2.1, var95: 1.62, volatility: 17.5, tradesPerMonth: 18 },
      SIDEWAYS: { totalReturn: 28.0, cagr: 26.4, winRate: 72.8, profitFactor: 2.02, monthlyAvgReturn: 2.33, mdd: -4.5, sharpe: 2.15, sortino: 2.85, calmar: 5.8, var95: 1.25, volatility: 15.5, tradesPerMonth: 24 }
    }
  },
  {
    id: "meanReversion",
    name: "⚖️ 평균 회귀 퀀트",
    shortName: "평균 회귀",
    badge: "통계적 아비트라지",
    badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/50",
    icon: "⚖️",
    type: "Bollinger/RSI StatArb",
    color: "#f59e0b",
    bestRegime: "박스권 횡보장 (Range-Bound)",
    avgHoldingTime: "2.2일",
    stopLossFreq: "월 1.5회",
    description: "볼린저 밴드 하단 이탈 및 RSI 과매도 구간 표준편차 역발상 매수",
    scenarios: {
      FULL: { totalReturn: 22.8, cagr: 21.4, winRate: 72.0, profitFactor: 1.88, monthlyAvgReturn: 1.90, mdd: -3.1, sharpe: 1.95, sortino: 2.65, calmar: 6.9, var95: 0.85, volatility: 11.2, tradesPerMonth: 19 },
      BULL: { totalReturn: 18.5, cagr: 17.4, winRate: 69.5, profitFactor: 1.72, monthlyAvgReturn: 1.54, mdd: -3.5, sharpe: 1.70, sortino: 2.20, calmar: 4.9, var95: 0.92, volatility: 12.0, tradesPerMonth: 16 },
      BEAR: { totalReturn: 19.8, cagr: 18.6, winRate: 71.0, profitFactor: 1.80, monthlyAvgReturn: 1.65, mdd: -3.8, sharpe: 1.82, sortino: 2.40, calmar: 4.8, var95: 0.98, volatility: 11.8, tradesPerMonth: 21 },
      SIDEWAYS: { totalReturn: 32.5, cagr: 30.8, winRate: 78.4, profitFactor: 2.38, monthlyAvgReturn: 2.70, mdd: -2.2, sharpe: 2.60, sortino: 3.55, calmar: 14.0, var95: 0.70, volatility: 10.5, tradesPerMonth: 28 }
    }
  }
];

// CUMULATIVE PERFORMANCE OVER TIME FOR ALL 6 STRATEGIES
const CUMULATIVE_PERFORMANCE_DATA = [
  { date: "2025-08", metaEnsemble: 3.8, hftScalper: 3.5, alphaMomentum: 2.1, pullbackFlow: 2.6, volBreakout: 1.8, meanReversion: 1.2, benchmark: 0.5 },
  { date: "2025-09", metaEnsemble: 7.9, hftScalper: 6.8, alphaMomentum: 4.8, pullbackFlow: 5.2, volBreakout: 3.5, meanReversion: 2.9, benchmark: 1.1 },
  { date: "2025-10", metaEnsemble: 12.8, hftScalper: 11.2, alphaMomentum: 8.2, pullbackFlow: 8.9, volBreakout: 6.1, meanReversion: 4.5, benchmark: 1.8 },
  { date: "2025-11", metaEnsemble: 17.5, hftScalper: 15.8, alphaMomentum: 11.5, pullbackFlow: 12.4, volBreakout: 9.8, meanReversion: 7.2, benchmark: 2.4 },
  { date: "2025-12", metaEnsemble: 23.2, hftScalper: 21.0, alphaMomentum: 15.9, pullbackFlow: 16.8, volBreakout: 12.4, meanReversion: 9.8, benchmark: 3.2 },
  { date: "2026-01", metaEnsemble: 29.0, hftScalper: 26.5, alphaMomentum: 19.4, pullbackFlow: 20.5, volBreakout: 16.0, meanReversion: 12.1, benchmark: 4.0 },
  { date: "2026-02", metaEnsemble: 34.8, hftScalper: 31.8, alphaMomentum: 23.8, pullbackFlow: 24.8, volBreakout: 19.5, meanReversion: 14.8, benchmark: 5.1 },
  { date: "2026-03", metaEnsemble: 39.5, hftScalper: 35.2, alphaMomentum: 27.2, pullbackFlow: 28.1, volBreakout: 22.1, meanReversion: 16.5, benchmark: 5.8 },
  { date: "2026-04", metaEnsemble: 43.6, hftScalper: 39.8, alphaMomentum: 31.0, pullbackFlow: 31.2, volBreakout: 24.8, meanReversion: 18.9, benchmark: 6.5 },
  { date: "2026-05", metaEnsemble: 46.2, hftScalper: 42.5, alphaMomentum: 34.5, pullbackFlow: 33.1, volBreakout: 27.2, meanReversion: 20.8, benchmark: 7.1 },
  { date: "2026-06", metaEnsemble: 47.8, hftScalper: 44.1, alphaMomentum: 36.8, pullbackFlow: 34.0, volBreakout: 28.5, meanReversion: 21.9, benchmark: 7.8 },
  { date: "2026-07", metaEnsemble: 48.9, hftScalper: 45.2, alphaMomentum: 38.4, pullbackFlow: 34.6, volBreakout: 29.1, meanReversion: 22.8, benchmark: 8.2 }
];

const MONTHLY_RETURNS_DATA = [
  { month: "25/08", returnPct: 3.8 },
  { month: "25/09", returnPct: 4.1 },
  { month: "25/10", returnPct: 4.9 },
  { month: "25/11", returnPct: 4.7 },
  { month: "25/12", returnPct: 5.7 },
  { month: "26/01", returnPct: 5.8 },
  { month: "26/02", returnPct: 5.8 },
  { month: "26/03", returnPct: 4.7 },
  { month: "26/04", returnPct: 4.1 },
  { month: "26/05", returnPct: 2.6 },
  { month: "26/06", returnPct: 1.6 },
  { month: "26/07", returnPct: 1.1 }
];

const _baseRates = [1.45, 2.10, 0.65, 1.80, -0.40, 3.25, 1.95, 0.90, 2.40, 1.15, 2.80, -0.20, 1.70, 2.35];
const _pnls = [435000, 630000, 195000, 540000, -120000, 975000, 585000, 270000, 720000, 345000, 840000, -60000, 510000, 705000];
const _winRates = [83.3, 87.5, 75.0, 85.7, 60.0, 90.0, 88.9, 80.0, 85.7, 83.3, 90.9, 66.7, 85.7, 88.9];
const _tradesList = [6, 8, 4, 7, 5, 10, 9, 5, 7, 6, 11, 3, 7, 9];

const DAILY_STRATEGY_PERFORMANCE_DATA = _baseRates.map((returnPct, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (13 - i));
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return {
    date: `${mm}/${dd}`,
    returnPct,
    pnlKrw: _pnls[i],
    winRate: _winRates[i],
    trades: _tradesList[i]
  };
});

const JARVIS_CORRELATION_DATA = [
  { symbol: "삼성전자 (005930)", jarvisProposed: 12.5, actualMarket: 11.8, diff: -0.7, score: 98.4 },
  { symbol: "엔비디아 (NVDA)", jarvisProposed: 18.0, actualMarket: 19.2, diff: 1.2, score: 97.8 },
  { symbol: "애플 (AAPL)", jarvisProposed: 8.5, actualMarket: 7.9, diff: -0.6, score: 99.1 },
  { symbol: "비트코인 (BTC)", jarvisProposed: 22.0, actualMarket: 21.5, diff: -0.5, score: 98.9 },
  { symbol: "SK하이닉스 (000660)", jarvisProposed: 15.0, actualMarket: 14.2, diff: -0.8, score: 97.5 },
  { symbol: "테슬라 (TSLA)", jarvisProposed: 19.5, actualMarket: 18.8, diff: -0.7, score: 98.2 },
  { symbol: "NAVER (035420)", jarvisProposed: 7.0, actualMarket: 6.5, diff: -0.5, score: 99.0 },
  { symbol: "마이크로소프트 (MSFT)", jarvisProposed: 11.0, actualMarket: 11.4, diff: 0.4, score: 99.3 },
  { symbol: "현대차 (005380)", jarvisProposed: 9.5, actualMarket: 9.1, diff: -0.4, score: 99.2 },
  { symbol: "AMD (AMD)", jarvisProposed: 14.0, actualMarket: 14.8, diff: 0.8, score: 98.5 }
];

const SECTOR_ALLOCATION_DATA = [
  { name: "AI 반도체 & HBM", value: 35, color: "#06b6d4" },
  { name: "미국 빅테크 (NVDA/AAPL)", value: 25, color: "#3b82f6" },
  { name: "K-증시 밸류업 (자동차/금융)", value: 20, color: "#10b981" },
  { name: "가상자산 (BTC/ETH)", value: 15, color: "#f59e0b" },
  { name: "비상 현금 유동성", value: 5, color: "#64748b" }
];

const PREDICTION_MODELS_PERFORMANCE = [
  { id: "LIGHTGBM", name: "🌲 LightGBM / XGBoost 트리 앙상블", hitRate: 78.4, coverage: 24.5, profitFactor: 2.15, avgWinLossRatio: 1.85, mdd: -2.8, status: "ACTIVE", badge: "주력 기술적 모델" },
  { id: "TRANSFORMER", name: "🧠 Transformer 시계열 AI", hitRate: 74.2, coverage: 18.2, profitFactor: 1.92, avgWinLossRatio: 1.68, mdd: -3.4, status: "ACTIVE", badge: "장기 파동 예측" },
  { id: "ORDERFLOW", name: "⚡ OrderFlow 체결 불균형 모델", hitRate: 81.0, coverage: 12.8, profitFactor: 2.45, avgWinLossRatio: 2.10, mdd: -2.1, status: "ACTIVE", badge: "초단타 고스캘핑" },
  { id: "PATTERN", name: "📐 차트 패턴 기하학 탐지기", hitRate: 72.5, coverage: 31.0, profitFactor: 1.78, avgWinLossRatio: 1.52, mdd: -4.1, status: "ACTIVE", badge: "보조 패턴 엔진" },
  { id: "META", name: "🚀 메타 라벨링 복합 합성 모델", hitRate: 84.8, coverage: 15.6, profitFactor: 2.82, avgWinLossRatio: 2.30, mdd: -1.9, status: "EXCELLENT", badge: "최종 체결 승인" }
];

const CALIBRATION_CURVE_DATA = [
  { bucket: "50-60%", rawProb: 55.0, calibratedProb: 53.5, actualHitRate: 52.1, gap: 2.9 },
  { bucket: "60-70%", rawProb: 66.0, calibratedProb: 63.8, actualHitRate: 64.0, gap: 2.0 },
  { bucket: "70-80%", rawProb: 77.0, calibratedProb: 73.2, actualHitRate: 72.8, gap: 4.2 },
  { bucket: "80-90%", rawProb: 88.5, calibratedProb: 79.1, actualHitRate: 78.4, gap: 10.1 },
  { bucket: "90-100%", rawProb: 96.0, calibratedProb: 82.4, actualHitRate: 81.9, gap: 14.1 }
];

const FAILURE_ANALYSIS_DATA = [
  { id: 1, cause: "⚠️ 가짜 돌파 (False Breakout)", percentage: 38.2, pnlImpact: -1.25, count: 47, color: "#f43f5e", description: "고점 수급 오버슈팅 착시 후 순간 세력 물량 던짐 현상", countermeasure: "체결강도 180% 및 수급 다중 확인 상향 필터 자동 적용" },
  { id: 2, cause: "🌊 수급 반전 (Order Flow Reversal)", percentage: 26.5, pnlImpact: -1.40, count: 33, color: "#f59e0b", description: "기관/외국인 빙산(Iceberg) 매도 주문 출현에 따른 급락", countermeasure: "주문장 불균형(OFI) 실시간 하향 감지 시 스탑로스 밀착" },
  { id: 3, cause: "🌀 국면 오판 (Market Regime Error)", percentage: 18.1, pnlImpact: -1.80, count: 22, color: "#a855f7", description: "강한 상승장에서 횡보 고변동성 국면으로의 기습 전환", countermeasure: "HMM 국면 전환 모니터링 즉시 진입 비중 50% 축소" },
  { id: 4, cause: "📰 돌발 매크로 쇼크 (News Shock)", percentage: 12.4, pnlImpact: -2.10, count: 15, color: "#ec4899", description: "연준 금리 발언 및 지경학적 돌발 속보 악재 반영", countermeasure: "뉴스 감성 지수 이상 진동 감지 시 즉시 NO_TRADE 발동" },
  { id: 5, cause: "⏳ 시간 만료 미체결 (Time Limit Expiration)", percentage: 4.8, pnlImpact: 0.15, count: 6, color: "#06b6d4", description: "목표가/손절가 모두 미도달 상태에서 N봉 시간제한 소진", countermeasure: "트리플 배리어 시간 제한 8봉 -> 6봉 단축 로직 반영" }
];

export const AiStrategyPerformanceDashboard: React.FC = () => {
  // Main Navigation / View Mode
  const [viewMode, setViewMode] = useState<"MATRIX" | "HEAD_TO_HEAD" | "CHARTS" | "DIAGNOSTICS">("MATRIX");
  
  // Market Scenario Filter
  const [scenario, setScenario] = useState<MarketScenario>("FULL");
  
  // Selected strategies for Side-by-Side Matrix
  const [selectedStrategyIds, setSelectedStrategyIds] = useState<string[]>([
    "metaEnsemble",
    "hftScalper",
    "alphaMomentum",
    "pullbackFlow"
  ]);

  // Head-to-Head Duel Selection
  const [headToHeadA, setHeadToHeadA] = useState<string>("metaEnsemble");
  const [headToHeadB, setHeadToHeadB] = useState<string>("hftScalper");

  // Investment Capital Simulator State
  const [initialCapital, setInitialCapital] = useState<number>(10000000);

  // Other State
  const [timeframe, setTimeframe] = useState<"1M" | "3M" | "6M" | "1Y" | "ALL">("1Y");
  const [dailyMetric, setDailyMetric] = useState<"RETURN" | "PNL" | "WINRATE">("RETURN");
  const [isRescanning, setIsRescanning] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  // Filtered Strategies List
  const displayedStrategies = useMemo(() => {
    return ALL_STRATEGIES.filter((st) => selectedStrategyIds.includes(st.id));
  }, [selectedStrategyIds]);

  const toggleStrategySelection = (id: string) => {
    if (selectedStrategyIds.includes(id)) {
      if (selectedStrategyIds.length <= 2) {
        alert("최소 2개 이상의 전략을 선택해야 사이드-바이-사이드 비교가 가능합니다.");
        return;
      }
      setSelectedStrategyIds(selectedStrategyIds.filter((item) => item !== id));
    } else {
      setSelectedStrategyIds([...selectedStrategyIds, id]);
    }
  };

  const handleRescan = () => {
    setIsRescanning(true);
    setTimeout(() => setIsRescanning(false), 1200);
  };

  // Copy Comparison Report to Clipboard
  const handleCopyReport = () => {
    const scenarioLabels: Record<MarketScenario, string> = {
      FULL: "전체 기간 (1Y)",
      BULL: "강한 상승장",
      BEAR: "긴축 하락장",
      SIDEWAYS: "박스권 횡보장"
    };

    let report = `[AI 퀀트 매매 전략 사이드-바이-사이드 비교 리포트]\n`;
    report += `시뮬레이션 국면: ${scenarioLabels[scenario]}\n`;
    report += `초기 투자금: ${(initialCapital / 10000).toLocaleString()}만 원\n`;
    report += `=========================================\n\n`;

    displayedStrategies.forEach((st, idx) => {
      const data = st.scenarios[scenario];
      const finalVal = Math.round(initialCapital * (1 + data.totalReturn / 100));
      const profit = finalVal - initialCapital;

      report += `${idx + 1}. ${st.name} (${st.type})\n`;
      report += `   - 누적 수익률: +${data.totalReturn}%\n`;
      report += `   - 예상 최종자산: ${(finalVal / 10000).toLocaleString()}만 원 (수익: +${(profit / 10000).toLocaleString()}만 원)\n`;
      report += `   - 승률: ${data.winRate}%\n`;
      report += `   - Profit Factor: ${data.profitFactor}\n`;
      report += `   - Sharpe Ratio: ${data.sharpe}\n`;
      report += `   - MDD (최대낙폭): ${data.mdd}%\n`;
      report += `   - VaR (95% 1D): ${data.var95}%\n\n`;
    });

    navigator.clipboard.writeText(report);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 3000);
  };

  // Best Metric Calculators for Highlighting in Matrix
  const getBestMetricValue = (metricKey: keyof StrategyScenarioData, isLowerBetter = false) => {
    if (displayedStrategies.length === 0) return 0;
    const values = displayedStrategies.map((st) => st.scenarios[scenario][metricKey]);
    return isLowerBetter ? Math.min(...values) : Math.max(...values);
  };

  const stratA = ALL_STRATEGIES.find((s) => s.id === headToHeadA) || ALL_STRATEGIES[0];
  const stratB = ALL_STRATEGIES.find((s) => s.id === headToHeadB) || ALL_STRATEGIES[1];

  const stratAData = stratA.scenarios[scenario];
  const stratBData = stratB.scenarios[scenario];

  // Head to Head Radar Data
  const headToHeadRadarData = [
    { metric: "수익성 (Return)", A: Math.min(100, stratAData.totalReturn * 1.8), B: Math.min(100, stratBData.totalReturn * 1.8), Benchmark: 20 },
    { metric: "승률 (Win Rate)", A: stratAData.winRate, B: stratBData.winRate, Benchmark: 50 },
    { metric: "샤프 지수 (Sharpe)", A: Math.min(100, stratAData.sharpe * 25), B: Math.min(100, stratBData.sharpe * 25), Benchmark: 25 },
    { metric: "손익비 (PF)", A: Math.min(100, stratAData.profitFactor * 30), B: Math.min(100, stratBData.profitFactor * 30), Benchmark: 30 },
    { metric: "방어력 (100-MDD)", A: Math.max(0, 100 + stratAData.mdd * 10), B: Math.max(0, 100 + stratBData.mdd * 10), Benchmark: 60 }
  ];

  return (
    <div className="space-y-6 animate-fade-in text-zinc-900 dark:text-zinc-100">
      {/* DASHBOARD HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-950 via-zinc-900 to-indigo-950 border border-indigo-500/30 p-6 rounded-2xl text-white shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-3">
            <span className="p-2.5 bg-indigo-500/20 border border-indigo-400/40 rounded-xl text-indigo-300">
              <LayoutGrid className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                AI 퀀트 매매 전략 사이드-바이-사이드 비교 대쉬보드
                <span className="text-xs font-mono font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-400/50 px-2 py-0.5 rounded-md">
                  v7.8 Enhanced
                </span>
              </h2>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                다중 AI 알고리즘의 수익률, 샤프지수, MDD, VaR 리스크 및 국면별 백테스트 성과를 사이드-바이-사이드로 한눈에 교차 검증합니다.
              </p>
            </div>
          </div>
        </div>

        {/* TOP ACTION BAR: COPIED TOAST / RESCAN / REPORT COPY */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleCopyReport}
            className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl border border-zinc-700 shadow-sm flex items-center space-x-1.5 cursor-pointer transition"
          >
            {copiedToast ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-indigo-400" />}
            <span>{copiedToast ? "리포트 복사 완료!" : "📋 비교 리포트 복사"}</span>
          </button>

          <button
            onClick={handleRescan}
            disabled={isRescanning}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-black text-xs rounded-xl shadow-lg border border-indigo-400/40 flex items-center space-x-1.5 cursor-pointer transition"
          >
            <RefreshCw className={`h-4 w-4 ${isRescanning ? "animate-spin" : ""}`} />
            <span>백테스트 정밀 재연산</span>
          </button>
        </div>
      </div>

      {/* VIEW MODE TABS NAVIGATION */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setViewMode("MATRIX")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
              viewMode === "MATRIX"
                ? "bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400/50"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            <span>📊 사이드-바이-사이드 종합 매트릭스</span>
          </button>

          <button
            onClick={() => setViewMode("HEAD_TO_HEAD")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
              viewMode === "HEAD_TO_HEAD"
                ? "bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400/50"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            <ArrowRightLeft className="h-4 w-4 text-amber-400" />
            <span>⚔️ 1대1 전략 듀얼 (Head-to-Head)</span>
          </button>

          <button
            onClick={() => setViewMode("CHARTS")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
              viewMode === "CHARTS"
                ? "bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400/50"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            <BarChart3 className="h-4 w-4 text-cyan-400" />
            <span>📈 누적 차트 &amp; 일별 트렌드</span>
          </button>

          <button
            onClick={() => setViewMode("DIAGNOSTICS")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
              viewMode === "DIAGNOSTICS"
                ? "bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400/50"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            <ShieldAlert className="h-4 w-4 text-rose-400" />
            <span>🛡️ 리스크 VaR &amp; AI 오차 보정</span>
          </button>
        </div>

        {/* MARKET SCENARIO CONTROLLER */}
        <div className="flex items-center space-x-1.5 bg-zinc-100 dark:bg-zinc-950 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-mono">
          <span className="text-zinc-500 dark:text-zinc-400 font-sans font-bold px-2 flex items-center gap-1">
            <SlidersHorizontal className="h-3.5 w-3.5 text-indigo-500" /> 시장 국면:
          </span>
          {(
            [
              { id: "FULL", name: "🌐 전체 (1Y)" },
              { id: "BULL", name: "🚀 강한 상승장" },
              { id: "BEAR", name: "📉 긴축 하락장" },
              { id: "SIDEWAYS", name: "🌀 박스권 횡보장" }
            ] as const
          ).map((sc) => (
            <button
              key={sc.id}
              onClick={() => setScenario(sc.id)}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer whitespace-nowrap ${
                scenario === sc.id
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              {sc.name}
            </button>
          ))}
        </div>
      </div>

      {/* STRATEGY SELECTION TOGGLE BAR (FOR MATRIX VIEW) */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">
          <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 font-mono">
            <Filter className="h-4 w-4 text-indigo-500" />
            비교 대상 AI 매매 전략 선택 ({selectedStrategyIds.length}/{ALL_STRATEGIES.length}개 활성):
          </span>

          <div className="flex items-center space-x-2 text-xs font-mono">
            <button
              onClick={() => setSelectedStrategyIds(ALL_STRATEGIES.map((s) => s.id))}
              className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 rounded-lg transition font-bold border border-zinc-200 dark:border-zinc-700 text-[11px] cursor-pointer"
            >
              전체 선택 (6개)
            </button>
            <button
              onClick={() => setSelectedStrategyIds(["metaEnsemble", "hftScalper", "alphaMomentum"])}
              className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 rounded-lg transition font-bold border border-zinc-200 dark:border-zinc-700 text-[11px] cursor-pointer"
            >
              TOP 3 수익 모델
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {ALL_STRATEGIES.map((st) => {
            const isSelected = selectedStrategyIds.includes(st.id);
            return (
              <button
                key={st.id}
                onClick={() => toggleStrategySelection(st.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer border ${
                  isSelected
                    ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/50 shadow-xs"
                    : "bg-zinc-50 dark:bg-zinc-950 text-zinc-400 border-zinc-200 dark:border-zinc-800 opacity-60 hover:opacity-100"
                }`}
              >
                <span>{st.icon}</span>
                <span>{st.shortName}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-extrabold ${
                  isSelected ? "bg-indigo-600 text-white" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
                }`}>
                  +{st.scenarios[scenario].totalReturn}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ==========================================
          VIEW TAB 1: SIDE-BY-SIDE MATRIX TABLE
          ========================================== */}
      {viewMode === "MATRIX" && (
        <div className="space-y-6">
          {/* SIMULATED CAPITAL INVESTOR CALCULATOR STRIP */}
          <div className="bg-gradient-to-r from-indigo-950 via-zinc-900 to-slate-950 border border-indigo-500/40 p-5 rounded-2xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <span className="p-2.5 bg-amber-500/20 border border-amber-400/40 rounded-xl text-amber-300">
                <DollarSign className="h-6 w-6" />
              </span>
              <div>
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  초기 자본금 설정 및 수익금 산출기 (Capital Investment Growth)
                </h4>
                <p className="text-xs text-zinc-300/80">
                  투자금을 입력하면 선택한 각 전략별 예상 최종 자산 및 순수익금(KRW)이 자동 계산됩니다.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold text-zinc-400">시작 투자금:</span>
              {[
                { label: "100만 원", val: 1000000 },
                { label: "1,000만 원", val: 10000000 },
                { label: "3,000만 원", val: 30000000 },
                { label: "5,000만 원", val: 50000000 },
                { label: "1억 원", val: 100000000 }
              ].map((cap) => (
                <button
                  key={cap.val}
                  onClick={() => setInitialCapital(cap.val)}
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition cursor-pointer border ${
                    initialCapital === cap.val
                      ? "bg-amber-500 text-zinc-950 font-black border-amber-300 shadow-md ring-2 ring-amber-400/50"
                      : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700"
                  }`}
                >
                  {cap.label}
                </button>
              ))}
            </div>
          </div>

          {/* SIDE-BY-SIDE MATRIX MAIN TABLE */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-zinc-900 dark:text-white flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  AI 매매 전략 사이드-바이-사이드 성과 &amp; 리스크 비교 매트릭스
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  각 지표별 최고 성과 항목은 <span className="text-emerald-500 font-bold">BEST</span> 녹색 하이라이트 배지가 부여됩니다.
                </p>
              </div>

              <div className="flex items-center space-x-2 text-xs font-mono text-zinc-500">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>BEST : 최고 우수 성과</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-xs font-mono">
                    <th className="p-4 font-bold text-zinc-500 dark:text-zinc-400 min-w-[180px] sticky left-0 bg-zinc-50 dark:bg-zinc-950 z-10 border-r border-zinc-200 dark:border-zinc-800">
                      비교 성과 항목 (Metrics)
                    </th>
                    {displayedStrategies.map((st, index) => {
                      const data = st.scenarios[scenario];
                      const finalVal = Math.round(initialCapital * (1 + data.totalReturn / 100));
                      const profit = finalVal - initialCapital;

                      return (
                        <th key={st.id} className="p-4 min-w-[200px] border-r border-zinc-200 dark:border-zinc-800 align-top">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-lg">{st.icon}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border font-mono ${st.badgeColor}`}>
                                #{index + 1} {st.badge}
                              </span>
                            </div>

                            <h4 className="font-extrabold text-sm text-zinc-900 dark:text-white">{st.name}</h4>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-sans font-normal truncate">
                              {st.type}
                            </p>

                            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800/80">
                              <div className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                                +{data.totalReturn}%
                              </div>
                              <div className="text-[11px] font-mono text-zinc-600 dark:text-zinc-300 font-bold">
                                {(finalVal / 10000).toLocaleString()}만 원
                                <span className="text-[10px] text-emerald-500 font-bold ml-1">
                                  (+{(profit / 10000).toLocaleString()}만)
                                </span>
                              </div>
                            </div>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs font-mono">
                  {/* CATEGORY 1: RETURN METRICS */}
                  <tr className="bg-indigo-50/50 dark:bg-indigo-950/30">
                    <td colSpan={displayedStrategies.length + 1} className="px-4 py-2 font-bold text-indigo-600 dark:text-indigo-400 font-sans">
                      📈 1. 백테스트 수익성 지표 (Return &amp; Profitability Metrics)
                    </td>
                  </tr>

                  {/* ROW: CAGR */}
                  <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50 transition">
                    <td className="p-3.5 font-bold text-zinc-700 dark:text-zinc-300 sticky left-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 font-sans">
                      연환산 수익률 (CAGR)
                    </td>
                    {displayedStrategies.map((st) => {
                      const val = st.scenarios[scenario].cagr;
                      const isBest = val === getBestMetricValue("cagr");
                      return (
                        <td key={st.id} className={`p-3.5 border-r border-zinc-200 dark:border-zinc-800 ${isBest ? "bg-emerald-500/10 dark:bg-emerald-950/20" : ""}`}>
                          <div className="flex items-center justify-between">
                            <span className={`font-black ${isBest ? "text-emerald-600 dark:text-emerald-400 text-sm" : "text-zinc-800 dark:text-zinc-200"}`}>
                              +{val}%
                            </span>
                            {isBest && <span className="text-[9px] font-black bg-emerald-500 text-white px-1.5 py-0.2 rounded">BEST</span>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* ROW: WIN RATE */}
                  <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50 transition">
                    <td className="p-3.5 font-bold text-zinc-700 dark:text-zinc-300 sticky left-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 font-sans">
                      매매 승률 (Win Rate)
                    </td>
                    {displayedStrategies.map((st) => {
                      const val = st.scenarios[scenario].winRate;
                      const isBest = val === getBestMetricValue("winRate");
                      return (
                        <td key={st.id} className={`p-3.5 border-r border-zinc-200 dark:border-zinc-800 ${isBest ? "bg-emerald-500/10 dark:bg-emerald-950/20" : ""}`}>
                          <div className="flex items-center justify-between">
                            <span className={`font-black ${isBest ? "text-emerald-600 dark:text-emerald-400 text-sm" : "text-zinc-800 dark:text-zinc-200"}`}>
                              {val}%
                            </span>
                            {isBest && <span className="text-[9px] font-black bg-emerald-500 text-white px-1.5 py-0.2 rounded">BEST</span>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* ROW: PROFIT FACTOR */}
                  <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50 transition">
                    <td className="p-3.5 font-bold text-zinc-700 dark:text-zinc-300 sticky left-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 font-sans">
                      Profit Factor (손익비)
                    </td>
                    {displayedStrategies.map((st) => {
                      const val = st.scenarios[scenario].profitFactor;
                      const isBest = val === getBestMetricValue("profitFactor");
                      return (
                        <td key={st.id} className={`p-3.5 border-r border-zinc-200 dark:border-zinc-800 ${isBest ? "bg-emerald-500/10 dark:bg-emerald-950/20" : ""}`}>
                          <div className="flex items-center justify-between">
                            <span className={`font-black ${isBest ? "text-emerald-600 dark:text-emerald-400 text-sm" : "text-zinc-800 dark:text-zinc-200"}`}>
                              {val}
                            </span>
                            {isBest && <span className="text-[9px] font-black bg-emerald-500 text-white px-1.5 py-0.2 rounded">BEST</span>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* ROW: MONTHLY AVG RETURN */}
                  <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50 transition">
                    <td className="p-3.5 font-bold text-zinc-700 dark:text-zinc-300 sticky left-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 font-sans">
                      월평균 수익률
                    </td>
                    {displayedStrategies.map((st) => {
                      const val = st.scenarios[scenario].monthlyAvgReturn;
                      const isBest = val === getBestMetricValue("monthlyAvgReturn");
                      return (
                        <td key={st.id} className={`p-3.5 border-r border-zinc-200 dark:border-zinc-800 ${isBest ? "bg-emerald-500/10 dark:bg-emerald-950/20" : ""}`}>
                          <div className="flex items-center justify-between">
                            <span className={`font-black ${isBest ? "text-emerald-600 dark:text-emerald-400 text-sm" : "text-zinc-800 dark:text-zinc-200"}`}>
                              +{val}%
                            </span>
                            {isBest && <span className="text-[9px] font-black bg-emerald-500 text-white px-1.5 py-0.2 rounded">BEST</span>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* CATEGORY 2: RISK METRICS */}
                  <tr className="bg-rose-50/50 dark:bg-rose-950/30">
                    <td colSpan={displayedStrategies.length + 1} className="px-4 py-2 font-bold text-rose-600 dark:text-rose-400 font-sans">
                      🛡️ 2. 리스크 &amp; 방어력 지표 (Risk &amp; Defense Metrics)
                    </td>
                  </tr>

                  {/* ROW: MDD */}
                  <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50 transition">
                    <td className="p-3.5 font-bold text-zinc-700 dark:text-zinc-300 sticky left-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 font-sans">
                      최대 낙폭 (MDD)
                    </td>
                    {displayedStrategies.map((st) => {
                      const val = st.scenarios[scenario].mdd;
                      const isBest = val === getBestMetricValue("mdd", true); // lowest magnitude negative is best
                      return (
                        <td key={st.id} className={`p-3.5 border-r border-zinc-200 dark:border-zinc-800 ${isBest ? "bg-emerald-500/10 dark:bg-emerald-950/20" : ""}`}>
                          <div className="flex items-center justify-between">
                            <span className={`font-black ${isBest ? "text-emerald-600 dark:text-emerald-400 text-sm" : "text-rose-500"}`}>
                              {val}%
                            </span>
                            {isBest && <span className="text-[9px] font-black bg-emerald-500 text-white px-1.5 py-0.2 rounded">LOWEST RISK</span>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* ROW: SHARPE RATIO */}
                  <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50 transition">
                    <td className="p-3.5 font-bold text-zinc-700 dark:text-zinc-300 sticky left-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 font-sans">
                      샤프 지수 (Sharpe Ratio)
                    </td>
                    {displayedStrategies.map((st) => {
                      const val = st.scenarios[scenario].sharpe;
                      const isBest = val === getBestMetricValue("sharpe");
                      return (
                        <td key={st.id} className={`p-3.5 border-r border-zinc-200 dark:border-zinc-800 ${isBest ? "bg-emerald-500/10 dark:bg-emerald-950/20" : ""}`}>
                          <div className="flex items-center justify-between">
                            <span className={`font-black ${isBest ? "text-emerald-600 dark:text-emerald-400 text-sm" : "text-zinc-800 dark:text-zinc-200"}`}>
                              {val}
                            </span>
                            {isBest && <span className="text-[9px] font-black bg-emerald-500 text-white px-1.5 py-0.2 rounded">BEST</span>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* ROW: SORTINO RATIO */}
                  <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50 transition">
                    <td className="p-3.5 font-bold text-zinc-700 dark:text-zinc-300 sticky left-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 font-sans">
                      솔티노 지수 (Sortino)
                    </td>
                    {displayedStrategies.map((st) => {
                      const val = st.scenarios[scenario].sortino;
                      const isBest = val === getBestMetricValue("sortino");
                      return (
                        <td key={st.id} className={`p-3.5 border-r border-zinc-200 dark:border-zinc-800 ${isBest ? "bg-emerald-500/10 dark:bg-emerald-950/20" : ""}`}>
                          <div className="flex items-center justify-between">
                            <span className={`font-black ${isBest ? "text-emerald-600 dark:text-emerald-400 text-sm" : "text-zinc-800 dark:text-zinc-200"}`}>
                              {val}
                            </span>
                            {isBest && <span className="text-[9px] font-black bg-emerald-500 text-white px-1.5 py-0.2 rounded">BEST</span>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* ROW: VAR 95% */}
                  <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50 transition">
                    <td className="p-3.5 font-bold text-zinc-700 dark:text-zinc-300 sticky left-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 font-sans">
                      일일 VaR (95% 신뢰도)
                    </td>
                    {displayedStrategies.map((st) => {
                      const val = st.scenarios[scenario].var95;
                      const isBest = val === getBestMetricValue("var95", true);
                      return (
                        <td key={st.id} className={`p-3.5 border-r border-zinc-200 dark:border-zinc-800 ${isBest ? "bg-emerald-500/10 dark:bg-emerald-950/20" : ""}`}>
                          <div className="flex items-center justify-between">
                            <span className={`font-black ${isBest ? "text-emerald-600 dark:text-emerald-400 text-sm" : "text-zinc-800 dark:text-zinc-200"}`}>
                              -{val}%
                            </span>
                            {isBest && <span className="text-[9px] font-black bg-emerald-500 text-white px-1.5 py-0.2 rounded">SAFEST</span>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* ROW: VOLATILITY */}
                  <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50 transition">
                    <td className="p-3.5 font-bold text-zinc-700 dark:text-zinc-300 sticky left-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 font-sans">
                      일일 변동성 (Volatility)
                    </td>
                    {displayedStrategies.map((st) => {
                      const val = st.scenarios[scenario].volatility;
                      const isBest = val === getBestMetricValue("volatility", true);
                      return (
                        <td key={st.id} className={`p-3.5 border-r border-zinc-200 dark:border-zinc-800 ${isBest ? "bg-emerald-500/10 dark:bg-emerald-950/20" : ""}`}>
                          <div className="flex items-center justify-between">
                            <span className={`font-bold ${isBest ? "text-emerald-600 dark:text-emerald-400 font-black" : "text-zinc-800 dark:text-zinc-200"}`}>
                              {val}%
                            </span>
                            {isBest && <span className="text-[9px] font-black bg-emerald-500 text-white px-1.5 py-0.2 rounded">LOWEST</span>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* CATEGORY 3: TRADING CHARACTERISTICS */}
                  <tr className="bg-amber-50/50 dark:bg-amber-950/30">
                    <td colSpan={displayedStrategies.length + 1} className="px-4 py-2 font-bold text-amber-600 dark:text-amber-400 font-sans">
                      ⚙️ 3. 매매 특성 &amp; 적합 국면 (Trading Characteristics &amp; Regimes)
                    </td>
                  </tr>

                  {/* ROW: BEST REGIME */}
                  <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50 transition">
                    <td className="p-3.5 font-bold text-zinc-700 dark:text-zinc-300 sticky left-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 font-sans">
                      최적 추천 시장 국면
                    </td>
                    {displayedStrategies.map((st) => (
                      <td key={st.id} className="p-3.5 border-r border-zinc-200 dark:border-zinc-800 font-sans text-[11px] font-bold text-indigo-600 dark:text-indigo-300">
                        {st.bestRegime}
                      </td>
                    ))}
                  </tr>

                  {/* ROW: AVG HOLDING TIME */}
                  <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50 transition">
                    <td className="p-3.5 font-bold text-zinc-700 dark:text-zinc-300 sticky left-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 font-sans">
                      평균 포지션 보유시간
                    </td>
                    {displayedStrategies.map((st) => (
                      <td key={st.id} className="p-3.5 border-r border-zinc-200 dark:border-zinc-800 font-sans text-xs">
                        {st.avgHoldingTime}
                      </td>
                    ))}
                  </tr>

                  {/* ROW: TRADES PER MONTH */}
                  <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50 transition">
                    <td className="p-3.5 font-bold text-zinc-700 dark:text-zinc-300 sticky left-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 font-sans">
                      월평균 체결 횟수
                    </td>
                    {displayedStrategies.map((st) => (
                      <td key={st.id} className="p-3.5 border-r border-zinc-200 dark:border-zinc-800 font-bold">
                        월 {st.scenarios[scenario].tradesPerMonth}회
                      </td>
                    ))}
                  </tr>

                  {/* ROW: STOP LOSS FREQ */}
                  <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50 transition">
                    <td className="p-3.5 font-bold text-zinc-700 dark:text-zinc-300 sticky left-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 font-sans">
                      스탑로스 작동 빈도
                    </td>
                    {displayedStrategies.map((st) => (
                      <td key={st.id} className="p-3.5 border-r border-zinc-200 dark:border-zinc-800 font-sans text-xs text-zinc-600 dark:text-zinc-400">
                        {st.stopLossFreq}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          VIEW TAB 2: HEAD-TO-HEAD DUEL MODE
          ========================================== */}
      {viewMode === "HEAD_TO_HEAD" && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-slate-950 via-zinc-950 to-indigo-950 border border-amber-500/40 p-6 rounded-2xl shadow-xl text-white space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-amber-500/20 pb-4">
              <div className="flex items-center space-x-3">
                <span className="p-2.5 bg-amber-500/20 border border-amber-400/40 rounded-xl text-amber-300">
                  <ArrowRightLeft className="h-6 w-6 text-amber-400" />
                </span>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    1대1 AI 전략 듀얼 대결 (Head-to-Head Duel Comparison)
                  </h3>
                  <p className="text-xs text-amber-200/80 mt-0.5">
                    두 개의 전략을 직접 선택하여 수익률, 승률, MDD, 샤프지수 차이를 1:1로 초정밀 비교합니다.
                  </p>
                </div>
              </div>

              {/* STRATEGY SELECTORS */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-indigo-300">전략 A:</span>
                  <select
                    value={headToHeadA}
                    onChange={(e) => setHeadToHeadA(e.target.value)}
                    className="bg-slate-900 border border-indigo-500/50 rounded-xl px-3 py-1.5 text-xs text-white font-bold cursor-pointer"
                  >
                    {ALL_STRATEGIES.map((s) => (
                      <option key={s.id} value={s.id} disabled={s.id === headToHeadB}>
                        {s.icon} {s.shortName} (+{s.scenarios[scenario].totalReturn}%)
                      </option>
                    ))}
                  </select>
                </div>

                <span className="text-amber-400 font-extrabold text-sm font-mono">VS</span>

                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-cyan-300">전략 B:</span>
                  <select
                    value={headToHeadB}
                    onChange={(e) => setHeadToHeadB(e.target.value)}
                    className="bg-slate-900 border border-cyan-500/50 rounded-xl px-3 py-1.5 text-xs text-white font-bold cursor-pointer"
                  >
                    {ALL_STRATEGIES.map((s) => (
                      <option key={s.id} value={s.id} disabled={s.id === headToHeadA}>
                        {s.icon} {s.shortName} (+{s.scenarios[scenario].totalReturn}%)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* SPLIT COMPARISON CARDS WITH CENTRAL DELTA DIFFERENCES */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* STRATEGY A CARD */}
              <div className="bg-indigo-950/40 border border-indigo-500/50 p-5 rounded-2xl space-y-4 shadow-lg">
                <div className="flex items-center justify-between border-b border-indigo-500/30 pb-3">
                  <span className="text-2xl">{stratA.icon}</span>
                  <span className="text-xs font-black font-mono bg-indigo-500/30 text-indigo-300 border border-indigo-400/50 px-2 py-0.5 rounded">
                    전략 A
                  </span>
                </div>

                <h4 className="text-lg font-black text-white">{stratA.name}</h4>
                <p className="text-xs text-indigo-200/80">{stratA.type}</p>

                <div className="space-y-2 font-mono text-xs pt-2">
                  <div className="flex justify-between items-center bg-indigo-900/40 p-2 rounded-lg">
                    <span className="text-zinc-400">누적 수익률</span>
                    <span className="text-lg font-black text-emerald-400">+{stratAData.totalReturn}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">승률</span>
                    <span className="font-bold text-white">{stratAData.winRate}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Sharpe Ratio</span>
                    <span className="font-bold text-indigo-300">{stratAData.sharpe}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">MDD (최대낙폭)</span>
                    <span className="font-bold text-rose-400">{stratAData.mdd}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Profit Factor</span>
                    <span className="font-bold text-white">{stratAData.profitFactor}</span>
                  </div>
                </div>
              </div>

              {/* CENTRAL DIFFERENCE DELTA BOX */}
              <div className="bg-slate-900/90 border border-amber-500/40 p-5 rounded-2xl text-center space-y-4 shadow-xl">
                <span className="text-xs font-black text-amber-400 font-mono flex items-center justify-center gap-1">
                  <Zap className="h-4 w-4" /> 1대1 비교 디퍼런셜 (Delta)
                </span>

                <div className="space-y-3 font-mono text-xs">
                  <div className="p-2.5 bg-slate-950 rounded-xl border border-zinc-800">
                    <span className="text-[11px] text-zinc-400 block mb-1">수익률 격차 (Return Diff)</span>
                    <div className={`text-xl font-black ${
                      stratAData.totalReturn >= stratBData.totalReturn ? "text-indigo-400" : "text-cyan-400"
                    }`}>
                      {stratAData.totalReturn >= stratBData.totalReturn ? (
                        <>전략 A가 <span className="text-emerald-400">+{ (stratAData.totalReturn - stratBData.totalReturn).toFixed(1) }%p</span> 우세</>
                      ) : (
                        <>전략 B가 <span className="text-emerald-400">+{ (stratBData.totalReturn - stratAData.totalReturn).toFixed(1) }%p</span> 우세</>
                      )}
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-950 rounded-xl border border-zinc-800">
                    <span className="text-[11px] text-zinc-400 block mb-1">승률 격차 (Win Rate Diff)</span>
                    <div className="text-base font-black text-amber-300">
                      {Math.abs(stratAData.winRate - stratBData.winRate).toFixed(1)}%p 차이
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-950 rounded-xl border border-zinc-800">
                    <span className="text-[11px] text-zinc-400 block mb-1">샤프 지수 (Sharpe Diff)</span>
                    <div className="text-base font-black text-emerald-400">
                      Δ {Math.abs(stratAData.sharpe - stratBData.sharpe).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* STRATEGY B CARD */}
              <div className="bg-cyan-950/40 border border-cyan-500/50 p-5 rounded-2xl space-y-4 shadow-lg">
                <div className="flex items-center justify-between border-b border-cyan-500/30 pb-3">
                  <span className="text-2xl">{stratB.icon}</span>
                  <span className="text-xs font-black font-mono bg-cyan-500/30 text-cyan-300 border border-cyan-400/50 px-2 py-0.5 rounded">
                    전략 B
                  </span>
                </div>

                <h4 className="text-lg font-black text-white">{stratB.name}</h4>
                <p className="text-xs text-cyan-200/80">{stratB.type}</p>

                <div className="space-y-2 font-mono text-xs pt-2">
                  <div className="flex justify-between items-center bg-cyan-900/40 p-2 rounded-lg">
                    <span className="text-zinc-400">누적 수익률</span>
                    <span className="text-lg font-black text-emerald-400">+{stratBData.totalReturn}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">승률</span>
                    <span className="font-bold text-white">{stratBData.winRate}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Sharpe Ratio</span>
                    <span className="font-bold text-cyan-300">{stratBData.sharpe}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">MDD (최대낙폭)</span>
                    <span className="font-bold text-rose-400">{stratBData.mdd}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Profit Factor</span>
                    <span className="font-bold text-white">{stratBData.profitFactor}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RADAR CHART COMPARISON */}
            <div className="bg-slate-950/80 border border-zinc-800 p-5 rounded-2xl space-y-3">
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <Brain className="h-4 w-4 text-indigo-400" />
                두 전략간 5축 레이더 다각도 역량 비교
              </h4>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={headToHeadRadarData}>
                    <PolarGrid stroke="#334155" opacity={0.3} />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                    <Radar name={`전략 A: ${stratA.shortName}`} dataKey="A" stroke="#818cf8" fill="#818cf8" fillOpacity={0.35} />
                    <Radar name={`전략 B: ${stratB.shortName}`} dataKey="B" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.35} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', color: '#fff', fontSize: '11px' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          VIEW TAB 3: OVERLAY CHARTS & TRENDS
          ========================================== */}
      {viewMode === "CHARTS" && (
        <div className="space-y-6">
          {/* CUMULATIVE PERFORMANCE OVERLAY CHART */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="p-1.5 bg-cyan-500/10 rounded-lg text-cyan-500">
                    <Sliders className="h-4 w-4" />
                  </span>
                  <h3 className="text-sm font-black text-zinc-900 dark:text-white flex items-center gap-2">
                    AI 모델 멀티 오버레이 누적 수익률 비교 차트
                  </h3>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  선택된 AI 전략들의 누적 시세 추이를 동일 차트 상에 시각화하여 오버레이 성과를 분석합니다.
                </p>
              </div>
            </div>

            {/* RECHARTS AREA / LINE CHART CONTAINER */}
            <div className="h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={CUMULATIVE_PERFORMANCE_DATA} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMeta" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorHft" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#64748b" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#64748b" unit="%" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderColor: '#334155', 
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px'
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

                  {selectedStrategyIds.includes("metaEnsemble") && (
                    <Area type="monotone" dataKey="metaEnsemble" name="🧠 메타 앙상블 AI" stroke="#818cf8" strokeWidth={3} fillOpacity={1} fill="url(#colorMeta)" />
                  )}
                  {selectedStrategyIds.includes("hftScalper") && (
                    <Area type="monotone" dataKey="hftScalper" name="⚡ HFT 초단타 스캘퍼" stroke="#06b6d4" strokeWidth={2.5} fillOpacity={1} fill="url(#colorHft)" />
                  )}
                  {selectedStrategyIds.includes("alphaMomentum") && (
                    <Line type="monotone" dataKey="alphaMomentum" name="🚀 알파 모멘텀 AI" stroke="#a855f7" strokeWidth={2} dot={false} />
                  )}
                  {selectedStrategyIds.includes("pullbackFlow") && (
                    <Line type="monotone" dataKey="pullbackFlow" name="🎯 수급 세력 눌림목" stroke="#10b981" strokeWidth={2} dot={false} />
                  )}
                  {selectedStrategyIds.includes("volBreakout") && (
                    <Line type="monotone" dataKey="volBreakout" name="🛡️ 변동성 돌파 AI" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  )}
                  {selectedStrategyIds.includes("meanReversion") && (
                    <Line type="monotone" dataKey="meanReversion" name="⚖️ 평균 회귀 퀀트" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  )}
                  <Line type="monotone" dataKey="benchmark" name="📉 KOSPI 벤치마크" stroke="#64748b" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* TWO COLUMN SECTION: BAR CHART + PIE CHART */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* MONTHLY ALPHA RETURNS BAR CHART */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <h3 className="text-sm font-black text-zinc-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-emerald-500" />
                  월별 AI 초과 수익률 (Monthly Alpha Return %)
                </h3>
                <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  12개월 연속 플러스 기록
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={MONTHLY_RETURNS_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#64748b" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#64748b" unit="%" />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', color: '#fff', fontSize: '11px' }} />
                    <Bar dataKey="returnPct" name="월 수익률 (%)" radius={[6, 6, 0, 0]}>
                      {MONTHLY_RETURNS_DATA.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.returnPct >= 0 ? "#10b981" : "#f43f5e"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* PORTFOLIO SECTOR ALLOCATION PIE CHART */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <h3 className="text-sm font-black text-zinc-900 dark:text-white flex items-center gap-2">
                  <PieIcon className="h-4 w-4 text-cyan-500" />
                  AI 포트폴리오 섹터별 자산 배분 비중
                </h3>
                <span className="text-[10px] font-mono text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                  실시간 동적 리밸런싱
                </span>
              </div>

              <div className="h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={SECTOR_ALLOCATION_DATA}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {SECTOR_ALLOCATION_DATA.map((entry, index) => (
                        <Cell key={`pie-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', color: '#fff', fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* DAILY AUTO-TRADING PERFORMANCE */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-500">
                    <Activity className="h-4 w-4" />
                  </span>
                  <h3 className="text-sm font-black text-zinc-900 dark:text-white flex items-center gap-2">
                    일자별 자동매매 실시간 체결 성과 트렌드
                  </h3>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  최근 14일간 일별 자동매매 실시간 체결 성과, 일일 수익률(%), 실현 손익(KRW) 및 매매 승률을 추적합니다.
                </p>
              </div>

              <div className="flex items-center space-x-2 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl text-xs font-mono">
                <button
                  onClick={() => setDailyMetric("RETURN")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    dailyMetric === "RETURN"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  수익률 (%)
                </button>
                <button
                  onClick={() => setDailyMetric("PNL")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    dailyMetric === "PNL"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  손익금액 (원)
                </button>
                <button
                  onClick={() => setDailyMetric("WINRATE")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    dailyMetric === "WINRATE"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  일별 승률 (%)
                </button>
              </div>
            </div>

            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={DAILY_STRATEGY_PERFORMANCE_DATA} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#64748b" />
                  <YAxis 
                    tick={{ fontSize: 11 }} 
                    stroke="#64748b" 
                    unit={dailyMetric === "PNL" ? "원" : "%"}
                    tickFormatter={(val) => dailyMetric === "PNL" ? `${(val / 10000).toFixed(0)}만` : `${val}`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    formatter={(value: any) => {
                      if (dailyMetric === "PNL") return [`${Number(value).toLocaleString()} 원`, "일일 실현손익"];
                      if (dailyMetric === "WINRATE") return [`${value}%`, "일별 승률"];
                      return [`${value}%`, "일일 수익률"];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

                  {dailyMetric === "RETURN" && (
                    <Bar dataKey="returnPct" name="일일 수익률 (%)" radius={[6, 6, 0, 0]}>
                      {DAILY_STRATEGY_PERFORMANCE_DATA.map((entry, index) => (
                        <Cell key={`daily-cell-${index}`} fill={entry.returnPct >= 0 ? "#10b981" : "#f43f5e"} />
                      ))}
                    </Bar>
                  )}

                  {dailyMetric === "PNL" && (
                    <Bar dataKey="pnlKrw" name="일일 실현손익 (KRW)" radius={[6, 6, 0, 0]}>
                      {DAILY_STRATEGY_PERFORMANCE_DATA.map((entry, index) => (
                        <Cell key={`pnl-cell-${index}`} fill={entry.pnlKrw >= 0 ? "#06b6d4" : "#f43f5e"} />
                      ))}
                    </Bar>
                  )}

                  {dailyMetric === "WINRATE" && (
                    <Line type="monotone" dataKey="winRate" name="일별 매매 승률 (%)" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: "#f59e0b" }} />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          VIEW TAB 4: RISK VAR & AI DIAGNOSTICS
          ========================================== */}
      {viewMode === "DIAGNOSTICS" && (
        <div className="space-y-6">
          {/* VALUE AT RISK (VaR) & CVaR PORTFOLIO RISK PANEL */}
          <PortfolioVaRPanel />

          {/* AI CALIBRATION & OVERCONFIDENCE GAP VISUALIZER */}
          <div className="bg-gradient-to-br from-slate-950 via-zinc-950 to-indigo-950 border border-indigo-500/40 p-6 rounded-2xl shadow-xl text-white space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-500/20 pb-4">
              <div className="flex items-center space-x-3">
                <span className="p-2.5 bg-indigo-500/20 border border-indigo-400/40 rounded-xl text-indigo-300">
                  <ShieldAlert className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                    AI 예측 보정(Calibration) &amp; 모델 과대확률(Overconfidence Gap) 시각화
                  </h3>
                  <p className="text-xs text-indigo-200/80 mt-0.5">
                    Isotonic Regression &amp; Platt Scaling 보정 알고리즘을 적용하여 트리/시계열 모델의 과대평가 확률을 제거합니다.
                  </p>
                </div>
              </div>
            </div>

            {/* CALIBRATION CURVE CHART */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
              <div className="lg:col-span-2 h-72 w-full bg-slate-900/60 border border-indigo-500/20 rounded-xl p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={CALIBRATION_CURVE_DATA} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} unit="%" domain={[40, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#6366f1', borderRadius: '12px', color: '#fff', fontSize: '11px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="rawProb" name="⚠️ 보정 전 원본 과대확률 (%)" fill="#f43f5e" opacity={0.4} radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="calibratedProb" name="🎯 보정 후 실제 확률 (%)" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: "#6366f1" }} />
                    <Line type="monotone" dataKey="actualHitRate" name="📈 실제 시장 체결 적중률 (%)" stroke="#10b981" strokeWidth={2.5} strokeDasharray="4 4" dot={{ r: 4, fill: "#10b981" }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="bg-slate-900/80 border border-indigo-500/30 p-3.5 rounded-xl space-y-1">
                  <span className="text-[11px] text-slate-400 font-sans font-bold block">Expected Calibration Error (ECE)</span>
                  <div className="text-xl font-black text-emerald-400">0.82%</div>
                  <p className="text-[10px] text-slate-400 font-sans">예측 확률과 실제 적중률 간 오차 극소화 달성</p>
                </div>

                <div className="bg-slate-900/80 border border-indigo-500/30 p-3.5 rounded-xl space-y-1">
                  <span className="text-[11px] text-slate-400 font-sans font-bold block">False Positive 차단률</span>
                  <div className="text-xl font-black text-cyan-300">88.4%</div>
                  <p className="text-[10px] text-slate-400 font-sans">고확률 착시 구간 사전 걸러냄으로 손실 방지</p>
                </div>
              </div>
            </div>
          </div>

          {/* AI FAILURE ANALYSIS & SELF DIAGNOSTICS */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div className="flex items-center space-x-3">
                <span className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-zinc-900 dark:text-white flex items-center gap-2">
                    AI 자기평가 &amp; 실패 원인 심층 분석 (Failure Analysis)
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    AI가 과거 손실/미체결 건을 복기하고 실패 원인별 피드백 및 대응책을 자동 적용합니다.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
              <div className="h-64 w-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={FAILURE_ANALYSIS_DATA}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="percentage"
                      label={({ name, percent }) => `${(percent * 100).toFixed(1)}%`}
                      labelLine={false}
                    >
                      {FAILURE_ANALYSIS_DATA.map((entry) => (
                        <Cell key={`failure-cell-${entry.id}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#f43f5e', borderRadius: '10px', color: '#fff', fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="lg:col-span-2 space-y-3">
                {FAILURE_ANALYSIS_DATA.map((item) => (
                  <div key={item.id} className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-3.5 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2 font-black">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-zinc-900 dark:text-white">{item.cause}</span>
                        <span className="text-[11px] text-zinc-400 font-mono font-normal">({item.count}건 / {item.percentage}%)</span>
                      </div>
                      <span className="font-mono font-bold text-rose-500 text-xs">
                        평균 손익 영향: {item.pnlImpact}%
                      </span>
                    </div>

                    <p className="text-xs text-zinc-600 dark:text-zinc-300">
                      {item.description}
                    </p>

                    <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 p-2 rounded-lg text-[11px] flex items-center space-x-2 text-cyan-700 dark:text-cyan-300">
                      <span className="font-extrabold text-cyan-600 font-mono whitespace-nowrap">[AI 피드백 대응책]:</span>
                      <span className="truncate">{item.countermeasure}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
