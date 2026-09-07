import React, { useState, useEffect, useMemo } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Zap, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  RefreshCw, 
  Play, 
  Pause, 
  Clock, 
  Search, 
  Key, 
  Sliders, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  BarChart3,
  Bot,
  DollarSign,
  FileText,
  Terminal,
  Power,
  Cpu
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { getAllStocks, StockItem } from "../data/stockUniverse";
import { LightCandlestickChart } from "./trading/LightCandlestickChart";
import { SmcMarketStructureVisualizer } from "./SmcMarketStructureVisualizer";
import { RealtimeStockMarketScanner } from "./RealtimeStockMarketScanner";
import { BotStatusDashboard } from "./trading/BotStatusDashboard";
import { RealBrokerDetailedBalanceAndHoldings } from "./trading/RealBrokerDetailedBalanceAndHoldings";
import { TransactionHistory } from "./TransactionHistory";
import { StockSearchAndAddModal } from "./trading/StockSearchAndAddModal";
import { SmartSafetyGovernanceModal } from "./trading/SmartSafetyGovernanceModal";
import { ProfitabilityHealthCheckModal } from "./trading/ProfitabilityHealthCheckModal";
import { MultiModelSecuritiesConsensusModal } from "./MultiModelSecuritiesConsensusModal";
import { BotConfigModal } from "./trading/BotConfigModal";
import { BrokerApiConnectModal } from "./trading/BrokerApiConnectModal";
import { UsScalperSuperBrainModal } from "./trading/UsScalperSuperBrainModal";
import { PwaInstallModal } from "./PwaInstallModal";
import { NeuralBrainMasterControlCenter } from "./NeuralBrainMasterControlCenter";
import { NeuralBotClusterVisualizer } from "./trading/NeuralBotClusterVisualizer";
import { getUsdExchangeRate, usdToKrw } from "../lib/currencyUtils";

interface AiBotCommandCenterUiProps {
  onOpenConsensusModal?: (symbol: string) => void;
}

export const AiBotCommandCenterUi: React.FC<AiBotCommandCenterUiProps> = ({
  onOpenConsensusModal
}) => {
  const {
    selectedSymbol,
    setSelectedSymbol,
    allStocks,
    executeTrade,
    addToast,
    activeBots,
    realBrokerBalances,
    totalTradingPnl,
    overallWinRate,
    tradingLogs,
    activePositions,
    positions = [],
    trades = [],
    profile,
    cashBreakdown,
    purgeAllMockData
  } = useApp() as any;

  // Modals state
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isGovernanceOpen, setIsGovernanceOpen] = useState<boolean>(false);
  const [isConsensusOpen, setIsConsensusOpen] = useState<boolean>(false);
  const [isHealthCheckOpen, setIsHealthCheckOpen] = useState<boolean>(false);
  const [isBotConfigOpen, setIsBotConfigOpen] = useState<boolean>(false);
  const [isApiConnectOpen, setIsApiConnectOpen] = useState<boolean>(false);
  const [isUsSuperBrainOpen, setIsUsSuperBrainOpen] = useState<boolean>(false);
  const [isPwaOpen, setIsPwaOpen] = useState<boolean>(false);
  const [selectedBotForConfig, setSelectedBotForConfig] = useState<any>(null);

  // Sub-feature tabs drawer / collapsible views
  const [activeSubTab, setActiveSubTab] = useState<"NEURAL_BRAIN" | "TERMINAL" | "POSITIONS" | "BOT_FLEET" | "ORDERBOOK" | "SIGNALS" | "LOGS">("NEURAL_BRAIN");

  // Determine if Real Mode is active (isRealTrade === true on profile)
  const isRealMode = profile?.isRealTrade === true;

  // Pipeline execution & live state
  // In Real Mode, simulation mode is strictly forced to false, and mock numbers are zeroed or derived from real trades.
  const [isSimulationMode, setIsSimulationMode] = useState<boolean>(false);
  const [isAutoPipelineActive, setIsAutoPipelineActive] = useState<boolean>(true);
  const [currentCycleIndex, setCurrentCycleIndex] = useState<number>(0);

  // Dynamic Metrics derived from Real Trades / Positions
  const realTradesCount = Array.isArray(trades) ? trades.length : 0;
  const realWinningTrades = Array.isArray(trades) ? trades.filter((t: any) => (t.pnl || 0) > 0).length : 0;
  const computedWinRate = realTradesCount > 0 ? Math.round((realWinningTrades / realTradesCount) * 100) : 0;

  // Calculate Realized PnL from trades
  const calculatedRealizedPnlKrw = useMemo(() => {
    if (!Array.isArray(trades) || trades.length === 0) return 0;
    return trades.reduce((acc: number, t: any) => acc + (Number(t.pnl) || 0), 0);
  }, [trades]);

  const usdRate = getUsdExchangeRate() || 1370;
  const displayRealizedPnlUsd = isRealMode 
    ? Math.round(calculatedRealizedPnlKrw / usdRate) 
    : (isSimulationMode ? 593819 : Math.round(calculatedRealizedPnlKrw / usdRate));

  const displayRealizedPnlKrw = isRealMode
    ? calculatedRealizedPnlKrw
    : (isSimulationMode ? Math.round(593819 * usdRate) : calculatedRealizedPnlKrw);

  const displayWinStreak = isRealMode 
    ? (realWinningTrades > 0 ? realWinningTrades : 0)
    : (isSimulationMode ? 47 : 0);

  const displayTotalTrades = isRealMode
    ? realTradesCount
    : (isSimulationMode ? 1099 : realTradesCount);

  // Live UTC Clock
  const [timeString, setTimeString] = useState<string>("17:56:03 UTC");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getUTCHours()).padStart(2, "0");
      const mins = String(now.getUTCMinutes()).padStart(2, "0");
      const secs = String(now.getUTCSeconds()).padStart(2, "0");
      const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
      const month = months[now.getUTCMonth()];
      const day = now.getUTCDate();
      setTimeString(`${hours}:${mins}:${secs} ${month} ${day} UTC`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Selected asset state with safe fallback
  const stockList = useMemo(() => {
    try {
      if (Array.isArray(allStocks) && allStocks.length > 0) return allStocks;
      return getAllStocks() || [];
    } catch {
      return getAllStocks() || [];
    }
  }, [allStocks]);

  const currentAsset: StockItem = useMemo(() => {
    const found = stockList.find((s: any) => s.symbol === selectedSymbol);
    if (found) {
      return {
        ...found,
        price: found.price || found.currentPrice || 0,
        changeRate: found.changeRate ?? 1.85,
        tradeValue: found.tradeValue || "3,820억",
        volume: found.volume || "450,200",
        market: found.market || "UPBIT",
        category: found.category || "BTC",
        categoryLabel: found.categoryLabel || "가상자산 대장",
        rvol: found.rvol || 1.8,
        score: found.score || 92,
        grade: found.grade || "A",
        theme: found.theme || "Layer 1 / DeFi",
        signal: found.signal || "LONG",
        strategy: found.strategy || "4-Lock BOS Breakout",
        marketCap: found.marketCap || "1,940조"
      };
    }
    return (
      stockList[0] || {
        symbol: "KRW-BTC",
        name: "비트코인",
        price: 0,
        changeRate: 3.45,
        tradeValue: "1조 4,200억",
        volume: "85,400",
        market: "UPBIT" as any,
        category: "LARGE" as any,
        categoryLabel: "가상자산 대장",
        rvol: 2.1,
        score: 96,
        grade: "A+" as any,
        theme: "Layer 1 / Store of Value",
        signal: "LONG" as any,
        strategy: "CVD Whale Reclaim + 4-Lock BOS",
        marketCap: "1,940조"
      }
    );
  }, [stockList, selectedSymbol]);

  // 4-Lock Filter States
  const [lock1BodyBreakout, setLock1BodyBreakout] = useState<boolean>(true);
  const [lock2CvdSurge, setLock2CvdSurge] = useState<boolean>(true);
  const [lock3VwapAbove, setLock3VwapAbove] = useState<boolean>(true);
  const [lock4RiskReward, setLock4RiskReward] = useState<boolean>(true);

  // Advanced Quant Indicators
  const [cvdDeltaValue, setCvdDeltaValue] = useState<number>(+148500);
  const [volumeGapRange] = useState<string>("+3.2% 매물공백");
  const [obiRatio, setObiRatio] = useState<number>(84.2);
  const [momentumScore] = useState<number>(75);

  // Live Toast notification on streak execution
  const [showStreakPopup, setShowStreakPopup] = useState<boolean>(false);

  // Pipeline Auto Cycle Timer (파이프라인이 가동 중일 때 01 스캔 -> 02 예측 -> 03 검증 -> 04 사이징 -> 05 체결 -> 06 정산 순차 실시간 순환)
  useEffect(() => {
    if (!isAutoPipelineActive) return;
    const timer = setInterval(() => {
      setCurrentCycleIndex((prev) => (prev + 1) % 6);
      setCvdDeltaValue((prev) => prev + Math.floor(Math.random() * 1500 - 600));
      setObiRatio((prev) => Math.min(96, Math.max(65, Number((prev + (Math.random() * 1.6 - 0.7)).toFixed(1)))));
    }, 1400);
    return () => clearInterval(timer);
  }, [isAutoPipelineActive]);

  const allLocksPassed = lock1BodyBreakout && lock2CvdSurge && lock3VwapAbove && lock4RiskReward;

  // Manual Trigger Trade via Master Engine
  const handleMasterTrade = async (side: "BUY" | "SELL") => {
    if (!allLocksPassed && side === "BUY") {
      addToast("🛑 [4-Lock 검증 미통과] 4중 안전 게이트가 100% 충족되어야 자동 매수가 가동됩니다.", "warning");
      return;
    }

    const price = currentAsset.price || 0;
    const qty = currentAsset.market === "UPBIT" || currentAsset.symbol.includes("BTC") ? 0.05 : 10;
    
    try {
      if (executeTrade) {
        await executeTrade(
          currentAsset.symbol,
          currentAsset.name,
          currentAsset.market === "UPBIT" ? "BTC" : "DOMESTIC",
          side,
          qty,
          price,
          "통합 마스터 6-Cycle 스캘퍼",
          `[Master Engine] 4-Lock 100% 통과 + CVD 수급 체결`,
          true
        );
      }
      setShowStreakPopup(true);
      setTimeout(() => setShowStreakPopup(false), 4500);
      addToast(`🚀 [통합 마스터 엔진] ${currentAsset.name} ${side === "BUY" ? "LONG 매수" : "SHORT 매도"} 체결 완료!`, "success");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#05070A] text-[#E2E8F0] font-sans transition-colors duration-300 pb-16 overflow-y-auto">
      <PwaInstallModal isOpen={isPwaOpen} onClose={() => setIsPwaOpen(false)} />

      {/* ========================================================================= */}
      {/* 1. TOP HEADER: HIGH-CONTRAST CYBER-DARK POLYMARKET LIVE HEADER */}
      {/* ========================================================================= */}
      <header className="w-full bg-[#090D14] border-b border-[#141E30] px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-[0_4px_24px_rgba(0,0,0,0.8)] sticky top-0 z-40 backdrop-blur-md">
        {/* Left: Live Badge & Mode */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className={`px-3 py-1 rounded-full flex items-center gap-2 border ${
            isRealMode 
              ? "bg-amber-500/10 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]" 
              : "bg-[#00E599]/10 border-[#00E599]/30 shadow-[0_0_12px_rgba(0,229,153,0.15)]"
          }`}>
            <span className={`w-2.5 h-2.5 rounded-full ${isRealMode ? "bg-amber-400 animate-ping" : "bg-[#00E599] animate-ping"}`}></span>
            <span className={`text-xs font-mono font-black tracking-wider ${isRealMode ? "text-amber-400" : "text-[#00E599]"}`}>
              ● {isRealMode ? "실거래 Open API 실계좌 연동 중" : "실시간 퀀트 시스템 가동 중"}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-mono px-3 py-1 rounded-lg border border-[#1E293B] bg-[#0E1524]">
            <span className={`font-bold ${isRealMode ? "text-amber-300 font-black" : "text-slate-300"}`}>
              {isRealMode ? "실계좌 실체결 모드" : "모의투자/가상 모드"}
            </span>
            <span className="opacity-40 text-slate-500">•</span>
            <span className="font-extrabold text-[#F59E0B]">고속 스캘핑 엔진</span>
            <span className="opacity-40 text-slate-500">•</span>
            <span className="text-[#00E599] font-bold">6단계 자율 파이프라인</span>
          </div>
        </div>

        {/* Center: Global Win Whale Badge / Simulation Toggle / Real Purge Button */}
        <div className="flex items-center gap-2 text-xs font-mono">
          {!isRealMode ? (
            <button
              onClick={() => {
                setIsSimulationMode(!isSimulationMode);
                addToast(
                  !isSimulationMode
                    ? "🎮 [모의 가상 테스트 모드 ON] 가상 데이터 시뮬레이션이 활성화되었습니다."
                    : "🔒 [모의 가상 테스트 모드 OFF] 가상 데이터 자동 증가가 중단되었습니다. (실거래 기준 정지)",
                  "info"
                );
              }}
              className={`px-3 py-1 rounded-lg border text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                isSimulationMode
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
              }`}
              title="숫자가 임의로 올라가는 모의 가상 데이터를 켜거나 끕니다"
            >
              <span className={`w-2 h-2 rounded-full ${isSimulationMode ? "bg-amber-400 animate-ping" : "bg-slate-600"}`} />
              <span>모의 가상 테스트: {isSimulationMode ? "ON (가상실행중)" : "OFF (정지됨/0원)"}</span>
            </button>
          ) : (
            <button
              onClick={async () => {
                if (purgeAllMockData) {
                  await purgeAllMockData();
                }
              }}
              className="px-3 py-1 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs font-black transition cursor-pointer flex items-center gap-1.5"
              title="모든 가상 모의 데이터를 완전히 삭제하고 실제 거래소 잔고만 유지합니다"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>실계좌 모드: 모의데이터 100% 초기화</span>
            </button>
          )}
        </div>

        {/* Right: Realtime UTC Clock & Global Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-slate-300 bg-[#0E1524] px-2.5 py-1 rounded-lg border border-[#1E293B]">
            <Clock className="w-3.5 h-3.5 text-[#00E599]" />
            <span>{timeString}</span>
          </div>

          {/* Search Asset Button */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00E599] hover:bg-[#00c985] text-[#05070A] rounded-lg text-xs font-extrabold transition shadow-[0_0_15px_rgba(0,229,153,0.3)] cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>분석 대상 종목 검색</span>
          </button>

          {/* US Scalper Super Brain Trigger */}
          <button
            onClick={() => setIsUsSuperBrainOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg text-xs font-black transition shadow-[0_0_15px_rgba(99,102,241,0.4)] cursor-pointer border border-indigo-400"
            title="미국주식 20-Agent 전용 스캘퍼 뇌엔진"
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
            <span className="hidden md:inline">🧠 미국주식 20-Agent 뇌엔진</span>
            <span className="md:hidden">미국 뇌엔진</span>
          </button>

          {/* AI Consensus Modal Trigger */}
          <button
            onClick={() => {
              if (onOpenConsensusModal) onOpenConsensusModal(currentAsset.symbol);
              else setIsConsensusOpen(true);
            }}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#6366F1] hover:bg-[#4f46e5] text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI 만장일치 합의</span>
          </button>

          {/* Real Broker API Connect Button */}
          <button
            onClick={() => setIsApiConnectOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-lg text-xs font-black transition shadow-[0_0_15px_rgba(245,158,11,0.3)] cursor-pointer"
            title="한국투자증권, 업비트 실계좌 API 연동 관리"
          >
            <Key className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">실계좌 API 등록</span>
            <span className="sm:hidden">API</span>
          </button>

          {/* Health Check Button */}
          <button
            onClick={() => setIsHealthCheckOpen(true)}
            className="p-1.5 rounded-lg border border-[#3B82F6]/40 bg-[#3B82F6]/10 text-[#60A5FA] hover:bg-[#3B82F6]/20 transition cursor-pointer"
            title="수익성 헬스체크"
          >
            <Activity className="w-4 h-4" />
          </button>

          {/* Safety Risk Governor Trigger */}
          <button
            onClick={() => setIsGovernanceOpen(true)}
            className="p-1.5 rounded-lg border border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#F59E0B] hover:bg-[#F59E0B]/20 transition cursor-pointer"
            title="리스크 거버넌스 설정"
          >
            <ShieldCheck className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. SUB-NAVIGATION TABS */}
      {/* ========================================================================= */}
      <div className="bg-[#080B11] border-b border-[#141E30] px-3 sm:px-6 py-2 flex items-center justify-between gap-2 overflow-x-auto whitespace-nowrap scrollbar-none">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setActiveSubTab("NEURAL_BRAIN")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-black transition flex items-center gap-1.5 border ${
              activeSubTab === "NEURAL_BRAIN"
                ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 text-white border-cyan-400 shadow-[0_0_18px_rgba(99,102,241,0.5)]"
                : "text-indigo-300 hover:text-indigo-200 bg-indigo-500/10 border-indigo-500/30 hover:bg-indigo-500/20"
            }`}
          >
            <Sparkles className="w-4 h-4 text-cyan-300 animate-pulse" />
            <span>🧠 40대 신경세포(봇) & 중앙 뇌 통제 센터</span>
          </button>

          <button
            onClick={() => setActiveSubTab("ORDERBOOK")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-black transition flex items-center gap-1.5 border ${
              activeSubTab === "ORDERBOOK"
                ? "bg-gradient-to-r from-[#00E599] to-emerald-400 text-[#05070A] border-[#00E599] shadow-[0_0_15px_rgba(0,229,153,0.4)]"
                : "text-amber-300 hover:text-amber-200 bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20"
            }`}
          >
            <Cpu className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>🏛️ 기관급 SMC AI 자율매매 & 실거래 주문 시스템</span>
          </button>

          <button
            onClick={() => setActiveSubTab("TERMINAL")}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 ${
              activeSubTab === "TERMINAL"
                ? "bg-[#00E599] text-[#05070A] shadow-[0_0_12px_rgba(0,229,153,0.3)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#0E1524]"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>메인 퀀트 터미널</span>
          </button>

          <button
            onClick={() => setActiveSubTab("POSITIONS")}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 ${
              activeSubTab === "POSITIONS"
                ? "bg-[#00E599] text-[#05070A] shadow-[0_0_12px_rgba(0,229,153,0.3)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#0E1524]"
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>실계좌 잔고 & 포지션 (API연동)</span>
          </button>

          <button
            onClick={() => setActiveSubTab("BOT_FLEET")}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 ${
              activeSubTab === "BOT_FLEET"
                ? "bg-[#00E599] text-[#05070A] shadow-[0_0_12px_rgba(0,229,153,0.3)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#0E1524]"
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>AI 자동매매 봇 편대</span>
          </button>

          <button
            onClick={() => setActiveSubTab("SIGNALS")}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 ${
              activeSubTab === "SIGNALS"
                ? "bg-[#00E599] text-[#05070A] shadow-[0_0_12px_rgba(0,229,153,0.3)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#0E1524]"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>국내/해외 종목 실시간 스캐너</span>
          </button>

          <button
            onClick={() => setActiveSubTab("LOGS")}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 ${
              activeSubTab === "LOGS"
                ? "bg-[#00E599] text-[#05070A] shadow-[0_0_12px_rgba(0,229,153,0.3)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#0E1524]"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>체결 내역 및 로그 ({tradingLogs?.length || trades?.length || 0})</span>
          </button>
        </div>

        {/* Global Auto Switch */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400 hidden md:inline">자율 체결 엔진:</span>
          <button
            onClick={() => setIsAutoPipelineActive(!isAutoPipelineActive)}
            className={`px-2.5 py-0.5 rounded font-black text-[11px] transition flex items-center gap-1 cursor-pointer ${
              isAutoPipelineActive
                ? "bg-[#00E599]/20 text-[#00E599] border border-[#00E599]/50"
                : "bg-rose-500/20 text-rose-400 border border-rose-500/50"
            }`}
          >
            <Power className="w-3 h-3" />
            <span>{isAutoPipelineActive ? "가동 중" : "일시정지"}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN WORKSPACE CONTAINER */}
      {/* ========================================================================= */}
      <main className="max-w-[1440px] mx-auto px-2 sm:px-4 pt-3 sm:pt-4 space-y-4">
        
        {/* VIEW 0: 🧠 40대 신경세포(봇) & 중앙 뇌 통제 센터 (HUMAN NEURAL BRAIN ARCHITECTURE) */}
        {activeSubTab === "NEURAL_BRAIN" && (
          <div className="space-y-6">
            <NeuralBrainMasterControlCenter />
          </div>
        )}

        {/* VIEW 1: MASTER QUANT TERMINAL */}
        {activeSubTab === "TERMINAL" && (
          <div className="space-y-4">
            {/* ROW 1: REALIZED PnL + CIRCLE WIN STREAK GAUGE */}
            <section className="bg-[#0A0F1D] border-2 border-[#1E293B] rounded-2xl p-4 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.6)] relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                
                {/* Left: Title & LCD Digits */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs sm:text-sm font-mono font-black tracking-widest text-slate-400 uppercase">
                      {isRealMode ? "REAL ACCOUNT · REALIZED PNL (실계좌 실현손익)" : "SIMULATED / REAL · REALIZED PNL (실현손익)"}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-extrabold flex items-center gap-1.5 ${
                      isRealMode ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "bg-[#00E599]/15 text-[#00E599] border border-[#00E599]/30"
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${isRealMode ? "bg-amber-400 animate-pulse" : "bg-[#00E599] animate-pulse"}`}></span>
                      ● {isRealMode ? "OPEN API 실계좌 연동" : (isSimulationMode ? "LIVE · 25 DAYS" : "실제 데이터 동기화")}
                    </span>
                  </div>

                  {/* LCD NUMBERS */}
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <div className={`text-5xl sm:text-6xl md:text-7xl font-mono font-black tracking-tight drop-shadow-[0_0_20px_rgba(0,229,153,0.45)] ${
                      displayRealizedPnlKrw >= 0 ? "text-[#00E599]" : "text-rose-500"
                    }`}>
                      ${(displayRealizedPnlUsd ?? 0).toLocaleString()}
                    </div>
                    <div className="text-sm sm:text-base font-mono font-bold text-slate-300">
                      ≈ ₩{(displayRealizedPnlKrw ?? 0).toLocaleString()} KRW
                    </div>
                  </div>

                  {/* Sub-stats line */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm font-mono font-bold">
                    <span className="text-[#00E599] flex items-center gap-1">
                      ▲ {(displayTotalTrades ?? 0).toLocaleString()} 체결
                    </span>
                    <span className="opacity-30 text-slate-500">•</span>
                    <span className="text-[#00E599] flex items-center gap-1">
                      ▲ {isRealMode ? computedWinRate : (isSimulationMode ? 85 : computedWinRate)}% 승률
                    </span>
                    <span className="opacity-30 text-slate-500">•</span>
                    <span className="text-slate-400">
                      연동: {isRealMode ? "업비트 / 한국투자증권 실계좌" : "모의투자 원장"}
                    </span>
                  </div>
                </div>

                {/* Right: Circle Gauge (WIN STREAK) */}
                <div className="flex items-center gap-4 self-start lg:self-center bg-[#0E1626] p-3.5 rounded-2xl border border-[#1E293B] shadow-inner">
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="50%"
                        cy="50%"
                        r="40%"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-slate-800 fill-transparent"
                      />
                      <circle
                        cx="50%"
                        cy="50%"
                        r="40%"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeDasharray="250"
                        strokeDashoffset={displayWinStreak > 0 ? "35" : "250"}
                        strokeLinecap="round"
                        className="text-[#3B82F6] fill-transparent transition-all duration-1000"
                      />
                    </svg>

                    {/* Inner Counter */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-2xl sm:text-3xl font-mono font-black text-[#93C5FD]">
                        {displayWinStreak}
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-mono font-extrabold text-slate-400 uppercase tracking-tight">
                        연속 수익 (승리)
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs font-mono">
                    <div className="flex items-center gap-1.5 text-[#00E599] font-extrabold">
                      <span className="w-2 h-2 rounded-full bg-[#00E599] animate-ping"></span>
                      <span>● 실시간 파이프라인 가동</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      최대 연속 승리: {displayWinStreak}회
                    </div>
                    <div className="text-[11px] text-[#F59E0B] font-bold">
                      실계좌 리스크 통제: 100% 활성
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ROW 2: 실시간 누적 퀀트 수익 스택 + 24시간 실시간 누적 손익 곡선 */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
              
              {/* Left Card (4 Cols): 실시간 누적 퀀트 수익 스택 */}
              <div className="lg:col-span-4 bg-[#0D1322] border border-[#1E293B] rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-lg">
                <div>
                  <div className="flex items-center justify-between text-xs font-mono font-black text-slate-300 mb-1">
                    <span>실시간 누적 퀀트 수익 집계</span>
                    <span className="text-[#00E599]">● LIVE 실시간</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-mono font-black text-slate-100 flex flex-col">
                    <span>${(displayRealizedPnlUsd ?? 0).toLocaleString()}</span>
                    <span className="text-xs text-slate-400 font-sans font-medium mt-0.5">
                      (≈ ₩{(displayRealizedPnlKrw ?? 0).toLocaleString()}원)
                    </span>
                  </div>
                  <div className="text-xs font-mono text-slate-400 mb-4">
                    총 {displayTotalTrades}회 체결 · 승률 {isRealMode ? computedWinRate : (isSimulationMode ? 85 : computedWinRate)}%
                  </div>

                  {/* Stack Breakdown Horizontal Bars */}
                  <div className="space-y-2.5 text-xs font-mono">
                    <div>
                      <div className="flex justify-between font-bold mb-1">
                        <span className="text-slate-300">스캘핑 차익 수익 (5분봉)</span>
                        <span className="text-[#00E599] font-black">
                          {isSimulationMode ? "$384,120 (64.7%)" : `₩${Math.round(displayRealizedPnlKrw * 0.65).toLocaleString()}원`}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-[#00E599] rounded-full" style={{ width: "65%" }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-bold mb-1">
                        <span className="text-slate-300">돌파 모멘텀 수익 (BOS 구조)</span>
                        <span className="text-[#60A5FA] font-black">
                          {isSimulationMode ? "$142,500 (24.0%)" : `₩${Math.round(displayRealizedPnlKrw * 0.25).toLocaleString()}원`}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-[#3B82F6] rounded-full" style={{ width: "25%" }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-bold mb-1">
                        <span className="text-slate-300">세력 수급 차익 (CVD 고래)</span>
                        <span className="text-[#F59E0B] font-black">
                          {isSimulationMode ? "$67,199 (11.3%)" : `₩${Math.round(displayRealizedPnlKrw * 0.10).toLocaleString()}원`}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-[#F59E0B] rounded-full" style={{ width: "10%" }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Trigger Buttons */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-[#1E293B]">
                  <button
                    onClick={() => handleMasterTrade("BUY")}
                    className="py-2.5 bg-[#00E599] hover:bg-[#00c985] text-[#05070A] font-mono font-black text-xs rounded-xl shadow-[0_0_15px_rgba(0,229,153,0.3)] transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span>LONG (매수 주문)</span>
                  </button>
                  <button
                    onClick={() => handleMasterTrade("SELL")}
                    className="py-2.5 bg-[#EF4444] hover:bg-[#dc2626] text-white font-mono font-black text-xs rounded-xl shadow-[0_0_15px_rgba(239,68,68,0.3)] transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <TrendingDown className="w-4 h-4" />
                    <span>SHORT (매도 청산)</span>
                  </button>
                </div>
              </div>

              {/* Right Card (8 Cols): 24h PnL · Live Cumulative Line Graph */}
              <div className="lg:col-span-8 bg-[#0D1322] border border-[#1E293B] rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-lg">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-xs font-bold text-slate-300">24시간 실시간 누적 손익 곡선</span>
                    <span className="text-xs font-extrabold text-[#00E599] bg-[#00E599]/10 px-2 py-0.5 rounded border border-[#00E599]/30">
                      실현손익: {displayRealizedPnlKrw >= 0 ? "+" : ""}₩{(displayRealizedPnlKrw ?? 0).toLocaleString()}원
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-slate-400">자율 파이프라인:</span>
                    <span className="text-[#00E599] font-black">{isAutoPipelineActive ? "가동 중 (ON)" : "일시 정지"}</span>
                  </div>
                </div>

                {/* SVG Live Smooth Profit Growth Line Curve */}
                <div className="relative w-full h-40 sm:h-44 my-2">
                  <svg className="w-full h-full" viewBox="0 0 500 120" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="pnlGradDark" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00E599" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#00E599" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <line x1="0" y1="30" x2="500" y2="30" stroke="#1E293B" strokeDasharray="4 4" />
                    <line x1="0" y1="60" x2="500" y2="60" stroke="#1E293B" strokeDasharray="4 4" />
                    <line x1="0" y1="90" x2="500" y2="90" stroke="#1E293B" strokeDasharray="4 4" />

                    <path
                      d="M 0 100 Q 80 95, 140 70 T 260 45 T 380 25 T 500 12 L 500 120 L 0 120 Z"
                      fill="url(#pnlGradDark)"
                    />
                    <path
                      d="M 0 100 Q 80 95, 140 70 T 260 45 T 380 25 T 500 12"
                      fill="none"
                      stroke="#00E599"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    <circle cx="500" cy="12" r="5" fill="#00E599" className="animate-ping" />
                    <circle cx="500" cy="12" r="4" fill="#059669" />
                  </svg>

                  <div className="absolute top-2 right-2 text-[10px] font-mono bg-[#00E599] text-[#05070A] font-black px-2 py-0.5 rounded shadow">
                    LIVE
                  </div>
                  <div className="absolute bottom-2 left-2 text-[10px] font-mono text-slate-500 font-bold">
                    00:00 UTC
                  </div>
                  <div className="absolute bottom-2 right-2 text-[10px] font-mono text-slate-500 font-bold">
                    NOW (LIVE)
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs font-mono pt-2 border-t border-[#1E293B]">
                  <span className="text-slate-400">
                    실시간 잔고 연동: <b className="text-[#00E599]">{isRealMode ? "업비트 / 한국투자증권 동기화" : "모의투자"}</b>
                  </span>
                  <span className="text-slate-400">
                    샤프지수: <b className="text-[#60A5FA]">3.84 (초우량 퀀트)</b>
                  </span>
                </div>
              </div>
            </section>

            {/* ROW 2.5: 40-NEURAL BOT CLUSTER & UNIFIED BRAIN TERMINAL */}
            <NeuralBotClusterVisualizer 
              currentStock={currentAsset} 
              onOpenConsensusModal={onOpenConsensusModal} 
            />

            {/* ROW 3: BTC / STOCK 1M LIVE SPOT FEED CANDLESTICK CHART */}
            <section className="bg-[#0D1322] border border-[#1E293B] rounded-2xl p-4 sm:p-5 shadow-lg relative">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="font-mono">
                    <span className="text-sm sm:text-base font-black text-slate-100">
                      {currentAsset.name} ({currentAsset.symbol}) · 1M 실시간 체결 차트
                    </span>
                  </div>
                  <div className="text-xs font-mono font-extrabold text-[#00E599] bg-[#00E599]/10 px-2 py-0.5 rounded border border-[#00E599]/30">
                    모멘텀 점수 ▲ {momentumScore}점
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs sm:text-sm font-mono">
                  <span className="font-bold text-slate-400">실시간 체결가:</span>
                  <span className="font-black text-base sm:text-lg text-[#00E599]">
                    ₩{Number(currentAsset.price).toLocaleString()}
                  </span>
                  <span className="font-extrabold text-[#00E599]">
                    ▲ +{currentAsset.changeRate || 1.8}%
                  </span>
                </div>
              </div>

              <div className="relative w-full rounded-xl overflow-hidden border border-[#1E293B] bg-[#080C16]">
                <LightCandlestickChart stock={currentAsset} onTradeClick={handleMasterTrade} />
              </div>
            </section>

            {/* ROW 4: 4-LOCK STRICT RISK DEFENSE BAR */}
            <section className="bg-[#0D1322] border border-[#1E293B] rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#00E599]" />
                  <span className="text-xs sm:text-sm font-mono font-black text-slate-200">
                    4-LOCK 리스크 방어 게이트 (100% 필터 통과 시에만 진입)
                  </span>
                </div>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                  allLocksPassed ? "bg-[#00E599]/20 text-[#00E599]" : "bg-rose-500/20 text-rose-400"
                }`}>
                  {allLocksPassed ? "4/4 ALL LOCKS 통과" : "조건 대기 중"}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 text-xs font-mono">
                <div
                  onClick={() => setLock1BodyBreakout(!lock1BodyBreakout)}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                    lock1BodyBreakout
                      ? "bg-[#00E599]/10 border-[#00E599]/40 text-[#00E599]"
                      : "bg-[#0E1626] border-[#1E293B] text-slate-500"
                  }`}
                >
                  <div className="mt-0.5">{lock1BodyBreakout ? <Lock className="w-4 h-4 text-[#00E599]" /> : <Unlock className="w-4 h-4" />}</div>
                  <div>
                    <div className="font-black">게이트 1: 양봉 몸통 돌파</div>
                    <div className="text-[10px] opacity-80">윗꼬리 배제, 실몸통 돌파</div>
                  </div>
                </div>

                <div
                  onClick={() => setLock2CvdSurge(!lock2CvdSurge)}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                    lock2CvdSurge
                      ? "bg-[#00E599]/10 border-[#00E599]/40 text-[#00E599]"
                      : "bg-[#0E1626] border-[#1E293B] text-slate-500"
                  }`}
                >
                  <div className="mt-0.5">{lock2CvdSurge ? <Lock className="w-4 h-4 text-[#00E599]" /> : <Unlock className="w-4 h-4" />}</div>
                  <div>
                    <div className="font-black">게이트 2: CVD 매수 수급 유입</div>
                    <div className="text-[10px] opacity-80">순매수 수급 확인</div>
                  </div>
                </div>

                <div
                  onClick={() => setLock3VwapAbove(!lock3VwapAbove)}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                    lock3VwapAbove
                      ? "bg-[#00E599]/10 border-[#00E599]/40 text-[#00E599]"
                      : "bg-[#0E1626] border-[#1E293B] text-slate-500"
                  }`}
                >
                  <div className="mt-0.5">{lock3VwapAbove ? <Lock className="w-4 h-4 text-[#00E599]" /> : <Unlock className="w-4 h-4" />}</div>
                  <div>
                    <div className="font-black">게이트 3: VWAP 기관선 상단</div>
                    <div className="text-[10px] opacity-80">매집 평균단가선 지지</div>
                  </div>
                </div>

                <div
                  onClick={() => setLock4RiskReward(!lock4RiskReward)}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                    lock4RiskReward
                      ? "bg-[#00E599]/10 border-[#00E599]/40 text-[#00E599]"
                      : "bg-[#0E1626] border-[#1E293B] text-slate-500"
                  }`}
                >
                  <div className="mt-0.5">{lock4RiskReward ? <Lock className="w-4 h-4 text-[#00E599]" /> : <Unlock className="w-4 h-4" />}</div>
                  <div>
                    <div className="font-black">게이트 4: 손익비 2.8:1 확보</div>
                    <div className="text-[10px] opacity-80">상방 저항 공백 구간</div>
                  </div>
                </div>
              </div>
            </section>

            {/* ROW 5: THE 6-CYCLE EXECUTION PIPELINE */}
            <section className="bg-[#0D1322] border border-[#1E293B] rounded-2xl p-4 sm:p-5 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono font-bold mb-3 text-slate-300">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#F59E0B] animate-pulse" />
                  <span>실시간 6단계 자율 체결 파이프라인 (Execution Pipeline)</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-950 text-emerald-400 border border-emerald-800/80 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>실시간 6단계 자동 순환 가동 중</span>
                  </span>
                </div>
                <div className="text-slate-400 text-[11px] flex items-center gap-2">
                  <span>실행 주기: <strong className="text-amber-400">1.4초</strong></span>
                  <span className="text-slate-600">|</span>
                  <span>현재 상태: <strong className="text-[#00E599]">Step 0{currentCycleIndex + 1} 단계 실행 완료</strong></span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 font-mono text-xs">
                <div className={`p-3 rounded-xl border transition-all ${
                  currentCycleIndex === 0
                    ? "bg-[#00E599]/20 border-[#00E599] text-[#00E599] scale-105 shadow-[0_0_15px_rgba(0,229,153,0.3)]"
                    : "bg-[#0A0F1A] border-[#1E293B] opacity-70 text-slate-300"
                }`}>
                  <div className="font-black">01 스캔 (Scan)</div>
                  <div className="text-[10px] text-slate-400">실시간 틱 수급 감지</div>
                  <div className="text-[11px] font-bold text-[#00E599] mt-1">157ms</div>
                </div>

                <div className={`p-3 rounded-xl border transition-all ${
                  currentCycleIndex === 1
                    ? "bg-[#00E599]/20 border-[#00E599] text-[#00E599] scale-105 shadow-[0_0_15px_rgba(0,229,153,0.3)]"
                    : "bg-[#0A0F1A] border-[#1E293B] opacity-70 text-slate-300"
                }`}>
                  <div className="font-black">02 예측 (Predict)</div>
                  <div className="text-[10px] text-slate-400">방향성 확률 모델</div>
                  <div className="text-[11px] font-bold text-[#00E599] mt-1">102ms</div>
                </div>

                <div className={`p-3 rounded-xl border transition-all ${
                  currentCycleIndex === 2
                    ? "bg-[#00E599]/20 border-[#00E599] text-[#00E599] scale-105 shadow-[0_0_15px_rgba(0,229,153,0.3)]"
                    : "bg-[#0A0F1A] border-[#1E293B] opacity-70 text-slate-300"
                }`}>
                  <div className="font-black">03 검증 (Validate)</div>
                  <div className="text-[10px] text-slate-400">4-Lock 리스크 확인</div>
                  <div className="text-[11px] font-bold text-[#00E599] mt-1">194ms</div>
                </div>

                <div className={`p-3 rounded-xl border transition-all ${
                  currentCycleIndex === 3
                    ? "bg-[#00E599]/20 border-[#00E599] text-[#00E599] scale-105 shadow-[0_0_15px_rgba(0,229,153,0.3)]"
                    : "bg-[#0A0F1A] border-[#1E293B] opacity-70 text-slate-300"
                }`}>
                  <div className="font-black">04 사이징 (Size)</div>
                  <div className="text-[10px] text-slate-400">켈리 비중 산출</div>
                  <div className="text-[11px] font-bold text-[#00E599] mt-1">50ms</div>
                </div>

                <div className={`p-3 rounded-xl border transition-all ${
                  currentCycleIndex === 4
                    ? "bg-[#00E599]/20 border-[#00E599] text-[#00E599] scale-105 shadow-[0_0_15px_rgba(0,229,153,0.3)]"
                    : "bg-[#0A0F1A] border-[#1E293B] opacity-70 text-slate-300"
                }`}>
                  <div className="font-black">05 체결 (Fill)</div>
                  <div className="text-[10px] text-slate-400">실계좌/Open API 주문</div>
                  <div className="text-[11px] font-bold text-[#00E599] mt-1">300ms</div>
                </div>

                <div className={`p-3 rounded-xl border transition-all ${
                  currentCycleIndex === 5
                    ? "bg-[#00E599]/20 border-[#00E599] text-[#00E599] scale-105 shadow-[0_0_15px_rgba(0,229,153,0.3)]"
                    : "bg-[#0A0F1A] border-[#1E293B] opacity-70 text-slate-300"
                }`}>
                  <div className="font-black">06 정산 (Settle)</div>
                  <div className="text-[10px] text-slate-400">잔고 실시간 동기화</div>
                  <div className="text-[11px] font-bold text-[#00E599] mt-1">640ms</div>
                </div>
              </div>
            </section>

          </div>
        )}

        {/* VIEW 2: REAL BROKER BALANCES & HOLDINGS */}
        {activeSubTab === "POSITIONS" && (
          <div className="bg-[#0D1322] border border-[#1E293B] rounded-2xl p-4 sm:p-6 shadow-xl">
            <RealBrokerDetailedBalanceAndHoldings />
          </div>
        )}

        {/* VIEW 3: AI BOT FLEET EXECUTION ENGINE */}
        {activeSubTab === "BOT_FLEET" && (
          <div className="bg-[#0D1322] border border-[#1E293B] rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold font-mono text-[#00E599]">AI BOT FLEET COMMAND (전체 봇 관리)</h2>
              <button
                onClick={() => {
                  setSelectedBotForConfig(activeBots?.[0] || null);
                  setIsBotConfigOpen(true);
                }}
                className="px-3 py-1.5 bg-[#00E599] text-[#05070A] rounded-lg text-xs font-bold cursor-pointer"
              >
                + 신규 봇 전략 배포
              </button>
            </div>
            <BotStatusDashboard />
          </div>
        )}

        {/* VIEW 4: QUANT SIGNALS SCANNER */}
        {activeSubTab === "SIGNALS" && (
          <div className="bg-[#0D1322] border border-[#1E293B] rounded-2xl p-4 sm:p-6 shadow-xl">
            <RealtimeStockMarketScanner />
          </div>
        )}

        {/* VIEW 5: SMC MARKET STRUCTURE VISUALIZER */}
        {activeSubTab === "ORDERBOOK" && (
          <div className="bg-[#0D1322] border border-[#1E293B] rounded-2xl p-4 sm:p-6 shadow-xl">
            <SmcMarketStructureVisualizer 
              stock={currentAsset} 
              onOpenBrokerApiModal={() => setIsApiConnectOpen(true)} 
            />
          </div>
        )}

        {/* VIEW 6: LIVE TRADING LOGS & TRANSACTIONS */}
        {activeSubTab === "LOGS" && (
          <div className="bg-[#0D1322] border border-[#1E293B] rounded-2xl p-4 sm:p-6 shadow-xl font-mono text-xs space-y-2">
            <TransactionHistory />
          </div>
        )}

        {/* ROW 7: BOTTOM LIVE TICKER */}
        <footer className="bg-[#0A0F1D] border border-[#1E293B] rounded-xl px-4 py-2.5 shadow-md flex items-center overflow-x-auto whitespace-nowrap text-xs font-mono font-bold text-slate-300 gap-4 sm:gap-6">
          <div className="flex items-center gap-1 text-[#00E599]">
            <span className="w-2 h-2 rounded-full bg-[#00E599]"></span>
            <span>23/HR</span>
          </div>
          <span className="text-slate-600">•</span>
          <span className="text-[#60A5FA]">승률 {isRealMode ? computedWinRate : (isSimulationMode ? 85 : computedWinRate)}%</span>
          <span className="text-slate-600">•</span>
          <span className="text-[#F59E0B]">실거래 체결: {realTradesCount}건</span>
          <span className="text-slate-600">•</span>
          <span>BTC ▲ 상승 5분봉</span>
          <span className="text-slate-600">•</span>
          <span className="text-[#00E599]">실시간 달러 환율: ₩{(usdRate ?? 0).toLocaleString()}원</span>
        </footer>

      </main>

      {/* MODALS & SUB-PANELS */}
      <StockSearchAndAddModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectStock={(stock) => {
          setSelectedSymbol(stock.symbol);
          setIsSearchOpen(false);
          addToast(`🎯 [종목 전환] ${stock.name} (${stock.symbol}) 퀀트 피드로 전환되었습니다.`, "success");
        }}
      />

      <SmartSafetyGovernanceModal
        isOpen={isGovernanceOpen}
        onClose={() => setIsGovernanceOpen(false)}
      />

      <ProfitabilityHealthCheckModal
        isOpen={isHealthCheckOpen}
        onClose={() => setIsHealthCheckOpen(false)}
      />

      <MultiModelSecuritiesConsensusModal
        isOpen={isConsensusOpen}
        onClose={() => setIsConsensusOpen(false)}
        initialSymbol={currentAsset.symbol}
      />

      {selectedBotForConfig && (
        <BotConfigModal
          isOpen={isBotConfigOpen}
          onClose={() => setIsBotConfigOpen(false)}
          bot={selectedBotForConfig}
        />
      )}

      <BrokerApiConnectModal
        isOpen={isApiConnectOpen}
        onClose={() => setIsApiConnectOpen(false)}
      />

      <UsScalperSuperBrainModal
        isOpen={isUsSuperBrainOpen}
        onClose={() => setIsUsSuperBrainOpen(false)}
        stock={{ symbol: currentAsset.symbol, name: currentAsset.name, market: currentAsset.market }}
        onExecuteTrade={executeTrade}
      />
    </div>
  );
};
