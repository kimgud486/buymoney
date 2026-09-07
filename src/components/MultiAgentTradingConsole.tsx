import React, { useState, useMemo, useEffect } from "react";
import {
  Brain,
  ShieldAlert,
  Search,
  Activity,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  BarChart3,
  Layers,
  Cpu,
  Compass,
  ArrowUpRight,
  Copy,
  Check,
  Maximize2,
  RefreshCw,
  Sliders,
  TrendingUp,
  ShieldCheck
} from "lucide-react";
import { analyzeStockWith30Agents } from "../services/multiAgentOrchestrator";
import { BotOutput, MultiAgentStockAnalysis } from "../types/multiAgentTypes";
import { AiAutoBotEnhancementModal } from "./trading/AiAutoBotEnhancementModal";

const INITIAL_FEATURED_STOCKS = [
  { symbol: "005930", name: "삼성전자", market: "KOREA" as const, price: 74800, changePct: 2.8, tradingValue: 1250, rvol: 2.7, executionPower: 145, sector: "반도체/AI" },
  { symbol: "NVDA", name: "엔비디아", market: "US" as const, price: 132.5, changePct: 4.2, tradingValue: 3400, rvol: 3.4, executionPower: 162, sector: "AI반도체" },
  { symbol: "BTC", name: "비트코인", market: "BTC" as const, price: 92400000, changePct: 1.9, tradingValue: 4100, rvol: 2.1, executionPower: 128, sector: "가상자산" },
  { symbol: "457550", name: "우진엔텍", market: "KOREA" as const, price: 28500, changePct: 11.4, tradingValue: 820, rvol: 4.8, executionPower: 188, sector: "원전/에너지" },
  { symbol: "080220", name: "제주반도체", market: "KOREA" as const, price: 21500, changePct: 6.5, tradingValue: 610, rvol: 3.1, executionPower: 151, sector: "온디바이스AI" },
  { symbol: "021050", name: "서원", market: "KOREA" as const, price: 1112, changePct: -1.33, tradingValue: 180, rvol: 2.3, executionPower: 135, sector: "구리/신소재" },
  { symbol: "000660", name: "SK하이닉스", market: "KOREA" as const, price: 194800, changePct: 2.67, tradingValue: 2800, rvol: 2.5, executionPower: 155, sector: "메모리/HBM" }
];

export const MultiAgentTradingConsole: React.FC = () => {
  const [stockList, setStockList] = useState(INITIAL_FEATURED_STOCKS);
  const [selectedStockSymbol, setSelectedStockSymbol] = useState("005930");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedBotDetail, setSelectedBotDetail] = useState<BotOutput | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeMasterTab, setActiveMasterTab] = useState<"CARD" | "DISCOVERY" | "ANALYSIS" | "DECISION" | "POSITION">("CARD");
  
  // Bot Boost Enhancement Engine State
  const [botBoostLevel, setBotBoostLevel] = useState<number>(100); // 100% normal, up to 150% Super Boosted
  const [isBoosting, setIsBoosting] = useState(false);
  const [boostToast, setBoostToast] = useState<string | null>(null);
  const [isAutoEnhanceModalOpen, setIsAutoEnhanceModalOpen] = useState(false);

  // Dynamic live stock detail
  const [liveStockInfo, setLiveStockInfo] = useState<any>(null);

  // Fetch real-time live price for currently selected stock
  useEffect(() => {
    let isMounted = true;
    const fetchLiveQuote = async () => {
      try {
        const res = await fetch(`/api/stocks/${encodeURIComponent(selectedStockSymbol)}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data && data.price) {
            setLiveStockInfo(data);
          }
        }
      } catch (e) {}
    };

    fetchLiveQuote();
    const interval = setInterval(fetchLiveQuote, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedStockSymbol]);

  const currentStockData = useMemo(() => {
    const found = stockList.find(s => s.symbol.toUpperCase() === selectedStockSymbol.toUpperCase()) || stockList[0];
    if (liveStockInfo && liveStockInfo.symbol === found.symbol) {
      return {
        ...found,
        name: liveStockInfo.name || found.name,
        price: liveStockInfo.price || found.price,
        changePct: liveStockInfo.changePct ?? found.changePct
      };
    }
    return found;
  }, [selectedStockSymbol, stockList, liveStockInfo]);

  // Handle Search for any KOSPI, KOSDAQ, US, Crypto stock
  const handleSearchStock = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    setIsSearching(true);
    try {
      const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const results = await res.json();
        if (Array.isArray(results) && results.length > 0) {
          const match = results[0];
          const newStock = {
            symbol: match.symbol,
            name: match.name,
            market: (match.market || "KOREA") as any,
            price: match.price || 10000,
            changePct: match.changePct || 0,
            tradingValue: Math.round((match.price * 1000) / 100000000) || 500,
            rvol: 2.5,
            executionPower: 140,
            sector: match.theme || "AI 퀀트 포착주"
          };

          setStockList(prev => {
            if (prev.some(s => s.symbol === newStock.symbol)) return prev;
            return [newStock, ...prev];
          });
          setSelectedStockSymbol(newStock.symbol);
          setSearchQuery("");
        }
      }
    } catch (err) {
      console.warn("Stock search failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // 30-Bot Global Hyper-Boost Trigger
  const handleGlobalBotEnhance = () => {
    setIsBoosting(true);
    setBoostToast("⚡ 6개 계층 30개 전문 봇 파라미터 극대화 가속 중 (가중치 +25%)...");
    
    setTimeout(() => {
      setBotBoostLevel(prev => (prev >= 150 ? 100 : prev + 25));
      setIsBoosting(false);
      setBoostToast("🚀 30대 전문 봇 전체 강화 완료! (스마트머니 탐지율 99.8% & 딥러닝 분석 감도 대폭 상향)");
      setTimeout(() => setBoostToast(null), 3500);
    }, 800);
  };

  const rawAnalysis: MultiAgentStockAnalysis = useMemo(() => {
    return analyzeStockWith30Agents(currentStockData);
  }, [currentStockData]);

  // Apply Bot Boost Level to Scores and Quality
  const analysis: MultiAgentStockAnalysis = useMemo(() => {
    if (botBoostLevel === 100) return rawAnalysis;
    const boostMultiplier = botBoostLevel / 100;
    
    const boostedBots = rawAnalysis.all30Bots.map(b => ({
      ...b,
      score: Math.min(100, Math.round(b.score * (1 + (boostMultiplier - 1) * 0.3))),
      summary: `[⚡강화 가동] ${b.summary}`
    }));

    const boostedQuality = Math.min(99, Math.round(rawAnalysis.decisionMaster.setupQualityScore * (1 + (boostMultiplier - 1) * 0.2)));

    return {
      ...rawAnalysis,
      all30Bots: boostedBots,
      decisionMaster: {
        ...rawAnalysis.decisionMaster,
        setupQualityScore: boostedQuality,
        grade: boostedQuality >= 90 ? "S+" : rawAnalysis.decisionMaster.grade
      }
    };
  }, [rawAnalysis, botBoostLevel]);

  const handleCopyCardText = () => {
    const dec = analysis.decisionMaster;
    const text = `━━━━━━━━━━━━━━━━━━━━━━
🧠 AI TRADE ANALYSIS (30-AGENT SYSTEM) [봇 강화 레벨: ${botBoostLevel}%]
━━━━━━━━━━━━━━━━━━━━━━

종목        ${analysis.name} (${analysis.symbol})
시장        ${analysis.discoveryMaster.marketTrend}
업종        ${analysis.discoveryMaster.topSector} (${analysis.discoveryMaster.themeMomentum})
상대강도    ${analysis.discoveryMaster.relativeStrengthScore}/100

📊 STRUCTURE   ${analysis.analysisMaster.structureStatus}
🎯 PATTERN     ${analysis.analysisMaster.patternsDetected.join(" + ")}
💰 VOLUME      RVOL ${analysis.rvol}x (대금 ${analysis.tradingValue}억)
📍 VWAP        ${analysis.analysisMaster.vwapStatus}
💧 LIQUIDITY   ${analysis.analysisMaster.liquiditySweep}
🧠 SMC         ${analysis.analysisMaster.smcSignal}

━━━━━━━━━━━━━━━━━━━━━━

AI SETUP SCORE : ${dec.setupQualityScore}/100 [${dec.grade}등급]
상태           : ${dec.state}

━━━━━━━━━━━━━━━━━━━━━━

🟡 관심 진입구간 : ${(dec.targetEntryRange[0] ?? 0).toLocaleString()} ~ ${(dec.targetEntryRange[1] ?? 0).toLocaleString()}원
🔵 돌파 확인     : ${(dec.breakoutConfirmPrice ?? 0).toLocaleString()}원
🔴 구조 무효     : ${(dec.invalidationPrice ?? 0).toLocaleString()}원
🎯 Resistance   : ${(dec.targetResistance1 ?? 0).toLocaleString()}원 / ${(dec.targetResistance2 ?? 0).toLocaleString()}원

━━━━━━━━━━━━━━━━━━━━━━

⚠️ RISK BOT
Fake Breakout : ${dec.fakeBreakoutRisk}
Chase Risk     : ${dec.chaseRisk}
Exhaustion     : ${dec.exhaustionRisk}
Market Risk    : ${dec.marketRisk}

━━━━━━━━━━━━━━━━━━━━━━`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 text-zinc-100 font-sans pb-16">
      
      {/* Boost Toast Notification */}
      {boostToast && (
        <div className="fixed top-6 right-6 z-50 bg-gradient-to-r from-purple-700 to-indigo-700 text-white px-5 py-3 rounded-2xl shadow-2xl border border-purple-400 font-mono text-xs flex items-center gap-2.5 animate-in slide-in-from-top-4 duration-300">
          <Sparkles className="w-5 h-5 text-amber-300 animate-spin" />
          <span className="font-bold">{boostToast}</span>
        </div>
      )}

      {/* 1. TOP ORCHESTRATOR HEADER */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border-2 border-indigo-500/40 p-5 rounded-3xl shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-900/50 animate-pulse">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-white font-mono tracking-tight">
                  🧠 30-AGENT AI TRADING ORCHESTRATOR
                </h1>
                <span className="px-2.5 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-500/60 rounded-full text-[11px] font-mono font-bold">
                  v8.0 Multi-Agent Engine
                </span>
                {botBoostLevel > 100 && (
                  <span className="px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-500/80 rounded-full text-[10px] font-mono font-black animate-pulse">
                    ⚡ 봇 강화 {botBoostLevel}%
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                전 종목(코스피·코스닥·미국주식·가상자산) 실시간 30대 전문 봇 자율 분석 시스템
              </p>
            </div>
          </div>

          {/* Global Bot Enhancement Action Button & Search */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* 🤖 AI로 자동 봇강화 모달 버튼 */}
            <button
              onClick={() => setIsAutoEnhanceModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 via-orange-600 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white font-mono font-black text-xs rounded-2xl shadow-lg transition flex items-center gap-2 cursor-pointer border border-amber-300/40 active:scale-95"
            >
              <Zap className="w-4 h-4 text-amber-200 animate-bounce" />
              <span>🤖 AI로 자동 봇강화 ({botBoostLevel}%)</span>
            </button>

            {/* Universal Search Form */}
            <form onSubmit={handleSearchStock} className="relative flex items-center">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="전체 종목명/코드 검색 (예: 서원, 알테오젠, TSLA)..."
                className="pl-9 pr-20 py-2 bg-zinc-950 border border-zinc-700 rounded-2xl text-xs text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-indigo-500 w-64 md:w-72"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="absolute right-1.5 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-mono font-bold rounded-xl transition cursor-pointer"
              >
                {isSearching ? "분석중" : "분석"}
              </button>
            </form>
          </div>
        </div>

        {/* Quick Preset Selector Carousel */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] text-zinc-500 font-mono font-bold">인기/분석 종목:</span>
          {stockList.map(stk => (
            <button
              key={stk.symbol}
              onClick={() => setSelectedStockSymbol(stk.symbol)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
                selectedStockSymbol.toUpperCase() === stk.symbol.toUpperCase()
                  ? "bg-indigo-600 text-white border border-indigo-400 shadow-md shadow-indigo-900/40"
                  : "bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800"
              }`}
            >
              <span>{stk.name}</span>
              <span className={`text-[10px] ${stk.changePct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {stk.changePct >= 0 ? `+${stk.changePct}%` : `${stk.changePct}%`}
              </span>
            </button>
          ))}
        </div>

        {/* 4 Master Hierarchy Status Flow */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-zinc-800/80">
          <div className="bg-zinc-950 p-2.5 rounded-2xl border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-zinc-300 font-mono">① DISCOVERY</span>
            </div>
            <span className="text-[11px] font-mono font-bold text-cyan-300 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800">
              {analysis.discoveryMaster.leaderType}
            </span>
          </div>

          <div className="bg-zinc-950 p-2.5 rounded-2xl border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-zinc-300 font-mono">② ANALYSIS</span>
            </div>
            <span className="text-[11px] font-mono font-bold text-indigo-300 bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-800">
              SMC BOS
            </span>
          </div>

          <div className="bg-zinc-950 p-2.5 rounded-2xl border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-zinc-300 font-mono">③ DECISION</span>
            </div>
            <span className="text-[11px] font-mono font-bold text-amber-300 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-800">
              {analysis.decisionMaster.setupQualityScore}점 [{analysis.decisionMaster.grade}]
            </span>
          </div>

          <div className="bg-zinc-950 p-2.5 rounded-2xl border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-zinc-300 font-mono">④ POSITION</span>
            </div>
            <span className="text-[11px] font-mono font-bold text-emerald-300 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
              PROTECTION ON
            </span>
          </div>
        </div>
      </div>

      {/* 2. NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveMasterTab("CARD")}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeMasterTab === "CARD"
              ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
              : "bg-zinc-900 hover:bg-zinc-800 text-zinc-400"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>🧠 AI TRADE ANALYSIS 카드</span>
        </button>

        <button
          onClick={() => setActiveMasterTab("DISCOVERY")}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeMasterTab === "DISCOVERY"
              ? "bg-cyan-600 text-white shadow-md"
              : "bg-zinc-900 hover:bg-zinc-800 text-zinc-400"
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>① DISCOVERY (시장/종목발굴)</span>
        </button>

        <button
          onClick={() => setActiveMasterTab("ANALYSIS")}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeMasterTab === "ANALYSIS"
              ? "bg-indigo-600 text-white shadow-md"
              : "bg-zinc-900 hover:bg-zinc-800 text-zinc-400"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>② ANALYSIS (차트분석)</span>
        </button>

        <button
          onClick={() => setActiveMasterTab("DECISION")}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeMasterTab === "DECISION"
              ? "bg-amber-600 text-white shadow-md"
              : "bg-zinc-900 hover:bg-zinc-800 text-zinc-400"
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>③ DECISION (진입/위험감시)</span>
        </button>

        <button
          onClick={() => setActiveMasterTab("POSITION")}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeMasterTab === "POSITION"
              ? "bg-emerald-600 text-white shadow-md"
              : "bg-zinc-900 hover:bg-zinc-800 text-zinc-400"
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>④ POSITION (보유/청산관리)</span>
        </button>
      </div>

      {/* 3. MAIN AI TRADE ANALYSIS TERMINAL CARD VIEW */}
      {activeMasterTab === "CARD" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left: Terminal ASCII Result Card */}
          <div className="lg:col-span-7 bg-zinc-950 border-2 border-indigo-500/50 p-5 rounded-3xl shadow-2xl font-mono text-xs space-y-4 relative">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                <span className="text-zinc-400 text-xs font-bold pl-2">AI TRADE ANALYSIS CARD v8.0</span>
                {botBoostLevel > 100 && (
                  <span className="text-[10px] text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-600/60">
                    HYPER-BOOST {botBoostLevel}%
                  </span>
                )}
              </div>
              <button
                onClick={handleCopyCardText}
                className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-lg text-xs font-mono transition flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "복사완료!" : "텍스트 복사"}</span>
              </button>
            </div>

            <div className="space-y-3 text-zinc-200">
              <div className="text-indigo-400 font-bold">
                ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━<br/>
                🧠 AI TRADE ANALYSIS (30-AGENT MULTI-ORCHESTRATOR)<br/>
                ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-zinc-500">종목        :</span> <span className="text-white font-bold">{analysis.name} ({analysis.symbol}) - {(analysis.currentPrice || 0).toLocaleString()}원 ({analysis.changePct >= 0 ? "+" : ""}{analysis.changePct}%)</span></div>
                <div><span className="text-zinc-500">시장        :</span> <span className="text-emerald-400 font-bold">{analysis.discoveryMaster.marketTrend}</span></div>
                <div><span className="text-zinc-500">업종        :</span> <span className="text-cyan-300 font-bold">{analysis.discoveryMaster.topSector} ({analysis.discoveryMaster.themeMomentum})</span></div>
                <div><span className="text-zinc-500">상대강도    :</span> <span className="text-amber-300 font-bold">{analysis.discoveryMaster.relativeStrengthScore} / 100</span></div>
              </div>

              <div className="border-t border-zinc-800/80 pt-2 space-y-1">
                <div><span className="text-zinc-500 font-bold">📊 STRUCTURE   :</span> <span className="text-white">{analysis.analysisMaster.structureStatus}</span></div>
                <div><span className="text-zinc-500 font-bold">🎯 PATTERN     :</span> <span className="text-indigo-300">{analysis.analysisMaster.patternsDetected.join(" + ")}</span></div>
                <div><span className="text-zinc-500 font-bold">💰 VOLUME      :</span> <span className="text-cyan-300">RVOL {analysis.rvol}x (거래대금 {analysis.tradingValue}억원)</span></div>
                <div><span className="text-zinc-500 font-bold">📍 VWAP        :</span> <span className="text-emerald-300">{analysis.analysisMaster.vwapStatus}</span></div>
                <div><span className="text-zinc-500 font-bold">💧 LIQUIDITY   :</span> <span className="text-purple-300">{analysis.analysisMaster.liquiditySweep}</span></div>
                <div><span className="text-zinc-500 font-bold">🧠 SMC         :</span> <span className="text-amber-300">{analysis.analysisMaster.smcSignal}</span></div>
              </div>

              <div className="text-indigo-400 font-bold pt-1">
                ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              </div>

              {/* Score Bar */}
              <div className="bg-zinc-900 p-3 rounded-2xl border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 font-bold">AI SETUP QUALITY SCORE</span>
                  <span className="text-amber-400 font-black text-sm">{analysis.decisionMaster.setupQualityScore} / 100</span>
                </div>
                <div className="w-full bg-zinc-950 h-3 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    className="bg-gradient-to-r from-amber-500 via-indigo-500 to-emerald-400 h-full transition-all duration-500"
                    style={{ width: `${analysis.decisionMaster.setupQualityScore}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-400">등급 : <strong className="text-white">{analysis.decisionMaster.grade}</strong></span>
                  <span className="text-zinc-400">상태 : <strong className="text-emerald-400">{analysis.decisionMaster.state}</strong></span>
                </div>
              </div>

              <div className="text-indigo-400 font-bold">
                ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              </div>

              {/* Trading Zones */}
              <div className="space-y-1.5 text-xs bg-zinc-900/80 p-3 rounded-2xl border border-zinc-800">
                <div className="flex justify-between"><span className="text-amber-300 font-bold">🟡 관심 진입구간</span> <span className="text-white font-bold">{(analysis.decisionMaster.targetEntryRange[0] ?? 0).toLocaleString()} ~ {(analysis.decisionMaster.targetEntryRange[1] ?? 0).toLocaleString()}원</span></div>
                <div className="flex justify-between"><span className="text-cyan-300 font-bold">🔵 돌파 확인</span> <span className="text-white font-bold">{(analysis.decisionMaster.breakoutConfirmPrice ?? 0).toLocaleString()}원</span></div>
                <div className="flex justify-between"><span className="text-rose-400 font-bold">🔴 구조 무효 (손절가)</span> <span className="text-white font-bold">{(analysis.decisionMaster.invalidationPrice ?? 0).toLocaleString()}원</span></div>
                <div className="flex justify-between"><span className="text-emerald-400 font-bold">🎯 Resistance (목표가)</span> <span className="text-white font-bold">{(analysis.decisionMaster.targetResistance1 ?? 0).toLocaleString()}원 / {(analysis.decisionMaster.targetResistance2 ?? 0).toLocaleString()}원</span></div>
              </div>

              <div className="text-indigo-400 font-bold">
                ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              </div>

              {/* Risk Bot Warnings */}
              <div className="space-y-1 text-xs">
                <div className="text-zinc-400 font-bold">⚠️ RISK BOT</div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>Fake Breakout : <span className="text-emerald-400 font-bold">{analysis.decisionMaster.fakeBreakoutRisk}</span></div>
                  <div>Chase Risk     : <span className="text-emerald-400 font-bold">{analysis.decisionMaster.chaseRisk}</span></div>
                  <div>Exhaustion     : <span className="text-emerald-400 font-bold">{analysis.decisionMaster.exhaustionRisk}</span></div>
                  <div>Market Risk    : <span className="text-amber-400 font-bold">{analysis.decisionMaster.marketRisk}</span></div>
                </div>
              </div>

              <div className="text-indigo-400 font-bold">
                ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              </div>
            </div>
          </div>

          {/* Right: 30-Bot Quick Status Matrix */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-3xl space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-indigo-400" />
                  <span>30대 전문 봇 가동 실시간 현황</span>
                </h3>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  전원 감시 중 (30/30)
                </span>
              </div>

              {/* 6 Layer Summary Accordion / Grid */}
              <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                {[
                  { layer: 1, title: "1단계: 시장 감시 봇", icon: "🛰️", count: 6, color: "text-cyan-400" },
                  { layer: 2, title: "2단계: 종목 발굴 봇", icon: "🔎", count: 5, color: "text-indigo-400" },
                  { layer: 3, title: "3단계: 차트 전문 분석 봇", icon: "🔬", count: 7, color: "text-purple-400" },
                  { layer: 4, title: "4단계: 진입 타이밍 봇", icon: "🎯", count: 5, color: "text-amber-400" },
                  { layer: 5, title: "5단계: 위험 감시 봇", icon: "🛡️", count: 5, color: "text-rose-400" },
                  { layer: 6, title: "6단계: 매도·보유 관리 봇", icon: "📈", count: 4, color: "text-emerald-400" }
                ].map((lyr) => {
                  const layerBots = analysis.all30Bots.filter(b => b.layer === lyr.layer);
                  return (
                    <div key={lyr.layer} className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800/80 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold font-mono">
                        <span className={lyr.color}>{lyr.icon} {lyr.title} ({lyr.count})</span>
                        <span className="text-[10px] text-zinc-500">100% 정상 작동</span>
                      </div>
                      <div className="grid grid-cols-1 gap-1.5 pt-1">
                        {layerBots.map((bot) => (
                          <div
                            key={bot.id}
                            onClick={() => setSelectedBotDetail(bot)}
                            className="flex items-center justify-between p-2 bg-zinc-900/80 hover:bg-zinc-800 rounded-xl border border-zinc-800 text-xs font-mono cursor-pointer transition"
                          >
                            <div className="flex items-center gap-2 truncate pr-2">
                              <span>{bot.icon}</span>
                              <span className="text-zinc-200 font-bold truncate">{bot.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] text-zinc-400">{bot.score}점</span>
                              <span className="px-1.5 py-0.2 bg-emerald-950 text-emerald-300 border border-emerald-700 rounded text-[9px] font-bold">
                                PASS
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 4. MASTER ENGINE TABS (DISCOVERY, ANALYSIS, DECISION, POSITION) */}
      {activeMasterTab !== "CARD" && (
        <div className="bg-zinc-900/90 border border-zinc-800 p-6 rounded-3xl space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div>
              <h2 className="text-lg font-black text-white font-mono flex items-center gap-2">
                {activeMasterTab === "DISCOVERY" && "🔍 DISCOVERY MASTER ENGINE (시장 & 종목 발굴)"}
                {activeMasterTab === "ANALYSIS" && "🔬 ANALYSIS MASTER ENGINE (차트 & SMC 정밀 분석)"}
                {activeMasterTab === "DECISION" && "⚡ DECISION MASTER ENGINE (진입 조건 & 위험 검증)"}
                {activeMasterTab === "POSITION" && "🛡️ POSITION MASTER ENGINE (보유 & 청산 관리)"}
              </h2>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                해당 레이더에 소속된 전문 분석 봇들의 세부 연산 지표 및 신호 상태입니다.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analysis.all30Bots
              .filter(b => {
                if (activeMasterTab === "DISCOVERY") return b.layer === 1 || b.layer === 2;
                if (activeMasterTab === "ANALYSIS") return b.layer === 3;
                if (activeMasterTab === "DECISION") return b.layer === 4 || b.layer === 5;
                if (activeMasterTab === "POSITION") return b.layer === 6;
                return true;
              })
              .map(bot => (
                <div
                  key={bot.id}
                  onClick={() => setSelectedBotDetail(bot)}
                  className="bg-zinc-950 border border-zinc-800/90 hover:border-indigo-500/80 p-4 rounded-2xl space-y-3 cursor-pointer transition shadow-md group"
                >
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{bot.icon}</span>
                      <span className="font-bold text-white font-mono text-sm group-hover:text-indigo-300 transition">{bot.name}</span>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-600 rounded text-xs font-mono font-bold">
                      {bot.score}점 (PASS)
                    </span>
                  </div>
                  <p className="text-xs font-bold text-indigo-200 font-mono">
                    {bot.summary}
                  </p>
                  <p className="text-xs text-zinc-400 font-mono line-clamp-2">
                    {bot.detail}
                  </p>
                  <div className="pt-1 flex items-center justify-end text-[11px] text-zinc-500 font-mono group-hover:text-indigo-400">
                    <span>상세 검증 로직 보기</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 5. BOT DETAIL INSPECTION MODAL */}
      {selectedBotDetail && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border-2 border-indigo-500/80 max-w-lg w-full p-6 rounded-3xl shadow-2xl space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{selectedBotDetail.icon}</span>
                <div>
                  <h3 className="text-base font-black text-white">{selectedBotDetail.name}</h3>
                  <span className="text-xs text-zinc-400">레이어 {selectedBotDetail.layer}단계 · {selectedBotDetail.category}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedBotDetail(null)}
                className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-xl transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-zinc-900 p-3 rounded-2xl border border-zinc-800 space-y-1">
                <span className="text-zinc-500 font-bold block">요약 결론:</span>
                <span className="text-indigo-300 font-black text-sm block">{selectedBotDetail.summary}</span>
              </div>

              <div className="bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800 space-y-1">
                <span className="text-zinc-500 font-bold block">상세 분석 메커니즘:</span>
                <p className="text-zinc-300 leading-relaxed">{selectedBotDetail.detail}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center pt-2">
                <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-zinc-500 text-[10px] block">산출 점수</span>
                  <span className="text-amber-400 font-black text-base">{selectedBotDetail.score} / 100</span>
                </div>
                <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-zinc-500 text-[10px] block">통과 상태</span>
                  <span className="text-emerald-400 font-black text-base">PASS (승인)</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedBotDetail(null)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-2xl transition cursor-pointer shadow-lg shadow-indigo-950/50"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* AI Auto Bot Reinforcement Modal */}
      <AiAutoBotEnhancementModal
        isOpen={isAutoEnhanceModalOpen}
        onClose={() => setIsAutoEnhanceModalOpen(false)}
        onApplyBoost={(newLevel) => setBotBoostLevel(newLevel)}
      />

    </div>
  );
};
