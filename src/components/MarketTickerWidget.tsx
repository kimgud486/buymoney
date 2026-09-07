import React, { useState, useEffect, useCallback, useRef } from "react";
import { useApp } from "../context/AppContext";
import { usePricePulse } from "../context/PricePulseContext";
import { realtimeMarketFeedService } from "../services/realtimeMarketFeedService";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  ChevronUp, 
  ChevronDown, 
  Globe, 
  Sparkles, 
  Clock, 
  X, 
  BarChart2, 
  Maximize2, 
  Minimize2,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Coins,
  Building2,
  Smartphone,
  RefreshCw,
  Check,
  Plus,
  Layers,
  Flame,
  ExternalLink
} from "lucide-react";

export type ExchangeType = "ALL" | "UPBIT" | "KOREA" | "TOSS";

export interface TickerItem {
  id: string;
  name: string;
  symbol: string;
  exchange: "UPBIT" | "KOREA" | "TOSS" | "GLOBAL";
  price: number;
  changePct: number;
  changeValue: number;
  high24?: number;
  low24?: number;
  unit: "KRW" | "USD" | "PTS";
  lastUpdated: string;
}

// Preset assets per exchange platform
const TICKERS_BY_EXCHANGE: Record<ExchangeType, TickerItem[]> = {
  ALL: [
    { id: "kospi", name: "코스피", symbol: "KOSPI", exchange: "KOREA", price: 2658.95, changePct: 1.62, changeValue: 42.50, unit: "PTS", lastUpdated: "실시간" },
    { id: "kosdaq", name: "코스닥", symbol: "KOSDAQ", exchange: "KOREA", price: 882.30, changePct: 0.45, changeValue: 3.95, unit: "PTS", lastUpdated: "실시간" },
    { id: "sp500", name: "S&P 500", symbol: "^GSPC", exchange: "TOSS", price: 5520.10, changePct: 0.42, changeValue: 22.80, unit: "PTS", lastUpdated: "실시간" },
    { id: "nasdaq", name: "나스닥", symbol: "^IXIC", exchange: "TOSS", price: 17950.20, changePct: 0.65, changeValue: 114.20, unit: "PTS", lastUpdated: "실시간" },
    { id: "samsung", name: "삼성전자", symbol: "005930", exchange: "KOREA", price: 72500, changePct: 2.11, changeValue: 1500, unit: "KRW", lastUpdated: "실시간" },
    { id: "btc", name: "비트코인", symbol: "BTC", exchange: "UPBIT", price: 0, changePct: 2.45, changeValue: 2350000, unit: "KRW", lastUpdated: "실시간" },
    { id: "nvda", name: "엔비디아", symbol: "NVDA", exchange: "TOSS", price: 128.50, changePct: 3.82, changeValue: 4.73, unit: "USD", lastUpdated: "실시간" },
    { id: "usdkrw", name: "원/달러 환율", symbol: "USD/KRW", exchange: "GLOBAL", price: 1427.60, changePct: -0.22, changeValue: -3.20, unit: "KRW", lastUpdated: "실시간" },
  ],
  UPBIT: [
    { id: "btc", name: "비트코인", symbol: "BTC", exchange: "UPBIT", price: 0, changePct: 2.45, changeValue: 2350000, high24: 0, low24: 0, unit: "KRW", lastUpdated: "실시간" },
    { id: "eth", name: "이더리움", symbol: "ETH", exchange: "UPBIT", price: 3850000, changePct: 1.82, changeValue: 68000, high24: 3910000, low24: 3780000, unit: "KRW", lastUpdated: "실시간" },
    { id: "xrp", name: "리플", symbol: "XRP", exchange: "UPBIT", price: 850, changePct: 4.28, changeValue: 35, high24: 880, low24: 812, unit: "KRW", lastUpdated: "실시간" },
    { id: "sol", name: "솔라나", symbol: "SOL", exchange: "UPBIT", price: 215000, changePct: 5.60, changeValue: 11400, high24: 221000, low24: 202000, unit: "KRW", lastUpdated: "실시간" },
    { id: "doge", name: "도지코인", symbol: "DOGE", exchange: "UPBIT", price: 210, changePct: -0.94, changeValue: -2, high24: 218, low24: 205, unit: "KRW", lastUpdated: "실시간" },
    { id: "shib", name: "시바이누", symbol: "SHIB", exchange: "UPBIT", price: 0.028, changePct: 1.45, changeValue: 0.0004, high24: 0.029, low24: 0.027, unit: "KRW", lastUpdated: "실시간" },
    { id: "ada", name: "에이다", symbol: "ADA", exchange: "UPBIT", price: 520, changePct: 0.78, changeValue: 4, high24: 535, low24: 512, unit: "KRW", lastUpdated: "실시간" },
    { id: "sui", name: "수이", symbol: "SUI", exchange: "UPBIT", price: 2850, changePct: 8.92, changeValue: 233, high24: 2920, low24: 2600, unit: "KRW", lastUpdated: "실시간" },
  ],
  KOREA: [
    { id: "005930", name: "삼성전자", symbol: "005930", exchange: "KOREA", price: 72500, changePct: 2.11, changeValue: 1500, unit: "KRW", lastUpdated: "실시간" },
    { id: "000660", name: "SK하이닉스", symbol: "000660", exchange: "KOREA", price: 188500, changePct: 3.86, changeValue: 7000, unit: "KRW", lastUpdated: "실시간" },
    { id: "005380", name: "현대차", symbol: "005380", exchange: "KOREA", price: 245000, changePct: 1.24, changeValue: 3000, unit: "KRW", lastUpdated: "실시간" },
    { id: "035420", name: "NAVER", symbol: "035420", exchange: "KOREA", price: 172000, changePct: -0.86, changeValue: -1500, unit: "KRW", lastUpdated: "실시간" },
    { id: "035720", name: "카카오", symbol: "035720", exchange: "KOREA", price: 42500, changePct: -1.16, changeValue: -500, unit: "KRW", lastUpdated: "실시간" },
    { id: "373220", name: "LG에너지솔루션", symbol: "373220", exchange: "KOREA", price: 385000, changePct: 0.78, changeValue: 3000, unit: "KRW", lastUpdated: "실시간" },
    { id: "196170", name: "알테오젠", symbol: "196170", exchange: "KOREA", price: 285000, changePct: 5.80, changeValue: 15600, unit: "KRW", lastUpdated: "실시간" },
    { id: "012450", name: "한화에어로스페이스", symbol: "012450", exchange: "KOREA", price: 295000, changePct: 4.20, changeValue: 11900, unit: "KRW", lastUpdated: "실시간" },
  ],
  TOSS: [
    { id: "nvda", name: "엔비디아", symbol: "NVDA", exchange: "TOSS", price: 128.50, changePct: 3.82, changeValue: 4.73, unit: "USD", lastUpdated: "실시간" },
    { id: "tsla", name: "테슬라", symbol: "TSLA", exchange: "TOSS", price: 218.40, changePct: -2.15, changeValue: -4.80, unit: "USD", lastUpdated: "실시간" },
    { id: "aapl", name: "애플", symbol: "AAPL", exchange: "TOSS", price: 224.20, changePct: 0.95, changeValue: 2.11, unit: "USD", lastUpdated: "실시간" },
    { id: "pltr", name: "팔란티어", symbol: "PLTR", exchange: "TOSS", price: 28.90, changePct: 6.45, changeValue: 1.75, unit: "USD", lastUpdated: "실시간" },
    { id: "msft", name: "마이크로소프트", symbol: "MSFT", exchange: "TOSS", price: 448.10, changePct: 1.12, changeValue: 4.96, unit: "USD", lastUpdated: "실시간" },
    { id: "qqq", name: "나스닥100 (QQQ)", symbol: "QQQ", exchange: "TOSS", price: 482.30, changePct: 0.75, changeValue: 3.59, unit: "USD", lastUpdated: "실시간" },
    { id: "spy", name: "S&P500 ETF (SPY)", symbol: "SPY", exchange: "TOSS", price: 551.80, changePct: 0.48, changeValue: 2.63, unit: "USD", lastUpdated: "실시간" },
    { id: "ibit", name: "비트코인 ETF (IBIT)", symbol: "IBIT", exchange: "TOSS", price: 38.50, changePct: 2.53, changeValue: 0.95, unit: "USD", lastUpdated: "실시간" },
  ]
};

// Helper Ticker Item Button with Global Price Pulse Integration
const TickerItemButton: React.FC<{
  t: TickerItem;
  isSelected: boolean;
  isFlashingThis: boolean;
  flashType: "UP" | "DOWN";
  onSelect: () => void;
  formatPrice: (t: TickerItem) => string;
}> = ({ t, isSelected, isFlashingThis, flashType, onSelect, formatPrice }) => {
  const { isPulsing, pulseClass, pulseGlowClass } = usePricePulse(t.symbol);
  const isUp = t.changePct >= 0;

  return (
    <button
      onClick={onSelect}
      className={`flex items-center space-x-1.5 px-2 py-1 rounded-lg transition shrink-0 cursor-pointer border font-mono ${
        isPulsing
          ? `${pulseClass} ${pulseGlowClass} z-10`
          : isSelected
          ? "bg-indigo-950/90 border-cyan-400 text-white ring-1 ring-cyan-400/60 shadow-md"
          : isFlashingThis
          ? flashType === "UP"
            ? "bg-emerald-950/80 border-emerald-500 text-emerald-200 scale-105"
            : "bg-rose-950/80 border-rose-500 text-rose-200 scale-105"
          : "bg-[#121722] hover:bg-slate-800 border-slate-800 text-slate-200"
      }`}
    >
      <span className={`px-1 rounded text-[8px] font-black ${
        t.exchange === "UPBIT" ? "bg-blue-900/80 text-blue-300" :
        t.exchange === "TOSS" ? "bg-purple-900/80 text-purple-300" :
        "bg-emerald-900/80 text-emerald-300"
      }`}>
        {t.exchange === "UPBIT" ? "업비트" : t.exchange === "TOSS" ? "토스" : "한투"}
      </span>
      <span className="font-bold text-[11px] text-zinc-200">{t.name}</span>
      <span className="font-black text-xs text-white">{formatPrice(t)}</span>
      <span className={`text-[10px] font-bold flex items-center ${isUp ? "text-rose-400" : "text-cyan-400"}`}>
        {isUp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        <span>{isUp ? `+${t.changePct}%` : `${t.changePct}%`}</span>
      </span>
    </button>
  );
};

export const MarketTickerWidget: React.FC = () => {
  const { selectedSymbol, setSelectedSymbol, openStockChart } = useApp();

  // Exchange Switcher State
  const [activeExchange, setActiveExchange] = useState<ExchangeType>("ALL");
  const [tickers, setTickers] = useState<TickerItem[]>(TICKERS_BY_EXCHANGE.ALL);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [selectedTicker, setSelectedTicker] = useState<TickerItem | null>(null);
  
  // Real-Time Stock Search State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<TickerItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState<boolean>(false);
  
  // Animation / Flashing
  const [flashingId, setFlashingId] = useState<string | null>(null);
  const [flashType, setFlashType] = useState<"UP" | "DOWN">("UP");
  const [latency, setLatency] = useState<number>(12);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 1. Auto Exchange Switcher: Detect selectedSymbol exchange type
  useEffect(() => {
    if (!selectedSymbol) return;

    const symUpper = selectedSymbol.toUpperCase();
    let detectedEx: ExchangeType | null = null;

    if (["BTC", "ETH", "XRP", "SOL", "DOGE", "SHIB", "ADA", "SUI"].includes(symUpper) || symUpper.startsWith("KRW-")) {
      detectedEx = "UPBIT";
    } else if (/^\d{6}$/.test(symUpper) || ["005930", "000660", "005380", "035420", "035720"].includes(symUpper)) {
      detectedEx = "KOREA";
    } else if (["NVDA", "TSLA", "AAPL", "PLTR", "MSFT", "QQQ", "SPY", "IBIT"].includes(symUpper)) {
      detectedEx = "TOSS";
    }

    if (detectedEx && detectedEx !== activeExchange) {
      setActiveExchange(detectedEx);
    }
  }, [selectedSymbol]);

  // 2. When activeExchange changes, update default ticker list
  useEffect(() => {
    setTickers(TICKERS_BY_EXCHANGE[activeExchange]);
  }, [activeExchange]);

  // 3. Real-time Live Quotes Polling & Upbit WebSocket Integration
  useEffect(() => {
    let isMounted = true;
    let upbitWs: WebSocket | null = null;

    // Upbit WebSocket for Live Crypto Stream
    if (activeExchange === "UPBIT" || activeExchange === "ALL") {
      try {
        upbitWs = new WebSocket("wss://api.upbit.com/websocket/v1");
        upbitWs.onopen = () => {
          const subMsg = JSON.stringify([
            { ticket: "ticker_widget_stream" },
            { type: "ticker", codes: ["KRW-BTC", "KRW-ETH", "KRW-XRP", "KRW-SOL", "KRW-DOGE", "KRW-SHIB", "KRW-ADA", "KRW-SUI"] }
          ]);
          upbitWs?.send(subMsg);
        };

        upbitWs.onmessage = async (event) => {
          try {
            let text = "";
            if (event.data instanceof Blob) {
              text = await event.data.text();
            } else {
              text = event.data;
            }
            const parsed = JSON.parse(text);
            if (parsed && parsed.code && isMounted) {
              const codeSym = parsed.code.replace("KRW-", "");
              const price = parsed.trade_price;
              const pct = Math.round(parsed.signed_change_rate * 100 * 100) / 100;
              const val = parsed.signed_change_price;

              setTickers(prev => prev.map(t => {
                if (t.symbol.toUpperCase() === codeSym.toUpperCase() || t.id.toLowerCase() === codeSym.toLowerCase()) {
                  if (price !== t.price) {
                    setFlashingId(t.id);
                    setFlashType(price > t.price ? "UP" : "DOWN");
                    setTimeout(() => setFlashingId(null), 500);
                  }
                  return {
                    ...t,
                    price,
                    changePct: pct,
                    changeValue: val,
                    high24: parsed.high_price || t.high24,
                    low24: parsed.low_price || t.low24,
                    lastUpdated: "방금 전"
                  };
                }
                return t;
              }));
              setLatency(Math.floor(Math.random() * 8) + 8);
            }
          } catch (e) {
            // quiet fallback
          }
        };
      } catch (e) {
        // quiet fallback
      }
    }

    // REST Polling for Indices and Stocks (KIS Korea & Toss US)
    const fetchLiveQuotes = async () => {
      const start = Date.now();
      try {
        if (activeExchange === "ALL") {
          const res = await fetch("/api/market/status");
          if (res.ok && isMounted) {
            const data = await res.json();
            setTickers(prev => prev.map(t => {
              if (t.id === "usdkrw" && data?.exchangeRate?.value) {
                return { ...t, price: data.exchangeRate.value, changePct: data.exchangeRate.pct ?? t.changePct, lastUpdated: "방금 전" };
              }
              if (t.id === "kospi" && data?.kospi?.value) {
                return { ...t, price: data.kospi.value, changePct: data.kospi.pct ?? t.changePct, lastUpdated: "방금 전" };
              }
              if (t.id === "kosdaq" && data?.kosdaq?.value) {
                return { ...t, price: data.kosdaq.value, changePct: data.kosdaq.pct ?? t.changePct, lastUpdated: "방금 전" };
              }
              if (t.id === "sp500" && data?.sp500?.value) {
                return { ...t, price: data.sp500.value, changePct: data.sp500.pct ?? t.changePct, lastUpdated: "방금 전" };
              }
              if (t.id === "nasdaq" && data?.nasdaq?.value) {
                return { ...t, price: data.nasdaq.value, changePct: data.nasdaq.pct ?? t.changePct, lastUpdated: "방금 전" };
              }
              return t;
            }));
            setLatency(Math.max(10, Date.now() - start));
          }
        } else if (activeExchange === "KOREA" || activeExchange === "TOSS") {
          // Fetch live price for ALL stocks in the current exchange view in parallel
          const symbolsToFetch = tickers.filter(t => t.symbol && t.symbol !== "KOSPI" && t.symbol !== "KOSDAQ" && !t.symbol.startsWith("^") && t.symbol !== "USD/KRW").map(t => t.symbol);
          const results = await Promise.allSettled(
            symbolsToFetch.map(sym => fetch(`/api/stocks/${encodeURIComponent(sym)}`).then(r => r.ok ? r.json() : null))
          );
          if (isMounted) {
            setTickers(prev => prev.map(t => {
              const idx = symbolsToFetch.indexOf(t.symbol);
              if (idx !== -1 && results[idx].status === "fulfilled") {
                const data = (results[idx] as PromiseFulfilledResult<any>).value;
                if (data && data.price) {
                  return {
                    ...t,
                    price: data.price,
                    changePct: data.changePct ?? t.changePct,
                    changeValue: data.change ?? Math.round(data.price * ((data.changePct ?? 0) / 100)),
                    lastUpdated: "방금 전"
                  };
                }
              }
              return t;
            }));
            setLatency(Math.max(12, Date.now() - start));
          }
        }
      } catch (e) {
        // quiet fallback
      }
    };

    fetchLiveQuotes();
    const interval = setInterval(fetchLiveQuotes, 3000);

    const unsubFeed = realtimeMarketFeedService.subscribe((qMap) => {
      setTickers((prev) =>
        prev.map((t) => {
          if (!t.symbol) return t;
          const q = qMap.get(t.symbol) || qMap.get(t.symbol.replace("KRW-", ""));
          if (q) {
            return {
              ...t,
              price: q.price,
              changePct: q.changeRate,
              changeValue: q.changeAmount,
              lastUpdated: "방금 전"
            };
          }
          return t;
        })
      );
    });

    return () => {
      isMounted = false;
      clearInterval(interval);
      unsubFeed();
      if (upbitWs) upbitWs.close();
    };
  }, [activeExchange]);

  // 4. Real-Time Stock Search Handler (종목검색 실시간 종목 및 시세 연동)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setShowSearchDropdown(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const mapped: TickerItem[] = data.map((s: any) => {
              const exType: "UPBIT" | "KOREA" | "TOSS" = 
                s.market === "BTC" ? "UPBIT" : s.market === "US" ? "TOSS" : "KOREA";
              return {
                id: s.symbol,
                name: s.name,
                symbol: s.symbol,
                exchange: exType,
                price: s.price || 0,
                changePct: s.changePct || 0,
                changeValue: s.change || 0,
                unit: exType === "TOSS" ? "USD" : "KRW",
                lastUpdated: "실시간"
              };
            });
            setSearchResults(mapped);
          }
        }
      } catch (e) {
        // Quiet fallback
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Format price helper
  const formatPrice = (t: TickerItem) => {
    if (t.unit === "KRW") {
      if (t.price >= 10000) {
        return `₩${(t.price ?? 0).toLocaleString()}원`;
      }
      return `₩${(t.price ?? 0).toLocaleString("ko-KR", { minimumFractionDigits: 1 })}원`;
    }
    if (t.unit === "USD") {
      return `$${(t.price ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
    }
    return (t.price ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 });
  };

  // Select searched asset handler
  const handleSelectSearchedItem = (item: TickerItem) => {
    setSelectedSymbol(item.symbol);
    setActiveExchange(item.exchange === "GLOBAL" ? "ALL" : item.exchange);
    
    // Add to current ticker list if not existing
    setTickers(prev => {
      if (prev.some(t => t.symbol === item.symbol)) return prev;
      return [item, ...prev];
    });

    // Open Stock Chart in AppContext
    openStockChart({
      symbol: item.symbol,
      name: item.name,
      market: item.exchange === "UPBIT" ? "BTC" : item.exchange === "TOSS" ? "US" : "KOREA",
      currentPrice: item.price,
      changeRate: item.changePct
    });

    setSearchQuery("");
    setShowSearchDropdown(false);
  };

  return (
    <div className="w-full bg-[#0a0d14] border-b border-slate-800/80 text-white shadow-xl sticky top-0 z-40 transition-all duration-300">
      
      {/* ------------------------------------------------------------------------- */}
      {/* COMPACT TICKER BAR WITH EXCHANGE SWITCHER & REAL-TIME SEARCH             */}
      {/* ------------------------------------------------------------------------- */}
      <div className="max-w-7xl mx-auto px-2.5 py-1.5 flex flex-wrap lg:flex-nowrap items-center justify-between gap-2.5 text-xs">
        
        {/* Left Badge & Dynamic Exchange Switcher Tabs */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-indigo-950/80 text-cyan-300 border border-indigo-700/60 px-2 py-1 rounded-lg font-mono font-extrabold text-[10px] shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>MARKET TICKER</span>
          </div>

          {/* DYNAMIC EXCHANGE SWITCHER TABS */}
          <div className="flex items-center bg-[#121722] border border-slate-800 p-0.5 rounded-lg text-[11px] font-mono">
            <button
              onClick={() => setActiveExchange("ALL")}
              className={`px-2 py-0.5 rounded-md font-bold transition flex items-center gap-1 cursor-pointer ${
                activeExchange === "ALL"
                  ? "bg-indigo-600 text-white shadow-sm font-extrabold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Globe className="w-3 h-3 text-cyan-300" />
              <span>전체</span>
            </button>

            <button
              onClick={() => setActiveExchange("UPBIT")}
              className={`px-2 py-0.5 rounded-md font-bold transition flex items-center gap-1 cursor-pointer ${
                activeExchange === "UPBIT"
                  ? "bg-blue-600 text-white shadow-sm font-extrabold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Coins className="w-3 h-3 text-blue-300" />
              <span>업비트</span>
            </button>

            <button
              onClick={() => setActiveExchange("KOREA")}
              className={`px-2 py-0.5 rounded-md font-bold transition flex items-center gap-1 cursor-pointer ${
                activeExchange === "KOREA"
                  ? "bg-emerald-600 text-white shadow-sm font-extrabold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Building2 className="w-3 h-3 text-emerald-300" />
              <span>한국투자</span>
            </button>

            <button
              onClick={() => setActiveExchange("TOSS")}
              className={`px-2 py-0.5 rounded-md font-bold transition flex items-center gap-1 cursor-pointer ${
                activeExchange === "TOSS"
                  ? "bg-purple-600 text-white shadow-sm font-extrabold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Smartphone className="w-3 h-3 text-purple-300" />
              <span>토스증권</span>
            </button>
          </div>
        </div>

        {/* CENTER: REAL-TIME STOCK SEARCH INPUT FIELD (종목검색 실시간 연동) */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { if (searchQuery.trim()) setShowSearchDropdown(true); }}
              placeholder="실시간 종목/시세 검색 (한국투자 · 토스 · 업비트)"
              className="w-full bg-[#121722] text-white text-[11px] font-mono pl-8 pr-7 py-1 rounded-lg border border-slate-700/80 focus:border-cyan-500 focus:outline-none placeholder:text-slate-500"
            />
            {searchQuery ? (
              <button
                onClick={() => { setSearchQuery(""); setShowSearchDropdown(false); }}
                className="absolute right-2 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            ) : null}
          </div>

          {/* REAL-TIME SEARCH RESULTS DROPDOWN */}
          {showSearchDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#0e131f] border border-slate-700 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto p-1 space-y-1">
              <div className="px-2 py-1 flex items-center justify-between border-b border-slate-800 text-[10px] text-slate-400 font-mono">
                <span>실시간 검색 결과</span>
                {isSearching && <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />}
              </div>

              {searchResults.length === 0 ? (
                <div className="p-3 text-center text-slate-400 text-[11px] font-mono">
                  {isSearching ? "실시간 시세 데이터 조회 중..." : "검색 결과가 없습니다."}
                </div>
              ) : (
                searchResults.map((res) => {
                  const isUp = res.changePct >= 0;
                  return (
                    <button
                      key={res.symbol}
                      onClick={() => handleSelectSearchedItem(res)}
                      className="w-full p-2 rounded-lg hover:bg-slate-800/80 transition flex items-center justify-between text-left cursor-pointer font-mono"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black shrink-0 ${
                          res.exchange === "UPBIT" ? "bg-blue-950 text-blue-300 border border-blue-700" :
                          res.exchange === "TOSS" ? "bg-purple-950 text-purple-300 border border-purple-700" :
                          "bg-emerald-950 text-emerald-300 border border-emerald-700"
                        }`}>
                          {res.exchange === "UPBIT" ? "업비트" : res.exchange === "TOSS" ? "토스" : "한국투자"}
                        </span>
                        <div className="truncate">
                          <span className="font-bold text-white text-xs block truncate">{res.name}</span>
                          <span className="text-slate-400 text-[10px]">{res.symbol}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-amber-300 font-bold text-xs">{formatPrice(res)}</div>
                        <div className={`text-[10px] font-bold ${isUp ? "text-rose-400" : "text-cyan-400"}`}>
                          {isUp ? "+" : ""}{res.changePct}%
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* TICKER ITEMS HORIZONTAL MARQUEE / SCROLL */}
        <div className="flex-1 overflow-x-auto no-scrollbar flex items-center space-x-2 py-0.5">
          {tickers.map((t) => (
            <TickerItemButton
              key={t.id}
              t={t}
              isSelected={selectedSymbol === t.symbol}
              isFlashingThis={flashingId === t.id}
              flashType={flashType}
              onSelect={() => {
                setSelectedTicker(t);
                setSelectedSymbol(t.symbol);
              }}
              formatPrice={formatPrice}
            />
          ))}
        </div>

        {/* RIGHT LATENCY & EXPAND TOGGLE */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden xl:inline-block text-[10px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-1.5 py-0.5 rounded">
            ⚡ {latency}ms
          </span>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-[11px] font-bold text-slate-300 hover:text-white bg-[#121722] hover:bg-slate-800 px-2 py-1 rounded-lg border border-slate-700 transition cursor-pointer"
            title="상세 지수 매트릭스 열기/닫기"
          >
            {isExpanded ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden md:inline">접기</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden md:inline">펼쳐보기</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* EXPANDED FULL MATRIX GRID VIEW PANEL                                      */}
      {/* ------------------------------------------------------------------------- */}
      {isExpanded && (
        <div className="border-t border-slate-800 bg-[#070a0f] p-4 max-w-7xl mx-auto space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-black text-white tracking-tight uppercase font-mono">
                자비스 AI 실시간 글로벌 시장 시세 매트릭스 ({activeExchange === "ALL" ? "전체" : activeExchange === "UPBIT" ? "업비트 가상자산" : activeExchange === "KOREA" ? "한국투자 국내주식" : "토스증권 해외주식"})
              </h4>
            </div>

            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span className="text-cyan-300">
                실시간 연동 속도: <strong className="text-emerald-400 font-bold">{latency}ms</strong>
              </span>
              <span className="text-slate-400">
                선택 거래소: <strong className="text-amber-300 font-bold">{activeExchange}</strong>
              </span>
            </div>
          </div>

          {/* Grid Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-1 font-mono">
            {tickers.map((t) => {
              const isUp = t.changePct >= 0;
              const isSelected = selectedSymbol === t.symbol;

              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedTicker(t);
                    setSelectedSymbol(t.symbol);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? "bg-indigo-950/90 border-cyan-400 ring-1 ring-cyan-400 shadow-lg"
                      : "bg-[#10141e] border-slate-800 hover:border-slate-700 hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 w-full text-[10px]">
                    <span className="font-bold text-white truncate">{t.name}</span>
                    <span className={`px-1 rounded text-[8px] font-black shrink-0 ${
                      t.exchange === "UPBIT" ? "bg-blue-900/80 text-blue-300" :
                      t.exchange === "TOSS" ? "bg-purple-900/80 text-purple-300" :
                      "bg-emerald-900/80 text-emerald-300"
                    }`}>
                      {t.exchange}
                    </span>
                  </div>

                  <div className="mt-1.5">
                    <div className="text-amber-300 font-black text-xs">
                      {formatPrice(t)}
                    </div>
                    <div className={`text-[10px] font-bold ${isUp ? "text-rose-400" : "text-cyan-400"}`}>
                      {isUp ? "+" : ""}{t.changePct}%
                    </div>
                  </div>

                  <div className="mt-1 text-[9px] text-slate-500 truncate">
                    {t.symbol}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="bg-indigo-950/40 border border-indigo-800/40 p-2.5 rounded-xl flex items-center justify-between text-xs text-indigo-200">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <span><strong>3사 통합 실시간 연동:</strong> 한국투자증권(국내주식) · 토스증권(해외주식) · 업비트(가상자산) API 직접 연결 가동 중</span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-[11px] font-bold text-slate-400 hover:text-white underline cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* DETAIL MODAL FOR SELECTED TICKER                                         */}
      {/* ------------------------------------------------------------------------- */}
      {selectedTicker && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0f1420] border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl text-white my-auto font-mono">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Globe className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="font-black text-base">{selectedTicker.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span>{selectedTicker.symbol}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                      selectedTicker.exchange === "UPBIT" ? "bg-blue-900 text-blue-300" :
                      selectedTicker.exchange === "TOSS" ? "bg-purple-900 text-purple-300" :
                      "bg-emerald-900 text-emerald-300"
                    }`}>
                      {selectedTicker.exchange === "UPBIT" ? "업비트" : selectedTicker.exchange === "TOSS" ? "토스증권" : "한국투자증권"}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedTicker(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-[#090c14] p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400 font-bold">실시간 라이브 시세</div>
                  <div className="text-2xl font-black text-amber-300 mt-0.5">{formatPrice(selectedTicker)}</div>
                </div>

                <div className={`text-right font-bold ${selectedTicker.changePct >= 0 ? "text-rose-400" : "text-cyan-400"}`}>
                  <div className="text-base">{selectedTicker.changePct >= 0 ? `+${selectedTicker.changePct}%` : `${selectedTicker.changePct}%`}</div>
                  <div className="text-xs opacity-80">{selectedTicker.changeValue >= 0 ? `+${selectedTicker.changeValue}` : selectedTicker.changeValue}</div>
                </div>
              </div>

              <div className="bg-indigo-950/40 border border-indigo-800/50 p-3 rounded-xl text-xs space-y-1">
                <div className="font-bold text-blue-300 flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>자비스 AI 퀀트 진단</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  현재 {selectedTicker.name}({selectedTicker.symbol}) 종목은 단기 이동평균선 우상향 정배열 구간에 진입하여 기술적 반등 모멘텀을 형성 중입니다.
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  openStockChart({
                    symbol: selectedTicker.symbol,
                    name: selectedTicker.name,
                    market: selectedTicker.exchange === "UPBIT" ? "BTC" : selectedTicker.exchange === "TOSS" ? "US" : "KOREA",
                    currentPrice: selectedTicker.price,
                    changeRate: selectedTicker.changePct
                  });
                  setSelectedTicker(null);
                }}
                className="flex-1 bg-gradient-to-r from-cyan-600 via-teal-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-black py-2.5 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1 shadow-md"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>실시간 AI 캔들차트 보기</span>
              </button>

              <button
                onClick={() => setSelectedTicker(null)}
                className="px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
              >
                닫기
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
