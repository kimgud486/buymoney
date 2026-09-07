import React, { useState, useEffect, useMemo } from "react";
import {
  TrendingDown,
  Sparkles,
  CheckCircle2,
  Zap,
  Activity,
  Target,
  ShieldAlert,
  ChevronRight,
  RefreshCw,
  Layers,
  ArrowDownRight,
  BarChart2,
  Search,
  AlertCircle,
  Clock,
  Sliders,
  Check,
  XCircle,
  HelpCircle,
  Flame,
  Brain,
  Radio,
  Wifi,
  Eye,
  Filter,
  Info,
  Scale
} from "lucide-react";
import {
  BEARISH_PATTERN_CATALOG,
  BearishPatternDef,
  BearishIntelligenceEngine,
  EngineAnalysisOutput
} from "../lib/bearishMasterEngine";
import { realtimeMarketFeedService } from "../services/realtimeMarketFeedService";
import { UnifiedMasterDecisionEngine } from "../services/unifiedMasterDecisionEngine";
import { useApp } from "../context/AppContext";

export interface StockItemOption {
  symbol: string;
  name: string;
  price: number;
  changeRate: number;
  market: "KOREA" | "US" | "CRYPTO";
}

export const SAMPLE_STOCKS: StockItemOption[] = [
  { symbol: "457550", name: "우진엔텍", price: 28800, changeRate: -3.8, market: "KOREA" },
  { symbol: "005930", name: "삼성전자", price: 78500, changeRate: -1.2, market: "KOREA" },
  { symbol: "000660", name: "SK하이닉스", price: 192500, changeRate: -4.5, market: "KOREA" },
  { symbol: "028300", name: "HLB", price: 84200, changeRate: -6.1, market: "KOREA" },
  { symbol: "042700", name: "한미반도체", price: 135000, changeRate: -2.7, market: "KOREA" },
  { symbol: "BTC-KRW", name: "비트코인", price: 92400000, changeRate: -2.1, market: "CRYPTO" },
  { symbol: "TSLA", name: "테슬라 (Tesla)", price: 218, changeRate: -5.2, market: "US" },
  { symbol: "NVDA", name: "엔비디아 (NVIDIA)", price: 128, changeRate: -3.1, market: "US" }
];

export const BearishPatternsLifecycleEngine: React.FC = () => {
  const { selectedSymbol } = useApp();
  const [selectedStock, setSelectedStock] = useState<StockItemOption>(SAMPLE_STOCKS[0]);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [selectedPatternCode, setSelectedPatternCode] = useState<string>("BEARISH_ENGULFING");
  const [customSearch, setCustomSearch] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Sync with AppContext selectedSymbol
  useEffect(() => {
    const symStr = typeof selectedSymbol === "string" ? selectedSymbol : String((selectedSymbol as any)?.symbol || selectedSymbol || "");
    if (symStr && symStr !== selectedStock.symbol) {
      const found = SAMPLE_STOCKS.find(s => s.symbol === symStr || s.symbol.replace("BTC-", "") === symStr);
      if (found) {
        setSelectedStock(found);
      } else {
        setSelectedStock({
          symbol: symStr,
          name: symStr,
          price: 50000,
          changeRate: -1.5,
          market: symStr.startsWith("KRW-") || symStr === "BTC" ? "CRYPTO" : (/^[A-Za-z]+$/.test(symStr) ? "US" : "KOREA")
        });
      }
    }
  }, [selectedSymbol]);

  useEffect(() => {
    const handleStockSelected = (e: CustomEvent) => {
      if (e.detail?.symbol) {
        const sym = e.detail.symbol;
        const found = SAMPLE_STOCKS.find(s => s.symbol === sym || s.symbol.replace("BTC-", "") === sym);
        if (found) {
          setSelectedStock(found);
        } else {
          setSelectedStock({
            symbol: sym,
            name: e.detail.name || sym,
            price: e.detail.price || 50000,
            changeRate: e.detail.changeRate || -1.5,
            market: sym.startsWith("KRW-") || sym === "BTC" ? "CRYPTO" : (/^[A-Za-z]+$/.test(sym) ? "US" : "KOREA")
          });
        }
      }
    };
    window.addEventListener("stock-selected" as any, handleStockSelected);
    return () => window.removeEventListener("stock-selected" as any, handleStockSelected);
  }, []);

  useEffect(() => {
    const unsub = realtimeMarketFeedService.subscribe((quotesMap) => {
      setSelectedStock((prev) => {
        const q = quotesMap.get(prev.symbol) || quotesMap.get(prev.symbol.replace("BTC-", ""));
        if (q) {
          return {
            ...prev,
            price: q.price,
            changeRate: q.changeRate
          };
        }
        return prev;
      });
    });
    return () => unsub();
  }, []);

  // Compute Engine Analysis
  const analysis: EngineAnalysisOutput = useMemo(() => {
    return BearishIntelligenceEngine.analyzeStock(
      selectedStock.symbol,
      selectedStock.name,
      selectedStock.price,
      selectedStock.changeRate
    );
  }, [selectedStock]);

  // Compute Single Unified Master Consensus (단 하나의 통합 AI 마스터 브레인과 100% 동기화)
  const unifiedDecision = useMemo(() => {
    return UnifiedMasterDecisionEngine.analyze(
      selectedStock.symbol,
      selectedStock.name,
      selectedStock.price,
      selectedStock.changeRate,
      selectedStock.market === "CRYPTO" ? "BTC" : selectedStock.market
    );
  }, [selectedStock]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 450);
  };

  // Filter Catalog
  const filteredPatterns = useMemo(() => {
    return BEARISH_PATTERN_CATALOG.filter((item) => {
      if (categoryFilter !== "ALL" && item.category !== categoryFilter) return false;
      if (customSearch.trim() !== "") {
        const query = customSearch.toLowerCase();
        return (
          item.nameKr.toLowerCase().includes(query) ||
          item.nameEn.toLowerCase().includes(query) ||
          item.code.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [categoryFilter, customSearch]);

  // Active pattern detail
  const activePattern = useMemo(() => {
    return BEARISH_PATTERN_CATALOG.find((p) => p.code === selectedPatternCode) || BEARISH_PATTERN_CATALOG[0];
  }, [selectedPatternCode]);

  return (
    <div className="w-full bg-slate-950 text-slate-100 rounded-3xl p-5 md:p-7 border border-red-900/40 shadow-2xl space-y-6 font-sans">
      {/* HEADER BAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400">
              <TrendingDown className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
                <span>🔴 Bearish Master Intelligence Engine</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-red-500/20 text-red-300 border border-red-500/40">
                  하락 봉 탐지 봇 뇌엔진 V5.0
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                캔들 ➔ 위치 ➔ 구조 ➔ 거래량 ➔ 모멘텀 ➔ VWAP ➔ 돌파실패 ➔ 후속봉 8단계 다차원 증거 교차 감지
              </p>
            </div>
          </div>
        </div>

        {/* Stock Selector & Refresh */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
            <Search className="w-4 h-4 text-slate-400 ml-1" />
            <select
              value={selectedStock.symbol}
              onChange={(e) => {
                const found = SAMPLE_STOCKS.find((s) => s.symbol === e.target.value);
                if (found) setSelectedStock(found);
              }}
              className="bg-transparent text-xs font-bold text-slate-200 outline-none cursor-pointer pr-2"
            >
              {SAMPLE_STOCKS.map((s) => (
                <option key={s.symbol} value={s.symbol} className="bg-slate-900 text-slate-100">
                  {s.name} ({s.symbol}) - {s.changeRate > 0 ? "+" : ""}{s.changeRate}%
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>실시간 재스캔</span>
          </button>
        </div>
      </div>

      {/* 👑 SINGLE UNIFIED MASTER AI CONSENSUS BANNER (단일 통합 마스터 브레인 최종 판정) */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-950 border border-cyan-500/40 space-y-2 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-black text-cyan-300">
              👑 단일 통합 AI 마스터 브레인 최종 합의 판정
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-black px-2.5 py-0.5 rounded-lg bg-slate-800 ${unifiedDecision.verdictColor}`}>
              {unifiedDecision.verdictKorean}
            </span>
            <span className="text-[11px] font-mono text-cyan-300 font-bold">
              통합 점수: {unifiedDecision.masterScore}점
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
          {unifiedDecision.unifiedSummary}
        </p>
      </div>

      {/* DUAL AI BATTLE: BULL SCORE VS BEAR SCORE */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 shadow-xl relative overflow-hidden space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-extrabold text-slate-200">
              DUAL AI SENSORY BATTLE: BULL SCORE vs BEAR SCORE
            </span>
          </div>

          <span className="text-[11px] font-mono font-bold text-slate-400">
            상승세 vs 하락세 실시간 힘의 균형 평가
          </span>
        </div>

        {/* Battle Gauge */}
        <div className="grid grid-cols-12 gap-3 items-center">
          {/* Bear Side */}
          <div className="col-span-4 text-right space-y-0.5">
            <div className="text-xs font-bold text-red-400 flex items-center justify-end gap-1">
              <span>BEARISH 하락 압력</span>
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
            <div className="font-mono text-xl font-black text-red-400">
              {analysis.battle.bearScore} <span className="text-xs text-slate-400">pt</span>
            </div>
          </div>

          {/* Progress Bar Center */}
          <div className="col-span-4 relative">
            <div className="h-4 w-full bg-slate-950 rounded-full p-0.5 border border-slate-800 flex overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-l-full transition-all duration-500"
                style={{ width: `${analysis.battle.bearScore}%` }}
              />
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-r-full transition-all duration-500"
                style={{ width: `${analysis.battle.bullScore}%` }}
              />
            </div>
            <div className="absolute left-1/2 -top-1 bottom-0 w-px bg-slate-400 z-10" />
          </div>

          {/* Bull Side */}
          <div className="col-span-4 text-left space-y-0.5">
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>BULLISH 상승 지지</span>
            </div>
            <div className="font-mono text-xl font-black text-emerald-400">
              {analysis.battle.bullScore} <span className="text-xs text-slate-400">pt</span>
            </div>
          </div>
        </div>

        {/* Action Recommendation Banner */}
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-bold flex items-start gap-2">
          <Brain className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-slate-200">{analysis.battle.actionAdvice}</p>
            <p className="text-[10px] font-mono text-slate-400">{analysis.battle.confluenceSummary}</p>
          </div>
        </div>
      </div>

      {/* 8 SUB-ENGINES OPERATIONAL STATUS */}
      <div className="space-y-2">
        <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-red-400" />
          8대 BEARISH SUB-ENGINES 실시간 측정 수치 (8-Layer Confluence)
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {/* 1. Candle Engine */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-400 font-bold">① Candle Pattern</div>
            <div className="text-xs font-black text-red-400">Body/ATR: {analysis.metrics.bodyAtrRatio}x</div>
            <div className="text-[10px] text-slate-400 font-mono">점수: {analysis.scores.candlePattern} / 15 pt</div>
          </div>

          {/* 2. Rejection Engine */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-400 font-bold">② Upper Wick Rejection</div>
            <div className="text-xs font-black text-amber-400">Wick/Body: {analysis.metrics.upperWickRatio}x</div>
            <div className="text-[10px] text-slate-400 font-mono">점수: {analysis.scores.rejectionLocation} / 15 pt</div>
          </div>

          {/* 3. Market Structure */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-400 font-bold">③ Market Structure (LH+LL)</div>
            <div className="text-xs font-black text-purple-400">돌파실패지수: {analysis.metrics.breakoutFailureScore}%</div>
            <div className="text-[10px] text-slate-400 font-mono">점수: {analysis.scores.marketStructure} / 15 pt</div>
          </div>

          {/* 4. Volume/RVOL Engine */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-400 font-bold">④ RVOL Order Pressure</div>
            <div className="text-xs font-black text-cyan-400">상대거래량: {analysis.metrics.rvol}x</div>
            <div className="text-[10px] text-slate-400 font-mono">점수: {analysis.scores.volumeOrderPressure} / 15 pt</div>
          </div>

          {/* 5. VWAP Engine */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-400 font-bold">⑤ VWAP Rejection</div>
            <div className="text-xs font-black text-blue-400">VWAP이격: {analysis.metrics.vwapDistancePct}%</div>
            <div className="text-[10px] text-slate-400 font-mono">점수: {analysis.scores.vwapLevel} / 10 pt</div>
          </div>

          {/* 6. Momentum Engine */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-400 font-bold">⑥ RSI Divergence</div>
            <div className="text-xs font-black text-pink-400">Divergence Gap: {analysis.metrics.rsiDivergenceGap}p</div>
            <div className="text-[10px] text-slate-400 font-mono">점수: {analysis.scores.momentum} / 10 pt</div>
          </div>

          {/* 7. Breakdown Engine */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-400 font-bold">⑦ Support Breakdown</div>
            <div className="text-xs font-black text-emerald-400">등락률: {selectedStock.changeRate}%</div>
            <div className="text-[10px] text-slate-400 font-mono">점수: {analysis.scores.breakdown} / 10 pt</div>
          </div>

          {/* 8. Follow-through Engine */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-400 font-bold">⑧ Penetration Ratio</div>
            <div className="text-xs font-black text-orange-400">침투율: {analysis.metrics.penetrationPct}%</div>
            <div className="text-[10px] text-slate-400 font-mono">점수: {analysis.scores.followThrough} / 10 pt</div>
          </div>
        </div>
      </div>

      {/* FALSE SIGNAL NOISE FILTER PANEL */}
      {analysis.noiseFilter.hasPenalty && (
        <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-amber-200 text-xs space-y-1 font-sans">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>가짜 하락신호 감지 및 감점 적용 ({analysis.noiseFilter.filterType})</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300">
              -{analysis.noiseFilter.penaltyDeduction} pt 감점
            </span>
          </div>
          <p className="text-slate-300 leading-relaxed pl-6">{analysis.noiseFilter.reason}</p>
        </div>
      )}

      {/* CATEGORY FILTER TABS & SEARCH */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 mobile-tab-scroll no-scrollbar pb-1 max-w-full">
          {[
            { key: "ALL", label: "전체 (34)" },
            { key: "SINGLE_CANDLE", label: "단일봉" },
            { key: "TWO_CANDLES", label: "2봉" },
            { key: "THREE_CANDLES", label: "3봉" },
            { key: "MULTI_CANDLE", label: "다중봉" },
            { key: "MARKET_STRUCTURE", label: "시장구조" },
            { key: "VWAP_LEVEL", label: "VWAP" },
            { key: "VOLUME_PRESSURE", label: "거래량" },
            { key: "MOMENTUM_DIVERGENCE", label: "모멘텀" },
            { key: "GAP_FAILURE", label: "갭실패" }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setCategoryFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                categoryFilter === tab.key
                  ? "bg-red-600 text-white shadow-md shadow-red-900/40"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="패턴 검색 (예: 마루보주, H&S)..."
            value={customSearch}
            onChange={(e) => setCustomSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 outline-none focus:border-red-500/50"
          />
        </div>
      </div>

      {/* PATTERNS MATRIX GRID (34 PATTERNS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredPatterns.map((pat) => {
          const isSelected = selectedPatternCode === pat.code;
          const isActiveInStock = analysis.detectedPatterns.some((p) => p.code === pat.code);

          return (
            <div
              key={pat.id}
              onClick={() => setSelectedPatternCode(pat.code)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative space-y-2 ${
                isSelected
                  ? "bg-slate-900 border-red-500 shadow-xl shadow-red-950/50 ring-1 ring-red-500/50"
                  : "bg-slate-900/60 hover:bg-slate-900 border-slate-800 hover:border-slate-700"
              }`}
            >
              {/* Importance Stars & Active Badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
                  {Array.from({ length: pat.importance }).map((_, i) => (
                    <span key={i}>★</span>
                  ))}
                  <span className="text-[10px] text-slate-400 font-mono ml-1">({pat.category})</span>
                </div>

                {isActiveInStock && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-black bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse">
                    CURRENT DETECTED
                  </span>
                )}
              </div>

              {/* Pattern Names */}
              <div>
                <h4 className="text-sm font-extrabold text-white flex items-center justify-between">
                  <span>{pat.nameKr}</span>
                  <span className="text-xs font-mono text-slate-400">{pat.code}</span>
                </h4>
                <p className="text-[11px] font-mono text-red-400/80">{pat.nameEn}</p>
              </div>

              {/* Core Meaning */}
              <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{pat.coreMeaning}</p>

              {/* Trigger Condition */}
              <div className="pt-1 border-t border-slate-800/80 text-[10px] font-mono text-slate-400 flex items-center justify-between">
                <span>트리거: {pat.triggerCondition}</span>
                <span className="text-red-400 font-bold">가중치 +{pat.weightScore}pt</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ACTIVE PATTERN DETAILED INSIGHT CARD */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-extrabold text-white">
              선택된 하락 패턴 분석: {activePattern.nameKr} ({activePattern.nameEn})
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-red-400">
            패턴가중치: +{activePattern.weightScore} pt
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">핵심 하락 구조 의미</span>
            <p className="text-slate-200 leading-relaxed">{activePattern.coreMeaning}</p>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">수식 및 조건 트리거</span>
            <p className="text-cyan-300 font-mono leading-relaxed">{activePattern.triggerCondition}</p>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">AI 신해석 조치 가이드</span>
            <p className="text-amber-300 leading-relaxed">
              {activePattern.importance === 5
                ? "S급 최우선 주의 패턴: 손절선 즉시 고정 및 VWAP 하향 이탈 시 분할 매도"
                : "A급 지속 모니터링: 넥라인 및 2차 지지선 붕괴 여부 연속 관찰 필요"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
