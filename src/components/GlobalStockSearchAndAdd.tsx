import React, { useState, useEffect, useRef } from "react";
import { 
  Search, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Check, 
  CheckCircle2, 
  X,
  Flame,
  RefreshCw,
  Building2,
  ExternalLink,
  ShieldCheck,
  Coins,
  BarChart2,
  Cpu,
  Star,
  Layers,
  ArrowUpRight
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { stockSyncService } from "../services/stockSyncService";
import { realtimeMarketFeedService } from "../services/realtimeMarketFeedService";
import { 
  matchesChosungOrKeyword, 
  COMPREHENSIVE_STOCK_INDEX, 
  SearchableStockItem 
} from "../lib/stockDictionary";
import { KRX_AND_GLOBAL_MASTER_UNIVERSE } from "../data/krxMasterUniverse";
import { getMarketStatus } from "../lib/marketStatus";


export interface SearchStockResult {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  price: number;
  changePct: number;
  upbitMarketCode?: string;
  categoryTag?: string;
  aliases?: string[];
  themeTags?: string[];
}

export function getCapCategoryInfo(stock: { symbol: string; market: string; name?: string }): {
  code: "LARGE" | "MID" | "SMALL" | "CRYPTO";
  label: "대형주" | "중형주" | "소형주" | "가상자산";
  badgeClass: string;
} {
  if (stock.market === "BTC") {
    return {
      code: "CRYPTO",
      label: "가상자산",
      badgeClass: "bg-amber-950/90 text-amber-300 border-amber-700/80"
    };
  }

  const largeCapSymbols = new Set([
    "005930", "000660", "005380", "000270", "035420", "035720", "068270", "373220", "105560", "012450", "009540", "267260", "003230", "003550",
    "NVDA", "TSLA", "AAPL", "MSFT", "AMZN", "GOOGL", "GOOG", "META", "QQQ", "SOXL", "SPY"
  ]);

  const midCapSymbols = new Set([
    "042700", "196170", "247540", "086520", "450080", "034020", "277810", "028300", "080220", "001440",
    "PLTR", "COIN", "MSTR", "AMD", "INTC", "AVGO", "QCOM", "ARM", "MU", "SMCI", "TQQQ"
  ]);

  const sym = stock.symbol.toUpperCase();
  if (largeCapSymbols.has(sym)) {
    return {
      code: "LARGE",
      label: "대형주",
      badgeClass: "bg-blue-950/90 text-blue-300 border-blue-700/80"
    };
  }
  if (midCapSymbols.has(sym)) {
    return {
      code: "MID",
      label: "중형주",
      badgeClass: "bg-indigo-950/90 text-indigo-300 border-indigo-700/80"
    };
  }

  return {
    code: "SMALL",
    label: "소형주",
    badgeClass: "bg-rose-950/90 text-rose-300 border-rose-700/80"
  };
}

export const GlobalStockSearchAndAdd: React.FC = () => {
  const { 
    addToWatchlist, 
    removeFromWatchlist, 
    isInWatchlist, 
    setSelectedSymbol, 
    addToast, 
    openStockChart,
    executeTrade,
    profile
  } = useApp();

  const [query, setQuery] = useState("");
  const [selectedMarketTab, setSelectedMarketTab] = useState<"ALL" | "KOREA" | "US" | "BTC">("ALL");
  const [selectedCapTab, setSelectedCapTab] = useState<"ALL" | "LARGE" | "MID" | "SMALL" | "CRYPTO">("ALL");
  
  // Market Checkboxes state
  const [showKorea, setShowKorea] = useState(true);
  const [showUS, setShowUS] = useState(true);
  const [showCrypto, setShowCrypto] = useState(true);

  const [isOpen, setIsOpen] = useState(false);
  const [upbitList, setUpbitList] = useState<SearchStockResult[]>([]);
  const [livePrices, setLivePrices] = useState<Record<string, { price: number; changePct: number }>>({});
  const [isSearchingApi, setIsSearchingApi] = useState(false);
  const [aiSearchResults, setAiSearchResults] = useState<SearchStockResult[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 1. Fetch entire Upbit KRW markets list on mount for instant complete search
  useEffect(() => {
    const fetchUpbitMarkets = async () => {
      try {
        const res = await fetch("/api/upbit/public/markets");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const coins: SearchStockResult[] = data
              .filter((m: any) => m.market && m.market.startsWith("KRW-"))
              .map((m: any) => ({
                symbol: m.market.replace("KRW-", ""),
                name: m.korean_name || m.english_name || m.market,
                market: "BTC",
                price: 1000,
                changePct: 0,
                upbitMarketCode: m.market,
                categoryTag: "업비트 가상자산",
                aliases: [m.english_name, m.korean_name]
              }));
            setUpbitList(coins);
          }
        }
      } catch (err) {
        console.warn("Upbit market list loading:", err);
      }
    };
    fetchUpbitMarkets();
  }, []);

  // 2. Real-time Live Price Stream Subscription & Ticker Updates
  useEffect(() => {
    realtimeMarketFeedService.start();

    const unsubscribeFeed = realtimeMarketFeedService.subscribe((quotes) => {
      const priceMap: Record<string, { price: number; changePct: number }> = {};
      quotes.forEach((q, sym) => {
        priceMap[sym] = {
          price: q.price,
          changePct: q.changeRate
        };
      });
      setLivePrices(prev => ({ ...prev, ...priceMap }));
    });

    const streamLivePrices = async () => {
      try {
        const topCoins = ["KRW-BTC", "KRW-ETH", "KRW-XRP", "KRW-SOL", "KRW-DOGE", "KRW-XLM", "KRW-SEI", "KRW-SUI"];
        const res = await fetch(`/api/upbit/public/ticker?markets=${topCoins.join(",")}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const priceMap: Record<string, { price: number; changePct: number }> = {};
            data.forEach((t: any) => {
              if (t.market) {
                const sym = t.market.replace("KRW-", "");
                priceMap[sym] = {
                  price: t.trade_price || 0,
                  changePct: t.signed_change_rate ? Number((t.signed_change_rate * 100).toFixed(2)) : 0
                };
              }
            });
            setLivePrices(prev => ({ ...prev, ...priceMap }));
          }
        }
      } catch (e) {
        // quiet ticker update
      }
    };

    streamLivePrices();
    const interval = setInterval(streamLivePrices, 3000);
    return () => {
      unsubscribeFeed();
      clearInterval(interval);
    };
  }, []);

  // 3. Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 4. Perform dynamic live API search when user types a query
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 1) {
      setAiSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingApi(true);
      try {
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const mapped: SearchStockResult[] = data.map((s: any) => ({
              symbol: s.symbol,
              name: s.name,
              market: s.market === "US" ? "US" : s.market === "BTC" || s.market === "UPBIT" ? "BTC" : "KOREA",
              price: s.price || 0,
              changePct: s.changePct || 0,
              upbitMarketCode: s.market === "BTC" ? `KRW-${s.symbol}` : undefined,
              categoryTag: s.market === "BTC" ? "업비트 실시간" : s.market === "KOREA" ? "한국증시 실시간" : "해외증시 실시간",
              themeTags: s.themeTags || []
            }));
            setAiSearchResults(mapped);
          } else {
            setAiSearchResults([]);
          }
        }
      } catch (err) {
        console.warn("Live Stock API Search Error:", err);
      } finally {
        setIsSearchingApi(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Combine comprehensive KRX master universe, index and dynamic list
  const baseList: SearchStockResult[] = [];
  const baseSeen = new Set<string>();

  // 1. First add all master universe items
  KRX_AND_GLOBAL_MASTER_UNIVERSE.forEach(item => {
    const marketKey: "KOREA" | "US" | "BTC" = 
      item.market === "US" ? "US" : item.market === "UPBIT" ? "BTC" : "KOREA";
    const key = `${marketKey}-${item.symbol.toUpperCase()}`;
    if (!baseSeen.has(key)) {
      baseSeen.add(key);
      const realQuote = realtimeMarketFeedService.getQuote(item.symbol);
      const dictMatch = COMPREHENSIVE_STOCK_INDEX.find(c => c.symbol === item.symbol);
      const fallbackP = realQuote?.price || dictMatch?.price || (marketKey === "BTC" ? 1500 : marketKey === "US" ? 150 : item.capCategory === "LARGE" ? 85000 : item.capCategory === "MID" ? 28000 : 8500);
      const fallbackPct = realQuote ? realQuote.changeRate : dictMatch ? dictMatch.changePct : 0.5;

      baseList.push({
        symbol: item.symbol,
        name: item.name,
        market: marketKey,
        price: fallbackP,
        changePct: fallbackPct,
        categoryTag: item.sector || (marketKey === "BTC" ? "업비트" : marketKey === "US" ? "미국증시" : "국내증시"),
        aliases: item.aliases,
        themeTags: item.themeTags,
        upbitMarketCode: marketKey === "BTC" ? `KRW-${item.symbol}` : undefined
      });
    }
  });

  // 2. Add COMPREHENSIVE_STOCK_INDEX items
  COMPREHENSIVE_STOCK_INDEX.forEach(c => {
    const key = `${c.market}-${c.symbol.toUpperCase()}`;
    if (!baseSeen.has(key)) {
      baseSeen.add(key);
      baseList.push({
        symbol: c.symbol,
        name: c.name,
        market: c.market,
        price: c.price,
        changePct: c.changePct,
        categoryTag: c.sectorTag,
        aliases: c.aliases,
        themeTags: c.themeTags,
        upbitMarketCode: c.market === "BTC" ? `KRW-${c.symbol}` : undefined
      });
    }
  });

  // 3. Add any dynamic Upbit items
  upbitList.forEach(u => {
    const key = `BTC-${u.symbol.toUpperCase()}`;
    if (!baseSeen.has(key)) {
      baseSeen.add(key);
      baseList.push(u);
    }
  });


  // Apply live ticker prices
  const enrichedList = baseList.map(item => {
    const live = livePrices[item.symbol];
    if (live) {
      return { ...item, price: live.price, changePct: live.changePct };
    }
    const realQuote = realtimeMarketFeedService.getQuote(item.symbol);
    if (realQuote) {
      return { ...item, price: realQuote.price, changePct: realQuote.changeRate };
    }
    return item;
  });

  // Search filter using high-speed Korean Chosung engine
  const rawList = query.trim().length >= 1 ? [...aiSearchResults, ...enrichedList] : enrichedList;

  // Deduplicate by symbol
  const seenSymbols = new Set<string>();
  const uniqueList: SearchStockResult[] = [];
  rawList.forEach(item => {
    const key = `${item.market}-${item.symbol.toUpperCase()}`;
    if (!seenSymbols.has(key)) {
      seenSymbols.add(key);
      uniqueList.push(item);
    }
  });

  const filteredList = uniqueList.filter(item => {
    // 1. Market Checkbox filtering
    let isCheckboxAllowed = false;
    if (item.market === "KOREA" && showKorea) isCheckboxAllowed = true;
    if (item.market === "US" && showUS) isCheckboxAllowed = true;
    if (item.market === "BTC" && showCrypto) isCheckboxAllowed = true;
    if (!isCheckboxAllowed) return false;

    const trimmedQuery = query.trim();

    // 2. Tab & Cap filtering (Only apply when search query is empty)
    if (!trimmedQuery) {
      if (selectedMarketTab === "KOREA" && item.market !== "KOREA") return false;
      if (selectedMarketTab === "US" && item.market !== "US") return false;
      if (selectedMarketTab === "BTC" && item.market !== "BTC") return false;

      const capInfo = getCapCategoryInfo(item);
      if (selectedCapTab !== "ALL" && capInfo.code !== selectedCapTab) return false;
      return true;
    }

    // When a search query is entered, search across ALL categories & tabs
    return matchesChosungOrKeyword(item.name, item.symbol, trimmedQuery, item.aliases);
  }).slice(0, 100);

  // Quick Open Live Chart
  const handleOpenChart = (stock: SearchStockResult, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedSymbol(stock.symbol);
    setIsOpen(false);

    openStockChart({
      symbol: stock.symbol,
      name: stock.name,
      market: stock.market,
      currentPrice: stock.price,
      changeRate: stock.changePct || 0
    });

    const brokerName = stock.market === "BTC" ? "업비트 (Upbit)" : stock.market === "KOREA" ? "한국투자증권 (KIS)" : "토스증권 (US)";
    addToast({
      type: "INFO",
      title: `📈 ${brokerName} 차트 연동`,
      message: `${stock.name}(${stock.symbol}) 실시간 호가 & 캔들 차트를 실행합니다.`
    });
  };

  // Quick AI Deep Analysis
  const handleOpenAiAnalysis = (stock: SearchStockResult, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedSymbol(stock.symbol);
    setIsOpen(false);

    // Trigger AI analysis custom event for instant view switch
    window.dispatchEvent(new CustomEvent("trigger-ai-analysis", {
      detail: { symbol: stock.symbol, name: stock.name, market: stock.market, price: stock.price }
    }));

    addToast({
      type: "SUCCESS",
      title: `🧠 AI 퀀트 심층 진단 시작`,
      message: `${stock.name}(${stock.symbol})의 10대 정밀 알고리즘 및 목표가/손익비 분석을 실행합니다.`
    });
  };

  // Quick Watchlist Toggle
  const handleToggleWatchlist = async (stock: SearchStockResult, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInWatchlist(stock.symbol)) {
      const item = profile?.watchlist?.find(w => w.symbol === stock.symbol);
      if (item) {
        await removeFromWatchlist(item.id);
        addToast({
          type: "INFO",
          title: "관심종목 해제",
          message: `${stock.name}이(가) 관심종목에서 제외되었습니다.`
        });
      }
    } else {
      await addToWatchlist({
        symbol: stock.symbol,
        name: stock.name,
        market: stock.market,
        targetBuyPrice: stock.price,
        memo: `${stock.market === "BTC" ? "업비트" : stock.market === "KOREA" ? "한국투자증권" : "토스증권"} 실시간 등록`
      });
      addToast({
        type: "SUCCESS",
        title: "⭐ 관심종목 등록 완료",
        message: `${stock.name}(${stock.symbol})이(가) 실시간 감시 레이더에 추가되었습니다.`
      });
    }
  };

  // Quick Order
  const handleQuickBuy = async (stock: SearchStockResult, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    const qty = stock.market === "BTC" ? 0.01 : stock.market === "US" ? 1 : 5;
    try {
      await executeTrade(
        stock.symbol,
        stock.name,
        stock.market,
        "BUY",
        qty,
        stock.price,
        "AI 검색창 초고속 매수",
        `[AI 통합검색 빠른주문] 실시간 호가 ${(stock.price ?? 0).toLocaleString()}원 즉시 체결 주문.`
      );
    } catch (err: any) {
      addToast({
        type: "ERROR",
        title: "주문 실패",
        message: err.message || "주문 실행 중 오류가 발생했습니다."
      });
    }
  };

  return (
    <div className="bg-zinc-900 border-b border-zinc-800 py-2.5 px-4 sticky top-0 z-40 shadow-xl">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Left Status Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-black shadow-xs">
            <Zap className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            <span>AI 초성·다중증시 실시간 검색</span>
          </div>
          <span className="text-xs font-bold text-zinc-300 hidden lg:inline">
            한국투자증권 · 토스증권 · 업비트 전종목 초성(ㅅㅅㅈㅈ, ㅂㅌ) &amp; AI 테마 지원
          </span>
        </div>

        {/* Search Input Bar */}
        <div className="relative flex-1 w-full max-w-2xl" ref={dropdownRef}>
          <div className="relative">
            <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="종목명/초성/티커/테마 입력 (예: 삼전, ㅅㅅㅈㅈ, 하이닉스, ㅂㅌ, 엔비, ㅌㅅㄹ, HBM, 전고체)..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              className="w-full bg-zinc-950 border border-zinc-700 hover:border-cyan-500 focus:border-cyan-400 text-white placeholder-zinc-500 rounded-xl pl-10 pr-20 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-cyan-400 transition"
            />

            {/* Clear Button */}
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* SEARCH DROPDOWN MENU */}
          {isOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-zinc-950 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-[82vh] overflow-y-auto backdrop-blur-md animate-in fade-in duration-200">
              
              {/* Market & Scale Filter Tabs */}
              <div className="bg-zinc-900/90 p-2 border-b border-zinc-800 space-y-2 text-xs">
                {/* Row 0: Market Filter Checkboxes (Explicit user requirement) */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-1 py-1 bg-zinc-950/80 rounded-xl border border-zinc-800/80 text-[11px] font-bold">
                  <div className="flex items-center gap-2.5">
                    <span className="text-zinc-400 font-bold shrink-0">마켓 검색 필터:</span>
                    
                    <label className="flex items-center gap-1.5 cursor-pointer text-zinc-200 hover:text-white select-none">
                      <input
                        type="checkbox"
                        checked={showKorea}
                        onChange={(e) => setShowKorea(e.target.checked)}
                        className="w-3.5 h-3.5 accent-blue-500 rounded cursor-pointer"
                      />
                      <span>🇰🇷 국내주식</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer text-zinc-200 hover:text-white select-none">
                      <input
                        type="checkbox"
                        checked={showUS}
                        onChange={(e) => setShowUS(e.target.checked)}
                        className="w-3.5 h-3.5 accent-purple-500 rounded cursor-pointer"
                      />
                      <span>🇺🇸 외국주식</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer text-zinc-200 hover:text-white select-none">
                      <input
                        type="checkbox"
                        checked={showCrypto}
                        onChange={(e) => setShowCrypto(e.target.checked)}
                        className="w-3.5 h-3.5 accent-amber-500 rounded cursor-pointer"
                      />
                      <span>🪙 업비트</span>
                    </label>
                  </div>

                  <span className="text-cyan-400 font-mono font-bold text-[11.5px] ml-auto flex items-center gap-1.5">
                    {query.trim().length === 0 ? (
                      <span>⚡ 실시간 전 종목 검색 가능 <span className="text-zinc-400 font-normal hidden md:inline">· KOSPI · KOSDAQ · US · UPBIT</span></span>
                    ) : (
                      <span>🔍 검색 결과: <strong className="text-white font-black">{filteredList.length}개</strong></span>
                    )}
                  </span>
                </div>

                {/* Notice banner for full market search clarity */}
                <div className="bg-cyan-950/40 border border-cyan-800/60 rounded-lg p-2.5 text-[11.5px] text-cyan-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>
                      {query.trim().length === 0 ? (
                        <><strong>전 증시 실시간 검색:</strong> 종목명, 초성(예: <strong>ㅅㅅㅈㅈ, ㅋㅋㅇ, ㅂㅌㅋㅇ, ㅈㅈㅂㄷㅊ</strong>) 또는 코드(005930, NVDA)를 입력하면 <strong>상장된 모든 종목</strong>의 실시간 호가 및 시세가 검색됩니다.</>
                      ) : (
                        <><strong>실시간 전 종목 조회 중:</strong> 한국투자증권 · 토스증권 · 업비트 API 연동으로 <strong>"{query}"</strong> 실시간 데이터를 가져옵니다.</>
                      )}
                    </span>
                  </div>
                </div>

                {/* Row 1: Market Filter Tabs */}
                <div className="flex items-center justify-between gap-1 overflow-x-auto">
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedMarketTab("ALL")}
                      className={`px-3 py-1.5 rounded-lg font-black text-xs transition cursor-pointer whitespace-nowrap ${
                        selectedMarketTab === "ALL" ? "bg-cyan-600 text-white shadow-md" : "bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800"
                      }`}
                    >
                      🌐 전체 시장
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedMarketTab("KOREA")}
                      className={`px-3 py-1.5 rounded-lg font-black text-xs transition cursor-pointer whitespace-nowrap ${
                        selectedMarketTab === "KOREA" ? "bg-blue-600 text-white shadow-md" : "bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800"
                      }`}
                    >
                      🇰🇷 국내주식 (KOSPI·KOSDAQ)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedMarketTab("US")}
                      className={`px-3 py-1.5 rounded-lg font-black text-xs transition cursor-pointer whitespace-nowrap ${
                        selectedMarketTab === "US" ? "bg-purple-600 text-white shadow-md" : "bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800"
                      }`}
                    >
                      🇺🇸 해외주식 (토스증권)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedMarketTab("BTC")}
                      className={`px-3 py-1.5 rounded-lg font-black text-xs transition cursor-pointer whitespace-nowrap ${
                        selectedMarketTab === "BTC" ? "bg-amber-600 text-white shadow-md" : "bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800"
                      }`}
                    >
                      🪙 가상자산 (업비트)
                    </button>
                  </div>


                  <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1 shrink-0 hidden sm:flex">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    실시간 시세 연동
                  </span>
                </div>

                {/* Row 2: Cap Size Scale Filter Tabs (대형주 / 중형주 / 소형주 / 가상자산) */}
                <div className="flex items-center gap-1 overflow-x-auto pt-1 border-t border-zinc-800/60">
                  <span className="text-[10.5px] font-bold text-zinc-400 mr-1 shrink-0 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-cyan-400" /> 시총 규모 분류:
                  </span>
                  {[
                    { id: "ALL", label: "전체 규모" },
                    { id: "LARGE", label: "🏢 대형주" },
                    { id: "MID", label: "🏭 중형주" },
                    { id: "SMALL", label: "🚀 소형주" },
                    { id: "CRYPTO", label: "🪙 가상자산" }
                  ].map((cap) => (
                    <button
                      key={cap.id}
                      type="button"
                      onClick={() => setSelectedCapTab(cap.id as any)}
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-extrabold transition cursor-pointer whitespace-nowrap ${
                        selectedCapTab === cap.id
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs"
                          : "bg-zinc-950/80 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                      }`}
                    >
                      {cap.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Keyword Chips */}
              <div className="bg-zinc-900/60 px-3 py-2 border-b border-zinc-800 flex items-center gap-1.5 overflow-x-auto text-[11px]">
                <span className="text-zinc-500 font-bold shrink-0 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-500" /> 급상승 검색:
                </span>
                {[
                  { name: "삼성전자 (ㅅㅅㅈㅈ)", query: "삼성전자" },
                  { name: "SK하이닉스 (ㅎㅇㄴㅅ)", query: "SK하이닉스" },
                  { name: "비트코인 (ㅂㅌ)", query: "비트코인" },
                  { name: "엔비디아 (ㅇㅂㄷㅇ)", query: "엔비디아" },
                  { name: "한미반도체 (ㅎㅁ)", query: "한미반도체" },
                  { name: "테슬라 (ㅌㅅㄹ)", query: "테슬라" },
                  { name: "두산에너빌리티", query: "두산에너빌리티" },
                  { name: "솔라나", query: "솔라나" },
                  { name: "리플", query: "리플" }
                ].map(chip => (
                  <button
                    key={chip.name}
                    onClick={() => setQuery(chip.query)}
                    className="px-2 py-0.5 bg-zinc-800 hover:bg-cyan-950 text-zinc-300 hover:text-cyan-300 border border-zinc-700 hover:border-cyan-600 rounded-lg font-bold transition whitespace-nowrap cursor-pointer text-[10.5px]"
                  >
                    {chip.name}
                  </button>
                ))}
              </div>

              {/* SEARCH RESULTS LIST */}
              {isSearchingApi ? (
                <div className="p-8 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin mx-auto" />
                  <p className="text-xs font-bold text-white">
                    '{query}' 증권사 / 업비트 실시간 호가 및 종목 정보 받아오는 중...
                  </p>
                </div>
              ) : filteredList.length > 0 ? (
                <div className="p-2 space-y-1">
                  <div className="px-2 py-1 text-[10.5px] font-bold text-zinc-400 flex items-center justify-between">
                    <span>검색된 실시간 종목 ({filteredList.length}건)</span>
                    <span className="text-cyan-400">⚡ 1-클릭 AI 진단 · 차트 · 즉시 매수 지원</span>
                  </div>

                  {filteredList.map((stock, idx) => {
                    const added = isInWatchlist(stock.symbol);
                    const isUp = (stock.changePct || 0) >= 0;
                    const capInfo = getCapCategoryInfo(stock);
                    const mStatus = getMarketStatus(stock.symbol, stock.market);

                    return (
                      <div
                        key={`${stock.market || 'KOREA'}-${stock.symbol}-${idx}`}
                        onClick={() => handleOpenChart(stock)}
                        className="w-full p-2.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 hover:border-cyan-500/60 flex items-center justify-between transition group cursor-pointer"
                      >
                        {/* Left Info */}
                        <div className="flex items-center gap-2 min-w-0">
                          {/* Explicit Market Badge (국내주식 / 미국주식 / 가상자산) */}
                          <span className={`px-2 py-0.5 rounded-md text-[10.5px] shrink-0 ${mStatus.badgeClass}`}>
                            {mStatus.marketBadgeLabel}
                          </span>

                          {/* Cap Size Category Badge */}
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-black shrink-0 border ${capInfo.badgeClass}`}>
                            {capInfo.label}
                          </span>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-xs text-white group-hover:text-cyan-300 transition truncate">
                                {stock.name}
                              </span>
                              <span className="font-mono text-[11px] text-zinc-400">
                                ({stock.symbol})
                              </span>
                              
                              {/* Session Open/Close Status Indicator */}
                              <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-bold border border-zinc-700/80 shrink-0 ${mStatus.statusColorClass} bg-zinc-950/80`}>
                                {mStatus.sessionStatusText}
                              </span>

                              {stock.categoryTag && (
                                <span className="text-[9px] px-1.5 py-0.2 bg-zinc-800 text-zinc-300 rounded font-bold border border-zinc-700 truncate">
                                  {stock.categoryTag}
                                </span>
                              )}
                            </div>

                            {/* Theme Tags */}
                            {stock.themeTags && stock.themeTags.length > 0 && (
                              <div className="flex items-center gap-1 mt-1 overflow-hidden">
                                {stock.themeTags.slice(0, 3).map((tag, idx) => (
                                  <span key={idx} className="text-[8.5px] px-1 bg-cyan-950/60 text-cyan-400 rounded border border-cyan-800/50 font-bold">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right Real Live Price & 4 Quick Action Controls */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <div className="font-mono text-xs font-black text-white">
                              {stock.market === "US" 
                                ? `$${(stock.price ?? 0).toLocaleString()}` 
                                : `₩${(stock.price ?? 0).toLocaleString()}원`}
                            </div>
                            <div className={`text-[10px] font-mono font-bold flex items-center justify-end gap-0.5 ${
                              isUp ? "text-rose-400" : "text-blue-400"
                            }`}>
                              {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              <span>{isUp ? "+" : ""}{stock.changePct}%</span>
                            </div>
                          </div>

                          {/* Quick Action Button Group */}
                          <div className="flex items-center gap-1">
                            {/* Live Chart & AI Prediction Button */}
                            <button
                              type="button"
                              onClick={(e) => handleOpenChart(stock, e)}
                              className="p-1.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1"
                              title="실시간 차트 및 AI 미래 가격 예측 그래프"
                            >
                              <BarChart2 className="w-3.5 h-3.5 text-cyan-200" />
                              <span className="hidden sm:inline">차트·AI예측</span>
                            </button>

                            {/* AI Deep Analysis Button */}
                            <button
                              type="button"
                              onClick={(e) => handleOpenAiAnalysis(stock, e)}
                              className="p-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1"
                              title="AI 심층 퀀트 진단 리포트"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                              <span className="hidden sm:inline">AI 진단</span>
                            </button>

                            {/* Quick Buy Button */}
                            <button
                              type="button"
                              onClick={(e) => handleQuickBuy(stock, e)}
                              className="p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1"
                              title="실시간 호가 즉시 매수"
                            >
                              <Zap className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">매수</span>
                            </button>

                            {/* Watchlist Toggle Button */}
                            <button
                              type="button"
                              onClick={(e) => handleToggleWatchlist(stock, e)}
                              className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                added 
                                  ? "bg-amber-950 text-amber-300 border-amber-700 hover:bg-amber-900" 
                                  : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white hover:border-zinc-500"
                              }`}
                              title={added ? "관심종목에서 제거" : "관심종목에 추가"}
                            >
                              <Star className={`w-3.5 h-3.5 ${added ? "fill-amber-400 text-amber-400" : ""}`} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center space-y-2">
                  <Building2 className="w-8 h-8 text-zinc-600 mx-auto" />
                  <p className="text-xs font-bold text-white">
                    "{query}" 종목의 실시간 시세를 검색할 수 있습니다.
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    초성(예: ㅅㅅㅈㅈ, ㅎㅁ), 종목명(삼성전자, 비트코인) 또는 티커(NVDA, AAPL)를 입력하세요.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Info Tag */}
        <div className="shrink-0 hidden xl:flex items-center gap-2 text-xs text-zinc-400 font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>초성 매칭 · 1-클릭 AI 진단 · KIS &amp; Upbit 실시간 연동</span>
        </div>

      </div>
    </div>
  );
};
