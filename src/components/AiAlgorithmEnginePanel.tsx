import React, { useState, useEffect } from "react";
import { 
  Cpu, 
  Sparkles, 
  ShieldCheck, 
  TrendingUp, 
  Sliders, 
  Zap, 
  Activity, 
  Layers, 
  Target, 
  Percent, 
  BarChart3, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Lock, 
  ArrowUpRight, 
  ArrowDownRight,
  Database,
  Terminal,
  Compass,
  Scale
} from "lucide-react";

interface AlgorithmSuiteResult {
  symbol: string;
  name: string;
  price: number;
  market: string;
  compositeScore: number;
  combinedSignal: "STRONG_BUY" | "BUY" | "WAIT" | "HOLD" | "SELL";
  safetyMargin: number;
  timestamp: string;
  algorithms: {
    vixMacro: {
      id: string;
      title: string;
      status: "ACTIVE" | "PAUSED";
      score: number;
      vixIndex: number;
      recommendedCashRatio: number;
      dynamicStopLossPct: number;
      macroRiskLevel: "LOW" | "NORMAL" | "HIGH";
      rationale: string;
    };
    kellySizer: {
      id: string;
      title: string;
      status: "ACTIVE" | "PAUSED";
      score: number;
      winRatePct: number;
      riskRewardRatio: number;
      fullKellyPct: number;
      halfKellyPct: number;
      recommendedAllocationKrw: number;
      rationale: string;
    };
    multiTimeframe: {
      id: string;
      title: string;
      status: "ACTIVE" | "PAUSED";
      score: number;
      confluencePct: number;
      timeframes: { tf: string; trend: string; signal: string }[];
      rationale: string;
    };
    chandelierExit: {
      id: string;
      title: string;
      status: "ACTIVE" | "PAUSED";
      score: number;
      atrValue: number;
      chandelierStopPrice: number;
      atrMultiplier: number;
      rationale: string;
    };
    orderbookSpurt: {
      id: string;
      title: string;
      status: "ACTIVE" | "PAUSED";
      score: number;
      bidAskRatio: number;
      executionStrength: number;
      isVolumeSpurt: boolean;
      rationale: string;
    };
    correlationMatrix: {
      id: string;
      title: string;
      status: "ACTIVE" | "PAUSED";
      score: number;
      maxCorrelation: number;
      sectorConcentration: string;
      diversificationScore: number;
      rationale: string;
    };
  };
}

export const AiAlgorithmEnginePanel: React.FC = () => {
  const [selectedSymbol, setSelectedSymbol] = useState("005930");
  const [selectedName, setSelectedName] = useState("삼성전자");
  const [selectedMarket, setSelectedMarket] = useState("KOREA");
  const [stockPrice, setStockPrice] = useState(74800);
  const [totalCapital, setTotalCapital] = useState(50000000);
  
  const [isSimulating, setIsSimulating] = useState(false);
  const [data, setData] = useState<AlgorithmSuiteResult | null>(null);
  const [activeAlgTab, setActiveAlgTab] = useState<string>("ALL");

  const stockPresets = [
    { symbol: "005930", name: "삼성전자", price: 74800, market: "KOREA" },
    { symbol: "000660", name: "SK하이닉스", price: 188500, market: "KOREA" },
    { symbol: "035420", name: "NAVER", price: 172000, market: "KOREA" },
    { symbol: "005380", name: "현대차", price: 245000, market: "KOREA" },
    { symbol: "NVDA", name: "NVIDIA", price: 128, market: "US" },
    { symbol: "TSLA", name: "Tesla", price: 220, market: "US" },
    { symbol: "AAPL", name: "Apple", price: 225, market: "US" }
  ];

  const fetchAlgorithmSuite = async (sym: string, name: string, price: number, mkt: string) => {
    setIsSimulating(true);
    try {
      const res = await fetch("/api/ai/algorithm-suite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: sym,
          name: name,
          price: price,
          market: mkt,
          totalCapital: totalCapital
        })
      });
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (e) {
      console.error("Algorithm Suite Fetch Error:", e);
    } finally {
      setIsSimulating(false);
    }
  };

  useEffect(() => {
    fetchAlgorithmSuite(selectedSymbol, selectedName, stockPrice, selectedMarket);
  }, []);

  const handleSelectPreset = (p: typeof stockPresets[0]) => {
    setSelectedSymbol(p.symbol);
    setSelectedName(p.name);
    setStockPrice(p.price);
    setSelectedMarket(p.market);
    fetchAlgorithmSuite(p.symbol, p.name, p.price, p.market);
  };

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-zinc-900 border border-indigo-500/30 p-5 rounded-xl shadow-lg text-white">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="p-3 bg-indigo-600/30 border border-indigo-400/40 rounded-xl text-indigo-300 shrink-0">
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                <h3 className="text-base font-black text-white">
                  AI 6대 퀀트 매매 알고리즘 스위트 (Multi-Algorithm Suite Engine)
                </h3>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> 6대 엔진 실시간 병렬 가동 중
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed max-w-3xl">
                VIX 매크로 동적 적응, 켈리 기하평균 자금 배분, 다중 타임프레임 오더플로우 공존, 변동성 샹들리에 트레일링 스탑, 호가 잔량 폭발 감지, 포트폴리오 상관성 Matrix 6대 알고리즘이 실시간 교차 검증합니다.
              </p>
            </div>
          </div>

          <button
            onClick={() => fetchAlgorithmSuite(selectedSymbol, selectedName, stockPrice, selectedMarket)}
            disabled={isSimulating}
            className="w-full lg:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-xs rounded-lg transition shadow-md border border-indigo-400/40 flex items-center justify-center space-x-2 cursor-pointer shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${isSimulating ? "animate-spin text-indigo-200" : ""}`} />
            <span>{isSimulating ? "알고리즘 교차 연산 중..." : "6대 알고리즘 연산 실행"}</span>
          </button>
        </div>
      </div>

      {/* PRESET STOCK SELECTOR & SIMULATION CONTROLS */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <span className="text-xs font-black text-zinc-900">시뮬레이션 대상 종목 선택</span>
          </div>

          <div className="flex items-center space-x-2 text-xs font-medium text-zinc-600">
            <span>총 운용 가능 자산:</span>
            <input 
              type="number"
              value={totalCapital}
              onChange={(e) => setTotalCapital(Number(e.target.value) || 0)}
              className="w-32 bg-zinc-50 border border-zinc-300 rounded px-2 py-1 font-mono font-bold text-zinc-900 text-xs focus:outline-none focus:border-indigo-500"
            />
            <span className="text-zinc-500">원</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {stockPresets.map((p) => {
            const isSelected = selectedSymbol === p.symbol;
            return (
              <button
                key={p.symbol}
                onClick={() => handleSelectPreset(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 border cursor-pointer ${
                  isSelected
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                    : "bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                }`}
              >
                <span>{p.name}</span>
                <span className={`font-mono text-[10px] ${isSelected ? "text-indigo-200" : "text-zinc-400"}`}>
                  ({p.symbol})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* COMPOSITE RESULT SUMMARY CARD */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Composite Score */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-white shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span>합성 퀀트 점수</span>
              <Activity className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="my-2 flex items-baseline space-x-1">
              <span className="text-3xl font-black font-mono text-white">{data.compositeScore}</span>
              <span className="text-xs text-slate-400 font-mono">/ 100점</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  data.compositeScore >= 80 ? "bg-emerald-500" : (data.compositeScore >= 60 ? "bg-amber-500" : "bg-rose-500")
                }`} 
                style={{ width: `${data.compositeScore}%` }}
              ></div>
            </div>
          </div>

          {/* Combined AI Signal */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-white shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span>6대 알고리즘 합의 신호</span>
              <Zap className="h-4 w-4 text-amber-400" />
            </div>
            <div className="my-2">
              <span className={`text-xl font-black font-mono px-3 py-1 rounded-lg inline-block border ${
                data.combinedSignal === "STRONG_BUY" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" :
                data.combinedSignal === "BUY" ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/40" :
                data.combinedSignal === "HOLD" || data.combinedSignal === "WAIT" ? "bg-amber-500/20 text-amber-400 border-amber-500/40" :
                "bg-rose-500/20 text-rose-400 border-rose-500/40"
              }`}>
                {data.combinedSignal}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              안전 마진 비율: <span className="text-indigo-300 font-bold">+{data.safetyMargin}%</span>
            </p>
          </div>

          {/* Recommended Capital Allocation */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-white shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span>켈리 권장 투입 자금</span>
              <Percent className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="my-2">
              <div className="text-xl font-black font-mono text-emerald-400">
                {(data.algorithms.kellySizer.recommendedAllocationKrw ?? 0).toLocaleString()}원
              </div>
              <span className="text-xs text-slate-400 font-mono">
                (총 자산 대비 {data.algorithms.kellySizer.halfKellyPct}%)
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              승률 {data.algorithms.kellySizer.winRatePct}% / 손익비 {data.algorithms.kellySizer.riskRewardRatio}x
            </p>
          </div>

          {/* VIX & Chandelier Exit */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-white shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span>샹들리에 익절 가이드선</span>
              <Target className="h-4 w-4 text-purple-400" />
            </div>
            <div className="my-2">
              <div className="text-xl font-black font-mono text-purple-300">
                {(data.algorithms.chandelierExit.chandelierStopPrice ?? 0).toLocaleString()}원
              </div>
              <span className="text-xs text-slate-400 font-mono">
                (ATR {(data.algorithms.chandelierExit.atrValue ?? 0).toLocaleString()}원 x {data.algorithms.chandelierExit.atrMultiplier}배)
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              VIX {data.algorithms.vixMacro.vixIndex} (리스크 {data.algorithms.vixMacro.macroRiskLevel})
            </p>
          </div>
        </div>
      )}

      {/* 6 CORE ALGORITHMS DETAILED GRID */}
      {data && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-zinc-900 flex items-center space-x-2">
              <Layers className="h-4 w-4 text-indigo-600" />
              <span>6대 AI 퀀트 알고리즘 개별 정밀 분석 보고서</span>
            </h4>
            <span className="text-xs text-zinc-500 font-mono">
              최종 산출 시간: {new Date(data.timestamp).toLocaleTimeString()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* ALG #1: VIX MACRO ADAPTIVE */}
            <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3 shadow-xs hover:border-indigo-300 transition">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-zinc-900 block">Alg #1. VIX 매크로 동적 적응</span>
                    <span className="text-[10px] text-zinc-400 font-mono">VIX &amp; Macro Adaptive</span>
                  </div>
                </div>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                  {data.algorithms.vixMacro.score}점
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-zinc-600">
                  <span>실시간 VIX 지수:</span>
                  <span className="font-mono font-bold text-zinc-900">{data.algorithms.vixMacro.vixIndex}</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>권장 현금 비중:</span>
                  <span className="font-mono font-bold text-blue-600">{data.algorithms.vixMacro.recommendedCashRatio}%</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>동적 손절 한도:</span>
                  <span className="font-mono font-bold text-rose-600">-{data.algorithms.vixMacro.dynamicStopLossPct}%</span>
                </div>
              </div>

              <div className="p-2.5 bg-blue-50/60 rounded-lg text-[11px] text-blue-950 font-medium leading-relaxed border border-blue-100">
                {data.algorithms.vixMacro.rationale}
              </div>
            </div>

            {/* ALG #2: KELLY CRITERION SIZER */}
            <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3 shadow-xs hover:border-emerald-300 transition">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                    <Scale className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-zinc-900 block">Alg #2. 켈리 자금 배분</span>
                    <span className="text-[10px] text-zinc-400 font-mono">Kelly Criterion Sizer</span>
                  </div>
                </div>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                  {data.algorithms.kellySizer.score}점
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-zinc-600">
                  <span>예상 승률(P) / 손익비(B):</span>
                  <span className="font-mono font-bold text-zinc-900">
                    {data.algorithms.kellySizer.winRatePct}% / {data.algorithms.kellySizer.riskRewardRatio}x
                  </span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>Full Kelly / Half Kelly:</span>
                  <span className="font-mono font-bold text-emerald-600">
                    {data.algorithms.kellySizer.fullKellyPct}% / {data.algorithms.kellySizer.halfKellyPct}%
                  </span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>추천 배정 자금:</span>
                  <span className="font-mono font-bold text-zinc-900">
                    {(data.algorithms.kellySizer.recommendedAllocationKrw ?? 0).toLocaleString()}원
                  </span>
                </div>
              </div>

              <div className="p-2.5 bg-emerald-50/60 rounded-lg text-[11px] text-emerald-950 font-medium leading-relaxed border border-emerald-100">
                {data.algorithms.kellySizer.rationale}
              </div>
            </div>

            {/* ALG #3: MULTI TIMEFRAME CONFLUENCE */}
            <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3 shadow-xs hover:border-purple-300 transition">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
                    <Compass className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-zinc-900 block">Alg #3. 다중 타임프레임 합의</span>
                    <span className="text-[10px] text-zinc-400 font-mono">Multi-Timeframe Confluence</span>
                  </div>
                </div>
                <span className="bg-purple-100 text-purple-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                  {data.algorithms.multiTimeframe.score}점
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-zinc-600">
                  <span>차트 공존 정합도:</span>
                  <span className="font-mono font-bold text-purple-600">{data.algorithms.multiTimeframe.confluencePct}%</span>
                </div>
                <div className="flex items-center space-x-1 pt-1 flex-wrap gap-y-1">
                  {data.algorithms.multiTimeframe.timeframes.map((tf, i) => (
                    <span key={i} className="bg-purple-50 text-purple-900 border border-purple-200 text-[9px] font-mono px-1.5 py-0.5 rounded">
                      {tf.tf}: {tf.signal}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-2.5 bg-purple-50/60 rounded-lg text-[11px] text-purple-950 font-medium leading-relaxed border border-purple-100">
                {data.algorithms.multiTimeframe.rationale}
              </div>
            </div>

            {/* ALG #4: CHANDELIER TRAILING STOP */}
            <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3 shadow-xs hover:border-amber-300 transition">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                    <Target className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-zinc-900 block">Alg #4. 샹들리에 트레일링 스탑</span>
                    <span className="text-[10px] text-zinc-400 font-mono">Chandelier Exit Engine</span>
                  </div>
                </div>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                  {data.algorithms.chandelierExit.score}점
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-zinc-600">
                  <span>ATR 변동폭:</span>
                  <span className="font-mono font-bold text-zinc-900">
                    {(data.algorithms.chandelierExit.atrValue ?? 0).toLocaleString()}원
                  </span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>트레일링 익절 가격:</span>
                  <span className="font-mono font-bold text-amber-600">
                    {(data.algorithms.chandelierExit.chandelierStopPrice ?? 0).toLocaleString()}원
                  </span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>ATR 곱셈 계수:</span>
                  <span className="font-mono font-bold text-zinc-900">{data.algorithms.chandelierExit.atrMultiplier}x</span>
                </div>
              </div>

              <div className="p-2.5 bg-amber-50/60 rounded-lg text-[11px] text-amber-950 font-medium leading-relaxed border border-amber-100">
                {data.algorithms.chandelierExit.rationale}
              </div>
            </div>

            {/* ALG #5: ORDERBOOK DEPTH & SPURT VOLUME */}
            <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3 shadow-xs hover:border-indigo-300 transition">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-zinc-900 block">Alg #5. 호가잔량 &amp; 체결 폭발</span>
                    <span className="text-[10px] text-zinc-400 font-mono">Orderbook &amp; Spurt Volume</span>
                  </div>
                </div>
                <span className="bg-indigo-100 text-indigo-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                  {data.algorithms.orderbookSpurt.score}점
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-zinc-600">
                  <span>매수/매도 호가 비율:</span>
                  <span className="font-mono font-bold text-indigo-600">{data.algorithms.orderbookSpurt.bidAskRatio}x</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>1분 체결강도:</span>
                  <span className="font-mono font-bold text-emerald-600">{data.algorithms.orderbookSpurt.executionStrength}%</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>이상 거래량 감지:</span>
                  <span className={`font-mono font-bold ${data.algorithms.orderbookSpurt.isVolumeSpurt ? "text-emerald-600" : "text-zinc-500"}`}>
                    {data.algorithms.orderbookSpurt.isVolumeSpurt ? "포착 (Volume Spurt)" : "정상 (Normal)"}
                  </span>
                </div>
              </div>

              <div className="p-2.5 bg-indigo-50/60 rounded-lg text-[11px] text-indigo-950 font-medium leading-relaxed border border-indigo-100">
                {data.algorithms.orderbookSpurt.rationale}
              </div>
            </div>

            {/* ALG #6: CORRELATION MATRIX REBALANCER */}
            <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3 shadow-xs hover:border-teal-300 transition">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-teal-50 text-teal-600 rounded-lg">
                    <Database className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-zinc-900 block">Alg #6. 포트폴리오 상관성 Matrix</span>
                    <span className="text-[10px] text-zinc-400 font-mono">Correlation Rebalancer</span>
                  </div>
                </div>
                <span className="bg-teal-100 text-teal-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                  {data.algorithms.correlationMatrix.score}점
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-zinc-600">
                  <span>최대 자산 상관계수:</span>
                  <span className="font-mono font-bold text-zinc-900">{data.algorithms.correlationMatrix.maxCorrelation}</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>업종 집중도:</span>
                  <span className="font-mono font-bold text-zinc-900">{data.algorithms.correlationMatrix.sectorConcentration}</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>분산 안정성 점수:</span>
                  <span className="font-mono font-bold text-teal-600">{data.algorithms.correlationMatrix.diversificationScore}점</span>
                </div>
              </div>

              <div className="p-2.5 bg-teal-50/60 rounded-lg text-[11px] text-teal-950 font-medium leading-relaxed border border-teal-100">
                {data.algorithms.correlationMatrix.rationale}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
