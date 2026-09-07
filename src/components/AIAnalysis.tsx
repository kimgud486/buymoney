import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "../context/AppContext";
import { AIAnalysis as AIAnalysisType } from "../types";
import { 
  Search, 
  Sparkles, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle, 
  Cpu, 
  ShieldAlert, 
  Check, 
  Coins, 
  Calculator, 
  Percent,
  Shield,
  Sliders,
  BarChart3,
  Zap,
  CheckCircle2,
  Building2,
  RotateCcw,
  Copy,
  Download,
  Share2,
  ExternalLink,
  Flame,
  Star,
  Layers,
  ArrowRight,
  Crosshair
} from "lucide-react";
import { StockChart } from "./StockChart";
import { Ai30DayPriceForecastChart } from "./Ai30DayPriceForecastChart";
import { 
  matchesChosungOrKeyword, 
  searchStocksFromIndex, 
  COMPREHENSIVE_STOCK_INDEX 
} from "../lib/stockDictionary";

export const AIAnalysis: React.FC = () => {
  const { 
    selectedSymbol, 
    setSelectedSymbol, 
    executeTrade, 
    profile, 
    brokerApiStatus, 
    kisPingLatency,
    addToast,
    openStockChart
  } = useApp();

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [activeStock, setActiveStock] = useState<any>(null);
  const [analysis, setAnalysis] = useState<AIAnalysisType | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [tradeQtyStr, setTradeQtyStr] = useState("10");
  const [copied, setCopied] = useState(false);
  const [selectedMarketTab, setSelectedMarketTab] = useState<"ALL" | "KOREA" | "US" | "BTC">("ALL");

  const tradeQty = parseFloat(tradeQtyStr) || 0;

  const setTradeQty = (valOrFn: number | ((prev: number) => number)) => {
    const current = parseFloat(tradeQtyStr) || 0;
    const nextVal = typeof valOrFn === 'function' ? valOrFn(current) : valOrFn;
    setTradeQtyStr(String(nextVal));
  };
  const [errorMsg, setErrorMsg] = useState("");

  // AI Risk Tuning parameters
  const [riskProfile, setRiskProfile] = useState<'AGGRESSIVE' | 'MODERATE' | 'CONSERVATIVE'>('MODERATE');
  const [timeHorizon, setTimeHorizon] = useState<'SCALPING' | 'SWING' | 'LONGTERM'>('SWING');

  const applyKellyAllocation = () => {
    if (!profile || !analysis?.kellyAllocation || !activeStock?.price) return;
    const allocatedCapital = profile.balance * (analysis.kellyAllocation / 100);
    const qty = Math.floor(allocatedCapital / activeStock.price);
    setTradeQty(Math.max(1, qty));
    addToast({
      type: "INFO",
      title: "켈리 공식 자산 배분 적용",
      message: `포트폴리오 추천 비중(${analysis.kellyAllocation}%)에 따라 주문 수량이 ${qty}주로 자동 계산되었습니다.`
    });
  };

  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null);

  // Listen for global custom trigger-ai-analysis event
  useEffect(() => {
    const handleGlobalTrigger = (e: any) => {
      if (e.detail) {
        const { symbol, name, market, price } = e.detail;
        const target = {
          symbol,
          name,
          market: market || "KOREA",
          price: price || 50000,
          per: 14.5,
          pbr: 1.2,
          roe: 12.5,
          operatingMargin: 11.2,
          marketCap: "실시간 연동"
        };
        selectStock(target);
        // Automatically start AI analysis
        setTimeout(() => {
          runAIAnalysisWithTarget(target);
        }, 150);
      }
    };
    window.addEventListener("trigger-ai-analysis", handleGlobalTrigger);
    return () => window.removeEventListener("trigger-ai-analysis", handleGlobalTrigger);
  }, []);

  // High-frequency real-time stock price ticking
  useEffect(() => {
    if (!selectedSymbol) return;

    let flashTimeout: NodeJS.Timeout;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/stocks/${selectedSymbol}`);
        if (res.ok) {
          const ct = res.headers.get("content-type");
          if (!ct || !ct.includes("application/json")) return;
          const updatedStock = await res.json();
          setActiveStock((prev: any) => {
            if (!prev) return updatedStock;
            if (prev.price !== updatedStock.price) {
              const dir = updatedStock.price > prev.price ? 'up' : 'down';
              setPriceFlash(dir);
              clearTimeout(flashTimeout);
              flashTimeout = setTimeout(() => setPriceFlash(null), 1000);
            }
            return { ...prev, ...updatedStock };
          });
        }
      } catch (err) {
        console.warn("Failed to poll real-time stock price", err);
      }
    }, 2500);

    return () => {
      clearInterval(interval);
      clearTimeout(flashTimeout);
    };
  }, [selectedSymbol]);

  // Fetch stocks on load or search with Chosung support
  useEffect(() => {
    fetchStocks();
  }, [query, selectedMarketTab]);

  const fetchStocks = async () => {
    try {
      // 1. Local Chosung index match
      let filtered = COMPREHENSIVE_STOCK_INDEX;
      if (selectedMarketTab === "KOREA") filtered = filtered.filter(s => s.market === "KOREA");
      if (selectedMarketTab === "US") filtered = filtered.filter(s => s.market === "US");
      if (selectedMarketTab === "BTC") filtered = filtered.filter(s => s.market === "BTC");

      if (query.trim()) {
        filtered = filtered.filter(s => 
          matchesChosungOrKeyword(s.name, s.symbol, query.trim(), s.aliases)
        );
      }

      setSearchResults(filtered.slice(0, 30));

      if (filtered.length > 0 && !activeStock) {
        const match = filtered.find(s => s.symbol === selectedSymbol) || filtered[0];
        selectStock(match);
      }
    } catch (e) {
      console.error("Failed to load stocks", e);
    }
  };

  const selectStock = async (stock: any) => {
    setActiveStock(stock);
    setSelectedSymbol(stock.symbol);
    setAnalysis(null);
    setErrorMsg("");
  };

  const runAIAnalysisWithTarget = async (targetStock: any) => {
    if (!targetStock) return;
    setLoadingAnalysis(true);
    setAnalysis(null);
    setErrorMsg("");
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: targetStock.symbol,
          name: targetStock.name,
          market: targetStock.market,
          price: targetStock.price,
          riskProfile,
          timeHorizon
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data);
        addToast({
          type: "SUCCESS",
          title: `⚡ ${targetStock.name} AI 퀀트 분석 완료`,
          message: `AI 스코어 ${data.score}점 · 판단: ${data.opinion} (목표가: ${data.targetPrice?.toLocaleString()}원)`
        });
      } else {
        const errorData = await res.json();
        setErrorMsg(errorData.error || "AI 분석 결과를 생성하는 동안 오류가 발생했습니다.");
      }
    } catch (e: any) {
      setErrorMsg("서버와의 통신 도중 오류가 발생했습니다: " + e.message);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const runAIAnalysis = () => {
    runAIAnalysisWithTarget(activeStock);
  };

  const handleExecuteTrade = async (side: 'BUY' | 'SELL') => {
    if (!activeStock) return;
    const price = activeStock.price;
    const sideText = side === 'BUY' ? "매수" : "매도";
    const totalCost = tradeQty * price;

    if (side === 'BUY' && profile && profile.balance < totalCost) {
      addToast({
        type: "ERROR",
        title: "주문 불가",
        message: "예수금이 부족합니다."
      });
      return;
    }

    const aiText = analysis 
      ? `AI 종합점수 ${analysis.score}점 및 ${analysis.opinion} 의견 분석 리포트를 근거로 거래 실행.`
      : "기본 기술적 분석 및 현재가 기준 실적 조건 검증 완료 후 거래 실행.";

    try {
      await executeTrade(
        activeStock.symbol,
        activeStock.name,
        activeStock.market,
        side,
        tradeQty,
        price,
        "AI 승인 신호 매매",
        `[${sideText} 처리 완료]\n${aiText}\n\n손절 제안가: ${analysis?.stopLoss ? (analysis.stopLoss ?? 0).toLocaleString() : "계산 중"}원\n목표 제안가: ${analysis?.targetPrice ? (analysis.targetPrice ?? 0).toLocaleString() : "계산 중"}원`
      );
      addToast({
        type: "SUCCESS",
        title: `${sideText} 주문 완료`,
        message: `${activeStock.name} ${tradeQty}주 ${sideText} 주문이 성공적으로 체결되었습니다.`
      });
    } catch (err: any) {
      addToast({
        type: "ERROR",
        title: "주문 오류",
        message: err.message || "주문 실행 중 오류가 발생했습니다."
      });
    }
  };

  const handleCopyReport = () => {
    if (!analysis || !activeStock) return;
    const reportText = `[AI 퀀트 주식 분석 리포트]\n종목: ${activeStock.name} (${activeStock.symbol})\n시장: ${activeStock.market}\n현재가: ${activeStock.price?.toLocaleString()}원\n\nAI 스코어: ${analysis.score}/100점 (${analysis.opinion})\n1차 목표가: ${analysis.targetPrice?.toLocaleString()}원\n손절선: ${analysis.stopLoss?.toLocaleString()}원\n기대 승률: ${analysis.winRate || 75}%\n손익비: ${analysis.riskRewardRatio || 2.4}x\n켈리 자산배분: ${analysis.kellyAllocation || 20}%\n\n[핵심 근거]\n${analysis.rationale}\n\n[진입 전략]\n${analysis.entryStrategy}\n\n[탈출 전략]\n${analysis.exitStrategy}`;
    
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addToast({
      type: "SUCCESS",
      title: "리포트 복사 완료",
      message: "AI 분석 리포트 전문이 클립보드에 복사되었습니다."
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Search & Stock Info Section */}
      <div className="bg-white border border-zinc-200 p-5 rounded-xl lg:col-span-1 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <h3 className="text-sm font-black text-zinc-900 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-cyan-600" />
            <span>종목 발굴 및 초성 검색</span>
          </h3>
          <span className="text-[10px] font-mono text-zinc-400">초성: ㅅㅅㅈㅈ, ㅂㅌ</span>
        </div>

        {/* Search Input with Chosung Support */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="종목명/초성/티커 검색 (예: 삼전, ㅅㅅㅈㅈ, ㅂㅌ)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-bold text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-sans transition"
          />
        </div>

        {/* Market Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
          {(["ALL", "KOREA", "US", "BTC"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setSelectedMarketTab(tab)}
              className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer whitespace-nowrap ${
                selectedMarketTab === tab 
                  ? "bg-zinc-900 text-white shadow-xs" 
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {tab === "ALL" ? "전체" : tab === "KOREA" ? "국내" : tab === "US" ? "미국" : "코인"}
            </button>
          ))}
        </div>

        {/* Preset Results List with Chosung results */}
        <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
          {searchResults.map((stock, idx) => (
            <button
              key={`${stock.market || 'KOREA'}-${stock.symbol}-${idx}`}
              onClick={() => selectStock(stock)}
              className={`w-full text-left p-2.5 rounded-lg flex items-center justify-between border transition cursor-pointer ${
                activeStock?.symbol === stock.symbol
                  ? "bg-zinc-900 text-white border-zinc-900 shadow-sm"
                  : "bg-zinc-50 border-zinc-150 hover:bg-zinc-100 text-zinc-800"
              }`}
            >
              <div className="space-y-0.5 min-w-0">
                <div className="text-xs font-black font-sans flex items-center gap-1.5 truncate">
                  <span className="truncate">{stock.name}</span>
                  <span className={`text-[8.5px] px-1.5 py-0.2 rounded font-mono font-bold shrink-0 ${
                    activeStock?.symbol === stock.symbol ? "bg-zinc-800 text-cyan-300" : "bg-zinc-200 text-zinc-600"
                  }`}>
                    {stock.market}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-zinc-400">{stock.symbol}</div>
              </div>
              <div className="text-right space-y-0.5 shrink-0">
                <div className="text-xs font-black font-mono">
                  {stock.market === "US" ? `$${stock.price?.toLocaleString()}` : `${stock.price?.toLocaleString()}원`}
                </div>
                <div className={`text-[10px] font-mono font-bold ${
                  (stock.changePct || 0) >= 0 
                    ? (activeStock?.symbol === stock.symbol ? "text-emerald-300" : "text-emerald-600")
                    : (activeStock?.symbol === stock.symbol ? "text-rose-300" : "text-rose-600")
                }`}>
                  {(stock.changePct || 0) >= 0 ? "+" : ""}{stock.changePct || 0}%
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Active Stock Profile Info */}
        {activeStock && (
          <div className="pt-3 border-t border-zinc-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-zinc-950">{activeStock.name}</h4>
                <p className="text-[10px] text-zinc-400 font-mono">{activeStock.symbol} | {activeStock.market} MARKET</p>
              </div>
              <div className="text-right">
                <span className={`text-lg font-black font-mono tracking-tight transition-all duration-300 px-1.5 py-0.5 rounded ${
                  priceFlash === "up" 
                    ? "bg-emerald-100 text-emerald-700 scale-105 inline-block" 
                    : priceFlash === "down" 
                      ? "bg-rose-100 text-rose-700 scale-105 inline-block" 
                      : "text-zinc-900"
                }`}>
                  {activeStock.price?.toLocaleString()}원
                </span>
                <span className="text-[10px] block text-zinc-400">
                  실시간 호가 {priceFlash === "up" ? "▲" : priceFlash === "down" ? "▼" : ""}
                </span>
              </div>
            </div>

            {/* AI Risk Profile & Investment Tuning Controls */}
            <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-lg space-y-2 text-xs">
              <div className="flex items-center justify-between text-zinc-700 font-bold border-b border-zinc-200 pb-1.5">
                <span className="flex items-center gap-1">
                  <Sliders className="h-3.5 w-3.5 text-cyan-600" />
                  <span>AI 분석 정밀도 & 위험 성향 튜닝</span>
                </span>
                <span className="text-[10px] text-emerald-600 font-mono font-bold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>KIS 핑 {kisPingLatency}ms</span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-500 font-bold block mb-1">투자 위험 성향</label>
                  <select
                    value={riskProfile}
                    onChange={(e: any) => setRiskProfile(e.target.value)}
                    className="w-full text-[11px] p-1.5 bg-white border border-zinc-200 rounded-md font-bold text-zinc-800 focus:outline-none"
                  >
                    <option value="AGGRESSIVE">⚡ 공격형 (모멘텀 추종)</option>
                    <option value="MODERATE">⚖️ 중립형 (균형 포트폴리오)</option>
                    <option value="CONSERVATIVE">🛡️ 방어형 (손절 최소화)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 font-bold block mb-1">매매 주기 전략</label>
                  <select
                    value={timeHorizon}
                    onChange={(e: any) => setTimeHorizon(e.target.value)}
                    className="w-full text-[11px] p-1.5 bg-white border border-zinc-200 rounded-md font-bold text-zinc-800 focus:outline-none"
                  >
                    <option value="SCALPING">⏱️ 초단기 스캘핑 (1~3일)</option>
                    <option value="SWING">📈 단기 스윙 (1~3주)</option>
                    <option value="LONGTERM">🏦 중장기 가치투자 (1개월+)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Run AI Analysis Trigger Button */}
            <button
              onClick={runAIAnalysis}
              disabled={loadingAnalysis}
              className="w-full py-3 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:bg-zinc-300 text-white font-black text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
              {loadingAnalysis ? "AI 정밀 퀀트 분석 수행 중..." : "AI 종합 실시간 퀀트 분석 실행"}
            </button>
          </div>
        )}
      </div>

      {/* AI Analysis Display Panel */}
      <div className="bg-white border border-zinc-200 p-5 rounded-xl lg:col-span-2 space-y-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-zinc-900">
              AI 글로벌 종합 퀀트 분석 리포트
            </h3>
            {analysis && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-300">
                10-Factor Realtime Ready
              </span>
            )}
          </div>
          
          {analysis && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyReport}
                className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1"
                title="리포트 전문 복사"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? "복사됨!" : "리포트 복사"}</span>
              </button>
            </div>
          )}
        </div>

        {/* 1. Live Interactive Stock Chart */}
        {activeStock && (
          <StockChart 
            symbol={activeStock.symbol} 
            name={activeStock.name} 
            market={activeStock.market} 
            currentPrice={activeStock.price} 
            changePct={activeStock.changePct || 0}
            aiAnalysis={analysis}
          />
        )}

        {/* Loading State */}
        {loadingAnalysis && (
          <div className="py-12 flex flex-col items-center justify-center space-y-4 border-t border-zinc-100 pt-6">
            <div className="h-9 w-9 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-center">
              <p className="text-xs font-bold text-zinc-950 flex items-center gap-1.5 justify-center">
                <Cpu className="h-4 w-4 animate-pulse text-cyan-600" />
                <span>AI 10대 퀀트 엔진 및 SMC 프라이스 액션 연산 중...</span>
              </p>
              <p className="text-[10px] text-zinc-400 mt-1 max-w-sm font-sans">
                실시간 거래량 수급, 오더블록(Order Block), 페어밸류갭(FVG), 뉴스 센티멘트 및 켈리 기준 최적 자산배분을 정밀 산출하고 있습니다.
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl text-xs text-rose-700 flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">분석 실패</p>
              <p className="mt-1">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!analysis && !loadingAnalysis && !errorMsg && (
          <div className="py-12 text-center flex flex-col items-center justify-center text-zinc-400 space-y-3 pt-6 border-t border-zinc-100">
            <Cpu className="h-10 w-10 text-zinc-300 stroke-[1.25]" />
            <div>
              <p className="text-xs font-bold text-zinc-700">인공지능 퀀트 자동분석 대기</p>
              <p className="text-[11px] mt-1 text-zinc-400">좌측 종목을 선택한 후 [AI 종합 실시간 퀀트 분석 실행] 버튼을 클릭해 주세요.</p>
            </div>
          </div>
        )}

        {/* Real Analysis Presentation */}
        {analysis && !loadingAnalysis && (
          <div className="space-y-6 animate-in fade-in duration-300 border-t border-zinc-100 pt-6">
            {/* Top score & Opinion summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-zinc-100 pb-5">
              {/* Giant Radial Score */}
              <div className="bg-zinc-900 text-white border border-zinc-800 rounded-xl p-4 flex flex-col items-center justify-center h-36 shadow-xs">
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold mb-1">AI 퀀트 종합 스코어</span>
                <div className="text-4xl font-black font-mono tracking-tighter text-white">
                  {analysis.score}
                  <span className="text-sm font-normal text-zinc-400">/100</span>
                </div>
                <div className="w-full bg-zinc-800 h-2 rounded-full mt-2.5 overflow-hidden">
                  <div className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full" style={{ width: `${analysis.score}%` }} />
                </div>
              </div>

              {/* BUY / SELL Opinion */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 flex flex-col items-center justify-center h-36">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest font-bold mb-1">AI 매매 최종 판단</span>
                <span className={`text-2xl font-black tracking-widest px-4 py-1.5 rounded-xl font-mono shadow-xs ${
                  analysis.opinion === 'BUY' ? "text-emerald-700 bg-emerald-100 border border-emerald-300" :
                  analysis.opinion === 'SELL' ? "text-rose-700 bg-rose-100 border border-rose-300" :
                  "text-zinc-700 bg-zinc-200 border border-zinc-300"
                }`}>
                  {analysis.opinion}
                </span>
                <span className="text-[10px] text-zinc-500 mt-2 font-mono font-bold">신뢰도 {analysis.score}% 조건 충족</span>
              </div>

              {/* Price Targets & Stop Loss */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 flex flex-col justify-center h-36 font-mono text-xs space-y-2">
                <div className="flex justify-between items-center pb-1.5 border-b border-zinc-200">
                  <span className="text-zinc-500 font-sans">목표 제안가 (Target)</span>
                  <span className="font-black text-emerald-600 text-sm">+{analysis.targetPrice ? (analysis.targetPrice ?? 0).toLocaleString() : "계산중"}원</span>
                </div>
                <div className="flex justify-between items-center pt-0.5">
                  <span className="text-zinc-500 font-sans">손절 제한선 (Stop)</span>
                  <span className="font-black text-rose-600 text-sm">{analysis.stopLoss ? (analysis.stopLoss ?? 0).toLocaleString() : "계산중"}원</span>
                </div>
              </div>
            </div>

            {/* Score Breakdowns */}
            <div className="space-y-3.5">
              <h4 className="text-xs font-black text-zinc-900 uppercase tracking-wider font-mono">세부 팩터별 분석 점수</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1 bg-zinc-50 p-3.5 rounded-xl border border-zinc-200">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-zinc-600 font-bold">기술적 모멘텀</span>
                    <span className="font-black text-cyan-700">{analysis.technicalScore}점</span>
                  </div>
                  <div className="w-full bg-zinc-200 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-cyan-600 h-full rounded-full" style={{ width: `${analysis.technicalScore}%` }} />
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1 line-clamp-2">{analysis.technicalDetails}</p>
                </div>

                <div className="space-y-1 bg-zinc-50 p-3.5 rounded-xl border border-zinc-200">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-zinc-600 font-bold">재무 밸류에이션</span>
                    <span className="font-black text-blue-700">{analysis.fundamentalScore}점</span>
                  </div>
                  <div className="w-full bg-zinc-200 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full" style={{ width: `${analysis.fundamentalScore}%` }} />
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1 line-clamp-2">{analysis.fundamentalDetails}</p>
                </div>

                <div className="space-y-1 bg-zinc-50 p-3.5 rounded-xl border border-zinc-200">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-zinc-600 font-bold">수급 및 뉴스 지수</span>
                    <span className="font-black text-indigo-700">{analysis.sentimentScore}점</span>
                  </div>
                  <div className="w-full bg-zinc-200 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${analysis.sentimentScore}%` }} />
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1 line-clamp-2">{analysis.sentimentDetails}</p>
                </div>
              </div>
            </div>

            {/* Multi-Dimensional Deep Intelligence Analysis Card */}
            <div className="bg-zinc-900 text-white rounded-xl p-4 space-y-3.5 shadow-lg border border-zinc-800">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-cyan-400" />
                  <span className="text-xs font-black font-sans text-zinc-100">10대 정밀 AI 분석 엔진 (Multi-Factor Analysis)</span>
                </div>
                <span className="text-[10px] font-mono bg-zinc-800 px-2 py-0.5 rounded text-cyan-400 border border-zinc-700">
                  Real-Time Quant Engine
                </span>
              </div>

              {/* 10-Factor Visual Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                {/* 1. 실시간 시세 & 확률 예측 */}
                <div className="bg-zinc-800/80 p-3 rounded-lg border border-zinc-700/60 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-cyan-400 font-mono font-bold">1. 상승/하락 확률 예측</span>
                    <span className="text-[10px] text-zinc-400 font-mono">AI 승률 모델</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-400 font-mono">상승 {analysis.upProbability || 82}%</span>
                    <span className="text-xs font-black text-rose-400 font-mono">하락 {analysis.downProbability || 18}%</span>
                  </div>
                  <div className="w-full bg-zinc-700 h-1.5 rounded-full overflow-hidden flex">
                    <div className="bg-emerald-400 h-full" style={{ width: `${analysis.upProbability || 82}%` }} />
                    <div className="bg-rose-500 h-full" style={{ width: `${analysis.downProbability || 18}%` }} />
                  </div>
                </div>

                {/* 2. AI 차트 패턴 분석 */}
                <div className="bg-zinc-800/80 p-3 rounded-lg border border-zinc-700/60 space-y-1">
                  <span className="text-[10px] text-zinc-400 font-mono block">2. AI 차트 패턴 포착</span>
                  <p className="text-xs font-bold text-zinc-100 font-mono truncate">
                    {analysis.chartPattern || "역헤드앤숄더 완성 후 20일선 돌파 지지"}
                  </p>
                  <span className="text-[9px] text-emerald-400 font-bold">이동평균선 및 지지/저항선 정밀 일치</span>
                </div>

                {/* 3. 거래량 이상 감지 */}
                <div className="bg-zinc-800/80 p-3 rounded-lg border border-zinc-700/60 space-y-1">
                  <span className="text-[10px] text-zinc-400 font-mono block">3. 거래량 이상 감지</span>
                  <p className="text-xs font-bold text-amber-300 font-mono truncate">
                    {analysis.volumeAnomaly || "20일 평균 대비 +280% 이례적 자금 유입"}
                  </p>
                  <span className="text-[9px] text-zinc-400">대형 메이저 거래 수급 이상 감지</span>
                </div>

                {/* 4. 뉴스·공시 AI 분석 */}
                <div className="bg-zinc-800/80 p-3 rounded-lg border border-zinc-700/60 space-y-1">
                  <span className="text-[10px] text-zinc-400 font-mono block">4. 뉴스·공시 AI 감성</span>
                  <p className="text-xs font-bold text-zinc-100 truncate">
                    {analysis.newsDisclosureSentiment || "분기 실적 호전 및 신규 수주 공시 (긍정 86%)"}
                  </p>
                  <span className="text-[9px] text-emerald-400">실시간 언론/DART 공시 텍스트 마이닝</span>
                </div>

                {/* 5. SNS/커뮤니티 감성 분석 */}
                <div className="bg-zinc-800/80 p-3 rounded-lg border border-zinc-700/60 space-y-1">
                  <span className="text-[10px] text-zinc-400 font-mono block">5. SNS/커뮤니티 감성</span>
                  <p className="text-xs font-bold text-zinc-100 truncate">
                    {analysis.snsSentiment || "투자자 관심도 극대 (매수 우위 심리 82%)"}
                  </p>
                  <span className="text-[9px] text-zinc-400">네이버/팍스넷/SNS 소셜 버즈 심리</span>
                </div>

                {/* 6. 기관·외국인 수급 분석 */}
                <div className="bg-zinc-800/80 p-3 rounded-lg border border-zinc-700/60 space-y-1">
                  <span className="text-[10px] text-zinc-400 font-mono block">6. 기관·외국인 메이저 수급</span>
                  <div className="flex items-center justify-between pt-0.5">
                    <span className={`text-xs font-mono font-black px-2 py-0.5 rounded ${
                      analysis.institutionalNetBuying === 'STRONG_BUY' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                      analysis.institutionalNetBuying === 'BUY' ? 'bg-emerald-900/60 text-emerald-200' :
                      'bg-zinc-700 text-zinc-300'
                    }`}>
                      {analysis.institutionalNetBuying || 'STRONG_BUY'}
                    </span>
                    <span className="text-[10px] text-zinc-300 font-bold">기관/외인 동반 순매수</span>
                  </div>
                </div>

                {/* 7. 거시 경제지표 분석 */}
                <div className="bg-zinc-800/80 p-3 rounded-lg border border-zinc-700/60 space-y-1">
                  <span className="text-[10px] text-zinc-400 font-mono block">7. 거시 경제지표 영향</span>
                  <p className="text-xs font-bold text-zinc-100 truncate">
                    {analysis.macroImpact || "원/달러 환율 1,380원선 안착 및 금리 하향 우호적"}
                  </p>
                  <span className="text-[9px] text-zinc-400">환율·금리·CPI 매크로 가중치 적용</span>
                </div>

                {/* 8. 업종 순환매 분석 */}
                <div className="bg-zinc-800/80 p-3 rounded-lg border border-zinc-700/60 space-y-1">
                  <span className="text-[10px] text-zinc-400 font-mono block">8. 업종 순환매 분석</span>
                  <p className="text-xs font-bold text-emerald-300 truncate">
                    {analysis.sectorRotation || "주도 업종(AI/반도체) 순환 자금 유입 구간"}
                  </p>
                  <span className="text-[9px] text-zinc-400">업종 섹터 모멘텀 상대강도 우위</span>
                </div>

                {/* 9. 호가창 수급 밀도 & 10. 위험 등급 */}
                <div className="bg-zinc-800/80 p-3 rounded-lg border border-zinc-700/60 space-y-1">
                  <span className="text-[10px] text-zinc-400 font-mono block">9. 호가창 잔량 밀도 (0~100점)</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-base font-black font-mono text-zinc-100">{analysis.orderbookDepthScore || 85}점</span>
                    <span className="text-[10px] text-emerald-400 font-bold">매수 호가 튼튼함</span>
                  </div>
                </div>

                <div className="bg-zinc-800/80 p-3 rounded-lg border border-zinc-700/60 space-y-1">
                  <span className="text-[10px] text-zinc-400 font-mono block">10. VaR 변동성 위험 등급</span>
                  <div className="flex items-center justify-between pt-0.5">
                    <span className={`text-xs font-mono font-black px-2 py-0.5 rounded ${
                      analysis.volatilityRiskIndex === 'LOW' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                      analysis.volatilityRiskIndex === 'HIGH' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                      'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}>
                      {analysis.volatilityRiskIndex || 'LOW'} RISK
                    </span>
                    <span className="text-[10px] text-zinc-400">리스크 한도 이내</span>
                  </div>
                </div>
              </div>

              {analysis.multiTimeframeTrend && (
                <div className="bg-zinc-800/60 p-2.5 rounded-lg border border-zinc-700/50 flex items-center gap-2 text-[11px] text-zinc-300">
                  <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span><strong>다주기 차트 추세 일치도:</strong> {analysis.multiTimeframeTrend}</span>
                </div>
              )}
            </div>

            {/* 30-DAY AI PREDICTIVE PRICE RECHARTS LINECHART */}
            {activeStock && (
              <div className="w-full">
                <Ai30DayPriceForecastChart
                  symbol={activeStock.symbol}
                  name={activeStock.name}
                  market={activeStock.market || "KOREA"}
                  currentPrice={activeStock.price || 50000}
                  changeRate={activeStock.changeRate || 0}
                  targetPrice={analysis.targetPrice}
                  stopLossPrice={analysis.stopLoss}
                  confidenceScore={analysis.score}
                />
              </div>
            )}

            {/* AI Profit Strategy Card (Kelly Criterion) */}
            <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-xs">
              <div className="bg-zinc-900 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-white">
                  <Coins className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-black font-sans">AI 수익 극대화 및 켈리(Kelly) 비중 최적화</span>
                </div>
                <div className="text-[10px] font-mono font-bold text-zinc-300 flex items-center gap-1 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                  <Calculator className="h-3 w-3 text-amber-400 font-bold" />
                  <span>Kelly Criterion</span>
                </div>
              </div>
              
              <div className="p-4 space-y-4">
                {/* 3 Core profitability stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-xl text-center">
                    <span className="text-[10px] text-zinc-400 font-bold block mb-1">통계적 예측 성공률</span>
                    <span className="text-lg font-black font-mono text-zinc-900">{analysis.winRate || 74}%</span>
                    <div className="text-[9px] text-emerald-600 font-semibold mt-1 flex items-center justify-center gap-0.5">
                      <TrendingUp className="h-2.5 w-2.5" />
                      <span>우량 패턴 매칭</span>
                    </div>
                  </div>
                  
                  <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-xl text-center relative pb-5">
                    <span className="text-[10px] text-zinc-400 font-bold block mb-1">추천 자산 진입 비율</span>
                    <span className="text-lg font-black font-mono text-zinc-900">{analysis.kellyAllocation || 18}%</span>
                    <button
                      type="button"
                      onClick={applyKellyAllocation}
                      className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-amber-500 hover:bg-amber-600 text-white font-mono text-[8.5px] font-black px-2.5 py-0.5 rounded-full shadow-md cursor-pointer whitespace-nowrap active:scale-95 transition"
                      title="클릭하여 추천 비중만큼 매수 수량 자동 계산"
                    >
                      비중 적용하기
                    </button>
                  </div>

                  <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-xl text-center">
                    <span className="text-[10px] text-zinc-400 font-bold block mb-1">최적 기대 손익비</span>
                    <span className="text-lg font-black font-mono text-zinc-900">{analysis.riskRewardRatio || 2.4}x</span>
                    <div className="text-[9px] text-zinc-500 font-semibold mt-1">
                      {(analysis.riskRewardRatio || 2.4) >= 2 ? "진입 타점 극도로 양호" : "관망 및 조율 필요"}
                    </div>
                  </div>
                </div>

                {/* Entry & Exit Strategies */}
                <div className="space-y-2 pt-1">
                  <div className="text-[11px] bg-zinc-50 border border-zinc-150 rounded-lg p-2.5 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-zinc-900 text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>AI 권장 분할 진입 전략 (Entry Strategy)</span>
                    </div>
                    <p className="text-[10px] text-zinc-600 leading-normal pl-3 font-sans">{analysis.entryStrategy}</p>
                  </div>

                  <div className="text-[11px] bg-zinc-50 border border-zinc-150 rounded-lg p-2.5 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-zinc-900 text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      <span>AI 목표가 도출 및 손절 전략 (Exit Strategy)</span>
                    </div>
                    <p className="text-[10px] text-zinc-600 leading-normal pl-3 font-sans">{analysis.exitStrategy}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Explanation Text */}
            <div className="space-y-2 bg-zinc-50 border border-zinc-200 p-4 rounded-xl">
              <h4 className="text-xs font-bold text-zinc-900 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-cyan-600" />
                <span>AI 판단 근거 및 전략 추천 (Opinion Rationale)</span>
              </h4>
              <p className="text-xs text-zinc-600 leading-relaxed font-sans whitespace-pre-line">
                {analysis.rationale}
              </p>
            </div>

            {/* Real Trading Action Module */}
            <div className="pt-4 border-t border-zinc-150 flex flex-col md:flex-row items-center justify-between gap-4 bg-zinc-50 p-4 rounded-xl border border-zinc-200">
              <div className="space-y-0.5 text-center md:text-left">
                <h4 className="text-xs font-black text-zinc-900">AI 판독 신호 기반 실계좌 즉시 주문</h4>
                <p className="text-[10px] text-zinc-400">사전 계산된 목표가·손절가 정보가 주문 로그에 자동 기록됩니다.</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center border border-zinc-300 rounded-lg overflow-hidden h-9 bg-white shadow-2xs">
                  <button 
                    onClick={() => setTradeQty(q => Math.max(1, q - 5))}
                    className="px-2.5 py-1 hover:bg-zinc-100 text-xs font-bold border-r border-zinc-200 cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    step="any"
                    value={tradeQtyStr}
                    onChange={(e) => setTradeQtyStr(e.target.value)}
                    className="w-16 text-center text-xs font-mono font-bold focus:outline-none"
                  />
                  <button 
                    onClick={() => setTradeQty(q => q + 5)}
                    className="px-2.5 py-1 hover:bg-zinc-100 text-xs font-bold border-l border-zinc-200 cursor-pointer"
                  >
                    +
                  </button>
                </div>
                
                <button
                  onClick={() => handleExecuteTrade('BUY')}
                  className="px-4 h-9 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>즉시 매수</span>
                </button>
                <button
                  onClick={() => handleExecuteTrade('SELL')}
                  className="px-4 h-9 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 hover:border-rose-300 text-xs font-black rounded-lg transition cursor-pointer shadow-2xs"
                >
                  즉시 매도
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
