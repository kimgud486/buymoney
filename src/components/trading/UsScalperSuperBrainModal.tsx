import React, { useState, useEffect, useMemo } from "react";
import { 
  Zap, 
  ShieldAlert, 
  Activity, 
  Flame, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  Lock, 
  Sparkles, 
  Cpu, 
  Eye, 
  Layers, 
  BarChart3, 
  Crosshair, 
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Globe,
  Radio
} from "lucide-react";
import { UsScalperSuperBrainEngine, UsScalperBrainResult, UsStockMarketTick } from "../../services/UsScalperSuperBrainEngine";
import { UsMarketAiPromptBuilder, UsFinancialDataAnalyzer, UsFinancialMetrics } from "../../services/UsMarketSpecializedModule";
import { getMarketStatus } from "../../lib/marketHours";

interface UsScalperSuperBrainModalProps {
  isOpen: boolean;
  onClose: () => void;
  stock?: {
    symbol: string;
    name: string;
    price?: number;
    market?: string;
  };
  onExecuteTrade?: (order: any) => void;
}

const PRESET_US_HUNTER_STOCKS: UsStockMarketTick[] = [
  {
    symbol: "NVDA",
    name: "엔비디아 (NVIDIA)",
    price: 128.5,
    open: 125.2,
    high: 130.4,
    low: 124.8,
    prevClose: 124.5,
    changeRate: 3.21,
    volume: 68420000,
    rvol: 4.8,
    floatSharesM: 2450.0,
    shortInterestPct: 1.8,
    bid: 128.48,
    ask: 128.52,
    bidSize: 4500,
    askSize: 1200,
    vwap: 127.4,
    marketSession: "REGULAR",
    spyTrend: "BULL",
    qqqTrend: "BULL",
    newsCatalyst: {
      headline: "차세대 Blackwell AI 반도체 양산 및 빅테크 300억 달러 수주 확정",
      type: "CONTRACT",
      score: 95
    }
  },
  {
    symbol: "TSLA",
    name: "테슬라 (Tesla)",
    price: 218.4,
    open: 212.0,
    high: 221.5,
    low: 210.8,
    prevClose: 211.5,
    changeRate: 3.26,
    volume: 48900000,
    rvol: 3.9,
    floatSharesM: 2680.0,
    shortInterestPct: 3.4,
    bid: 218.35,
    ask: 218.45,
    bidSize: 3200,
    askSize: 1800,
    vwap: 216.2,
    marketSession: "REGULAR",
    spyTrend: "BULL",
    qqqTrend: "BULL",
    newsCatalyst: {
      headline: "FSD v13 완전자율주행 승인 및 로보택시 상용화 가속",
      type: "GENERAL",
      score: 88
    }
  },
  {
    symbol: "PLTR",
    name: "팔란티어 (Palantir)",
    price: 32.8,
    open: 30.5,
    high: 33.4,
    low: 30.2,
    prevClose: 30.1,
    changeRate: 8.97,
    volume: 38200000,
    rvol: 7.4,
    floatSharesM: 1980.0,
    shortInterestPct: 4.8,
    bid: 32.78,
    ask: 32.82,
    bidSize: 6200,
    askSize: 1400,
    vwap: 31.8,
    marketSession: "REGULAR",
    spyTrend: "BULL",
    qqqTrend: "BULL",
    newsCatalyst: {
      headline: "미 국방부 AIP Enterprise 초대형 군사 AI 플랫폼 계약 체결",
      type: "CONTRACT",
      score: 96
    }
  },
  {
    symbol: "SOXL",
    name: "디렉시온 반도체 3X",
    price: 42.1,
    open: 39.8,
    high: 43.2,
    low: 39.5,
    prevClose: 39.6,
    changeRate: 6.31,
    volume: 52000000,
    rvol: 5.2,
    floatSharesM: 450.0,
    shortInterestPct: 6.2,
    bid: 42.08,
    ask: 42.12,
    bidSize: 8400,
    askSize: 3100,
    vwap: 41.2,
    marketSession: "REGULAR",
    spyTrend: "BULL",
    qqqTrend: "BULL",
    newsCatalyst: {
      headline: "필라델피아 반도체 지수 전고점 돌파 랠리",
      type: "GENERAL",
      score: 91
    }
  }
];

export const UsScalperSuperBrainModal: React.FC<UsScalperSuperBrainModalProps> = ({
  isOpen,
  onClose,
  stock,
  onExecuteTrade
}) => {
  const [selectedStockTick, setSelectedStockTick] = useState<UsStockMarketTick>(() => {
    if (stock && stock.market === "US") {
      const match = PRESET_US_HUNTER_STOCKS.find(s => s.symbol === stock.symbol);
      if (match) return match;
      return {
        symbol: stock.symbol,
        name: stock.name || stock.symbol,
        price: stock.price || 150,
        open: (stock.price || 150) * 0.98,
        high: (stock.price || 150) * 1.02,
        low: (stock.price || 150) * 0.97,
        prevClose: (stock.price || 150) * 0.98,
        changeRate: 2.04,
        volume: 12000000,
        rvol: 3.5,
        floatSharesM: 50.0,
        shortInterestPct: 5.0,
        bid: (stock.price || 150) * 0.999,
        ask: (stock.price || 150) * 1.001,
        bidSize: 2000,
        askSize: 1500,
        vwap: stock.price || 150,
        marketSession: "REGULAR",
        spyTrend: "BULL",
        qqqTrend: "BULL"
      };
    }
    return PRESET_US_HUNTER_STOCKS[0];
  });

  const [activeTab, setActiveTab] = useState<"HUNTER" | "FUTURE_PATH" | "AGENTS" | "FLOW" | "MICRO" | "PROMPT_FIN">("HUNTER");
  const [isLiveAutoScan, setIsLiveAutoScan] = useState(true);

  // Overseas Market AI Engine & Financial Data State
  const [isCopiedMasterText, setIsCopiedMasterText] = useState(false);
  const [selectedModel, setSelectedModel] = useState<"gemini-3.7-flash" | "gemini-3.1-pro-preview">("gemini-3.7-flash");
  const [sampleFinancials, setSampleFinancials] = useState<UsFinancialMetrics>({
    cashAndEquivalentsM: 185,
    quarterlyOperatingBurnM: 14,
    totalDebtM: 45,
    totalEquityM: 320,
    freeCashFlowM: -8,
    revenueGrowthYoY: 34.5,
    grossMarginPct: 61.2,
    netMarginPct: -12.4,
    lastEpsSurprisePct: 18.4,
    lastRevenueSurprisePct: 8.2,
    hasAtmShelfOffering: false,
    warrantOverhangPct: 4.2
  });
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiApiResponse, setAiApiResponse] = useState<any>(null);

  const promptStructure = useMemo(() => {
    return UsMarketAiPromptBuilder.buildPromptStructure({
      symbol: selectedStockTick.symbol,
      name: selectedStockTick.name,
      marketSession: selectedStockTick.marketSession,
      price: selectedStockTick.price,
      prevClose: selectedStockTick.prevClose,
      changePct: selectedStockTick.changeRate,
      volume: selectedStockTick.volume,
      rvol: selectedStockTick.rvol,
      floatSharesM: selectedStockTick.floatSharesM,
      shortInterestPct: selectedStockTick.shortInterestPct,
      bid: selectedStockTick.bid,
      ask: selectedStockTick.ask,
      bidSize: selectedStockTick.bidSize,
      askSize: selectedStockTick.askSize,
      vwap: selectedStockTick.vwap,
      newsCatalystHeadline: selectedStockTick.newsCatalyst?.headline,
      newsCatalystType: selectedStockTick.newsCatalyst?.type as any,
      financials: sampleFinancials,
      selectedModel
    });
  }, [selectedStockTick, sampleFinancials, selectedModel]);

  const financialEval = useMemo(() => {
    return UsFinancialDataAnalyzer.analyze(sampleFinancials);
  }, [sampleFinancials]);

  const handleRunAiAnalysis = async () => {
    setIsAiLoading(true);
    try {
      const res = await fetch("/api/ai/us-market-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: selectedStockTick.symbol,
          name: selectedStockTick.name,
          marketSession: selectedStockTick.marketSession,
          price: selectedStockTick.price,
          prevClose: selectedStockTick.prevClose,
          changePct: selectedStockTick.changeRate,
          volume: selectedStockTick.volume,
          rvol: selectedStockTick.rvol,
          floatSharesM: selectedStockTick.floatSharesM,
          shortInterestPct: selectedStockTick.shortInterestPct,
          bid: selectedStockTick.bid,
          ask: selectedStockTick.ask,
          bidSize: selectedStockTick.bidSize,
          askSize: selectedStockTick.askSize,
          vwap: selectedStockTick.vwap,
          newsCatalystHeadline: selectedStockTick.newsCatalyst?.headline,
          newsCatalystType: selectedStockTick.newsCatalyst?.type as any,
          financials: sampleFinancials,
          selectedModel
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAiApiResponse(data);
      }
    } catch (e) {
      console.warn("AI Analysis API call error", e);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Sync if external stock prop changes
  useEffect(() => {
    if (stock && stock.market === "US") {
      const match = PRESET_US_HUNTER_STOCKS.find(s => s.symbol === stock.symbol);
      if (match) {
        setSelectedStockTick(match);
      } else {
        setSelectedStockTick({
          symbol: stock.symbol,
          name: stock.name || stock.symbol,
          price: stock.price || 150,
          open: (stock.price || 150) * 0.98,
          high: (stock.price || 150) * 1.02,
          low: (stock.price || 150) * 0.97,
          prevClose: (stock.price || 150) * 0.98,
          changeRate: 2.04,
          volume: 12000000,
          rvol: 3.5,
          floatSharesM: 50.0,
          shortInterestPct: 5.0,
          bid: (stock.price || 150) * 0.999,
          ask: (stock.price || 150) * 1.001,
          bidSize: 2000,
          askSize: 1500,
          vwap: stock.price || 150,
          marketSession: "REGULAR",
          spyTrend: "BULL",
          qqqTrend: "BULL"
        });
      }
    }
  }, [stock]);

  // Compute Brain Analysis
  const brainResult: UsScalperBrainResult = useMemo(() => {
    return UsScalperSuperBrainEngine.evaluate(selectedStockTick);
  }, [selectedStockTick]);

  const usStatus = getMarketStatus("US");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-950 border border-indigo-500/40 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* TOP HEADER */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border-b border-indigo-500/30 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 border border-indigo-500/40 rounded-xl text-indigo-400">
              <Cpu className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-white">🧠 US SCALPER SUPER BRAIN v5.0</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-black bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  미국주식 20-Agent 자율 뇌엔진
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-black ${
                  usStatus.isOpen ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse" : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                }`}>
                  {usStatus.statusBadgeText}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                NYSE/NASDAQ 프리마켓 스캐너 · 20개 전문 AI 합의 · 오더북 불균형(OBI) · 숏스퀴즈 감지 통합
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsLiveAutoScan(!isLiveAutoScan)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                isLiveAutoScan
                  ? "bg-emerald-950/80 border-emerald-500/60 text-emerald-300 shadow-sm"
                  : "bg-slate-800 border-slate-700 text-slate-400"
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${isLiveAutoScan ? "animate-pulse text-emerald-400" : ""}`} />
              <span>실시간 스캐너 {isLiveAutoScan ? "ON" : "OFF"}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* SUB HEADER - TICKER SELECTOR BAR */}
        <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <span className="text-xs text-slate-400 font-bold mr-1">🇺🇸 감시 종목:</span>
            {PRESET_US_HUNTER_STOCKS.map(stk => {
              const isSelected = selectedStockTick.symbol === stk.symbol;
              return (
                <button
                  key={stk.symbol}
                  onClick={() => setSelectedStockTick(stk)}
                  className={`px-3 py-1 rounded-lg text-xs font-black font-mono transition flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60"
                  }`}
                >
                  <span>{stk.symbol}</span>
                  <span className={stk.changeRate >= 0 ? "text-emerald-400" : "text-rose-400"}>
                    {stk.changeRate >= 0 ? "+" : ""}{stk.changeRate}%
                  </span>
                </button>
              );
            })}
          </div>

          {/* TAB NAV */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab("HUNTER")}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                activeTab === "HUNTER" ? "bg-indigo-500 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              🔥 헌터 & 종합 판정
            </button>
            <button
              onClick={() => setActiveTab("FUTURE_PATH")}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                activeTab === "FUTURE_PATH" ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30 font-black" : "text-purple-300 hover:text-white bg-purple-950/40 border border-purple-500/30"
              }`}
            >
              <span>🔮 미래 가격경로 & SELL 예측 (v5.1)</span>
            </button>
            <button
              onClick={() => setActiveTab("AGENTS")}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                activeTab === "AGENTS" ? "bg-indigo-500 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              🤖 30+ Agent 토론
            </button>
            <button
              onClick={() => setActiveTab("FLOW")}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                activeTab === "FLOW" ? "bg-indigo-500 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              🧨 숏스퀴즈 & 플로우
            </button>
            <button
              onClick={() => setActiveTab("MICRO")}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                activeTab === "MICRO" ? "bg-indigo-500 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              🧬 오더북 & 호가(OBI)
            </button>
            <button
              onClick={() => setActiveTab("PROMPT_FIN")}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                activeTab === "PROMPT_FIN" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" : "text-indigo-400 hover:text-indigo-200 bg-indigo-950/40 border border-indigo-500/30"
              }`}
            >
              <span>⚙️ 미국 전용 프롬프트 & 재무 해석</span>
            </button>
          </div>
        </div>

        {/* MAIN BODY CONTENT */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {/* TOP SUMMARY STATS HERO */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Meta Score Card */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-500/40 relative overflow-hidden">
              <div className="text-[11px] text-indigo-300 font-bold uppercase tracking-wider">US SCALPER META SCORE</div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-white font-mono">{brainResult.metaScalperScore}</span>
                <span className="text-xs text-indigo-400 font-bold">/ 100</span>
                <span className="text-xs px-2 py-0.5 rounded font-bold bg-indigo-500/30 text-indigo-200 ml-auto">
                  신뢰도 {brainResult.confidenceScore}%
                </span>
              </div>
              <div className="mt-2 text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>{brainResult.stateBadge}</span>
              </div>
            </div>

            {/* Price & EV Card */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">현재가 & 기대손익비 (EV)</div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-white font-mono">${brainResult.price}</span>
                <span className={`text-xs font-bold font-mono ${selectedStockTick.changeRate >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {selectedStockTick.changeRate >= 0 ? "+" : ""}{selectedStockTick.changeRate}%
                </span>
              </div>
              <div className="mt-2 text-xs text-slate-300 flex justify-between font-mono">
                <span>기대값 (EV): <strong className="text-emerald-400">+{brainResult.expectedValueEv}%</strong></span>
                <span>손익비: <strong className="text-indigo-400">{brainResult.riskRewardRatio}:1</strong></span>
              </div>
            </div>

            {/* Tactical Execution Zone */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1 text-xs">
              <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">🎯 전술적 진입/청산 구역</div>
              <div className="flex justify-between font-mono pt-1">
                <span className="text-slate-400">권장 진입구간:</span>
                <span className="text-emerald-300 font-bold">${brainResult.entryZone.min} ~ ${brainResult.entryZone.max}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-400">1차 목표가 (TP1):</span>
                <span className="text-cyan-300 font-bold">${brainResult.entryZone.target1}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-400">손절 방패선 (SL):</span>
                <span className="text-rose-400 font-bold">${brainResult.entryZone.invalidationStopLoss}</span>
              </div>
            </div>

            {/* Squeeze & Flow Status */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1 text-xs">
              <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">🧨 수급 드라이버 & 숏스퀴즈</div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-slate-400">수급 핵심 원인:</span>
                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold text-[10px]">
                  {brainResult.flowIntelligence.primaryDriver}
                </span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-400">스퀴즈 파동:</span>
                <span className="text-amber-300 font-bold">{brainResult.flowIntelligence.squeezeStage}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-400">RVOL / Float:</span>
                <span className="text-indigo-300 font-bold">{selectedStockTick.rvol.toFixed(1)}x / {selectedStockTick.floatSharesM}M</span>
              </div>
            </div>
          </div>

          {/* PRESCRIPTION ACTION BANNER */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-indigo-950/80 border border-indigo-500/40 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 shrink-0 mt-0.5">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-black text-indigo-300 flex items-center gap-2">
                  <span>AI 자율 트레이딩 실시간 명령:</span>
                  <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-mono text-[10px]">
                    {brainResult.prescriptions.action}
                  </span>
                </div>
                <p className="text-xs text-slate-200 font-medium">
                  {brainResult.prescriptions.koreanInstruction}
                </p>
              </div>
            </div>

            {onExecuteTrade && (
              <button
                onClick={() => {
                  onExecuteTrade({
                    symbol: selectedStockTick.symbol,
                    name: selectedStockTick.name,
                    side: "BUY",
                    price: brainResult.entryZone.recommended,
                    qty: 10,
                    market: "US"
                  });
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-xs transition cursor-pointer shadow-lg flex items-center gap-1.5"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>해외주식 AI 즉시 주문 실행</span>
              </button>
            )}
          </div>

          {/* TAB 1: HUNTER & SCORE PILLARS */}
          {activeTab === "HUNTER" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                  <div className="text-[11px] text-slate-400 font-bold">지수 환경 (Regime)</div>
                  <div className="text-xl font-black text-white font-mono">{brainResult.scores.marketRegime}점</div>
                  <div className="text-[10px] text-slate-400">SPY/QQQ 나스닥 매크로 연동</div>
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                  <div className="text-[11px] text-slate-400 font-bold">스캐너 모멘텀 (RVOL)</div>
                  <div className="text-xl font-black text-emerald-400 font-mono">{brainResult.scores.scannerMomentum}점</div>
                  <div className="text-[10px] text-slate-400">유동성 폭발 가속도 지수</div>
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                  <div className="text-[11px] text-slate-400 font-bold">뉴스/SEC 공시 강도</div>
                  <div className="text-xl font-black text-cyan-400 font-mono">{brainResult.scores.catalystPower}점</div>
                  <div className="text-[10px] text-slate-400">Catalyst 파괴력 점수</div>
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                  <div className="text-[11px] text-slate-400 font-bold">체결창 매수 공격성</div>
                  <div className="text-xl font-black text-purple-400 font-mono">{brainResult.scores.microstructureTape}점</div>
                  <div className="text-[10px] text-slate-400">Ask Hit 체결 속도</div>
                </div>
              </div>

              {/* RISK SHIELDS GRID */}
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
                <div className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>리스크 감지 방패 (가짜 돌파 & 추격매수 차단)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="text-slate-400 text-[11px]">가짜 돌파(Fakeout) 위험</div>
                    <div className={`font-mono font-bold text-sm ${brainResult.risks.fakeoutRisk > 50 ? "text-rose-400" : "text-emerald-400"}`}>
                      {brainResult.risks.fakeoutRisk}% ({brainResult.risks.fakeoutRisk > 50 ? "주의" : "안전"})
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="text-slate-400 text-[11px]">과열 추격매수 피로도</div>
                    <div className={`font-mono font-bold text-sm ${brainResult.risks.exhaustionChaseRisk > 70 ? "text-rose-400" : "text-emerald-400"}`}>
                      {brainResult.risks.exhaustionChaseRisk}% ({brainResult.risks.exhaustionChaseRisk > 70 ? "추격금지" : "적정"})
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="text-slate-400 text-[11px]">LULD 서킷브레이커 위험</div>
                    <div className={`font-mono font-bold text-sm ${brainResult.risks.haltRisk === "HIGH" || brainResult.risks.haltRisk === "EXTREME" ? "text-rose-400" : "text-emerald-400"}`}>
                      {brainResult.risks.haltRisk}
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="text-slate-400 text-[11px]">유상증자(Offering) 위험</div>
                    <div className={`font-mono font-bold text-sm ${brainResult.risks.dilutionOfferingRisk > 50 ? "text-rose-400" : "text-emerald-400"}`}>
                      {brainResult.risks.dilutionOfferingRisk}% ({brainResult.risks.dilutionOfferingRisk > 50 ? "희석경고" : "안전"})
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 20-AGENT DEBATE MATRIX */}
          {activeTab === "AGENTS" && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400 font-bold flex items-center justify-between">
                <span>월가 딜링룸 20개 전문 AI 에이전트 실시간 합의 보고서</span>
                <span className="text-indigo-400 font-mono">20 Active Specialist Bots</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {brainResult.agentReports.map(agent => (
                  <div key={agent.name} className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-200">{agent.name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-white">{agent.score}점</span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          agent.status === "BULLISH" ? "bg-emerald-500/20 text-emerald-300" :
                          agent.status === "WARNING" ? "bg-amber-500/20 text-amber-300" :
                          agent.status === "CRITICAL" ? "bg-rose-500/20 text-rose-300" :
                          "bg-slate-700 text-slate-300"
                        }`}>
                          {agent.status}
                        </span>
                      </div>
                    </div>
                    <div className="font-bold text-slate-300">{agent.headline}</div>
                    <p className="text-[11px] text-slate-400">{agent.detail}</p>
                    <div className="flex gap-1 pt-1">
                      {agent.tags.map(t => (
                        <span key={t} className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[9px] font-mono">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: SQUEEZE & FLOW INTELLIGENCE */}
          {activeTab === "FLOW" && (
            <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-4 text-xs">
              <div className="font-black text-slate-200 flex items-center justify-between">
                <span>🧨 기관 수급 · 숏스퀴즈(Short Squeeze) 심층 분석</span>
                <span className="text-purple-400 font-mono">Flow Intelligence Layer</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <div className="text-slate-400">공매도 잔고율 & 대차 압력</div>
                  <div className="text-lg font-black text-amber-400 font-mono">
                    {selectedStockTick.shortInterestPct}% / Float
                  </div>
                  <p className="text-[11px] text-slate-400">숏커버링 유발 임계치 도달 여부 분석</p>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <div className="text-slate-400">유통주식수(Float) 회전율</div>
                  <div className="text-lg font-black text-indigo-400 font-mono">
                    {brainResult.flowIntelligence.floatTurnoverRatio}x Turnover
                  </div>
                  <p className="text-[11px] text-slate-400">당일 발행 유통물량 손바뀜 강도</p>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <div className="text-slate-400">스마트머니 흡수 상태 (Absorption)</div>
                  <div className="text-lg font-black text-emerald-400 font-mono">
                    {brainResult.flowIntelligence.absorptionState}
                  </div>
                  <p className="text-[11px] text-slate-400">매도 물량을 매수세가 가볍게 흡수 중</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MICROSTRUCTURE & OBI */}
          {activeTab === "MICRO" && (
            <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-4 text-xs">
              <div className="font-black text-slate-200 flex items-center justify-between">
                <span>🧬 L2/L3 오더북 잔량 불균형(OBI) & 호가창 분석</span>
                <span className="text-cyan-400 font-mono">Microstructure Brain</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-slate-400">매수/매도 잔량 불균형 (Order Book Imbalance)</div>
                  <div className="text-2xl font-black font-mono text-cyan-400">
                    {brainResult.flowIntelligence.orderBookImbalanceObi > 0 ? "+" : ""}
                    {brainResult.flowIntelligence.orderBookImbalanceObi}%
                  </div>
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-full"
                      style={{ width: `${Math.max(10, Math.min(90, (brainResult.flowIntelligence.orderBookImbalanceObi + 100) / 2))}%` }}
                    ></div>
                    <div className="bg-rose-500 h-full flex-1"></div>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                    <span>매수호가 잔량: {selectedStockTick.bidSize}</span>
                    <span>매도호가 잔량: {selectedStockTick.askSize}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-slate-400">체결창 매수 공격성 (Ask Hit Ratio)</div>
                  <div className="text-2xl font-black font-mono text-emerald-400">
                    {brainResult.flowIntelligence.buyerTapeAggression}%
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    시장가로 매도 호가를 긁어 체결시키는 스마트머니의 공격적 매수 체결 비중이 우세합니다.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: FUTURE PRICE PATH & INDEPENDENT SELL ENGINE (v5.1) */}
          {activeTab === "FUTURE_PATH" && (
            <div className="space-y-4 text-xs">
              {/* SECTION 1: MULTI-HORIZON FORECAST MATRIX */}
              <div className="p-4 bg-slate-900 border border-purple-500/30 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-black text-purple-300 text-sm flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    v5.1 멀티 타임프레임 미래 방향성 예측 (Multi-Horizon Forecast)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/40 font-mono font-bold text-[10px]">
                    REALTIME DYNAMIC RE-EVALUATION
                  </span>
                </div>

                <div className="grid grid-cols-3 md:grid-cols-9 gap-2">
                  {brainResult.futurePath.multiHorizon.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg border text-center space-y-1 ${
                        item.direction === "UP"
                          ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                          : item.direction === "DOWN"
                          ? "bg-rose-950/40 border-rose-500/40 text-rose-300"
                          : "bg-slate-950 border-slate-800 text-slate-300"
                      }`}
                    >
                      <div className="text-[10px] font-bold text-slate-400 font-mono">{item.horizon} 후</div>
                      <div className="flex items-center justify-center gap-0.5 font-black text-xs font-mono">
                        {item.direction === "UP" && <TrendingUp className="w-3 h-3 text-emerald-400" />}
                        {item.direction === "DOWN" && <TrendingDown className="w-3 h-3 text-rose-400" />}
                        <span>{item.direction}</span>
                      </div>
                      <div className="text-[10px] font-mono font-bold">
                        {item.score}% ({item.expectedChangePct > 0 ? '+' : ''}{item.expectedChangePct}%)
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 2: SCENARIOS A ~ E PRICE TRAJECTORY MATRIX */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-black text-white text-sm flex items-center gap-1.5">
                    <Crosshair className="w-4 h-4 text-cyan-400" />
                    미래 가격경로 후보 시나리오 생성 (Scenarios A ~ E)
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    예상 범위: <strong className="text-cyan-300">{brainResult.futurePath.expectedRange}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {brainResult.futurePath.scenarios.map((sc) => (
                    <div
                      key={sc.id}
                      className={`p-3.5 rounded-xl border space-y-2 relative overflow-hidden ${
                        sc.id === "A"
                          ? "bg-indigo-950/50 border-indigo-500/50 text-indigo-100"
                          : sc.id === "D"
                          ? "bg-purple-950/50 border-purple-500/50 text-purple-100"
                          : sc.id === "C" || sc.id === "E"
                          ? "bg-rose-950/40 border-rose-500/40 text-rose-100"
                          : "bg-slate-950 border-slate-800 text-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded font-black font-mono text-[10px] bg-slate-900 border border-slate-700">
                          SCENARIO {sc.id}
                        </span>
                        <span className="text-sm font-black font-mono text-amber-300">
                          {sc.probabilityPct}% 확률
                        </span>
                      </div>

                      <div className="font-bold text-xs leading-snug">{sc.name}</div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1 border-t border-slate-800/80">
                        <div>
                          <span className="text-slate-400 block">발동 조건(Trigger)</span>
                          <span className="font-bold text-emerald-300">${sc.triggerPrice}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">목표 타겟존</span>
                          <span className="font-bold text-cyan-300">${sc.targetZoneMin} ~ ${sc.targetZoneMax}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">무효화 스탑선</span>
                          <span className="font-bold text-rose-400">&lt; ${sc.invalidationPrice}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">예상 도달소요시간</span>
                          <span className="font-bold text-slate-200">{sc.expectedDuration}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 3: PRICE DISTRIBUTION PERCENTILES & INDEPENDENT SELL ENGINE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Price Distribution Percentiles (P10 ~ P90) */}
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-black text-cyan-300 text-sm flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4" />
                      가격 분포 확정 확률 (Price Distribution Forecast)
                    </span>
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between items-center text-[11px] font-mono">
                      <span className="text-rose-400">P10 (하방): ${brainResult.futurePath.priceDistribution.p10}</span>
                      <span className="text-slate-400">P25: ${brainResult.futurePath.priceDistribution.p25}</span>
                      <span className="text-amber-300 font-bold">Median: ${brainResult.futurePath.priceDistribution.median}</span>
                      <span className="text-cyan-300">P75: ${brainResult.futurePath.priceDistribution.p75}</span>
                      <span className="text-emerald-400 font-bold">P90 (상방): ${brainResult.futurePath.priceDistribution.p90}</span>
                    </div>

                    <div className="h-3 bg-slate-950 rounded-full border border-slate-800 overflow-hidden flex items-center p-0.5">
                      <div className="h-full bg-rose-500/80 rounded-l" style={{ width: "20%" }}></div>
                      <div className="h-full bg-amber-500/80" style={{ width: "30%" }}></div>
                      <div className="h-full bg-emerald-500/80 rounded-r" style={{ width: "50%" }}></div>
                    </div>

                    <p className="text-[10px] text-slate-400 leading-relaxed font-mono pt-1">
                      💡 통계적 변동성 분포 기반 5분~15분 예상 가격 중앙값은 <strong>${brainResult.futurePath.priceDistribution.median}</strong>이며, P90 상방 한계선은 <strong>${brainResult.futurePath.priceDistribution.p90}</strong>입니다.
                    </p>
                  </div>
                </div>

                {/* Independent SELL Engine & Profit Protection */}
                <div className="p-4 bg-slate-900 border border-rose-500/30 rounded-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-black text-rose-300 text-sm flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                      독립 SELL 엔진 & 수익 보존 방패 (Sell Engine)
                    </span>
                    <span className="px-2 py-0.5 rounded font-black font-mono text-[10px] bg-rose-950 text-rose-200 border border-rose-500/50">
                      SELL SCORE: {brainResult.independentSellEngine.sellScore}/100
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                      <div className="text-slate-400 text-[10px]">고점 형성 피로도 (Top Risk)</div>
                      <div className="text-base font-black text-rose-300">{brainResult.independentSellEngine.topRiskPct}%</div>
                    </div>
                    <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                      <div className="text-slate-400 text-[10px]">최고 수익 대비 반납률 (Giveback)</div>
                      <div className="text-base font-black text-amber-300">-{brainResult.independentSellEngine.profitGivebackPct}%</div>
                    </div>
                    <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                      <div className="text-slate-400 text-[10px]">축소 매도 구간 (Reduce Zone)</div>
                      <div className="text-xs font-bold text-slate-200">{brainResult.independentSellEngine.reduceZone}</div>
                    </div>
                    <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                      <div className="text-slate-400 text-[10px]">비상 청산가 (Emergency Exit)</div>
                      <div className="text-xs font-bold text-rose-400">&lt; ${brainResult.independentSellEngine.emergencyExit}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: 30+ AGENT VOTING BREAKDOWN & MASTER OUTPUT REPORT */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-black text-white text-sm flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-indigo-400" />
                    30+ Specialist Agent 투표 현황 & Section 41 마스터 리포트
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(brainResult.masterFormattedOutputText);
                      setIsCopiedMasterText(true);
                      setTimeout(() => setIsCopiedMasterText(false), 2000);
                    }}
                    className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] transition cursor-pointer flex items-center gap-1 shadow"
                  >
                    {isCopiedMasterText ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                        <span>복사 완료!</span>
                      </>
                    ) : (
                      <>
                        <Layers className="w-3.5 h-3.5" />
                        <span>마스터 리포트 전체 복사</span>
                      </>
                    )}
                  </button>
                </div>

                {/* VOTE SUMMARY BAR */}
                <div className="grid grid-cols-4 gap-2 text-center font-mono text-xs">
                  <div className="p-2 bg-emerald-950/50 border border-emerald-500/40 rounded-lg">
                    <span className="text-emerald-400 font-bold block">🟢 BULLISH</span>
                    <span className="text-lg font-black text-white">{brainResult.agentVotes.bullishCount} 표</span>
                  </div>
                  <div className="p-2 bg-slate-950 border border-slate-800 rounded-lg">
                    <span className="text-slate-400 font-bold block">🟡 NEUTRAL</span>
                    <span className="text-lg font-black text-white">{brainResult.agentVotes.neutralCount} 표</span>
                  </div>
                  <div className="p-2 bg-rose-950/50 border border-rose-500/40 rounded-lg">
                    <span className="text-rose-400 font-bold block">🟠 BEARISH</span>
                    <span className="text-lg font-black text-white">{brainResult.agentVotes.bearishCount} 표</span>
                  </div>
                  <div className="p-2 bg-purple-950/50 border border-purple-500/40 rounded-lg">
                    <span className="text-purple-300 font-bold block">🚨 VETO SHIELD</span>
                    <span className="text-lg font-black text-amber-300">{brainResult.agentVotes.vetoCount} 표</span>
                  </div>
                </div>

                {/* FORMATTED MASTER TEXT PREVIEW BOX */}
                <pre className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-[10px] text-cyan-200 font-mono overflow-x-auto max-h-64 leading-relaxed whitespace-pre-wrap">
                  {brainResult.masterFormattedOutputText}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 5: US MARKET SPECIALIZED PROMPT & FINANCIAL INTERPRETATION MODULE */}
          {activeTab === "PROMPT_FIN" && (
            <div className="space-y-4 text-xs">
              {/* SECTION 1: AI MODEL & PROMPT CONFIGURATION */}
              <div className="p-4 bg-slate-900 border border-indigo-500/30 rounded-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span className="font-black text-white text-sm">🇺🇸 해외 증시 특화 AI 뇌엔진 모델 선택</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedModel("gemini-3.7-flash")}
                      className={`px-3 py-1 rounded-lg font-bold font-mono transition cursor-pointer ${
                        selectedModel === "gemini-3.7-flash"
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                          : "bg-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Gemini 3.7 Flash (초고속 스캘핑)
                    </button>
                    <button
                      onClick={() => setSelectedModel("gemini-3.1-pro-preview")}
                      className={`px-3 py-1 rounded-lg font-bold font-mono transition cursor-pointer ${
                        selectedModel === "gemini-3.1-pro-preview"
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                          : "bg-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Gemini 3.1 Pro (SEC 심층 재무)
                    </button>
                  </div>
                </div>

                <p className="text-slate-400 text-[11px] leading-relaxed">
                  미국 시장 특화 뇌엔진은 **Premarket Gap & Go**, **Float 유통물량 회전율**, **L2 Order Book Imbalance(OBI)**, **SEC EDGAR 공시(8-K, 10-K, Form S-3 희석)** 및 **Ross Cameron 모멘텀 수급 규칙**을 구체화한 전용 프롬프트를 사용하여 분석을 수행합니다.
                </p>
              </div>

              {/* SECTION 2: US FINANCIAL INTERPRETATION LOGIC (US GAAP) */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-black text-amber-300 text-sm flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4" />
                    US GAAP 재무 데이터 해석 로직 (Cash Burn & Dilution Risk)
                  </span>
                  <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                    financialEval.dilutionStatus === "HIGH_DILUTION_RISK" ? "bg-rose-500/20 text-rose-300 border border-rose-500/40" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  }`}>
                    재무 등급 {financialEval.financialHealthGrade} · 희석위험 {financialEval.dilutionOfferingRiskScore}%
                  </span>
                </div>

                {/* INTERPRETATION CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                    <div className="text-slate-400 text-[10px]">보유 현금성 자산 (Cash & Equiv)</div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={sampleFinancials.cashAndEquivalentsM}
                        onChange={(e) => setSampleFinancials({ ...sampleFinancials, cashAndEquivalentsM: Number(e.target.value) || 0 })}
                        className="bg-slate-900 border border-slate-700 px-2 py-1 rounded w-20 text-white font-mono font-bold text-xs"
                      />
                      <span className="text-slate-400 font-bold">$M</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                    <div className="text-slate-400 text-[10px]">분기 영업 캐시번 (Quarterly Burn)</div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={sampleFinancials.quarterlyOperatingBurnM}
                        onChange={(e) => setSampleFinancials({ ...sampleFinancials, quarterlyOperatingBurnM: Number(e.target.value) || 0 })}
                        className="bg-slate-900 border border-slate-700 px-2 py-1 rounded w-20 text-white font-mono font-bold text-xs"
                      />
                      <span className="text-slate-400 font-bold">$M/분기</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                    <div className="text-slate-400 text-[10px]">자금소진 잔여 기간 (Runway)</div>
                    <div className="text-base font-black font-mono text-cyan-300">
                      {financialEval.runwayMonths === 999 ? "흑자 구조" : `${financialEval.runwayMonths} 개월`}
                    </div>
                    <div className="text-[9px] text-slate-400 font-bold">{financialEval.runwayStatus}</div>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                    <div className="text-slate-400 text-[10px]">Form S-3 유상증자(ATM) 공시</div>
                    <button
                      onClick={() => setSampleFinancials({ ...sampleFinancials, hasAtmShelfOffering: !sampleFinancials.hasAtmShelfOffering })}
                      className={`px-3 py-1 rounded text-xs font-bold font-mono transition cursor-pointer w-full ${
                        sampleFinancials.hasAtmShelfOffering
                          ? "bg-rose-950/80 border border-rose-500/60 text-rose-300"
                          : "bg-slate-800 border border-slate-700 text-slate-400"
                      }`}
                    >
                      {sampleFinancials.hasAtmShelfOffering ? "⚠️ ATM Shelf 등록됨 (희석주의)" : "✅ 유상증자 공시 없음"}
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-300 leading-relaxed font-mono">
                  💡 <strong className="text-amber-300">AI 재무 평가 요약:</strong> {financialEval.summaryKorean}
                </div>
              </div>

              {/* SECTION 3: US PROMPT STRUCTURE PREVIEW & LIVE RUNNER */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-black text-indigo-300 text-sm flex items-center gap-1.5">
                    <Cpu className="w-4 h-4" />
                    미국 시장 전용 프롬프트 구조 정의 (US Prompt Spec)
                  </span>
                  <button
                    onClick={handleRunAiAnalysis}
                    disabled={isAiLoading}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer shadow-md flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isAiLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Gemini 미국주식 AI 분석 실행 중...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 text-amber-300" />
                        <span>🚀 Gemini AI 실시간 프롬프트 테스트 실행</span>
                      </>
                    )}
                  </button>
                </div>

                {/* SYSTEM PROMPT & USER PROMPT TABS / PANELS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">System Prompt (미국 시장 퀀트 마스터 지침)</div>
                    <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[10px] text-slate-300 font-mono overflow-x-auto max-h-56 leading-relaxed whitespace-pre-wrap">
                      {promptStructure.systemPrompt}
                    </pre>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">User Prompt (실시간 수급 + US GAAP 페이로드)</div>
                    <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[10px] text-cyan-200 font-mono overflow-x-auto max-h-56 leading-relaxed whitespace-pre-wrap">
                      {promptStructure.userPrompt}
                    </pre>
                  </div>
                </div>

                {/* LIVE AI RESPONSE RESULT DISPLAY */}
                {aiApiResponse && (
                  <div className="p-3 bg-indigo-950/60 border border-indigo-500/40 rounded-xl space-y-2 mt-3 animate-in fade-in">
                    <div className="flex items-center justify-between text-xs font-bold text-indigo-300">
                      <span>✨ Gemini API 실시간 해외증시 뇌엔진 분석 결과 ({aiApiResponse.modelUsed})</span>
                      <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-200 text-[10px]">
                        {aiApiResponse.isAiGenerated ? "AI GENERATED" : "SPECIALIST ENGINE"}
                      </span>
                    </div>
                    <pre className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-[10px] text-emerald-300 font-mono overflow-x-auto max-h-48 whitespace-pre-wrap">
                      {JSON.stringify(aiApiResponse.analysis, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
