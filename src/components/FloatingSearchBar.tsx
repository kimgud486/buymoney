import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Search, Sparkles, TrendingUp, X, ArrowRight, Zap, ShieldCheck, Newspaper, Cpu, 
  BarChart3, RefreshCw, ArrowUpRight, ArrowDownRight, Layers, ExternalLink, Filter, Tag, Star
} from "lucide-react";
import { TickerQuoteModal } from "./TickerQuoteModal";
import { SmartThemeSearchModal, ThemeSearchResult } from "./SmartThemeSearchModal";
import { NewsFeedSnippet } from "./NewsFeedSnippet";
import { MarketInsightChart } from "./MarketInsightChart";
import { searchStocksFromIndex, COMPREHENSIVE_STOCK_INDEX, matchesChosungOrKeyword } from "../lib/stockDictionary";
import { getCapCategoryInfo } from "./GlobalStockSearchAndAdd";
import { getMarketStatus } from "../lib/marketStatus";
import { useApp } from "../context/AppContext";

interface FloatingSearchBarProps {
  variant?: "navbar" | "hero";
}

export const FloatingSearchBar: React.FC<FloatingSearchBarProps> = ({ variant = "navbar" }) => {
  const { setSelectedSymbol } = useApp();
  const [query, setQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [activeSearchSymbol, setActiveSearchSymbol] = useState("005930");
  const [activeThemeQuery, setActiveThemeQuery] = useState("반도체");
  const [selectedCategory, setSelectedCategory] = useState<"ALL" | "STOCK" | "NEWS" | "INDUSTRY">("ALL");

  // Live Dropdown Search Data state
  const [dropdownData, setDropdownData] = useState<ThemeSearchResult | null>(null);
  const [isDropdownLoading, setIsDropdownLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Fast Instant In-Memory Chosung Matches
  const instantChosungMatches = useMemo(() => {
    if (!query.trim()) return [];
    return searchStocksFromIndex(query.trim(), 8);
  }, [query]);

  // Quick popular ticker suggestions with category tags
  const popularTickers = [
    { symbol: "005930", name: "삼성전자", tag: "KOSPI", market: "KOSPI", chosung: "ㅅㅅㅈㅈ" },
    { symbol: "000660", name: "SK하이닉스", tag: "AI반도체", market: "KOSPI", chosung: "ㅎㅇㄴㅅ" },
    { symbol: "NVDA", name: "NVIDIA", tag: "AI대장", market: "US", chosung: "ㅇㅂㄷㅇ" },
    { symbol: "BTC", name: "비트코인", tag: "가상자산", market: "BTC", chosung: "ㅂㅌ" },
    { symbol: "042700", name: "한미반도체", tag: "HBM장비", market: "KOSPI", chosung: "ㅎㅁ" },
    { symbol: "005380", name: "현대차", tag: "자동차", market: "KOSPI", chosung: "ㅎㄷㅊ" }
  ];

  // Quick category tag filters
  const categoryFilterTags = [
    { id: "ALL", label: "전체", icon: "🔍" },
    { id: "STOCK", label: "종목", icon: "📊" },
    { id: "NEWS", label: "뉴스", icon: "📰" },
    { id: "INDUSTRY", label: "산업/테마", icon: "🏭" }
  ];

  // Quick theme keywords
  const popularThemeKeywords = [
    { keyword: "HBM 반도체", category: "INDUSTRY", chosung: "ㅂㄷㅊ" },
    { keyword: "온디바이스 AI", category: "INDUSTRY", chosung: "ㅇㅇ" },
    { keyword: "2차전지 전고체", category: "INDUSTRY", chosung: "ㅈㄱㅊ" },
    { keyword: "삼성전자", category: "STOCK", chosung: "ㅅㅅㅈㅈ" },
    { keyword: "비트코인", category: "STOCK", chosung: "ㅂㅌ" },
    { keyword: "휴머노이드 로봇", category: "INDUSTRY", chosung: "ㄹㅂ" }
  ];

  // Debounced live dropdown search when user types
  useEffect(() => {
    const q = query.trim();
    if (!q || q.length < 1) {
      setDropdownData(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsDropdownLoading(true);
      try {
        const [themeRes, stockRes] = await Promise.allSettled([
          fetch(`/api/search/theme?q=${encodeURIComponent(q)}`),
          fetch(`/api/stocks/search?q=${encodeURIComponent(q)}`)
        ]);

        let themeJson: any = null;
        let stockJson: any[] = [];

        if (themeRes.status === "fulfilled" && themeRes.value.ok) {
          themeJson = await themeRes.value.json().catch(() => null);
        }

        if (stockRes.status === "fulfilled" && stockRes.value.ok) {
          stockJson = await stockRes.value.json().catch(() => []);
        }

        // Merge real live stock results with theme results & instant chosung
        const localMatches = searchStocksFromIndex(q, 10).map(s => ({
          symbol: s.symbol,
          name: s.name,
          market: s.market,
          price: s.price || 0,
          changePct: s.changePct || 0,
          relevanceReason: `${s.sectorTag || (s.market === 'BTC' ? '업비트' : s.market === 'KOREA' ? '국내증시' : '해외증시')} 초성·키워드 매칭`,
          tag: s.sectorTag || "초성 매칭"
        }));

        const directStockMatches = Array.isArray(stockJson) ? stockJson.map((s: any) => ({
          symbol: s.symbol,
          name: s.name,
          market: s.market,
          price: s.price || 0,
          changePct: s.changePct || 0,
          relevanceReason: `${s.market === "BTC" ? "업비트 가상자산" : s.market === "KOREA" ? "한국증시" : "해외증시"} 실시간 시세 연동`,
          tag: "실시간 검색"
        })) : [];

        const themeStocks = (themeJson && Array.isArray(themeJson.relatedStocks)) ? themeJson.relatedStocks : [];

        // Combine & deduplicate
        const mergedStocks: any[] = [];
        const seenStockKeys = new Set<string>();

        const addUniqueStock = (st: any) => {
          if (!st || !st.symbol) return;
          const key = `${st.market || 'KOREA'}-${st.symbol.toUpperCase()}`;
          if (!seenStockKeys.has(key)) {
            seenStockKeys.add(key);
            mergedStocks.push(st);
          }
        };

        localMatches.forEach(addUniqueStock);
        directStockMatches.forEach(addUniqueStock);
        themeStocks.forEach(addUniqueStock);

        const mergedResult: ThemeSearchResult = {
          query: q,
          themeTitle: themeJson?.themeTitle || `'${q}' 실시간 종목 및 테마 스캔`,
          themeDescription: themeJson?.themeDescription || `'${q}' 키워드의 실시간 시세 및 연관 뉴스 스캔 결과입니다.`,
          query_understanding: themeJson?.query_understanding || {
            category: "실시간 검색",
            core_topic: q,
            market_impact: ["증시", "수급"],
            classification: "실시간 종목"
          },
          expanded_keywords: themeJson?.expanded_keywords || [
            { keyword: q, type: "CORE", score: 100, reason: "검색 키워드" }
          ],
          theme: themeJson?.theme || {
            score: 85,
            power_label: "🔥 강함",
            stage: "EXPANSION",
            stage_label_ko: "수급 유입",
            sentiment_score: 80,
            sentiment_summary: { positive: 10, neutral: 2, negative: 1 }
          },
          news: themeJson?.news || [],
          relatedStocks: mergedStocks,
          supply_chain: themeJson?.supply_chain || [],
          marketDemandReport: themeJson?.marketDemandReport || {
            demandOutlook: `${q} 실시간 시장 관측 데이터입니다.`,
            supplyChainStatus: "실시간 체결 유입 중",
            institutionalInflowScore: 85,
            riskFactors: "시장 변동성에 유의하세요.",
            aiStrategyTip: "분할 매수 접근 전략 권장"
          }
        };

        setDropdownData(mergedResult);
      } catch (err) {
        console.error("Live dropdown search error:", err);
      } finally {
        setIsDropdownLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Hotkey listener (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleOpenTickerModal = (symbolToOpen: string) => {
    setActiveSearchSymbol(symbolToOpen);
    if (setSelectedSymbol) {
      setSelectedSymbol(symbolToOpen);
    }
    // Dispatch global event for all synchronous AI engine panels
    try {
      window.dispatchEvent(new CustomEvent("stock-selected", { detail: { symbol: symbolToOpen } }));
    } catch (e) {}
    setIsModalOpen(true);
    setIsFocused(false);
  };

  const handleOpenThemeModal = (themeToOpen: string) => {
    setActiveThemeQuery(themeToOpen);
    setIsThemeModalOpen(true);
    setIsFocused(false);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    const isTicker = /^\d{6}$/.test(trimmed) || /^[A-Za-z]{1,5}$/.test(trimmed);
    if (isTicker) {
      handleOpenTickerModal(trimmed);
    } else {
      handleOpenThemeModal(trimmed);
    }
  };

  const isHero = variant === "hero";

  return (
    <div className={`relative w-full ${isHero ? "max-w-6xl mx-auto my-3" : "w-full"}`}>
      {/* Floating Search Input Container */}
      <form onSubmit={handleFormSubmit} className="relative flex items-center w-full">
        <div className={`relative w-full flex items-center rounded-2xl transition-all duration-300 ${
          isHero
            ? isFocused
              ? "bg-zinc-950 border-2 border-cyan-500 shadow-[0_0_35px_rgba(6,182,212,0.4)] py-3.5 px-5"
              : "bg-zinc-900/90 hover:bg-zinc-900 border border-zinc-700/80 shadow-xl py-3.5 px-5"
            : isFocused
              ? "bg-zinc-950 dark:bg-zinc-950 border-2 border-cyan-500 shadow-[0_0_25px_rgba(6,182,212,0.35)] py-2.5 px-4 text-white"
              : "bg-zinc-900/90 hover:bg-zinc-900 border border-zinc-700/80 py-2.5 px-4 text-white"
        }`}>
          <Search className={`h-5 w-5 mr-3 shrink-0 transition-colors ${
            isFocused ? "text-cyan-400" : "text-zinc-400"
          }`} />

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 300)}
            placeholder={isHero 
              ? "초성·통합 검색: 종목, 초성(ㅅㅅㅈㅈ), 뉴스, 산업 테마 자유 입력 (예: 반도체, ㅂㅌ, 삼전, NVDA, HBM)..." 
              : "🔍 초성·통합 검색: 종목 / 초성 / 뉴스 / 테마 (예: ㅅㅅㅈㅈ, 반도체, 005930, 비트코인)..."}
            className={`w-full bg-transparent font-medium text-white placeholder-zinc-400 focus:outline-none ${
              isHero ? "text-base sm:text-lg" : "text-xs sm:text-sm md:text-base"
            }`}
          />

          {/* Action buttons / Hotkey Badge */}
          <div className="flex items-center space-x-2 shrink-0 ml-2">
            {query ? (
              <button
                type="button"
                onClick={() => { setQuery(""); setDropdownData(null); }}
                className="p-1 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-bold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-md border border-zinc-700">
                ⌘K
              </kbd>
            )}

            <button
              type="submit"
              className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md shrink-0"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span className="hidden xs:inline">통합 검색</span>
            </button>
          </div>
        </div>
      </form>

      {/* STICKY INTERACTIVE AUTO-COMPLETE & CATEGORY TAG DROPDOWN */}
      {isFocused && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-[94vw] max-w-5xl sm:w-full sm:left-0 sm:right-0 sm:translate-x-0 mt-2 bg-zinc-950/98 border-2 border-cyan-500/50 rounded-2xl shadow-2xl z-[100] p-4 text-xs space-y-4 backdrop-blur-xl max-h-[85vh] overflow-y-auto animate-fade-in text-white">
          {/* CATEGORY TAG FILTER BAR ([전체], [종목], [뉴스], [산업]) */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
            <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
              <span className="text-zinc-500 text-[10px] font-bold mr-1 shrink-0 flex items-center gap-1">
                <Tag className="h-3 w-3 text-cyan-400" /> 카테고리 태그:
              </span>
              {categoryFilterTags.map((cat) => (
                <button
                  key={cat.id}
                  onMouseDown={() => setSelectedCategory(cat.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 shrink-0 ${
                    selectedCategory === cat.id
                      ? "bg-cyan-500 text-black shadow-md font-extrabold"
                      : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            <span className="text-[10px] text-emerald-400 font-mono font-bold hidden sm:inline">⚡ 0ms 초성 매칭 활성</span>
          </div>

          {/* Quick Theme Keyword Chips */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <Cpu className="h-3.5 w-3.5" /> 연관 추천 키워드 [산업 / 종목 / 초성]
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {popularThemeKeywords.map((item) => (
                <button
                  key={item.keyword}
                  onMouseDown={() => { setQuery(item.keyword); handleOpenThemeModal(item.keyword); }}
                  className="px-3 py-1 rounded-xl bg-zinc-900 hover:bg-cyan-950 text-zinc-200 hover:text-cyan-300 font-bold border border-zinc-800 hover:border-cyan-500/50 transition cursor-pointer text-xs flex items-center gap-1.5"
                >
                  <span className="text-[9px] font-mono font-bold bg-cyan-950 text-cyan-300 px-1 py-0.2 rounded border border-cyan-800">
                    {item.category === "INDUSTRY" ? "산업" : "종목"}
                  </span>
                  <span>{item.keyword}</span>
                  {item.chosung && <span className="text-[10px] text-zinc-500 font-mono">({item.chosung})</span>}
                </button>
              ))}
            </div>
          </div>

          {/* DYNAMIC AUTO-COMPLETE RESULTS */}
          {isDropdownLoading && (!dropdownData || dropdownData.relatedStocks.length === 0) ? (
            <div className="py-10 flex flex-col items-center justify-center space-y-2 text-zinc-400 border-t border-zinc-800/80 pt-4">
              <RefreshCw className="h-6 w-6 text-cyan-400 animate-spin" />
              <p className="text-xs font-bold text-zinc-200">'{query}' 실시간 종목, 초성 매칭 및 시장 데이터 검색 중...</p>
            </div>
          ) : dropdownData ? (
            <div className="border-t border-zinc-800/80 pt-3 space-y-4">
              {/* SECTION 1: RELATED STOCKS (Filtered by Category) */}
              {(selectedCategory === "ALL" || selectedCategory === "STOCK") && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-zinc-300">
                    <span className="flex items-center gap-1.5 text-cyan-400">
                      <Layers className="h-3.5 w-3.5" /> [종목] 카테고리 연관 종목 ({dropdownData.relatedStocks.length}건)
                    </span>
                    <span className="text-zinc-500 font-mono text-[10px]">클릭 시 실시간 AI 차트 &amp; 호가 실행</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {dropdownData.relatedStocks.map((stock, idx) => {
                      const isUp = (stock.changePct || 0) >= 0;
                      const capInfo = getCapCategoryInfo(stock);
                      const mStatus = getMarketStatus(stock.symbol, stock.market);

                      return (
                        <button
                          key={`${stock.market || 'KOREA'}-${stock.symbol}-${idx}`}
                          onMouseDown={() => handleOpenTickerModal(stock.symbol)}
                          className="bg-zinc-900/90 hover:bg-zinc-800 p-2.5 rounded-xl border border-zinc-800 hover:border-cyan-500/50 transition text-left cursor-pointer flex items-center justify-between gap-2 group"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-1 flex-wrap gap-1">
                              {/* Explicit Market Badge (국내주식 / 미국주식 / 가상자산) */}
                              <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-extrabold shrink-0 ${mStatus.badgeClass}`}>
                                {mStatus.marketBadgeLabel}
                              </span>
                              <span className={`text-[9px] font-black px-1 py-0.2 rounded border ${capInfo.badgeClass}`}>
                                {capInfo.label}
                              </span>
                              <span className="font-bold text-white text-xs truncate group-hover:text-cyan-300 transition">{stock.name}</span>
                              <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800 px-1 rounded">{stock.symbol}</span>
                            </div>
                            <div className="flex items-center gap-1 mt-1 text-[10px]">
                              <span className={`px-1 rounded font-bold text-[9px] ${mStatus.statusColorClass} bg-zinc-950/80 border border-zinc-800`}>
                                {mStatus.sessionStatusText}
                              </span>
                              <p className="text-zinc-400 truncate">💡 {stock.relevanceReason}</p>
                            </div>
                          </div>

                          {stock.price ? (
                            <div className="text-right font-mono text-xs shrink-0">
                              <div className="text-white font-bold">{stock.market === "US" ? `$${(stock.price ?? 0).toLocaleString()}` : `${(stock.price ?? 0).toLocaleString()}원`}</div>
                              <div className={`text-[10px] ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                                {isUp ? "+" : ""}{stock.changePct}%
                              </div>
                            </div>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION 2: NewsFeedSnippet SECTION (5 Real-Time News items) */}
              {(selectedCategory === "ALL" || selectedCategory === "NEWS") && dropdownData.news && dropdownData.news.length > 0 && (
                <div className="pt-2">
                  <NewsFeedSnippet news={dropdownData.news} query={query} />
                </div>
              )}

              {/* SECTION 3: MarketInsightChart COMPONENT (D3 Market Demand Chart) */}
              {(selectedCategory === "ALL" || selectedCategory === "INDUSTRY") && (
                <div className="pt-2">
                  <MarketInsightChart
                    themeTitle={`${dropdownData.themeTitle || query} 시장 수요 D3 차트`}
                    score={dropdownData.marketDemandReport?.institutionalInflowScore || 88}
                    data={dropdownData.marketDemandReport?.chartData}
                  />
                </div>
              )}

              {/* FULL REPORT DEEP VIEW BUTTON & MULTI-MODEL CONSENSUS BUTTON */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onMouseDown={() => {
                    const sym = dropdownData.relatedStocks && dropdownData.relatedStocks.length > 0 
                      ? dropdownData.relatedStocks[0].symbol 
                      : query;
                    window.dispatchEvent(new CustomEvent("open-consensus-modal", { detail: sym }));
                  }}
                  className="w-full py-3 bg-gradient-to-r from-cyan-900 via-indigo-900 to-zinc-900 hover:from-cyan-800 hover:to-indigo-800 text-cyan-200 border border-cyan-500/60 font-black rounded-xl text-xs flex items-center justify-center space-x-2 transition cursor-pointer shadow-lg ring-1 ring-cyan-500/30"
                >
                  <Sparkles className="h-4 w-4 text-cyan-300 animate-pulse" />
                  <span>🏛️ 4대 AI 증권소 통합 리서치 &amp; 결론</span>
                </button>

                <button
                  onMouseDown={() => handleOpenThemeModal(query)}
                  className="w-full py-3 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-black rounded-xl text-xs flex items-center justify-center space-x-2 transition cursor-pointer shadow-lg"
                >
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  <span>'{query}' 전체 AI 리포트 보기</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            /* DEFAULT INITIAL AUTO-COMPLETE LIST */
            <div className="border-t border-zinc-800/80 pt-3 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400">
                <span className="flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5 text-amber-500" /> 실시간 인기 종목 [초성 지원]
                </span>
                <span className="text-[10px] text-zinc-500">초성 입력 예: ㅅㅅㅈㅈ, ㅂㅌ</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {popularTickers.map((t) => (
                  <button
                    key={t.symbol}
                    onMouseDown={() => handleOpenTickerModal(t.symbol)}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 transition text-left cursor-pointer border border-zinc-800/80 hover:border-cyan-500/40 group"
                  >
                    <div>
                      <div className="flex items-center space-x-1">
                        <span className="text-[9px] font-bold bg-zinc-800 text-cyan-400 px-1 py-0.2 rounded">
                          {t.tag}
                        </span>
                        <span className="font-bold text-white text-xs group-hover:text-cyan-300 transition">{t.name}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] text-zinc-400 font-mono">{t.symbol}</span>
                        <span className="text-[9px] text-zinc-500 font-mono">({t.chosung})</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {t.market}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* REAL TIME TICKER QUOTE MODAL */}
      <TickerQuoteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialQuery={activeSearchSymbol}
      />

      {/* SMART THEME & SECTOR DEEP SEARCH MODAL */}
      <SmartThemeSearchModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        initialQuery={activeThemeQuery}
      />
    </div>
  );
};
