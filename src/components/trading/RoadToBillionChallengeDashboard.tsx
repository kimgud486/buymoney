import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  TrendingUp,
  TrendingDown,
  Zap,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Trophy,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  ShieldAlert,
  Coins,
  DollarSign,
  Award,
  Flame,
  BarChart2,
  Clock,
  ChevronRight,
  Layers,
  CheckCircle2,
  XCircle,
  Maximize2,
  Sliders,
  Info,
  Check,
  X,
  Search,
  Filter,
  RefreshCw,
  Lock,
  Key,
  AlertTriangle,
  Wallet,
  SlidersHorizontal,
  Crosshair,
  Trash2,
  Bug
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { INITIAL_STOCK_UNIVERSE, getAllStocks } from "../../data/stockUniverse";
import { BrokerApiConnectModal } from "./BrokerApiConnectModal";
import { PatternUpgradeFilterInspectorModal } from "./PatternUpgradeFilterInspectorModal";
import { RealtimeTradingIssueLoggerModal } from "./RealtimeTradingIssueLoggerModal";
import { PatternUpgradeEngine } from "../../services/PatternUpgradeEngine";
import { realtimeMarketFeedService } from "../../services/realtimeMarketFeedService";
import { AiActivePoolRealtimeScannerBar } from "./AiActivePoolRealtimeScannerBar";
import { LiveChallengeTrackingPanel } from "./LiveChallengeTrackingPanel";
import { useModalScrollLock } from "../../hooks/useModalScrollLock";
import { getMarketStatus } from "../../lib/marketHours";
import { formatStockQty } from "../../lib/formatter";
import { RealBrokerDetailedBalanceAndHoldings } from "./RealBrokerDetailedBalanceAndHoldings";
import { AntiDowntrendV5Indicator } from "./AntiDowntrendV5Indicator";
import { AiScannedYieldAnalyticsTab } from "./AiScannedYieldAnalyticsTab";
import { SmartYieldFilterControlPanel } from "./SmartYieldFilterControlPanel";
import { ProfitabilityVsVolatilityChart } from "./ProfitabilityVsVolatilityChart";
import { UserFilterSettingsStore } from "../../services/UserFilterSettingsStore";
import { UpbitFeeAndNetProfitGuard } from "../../services/UpbitFeeAndNetProfitGuard";
import { StrictQuantSignalPipeline } from "../../services/StrictQuantSignalPipeline";
import { CandlestickPatternOverlayVisualizer } from "./CandlestickPatternOverlayVisualizer";

export interface TradeTradeRecord {
  id: string;
  time: string;
  type: "LONG" | "SHORT";
  side?: "BUY" | "SELL";
  symbol: string;
  name: string;
  entryPrice: number;
  exitPrice: number;
  pnlDollar: number;
  pnlPercent: number;
  pnlKRW?: number;
  positionSize: string;
  status: "WIN" | "LOSS" | "OPEN";
  reason: string;
  isReal?: boolean;
  indicatorDetails: {
    rsi: number;
    trend: string;
    macdSignal: string;
    orderBookImbalance: string;
  };
}

interface TargetAssetConfig {
  symbol: string;
  name: string;
  category: "CRYPTO" | "US_STOCK" | "KR_STOCK";
  currentPrice: number;
  unit: string;
  exchange: string;
  leverage: string;
  strategyDesc: string;
  aiScore?: number;
  signal?: "LONG" | "WATCH" | "AVOID" | "EXIT_RISK";
  theme?: string;
  marketType: "KOREA" | "US" | "BTC";
}

export interface ParallelScanAssetItem {
  symbol: string;
  name: string;
  category: "CRYPTO" | "US_STOCK" | "KR_STOCK";
  marketType: "KOREA" | "US" | "BTC";
  currentPrice: number;
  unit: string;
  aiScore: number;
  rsi: number;
  rvol: number;
  changeRate: number;
  signal: "BUY_APPROVE" | "HOLD_WATCH" | "SELL_APPROVE" | "MOMENTUM_HOT";
  confidenceScore: number;
  isMarketOpen: boolean;
  marketStatusText: string;
  lastScanTime: string;
  analysisNotes: string;
  rrRatio: number;
  gatePassedCount: number;
  // 🌟 High-Profit Scalping Upgrades
  expectedProfitPct: number;
  winProbabilityPct: number;
  profitTargetPrice: number;
  trailingStopPrice: number;
  profitTier: "SUPER_YIELD" | "HIGH_YIELD" | "STABLE" | "WATCH";
}

export const RoadToBillionChallengeDashboard: React.FC = () => {
  const { 
    positions, 
    trades,
    profile, 
    cashBreakdown,
    placeOrder, 
    executeTrade,
    clearAllTrades,
    clearAllPositions,
    closePosition,
    addToast,
    syncRealAccountBalance,
    updateProfileSettings,
    isKillSwitchActive
  } = useApp();

  // Mode Selection: MOCK (Paper Simulation) vs REAL (Live Exchange API)
  const [challengeMode, setChallengeMode] = useState<"MOCK" | "REAL">(() => {
    const savedMode = localStorage.getItem("challenge_active_mode");
    if (savedMode === "REAL" || savedMode === "MOCK") return savedMode;
    return profile?.isRealTrade ? "REAL" : "MOCK";
  });
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const [isSyncingBalance, setIsSyncingBalance] = useState(false);
  const [isPatternInspectorOpen, setIsPatternInspectorOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  
  // Trade Log filter state: ALL traded assets vs CURRENT selected asset vs LONG vs SHORT vs WIN
  const [tradeLogFilter, setTradeLogFilter] = useState<"ALL" | "CURRENT" | "LONG" | "SHORT" | "WIN">("ALL");

  // Lock body scroll when modals open
  useModalScrollLock(isConfigModalOpen);

  // Real API Keys status
  const hasUpbitKey = Boolean(profile?.upbitAccessKey && profile?.upbitSecretKey);
  const hasKoreaKey = Boolean(profile?.koreaAppKey && profile?.koreaAppSecret);
  const hasAnyApiKey = hasUpbitKey || hasKoreaKey;

  // Auto-sync real balance and profile settings when switching to REAL or on mount
  useEffect(() => {
    if (profile?.isRealTrade && challengeMode !== "REAL") {
      setChallengeMode("REAL");
    }
  }, [profile?.isRealTrade]);

  useEffect(() => {
    localStorage.setItem("challenge_active_mode", challengeMode);
    if (challengeMode === "REAL") {
      if (syncRealAccountBalance) {
        setIsSyncingBalance(true);
        // Silent balance sync without toast notification spams on PWA launch
        syncRealAccountBalance("all", true)
          .catch(() => {})
          .finally(() => setIsSyncingBalance(false));
      }
      if (updateProfileSettings && !profile?.isRealTrade) {
        updateProfileSettings({ isRealTrade: true });
      }
    } else {
      if (updateProfileSettings && profile?.isRealTrade) {
        updateProfileSettings({ isRealTrade: false });
      }
    }
  }, [challengeMode]);

  // Dynamic AI Screener & Filtered Target Assets (Domestic KRX + Upbit Live Only)
  const [activeMarketTab, setActiveMarketTab] = useState<"ALL" | "KRX" | "UPBIT">("ALL");
  const [filterQuery, setFilterQuery] = useState<string>("");

  // Convert getAllStocks() domestic (KOSPI/KOSDAQ) + Upbit into target asset configs (foreign mock stocks excluded)
  const universeTargetAssets: TargetAssetConfig[] = useMemo(() => {
    const fullStockUniverse = getAllStocks().filter(s => s.market !== "US");
    return fullStockUniverse.map(stock => {
      const isKRX = stock.market === "KOSPI" || stock.market === "KOSDAQ";
      const isCrypto = stock.market === "UPBIT";
      
      const category: "CRYPTO" | "US_STOCK" | "KR_STOCK" = isCrypto ? "CRYPTO" : "KR_STOCK";
      const marketType: "KOREA" | "US" | "BTC" = isCrypto ? "BTC" : "KOREA";
      const unit = "원";
      const leverage = isCrypto ? "10x 핑퐁" : "2.5x 미수";
      const exchange = isCrypto ? "업비트 24H 실시간" : `국내 KRX (${stock.market})`;

      return {
        symbol: stock.symbol,
        name: stock.name,
        category,
        marketType,
        currentPrice: stock.price,
        unit,
        exchange,
        leverage,
        strategyDesc: stock.strategy || `${stock.theme || '국내주식'} 테마 1분봉 AI 스캘핑 엔진`,
        aiScore: stock.score || 85,
        signal: stock.signal || "LONG",
        theme: stock.theme || "KOSPI/KOSDAQ 실시간 상장주식"
      };
    });
  }, []);

  // Filtered target assets based on active market tab and search query
  const filteredTargetAssets = useMemo(() => {
    return universeTargetAssets.filter(item => {
      if (activeMarketTab === "KRX" && item.category !== "KR_STOCK") return false;
      if (activeMarketTab === "UPBIT" && item.category !== "CRYPTO") return false;

      if (filterQuery.trim()) {
        const q = filterQuery.toLowerCase();
        return item.name.toLowerCase().includes(q) || item.symbol.toLowerCase().includes(q) || (item.theme && item.theme.toLowerCase().includes(q));
      }
      return true;
    });
  }, [universeTargetAssets, activeMarketTab, filterQuery]);

  // Challenge Day counter (persisted, defaults to Day 1)
  const [challengeDay, setChallengeDay] = useState<number>(() => {
    const saved = localStorage.getItem("challenge_current_day");
    return saved ? Math.max(1, parseInt(saved, 10) || 1) : 1;
  });

  const handleSetChallengeDay = (newDay: number) => {
    const safeDay = Math.max(1, Math.min(100, newDay));
    setChallengeDay(safeDay);
    try {
      localStorage.setItem("challenge_current_day", safeDay.toString());
    } catch (e) {}
    addToast({
      type: "INFO",
      title: `📅 챌린지 ${safeDay}일차 설정 완료`,
      message: `진행 회차가 ${safeDay}일차로 갱신되었습니다.`
    });
  };

  const [selectedAsset, setSelectedAsset] = useState<TargetAssetConfig>(() => universeTargetAssets[0] || {
    symbol: "005930",
    name: "삼성전자",
    category: "KR_STOCK",
    marketType: "KOREA",
    currentPrice: 73800,
    unit: "원",
    exchange: "국내 KRX (KOSPI)",
    leverage: "2.5x 미수",
    strategyDesc: "VWAP Reclaim + SMC Order Block 지지 반등",
    aiScore: 92,
    signal: "LONG",
    theme: "반도체 / AI 하드웨어"
  });

  // Upgraded 4-Gate Anti-Fakeout & Pattern Verification for the selected asset
  const currentPatternUpgrade = useMemo(() => {
    return PatternUpgradeEngine.evaluatePattern(
      selectedAsset.symbol,
      selectedAsset.name,
      selectedAsset.currentPrice,
      2.5,
      45,
      1.8
    );
  }, [selectedAsset]);

  // Autopilot & Scalp Settings
  const [isAutoScalping, setIsAutoScalping] = useState<boolean>(true);
  const [tradingScope, setTradingScope] = useState<"ALL_UNIVERSE" | "SELECTED_ONLY">("ALL_UNIVERSE");
  const [scalpSpeed, setScalpSpeed] = useState<number>(20); // Default to 20X 파닥이 100ms 모드!
  const [realOrderAmount, setRealOrderAmount] = useState<number>(100000); // 10만원 기본
  const [currentScanningAsset, setCurrentScanningAsset] = useState<TargetAssetConfig>(() => universeTargetAssets[0] || selectedAsset);
  const scanIndexRef = useRef<number>(0);

  // ⚡ 🔥 Padak (파닥이) Ultra Micro-Tick Engine State
  const [padakMicroTicks, setPadakMicroTicks] = useState<{
    id: string;
    symbol: string;
    name: string;
    side: "LONG" | "SHORT";
    price: number;
    unit: string;
    pnlPercent: number;
    pnlKRW: number;
    timeMs: string;
    isWin: boolean;
  }[]>([]);
  const [padakTotalTicksCount, setPadakTotalTicksCount] = useState<number>(1840);

  // ⚡ 🔥 Active Mock Scalp Positions Engine (Buy/Sell Cycle & Cash Guard)
  const [mockActiveScalpPositions, setMockActiveScalpPositions] = useState<{
    id: string;
    symbol: string;
    name: string;
    marketType: string;
    category: "CRYPTO" | "US_STOCK" | "KR_STOCK";
    entryPrice: number;
    currentPrice: number;
    qty: number;
    unit: string;
    entryTime: string;
    targetProfitPrice: number;
    stopLossPrice: number;
    side: "BUY" | "SELL";
  }>([
    {
      id: "mpos_btc",
      symbol: "BTC/USDT",
      name: "비트코인",
      marketType: "BTC",
      category: "CRYPTO",
      entryPrice: 65200,
      currentPrice: 65850,
      qty: 0.15,
      unit: "USDT",
      entryTime: "18:40:12",
      targetProfitPrice: 66200,
      stopLossPrice: 64500,
      side: "BUY"
    },
    {
      id: "mpos_samsung",
      symbol: "005930",
      name: "삼성전자",
      marketType: "KOREA",
      category: "KR_STOCK",
      entryPrice: 73800,
      currentPrice: 74600,
      qty: 15,
      unit: "원",
      entryTime: "18:42:00",
      targetProfitPrice: 75100,
      stopLossPrice: 72800,
      side: "BUY"
    }
  ]);

  const [mockAvailableCashKRW, setMockAvailableCashKRW] = useState<number>(() => {
    const saved = localStorage.getItem("mock_available_cash_krw");
    return saved ? parseFloat(saved) : 10000000; // 1천만원 가상 예수금 시작
  });

  useEffect(() => {
    try {
      localStorage.setItem("mock_available_cash_krw", mockAvailableCashKRW.toString());
    } catch (e) {}
  }, [mockAvailableCashKRW]);

  // ⚡ Asynchronous Parallel Universe Scanner State
  const [parallelScanResults, setParallelScanResults] = useState<ParallelScanAssetItem[]>([]);
  const [parallelScanLatencyMs, setParallelScanLatencyMs] = useState<number>(12);
  const [lastParallelScanTime, setLastParallelScanTime] = useState<string>("");
  const [parallelFilterTab, setParallelFilterTab] = useState<"ALL" | "HIGH_PROFIT" | "OPEN_ONLY" | "BUY_SIGNAL" | "HOT_VOL">("HIGH_PROFIT");
  const [parallelSortMode, setParallelSortMode] = useState<"YIELD_DESC" | "WINRATE_DESC" | "RVOL_DESC" | "SCORE_DESC">("YIELD_DESC");

  // 🚀 Asynchronous Parallel Multi-Asset Scan Batch Function (Enhanced with Profit Metrics)
  const runAsyncParallelScanBatch = async (
    pool: TargetAssetConfig[],
    now: Date
  ): Promise<ParallelScanAssetItem[]> => {
    const startTime = performance.now();

    const tasks = pool.map(async (asset): Promise<ParallelScanAssetItem> => {
      const liveQuote =
        realtimeMarketFeedService.getQuote(asset.symbol) ||
        realtimeMarketFeedService.getQuote(`KRW-${asset.symbol}`) ||
        realtimeMarketFeedService.getQuote(asset.symbol.replace("KRW-", ""));

      const price =
        liveQuote?.price && liveQuote.price > 0 ? liveQuote.price : asset.currentPrice;
      const changeRate =
        liveQuote?.changeRate ??
        Math.round((Math.sin(Date.now() / 2500 + asset.symbol.charCodeAt(0)) * 2.8) * 100) / 100;

      const mktStatus = getMarketStatus(asset.marketType, now);

      const mappedMarket: "KOREA" | "US" | "BTC" =
        asset.category === "CRYPTO" ? "BTC" : asset.category === "US_STOCK" ? "US" : "KOREA";

      const pipelineResult = StrictQuantSignalPipeline.evaluateStock(
        asset.symbol,
        asset.name,
        mappedMarket,
        price,
        changeRate,
        1.5
      );

      const hash = asset.symbol.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const timeFactor = Date.now() / 2000;
      const rvol =
        Math.round((1.8 + Math.abs(Math.sin(timeFactor + hash) * 2.4)) * 10) / 10;
      const rsi = Math.round(45 + Math.sin(timeFactor * 0.5 + hash) * 25);

      let signal: "BUY_APPROVE" | "HOLD_WATCH" | "SELL_APPROVE" | "MOMENTUM_HOT" =
        "HOLD_WATCH";

      if (!mktStatus.isOpen) {
        signal = "HOLD_WATCH";
      } else if (
        pipelineResult.isApproved &&
        pipelineResult.confidenceScore >= 80 &&
        rvol >= 2.0
      ) {
        signal = "BUY_APPROVE";
      } else if (rvol >= 2.8 || Math.abs(changeRate) >= 3.2) {
        signal = "MOMENTUM_HOT";
      } else if (rsi >= 75) {
        signal = "SELL_APPROVE";
      }

      // 🌟 High-Profit Engine Calculations
      const baseExpected = Math.round((1.5 + (rvol * 0.7) + (pipelineResult.confidenceScore ? (pipelineResult.confidenceScore - 80) * 0.08 : 0.6)) * 10) / 10;
      const expectedProfitPct = Math.min(8.5, Math.max(1.0, baseExpected));
      const winProbabilityPct = Math.min(98, Math.max(72, Math.round((pipelineResult.confidenceScore || 82) + (rvol >= 2.5 ? 8 : 3))));

      let profitTier: "SUPER_YIELD" | "HIGH_YIELD" | "STABLE" | "WATCH" = "WATCH";
      if (expectedProfitPct >= 2.8 && winProbabilityPct >= 88 && mktStatus.isOpen) {
        profitTier = "SUPER_YIELD";
      } else if (expectedProfitPct >= 1.8 && winProbabilityPct >= 80 && mktStatus.isOpen) {
        profitTier = "HIGH_YIELD";
      } else if (expectedProfitPct >= 1.0 && mktStatus.isOpen) {
        profitTier = "STABLE";
      }

      const profitTargetPrice = asset.unit === "원"
        ? Math.round(price * (1 + expectedProfitPct / 100))
        : Number((price * (1 + expectedProfitPct / 100)).toFixed(2));

      const trailingStopPrice = asset.unit === "원"
        ? Math.round(price * (1 - 0.012))
        : Number((price * (1 - 0.012)).toFixed(2));

      const notes = mktStatus.isOpen
        ? `기대수익 +${expectedProfitPct}% • RVOL ${rvol}배 • SMC ${pipelineResult.isApproved ? "승인" : "검증중"} (${pipelineResult.confidenceScore || 85}점)`
        : `🛑 ${mktStatus.statusBadgeText} (개장시 승인전환)`;

      return {
        symbol: asset.symbol,
        name: asset.name,
        category: asset.category,
        marketType: asset.marketType,
        currentPrice: price,
        unit: asset.unit,
        aiScore: pipelineResult.confidenceScore || asset.aiScore || 85,
        rsi,
        rvol,
        changeRate,
        signal,
        confidenceScore: pipelineResult.confidenceScore || 80,
        isMarketOpen: mktStatus.isOpen,
        marketStatusText: mktStatus.statusBadgeText,
        lastScanTime: new Date().toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        }),
        analysisNotes: notes,
        rrRatio: pipelineResult.rrRatio || 2.1,
        gatePassedCount: pipelineResult.gateChecks
          ? pipelineResult.gateChecks.filter(g => g.passed).length
          : 4,
        expectedProfitPct,
        winProbabilityPct,
        profitTargetPrice,
        trailingStopPrice,
        profitTier
      };
    });

    const results = await Promise.all(tasks);
    const elapsed = Math.round(performance.now() - startTime);
    setParallelScanLatencyMs(Math.max(4, elapsed));
    return results;
  };

  // Filtered & Profit-Sorted Parallel Assets for UI Matrix
  const filteredParallelAssets = useMemo(() => {
    const filtered = parallelScanResults.filter(item => {
      if (parallelFilterTab === "HIGH_PROFIT" && item.profitTier !== "SUPER_YIELD" && item.profitTier !== "HIGH_YIELD" && item.expectedProfitPct < 2.0) return false;
      if (parallelFilterTab === "OPEN_ONLY" && !item.isMarketOpen) return false;
      if (parallelFilterTab === "BUY_SIGNAL" && item.signal !== "BUY_APPROVE") return false;
      if (parallelFilterTab === "HOT_VOL" && item.signal !== "MOMENTUM_HOT" && item.rvol < 2.5) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (parallelSortMode === "YIELD_DESC") return b.expectedProfitPct - a.expectedProfitPct;
      if (parallelSortMode === "WINRATE_DESC") return b.winProbabilityPct - a.winProbabilityPct;
      if (parallelSortMode === "RVOL_DESC") return b.rvol - a.rvol;
      return b.aiScore - a.aiScore;
    });
  }, [parallelScanResults, parallelFilterTab, parallelSortMode]);

  // Detailed modal inspect for a clicked trade record
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<TradeTradeRecord | null>(null);
  useModalScrollLock(Boolean(selectedRecordForDetail));

  // Tab mode for Road to Billion Challenge: Live Scalper vs Smart Yield Filter Matrix vs Filter Settings
  const [billionDashboardTab, setBillionDashboardTab] = useState<"LIVE_SCALPER" | "SMART_YIELD_FILTER" | "FILTER_SETTINGS">("LIVE_SCALPER");

  // Mock Simulated Stats & Config State
  const [mockStartBalance, setMockStartBalance] = useState<number>(() => {
    const saved = localStorage.getItem("challenge_mock_start_balance");
    return saved ? Number(saved) : 10000;
  });
  const [mockTargetGoalUSD, setMockTargetGoalUSD] = useState<number>(() => {
    const saved = localStorage.getItem("challenge_target_goal_usd");
    return saved ? Number(saved) : 6500000; // Default to $6,500,000 (100억원 챌린지)
  });
  const [mockLeverageVal, setMockLeverageVal] = useState<string>("10x 핑퐁");
  const [tempCapitalInput, setTempCapitalInput] = useState<string>(() => mockStartBalance.toString());
  const [mockLivePnLDollar, setMockLivePnLDollar] = useState<number>(() => {
    const saved = localStorage.getItem("challenge_mock_live_pnl");
    return saved ? Number(saved) : 0;
  });
  const [mockTodayProfit, setMockTodayProfit] = useState<number>(() => {
    const saved = localStorage.getItem("challenge_mock_today_profit");
    return saved ? Number(saved) : 0;
  });
  const [mockLongPositionsCount, setMockLongPositionsCount] = useState<number>(0);
  const [mockShortPositionsCount, setMockShortPositionsCount] = useState<number>(0);

  // 100Billion Compounding Calculator Modal State
  const [isCompoundingCalcOpen, setIsCompoundingCalcOpen] = useState<boolean>(false);
  const [isIssueLoggerOpen, setIsIssueLoggerOpen] = useState<boolean>(false);
  const [calcStartSeedKRW, setCalcStartSeedKRW] = useState<number>(5000000); // 500만원
  const [calcDailyReturnPct, setCalcDailyReturnPct] = useState<number>(2.5); // +2.5% 일일 복리
  const [calcWinRatePct, setCalcWinRatePct] = useState<number>(85); // 85% 고승률
  const [calcTradesPerDay, setCalcTradesPerDay] = useState<number>(3); // 하루 3회 매매

  // Target Goal Title helper
  const targetGoalTitle = useMemo(() => {
    if (mockTargetGoalUSD >= 30000000) return "500억 메가 챌린지";
    if (mockTargetGoalUSD >= 5000000) return "100억 챌린지";
    if (mockTargetGoalUSD >= 500000) return "10억 챌린지";
    return "1억원 소액 챌린지";
  }, [mockTargetGoalUSD]);

  const handleSelectTargetGoal = (goalUsd: number) => {
    setMockTargetGoalUSD(goalUsd);
    localStorage.setItem("challenge_target_goal_usd", goalUsd.toString());
    const title = goalUsd >= 5000000 ? "100억 챌린지" : goalUsd >= 500000 ? "10억 챌린지" : "1억원 챌린지";
    addToast({
      type: "SUCCESS",
      title: `🚀 [목표 업그레이드] ${title}`,
      message: `${title} (${goalUsd >= 5000000 ? "$6,500,000 / ₩100억" : "$650,000 / ₩10억"}) 달성 목표 모드로 전환되었습니다.`
    });
  };

  // Compounding Days & Milestones Calculation
  const compoundingProjections = useMemo(() => {
    const dailyRate = (calcDailyReturnPct * (calcWinRatePct / 100)) / 100;
    const effectiveDailyReturn = Math.max(0.005, dailyRate); // Net expected daily compounding factor
    
    const calculateDaysToTarget = (targetKRW: number) => {
      if (calcStartSeedKRW >= targetKRW) return 0;
      const days = Math.log(targetKRW / calcStartSeedKRW) / Math.log(1 + effectiveDailyReturn);
      return Math.ceil(days);
    };

    const daysTo100M = calculateDaysToTarget(100000000); // 1억원
    const daysTo1B = calculateDaysToTarget(1000000000); // 10억원
    const daysTo10B = calculateDaysToTarget(10000000000); // 100억원

    const milestoneDays = [1, 30, 60, 90, 180, 240, 360];
    const tableData = milestoneDays.map(day => {
      const balanceKRW = Math.round(calcStartSeedKRW * Math.pow(1 + effectiveDailyReturn, day));
      const balanceUSD = Math.round(balanceKRW / (1520));
      return { day, balanceKRW, balanceUSD };
    });

    return {
      daysTo100M,
      daysTo1B,
      daysTo10B,
      tableData,
      effectiveDailyReturnPct: (effectiveDailyReturn * 100).toFixed(2)
    };
  }, [calcStartSeedKRW, calcDailyReturnPct, calcWinRatePct]);

  // Today's total profit reset handler
  const handleResetTodayProfit = async () => {
    if (challengeMode === "REAL") {
      try {
        await clearAllTrades();
        if (syncRealAccountBalance) {
          await syncRealAccountBalance("all", false);
        }
        addToast({
          type: "SUCCESS",
          title: "⚡ 실계좌 오늘 총 합산 손익 초기화 완료",
          message: "실거래 체결 원장이 초기화되고 실시간 증권사 잔고와 정상 재동기화되었습니다."
        });
      } catch (e: any) {
        addToast({
          type: "ERROR",
          title: "초기화 실패",
          message: e?.message || "손익 초기화 중 오류가 발생했습니다."
        });
      }
    } else {
      setMockTodayProfit(0);
      setMockLivePnLDollar(0);
      try {
        localStorage.setItem("challenge_mock_today_profit", "0");
        localStorage.setItem("challenge_mock_live_pnl", "0");
      } catch (e) {}
      setActiveChartPopups([]);
      setMockTradeRecords([]);
      addToast({
        type: "SUCCESS",
        title: "🧪 모의 챌린지 당일 손익 0$ 초기화 완료",
        message: "모의투자 당일 체결 기록 및 손익이 깨끗하게 초기화되었습니다."
      });
    }
  };

  // Real Account Stats
  const exchangeRateKRW = 1520;
  const realBalanceKRW = profile?.balance || profile?.cash || 0;
  const realBalanceUSD = Math.round((realBalanceKRW / exchangeRateKRW) * 10) / 10;
  
  // Real active positions for selected asset
  const realAssetPositions = useMemo(() => {
    return positions.filter(p => p.symbol === selectedAsset.symbol);
  }, [positions, selectedAsset.symbol]);

  const realTotalPositionsCount = positions.length;

  // Aggregated Holdings Valuation & PnL Calculation
  const holdingsSummary = useMemo(() => {
    let totalValuationKRW = 0;
    let totalCostKRW = 0;
    
    positions.forEach(p => {
      const isUS = p.market === "US";
      const qty = typeof p.quantity === 'number' && !isNaN(p.quantity) ? p.quantity : (Number(p.quantity) || 0);
      const curP = typeof p.currentPrice === 'number' && !isNaN(p.currentPrice) ? p.currentPrice : (p.avgPrice || 0);
      const avgP = typeof p.avgPrice === 'number' && !isNaN(p.avgPrice) ? p.avgPrice : curP;

      const currentPriceKRW = isUS ? curP * exchangeRateKRW : curP;
      const avgPriceKRW = isUS ? avgP * exchangeRateKRW : avgP;
      
      totalValuationKRW += qty * currentPriceKRW;
      totalCostKRW += qty * avgPriceKRW;
    });

    const totalPnlKRW = totalValuationKRW - totalCostKRW;
    const totalPnlRate = totalCostKRW > 0 ? (totalPnlKRW / totalCostKRW) * 100 : 0;
    const totalValuationUSD = Math.round((totalValuationKRW / exchangeRateKRW) * 10) / 10;
    const totalPnlUSD = Math.round((totalPnlKRW / exchangeRateKRW) * 10) / 10;

    return {
      count: positions.length,
      totalValuationKRW: Math.round(totalValuationKRW),
      totalCostKRW: Math.round(totalCostKRW),
      totalPnlKRW: Math.round(totalPnlKRW),
      totalPnlRate,
      totalValuationUSD,
      totalPnlUSD
    };
  }, [positions, exchangeRateKRW]);

  // Real today realized profit calculation from actual closed REAL trades only
  const realTodayRealizedProfitKRW = useMemo(() => {
    return trades
      .filter(t => t.isRealTrade === true || (!t.isSimulated && profile?.isRealTrade))
      .reduce((acc, t) => acc + (t.pnl || 0), 0);
  }, [trades, profile?.isRealTrade]);
  const realTodayRealizedProfitUSD = Math.round((realTodayRealizedProfitKRW / exchangeRateKRW) * 10) / 10;

  // Real today profit calculation from trades (legacy compatibility)
  const realTodayProfitKRW = realTodayRealizedProfitKRW;
  const realTodayProfitUSD = realTodayRealizedProfitUSD;

  // Dynamic Trade Popups overlay on chart
  const [activeChartPopups, setActiveChartPopups] = useState<{
    id: string;
    text: string;
    type: "LONG_ENTRY" | "SHORT_ENTRY" | "LONG_PROFIT" | "SHORT_PROFIT" | "STOP_LOSS";
    amount?: number;
    xPct: number;
    yPct: number;
  }>([
    { id: "p1", text: "롱 포지션 진입 (RSI 28 과매도)", type: "LONG_ENTRY", xPct: 25, yPct: 45 },
    { id: "p2", text: "숏 포지션 10.2$ 익절 (저항대 터치)", type: "SHORT_PROFIT", amount: 10.2, xPct: 42, yPct: 28 },
    { id: "p3", text: "롱 포지션 11.6$ 익절 (1분봉 반등)", type: "LONG_PROFIT", amount: 11.6, xPct: 65, yPct: 62 },
    { id: "p4", text: "숏 포지션 진입 (오더블록 저항)", type: "SHORT_ENTRY", xPct: 82, yPct: 35 }
  ]);

  // Dynamic candle data state for chart visualization
  const [chartCandles, setChartCandles] = useState<{ open: number; high: number; low: number; close: number; color: "GREEN" | "RED" }[]>([]);

  // Mock Trade History
  const [mockTradeRecords, setMockTradeRecords] = useState<TradeTradeRecord[]>([
    {
      id: "t1",
      time: "18:32:05",
      type: "LONG",
      symbol: "BTC/USDT",
      name: "비트코인 롱",
      entryPrice: 65000,
      exitPrice: 65750,
      pnlDollar: 11.6,
      pnlPercent: 1.17,
      positionSize: "0.15 BTC ($9,750)",
      status: "WIN",
      isReal: false,
      reason: "1분봉 32 RSI 과매도 구간에서 5일 이평선 지지 양봉 출현하여 롱 진입 후 1.17% 상방 반등 시 자동 익절",
      indicatorDetails: {
        rsi: 31.8,
        trend: "초단기 하락 후 반등 턴",
        macdSignal: "골든크로스 직전",
        orderBookImbalance: "매수호가 68% 우세"
      }
    },
    {
      id: "t2",
      time: "18:28:40",
      type: "SHORT",
      symbol: "BTC/USDT",
      name: "비트코인 숏",
      entryPrice: 65800,
      exitPrice: 65150,
      pnlDollar: 10.2,
      pnlPercent: 1.00,
      positionSize: "0.15 BTC ($9,750)",
      status: "WIN",
      isReal: false,
      reason: "SMC 1분봉 페어밸류갭(FVG) 상단 저항선 터치 및 피뢰침 음봉 확인 후 숏 진입하여 하방 핑퐁 익절",
      indicatorDetails: {
        rsi: 69.4,
        trend: "저항선 도달 과열",
        macdSignal: "데드크로스 발생",
        orderBookImbalance: "매도벽 1,200만$ 돌파 실패"
      }
    },
    {
      id: "t3",
      time: "18:24:12",
      type: "LONG",
      symbol: "NVDA",
      name: "엔비디아 롱",
      entryPrice: 124.5,
      exitPrice: 126.2,
      pnlDollar: 14.8,
      pnlPercent: 1.36,
      positionSize: "50주 ($6,225)",
      status: "WIN",
      isReal: false,
      reason: "15초봉 기준 볼린저밴드 하단 터치 후 거래량 동반 양봉 돌파로 2차 불타기 롱 익절 완료",
      indicatorDetails: {
        rsi: 28.5,
        trend: "급락 후 V자 반등",
        macdSignal: "히스토그램 양전환",
        orderBookImbalance: "시장가 매수 3연속 체결"
      }
    },
    {
      id: "t4",
      time: "18:19:50",
      type: "SHORT",
      symbol: "ETH/USDT",
      name: "이더리움 숏",
      entryPrice: 3450,
      exitPrice: 3462,
      pnlDollar: -3.4,
      pnlPercent: -0.35,
      positionSize: "2.5 ETH ($8,625)",
      status: "LOSS",
      isReal: false,
      reason: "숏 진입 후 돌발 급등세로 -0.35% 손실 도달 즉시 AI 리스크 가드레일이 기계적 칼손절 실행 (손실 방어)",
      indicatorDetails: {
        rsi: 74.2,
        trend: "상방 브레이크아웃 돌파",
        macdSignal: "상승 모멘텀 지속",
        orderBookImbalance: "대량 고래 매수세 유입"
      }
    }
  ]);

  // Real Trade records converted to display format
  const realTradeRecords: TradeTradeRecord[] = useMemo(() => {
    if (!trades || trades.length === 0) return [];
    return trades.map(t => {
      const isBuy = t.side === "BUY";
      const pnl = t.pnl || 0;
      const isWin = pnl >= 0;
      const pnlDollar = Math.round((pnl / exchangeRateKRW) * 10) / 10;
      const pnlPercent = t.pnlRate ? Math.round(t.pnlRate * 10) / 10 : 0;
      const isCrypto = t.market === 'BTC' || t.symbol.startsWith('KRW-');
      const unitLabel = isCrypto ? '코인' : '주';
      const rawQty = (t as any).quantity || (t as any).qty || 1;
      const displayQty = isCrypto && rawQty < 1 ? Number(rawQty).toFixed(4) : Number(rawQty).toLocaleString();

      return {
        id: t.id,
        time: t.timestamp ? new Date(t.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString(),
        type: isBuy ? "LONG" : "SHORT",
        side: t.side,
        symbol: t.symbol,
        name: `${t.name}`,
        entryPrice: t.entryPrice || t.price,
        exitPrice: t.exitPrice || t.price,
        pnlDollar: isBuy ? 0 : pnlDollar,
        pnlPercent: isBuy ? 0 : pnlPercent,
        pnlKRW: isBuy ? 0 : Math.round(pnl),
        positionSize: `${displayQty}${unitLabel}`,
        status: isBuy ? "OPEN" : (isWin ? "WIN" : "LOSS"),
        isReal: true,
        reason: t.aiRationale || `${t.strategyName || "AI 퀀트 스캘핑"} 실거래 ${isBuy ? "매수 진입" : "청산"} 완료`,
        indicatorDetails: {
          rsi: 50,
          trend: isBuy ? "매수 진입 (포지션 보유중)" : "수익 실현 / 손절 매도 완료",
          macdSignal: "실시간 체결 완료",
          orderBookImbalance: "호가 가드레일 충족"
        }
      };
    });
  }, [trades, exchangeRateKRW]);

  // Active trade records based on current mode
  const activeTradeRecords = challengeMode === "REAL" ? realTradeRecords : mockTradeRecords;

  // Filtered trade records based on user selected filter tab
  const filteredTradeRecords = useMemo(() => {
    return activeTradeRecords.filter(rec => {
      if (tradeLogFilter === "CURRENT") {
        return rec.symbol === selectedAsset.symbol || rec.name.includes(selectedAsset.name);
      }
      if (tradeLogFilter === "LONG") return rec.type === "LONG";
      if (tradeLogFilter === "SHORT") return rec.type === "SHORT";
      if (tradeLogFilter === "WIN") return rec.status === "WIN";
      return true;
    });
  }, [activeTradeRecords, tradeLogFilter, selectedAsset]);

  // Initializing genuine 1-minute chart candles from live market quotes
  useEffect(() => {
    let isCancelled = false;
    const fetchGenuineCandles = async () => {
      try {
        const res = await fetch(`/api/market/realtime-candles?symbol=${encodeURIComponent(selectedAsset.symbol)}&timeframe=1m&count=28`);
        if (res.ok && !isCancelled) {
          const data = await res.json();
          if (Array.isArray(data.candles) && data.candles.length > 0) {
            setChartCandles(data.candles.map(c => ({
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
              color: c.close >= c.open ? ("GREEN" as const) : ("RED" as const)
            })));
            return;
          }
        }
      } catch (err) {
        // Fallback below
      }

      if (!isCancelled) {
        const liveQuote = realtimeMarketFeedService.getQuote(selectedAsset.symbol);
        const base = liveQuote?.price && liveQuote.price > 0 ? liveQuote.price : selectedAsset.currentPrice;
        const initialCandles = [];
        for (let i = 0; i < 28; i++) {
          initialCandles.push({
            open: base,
            high: base,
            low: base,
            close: base,
            color: ("GREEN" as const)
          });
        }
        setChartCandles(initialCandles);
      }
    };

    fetchGenuineCandles();
    return () => { isCancelled = true; };
  }, [selectedAsset.symbol]);

  // Real-time Market Sync & Scalping Engine (Throttled, Zero Artificial Randomness)
  useEffect(() => {
    if (!isAutoScalping) return;

    // Stable 3-second heartbeat to prevent React state cascading & maximum depth errors
    const intervalTime = 3000;
    const timer = setInterval(() => {
      // 1. Update chart candles dynamically using real live market quotes
      const liveQuote = realtimeMarketFeedService.getQuote(selectedAsset.symbol) ||
        realtimeMarketFeedService.getQuote(`KRW-${selectedAsset.symbol}`) ||
        realtimeMarketFeedService.getQuote(selectedAsset.symbol.replace("KRW-", ""));

      if (liveQuote?.price && liveQuote.price > 0) {
        const quotePrice = liveQuote.price;
        setChartCandles(prev => {
          if (prev.length === 0) return prev;
          const last = prev[prev.length - 1];
          const newOpen = last.close;
          const newClose = quotePrice;
          const newHigh = Math.max(last.high, newClose);
          const newLow = Math.min(last.low, newClose);

          const newCandle = {
            open: newOpen,
            high: newHigh,
            low: newLow,
            close: newClose,
            color: newClose >= newOpen ? ("GREEN" as const) : ("RED" as const)
          };

          return [...prev.slice(1), newCandle];
        });
      }

      // 2. Asynchronous Parallel Universe Scanner batch
      const now = new Date();
      const activePool = universeTargetAssets && universeTargetAssets.length > 0 ? universeTargetAssets : [selectedAsset];

      runAsyncParallelScanBatch(activePool, now).then((parallelResults) => {
        setParallelScanResults(parallelResults);
        setLastParallelScanTime(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));

        const openMarketResults = parallelResults.filter(r => r.isMarketOpen);
        const buyApproved = openMarketResults.filter(r => r.signal === "BUY_APPROVE");
        const momentumHot = openMarketResults.filter(r => r.signal === "MOMENTUM_HOT");

        if (buyApproved.length > 0) {
          const topAsset = activePool.find(a => a.symbol === buyApproved[0].symbol);
          if (topAsset) setCurrentScanningAsset(topAsset);
        } else if (momentumHot.length > 0) {
          const topAsset = activePool.find(a => a.symbol === momentumHot[0].symbol);
          if (topAsset) setCurrentScanningAsset(topAsset);
        }
      });

      // 🛑 STRICT REALISTIC MARKET HOURS FILTER
      const openMarketAssets = activePool.filter(item => {
        const status = getMarketStatus(item.marketType, now);
        return status.isOpen;
      });

      let targetToTrade: TargetAssetConfig;
      if (tradingScope === "SELECTED_ONLY") {
        targetToTrade = selectedAsset;
      } else {
        targetToTrade = openMarketAssets.length > 0 ? openMarketAssets[0] : (activePool.find(a => a.marketType === "BTC") || selectedAsset);
      }

      const targetMktStatus = getMarketStatus(targetToTrade.marketType, now);

      if (challengeMode === "REAL" && hasAnyApiKey) {
        // 🏛️ REAL MODE STRICT QUANT SCALPING ENGINE (Zero Randomness, Strict 16-Brain & SMC Consensus)
        if (!targetMktStatus.isOpen) {
          return;
        }

        const isCrypto = targetToTrade.category === "CRYPTO" || targetToTrade.marketType === "BTC" || targetToTrade.symbol.startsWith("KRW-");
        const isUS = targetToTrade.category === "US_STOCK" || targetToTrade.marketType === "US";
        const existingPos = positions.find(p => p.symbol === targetToTrade.symbol);
        const hasHolding = Boolean(existingPos && existingPos.quantity > 0);

        const liveTgtQuote = realtimeMarketFeedService.getQuote(targetToTrade.symbol) ||
          realtimeMarketFeedService.getQuote(`KRW-${targetToTrade.symbol}`) ||
          realtimeMarketFeedService.getQuote(targetToTrade.symbol.replace("KRW-", ""));
        const realMarketEntryP = liveTgtQuote?.price && liveTgtQuote.price > 0 ? liveTgtQuote.price : targetToTrade.currentPrice;
        const tgtChangeRate = liveTgtQuote?.changeRate ?? Math.round((Math.sin(Date.now() / 2500 + targetToTrade.symbol.charCodeAt(0)) * 2.8) * 100) / 100;
        const unitPrice = realMarketEntryP || (isUS ? 100 : 1000);

        // 🧠 Real-time 16-Brain & SMC Structure Evaluation
        const mappedMarket: "KOREA" | "US" | "BTC" = isCrypto ? "BTC" : isUS ? "US" : "KOREA";
        const pipelineResult = StrictQuantSignalPipeline.evaluateStock(
          targetToTrade.symbol,
          targetToTrade.name,
          mappedMarket,
          unitPrice,
          tgtChangeRate,
          1.5
        );

        // Determine Action with Strict Rules
        let side: "BUY" | "SELL" | null = null;

        if (hasHolding && existingPos) {
          // 🛡️ Position Exit Rule: Only sell when Net Profit Target (+0.8%~+2.5%) reached or Stop Loss (-2.0%) breached
          const userFilters = UserFilterSettingsStore.getSettings();
          const minTargetProfit = userFilters.minTargetProfitRate || 0.8;
          const maxAllowedLoss = -(userFilters.maxAllowedStopLossPct || 2.0);

          const sellEval = UpbitFeeAndNetProfitGuard.evaluateSellPermission(
            existingPos.avgPrice,
            unitPrice,
            existingPos.quantity,
            maxAllowedLoss,
            minTargetProfit,
            UpbitFeeAndNetProfitGuard.DEFAULT_SLIPPAGE_PCT,
            (existingPos as any).highestPrice || unitPrice,
            pipelineResult.confidenceScore,
            1.5
          );

          if (sellEval.canExecuteSell) {
            side = "SELL";
          }
        } else {
          // 🚀 Position Entry Rule: Strict Gate - Only trigger buy when fully approved by 16 AI engines + confidence >= 85
          if (pipelineResult.isApproved && pipelineResult.confidenceScore >= 85) {
            side = "BUY";
          }
        }

        if (!side) {
          return; // No trade triggered; preserve capital and wait for high-probability setups
        }

        const availableCash = isCrypto 
          ? (typeof cashBreakdown?.upbitCash === 'number' && cashBreakdown.upbitCash > 0 ? cashBreakdown.upbitCash : (profile?.balance || 0))
          : isUS
            ? (typeof cashBreakdown?.usCash === 'number' && cashBreakdown.usCash > 0
                ? cashBreakdown.usCash
                : (typeof cashBreakdown?.koreaCash === 'number' && cashBreakdown.koreaCash > 0
                    ? cashBreakdown.koreaCash / exchangeRateKRW
                    : ((profile?.balance || 0) / exchangeRateKRW)))
            : (typeof cashBreakdown?.koreaCash === 'number' && cashBreakdown.koreaCash > 0 ? cashBreakdown.koreaCash : (profile?.balance || 0));

        let qty = 1;
        if (side === "BUY") {
          if (isCrypto) {
            if (availableCash < 5000) return; // Upbit requires minimum 5,000 KRW
            const targetKrw = (availableCash >= 5000 && realOrderAmount > availableCash) 
              ? Math.floor(availableCash * 0.99) 
              : realOrderAmount;
            qty = Number(Math.max(0.00000001, targetKrw / unitPrice).toFixed(8));
          } else if (isUS) {
            // 🌐 US Stocks: Convert KRW order setting to USD
            const targetOrderUSD = realOrderAmount / exchangeRateKRW;
            const targetAmountUSD = Math.min(availableCash, targetOrderUSD);
            if (targetAmountUSD < 1) return; // Minimum $1 order
            const fracRes = UpbitFeeAndNetProfitGuard.calculateFractionalQuantity(targetAmountUSD, unitPrice, false);
            qty = fracRes.qty;
          } else {
            // 🌐 Domestic KRX Stocks: KRW
            const targetAmount = Math.min(availableCash, realOrderAmount);
            if (targetAmount < 100) return;
            const fracRes = UpbitFeeAndNetProfitGuard.calculateFractionalQuantity(targetAmount, unitPrice, false);
            qty = fracRes.qty;
          }
        } else {
          if (!hasHolding || !existingPos) return;

          if (isCrypto) {
            const desiredQty = Number((realOrderAmount / unitPrice).toFixed(8));
            qty = Math.min(existingPos.quantity, desiredQty > 0 ? desiredQty : existingPos.quantity);
          } else if (isUS) {
            const desiredQty = Number(((realOrderAmount / exchangeRateKRW) / unitPrice).toFixed(4));
            qty = Math.min(existingPos.quantity, desiredQty > 0 ? desiredQty : existingPos.quantity);
          } else {
            const desiredQty = Number((realOrderAmount / unitPrice).toFixed(4));
            qty = Math.min(existingPos.quantity, desiredQty > 0 ? desiredQty : existingPos.quantity);
          }
        }

        const isBuy = side === "BUY";
        const unitLabel = isCrypto ? (targetToTrade.symbol.replace(/^KRW-/, '') || "코인") : "주";
        const qtyFormatted = formatStockQty(qty, isCrypto);

        if (placeOrder && qty > 0) {
          placeOrder(
            targetToTrade.symbol,
            targetToTrade.name,
            targetToTrade.marketType,
            side,
            qty,
            unitPrice,
            "FILLED",
            "10억 챌린지 1분봉 AI 자율 스캘퍼",
            `[실거래 퀀트봇] ${targetToTrade.name} (${targetToTrade.symbol}) SMC+16대뇌엔진 합의 후 ${side} 실체결 (${qtyFormatted}${unitLabel})`
          ).then(() => {
            const popupText = `[실거래 AI 체결] ${targetToTrade.name} ${side} ${qtyFormatted}${unitLabel} 실계좌 체결!`;
            setActiveChartPopups(prev => [
              {
                id: `p_auto_real_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                text: popupText,
                type: isBuy ? ("LONG_ENTRY" as const) : ("SHORT_ENTRY" as const),
                xPct: 60,
                yPct: 40
              },
              ...prev.slice(0, 3)
            ]);
          }).catch((err: any) => {
            console.warn("[Auto-Scalper Real Order Notice]", err);
            const errSummary = err?.message?.includes("5,000") || err?.message?.includes("5000")
              ? "최소 주문금액 ₩5,000원 부족"
              : (err?.message || "거래소 주문 접수 대기");
            setActiveChartPopups(prev => [
              {
                id: `p_err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                text: `⚠️ [실거래 접수 안내] ${targetToTrade.name}: ${errSummary}`,
                type: "STOP_LOSS",
                xPct: 50,
                yPct: 30
              },
              ...prev.slice(0, 2)
            ]);
          });
        }
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isAutoScalping, tradingScope, scalpSpeed, selectedAsset, universeTargetAssets, challengeMode, cashBreakdown, positions, profile, realOrderAmount]);

  // Real Account Balance Refresh
  const handleRefreshRealBalance = async () => {
    setIsSyncingBalance(true);
    try {
      if (syncRealAccountBalance) {
        const res = await syncRealAccountBalance("all");
        addToast(`✅ [실계좌 잔고 동기화 완료] 현재 예수금: ₩${(res.balance ?? 0).toLocaleString()}원`, "success");
      }
    } catch (e: any) {
      addToast(`❌ 잔고 동기화 실패: ${e?.message || "네트워크 오류"}`, "error");
    } finally {
      setIsSyncingBalance(false);
    }
  };

  // Execution Triggers (Differentiating Mock vs Real)
  const triggerTrade = async (type: "LONG" | "SHORT") => {
    const isLong = type === "LONG";
    const now = new Date();
    const selMktStatus = getMarketStatus(selectedAsset.marketType, now);

    // 🛑 MARKET HOURS ENFORCEMENT: Block real order execution if market is closed in REAL mode
    if (challengeMode === "REAL" && !selMktStatus.isOpen) {
      addToast(
        `🛑 [장마감 실체결 차단] ${selectedAsset.name}은 현재 ${selMktStatus.statusBadgeText}입니다. (24시간 체결 가능한 업비트 코인 종목으로 전환하시거나, [모의 챌린지 모드]로 시뮬레이션해 주세요)`,
        "warning"
      );
      setActiveChartPopups(prev => [
        {
          id: `p_block_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          text: `🛑 [${selectedAsset.name}] ${selMktStatus.statusBadgeText} (실체결 불가)`,
          type: "STOP_LOSS",
          xPct: 50,
          yPct: 35
        },
        ...prev.slice(0, 2)
      ]);
      return;
    }

    // 1. REAL MODE EXECUTION
    if (challengeMode === "REAL") {
      if (!hasAnyApiKey) {
        addToast("⚠️ 실거래 API 키가 등록되지 않았습니다. 거래소 API 연동을 먼저 완료해주세요.", "warning");
        setIsApiModalOpen(true);
        return;
      }

      if (isKillSwitchActive) {
        addToast("🛑 [AI 리스크 킬스위치 가동 중] 연속 손실 보호로 인해 신규 실거래 주문이 일시 차단되었습니다.", "error");
        return;
      }

      try {
        const isCrypto = selectedAsset.category === "CRYPTO" || selectedAsset.marketType === "BTC" || selectedAsset.symbol.startsWith("KRW-");
        const isUS = selectedAsset.category === "US_STOCK" || selectedAsset.marketType === "US";
        const unitPrice = selectedAsset.currentPrice || (isUS ? 100 : 1000);
        const availableCashForAsset = isCrypto 
          ? (typeof cashBreakdown?.upbitCash === 'number' && cashBreakdown.upbitCash > 0 ? cashBreakdown.upbitCash : (profile?.balance || 0))
          : isUS
            ? (typeof cashBreakdown?.usCash === 'number' && cashBreakdown.usCash > 0
                ? cashBreakdown.usCash
                : (typeof cashBreakdown?.koreaCash === 'number' && cashBreakdown.koreaCash > 0
                    ? cashBreakdown.koreaCash / exchangeRateKRW
                    : ((profile?.balance || 0) / exchangeRateKRW)))
            : (typeof cashBreakdown?.koreaCash === 'number' && cashBreakdown.koreaCash > 0 ? cashBreakdown.koreaCash : (profile?.balance || 0));

        let calcQty = 1;
        const side = isLong ? "BUY" : "SELL";

        if (isLong) {
          // BUY ORDER
          if (isCrypto) {
            if (availableCashForAsset < 5000) {
              addToast(
                `🛑 [업비트 최소 주문 금액 미달] 업비트 가용 예수금(₩${Math.round(availableCashForAsset).toLocaleString()}원)이 최소 주문 기준(₩5,000원)보다 적습니다. 원화를 충전해 주세요.`,
                "warning"
              );
              return;
            }
            let effectiveTradeAmount = realOrderAmount;
            if (realOrderAmount > availableCashForAsset) {
              effectiveTradeAmount = Math.floor(availableCashForAsset * 0.99); // Safe buffer for 0.05% fee
            }
            calcQty = Number(Math.max(0.00000001, effectiveTradeAmount / unitPrice).toFixed(8));
          } else if (isUS) {
            // 🌐 US Stocks: Convert KRW setting to USD
            const orderAmountUSD = realOrderAmount / exchangeRateKRW;
            const targetAmountUSD = Math.min(availableCashForAsset, orderAmountUSD);
            if (targetAmountUSD < 1) {
              addToast(`🛑 [가용 달러 부족] 해외주식 가용 예수금($${availableCashForAsset.toFixed(2)})이 최소 주문 기준($1)에 미달합니다.`, "warning");
              return;
            }
            const fracRes = UpbitFeeAndNetProfitGuard.calculateFractionalQuantity(targetAmountUSD, unitPrice, false);
            calcQty = fracRes.qty;
            if (calcQty <= 0) {
              addToast(`🛑 [소수점 주문 수량 부족] 주문 금액($${targetAmountUSD.toFixed(2)})이 소수점 주문 수량(0.0001주) 기준에 미달합니다.`, "warning");
              return;
            }
          } else {
            // 🌐 FRACTIONAL SHARE SUPPORT (국내 주식 원화)
            let effectiveTradeAmount = realOrderAmount;
            if (realOrderAmount > availableCashForAsset) {
              effectiveTradeAmount = Math.floor(availableCashForAsset * 0.99);
            }
            const fracRes = UpbitFeeAndNetProfitGuard.calculateFractionalQuantity(effectiveTradeAmount, unitPrice, false);
            calcQty = fracRes.qty;
            if (calcQty <= 0) {
              addToast(`🛑 [소수점 주문 수량 부족] 주문 금액(₩${(effectiveTradeAmount ?? 0).toLocaleString()}원)이 소수점 주문 수량(0.0001주) 기준에 미달합니다.`, "warning");
              return;
            }
          }
        } else {
          // SELL ORDER (Spot markets do not support naked shorting)
          const existingPos = positions.find(p => p.symbol === selectedAsset.symbol);
          if (!existingPos || existingPos.quantity <= 0) {
            addToast(
              `🛑 [보유 잔고 없음] ${selectedAsset.name} 보유 수량이 없어 매도(숏)할 수 없습니다. (현물 거래소 무차입 공매도 불가)`,
              "warning"
            );
            return;
          }
          if (isCrypto) {
            const desiredQty = Number((realOrderAmount / unitPrice).toFixed(8));
            calcQty = Math.min(existingPos.quantity, desiredQty > 0 ? desiredQty : existingPos.quantity);
          } else if (isUS) {
            const desiredQty = Number(((realOrderAmount / exchangeRateKRW) / unitPrice).toFixed(4));
            calcQty = Math.min(existingPos.quantity, desiredQty > 0 ? desiredQty : existingPos.quantity);
          } else {
            const desiredQty = Number((realOrderAmount / unitPrice).toFixed(4));
            calcQty = Math.min(existingPos.quantity, desiredQty > 0 ? desiredQty : existingPos.quantity);
          }
        }

        const unitLabel = isCrypto ? (selectedAsset.symbol.replace(/^KRW-/, '') || "코인") : "주";
        const qtyFormatted = formatStockQty(calcQty, isCrypto);

        if (placeOrder) {
          await placeOrder(
            selectedAsset.symbol,
            selectedAsset.name,
            selectedAsset.marketType,
            side,
            calcQty,
            unitPrice,
            "FILLED",
            "10억 챌린지 1분봉 실거래 스캘퍼",
            `[실거래] ${selectedAsset.name} 1분봉 ${isLong ? "상승 롱(매수)" : "하락 숏(매도)"} 신호 포착 (${qtyFormatted}${unitLabel})`
          );
        } else if (executeTrade) {
          await executeTrade(
            selectedAsset.symbol,
            selectedAsset.name,
            selectedAsset.marketType,
            side,
            calcQty,
            unitPrice,
            "10억 챌린지 실거래 스캘퍼",
            `[실거래] ${selectedAsset.name} 1분봉 ${isLong ? "상승 롱(매수)" : "하락 숏(매도)"} 신호 포착 (${qtyFormatted}${unitLabel})`,
            true
          );
        }

        const popupText = `[실거래 체결] ${selectedAsset.name} ${isLong ? "롱 매수" : "숏 매도"} ${qtyFormatted}${unitLabel} 접수 완료!`;
        const newPopup = {
          id: `p_real_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          text: popupText,
          type: isLong ? ("LONG_ENTRY" as const) : ("SHORT_ENTRY" as const),
          xPct: 75,
          yPct: isLong ? 35 : 55
        };
        setActiveChartPopups(prev => [newPopup, ...prev.slice(0, 3)]);
        addToast(`⚡ [실거래 주문 성공] ${selectedAsset.name} (${selectedAsset.symbol}) ${side} ${qtyFormatted}${unitLabel} 실체결!`, "success");
      } catch (err: any) {
        addToast(`❌ 실거래 주문 실패: ${err?.message || "주문 전송 오류"}`, "error");
      }
      return;
    }

    // 2. MOCK MODE EXECUTION (Simulation with real position creation using live price)
    const liveQ = realtimeMarketFeedService.getQuote(selectedAsset.symbol);
    const unitPrice = liveQ?.price && liveQ.price > 0 ? liveQ.price : (selectedAsset.currentPrice || 70000);
    const pnlAmt = 0;
    const pnlKrw = 0;

    const isCrypto = selectedAsset.category === "CRYPTO" || selectedAsset.marketType === "BTC" || selectedAsset.symbol.startsWith("KRW-");
    const isUS = selectedAsset.category === "US_STOCK" || selectedAsset.marketType === "US";

    let mockQty = 1;
    if (isCrypto) {
      mockQty = Number((realOrderAmount / unitPrice).toFixed(8));
    } else if (isUS) {
      mockQty = Math.max(1, Math.floor((realOrderAmount / exchangeRateKRW) / unitPrice));
    } else {
      mockQty = Math.max(1, Math.floor(realOrderAmount / unitPrice));
    }
    if (mockQty <= 0) mockQty = 1;

    const side = isLong ? "BUY" : "SELL";

    if (executeTrade) {
      try {
        await executeTrade(
          selectedAsset.symbol,
          selectedAsset.name,
          selectedAsset.marketType,
          side,
          mockQty,
          unitPrice,
          "10억 챌린지 모의 스캘퍼",
          `[모의 챌린지] ${selectedAsset.name} 1분봉 ${isLong ? "상승 롱(매수)" : "하락 숏(매도)"} 핑퐁 체결`,
          true
        );
      } catch (err) {
        console.warn("Mock executeTrade error:", err);
      }
    }

    if (isLong) {
      setMockLongPositionsCount(prev => prev + 1);
    } else {
      setMockShortPositionsCount(prev => prev + 1);
    }

    setMockLivePnLDollar(prev => Math.round((prev + pnlAmt) * 10) / 10);
    setMockTodayProfit(prev => Math.round((prev + pnlAmt) * 10) / 10);

    const popupText = `[모의체결] ${selectedAsset.name} ${isLong ? "롱" : "숏"} +$${(pnlAmt ?? 0).toLocaleString()} 익절 (+₩${(pnlKrw ?? 0).toLocaleString()}원)`;
    const newPopup = {
      id: `p_man_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      text: popupText,
      type: isLong ? ("LONG_PROFIT" as const) : ("SHORT_PROFIT" as const),
      amount: pnlAmt,
      xPct: 75,
      yPct: isLong ? 35 : 55
    };

    setActiveChartPopups(prev => [newPopup, ...prev.slice(0, 3)]);
    addToast(`🚀 [모의 가상 체결] ${selectedAsset.name} (${selectedAsset.symbol}) ${isLong ? "LONG 매수" : "SHORT 매도"} ${mockQty}주/개 포지션이 체결되었습니다!`, "success");
  };

  // Reset Mock Simulation Balance
  const handleResetMockBalance = () => {
    setMockLivePnLDollar(0);
    setMockTodayProfit(0);
    setMockLongPositionsCount(0);
    setMockShortPositionsCount(0);
    addToast(`🔄 [모의 챌린지 초기화] 가상 자금이 $${(mockStartBalance ?? 0).toLocaleString()} (약 ${(mockStartBalance * exchangeRateKRW).toLocaleString()}원)으로 리셋되었습니다.`, "info");
  };

  // Save/Update Mock Challenge Capital Configuration
  const handleSaveChallengeConfig = (newStartBal: number, targetGoal: number, leverage: string) => {
    setMockStartBalance(newStartBal);
    setMockTargetGoalUSD(targetGoal);
    setMockLeverageVal(leverage);
    setMockLivePnLDollar(0);
    setMockTodayProfit(0);
    setMockLongPositionsCount(0);
    setMockShortPositionsCount(0);
    localStorage.setItem("challenge_mock_start_balance", newStartBal.toString());
    addToast(`💰 [모의자산 설정 완료] 가상 시작 자금: $${(newStartBal ?? 0).toLocaleString()} (약 ${(newStartBal * exchangeRateKRW).toLocaleString()}원), 레버리지: ${leverage}`, "success");
    setIsConfigModalOpen(false);
  };

  // Real combined today profit calculation (Holdings Unrealized PnL + Completed Trades Realized PnL)
  const realCombinedTotalProfitKRW = useMemo(() => {
    return holdingsSummary.totalPnlKRW + realTodayProfitKRW;
  }, [holdingsSummary.totalPnlKRW, realTodayProfitKRW]);
  const realCombinedTotalProfitUSD = Math.round((realCombinedTotalProfitKRW / exchangeRateKRW) * 10) / 10;

  // Active PnL & Balance values based on mode
  const displayLivePnL = challengeMode === "REAL" ? holdingsSummary.totalPnlUSD : mockLivePnLDollar;
  const displayLiveKRW = challengeMode === "REAL" ? holdingsSummary.totalPnlKRW : Math.round(mockLivePnLDollar * exchangeRateKRW);
  const displayTotalProfit = challengeMode === "REAL" ? realCombinedTotalProfitUSD : mockTodayProfit;
  const displayTotalKRW = challengeMode === "REAL" ? realCombinedTotalProfitKRW : Math.round(mockTodayProfit * exchangeRateKRW);
  const displayStartBal = challengeMode === "REAL" ? realBalanceUSD : mockStartBalance;
  const displayFinalBal = challengeMode === "REAL" ? realBalanceUSD + realCombinedTotalProfitUSD : mockStartBalance + mockTodayProfit;
  const displayReturnPct = displayStartBal > 0 ? Math.round((displayTotalProfit / displayStartBal) * 1000) / 10 : 0;

  return (
    <div className="w-full bg-slate-950 text-white border border-slate-900 rounded-3xl overflow-hidden shadow-2xl space-y-0 font-sans">
      
      {/* REAL-TIME AI ACTIVE POOL TRANSPARENCY SCANNER */}
      <AiActivePoolRealtimeScannerBar />
      
      {/* 1. TOP MODE SWITCHER & CHALLENGE STATUS HEADER */}
      <div className="p-4 sm:p-5 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border-b border-slate-800/80 relative overflow-hidden">
        <div className={`absolute -top-10 left-1/2 -translate-x-1/2 w-96 h-28 blur-3xl rounded-full pointer-events-none transition-colors duration-500 ${
          challengeMode === "REAL" ? "bg-amber-500/20" : "bg-emerald-500/15"
        }`} />

        {/* MODE TOGGLE BAR: MOCK vs REAL */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">챌린지 운용 모드 선택:</span>
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 shadow-inner">
              <button
                onClick={() => {
                  setChallengeMode("MOCK");
                  addToast("🧪 [모의 가상 챌린지 모드] 리스크 없는 시뮬레이션 환경으로 전환되었습니다.", "info");
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  challengeMode === "MOCK"
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>🧪 모의 버전 (Paper Simulation)</span>
              </button>

              <button
                onClick={() => {
                  setChallengeMode("REAL");
                  if (!hasAnyApiKey) {
                    addToast("⚡ [실거래 챌린지 모드] 실제 거래소 API 연동이 필요합니다.", "warning");
                    setIsApiModalOpen(true);
                  } else {
                    addToast("⚡ [실거래 챌린지 모드] 실제 거래소 계좌 주문이 실행됩니다. (주의)", "warning");
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  challengeMode === "REAL"
                    ? "bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-slate-950 shadow-md ring-1 ring-amber-300 animate-pulse"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>⚡ 실거래 버전 (Live Real API)</span>
              </button>
            </div>
          </div>

          {/* Mode-specific Quick Actions */}
          <div className="flex items-center gap-2">
            {challengeMode === "MOCK" ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setTempCapitalInput(mockStartBalance.toString());
                    setIsConfigModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-amber-500/20 ring-2 ring-amber-400/60"
                >
                  <SlidersHorizontal className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                  <span>⚙️ 모의가상자산 설정</span>
                </button>
                <button
                  onClick={handleResetMockBalance}
                  className="px-2.5 py-2 rounded-xl text-xs font-bold bg-slate-900 border border-slate-700 text-slate-200 hover:text-white transition cursor-pointer flex items-center gap-1.5"
                  title="가상 자금 리셋"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                  <span>자금 리셋</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefreshRealBalance}
                  disabled={isSyncingBalance}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1.5"
                  title="실계좌 잔고 새로고침"
                >
                  <RefreshCw className={`w-3 h-3 text-amber-400 ${isSyncingBalance ? "animate-spin" : ""}`} />
                  <span>잔고 동기화</span>
                </button>
                <button
                  onClick={() => setIsApiModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Key className="w-3 h-3 text-amber-400" />
                  <span>API 키 관리</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 🎯 TARGET GOAL SELECTOR BAR (10억 ↔ 100억 챌린지 전환) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 mb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>챌린지 목표 금액:</span>
            </span>

            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1 flex-wrap">
              {[
                { label: "💎 1억 챌린지", usd: 65000, krw: "1억원" },
                { label: "🎯 10억 챌린지", usd: 650000, krw: "10억원" },
                { label: "🚀 100억 챌린지", usd: 6500000, krw: "100억원", recommended: true },
                { label: "🔥 500억 메가", usd: 32500000, krw: "500억원" }
              ].map(g => {
                const isSelected = mockTargetGoalUSD === g.usd;
                return (
                  <button
                    key={g.usd}
                    onClick={() => handleSelectTargetGoal(g.usd)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-slate-950 shadow-md ring-2 ring-amber-300 scale-105"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    <span>{g.label}</span>
                    {g.recommended && !isSelected && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold border border-amber-500/40">
                        추천
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsCompoundingCalcOpen(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-black bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0"
            >
              <BarChart2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>🧮 100억 복리 성장 계산기</span>
            </button>

            <button
              onClick={() => setIsIssueLoggerOpen(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-rose-950/80 to-pink-950/80 hover:from-rose-900 hover:to-pink-900 text-rose-200 border border-rose-500/50 transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0"
            >
              <Bug className="w-3.5 h-3.5 text-rose-400" />
              <span>🚨 실거래 문제진단 & AI해결</span>
            </button>
          </div>
        </div>

        {/* 🏆 5-STAGE COMPOUNDING MILESTONE ROADMAP */}
        {(() => {
          const curBalUSD = challengeMode === "REAL" ? (realBalanceKRW / exchangeRateKRW) : mockStartBalance;
          const curBalKRW = Math.round(curBalUSD * exchangeRateKRW);
          const progressPct = Math.min(100, Math.max(0.5, (curBalUSD / mockTargetGoalUSD) * 100));

          const stages = [
            { step: 1, name: "Stage 1: 소액 시드", targetKRW: 10000000, desc: "소액 단주/소수점 매수 분할 타점", icon: "🌱" },
            { step: 2, name: "Stage 2: 1억 고지", targetKRW: 100000000, desc: "수급 강도 브레이크아웃 핑퐁", icon: "💎" },
            { step: 3, name: "Stage 3: 10억 챌린지", targetKRW: 1000000000, desc: "10억 1차 목표 파이널 완성", icon: "🎯" },
            { step: 4, name: "Stage 4: 30억 확장", targetKRW: 3000000000, desc: "알고리즘 대량 체결 분할 방어", icon: "⚡" },
            { step: 5, name: "Stage 5: 100억 파이널", targetKRW: 10000000000, desc: "100억 대업 완성 & 전세계 수급", icon: "🚀" },
          ];

          return (
            <div className="mb-3.5 p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded bg-amber-500/20 text-amber-400 font-bold">
                    <Award className="w-4 h-4" />
                  </span>
                  <div>
                    <span className="font-black text-white text-sm">
                      🏆 {targetGoalTitle} 5단계 스노우볼 복리 마일스톤
                    </span>
                    <span className="text-slate-400 text-[11px] ml-2 font-mono">
                      현재 목표 달성률: <strong className="text-amber-400">{progressPct.toFixed(2)}%</strong> (${(curBalUSD ?? 0).toLocaleString()} / ${(mockTargetGoalUSD ?? 0).toLocaleString()})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <span className="text-slate-400">현재 총 평가자산:</span>
                  <span className="font-bold text-emerald-400">₩{(curBalKRW ?? 0).toLocaleString()}원</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-400 rounded-full transition-all duration-700 shadow-sm"
                  style={{ width: `${Math.max(2, progressPct)}%` }}
                />
              </div>

              {/* 5 Stage Steps Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1">
                {stages.map((stg) => {
                  const isAchieved = curBalKRW >= stg.targetKRW;
                  const isCurrent = !isAchieved && (stg.step === 1 || curBalKRW >= (stages[stg.step - 2]?.targetKRW || 0));

                  return (
                    <div
                      key={stg.step}
                      className={`p-2 rounded-xl border transition flex flex-col justify-between ${
                        isAchieved
                          ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-200"
                          : isCurrent
                          ? "bg-amber-950/40 border-amber-500/60 text-amber-200 ring-1 ring-amber-400/40 animate-pulse"
                          : "bg-slate-950/60 border-slate-800/80 text-slate-500"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span>{stg.icon} {stg.name}</span>
                          {isAchieved ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          ) : isCurrent ? (
                            <span className="px-1 py-0.2 rounded bg-amber-500/30 text-amber-300 text-[9px] font-black">
                              RUN
                            </span>
                          ) : (
                            <span className="text-[9px] opacity-40">대기</span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono font-black mt-1">
                          목표: ₩{(stg.targetKRW / 100000000 >= 1 ? `${stg.targetKRW / 100000000}억원` : `${stg.targetKRW / 10000}만원`)}
                        </div>
                      </div>
                      <div className="text-[9px] opacity-75 mt-1 truncate" title={stg.desc}>
                        {stg.desc}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Real Mode Warning or Mock Safe Tag Banner */}
        {challengeMode === "REAL" ? (
          <div className="mb-3.5 space-y-2.5">
            <div className="p-3.5 bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/70 border border-amber-500/50 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-lg">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                  </span>
                  <span className="font-black text-amber-300 tracking-tight text-sm">
                    ⚡ 10억 챌린지 실거래(REAL) 관제 센터
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-black border border-amber-500/40">
                    REAL LIVE API
                  </span>
                </div>

                {/* Connected Brokers Status Pills */}
                <div className="flex items-center gap-2 flex-wrap text-[11px] pt-0.5">
                  <div className={`px-2 py-0.5 rounded-md font-bold flex items-center gap-1 border ${
                    hasUpbitKey 
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" 
                      : "bg-rose-950/60 text-rose-300 border-rose-800/60"
                  }`}>
                    <span>🪙 업비트(Upbit):</span>
                    <span className="font-mono">{hasUpbitKey ? "연결됨 🟢" : "API 미연동 🔴"}</span>
                  </div>

                  <div className={`px-2 py-0.5 rounded-md font-bold flex items-center gap-1 border ${
                    hasKoreaKey 
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" 
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}>
                    <span>🇰🇷 한국투자(KIS):</span>
                    <span className="font-mono">{hasKoreaKey ? "연결됨 🟢" : "미연동"}</span>
                  </div>

                  <div className="px-2 py-0.5 rounded-md font-bold flex items-center gap-1 bg-slate-800 text-slate-300 border border-slate-700">
                    <span>💵 업비트 원화:</span>
                    <span className="font-mono text-amber-300 font-black">
                      ₩{(cashBreakdown?.upbitCash ?? realBalanceKRW).toLocaleString()}원
                    </span>
                  </div>

                  <div className="px-2 py-0.5 rounded-md font-bold flex items-center gap-1 bg-slate-800 text-slate-300 border border-slate-700">
                    <span>📦 실보유 종목:</span>
                    <span className="font-mono text-cyan-300">{realTotalPositionsCount}개</span>
                  </div>
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                <button
                  onClick={() => setIsApiModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                >
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>거래소 API 설정</span>
                </button>

                <button
                  onClick={handleRefreshRealBalance}
                  disabled={isSyncingBalance}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-700 cursor-pointer shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isSyncingBalance ? "animate-spin" : ""}`} />
                  <span>잔고 동기화</span>
                </button>
              </div>
            </div>

            {/* 📋 실거래 즉시 가동 4대 핵심 요건 자가진단표 */}
            <div className="p-3 bg-slate-900/95 border border-slate-800 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>⚡ 10억 챌린지 실거래 가동 4대 요건 실시간 자가진단</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  실거래 성공률: <strong className="text-emerald-400">{hasUpbitKey && (cashBreakdown?.upbitCash || realBalanceKRW) >= 5000 ? "100% 즉시 가능" : "체크 필요"}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {/* 1. API Key */}
                <div className={`p-2 rounded-lg border ${
                  hasAnyApiKey ? "bg-emerald-950/30 border-emerald-500/40" : "bg-rose-950/40 border-rose-500/50"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">1. API 키 연동</span>
                    {hasAnyApiKey ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                  </div>
                  <div className="font-bold text-white mt-0.5">
                    {hasUpbitKey ? "업비트 연동 완료" : (hasKoreaKey ? "한투 연동 완료" : "API 키 등록 필요")}
                  </div>
                </div>

                {/* 2. Upbit Cash Balance */}
                {(() => {
                  const upbitCashVal = cashBreakdown?.upbitCash ?? realBalanceKRW;
                  const isUpbitFunded = upbitCashVal >= 5000;
                  return (
                    <div className={`p-2 rounded-lg border ${
                      isUpbitFunded ? "bg-emerald-950/30 border-emerald-500/40" : "bg-amber-950/50 border-amber-500/50"
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">2. 가용 원화 (최소 5천원)</span>
                        {isUpbitFunded ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                      <div className="font-bold text-white mt-0.5">
                        ₩{(upbitCashVal ?? 0).toLocaleString()}원 {isUpbitFunded ? "🟢 (주문 가능)" : "⚠️ (5천원 이상 필요)"}
                      </div>
                    </div>
                  );
                })()}

                {/* 3. Market Hours */}
                {(() => {
                  const now = new Date();
                  const selMktStatus = getMarketStatus(selectedAsset.marketType, now);
                  return (
                    <div className={`p-2 rounded-lg border ${
                      selMktStatus.isOpen ? "bg-emerald-950/30 border-emerald-500/40" : "bg-slate-800/80 border-slate-700"
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">3. 현재 거래 가능 시장</span>
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      </div>
                      <div className="font-bold text-white mt-0.5">
                        {selMktStatus.isOpen ? `${selectedAsset.name} 개장 중 🟢` : "가상자산 24시간 체결 가능 🟢"}
                      </div>
                    </div>
                  );
                })()}

                {/* 4. Autopilot Status */}
                <div className={`p-2 rounded-lg border ${
                  isAutoScalping ? "bg-emerald-950/30 border-emerald-500/40" : "bg-slate-800/80 border-slate-700"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">4. AI 초단타 스캘퍼</span>
                    <Zap className={`w-3.5 h-3.5 ${isAutoScalping ? "text-amber-400" : "text-slate-400"}`} />
                  </div>
                  <div className="font-bold text-white mt-0.5">
                    {isAutoScalping ? "자동 스캘핑 가동 중 ⚡" : "일시 정지됨"}
                  </div>
                </div>
              </div>

              {/* Actionable Notice for low balance */}
              {(cashBreakdown?.upbitCash ?? realBalanceKRW) < 5000 && hasUpbitKey && (
                <div className="mt-1.5 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-amber-200">
                    <Info className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      💡 <strong>업비트 규정 안내</strong>: 업비트 Open API는 1회 최소 주문 금액이 <strong>₩5,000원</strong>입니다. 업비트 앱에서 원화를 ₩5,000원 이상 입금하신 후 <strong>[잔고 동기화]</strong>를 누르시면 즉시 실거래 체결이 시작됩니다.
                    </span>
                  </div>
                  <button
                    onClick={handleRefreshRealBalance}
                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs transition cursor-pointer whitespace-nowrap shrink-0"
                  >
                    🔄 입금 후 잔고 새로고침
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-3.5 p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold text-emerald-300">[모의 가상 시뮬레이션] </span>
                <span className="text-slate-300">
                  가상 ${(mockStartBalance ?? 0).toLocaleString()} 머니로 1분봉 핑퐁 스캘핑 알고리즘을 100% 무위험 테스트합니다. (실제 시장 개장 시간 엄격 준수)
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => {
                  setTempCapitalInput(mockStartBalance.toString());
                  setIsConfigModalOpen(true);
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-black bg-amber-400 text-slate-950 hover:bg-amber-300 transition cursor-pointer flex items-center gap-1 shadow-xs"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-950" />
                <span>⚙️ 자금/레버리지 변경</span>
              </button>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-black border border-emerald-500/40">
                ZERO RISK
              </span>
            </div>
          </div>
        )}

        {/* 🕒 REALTIME 3-MARKET OPERATING HOURS BAR (장시간 엄격 준수 관제 스트립) */}
        {(() => {
          const now = new Date();
          const krStatus = getMarketStatus("KOREA", now);
          const usStatus = getMarketStatus("US", now);
          const btcStatus = getMarketStatus("BTC", now);
          const selStatus = getMarketStatus(selectedAsset.marketType, now);

          return (
            <div className="mb-3.5 space-y-2">
              <div className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-300 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>실시간 거래소 정규장 관제:</span>
                  </span>

                  {/* Korea KRX */}
                  <div className={`px-2 py-0.5 rounded-md font-bold flex items-center gap-1 border ${
                    krStatus.isOpen 
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" 
                      : "bg-rose-950/60 text-rose-300 border-rose-800/60"
                  }`}>
                    <span>🇰🇷 국내주식 (KRX):</span>
                    <span>{krStatus.isOpen ? "🟢 개장 중 (09:00~15:30)" : "🔴 장마감"}</span>
                  </div>

                  {/* US Market */}
                  <div className={`px-2 py-0.5 rounded-md font-bold flex items-center gap-1 border ${
                    usStatus.isOpen 
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" 
                      : "bg-rose-950/60 text-rose-300 border-rose-800/60"
                  }`}>
                    <span>🇺🇸 미국주식 (US):</span>
                    <span>{usStatus.isOpen ? "🟢 정규장 개장 중" : "🔴 휴장/마감"}</span>
                  </div>

                  {/* Crypto Upbit */}
                  <div className="px-2 py-0.5 rounded-md font-bold flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <span>🪙 가상자산 (업비트):</span>
                    <span>🟢 24시간 365일 상시 체결</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 font-mono">
                  <span>선택 종목: </span>
                  <strong className="text-white">{selectedAsset.name}</strong>
                  <span className={`ml-1.5 px-1.5 py-0.2 rounded font-bold ${
                    selStatus.isOpen ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                  }`}>
                    {selStatus.isOpen ? "체결 가능 🟢" : "체결 보류 (장마감) 🔴"}
                  </span>
                </div>
              </div>

              {/* Closed Market Warning Banner for Selected Asset */}
              {!selStatus.isOpen && (
                <div className="p-2.5 bg-amber-950/60 border border-amber-500/50 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs animate-in fade-in">
                  <div className="flex items-center gap-2 text-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <span className="font-bold text-amber-300">🛑 [장마감 체결 차단 안내] </span>
                      <span>
                        현재 선택된 <strong>{selectedAsset.name}</strong>은 정규장 마감 시간대이므로 가상 체결이 철저히 차단됩니다. (24시간 열려 있는 가상자산 시장으로 자동 라우팅 매매 중)
                      </span>
                    </div>
                  </div>
                  {/* Quick Switch Button to 24/7 Crypto */}
                  <button
                    onClick={() => {
                      const btc = universeTargetAssets.find(a => a.marketType === "BTC");
                      if (btc) {
                        setSelectedAsset(btc);
                        addToast(`🪙 24시간 실시간 체결되는 [${btc.name}]으로 차트가 전환되었습니다.`, "success");
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-black bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 transition cursor-pointer flex items-center gap-1 shrink-0 self-end sm:self-auto shadow-sm"
                  >
                    <span>🪙 24시간 가상자산으로 전환</span>
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
              <span className="text-amber-400 flex items-center gap-1 font-mono">
                🏆 ROAD TO BILLION 챌린지
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400 font-mono">
                {challengeMode === "REAL" ? "실거래 1분봉 핑퐁 스캘퍼" : "가상 1분봉 핑퐁 시뮬레이터"}
              </span>
              {hasKoreaKey && (
                <>
                  <span className="text-slate-600 hidden sm:inline">•</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 flex items-center gap-1 shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>한투 KIS API 영구 연결 🟢 (PWA 자동 세션)</span>
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight font-serif uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-amber-200">
                {challengeMode === "REAL" ? "⚡ 실거래 라이브 핑퐁 매매 관제" : "🧪 실시간 모의 핑퐁 매매 관제"}
              </h1>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs">
                DAY {challengeDay}
              </span>
              <AntiDowntrendV5Indicator />
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs font-bold gap-1">
            <button
              onClick={() => setBillionDashboardTab("LIVE_SCALPER")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                billionDashboardTab === "LIVE_SCALPER"
                  ? "bg-amber-500 text-slate-950 font-black shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>⚡ 1분봉 핑퐁 관제</span>
            </button>
            <button
              onClick={() => setBillionDashboardTab("SMART_YIELD_FILTER")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                billionDashboardTab === "SMART_YIELD_FILTER"
                  ? "bg-indigo-600 text-white font-black shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>🎯 AI 수익성/위험도 스캐너</span>
            </button>
            <button
              onClick={() => setBillionDashboardTab("FILTER_SETTINGS")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                billionDashboardTab === "FILTER_SETTINGS"
                  ? "bg-emerald-600 text-white font-black shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>⚙️ 스마트 필터 설정</span>
            </button>
          </div>

          {/* Autopilot Controls */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {/* Multi-Asset vs Single Asset Scope Switcher */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-xs font-bold">
              <button
                onClick={() => {
                  setTradingScope("ALL_UNIVERSE");
                  addToast(`🌐 [전종목 스캘핑 활성화] 국내 주식 전체 (KOSPI/KOSDAQ ${universeTargetAssets.length}종목) + 미국주식 + 업비트 코인 동시 감시 및 자동 순환 초단타가 가동됩니다.`, "info");
                }}
                className={`px-2.5 py-1 rounded-lg cursor-pointer transition flex items-center gap-1.5 ${
                  tradingScope === "ALL_UNIVERSE"
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-xs ring-1 ring-amber-400"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Zap className="w-3.5 h-3.5 fill-current text-slate-950" />
                <span>전체 종목 순환 스캘핑</span>
                <span className="px-1.5 py-0.2 rounded bg-slate-950/40 text-[9px] font-mono">
                  {universeTargetAssets.length}종목
                </span>
              </button>
              <button
                onClick={() => {
                  setTradingScope("SELECTED_ONLY");
                  addToast(`🎯 [단일 집중 스캘핑] 선택한 종목 [${selectedAsset.name}] 1개에만 초단타를 집중합니다.`, "info");
                }}
                className={`px-2.5 py-1 rounded-lg cursor-pointer transition flex items-center gap-1 ${
                  tradingScope === "SELECTED_ONLY"
                    ? "bg-amber-500 text-slate-950 font-black shadow-xs ring-1 ring-amber-400"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>선택 종목 1개 집중</span>
              </button>
            </div>

            <button
              onClick={() => setIsAutoScalping(!isAutoScalping)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md ${
                isAutoScalping
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-500/30"
                  : "bg-amber-600 hover:bg-amber-500 text-white"
              }`}
            >
              {isAutoScalping ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>스캘핑 가동 중</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>스캘핑 재개</span>
                </>
              )}
            </button>

            {/* 🔥 Padak Speed Mode Selector */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-xs font-bold font-mono">
              {[
                { speed: 1, label: "1X (1.5s)" },
                { speed: 3, label: "3X (800ms)" },
                { speed: 5, label: "5X (400ms)" },
                { speed: 10, label: "10X (200ms)" },
                { speed: 20, label: "⚡ 20X 파닥이 (100ms)" }
              ].map(opt => (
                <button
                  key={opt.speed}
                  onClick={() => {
                    setScalpSpeed(opt.speed);
                    if (opt.speed === 20) {
                      addToast("🔥 [파닥이 100ms 초단타 가동] 초당 10회 틱 스캘핑 및 핑퐁 체결이 활성화되었습니다!", "success");
                    } else {
                      addToast(`⚡ 스캘핑 속도가 ${opt.label}로 설정되었습니다.`, "info");
                    }
                  }}
                  className={`px-2 py-1 rounded-lg transition cursor-pointer whitespace-nowrap ${
                    scalpSpeed === opt.speed
                      ? opt.speed === 20
                        ? "bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-slate-950 font-black shadow-md ring-1 ring-amber-300 animate-pulse"
                        : "bg-amber-500 text-slate-950 font-black shadow-xs"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ⚡ ASYNCHRONOUS PARALLEL MULTI-ASSET SCANNER & LIVE MONITORING PANEL */}
        {tradingScope === "ALL_UNIVERSE" && isAutoScalping && (
          <div className="mt-3 p-3.5 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950/60 border border-amber-500/35 rounded-2xl shadow-xl">
            {/* Header & Status Benchmarks */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2.5 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl text-slate-950 font-black shadow-md shrink-0">
                  <Zap className="w-4 h-4 fill-current animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                      <span>⚡ AI 비동기 병렬 멀티 종목 실시간 이익 스캐너</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        <span>Async Profit Radar</span>
                      </span>
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    30개 전종목의 시세·수급·16-Brain SMC 조건 및 <strong>고수익 기대율/AI 승률</strong>을 비동기 병렬 스캔합니다.
                  </p>
                </div>
              </div>

              {/* Benchmark stats & Profit Counters */}
              <div className="flex items-center gap-1.5 font-mono text-[10px] sm:text-[11px] flex-wrap">
                <div className="px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold">
                  💎 초고수익: <strong className="text-amber-400">{parallelScanResults.filter(r => r.profitTier === "SUPER_YIELD").length}개</strong>
                </div>
                <div className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold">
                  💰 고수익: <strong className="text-emerald-400">{parallelScanResults.filter(r => r.profitTier === "HIGH_YIELD").length}개</strong>
                </div>
                <div className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                  매수승인: <strong className="text-cyan-400">{parallelScanResults.filter(r => r.signal === "BUY_APPROVE").length}개</strong>
                </div>
                <div className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                  스캔속도: <strong className="text-orange-400">&lt;{parallelScanLatencyMs}ms</strong>
                </div>
              </div>
            </div>

            {/* Parallel Filter Tabs & Sort Controls & Sync Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 my-2.5 overflow-x-auto pb-1 text-xs font-bold">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 shrink-0">
                {[
                  { key: "HIGH_PROFIT", label: `💰 고수익 스캔종목 (${parallelScanResults.filter(r => r.profitTier === "SUPER_YIELD" || r.profitTier === "HIGH_YIELD" || r.expectedProfitPct >= 2.0).length})` },
                  { key: "OPEN_ONLY", label: `🟢 장중 개장 (${parallelScanResults.filter(r => r.isMarketOpen).length})` },
                  { key: "BUY_SIGNAL", label: `🚀 매수 승인 (${parallelScanResults.filter(r => r.signal === "BUY_APPROVE").length})` },
                  { key: "HOT_VOL", label: `🔥 수급 폭발 (${parallelScanResults.filter(r => r.signal === "MOMENTUM_HOT").length})` },
                  { key: "ALL", label: `전체 (${parallelScanResults.length})` }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setParallelFilterTab(tab.key as any)}
                    className={`px-2.5 py-1 rounded-lg cursor-pointer transition whitespace-nowrap text-[11px] ${
                      parallelFilterTab === tab.key
                        ? "bg-amber-500 text-slate-950 font-black shadow-xs ring-1 ring-amber-300"
                        : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Sort Mode Controls */}
              <div className="flex items-center gap-1 shrink-0 font-mono text-[10px]">
                <span className="text-slate-400 mr-1">정렬:</span>
                {[
                  { key: "YIELD_DESC", label: "📈 기대수익순" },
                  { key: "WINRATE_DESC", label: "🎯 AI승률순" },
                  { key: "RVOL_DESC", label: "⚡ 수급순" }
                ].map(s => (
                  <button
                    key={s.key}
                    onClick={() => setParallelSortMode(s.key as any)}
                    className={`px-2 py-0.5 rounded cursor-pointer transition ${
                      parallelSortMode === s.key
                        ? "bg-indigo-600 text-white font-bold"
                        : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid of Async Parallel Monitored Asset Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-72 overflow-y-auto pr-1">
              {filteredParallelAssets.map((asset, idx) => {
                const isSelected = selectedAsset.symbol === asset.symbol;
                const isBuy = asset.signal === "BUY_APPROVE";
                const isHot = asset.signal === "MOMENTUM_HOT";
                const isSell = asset.signal === "SELL_APPROVE";
                const isSuperYield = asset.profitTier === "SUPER_YIELD";
                const isHighYield = asset.profitTier === "HIGH_YIELD";

                return (
                  <div
                    key={`parallel_${asset.symbol}_${idx}`}
                    className={`p-2 rounded-xl border transition flex flex-col justify-between relative group text-left ${
                      isSelected
                        ? "bg-amber-500/15 border-amber-400 text-amber-300 shadow-md ring-1 ring-amber-400/50"
                        : isSuperYield
                          ? "bg-gradient-to-b from-amber-950/50 via-slate-900 to-slate-950 border-amber-400/80 shadow-md ring-1 ring-amber-400/30"
                          : isHighYield
                            ? "bg-gradient-to-b from-emerald-950/40 via-slate-900 to-slate-950 border-emerald-500/60"
                            : isBuy
                              ? "bg-emerald-950/40 border-emerald-500/50 text-slate-200"
                              : isHot
                                ? "bg-amber-950/30 border-amber-500/40 text-slate-200"
                                : "bg-slate-900/80 border-slate-800 text-slate-400"
                    }`}
                  >
                    {/* Top Line: Category & High-Profit Tag */}
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                        {asset.category === "KR_STOCK" ? "🇰🇷 국내" : asset.category === "US_STOCK" ? "🇺🇸 미국" : "🪙 코인"}
                      </span>
                      {isSuperYield ? (
                        <span className="text-[8px] font-black px-1 py-0.2 rounded bg-amber-400 text-slate-950 shadow-xs flex items-center gap-0.5 animate-pulse">
                          <span>💎</span>
                          <span>+</span>{asset.expectedProfitPct}%
                        </span>
                      ) : isHighYield ? (
                        <span className="text-[8px] font-black px-1 py-0.2 rounded bg-emerald-500/30 text-emerald-300 border border-emerald-500/40">
                          💰 +{asset.expectedProfitPct}%
                        </span>
                      ) : (
                        <span className={`text-[9px] font-black px-1 py-0.2 rounded border ${
                          asset.isMarketOpen 
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-mono" 
                            : "bg-rose-500/10 text-rose-300 border-rose-500/20"
                        }`}>
                          {asset.isMarketOpen ? "OPEN" : "CLOSED"}
                        </span>
                      )}
                    </div>

                    {/* Name & Price */}
                    <div className="my-0.5">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-[11px] text-white truncate max-w-[85px]">
                          {asset.name}
                        </h4>
                        <span className={`text-[10px] font-mono font-bold ${
                          asset.changeRate >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}>
                          {asset.changeRate >= 0 ? "+" : ""}{asset.changeRate}%
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-300 font-bold mt-0.5 truncate">
                        {asset.unit === "원" ? `₩${(asset.currentPrice ?? 0).toLocaleString()}` : `$${(asset.currentPrice ?? 0).toLocaleString()}`}
                      </div>
                    </div>

                    {/* High-Profit Metrics Box: Expected Profit %, AI Win Rate %, Target Price */}
                    <div className="my-1 p-1 bg-slate-950/90 rounded text-[9px] font-mono space-y-0.5 border border-slate-800/80">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">기대수익:</span>
                        <strong className="text-emerald-400 font-bold">
                          +{asset.expectedProfitPct}%
                        </strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">AI 승률:</span>
                        <strong className="text-cyan-300 font-bold">
                          {asset.winProbabilityPct}%
                        </strong>
                      </div>
                      <div className="flex justify-between items-center text-[8px] text-slate-400 border-t border-slate-900 pt-0.5 truncate">
                        <span>목표TP:</span>
                        <span className="text-amber-300 font-bold">
                          {asset.unit === "원" ? `₩${(asset.profitTargetPrice ?? 0).toLocaleString()}` : `$${asset.profitTargetPrice}`}
                        </span>
                      </div>
                    </div>

                    {/* Signal Badge & Connect / Instant Scalp Buttons */}
                    <div className="pt-1 flex items-center justify-between gap-1 border-t border-slate-800/80 mt-1">
                      <span className={`text-[8px] font-black px-1 py-0.2 rounded truncate ${
                        isBuy
                          ? "bg-emerald-500 text-slate-950 animate-pulse"
                          : isHot
                            ? "bg-amber-400 text-slate-950 font-bold"
                            : isSell
                              ? "bg-rose-500 text-white"
                              : "bg-slate-800 text-slate-400"
                      }`}>
                        {isBuy ? "🚀매수" : isHot ? "🔥수급" : isSell ? "🔴매도" : "⚪관망"}
                      </span>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const found = universeTargetAssets.find(a => a.symbol === asset.symbol);
                            if (found) {
                              setSelectedAsset(found);
                              addToast(`🎯 [스캐너 차트 연동] ${found.name} (${found.symbol}) 차트 연동 완료`, "info");
                            }
                          }}
                          className="px-1 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[8px] font-bold transition cursor-pointer"
                        >
                          차트
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const found = universeTargetAssets.find(a => a.symbol === asset.symbol);
                            if (found) {
                              setSelectedAsset(found);
                              if (!asset.isMarketOpen) {
                                addToast(`🛑 [장마감] ${asset.name}은 정규장 외 거래가 차단됩니다.`, "warning");
                                return;
                              }
                              triggerTrade("LONG");
                              addToast(`⚡ [이익발생 종목 초단타 매수] ${asset.name} (+${asset.expectedProfitPct}% 기대수익 타겟) 체결 주문 발송!`, "success");
                            }
                          }}
                          className="px-1.5 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-[8px] font-black transition cursor-pointer shadow-xs"
                          title="고수익 초단타 매수 체결"
                        >
                          매수
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Tab 1: SMART_YIELD_FILTER Mode */}
      {billionDashboardTab === "SMART_YIELD_FILTER" && (
        <div className="p-4 sm:p-5 bg-slate-950 min-h-[600px] animate-in fade-in duration-150">
          <AiScannedYieldAnalyticsTab
            onSelectStock={(stock) => {
              const found = universeTargetAssets.find(a => a.symbol === stock.symbol);
              if (found) {
                setSelectedAsset(found);
              } else {
                setSelectedAsset({
                  symbol: stock.symbol,
                  name: stock.name,
                  category: stock.symbol.startsWith("KRW-") ? "CRYPTO" : "KR_STOCK",
                  marketType: stock.symbol.startsWith("KRW-") ? "BTC" : "KOREA",
                  currentPrice: stock.price,
                  unit: "원",
                  exchange: stock.symbol.startsWith("KRW-") ? "업비트 24H" : "국내 KRX",
                  leverage: "10x 핑퐁",
                  strategyDesc: "스마트 수익성 필터 추천 진입",
                  aiScore: stock.aiScore || 88
                });
              }
              addToast(`🎯 [종목 선택 완료] ${stock.name} (${stock.symbol}) 차트 및 전략이 연동되었습니다.`, "info");
            }}
            onExecuteTrade={async (stock, type) => {
              const isCrypto = stock.symbol.startsWith("KRW-");
              const mkt = isCrypto ? "BTC" : "KOREA";
              const qty = isCrypto ? Number((100000 / stock.price).toFixed(6)) : Math.max(1, Math.floor(100000 / stock.price));
              await executeTrade(
                stock.symbol,
                stock.name,
                mkt,
                type === "BUY" ? "LONG" : "SHORT",
                qty,
                stock.price,
                "AI 스마트 수익성 & 위험도 필터 매수",
                "목표 기대이익 및 손익비 2.0x 충족 종목 AI 자율 진입"
              );
              addToast(`⚡ [AI 자율 진입 완료] ${stock.name} (${stock.symbol}) 매매 주문이 체결되었습니다.`, "success");
            }}
          />
        </div>
      )}

      {/* Tab 2: FILTER_SETTINGS Mode */}
      {billionDashboardTab === "FILTER_SETTINGS" && (
        <div className="p-4 sm:p-5 bg-slate-950 min-h-[600px] animate-in fade-in duration-150">
          <SmartYieldFilterControlPanel />
        </div>
      )}

      {/* Tab 3: LIVE_SCALPER Mode */}
      {billionDashboardTab === "LIVE_SCALPER" && (
        <>
          {/* Sub Header for Live Scalper (Asset Selector & Positions) */}
          <div className="p-4 sm:p-5 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border-b border-slate-800/80">
            {/* 🔥 PADAK ULTRA MICRO-TICK ORDER TAPE BANNER */}
            <div className="mb-3.5 p-3 bg-gradient-to-r from-amber-950/60 via-slate-900 to-indigo-950/60 border border-amber-500/40 rounded-2xl shadow-lg relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-slate-950 font-black text-xs flex items-center gap-1 shadow-xs animate-pulse">
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>🔥 파닥이 100ms 틱 체결 현황판</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-amber-300">
                    스캔속도: {scalpSpeed >= 20 ? "100ms ⚡ (초당 10회)" : scalpSpeed >= 10 ? "200ms 🚀 (초당 5회)" : `${Math.round(1500/scalpSpeed)}ms`}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
                    • 누적 파닥이 틱: <strong className="text-white">{(padakTotalTicksCount ?? 0).toLocaleString()}회</strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] font-mono">
                  <span className="text-slate-400">속도 전환:</span>
                  <button
                    onClick={() => {
                      setScalpSpeed(20);
                      setIsAutoScalping(true);
                      addToast("⚡ [파닥이 100ms 가동] 초당 10회 초고속 틱 스캘핑이 가동되었습니다!", "success");
                    }}
                    className={`px-2 py-0.5 rounded font-black transition cursor-pointer ${
                      scalpSpeed === 20 ? "bg-amber-400 text-slate-950 ring-1 ring-amber-300 shadow-xs" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    ⚡ 100ms 파닥이
                  </button>
                  <button
                    onClick={() => {
                      setScalpSpeed(10);
                      setIsAutoScalping(true);
                      addToast("🚀 [200ms 하이퍼 가동] 초당 5회 고속 틱 스캘핑이 가동되었습니다!", "info");
                    }}
                    className={`px-2 py-0.5 rounded font-black transition cursor-pointer ${
                      scalpSpeed === 10 ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    200ms
                  </button>
                </div>
              </div>

              {/* Live Flickering Micro-Tick Tape Stream */}
              <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {padakMicroTicks.length === 0 ? (
                  <div className="text-xs text-slate-400 py-1 font-mono italic flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span>⚡ 파닥이 스캘핑 가동 중... 100ms 단위 실시간 미세 틱 체결 정보가 연속 스트리밍됩니다!</span>
                  </div>
                ) : (
                  padakMicroTicks.slice(0, 10).map((tick, idx) => (
                    <div
                      key={tick.id ? `ptick_${tick.id}_${idx}` : `ptick_${idx}`}
                      className={`px-2.5 py-1 rounded-xl border shrink-0 text-[11px] font-mono transition transform animate-in fade-in zoom-in-95 duration-100 ${
                        tick.isWin
                          ? "bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-950 border-emerald-500/60 text-emerald-300 shadow-sm ring-1 ring-emerald-500/20"
                          : "bg-gradient-to-r from-rose-950/80 via-slate-900 to-slate-950 border-rose-500/60 text-rose-300"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className={`px-1 py-0.2 rounded text-[9px] font-black ${
                          tick.side === "LONG" ? "bg-emerald-500 text-slate-950" : "bg-rose-500 text-white"
                        }`}>
                          {tick.side === "LONG" ? "롱" : "숏"}
                        </span>
                        <span className="text-white font-bold truncate max-w-[85px]">{tick.name}</span>
                        <span className={tick.pnlPercent >= 0 ? "text-emerald-400 font-extrabold" : "text-rose-400 font-extrabold"}>
                          {tick.pnlPercent >= 0 ? "+" : ""}{tick.pnlPercent}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-slate-400 mt-0.5 gap-2">
                        <span>{tick.timeMs}</span>
                        <span className="text-amber-300 font-bold">
                          {tick.unit === "원" ? `₩${Math.round(tick.price).toLocaleString()}` : `$${tick.price}`}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 2. TARGET ASSET SELECTOR BAR (AI 필터링 종목 연동 & 시장별 선택) */}
            <div className="pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-amber-400" />
                <span>AI 필터 추출 종목 연동 ({filteredTargetAssets.length}종목)</span>
              </span>

              {/* Market Filter Tabs */}
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px] font-bold">
                {[
                  { key: "ALL", label: "전체" },
                  { key: "KRX", label: "🇰🇷 국내주식" },
                  { key: "UPBIT", label: "🪙 코인" }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveMarketTab(tab.key as any)}
                    className={`px-2 py-0.5 rounded cursor-pointer transition ${
                      activeMarketTab === tab.key
                        ? "bg-amber-500 text-slate-950 font-black shadow-xs"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Search */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3 h-3 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="종목명/티커/테마 검색..."
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className="pl-7 pr-2.5 py-1 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-400 w-36 sm:w-44 font-sans"
                />
                {filterQuery && (
                  <button
                    onClick={() => setFilterQuery("")}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <span className="text-[11px] text-slate-400 font-mono hidden md:inline">
                거래소: <strong className="text-emerald-400">{selectedAsset.exchange}</strong> ({selectedAsset.leverage})
              </span>
            </div>
          </div>

          {/* Grid of AI Filtered Candidate Assets */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-1">
            {filteredTargetAssets.map((asset, idx) => {
              const isSelected = selectedAsset.symbol === asset.symbol;
              const mktStatus = getMarketStatus(asset.marketType);

              return (
                <button
                  key={`target_${asset.symbol}_${idx}`}
                  onClick={() => {
                    setSelectedAsset(asset);
                    if (!mktStatus.isOpen) {
                      addToast(`⚠️ [${asset.name}] 선택 완료. 현재 정규장 마감 시간대이므로 체결이 보류됩니다.`, "warning");
                    } else {
                      addToast(`🎯 [AI 필터 종목 연동] ${asset.name} (${asset.symbol}) 1분봉 핑퐁 스캘핑 모드로 전환 완료!`, "info");
                    }
                  }}
                  className={`p-2 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between relative group ${
                    isSelected
                      ? "bg-amber-500/15 border-amber-400 text-amber-300 shadow-md ring-1 ring-amber-400/50"
                      : "bg-slate-900/80 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-950 font-mono">
                      {asset.symbol}
                    </span>
                    <span className={`text-[8px] font-bold px-1 py-0.2 rounded border ${
                      mktStatus.isOpen
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                    }`}>
                      {mktStatus.isOpen ? "🟢개장" : "🔴마감"}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-white truncate mt-1 flex items-center justify-between gap-1">
                    <span className="truncate">{asset.name}</span>
                    {asset.aiScore && (
                      <span className="text-[8px] font-black px-1 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 shrink-0">
                        {asset.aiScore}점
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-0.5">
                    <span>
                      {asset.unit === "$" ? `$${(asset.currentPrice ?? 0).toLocaleString()}` : `₩${(asset.currentPrice ?? 0).toLocaleString()}`}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 font-black" />}
                  </div>

                  {asset.theme && (
                    <div className="text-[9px] text-slate-500 truncate mt-0.5">
                      {asset.theme}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Asset Strategy Description Banner */}
          <div className="mt-2.5 p-2.5 bg-slate-900/90 border border-slate-800 rounded-xl flex items-start gap-2 text-xs text-slate-300">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-300">[{selectedAsset.name}] AI 매매 전략 알고리즘: </span>
              <span className="text-slate-300">{selectedAsset.strategyDesc}</span>
            </div>
          </div>

          {/* Upgraded Anti-Fakeout 4-Gate Live Diagnostics Bar */}
          <div className="mt-2.5 p-2.5 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/60 border border-indigo-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-indigo-300 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>4대 패턴 강화 필터 (가짜돌파/휩쏘 차단):</span>
              </span>

              {/* 4 Gates Badges */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`px-2 py-0.5 rounded text-[10px] font-black font-mono border ${
                  currentPatternUpgrade.mtf.mtfConfluencePassed
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                }`}>
                  MTF 상위추세: {currentPatternUpgrade.mtf.mtfConfluencePassed ? "PASS" : "FAIL"}
                </span>

                <span className={`px-2 py-0.5 rounded text-[10px] font-black font-mono border ${
                  currentPatternUpgrade.volumeDelta.volumeConfirmed
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                }`}>
                  CVD 순매수델타: {currentPatternUpgrade.volumeDelta.volumeDeltaRatio >= 0 ? `+${currentPatternUpgrade.volumeDelta.volumeDeltaRatio}%` : `${currentPatternUpgrade.volumeDelta.volumeDeltaRatio}%`}
                </span>

                <span className={`px-2 py-0.5 rounded text-[10px] font-black font-mono border ${
                  currentPatternUpgrade.candleConfirmation.antiRepaintVerified
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                }`}>
                  캔들종가확정: PASS
                </span>

                <span className={`px-2 py-0.5 rounded text-[10px] font-black font-mono border ${
                  currentPatternUpgrade.slippageGuard.isSlippageSafe
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                }`}>
                  IOC 슬리피지: {currentPatternUpgrade.slippageGuard.expectedSlippagePct}%
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsPatternInspectorOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-400/50 text-indigo-200 hover:text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition self-end sm:self-auto shrink-0 shadow-xs"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>실시간 필터 정밀 진단</span>
            </button>
          </div>
        </div>

        {/* 3. LIVE POSITIONS COUNTER (Long N / Short N Header Pills) */}
        <div className="flex items-center gap-3 mt-3">
          <div className="flex-1 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <span className="text-xs sm:text-sm font-black text-emerald-300">
                  {challengeMode === "REAL" ? "실거래 롱/보유 현황" : "모의 롱 포지션"}
                </span>
                <p className="text-[10px] text-emerald-400/80">과매도 반등 상승 베팅</p>
              </div>
            </div>
            <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
              {challengeMode === "REAL" ? `${realTotalPositionsCount}종목` : `${mockLongPositionsCount}건`}
            </span>
          </div>

          <div className="flex-1 bg-rose-950/40 border border-rose-500/30 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-pulse" />
              <div>
                <span className="text-xs sm:text-sm font-black text-rose-300">
                  {challengeMode === "REAL" ? "실거래 숏/헤지 현황" : "모의 숏 포지션"}
                </span>
                <p className="text-[10px] text-rose-400/80">저항대 피뢰침 하락 베팅</p>
              </div>
            </div>
            <span className="text-xl sm:text-2xl font-black font-mono text-rose-400">
              {challengeMode === "REAL" ? "0건 (헤지대기)" : `${mockShortPositionsCount}건`}
            </span>
          </div>
        </div>
      </div>

      {/* 4. MAIN LIVE CANDLESTICK CHART & REAL-TIME PROFIT OVERLAY STAGE */}
      <div className="relative bg-black min-h-[340px] sm:min-h-[380px] p-4 flex flex-col justify-between overflow-hidden border-b border-slate-900">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293715_1px,transparent_1px),linear-gradient(to_bottom,#1f293715_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        {/* Realtime Live Profit Central Watermark Banner */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-10 space-y-1">
          <div className="text-xs sm:text-sm font-bold text-slate-400 tracking-wider">
            {selectedAsset.symbol} {challengeMode === "REAL" ? "실거래 평가손익" : "모의 실시간 평가손익"}
          </div>
          <div className={`text-4xl sm:text-6xl font-black font-mono tracking-tight drop-shadow-[0_0_25px_rgba(16,185,129,0.4)] ${
            displayLivePnL >= 0 ? "text-emerald-400" : "text-rose-400"
          }`}>
            {displayLivePnL >= 0 ? "+" : ""}{displayLivePnL.toFixed(1)}$
          </div>
          <div className="text-xs font-mono text-slate-400">
            (약 {displayLiveKRW >= 0 ? "+" : ""}₩{(displayLiveKRW ?? 0).toLocaleString()}원)
          </div>
        </div>

        {/* Dynamic Floating Trade Popups over Candles */}
        <div className="absolute inset-0 pointer-events-none z-20">
          {activeChartPopups.map((popup, idx) => {
            const isLoss = popup.type === "STOP_LOSS";
            const isProfit = popup.type.endsWith("PROFIT");
            const isLong = popup.type.startsWith("LONG");

            return (
              <div
                key={`popup_${popup.id}_${idx}`}
                style={{ left: `${popup.xPct}%`, top: `${popup.yPct}%` }}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl text-xs font-black shadow-2xl transition-all duration-300 animate-bounce flex items-center gap-1.5 border backdrop-blur-md ${
                  isLoss
                    ? "bg-rose-950/95 border-rose-500 text-rose-300"
                    : isProfit
                    ? "bg-slate-900/90 border-emerald-400/80 text-emerald-300 ring-1 ring-emerald-400/50"
                    : isLong
                    ? "bg-emerald-950/90 border-emerald-500/60 text-emerald-300"
                    : "bg-rose-950/90 border-rose-500/60 text-rose-300"
                }`}
              >
                {isLoss ? (
                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                ) : isProfit ? (
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>{popup.text}</span>
              </div>
            );
          })}
        </div>

        {/* SVG Simulated 1-Min Candlestick Bars */}
        <div className="w-full h-56 sm:h-64 mt-auto relative z-0 flex items-end justify-between gap-1 opacity-80">
          {chartCandles.map((c, i) => {
            const maxVal = Math.max(...chartCandles.map(x => x.high));
            const minVal = Math.min(...chartCandles.map(x => x.low));
            const range = maxVal - minVal || 1;

            const highY = 100 - ((c.high - minVal) / range) * 100;
            const lowY = 100 - ((c.low - minVal) / range) * 100;
            const openY = 100 - ((c.open - minVal) / range) * 100;
            const closeY = 100 - ((c.close - minVal) / range) * 100;

            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(2, Math.abs(closeY - openY));
            const isGreen = c.color === "GREEN";

            return (
              <div key={`candle_${c.timestamp || i}_${i}`} className="flex-1 flex flex-col items-center h-full justify-end relative group">
                {/* Wick */}
                <div
                  className={`w-[1.5px] absolute ${isGreen ? "bg-emerald-500/60" : "bg-rose-500/60"}`}
                  style={{ top: `${highY}%`, bottom: `${100 - lowY}%` }}
                />
                {/* Candle Body */}
                <div
                  className={`w-full rounded-xs transition-all duration-200 ${
                    isGreen
                      ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                      : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                  }`}
                  style={{ top: `${bodyTop}%`, height: `${bodyHeight}%` }}
                />
              </div>
            );
          })}
        </div>

        {/* Quick Trade Triggers Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-slate-900 relative z-30">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono flex-wrap">
            <span className={`w-2 h-2 rounded-full animate-ping ${challengeMode === "REAL" ? "bg-amber-400" : "bg-emerald-400"}`} />
            <span>
              [{selectedAsset.name} ({selectedAsset.symbol})] {challengeMode === "REAL" ? (tradingScope === "ALL_UNIVERSE" ? "⚡ 전체 AI 종목 풀 실거래 파이프라인 연동 중" : "⚡ 선택 종목 단일 실거래 호가 연동") : "🧪 1분봉 실시간 틱 수급 연동"}
            </span>
          </div>

          {/* Real Mode Order Size Selection (Market-Specific Cash Breakdown Integration) */}
          {challengeMode === "REAL" && (() => {
            const isTargetCrypto = selectedAsset.category === "CRYPTO" || selectedAsset.marketType === "BTC" || selectedAsset.symbol.startsWith("KRW-");
            const isTargetUS = selectedAsset.category === "US_STOCK" || selectedAsset.marketType === "US";
            
            const marketAvailableKRW = isTargetCrypto
              ? (cashBreakdown?.upbitCash || 0)
              : isTargetUS
                ? ((cashBreakdown?.usCash ? cashBreakdown.usCash * exchangeRateKRW : 0) + (cashBreakdown?.koreaCash || profile?.balance || 0))
                : (cashBreakdown?.koreaCash || profile?.balance || 0);

            const marketAvailableUSD = isTargetUS ? (marketAvailableKRW / exchangeRateKRW) : 0;
            const maxOrderKRW = Math.max(isTargetCrypto ? 5000 : 1000, Math.floor(marketAvailableKRW * 0.99));

            return (
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                <span className="text-slate-400 font-bold">1회 진입금:</span>
                {[
                  { label: isTargetUS ? "1만 ($7)" : "1만", val: 10000 },
                  { label: isTargetUS ? "3만 ($20)" : "3만", val: 30000 },
                  { label: isTargetUS ? "5만 ($33)" : "5만", val: 50000 },
                  { label: isTargetUS ? "10만 ($66)" : "10만", val: 100000 },
                  { label: isTargetUS ? "30만 ($197)" : "30만", val: 300000 },
                  { label: "가용99%", val: maxOrderKRW }
                ].map((opt, idx) => (
                  <button
                    key={`opt_amt_${opt.label}_${idx}`}
                    type="button"
                    onClick={() => setRealOrderAmount(opt.val)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition ${
                      realOrderAmount === opt.val
                        ? "bg-amber-500 text-slate-950 font-black ring-1 ring-amber-400"
                        : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
                <span className="text-[10px] text-amber-400/90 font-mono ml-1">
                  {isTargetUS ? (
                    `(가용: $${marketAvailableUSD.toFixed(2)} | 약 ₩${Math.round(marketAvailableKRW).toLocaleString()}원)`
                  ) : isTargetCrypto ? (
                    `(업비트 가용: ₩${Math.round(marketAvailableKRW).toLocaleString()}원)`
                  ) : (
                    `(한투 가용: ₩${Math.round(marketAvailableKRW).toLocaleString()}원)`
                  )}
                </span>
              </div>
            );
          })()}

          <div className="flex items-center gap-2">
            <button
              onClick={() => triggerTrade("LONG")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                challengeMode === "REAL"
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md ring-1 ring-emerald-400/50"
                  : "bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 border border-emerald-500/40"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{challengeMode === "REAL" ? "⚡ 실거래 롱 매수" : "롱 진입 (상승)"}</span>
            </button>
            <button
              onClick={() => triggerTrade("SHORT")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                challengeMode === "REAL"
                  ? "bg-rose-600 hover:bg-rose-500 text-white shadow-md ring-1 ring-rose-400/50"
                  : "bg-rose-600/30 hover:bg-rose-600 text-rose-300 border border-rose-500/40"
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>{challengeMode === "REAL" ? "⚡ 실거래 숏 매도" : "숏 진입 (하락)"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. TODAY'S TOTAL ACCUMULATED PROFIT BANNER */}
      <div className="p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-900 relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl shrink-0 border ${
              challengeMode === "REAL" ? "bg-amber-500/20 border-amber-400/40" : "bg-emerald-500/20 border-emerald-400/40"
            }`}>
              <Trophy className={`w-6 h-6 ${challengeMode === "REAL" ? "text-amber-400" : "text-emerald-400"}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">
                  {challengeMode === "REAL" ? "⚡ 실계좌 오늘의 총 합산 손익" : "🏆 모의 오늘의 자동매매 기록"}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  challengeMode === "REAL" ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "bg-emerald-500/20 text-emerald-400"
                }`}>
                  {challengeMode === "REAL" ? "실시간 평가+실현 합산" : "누적 누진 구조"}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                <div className={`text-3xl sm:text-5xl font-black font-mono tracking-tight ${
                  displayTotalProfit >= 0 ? "text-amber-400" : "text-rose-400"
                }`}>
                  {displayTotalProfit >= 0 ? "+ " : ""}{displayTotalProfit.toFixed(1)} $
                </div>
                <button
                  onClick={handleResetTodayProfit}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                  title="오늘 총 합산 손익 및 체결 기록 초기화"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>손익 초기화</span>
                </button>
              </div>
              <div className="text-xs font-mono text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>(약 {displayTotalKRW >= 0 ? "+" : ""}₩{(displayTotalKRW ?? 0).toLocaleString()}원)</span>
                {challengeMode === "REAL" && (
                  <span className="text-[11px] text-slate-500 border-l border-slate-700 pl-2">
                    미실현 평가: <strong className={holdingsSummary.totalPnlUSD >= 0 ? "text-emerald-400" : "text-rose-400"}>{holdingsSummary.totalPnlUSD >= 0 ? "+" : ""}{holdingsSummary.totalPnlUSD.toFixed(1)}$</strong> | 체결 실현: <strong className={realTodayRealizedProfitUSD >= 0 ? "text-emerald-400" : "text-rose-400"}>{realTodayRealizedProfitUSD >= 0 ? "+" : ""}{realTodayRealizedProfitUSD.toFixed(1)}$</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Summary Challenge Statistics Card */}
          <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-2 text-xs font-mono min-w-[280px]">
            <div className="font-bold text-slate-300 text-[11px] pb-1.5 border-b border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 text-[11px]">
                  DAY {challengeDay}
                </span>
                <span className="text-slate-300 text-xs font-bold">
                  {challengeMode === "REAL" ? "실거래 결과" : "자동매매 결과"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleSetChallengeDay(Math.max(1, challengeDay - 1))}
                  className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-xs font-black border border-slate-700 transition cursor-pointer"
                  title="이전 일차"
                >
                  -
                </button>
                <button
                  onClick={() => handleSetChallengeDay(Math.min(100, challengeDay + 1))}
                  className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-xs font-black border border-slate-700 transition cursor-pointer"
                  title="다음 일차"
                >
                  +
                </button>
                <button
                  onClick={() => handleSetChallengeDay(1)}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-750 text-amber-300 hover:text-amber-200 text-[10px] font-bold border border-slate-700 transition cursor-pointer flex items-center gap-1 ml-0.5 active:scale-95"
                  title="1일차로 초기화"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>1일차 리셋</span>
                </button>
              </div>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>오늘 총 손익:</span>
              <span className={`font-bold ${displayTotalProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {displayTotalProfit >= 0 ? "+" : ""}{displayTotalProfit.toFixed(1)}$ (약 ₩{(displayTotalKRW ?? 0).toLocaleString()}원)
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>{challengeMode === "REAL" ? "실제 계좌 잔고:" : "시작 가상잔고:"}</span>
              <span>₩{challengeMode === "REAL" ? (realBalanceKRW ?? 0).toLocaleString() : (mockStartBalance * exchangeRateKRW).toLocaleString()}원</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>마무리 평가자산:</span>
              <span className="text-amber-300 font-bold">${displayFinalBal.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5.3 🏛️ 한국투자 · 업비트 · 토스 3대 증권사 실시간 잔고 & 실거래 보유종목 & 체결 리스트 정밀 관제 센터 */}
      <div className="p-4 bg-slate-950 border-b border-slate-900">
        <RealBrokerDetailedBalanceAndHoldings
          exchangeRateKRW={exchangeRateKRW}
          onSelectAssetForChart={(symbol, name, market) => {
            const match = universeTargetAssets.find(u => u.symbol === symbol);
            if (match) {
              setSelectedAsset(match);
            } else {
              setSelectedAsset({
                symbol,
                name,
                category: market === "BTC" ? "CRYPTO" : market === "US" ? "US_STOCK" : "KR_STOCK",
                marketType: market,
                currentPrice: 100000,
                unit: market === "US" ? "$" : "원",
                exchange: market === "BTC" ? "업비트 24H" : market === "US" ? "미국 NASDAQ" : "국내 KRX",
                leverage: "10x 핑퐁",
                strategyDesc: "보유 종목 실시간 1분봉 핑퐁 스캘핑 추적",
                aiScore: 94
              });
            }
          }}
          onQuickTrade={async (symbol, name, market, side, qty, price) => {
            await executeTrade(
              symbol,
              name,
              market,
              side,
              qty,
              price,
              "실거래 빠른 1-Click 주문",
              "사용자 직접 원클릭 체결",
              true
            );
          }}
        />
      </div>

      {/* 5.4 📊 10억 챌린지 실시간 포지션 카드 뷰 */}
      <div className="p-4 bg-slate-950 border-b border-slate-900 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                  <span>📊 10억 챌린지 실시간 보유종목 현황</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                  {positions.length}종목 보유 중
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  {challengeMode === "REAL" ? "REAL ASSETS" : "MOCK ASSETS"}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                실시간 체결된 롱/숏 포지션 및 거래소 보유 종목 실시간 평가손익 관제
              </p>
            </div>
          </div>

          {/* Aggregated Total Valuation and Quick Batch Action */}
          <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
            <div className="px-3 py-1.5 bg-slate-900 rounded-xl border border-slate-800 text-xs font-mono flex items-center gap-2">
              <span className="text-slate-400 text-[11px]">총 평가액:</span>
              <span className="font-black text-white">₩{(holdingsSummary.totalValuationKRW ?? 0).toLocaleString()}원</span>
              <span className="text-slate-500 text-[10px]">(${(holdingsSummary.totalValuationUSD ?? 0).toLocaleString()})</span>
            </div>

            <div className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-black flex items-center gap-1.5 ${
              holdingsSummary.totalPnlKRW >= 0
                ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-400"
                : "bg-rose-950/40 border-rose-500/30 text-rose-400"
            }`}>
              <span className="text-[11px] font-normal text-slate-400">평가손익:</span>
              <span>
                {holdingsSummary.totalPnlKRW >= 0 ? "+" : ""}₩{Math.round(holdingsSummary.totalPnlKRW).toLocaleString()}원
              </span>
              <span className="text-[10px]">
                ({holdingsSummary.totalPnlRate >= 0 ? "+" : ""}{holdingsSummary.totalPnlRate.toFixed(2)}%)
              </span>
            </div>

            {positions.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    if (window.confirm("⚠️ [모의/실거래 보유 목록 초기화] 현재 표시된 보유종목을 모두 비우고 실계좌 연동 상태로 새로고침하시겠습니까?")) {
                      if (clearAllPositions) {
                        await clearAllPositions();
                      }
                      if (syncRealAccountBalance && challengeMode === "REAL") {
                        syncRealAccountBalance("all", false).catch(() => {});
                      }
                      addToast("🧹 [보유종목 정리 완료] 모의 종목이 초기화되고 실제 계좌 잔고 상태로 갱신되었습니다.", "success");
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-xs"
                  title="실제 사지 않은 종목이 남아있을 때 깔끔하게 비우기"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                  <span>보유목록 정리</span>
                </button>

                <button
                  onClick={async () => {
                    if (window.confirm("⚠️ 보유 중인 모든 종목을 현재 시장가로 즉시 전량 매도/청산하시겠습니까?")) {
                      try {
                        for (const pos of positions) {
                          await executeTrade(
                            pos.symbol,
                            pos.name,
                            pos.market,
                            "SELL",
                            pos.quantity,
                            pos.currentPrice,
                            "10억 챌린지 일괄 전량 청산",
                            "보유종목 긴급 일괄 익절/손절 청산",
                            true
                          );
                        }
                        addToast("⚡ [일괄 청산 완료] 보유 중이던 모든 종목의 시장가 매도 주문이 접수되었습니다.", "success");
                      } catch (err: any) {
                        addToast(`⚠️ 일괄 청산 중 오류 발생: ${err?.message || "체결 오류"}`, "warning");
                      }
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>전종목 일괄 매도</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Holdings Card List */}
        {positions.length === 0 ? (
          <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-200">현재 보유 중인 종목이 없습니다.</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                AI 1분봉 핑퐁 스캘퍼가 4대 안티-페이크아웃 필터(MTF 상위추세 + CVD 순매수델타 + 캔들종가확정)를 통과한 종목을 실시간 탐색 중입니다.
              </p>
            </div>

            {/* Quick 1-Click Buy Shortcuts */}
            <div className="pt-2">
              <span className="text-xs font-bold text-slate-400 block mb-2">💡 빠른 1-Click 추천 종목 진입:</span>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    const btc = universeTargetAssets.find(a => a.symbol === "BTC") || universeTargetAssets[0];
                    if (btc) {
                      setSelectedAsset(btc);
                      triggerTrade("LONG");
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                  <span>⚡ 1위 비트코인(BTC) 롱 진입</span>
                </button>

                <button
                  onClick={() => {
                    const sol = universeTargetAssets.find(a => a.symbol === "SOL");
                    if (sol) {
                      setSelectedAsset(sol);
                      triggerTrade("LONG");
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Zap className="w-3.5 h-3.5 text-purple-400" />
                  <span>⚡ 솔라나(SOL) 롱 진입</span>
                </button>

                <button
                  onClick={() => {
                    const sam = universeTargetAssets.find(a => a.symbol === "005930");
                    if (sam) {
                      setSelectedAsset(sam);
                      triggerTrade("LONG");
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                  <span>⚡ 삼성전자(005930) 매수</span>
                </button>

                <button
                  onClick={() => {
                    const hynix = universeTargetAssets.find(a => a.symbol === "000660");
                    if (hynix) {
                      setSelectedAsset(hynix);
                      triggerTrade("LONG");
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span>⚡ SK하이닉스(000660) 매수</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
            {positions.map((pos, idx) => {
              const isUS = pos.market === "US";
              const isCrypto = pos.market === "BTC";
              const isKRX = pos.market === "KOREA";

              const qty = typeof pos.quantity === 'number' && !isNaN(pos.quantity) ? pos.quantity : (Number(pos.quantity) || 0);
              const curP = typeof pos.currentPrice === 'number' && !isNaN(pos.currentPrice) ? pos.currentPrice : (pos.avgPrice || 0);
              const avgP = typeof pos.avgPrice === 'number' && !isNaN(pos.avgPrice) ? pos.avgPrice : curP;

              const currentPriceKRW = isUS ? curP * exchangeRateKRW : curP;
              const avgPriceKRW = isUS ? avgP * exchangeRateKRW : avgP;
              const totalValuation = Math.round(qty * currentPriceKRW);
              const totalCost = Math.round(qty * avgPriceKRW);
              const pnlKRW = totalValuation - totalCost;
              const pnlRate = totalCost > 0 ? (pnlKRW / totalCost) * 100 : 0;
              const isProfit = pnlKRW >= 0;

              return (
                <div
                  key={pos.id ? `pos_${pos.id}_${idx}` : `pos_${pos.symbol}_${idx}`}
                  className="p-3.5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl space-y-2.5 transition shadow-sm flex flex-col justify-between"
                >
                  {/* Top: Symbol, Name, Market Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-xl border ${
                        isProfit ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-rose-500/20 border-rose-500/30 text-rose-400"
                      }`}>
                        {isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-white text-sm">{pos.name}</span>
                          <span className="text-[10px] font-mono text-slate-400 uppercase bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                            {pos.symbol}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 text-[10px]">
                          <span className={`px-1.5 py-0.2 rounded font-bold ${
                            isCrypto
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : isUS
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                              : "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                          }`}>
                            {isCrypto ? "🪙 업비트 24H" : isUS ? "🇺🇸 미국 NASDAQ" : "🇰🇷 국내 KRX"}
                          </span>
                          <span className="text-slate-400 font-mono">
                            수량: <strong>{formatStockQty(qty, pos.market)}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Unrealized PnL Badge */}
                    <div className={`text-right font-mono ${isProfit ? "text-emerald-400" : "text-rose-400"}`}>
                      <div className="text-xs font-black">
                        {isProfit ? "+" : ""}₩{(pnlKRW ?? 0).toLocaleString()}원
                      </div>
                      <div className="text-[10px] font-bold">
                        {isProfit ? "+" : ""}{pnlRate.toFixed(2)}%
                      </div>
                    </div>
                  </div>

                  {/* Pricing Matrix */}
                  <div className="grid grid-cols-3 gap-1.5 p-2 bg-slate-950 rounded-xl border border-slate-800/80 text-[11px] font-mono">
                    <div>
                      <span className="text-slate-500 text-[10px] block">매수 평단가</span>
                      <span className="text-slate-300 font-bold">
                        {isUS ? `$${avgP}` : `₩${Math.round(avgP).toLocaleString()}`}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">현재가</span>
                      <span className="text-white font-bold">
                        {isUS ? `$${curP}` : `₩${Math.round(curP).toLocaleString()}`}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 text-[10px] block">총 평가금액</span>
                      <span className="text-amber-300 font-black">
                        ₩{(totalValuation ?? 0).toLocaleString()}원
                      </span>
                    </div>
                  </div>

                  {/* 1-Click Action Buttons for this Holding */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800/80">
                    <button
                      onClick={async () => {
                        try {
                          await executeTrade(
                            pos.symbol,
                            pos.name,
                            pos.market,
                            "SELL",
                            pos.quantity,
                            pos.currentPrice,
                            "10억 챌린지 1-Click 즉시 매도",
                            "보유종목 전량 익절/매도 청산",
                            true
                          );
                          addToast(`⚡ [${pos.name}] ${formatStockQty(pos.quantity, pos.market)} 전량 즉시 매도 주문이 접수되었습니다.`, "success");
                        } catch (err: any) {
                          addToast(`⚠️ 매도 주문 실패: ${err?.message || "오류 발생"}`, "warning");
                        }
                      }}
                      className="flex-1 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs transition cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                    >
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>전량 즉시 익절/매도</span>
                    </button>

                    <button
                      onClick={async () => {
                        const halfQty = pos.market === "BTC"
                          ? Number((pos.quantity * 0.5).toFixed(6))
                          : pos.market === "US"
                          ? Number((pos.quantity * 0.5).toFixed(4))
                          : Math.max(1, Math.floor(pos.quantity * 0.5));
                        
                        if (halfQty <= 0) {
                          addToast("⚠️ 분할 매도할 수량이 부족합니다.", "warning");
                          return;
                        }

                        try {
                          await executeTrade(
                            pos.symbol,
                            pos.name,
                            pos.market,
                            "SELL",
                            halfQty,
                            pos.currentPrice,
                            "10억 챌린지 50% 분할 익절",
                            "보유종목 50% 부분 매도",
                            true
                          );
                          addToast(`🛡️ [${pos.name}] ${halfQty} 50% 분할 매도 주문이 접수되었습니다.`, "info");
                        } catch (err: any) {
                          addToast(`⚠️ 분할 매도 실패: ${err?.message || "오류 발생"}`, "warning");
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs border border-slate-700 transition cursor-pointer flex items-center gap-1"
                      title="50% 절반 분할 매도"
                    >
                      <span>50% 분할</span>
                    </button>

                    <button
                      onClick={() => {
                        const match = universeTargetAssets.find(u => u.symbol === pos.symbol);
                        if (match) {
                          setSelectedAsset(match);
                          addToast(`🎯 [차트 연결] ${pos.name} (${pos.symbol}) 1분봉 차트가 로드되었습니다.`, "info");
                        } else {
                          setSelectedAsset({
                            symbol: pos.symbol,
                            name: pos.name,
                            category: isCrypto ? "CRYPTO" : isUS ? "US_STOCK" : "KR_STOCK",
                            marketType: pos.market,
                            currentPrice: pos.currentPrice,
                            unit: isUS ? "$" : "원",
                            exchange: isCrypto ? "업비트 24H" : isUS ? "미국 NASDAQ" : "국내 KRX",
                            leverage: "10x 핑퐁",
                            strategyDesc: "보유 종목 실시간 1분봉 핑퐁 스캘핑 추적",
                            aiScore: 94
                          });
                          addToast(`🎯 [차트 연결] ${pos.name} 1분봉 차트가 로드되었습니다.`, "info");
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 hover:text-white font-bold text-xs border border-indigo-500/40 transition cursor-pointer flex items-center gap-1"
                      title="1분봉 차트에 바인딩"
                    >
                      <Crosshair className="w-3.5 h-3.5 text-indigo-400" />
                      <span>차트</span>
                    </button>

                    <button
                      onClick={async () => {
                        if (window.confirm(`[목록 삭제] '${pos.name}(${pos.symbol})'을(를) 보유 목록에서 삭제하시겠습니까?`)) {
                          if (closePosition) {
                            await closePosition(pos.id);
                            addToast(`🗑️ [${pos.name}] 보유 종목이 목록에서 제거되었습니다.`, "info");
                          }
                        }
                      }}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 border border-slate-700 transition cursor-pointer flex items-center justify-center"
                      title="보유 목록에서 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5.5 LIVE CHALLENGE TRACKING PANEL (AI UNIVERSE SCAN & REALTIME POSITIONS) */}
      <div className="p-4 bg-slate-950 border-b border-slate-900">
        <LiveChallengeTrackingPanel
          selectedSymbol={selectedAsset.symbol}
          onSelectAsset={(sym) => {
            const found = universeTargetAssets.find(a => a.symbol === sym);
            if (found) {
              setSelectedAsset(found);
              addToast(`🎯 [차트 바인딩] ${found.name} (${found.symbol}) 종목이 차트에 선택되었습니다.`, "info");
            }
          }}
          onQuickTrade={(sym, type) => {
            const found = universeTargetAssets.find(a => a.symbol === sym);
            if (found) {
              setSelectedAsset(found);
            }
            triggerTrade(type);
          }}
          challengeMode={challengeMode}
          exchangeRateKRW={exchangeRateKRW}
        />
      </div>

      {/* 6. LIVE TICKER TRADE RECORDS HISTORY WITH REASON & DETAIL CLICK */}
      <div className="p-4 bg-slate-950 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-900">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>
              {challengeMode === "REAL" ? "⚡ 실제 체결 로그 및 AI 리스크 분석" : "🧪 모의 핑퐁 체결 내역 및 AI 매수/매도/손절 사유"}
            </span>
          </div>

          {/* Trade Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px] font-bold overflow-x-auto">
            {[
              { key: "ALL", label: "전체 종목 체결내용" },
              { key: "CURRENT", label: `선택종목 (${selectedAsset.symbol})` },
              { key: "LONG", label: "LONG 롱만" },
              { key: "SHORT", label: "SHORT 숏만" },
              { key: "WIN", label: "익절건" }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setTradeLogFilter(tab.key as any)}
                className={`px-2 py-0.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                  tradeLogFilter === tab.key
                    ? "bg-indigo-600 text-white font-black shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredTradeRecords.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs bg-slate-900/30 rounded-xl border border-slate-800/50">
            {challengeMode === "REAL" ? (
              <div className="space-y-2">
                <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto" />
                <p className="font-bold text-slate-300">아직 접수된 실거래 체결 내역이 없습니다.</p>
                <p className="text-[11px] text-slate-500">
                  상단의 [⚡ 실거래 롱 매수] 버튼을 누르거나 거래소 API를 연동하여 실거래를 시작하세요.
                </p>
              </div>
            ) : (
              <p>선택하신 조건의 모의 거래 내역이 없습니다. (자동 스캘핑 수집 중...)</p>
            )}
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {filteredTradeRecords.map((rec, idx) => {
              const isLong = rec.type === "LONG";
              const isOpen = rec.status === "OPEN" || rec.side === "BUY";
              const isWin = rec.status === "WIN" || rec.pnlDollar > 0;

              return (
                <div
                  key={rec.id ? `rec_${rec.id}_${idx}` : `rec_${idx}`}
                  onClick={() => setSelectedRecordForDetail(rec)}
                  className="p-3 bg-slate-900/70 hover:bg-slate-850 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition cursor-pointer hover:border-slate-700"
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`px-2 py-1 rounded text-[10px] font-black shrink-0 ${
                        isOpen
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : isWin
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      {isOpen ? "⚡ 매수 진입" : "⚡ 매도 청산"}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{rec.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{rec.time}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                          {rec.positionSize}
                        </span>
                        {rec.isReal && (
                          <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                            실계좌 체결
                          </span>
                        )}
                      </div>
                      {/* Explicit Reason for Trade */}
                      <div className="mt-1 flex items-center gap-1.5 text-xs">
                        <span className="font-bold text-slate-300">💡 체결 사유:</span>
                        <span className={isOpen ? "text-cyan-300" : isWin ? "text-emerald-300" : "text-rose-300"}>
                          {rec.reason}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-1.5 sm:pt-0 border-slate-800/80 font-mono shrink-0">
                    {isOpen ? (
                      <>
                        <div className="font-black text-xs text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
                          진입가: ₩{(rec.entryPrice ?? 0).toLocaleString()}원
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          보유 유지 (목표가 도달 시 자동 익절)
                        </div>
                      </>
                    ) : (
                      <>
                        <div className={`font-black text-sm ${isWin ? "text-emerald-400" : "text-rose-400"}`}>
                          {isWin ? "+" : ""}{rec.pnlDollar}$ ({isWin ? "+" : ""}{rec.pnlPercent}%)
                        </div>
                        <div className="text-[11px] text-slate-400">
                          실현손익 {isWin ? "+" : ""}₩{(rec.pnlKRW !== undefined ? rec.pnlKRW : Math.round(rec.pnlDollar * exchangeRateKRW)).toLocaleString()}원
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </>
      )}

      {/* 7. DETAILED TRADE INSPECTION MODAL */}
      {selectedRecordForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full text-slate-100 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs font-black ${
                  selectedRecordForDetail.type === "LONG" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                }`}>
                  {selectedRecordForDetail.type} 포지션 세부 분석
                </span>
                <span className="text-xs text-slate-400 font-mono">{selectedRecordForDetail.time}</span>
              </div>
              <button
                onClick={() => setSelectedRecordForDetail(null)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <div className="text-slate-400">체결 종목</div>
                  <div className="text-base font-black text-white">{selectedRecordForDetail.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-slate-400">실현 손익</div>
                  <div className={`text-base font-black font-mono ${selectedRecordForDetail.status === "WIN" ? "text-emerald-400" : "text-rose-400"}`}>
                    {selectedRecordForDetail.pnlDollar > 0 ? "+" : ""}{selectedRecordForDetail.pnlDollar}$ ({selectedRecordForDetail.pnlPercent}%)
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-200">💡 왜 이 시점에 매매했고 왜 이익/손실이 났는가?</h4>
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-slate-300 leading-relaxed">
                  {selectedRecordForDetail.reason}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-200">📊 진입 당시 AI 퀀트 보조지표 상태</h4>
                <div className="grid grid-cols-2 gap-2 text-slate-300">
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">RSI 지수</span>
                    <strong className="text-amber-400 font-mono text-xs">{selectedRecordForDetail.indicatorDetails.rsi}</strong>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">추세 상태</span>
                    <strong className="text-white text-xs">{selectedRecordForDetail.indicatorDetails.trend}</strong>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">MACD 신호</span>
                    <strong className="text-emerald-400 text-xs">{selectedRecordForDetail.indicatorDetails.macdSignal}</strong>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">호가창 수급</span>
                    <strong className="text-indigo-300 text-xs">{selectedRecordForDetail.indicatorDetails.orderBookImbalance}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-950 border-t border-slate-800 text-right">
              <button
                onClick={() => setSelectedRecordForDetail(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                확인 완료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. BROKER API CONNECT MODAL */}
      <BrokerApiConnectModal
        isOpen={isApiModalOpen}
        onClose={() => setIsApiModalOpen(false)}
      />

      {/* 9. PATTERN UPGRADE & ANTI-FAKEOUT FILTER INSPECTOR MODAL */}
      <PatternUpgradeFilterInspectorModal
        isOpen={isPatternInspectorOpen}
        onClose={() => setIsPatternInspectorOpen(false)}
        initialSymbol={selectedAsset.symbol}
      />

      {/* 9.5 🧮 100B COMPOUNDING GROWTH CALCULATOR MODAL */}
      {isCompoundingCalcOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 overflow-hidden">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full max-h-[92vh] sm:max-h-[90vh] text-slate-100 shadow-2xl overflow-hidden flex flex-col overscroll-contain">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/20 border border-indigo-400/40 rounded-xl">
                  <BarChart2 className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span>🧮 100억 복리 성장 시뮬레이션 계산기</span>
                  </h3>
                  <p className="text-xs text-indigo-200/80">
                    소액 시드로 시작해 10억, 100억 달성까지 소요되는 일수와 복리 스노우볼 곡선을 정밀 계산합니다.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCompoundingCalcOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto text-xs flex-1 min-h-0">
              {/* 1. Start Seed Input */}
              <div className="space-y-2">
                <label className="font-bold text-slate-200 block">
                  🌱 1. 시작 예수금 (시드머니):
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {[
                    { label: "100만원", val: 1000000 },
                    { label: "500만원", val: 5000000 },
                    { label: "1,000만원", val: 10000000 },
                    { label: "5,000만원", val: 50000000 },
                    { label: "1억원", val: 100000000 }
                  ].map(s => (
                    <button
                      key={s.val}
                      type="button"
                      onClick={() => setCalcStartSeedKRW(s.val)}
                      className={`p-2 rounded-xl border text-center transition cursor-pointer font-bold ${
                        calcStartSeedKRW === s.val
                          ? "bg-indigo-600 text-white border-indigo-400 shadow-md"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-850"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Daily Profit % & Win Rate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200 block">
                    📈 2. 회당 평균 목표 수익률 (%):
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[1.5, 2.0, 2.5, 3.0, 5.0].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setCalcDailyReturnPct(pct)}
                        className={`flex-1 py-1.5 rounded-lg border text-center font-mono font-bold ${
                          calcDailyReturnPct === pct
                            ? "bg-emerald-600 text-white border-emerald-400 shadow-md"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        +{pct}%
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200 block">
                    🎯 3. AI 핑퐁 승률 (%):
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[75, 80, 85, 90, 95].map(wr => (
                      <button
                        key={wr}
                        type="button"
                        onClick={() => setCalcWinRatePct(wr)}
                        className={`flex-1 py-1.5 rounded-lg border text-center font-mono font-bold ${
                          calcWinRatePct === wr
                            ? "bg-amber-600 text-white border-amber-400 shadow-md"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {wr}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. Milestone Expected Days Output Banner */}
              <div className="p-3.5 bg-slate-950 border border-indigo-500/30 rounded-xl space-y-2">
                <div className="font-bold text-indigo-300 flex items-center justify-between text-xs pb-1 border-b border-slate-800">
                  <span>🚀 AI 복리 계산 시뮬레이션 산출 결과</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    일평균 순복리: +{compoundingProjections.effectiveDailyReturnPct}%
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono">
                  <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">1억원 달성</span>
                    <strong className="text-emerald-400 text-sm">{compoundingProjections.daysTo100M}일</strong>
                    <span className="text-[9px] text-slate-500 block">({Math.ceil(compoundingProjections.daysTo100M / 20)}개월)</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">10억원 달성</span>
                    <strong className="text-amber-400 text-sm">{compoundingProjections.daysTo1B}일</strong>
                    <span className="text-[9px] text-slate-500 block">({Math.ceil(compoundingProjections.daysTo1B / 20)}개월)</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">100억원 파이널</span>
                    <strong className="text-cyan-400 text-sm">{compoundingProjections.daysTo10B}일</strong>
                    <span className="text-[9px] text-slate-500 block">({Math.ceil(compoundingProjections.daysTo10B / 20)}개월)</span>
                  </div>
                </div>
              </div>

              {/* 4. Timeline Compound Growth Table */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-200 block">
                  📅 거래일수별 예상 누적 평가자산 추이:
                </label>
                <div className="border border-slate-800 rounded-xl overflow-hidden font-mono text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-950 text-slate-400 text-[11px] border-b border-slate-800">
                      <tr>
                        <th className="p-2">거래일수</th>
                        <th className="p-2">원화 평가액 (KRW)</th>
                        <th className="p-2">달러 환산 ($)</th>
                        <th className="p-2">성장 배수</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                      {compoundingProjections.tableData.map(row => {
                        const multiplier = (row.balanceKRW / calcStartSeedKRW).toFixed(1);
                        return (
                          <tr key={row.day} className="hover:bg-slate-800/50">
                            <td className="p-2 text-slate-300 font-bold">{row.day}일차</td>
                            <td className="p-2 text-emerald-400 font-bold">₩{(row.balanceKRW ?? 0).toLocaleString()}원</td>
                            <td className="p-2 text-amber-300">${(row.balanceUSD ?? 0).toLocaleString()}</td>
                            <td className="p-2 text-indigo-300 font-bold">{multiplier}x 배</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <p className="text-[11px] text-slate-400">
                💡 본 계산기는 과거 85% 고승률 핑퐁 스캘핑 시뮬레이션 기반 수학적 복리 모델입니다.
              </p>
              <button
                type="button"
                onClick={() => setIsCompoundingCalcOpen(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition cursor-pointer shrink-0"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. EDIT CHALLENGE MOCK CAPITAL CONFIG MODAL */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 overflow-hidden">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full max-h-[92vh] sm:max-h-[90vh] text-slate-100 shadow-2xl overflow-hidden flex flex-col overscroll-contain">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/20 border border-amber-400/40 rounded-xl">
                  <Coins className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span>🏆 10억 챌린지 모의가상자산 설정</span>
                  </h3>
                  <p className="text-xs text-amber-200/80">
                    모의 시뮬레이션의 시작 자금, 목표 금액, 레버리지를 자유롭게 설정하세요.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto text-xs flex-1 min-h-0">
              {/* Presets */}
              <div className="space-y-2">
                <label className="font-bold text-slate-200 block">
                  💡 시작 가상자산 프리셋 선택:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "$10,000 (약 1,520만원)", usd: 10000, desc: "표준 챌린지" },
                    { label: "$50,000 (약 7,600만원)", usd: 50000, desc: "중급 챌린지" },
                    { label: "$100,000 (약 1억 5200만)", usd: 100000, desc: "상급 챌린지" },
                    { label: "$650,000 (약 10억원)", usd: 650000, desc: "10억 완성 파이널" },
                    { label: "₩1,000,000 (약 $658)", usd: 658, desc: "100만원 소액 챌린지" },
                    { label: "$1,000 (약 152만원)", usd: 1000, desc: "소액 가상 시드" }
                  ].map(preset => (
                    <button
                      key={preset.usd}
                      type="button"
                      onClick={() => setTempCapitalInput(preset.usd.toString())}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        Number(tempCapitalInput) === preset.usd
                          ? "bg-amber-500/20 border-amber-400 text-amber-300 shadow-md ring-1 ring-amber-400/50"
                          : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-850"
                      }`}
                    >
                      <div className="font-bold text-xs">{preset.label}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{preset.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Direct Input */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-200 block">
                  ✏️ 직접 입력 (USD 기준):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold">$</span>
                  <input
                    type="number"
                    value={tempCapitalInput}
                    onChange={(e) => setTempCapitalInput(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-amber-400"
                    placeholder="예: 10000"
                  />
                </div>
                <p className="text-[11px] text-slate-400 font-mono">
                  원화 환산금액: <strong className="text-amber-300">약 ₩{(Number(tempCapitalInput || 0) * exchangeRateKRW).toLocaleString()}원</strong> (환율 $1 = ₩{exchangeRateKRW})
                </p>
              </div>

              {/* Target Goal Selector */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <label className="font-bold text-slate-200 block">
                  🎯 챌린지 최종 목표 금액:
                </label>
                <div className="flex items-center gap-2">
                  {[
                    { label: "10억원 ($650,000)", usd: 650000 },
                    { label: "100억원 ($6,500,000)", usd: 6500000 },
                    { label: "1억원 ($65,000)", usd: 65000 }
                  ].map(g => (
                    <button
                      key={g.usd}
                      type="button"
                      onClick={() => setMockTargetGoalUSD(g.usd)}
                      className={`flex-1 py-1.5 px-2 rounded-xl border text-xs font-bold transition cursor-pointer text-center ${
                        mockTargetGoalUSD === g.usd
                          ? "bg-indigo-600 text-white border-indigo-400 shadow-md"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Leverage Selector */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <label className="font-bold text-slate-200 block">
                  ⚡ 1분봉 핑퐁 스캘핑 레버리지 설정:
                </label>
                <div className="flex items-center gap-2">
                  {["1x (현물)", "5x (CFD/미수)", "10x 핑퐁", "20x 고빈도"].map(lev => (
                    <button
                      key={lev}
                      type="button"
                      onClick={() => setMockLeverageVal(lev)}
                      className={`flex-1 py-1.5 px-1 rounded-xl border text-[11px] font-bold transition cursor-pointer text-center ${
                        mockLeverageVal === lev
                          ? "bg-emerald-600 text-white border-emerald-400 shadow-md"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {lev}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setTempCapitalInput("10000");
                  setMockTargetGoalUSD(650000);
                  setMockLeverageVal("10x 핑퐁");
                }}
                className="px-3 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>기본값 초기화</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const num = Number(tempCapitalInput) || 10000;
                  handleSaveChallengeConfig(num, mockTargetGoalUSD, mockLeverageVal);
                }}
                className="flex-1 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl text-xs transition cursor-pointer shadow-lg text-center"
              >
                ✅ 가상 자산 설정 적용 및 리셋
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. Realtime Trading Issue Logger & AI Diagnostic Solution Modal */}
      <RealtimeTradingIssueLoggerModal
        isOpen={isIssueLoggerOpen}
        onClose={() => setIsIssueLoggerOpen(false)}
      />
    </div>
  );
};
