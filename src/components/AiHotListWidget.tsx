import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "../context/AppContext";
import { 
  Flame, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Filter, 
  Search, 
  Zap, 
  ShieldCheck, 
  ArrowUpRight, 
  Star, 
  BarChart2, 
  Activity, 
  Clock, 
  Target, 
  AlertTriangle,
  ChevronRight,
  SlidersHorizontal,
  Bot
} from "lucide-react";
import { QuickOrderModal } from "./QuickOrderModal";

export interface HotItem {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  exchange?: string;
  currentPrice: number;
  priceChange24hPct: number;
  volatilityScore: number;
  aiMatchScore: number;
  expectedReturnPct: number;
  patternType: "BOLLINGER_SQUEEZE" | "W_BOTTOM" | "BULL_FLAG" | "VOLUME_SURGE" | "CUP_AND_HANDLE" | "RSI_OVERSOLD" | string;
  patternName: string;
  targetPrice: number;
  stopLoss: number;
  holdingPeriod: string;
  riskRewardRatio: string;
  volumeIncreaseRatio: number;
  rsiIndicator: number;
  reasoning: string;
  grade?: "S" | "A" | "B" | "WATCH" | "REJECT" | string;
  setupScore?: number;
  dataStatus?: string;
}

interface AiHotListWidgetProps {
  className?: string;
  compactView?: boolean;
}

export const AiHotListWidget: React.FC<AiHotListWidgetProps> = ({ 
  className = "",
  compactView = false 
}) => {
  const { 
    addToast, 
    addToWatchlist, 
    isInWatchlist, 
    executeTrade, 
    profile,
    setSelectedSymbol,
    openStockChart
  } = useApp();

  const [marketFilter, setMarketFilter] = useState<"ALL" | "KOREA" | "US" | "BTC">("ALL");
  const [exchangeFilter, setExchangeFilter] = useState<"ALL" | "NASDAQ" | "NYSE" | "AMEX">("ALL");
  const [patternFilter, setPatternFilter] = useState<string>("ALL");
  const [minYieldFilter, setMinYieldFilter] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastScanTime, setLastScanTime] = useState<string>("");
  const [scannedTotal, setScannedTotal] = useState<number>(0);
  const [marketCounts, setMarketCounts] = useState<{ KOREA: number; US: number; UPBIT: number }>({ KOREA: 0, US: 0, UPBIT: 0 });
  const [hotItems, setHotItems] = useState<HotItem[]>([]);

  // Quick Order Modal State
  const [quickOrderModalOpen, setQuickOrderModalOpen] = useState(false);
  const [selectedHotItem, setSelectedHotItem] = useState<HotItem | null>(null);

  // Fetch AI Hot List from Backend Endpoint
  const fetchHotList = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/ai/hot-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketFilter,
          exchangeFilter,
          patternFilter,
          minYield: minYieldFilter
        })
      });

      if (res.ok) {
        const data = await res.json();
        setHotItems(data.hotItems || []);
        setLastScanTime(data.scanTimestamp || new Date().toLocaleTimeString());
        if (data.scannedTotal != null) setScannedTotal(data.scannedTotal);
        if (data.marketCounts) setMarketCounts(data.marketCounts);
      } else {
        throw new Error("API response not ok");
      }
    } catch (e) {
      console.warn("Hot list fetch error", e);
      setHotItems([]);
      setLastScanTime(new Date().toLocaleTimeString());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHotList();
  }, [marketFilter, exchangeFilter, patternFilter, minYieldFilter]);

  // Client-side search filtering
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return hotItems;
    const q = searchQuery.toLowerCase();
    return hotItems.filter(item => 
      item.name.toLowerCase().includes(q) || 
      item.symbol.toLowerCase().includes(q) ||
      item.patternName.toLowerCase().includes(q)
    );
  }, [hotItems, searchQuery]);

  // One-click Jarvis Auto Order Execution -> Opens Order Review & Risk Gate Modal
  const handleAutoTradeExecute = (item: HotItem) => {
    handleOpenQuickOrder(item);
  };

  // Open Quick Order Modal
  const handleOpenQuickOrder = (item: HotItem) => {
    setSelectedHotItem(item);
    setQuickOrderModalOpen(true);
  };

  // Toggle Watchlist
  const handleToggleWatchlist = async (item: HotItem) => {
    if (isInWatchlist(item.symbol)) {
      addToast({
        type: "INFO",
        title: "관심종목 등록 완료",
        message: `${item.name}(${item.symbol})은(는) 이미 관심종목에 등록되어 있습니다.`
      });
      return;
    }
    await addToWatchlist({
      symbol: item.symbol,
      name: item.name,
      market: item.market,
      targetBuyPrice: item.targetPrice,
      memo: `[AI 핫 리스트] ${item.patternName} / 기대수익률 +${item.expectedReturnPct}%`
    });
    addToast({
      type: "SUCCESS",
      title: "⭐ 관심종목 추가 완료",
      message: `${item.name}(${item.symbol})이(가) 관심종목에 등록되었습니다.`
    });
  };

  const handlePredictNavigate = (symbol: string) => {
    if (symbol) {
      setSelectedSymbol(symbol);
    }
    window.dispatchEvent(new CustomEvent("switch-tab", { detail: "omni_brain" }));
  };

  return (
    <div className={`bg-gradient-to-b from-zinc-900 via-slate-950 to-zinc-950 border border-amber-500/30 rounded-2xl shadow-xl p-4 sm:p-5 text-white space-y-4 ${className}`}>
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-rose-600 rounded-xl shadow-md text-white animate-pulse">
              <Flame className="h-5 w-5 fill-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white font-sans flex items-center gap-1.5">
                  <span>🔥 실시간 포착 리스트</span>
                  <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full uppercase">
                    High Volatility & Alpha
                  </span>
                </h2>
              </div>
              <p className="text-xs text-zinc-400 font-medium">
                실시간 24시간 변동성 및 양호한 AI 퀀트 차트 패턴(볼린저 스퀴즈, W-이중바닥, 깃발형 돌파)을 정밀 필터링합니다.
              </p>
            </div>
          </div>
        </div>

        {/* SCAN STATUS & MANUAL REFRESH */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] font-mono text-emerald-400 flex items-center justify-end gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>실시간 스캔 완료 ({(scannedTotal ?? 0).toLocaleString()}개 종목 감시)</span>
            </div>
            <p className="text-[10px] text-zinc-500 font-mono">
              마지막 스캔: {lastScanTime || "방금 전"}
            </p>
          </div>

          <button
            onClick={fetchHotList}
            disabled={isLoading}
            className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer disabled:opacity-50"
            title="AI 핫 리스트 재스캔"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-amber-400 ${isLoading ? "animate-spin" : ""}`} />
            <span>{isLoading ? "스캔 중..." : "AI 재스캔"}</span>
          </button>
        </div>
      </div>

      {/* PRIMARY MARKET TAB BAR (전체 / 국내 / 해외 / 업비트) */}
      <div className="space-y-1">
        <div className="flex bg-zinc-950 p-1.5 rounded-xl border border-zinc-800/80 gap-1.5 shadow-inner">
          {[
            { id: "ALL", label: "전체", icon: "✨", count: (marketCounts?.KOREA || 0) + (marketCounts?.US || 0) + (marketCounts?.UPBIT || 0) },
            { id: "KOREA", label: "국내", icon: "🇰🇷", count: marketCounts?.KOREA },
            { id: "US", label: "해외", icon: "🌐", count: marketCounts?.US },
            { id: "BTC", label: "업비트", icon: "🪙", count: marketCounts?.UPBIT }
          ].map((tab) => {
            const isActive = marketFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setMarketFilter(tab.id as any)}
                className={`flex-1 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  isActive
                    ? "bg-amber-500 text-zinc-950 shadow-md font-black scale-[1.01]"
                    : "bg-zinc-900/60 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80"
                }`}
              >
                <span className="text-sm">{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold ${
                    isActive ? "bg-zinc-950/20 text-zinc-950" : "bg-zinc-800 text-amber-400 border border-amber-500/30"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* SECONDARY FILTER CONTROL TOOLBAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 bg-zinc-900/80 border border-zinc-800 p-2.5 rounded-xl text-xs">

        {/* US SUB-EXCHANGE SELECTOR (WHEN US OR ALL IS ACTIVE) OR PATTERN FILTER */}
        {(marketFilter === "US" || marketFilter === "ALL") ? (
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
              <Zap className="h-3 w-3 text-blue-400" />
              <span>미국 거래소 (US Exchange)</span>
            </label>
            <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 gap-1">
              {[
                { id: "ALL", label: "전체 해외" },
                { id: "NASDAQ", label: "NASDAQ" },
                { id: "NYSE", label: "NYSE" },
                { id: "AMEX", label: "AMEX" }
              ].map(ex => (
                <button
                  key={ex.id}
                  onClick={() => setExchangeFilter(ex.id as any)}
                  className={`flex-1 py-1 rounded text-[10px] font-bold transition cursor-pointer text-center ${
                    exchangeFilter === ex.id
                      ? "bg-blue-600 text-white shadow-xs font-black"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-cyan-400" />
              <span>AI 차트 패턴 (Pattern)</span>
            </label>
            <select
              value={patternFilter}
              onChange={(e) => setPatternFilter(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-1.5 text-xs text-zinc-200 font-semibold outline-none focus:border-amber-500"
            >
              <option value="ALL">✨ 전체 AI 차트 패턴</option>
              <option value="BOLLINGER_SQUEEZE">🚀 볼린저 스퀴즈 오버슈팅</option>
              <option value="W_BOTTOM">📈 W-이중바닥 수급돌파</option>
              <option value="BULL_FLAG">⚡ 깃발형 모멘텀 2차파동</option>
              <option value="VOLUME_SURGE">🔥 24시간 거래량 폭발</option>
              <option value="CUP_AND_HANDLE">🏆 컵앤핸들 대시세 수렴</option>
              <option value="RSI_OVERSOLD">🛡️ 과매도 반등 지름길</option>
            </select>
          </div>
        )}

        {/* MIN PLANNING OBJECTIVE SELECTOR */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-emerald-400" />
            <span>최소 계획 목표폭 (Min Target)</span>
          </label>
          <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 gap-1">
            {[
              { val: 0, label: "전체" },
              { val: 2, label: "+2%+" },
              { val: 4, label: "+4%+" },
              { val: 6, label: "+6%+" }
            ].map(y => (
              <button
                key={y.val}
                onClick={() => setMinYieldFilter(y.val)}
                className={`flex-1 py-1 rounded text-[11px] font-bold transition cursor-pointer text-center ${
                  minYieldFilter === y.val
                    ? "bg-emerald-500 text-zinc-950 shadow-xs font-black"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {y.label}
              </button>
            ))}
          </div>
        </div>

        {/* SEARCH INPUT */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
            <Search className="h-3 w-3 text-slate-400" />
            <span>종목 검색</span>
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="종목명 또는 티커 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-1.5 pl-8 pr-3 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-500 font-medium"
            />
            <Search className="h-3.5 w-3.5 text-zinc-500 absolute left-2.5 top-2" />
          </div>
        </div>

      </div>

      {/* HOT ITEMS GRID */}
      {filteredItems.length === 0 ? (
        <div className="bg-zinc-950/60 border border-dashed border-zinc-800 rounded-xl p-8 text-center space-y-2">
          <Flame className="h-8 w-8 text-zinc-600 mx-auto" />
          <p className="text-sm font-bold text-zinc-300">선택한 필터 조건에 부합하는 HOT 종목이 없습니다.</p>
          <p className="text-xs text-zinc-500">필터 기준을 완화하거나 'AI 재스캔' 버튼을 클릭해 보세요.</p>
        </div>
      ) : (
        <div className={`grid grid-cols-1 ${compactView ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3"} gap-3.5`}>
          {filteredItems.map((item, idx) => {
            const isCrypto = item.market === "BTC";
            const isKorea = item.market === "KOREA";
            const priceSymbol = isKorea ? "₩" : isCrypto ? "₩" : "$";
            const formattedPrice = isKorea || isCrypto
              ? (item.currentPrice ?? 0).toLocaleString()
              : item.currentPrice.toFixed(2);

            const isPositive = item.priceChange24hPct >= 0;

            return (
              <div 
                key={`${item.symbol}_${idx}`}
                className="bg-zinc-900/90 hover:bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 rounded-xl p-4 transition duration-200 flex flex-col justify-between space-y-3 shadow-md relative group"
              >
                {/* TOP RANK & BADGES */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black font-mono bg-gradient-to-r from-amber-500 to-rose-500 text-zinc-950 px-2 py-0.5 rounded-md shadow-xs">
                        #{idx + 1} AI HOT
                      </span>
                      {item.grade && (
                        <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded border shadow-xs ${
                          item.grade === "S" ? "bg-amber-500 text-zinc-950 border-amber-400 font-black animate-pulse" :
                          item.grade === "A" ? "bg-emerald-500 text-zinc-950 border-emerald-400 font-black" :
                          item.grade === "B" ? "bg-blue-500 text-white border-blue-400" :
                          "bg-zinc-800 text-zinc-300 border-zinc-700"
                        }`}>
                          {item.grade} GRADE
                        </span>
                      )}
                      <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded border ${
                        isKorea ? "bg-emerald-950 text-emerald-300 border-emerald-800" :
                        isCrypto ? "bg-amber-950 text-amber-300 border-amber-800" :
                        "bg-blue-950 text-blue-300 border-blue-800"
                      }`}>
                        {item.market}
                      </span>
                      {item.exchange && (
                        <span className="text-[9px] font-black font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-blue-300 border border-blue-800/60">
                          {item.exchange}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-amber-300 bg-amber-950/80 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-amber-400" />
                        <span>AI Match {item.aiMatchScore}%</span>
                      </span>
                    </div>
                  </div>

                  {/* ITEM NAME & SYMBOL */}
                  <div 
                    onClick={() => openStockChart({
                      symbol: item.symbol,
                      name: item.name,
                      market: item.market,
                      currentPrice: item.currentPrice,
                      changeRate: item.priceChange24hPct
                    })}
                    className="flex items-baseline justify-between gap-2 border-b border-zinc-800/80 pb-2 cursor-pointer group-hover:bg-zinc-800/40 p-1 rounded transition"
                  >
                    <div>
                      <h3 className="text-sm font-black text-white group-hover:text-amber-300 transition flex items-center gap-1">
                        <span>{item.name}</span>
                        <Sparkles className="h-3 w-3 text-cyan-400 opacity-0 group-hover:opacity-100 transition" />
                      </h3>
                      <p className="text-[11px] font-mono text-zinc-400 font-bold">{item.symbol}</p>
                    </div>

                    {/* PRICE & 24H CHANGE */}
                    <div className="text-right">
                      <div className="text-sm font-black font-mono text-white">
                        {priceSymbol}{formattedPrice}
                      </div>
                      <div className={`text-xs font-bold font-mono flex items-center justify-end gap-0.5 ${
                        isPositive ? "text-emerald-400" : "text-rose-400"
                      }`}>
                        {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                        <span>24h {isPositive ? "+" : ""}{item.priceChange24hPct}%</span>
                      </div>
                    </div>
                  </div>

                  {/* PATTERN BADGE & EXPECTED YIELD */}
                  <div className="mt-2.5 p-2 bg-gradient-to-r from-zinc-950 via-amber-950/30 to-zinc-950 border border-amber-500/20 rounded-lg space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[11px] font-black text-amber-300 flex items-center gap-1">
                        <Flame className="h-3.5 w-3.5 text-amber-400" />
                        <span>{item.patternName}</span>
                      </span>
                      <span className="text-xs font-black text-emerald-400 font-mono bg-emerald-950 border border-emerald-500/40 px-2 py-0.5 rounded">
                        기대수익 +{item.expectedReturnPct}%
                      </span>
                    </div>

                    {/* KEY QUANT STATS */}
                    <div className="grid grid-cols-3 gap-1 text-[10px] font-mono text-zinc-300 pt-1 border-t border-zinc-800/60">
                      <div>
                        <span className="text-zinc-500 block">목표가</span>
                        <strong className="text-emerald-300">{priceSymbol}{(item.targetPrice ?? 0).toLocaleString()}</strong>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">손절가</span>
                        <strong className="text-rose-400">{priceSymbol}{(item.stopLoss ?? 0).toLocaleString()}</strong>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">손익비</span>
                        <strong className="text-amber-300">{item.riskRewardRatio}</strong>
                      </div>
                    </div>
                  </div>

                  {/* AI REASONING COMMENTARY */}
                  <p className="text-[11px] text-zinc-300/90 font-medium leading-relaxed mt-2 bg-zinc-950/80 p-2 rounded-lg border border-zinc-800">
                    💡 <strong className="text-zinc-200 font-semibold">{item.reasoning}</strong>
                  </p>
                </div>

                {/* ACTION BUTTONS */}
                <div className="pt-2 border-t border-zinc-800/80 space-y-1.5">
                  <div className="grid grid-cols-2 gap-1.5">
                    
                    {/* QUICK BUY MODAL TRIGGER */}
                    <button
                      onClick={() => handleOpenQuickOrder(item)}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2 rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                    >
                      <Zap className="h-3.5 w-3.5 fill-emerald-200" />
                      <span>⚡ 실시간 주문</span>
                    </button>

                    {/* JARVIS ONE-CLICK AUTO EXECUTE */}
                    <button
                      onClick={() => handleAutoTradeExecute(item)}
                      className="w-full bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-black py-2 rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                      title="자비스 AI 즉시 자율 매수 집행"
                    >
                      <Bot className="h-3.5 w-3.5" />
                      <span>🤖 자비스 매수</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-1 text-[11px]">
                    <button
                      onClick={() => handleToggleWatchlist(item)}
                      className={`flex-1 py-1 px-2 rounded border text-center font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
                        isInWatchlist(item.symbol)
                          ? "bg-amber-950/80 text-amber-300 border-amber-500/50"
                          : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
                      }`}
                    >
                      <Star className={`h-3 w-3 ${isInWatchlist(item.symbol) ? "fill-amber-400 text-amber-400" : ""}`} />
                      <span>{isInWatchlist(item.symbol) ? "관심 등록됨" : "+ 관심종목"}</span>
                    </button>

                    <button
                      onClick={() => handlePredictNavigate(item.symbol)}
                      className="flex-1 py-1 px-2 bg-zinc-800 hover:bg-zinc-700 text-cyan-300 border border-zinc-700 rounded text-center font-bold transition cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>🔮 AI 정밀분석</span>
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* QUICK ORDER MODAL */}
      {quickOrderModalOpen && selectedHotItem && (
        <QuickOrderModal
          isOpen={quickOrderModalOpen}
          onClose={() => {
            setQuickOrderModalOpen(false);
            setSelectedHotItem(null);
          }}
          initialSymbol={selectedHotItem.symbol}
          initialName={selectedHotItem.name}
          initialPrice={selectedHotItem.currentPrice}
          initialMarket={selectedHotItem.market}
          initialSide="BUY"
        />
      )}

    </div>
  );
};
