import React, { useState, useEffect } from "react";
import {
  Zap,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Activity,
  Award,
  Play,
  Pause,
  RefreshCw,
  Sliders,
  Sparkles,
  Layers,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Radio,
  Clock,
  ArrowUpRight,
  Target,
  FileText,
  Search,
  ChevronRight
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { LightCandlestickChart } from "./LightCandlestickChart";

export const UnifiedMasterQuantTerminal: React.FC = () => {
  const {
    selectedSymbol,
    setSelectedSymbol,
    allStocks,
    executeTrade,
    addToast
  } = useApp() as any;

  // Pipeline execution & live state
  const [isAutoPipelineActive, setIsAutoPipelineActive] = useState<boolean>(true);
  const [currentCycleIndex, setCurrentCycleIndex] = useState<number>(2); // 0..5
  const [winStreak, setWinStreak] = useState<number>(47);
  const [realizedPnlUsd, setRealizedPnlUsd] = useState<number>(593819);
  const [realizedPnlKrw, setRealizedPnlKrw] = useState<number>(813532000);
  const [lastBetPnl, setLastBetPnl] = useState<number>(7458);

  // Selected asset state
  const currentAsset = allStocks.find((s: any) => s.symbol === selectedSymbol) || allStocks[0] || {
    symbol: "KRW-BTC",
    name: "비트코인",
    currentPrice: 98500000,
    changeRate: 3.45,
    volume: 85400,
    marketType: "BTC"
  };

  // 4-Lock Filter States
  const [lock1BodyBreakout, setLock1BodyBreakout] = useState<boolean>(true);
  const [lock2CvdSurge, setLock2CvdSurge] = useState<boolean>(true);
  const [lock3VwapAbove, setLock3VwapAbove] = useState<boolean>(true);
  const [lock4RiskReward, setLock4RiskReward] = useState<boolean>(true);

  // Advanced Quant Indicators
  const [cvdDeltaValue, setCvdDeltaValue] = useState<number>(+148500); // Net Market Buy
  const [volumeGapRange, setVolumeGapRange] = useState<string>("+3.2% 매물공백 (저항 없음)");
  const [icebergDetected, setIcebergDetected] = useState<boolean>(true);
  const [obiRatio, setObiRatio] = useState<number>(84.2); // 84.2% Buy Imbalance
  const [scalperScore, setScalperScore] = useState<number>(94);

  // Live Toast notification on streak execution
  const [showStreakPopup, setShowStreakPopup] = useState<boolean>(true);

  // Pipeline Auto Cycle Timer
  useEffect(() => {
    if (!isAutoPipelineActive) return;
    const timer = setInterval(() => {
      setCurrentCycleIndex((prev) => (prev + 1) % 6);
      
      // Dynamic updates to simulate live 6-cycle pipeline execution
      setCvdDeltaValue(prev => prev + Math.floor(Math.random() * 2000 - 800));
      setObiRatio(prev => Math.min(98, Math.max(60, Number((prev + (Math.random() * 2 - 0.9)).toFixed(1)))));
    }, 1800);
    return () => clearInterval(timer);
  }, [isAutoPipelineActive]);

  const allLocksPassed = lock1BodyBreakout && lock2CvdSurge && lock3VwapAbove && lock4RiskReward;

  // Manual Trigger Trade via Master Engine
  const handleMasterTrade = async (side: "BUY" | "SELL") => {
    if (!allLocksPassed && side === "BUY") {
      addToast("🛑 [4-Lock 검증 미통과] 모든 리스크 검증 조건이 100% 충족되어야 매수가 가동됩니다.", "warning");
      return;
    }

    const price = currentAsset.currentPrice || 100000;
    const qty = currentAsset.marketType === "BTC" ? 0.05 : 10;
    
    try {
      if (executeTrade) {
        await executeTrade(
          currentAsset.symbol,
          currentAsset.name,
          currentAsset.marketType,
          side,
          qty,
          price,
          "통합 마스터 6-Cycle 스캘퍼",
          `[Master Engine] 4-Lock 100% 검증 + CVD ${cvdDeltaValue > 0 ? '+' : ''}${cvdDeltaValue} 수급 체결`,
          true
        );
      }
      setWinStreak(prev => prev + 1);
      setLastBetPnl(Math.floor(4500 + Math.random() * 5000));
      setRealizedPnlUsd(prev => prev + 1250);
      setRealizedPnlKrw(prev => prev + 1712500);
      setShowStreakPopup(true);
      setTimeout(() => setShowStreakPopup(false), 4000);
      addToast(`🚀 [통합 마스터 엔진] ${currentAsset.name} ${side === "BUY" ? "LONG 매수" : "SHORT 매도"} 체결 완료!`, "success");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-full bg-[#0a0d14] text-slate-100 font-sans min-h-screen p-2 sm:p-4 space-y-3 selection:bg-emerald-500 selection:text-black">
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER: DEGEN MODE & 6-CYCLE PIPELINE STATUS (Matching Instagram Image) */}
      {/* ========================================================================= */}
      <div className="bg-[#121722] border border-slate-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
              POLYMARKET · LIVE · 2026
            </span>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs font-mono text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
            <span>0x6e1d···d0f</span>
            <span className="text-slate-600">•</span>
            <span className="font-extrabold text-amber-300">DEGEN MODE</span>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400 font-bold">6-CYCLE PIPELINE</span>
          </div>
        </div>

        {/* Top Right Badges */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="bg-indigo-950/80 text-indigo-300 border border-indigo-500/40 px-3 py-1 rounded-full flex items-center gap-1.5 font-bold shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>★ #1 · 24H WHALE</span>
            <span className="text-emerald-400 ml-1">+$145K AHEAD</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg text-slate-400">
            17:56:03 <span className="text-slate-600">APR 24 UTC</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN PNL DISPLAY & WIN STREAK BADGE (Matching Image Giant Digital Counter) */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-[#121824] via-[#0d121c] to-[#121722] border border-emerald-500/30 rounded-3xl p-4 md:p-6 shadow-2xl relative overflow-hidden">
        {/* Background Ambient Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          
          {/* Left: Giant Digital PnL Counter */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold tracking-widest uppercase">
              <Activity className="w-4 h-4 animate-pulse" />
              <span>APRIL · REALIZED PNL</span>
              <span className="bg-emerald-500 text-black px-2 py-0.5 rounded text-[10px] font-extrabold">
                ● LIVE · 25 DAYS
              </span>
            </div>

            {/* LED Seven Segment / High-Tech Giant Text */}
            <div className="flex items-baseline gap-3">
              <h1 className="text-5xl md:text-7xl font-mono font-black tracking-tight text-emerald-400 drop-shadow-[0_0_25px_rgba(16,185,129,0.35)]">
                ${(realizedPnlUsd ?? 0).toLocaleString()}
              </h1>
              <span className="text-lg md:text-2xl font-mono font-bold text-slate-400">
                (₩{(realizedPnlKrw / 100000000).toFixed(2)}억원)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 pt-1">
              <span>▲ 1,000 trades</span>
              <span className="text-emerald-400 font-bold">▲ 85% win rate</span>
              <span>43.0 / day</span>
              <span className="text-slate-600">|</span>
              <span className="text-cyan-400">WALLETS 0x6e1d5040...2d0f</span>
              <span className="text-emerald-300 font-bold">+ $1,592/sec live</span>
            </div>
          </div>

          {/* Right: Circle Win Streak Badge (Exact match to Instagram image circle) */}
          <div className="flex items-center gap-4 self-center lg:self-auto">
            <div className="relative w-32 h-32 md:w-36 md:h-36 rounded-full border-4 border-cyan-500/40 bg-slate-900/90 flex flex-col items-center justify-center p-2 shadow-[0_0_30px_rgba(6,182,212,0.25)]">
              <div className="absolute inset-1 rounded-full border-2 border-dashed border-cyan-400/30 animate-spin" style={{ animationDuration: "12s" }}></div>
              <span className="text-3xl md:text-4xl font-mono font-black text-cyan-300">{winStreak}</span>
              <span className="text-[10px] font-mono font-extrabold text-cyan-400 uppercase tracking-tighter text-center mt-0.5">
                WIN STREAK
              </span>
              <span className="text-[9px] font-mono text-slate-400 mt-0.5">● NEXT IN 3s</span>
            </div>

            {/* Quick Auto Master Switch */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setIsAutoPipelineActive(!isAutoPipelineActive)}
                className={`w-full px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition shadow-lg ${
                  isAutoPipelineActive
                    ? "bg-emerald-500 text-black border-emerald-400 hover:bg-emerald-400"
                    : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                }`}
              >
                {isAutoPipelineActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isAutoPipelineActive ? "파이프라인 가동중" : "파이프라인 일시정지"}</span>
              </button>
              <div className="text-[11px] font-mono text-slate-400 text-center">
                6-Cycle Master Engine Active
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MIDDLE SECTION: LIVE CHART + CASH FLOW STACK + FLOATING STREAK POPUP */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        
        {/* LEFT (4 COLS): Advanced Quant Indicators & Cash Flow Stack */}
        <div className="lg:col-span-4 space-y-3">
          
          {/* 4-Lock Filter Status Panel */}
          <div className="bg-[#121722] border border-slate-800 p-4 rounded-2xl space-y-3 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2 text-xs font-bold font-mono text-amber-400 uppercase">
                <Lock className="w-4 h-4 text-amber-400" />
                <span>4-LOCK QUANT RISK GAUNTLET</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${allLocksPassed ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : "bg-rose-500/20 text-rose-400 border border-rose-500/40"}`}>
                {allLocksPassed ? "100% UNLOCKED (PASS)" : "LOCKED (SAFETY)"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${lock1BodyBreakout ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300" : "bg-slate-900 border-slate-800 text-slate-500"}`}>
                <span className="text-[10px] text-slate-400">01. 양봉 몸통 돌파</span>
                <span className="font-bold mt-1 flex items-center justify-between">
                  <span>{lock1BodyBreakout ? "BOS Valid" : "Upper Shadow"}</span>
                  {lock1BodyBreakout ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5" />}
                </span>
              </div>

              <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${lock2CvdSurge ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300" : "bg-slate-900 border-slate-800 text-slate-500"}`}>
                <span className="text-[10px] text-slate-400">02. CVD 체결폭발</span>
                <span className="font-bold mt-1 flex items-center justify-between">
                  <span>+{(cvdDeltaValue ?? 0).toLocaleString()}</span>
                  {lock2CvdSurge ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5" />}
                </span>
              </div>

              <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${lock3VwapAbove ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300" : "bg-slate-900 border-slate-800 text-slate-500"}`}>
                <span className="text-[10px] text-slate-400">03. VWAP 세력선 위</span>
                <span className="font-bold mt-1 flex items-center justify-between">
                  <span>Institutional</span>
                  {lock3VwapAbove ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5" />}
                </span>
              </div>

              <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${lock4RiskReward ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300" : "bg-slate-900 border-slate-800 text-slate-500"}`}>
                <span className="text-[10px] text-slate-400">04. 손익비 (R/R)</span>
                <span className="font-bold mt-1 flex items-center justify-between">
                  <span>2.8 : 1</span>
                  {lock4RiskReward ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5" />}
                </span>
              </div>
            </div>
          </div>

          {/* Footprint & Volume Profile & Orderbook Matrix */}
          <div className="bg-[#121722] border border-slate-800 p-4 rounded-2xl space-y-3 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <span>VOLUME PROFILE & CVD MATRIX</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                SCALPER SCORE: {scalperScore}점 (A+)
              </span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400">Volume Gap (매물 공백)</span>
                <span className="text-emerald-400 font-bold">{volumeGapRange}</span>
              </div>

              <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400">OBI 호가잔량 우위</span>
                <span className="text-cyan-300 font-bold">매수잔량 {obiRatio}% 우위 (승인)</span>
              </div>

              <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400">Iceberg 히든 매수세</span>
                <span className="text-amber-400 font-bold">{icebergDetected ? "감지됨 (1,000주 분할연속)" : "미감지"}</span>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT (8 COLS): Live Candlestick Feed & Floating Execution Overlay */}
        <div className="lg:col-span-8 space-y-3">
          
          <div className="bg-[#121722] border border-slate-800 p-4 rounded-2xl shadow-xl relative min-h-[420px] flex flex-col justify-between">
            
            {/* Top Bar of Chart */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400">LIVE SPOT FEED:</span>
                <span className="text-base font-bold font-mono text-white">{currentAsset.name} ({currentAsset.symbol})</span>
                <span className={`text-xs font-mono px-2 py-0.5 rounded font-bold ${currentAsset.changeRate >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                  {currentAsset.changeRate >= 0 ? "+" : ""}{currentAsset.changeRate}%
                </span>
              </div>

              {/* Asset Switcher Quick Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {allStocks.slice(0, 5).map((stock: any) => (
                  <button
                    key={stock.symbol}
                    type="button"
                    onClick={() => setSelectedSymbol(stock.symbol)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition border ${
                      selectedSymbol === stock.symbol
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                        : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                    }`}
                  >
                    {stock.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Candlestick Visualizer */}
            <div className="w-full h-[310px] relative my-2">
              <LightCandlestickChart />

              {/* FLOATING STREAK +1 LIVE EXECUTION ALERT OVERLAY (Matching center black box in Instagram image) */}
              {showStreakPopup && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/95 border-2 border-amber-500 text-amber-300 px-6 py-4 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.5)] flex flex-col items-center justify-center space-y-1 z-30 animate-bounce">
                  <span className="text-[10px] font-mono font-extrabold tracking-widest text-slate-400 uppercase">
                    LIVE PIPELINE EXECUTION
                  </span>
                  <span className="text-3xl font-mono font-black text-amber-400 tracking-wider">
                    STREAK +1
                  </span>
                  <span className="text-xs font-mono text-emerald-400 font-bold">
                    WING IN A ROW · NEW ATH (+${(lastBetPnl ?? 0).toLocaleString()})
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Controls for Direct Trade Trigger */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-3">
              <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
                <span>MOMENTUM: <strong className="text-emerald-400">▲ 75</strong></span>
                <span>•</span>
                <span>VOLATILITY: <strong className="text-cyan-400">1.8x</strong></span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleMasterTrade("BUY")}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs font-mono flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>LONG 핑퐁 매수 (+2.8% 익절 / -1.0% 칼손절)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleMasterTrade("SELL")}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-extrabold text-xs font-mono flex items-center gap-1.5 shadow-lg shadow-rose-500/20 transition cursor-pointer"
                >
                  <TrendingDown className="w-4 h-4" />
                  <span>SHORT 매도 청산</span>
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 4. BOTTOM ROW: 6-CYCLE EXECUTION PIPELINE (Matching bottom box in image) */}
      {/* ========================================================================= */}
      <div className="bg-[#121722] border border-slate-800 p-4 rounded-3xl space-y-3 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-emerald-400">
            <Zap className="w-4 h-4 text-emerald-400 animate-bounce" />
            <span>6-CYCLE EXECUTION PIPELINE (AUTOMATED ALGORITHMIC ROUTING)</span>
          </div>
          <div className="text-xs font-mono text-slate-400">
            cycle <span className="text-emerald-400 font-bold">#1103</span> · avg <span className="text-cyan-300 font-bold">1.59s</span>
          </div>
        </div>

        {/* The 6 Pipeline Stages Horizontal Bar (Exact match to Instagram screenshot) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 font-mono">
          
          {/* Stage 01 */}
          <div className={`p-3 rounded-2xl border transition ${currentCycleIndex === 0 ? "bg-emerald-950/40 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]" : "bg-slate-900/80 border-slate-800 text-slate-400"}`}>
            <div className="text-[10px] text-slate-500 font-bold uppercase">01 Scan</div>
            <div className="text-xs font-bold text-white mt-1">STC tick</div>
            <div className="text-[10px] text-emerald-400 font-mono mt-1">157ms</div>
          </div>

          {/* Stage 02 */}
          <div className={`p-3 rounded-2xl border transition ${currentCycleIndex === 1 ? "bg-emerald-950/40 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]" : "bg-slate-900/80 border-slate-800 text-slate-400"}`}>
            <div className="text-[10px] text-slate-500 font-bold uppercase">02 Predict</div>
            <div className="text-xs font-bold text-white mt-1">UP/DOWN model</div>
            <div className="text-[10px] text-emerald-400 font-mono mt-1">102ms</div>
          </div>

          {/* Stage 03 */}
          <div className={`p-3 rounded-2xl border transition ${currentCycleIndex === 2 ? "bg-emerald-950/40 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]" : "bg-slate-900/80 border-slate-800 text-slate-400"}`}>
            <div className="text-[10px] text-slate-500 font-bold uppercase">03 Validate</div>
            <div className="text-xs font-bold text-white mt-1">edge + confidence</div>
            <div className="text-[10px] text-emerald-400 font-mono mt-1">194ms</div>
          </div>

          {/* Stage 04 */}
          <div className={`p-3 rounded-2xl border transition ${currentCycleIndex === 3 ? "bg-emerald-950/40 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]" : "bg-slate-900/80 border-slate-800 text-slate-400"}`}>
            <div className="text-[10px] text-slate-500 font-bold uppercase">04 Size</div>
            <div className="text-xs font-bold text-white mt-1">Kelly capital</div>
            <div className="text-[10px] text-emerald-400 font-mono mt-1">50ms</div>
          </div>

          {/* Stage 05 */}
          <div className={`p-3 rounded-2xl border transition ${currentCycleIndex === 4 ? "bg-emerald-950/40 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]" : "bg-slate-900/80 border-slate-800 text-slate-400"}`}>
            <div className="text-[10px] text-slate-500 font-bold uppercase">05 Fill</div>
            <div className="text-xs font-bold text-white mt-1">YES / NO race</div>
            <div className="text-[10px] text-emerald-400 font-mono mt-1">300ms</div>
          </div>

          {/* Stage 06 */}
          <div className={`p-3 rounded-2xl border transition ${currentCycleIndex === 5 ? "bg-emerald-950/40 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]" : "bg-slate-900/80 border-slate-800 text-slate-400"}`}>
            <div className="text-[10px] text-slate-500 font-bold uppercase">06 Settle</div>
            <div className="text-xs font-bold text-white mt-1">resolve USDC</div>
            <div className="text-[10px] text-emerald-400 font-mono mt-1">640ms</div>
          </div>

          {/* LAST BET RESULT */}
          <div className="p-3 rounded-2xl border border-emerald-500/50 bg-emerald-950/30 text-emerald-300 flex flex-col justify-between shadow-lg">
            <div className="text-[10px] font-bold text-slate-400 uppercase">LAST BET</div>
            <div className="text-base font-black text-emerald-400 font-mono">
              +${(lastBetPnl ?? 0).toLocaleString()}
            </div>
            <div className="text-[9px] text-slate-400 font-mono">▲ 18,400 → +$2,370</div>
          </div>

        </div>
      </div>

    </div>
  );
};
