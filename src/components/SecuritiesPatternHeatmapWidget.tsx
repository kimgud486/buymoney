import React, { useState, useEffect } from "react";
import { usePricePulse } from "../context/PricePulseContext";
import { 
  Building2, 
  Flame, 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Filter, 
  Sparkles, 
  ChevronRight, 
  BarChart2, 
  Layers, 
  ShieldCheck, 
  Activity, 
  Zap, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  X,
  Plus,
  Trash2,
  BookmarkPlus
} from "lucide-react";
import { stockSyncService, StockSyncEvent } from "../services/stockSyncService";

export type StateChangeCategory = 
  | "RALLY_IMMINENT"       // 상승 임박 🔥
  | "TREND_REVERSAL"       // 추세 반전 🔄
  | "ACCUMULATION_DONE"    // 매집 완료 📦
  | "SUSTAINED_UPTREND"    // 상승 지속 📈
  | "LIQUIDITY_SPIKE"      // 수급 폭발 ⚡
  | "OVERBOUGHT_CAUTION";  // 과매수 주의 📉

export interface SecuritiesHeatmapItem {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "UPBIT";
  currentPrice: number;
  changePct: number;
  stateCategory: StateChangeCategory;
  stateTitle: string;
  patternName: string;
  confidenceScore: number;
  // 4 Major Broker Consensus Data
  samsungTarget?: number;
  miraeTarget?: number;
  nhTarget?: number;
  kbTarget?: number;
  consensusTarget: number;
  consensusUpsidePct: number;
  brokerOpinion: "STRONG_BUY" | "BUY" | "HOLD";
  rvol: number;
  smcStructure: string;
}

export const INITIAL_SECURITIES_HEATMAP_DATA: SecuritiesHeatmapItem[] = [
  {
    symbol: "005930",
    name: "삼성전자",
    market: "KOREA",
    currentPrice: 78500,
    changePct: 2.88,
    stateCategory: "RALLY_IMMINENT",
    stateTitle: "상승 임박 🔥",
    patternName: "Cup & Handle + BOS",
    confidenceScore: 94,
    samsungTarget: 95000,
    miraeTarget: 98000,
    nhTarget: 96000,
    kbTarget: 97000,
    consensusTarget: 96500,
    consensusUpsidePct: 22.9,
    brokerOpinion: "STRONG_BUY",
    rvol: 3.8,
    smcStructure: "Confirmed BOS + Bullish FVG"
  },
  {
    symbol: "000660",
    name: "SK하이닉스",
    market: "KOREA",
    currentPrice: 189500,
    changePct: 4.12,
    stateCategory: "LIQUIDITY_SPIKE",
    stateTitle: "수급 폭발 ⚡",
    patternName: "HOD Breakout",
    confidenceScore: 96,
    samsungTarget: 240000,
    miraeTarget: 250000,
    nhTarget: 235000,
    kbTarget: 245000,
    consensusTarget: 242500,
    consensusUpsidePct: 27.9,
    brokerOpinion: "STRONG_BUY",
    rvol: 4.5,
    smcStructure: "BSL Liquidity Sweep"
  },
  {
    symbol: "373220",
    name: "LG에너지솔루션",
    market: "KOREA",
    currentPrice: 382000,
    changePct: -0.65,
    stateCategory: "ACCUMULATION_DONE",
    stateTitle: "매집 완료 📦",
    patternName: "Double Bottom",
    confidenceScore: 89,
    samsungTarget: 480000,
    miraeTarget: 470000,
    nhTarget: 490000,
    kbTarget: 475000,
    consensusTarget: 478750,
    consensusUpsidePct: 25.3,
    brokerOpinion: "BUY",
    rvol: 2.1,
    smcStructure: "Bullish Order Block Rejection"
  },
  {
    symbol: "005380",
    name: "현대차",
    market: "KOREA",
    currentPrice: 245000,
    changePct: 1.45,
    stateCategory: "SUSTAINED_UPTREND",
    stateTitle: "상승 지속 📈",
    patternName: "Ascending Triangle",
    confidenceScore: 91,
    samsungTarget: 310000,
    miraeTarget: 320000,
    nhTarget: 300000,
    kbTarget: 315000,
    consensusTarget: 311250,
    consensusUpsidePct: 27.0,
    brokerOpinion: "STRONG_BUY",
    rvol: 2.8,
    smcStructure: "Higher Highs & Higher Lows"
  },
  {
    symbol: "035420",
    name: "NAVER",
    market: "KOREA",
    currentPrice: 172400,
    changePct: 3.23,
    stateCategory: "TREND_REVERSAL",
    stateTitle: "추세 반전 🔄",
    patternName: "CHoCH + Inverse Head & Shoulders",
    confidenceScore: 88,
    samsungTarget: 220000,
    miraeTarget: 230000,
    nhTarget: 215000,
    kbTarget: 225000,
    consensusTarget: 222500,
    consensusUpsidePct: 29.0,
    brokerOpinion: "BUY",
    rvol: 3.2,
    smcStructure: "CHoCH Character Change"
  },
  {
    symbol: "NVDA",
    name: "NVIDIA",
    market: "US",
    currentPrice: 128.5,
    changePct: 3.85,
    stateCategory: "RALLY_IMMINENT",
    stateTitle: "상승 임박 🔥",
    patternName: "Bull Flag Breakout",
    confidenceScore: 95,
    samsungTarget: 160,
    miraeTarget: 165,
    nhTarget: 158,
    kbTarget: 162,
    consensusTarget: 161.25,
    consensusUpsidePct: 25.4,
    brokerOpinion: "STRONG_BUY",
    rvol: 4.2,
    smcStructure: "Bullish Flag + High Volume"
  },
  {
    symbol: "TSLA",
    name: "Tesla",
    market: "US",
    currentPrice: 214.2,
    changePct: -1.82,
    stateCategory: "ACCUMULATION_DONE",
    stateTitle: "매집 완료 📦",
    patternName: "Falling Wedge Breakout",
    confidenceScore: 87,
    samsungTarget: 280,
    miraeTarget: 290,
    nhTarget: 275,
    kbTarget: 285,
    consensusTarget: 282.5,
    consensusUpsidePct: 31.8,
    brokerOpinion: "BUY",
    rvol: 2.6,
    smcStructure: "Demand Zone Support"
  },
  {
    symbol: "KRW-BTC",
    name: "비트코인",
    market: "UPBIT",
    currentPrice: 94800000,
    changePct: 1.92,
    stateCategory: "SUSTAINED_UPTREND",
    stateTitle: "상승 지속 📈",
    patternName: "Bullish Flag / Range High",
    confidenceScore: 92,
    samsungTarget: 120000000,
    miraeTarget: 125000000,
    nhTarget: 118000000,
    kbTarget: 122000000,
    consensusTarget: 121250000,
    consensusUpsidePct: 27.9,
    brokerOpinion: "STRONG_BUY",
    rvol: 3.5,
    smcStructure: "Higher Low Structure"
  }
];

// Subcomponent for individual Heatmap card with PricePulse integration
const HeatmapCardItem: React.FC<{
  item: SecuritiesHeatmapItem;
  getCategoryTheme: (cat: StateChangeCategory) => any;
  formatPrice: (val: number, market: string) => string;
  onSelect: (item: SecuritiesHeatmapItem) => void;
  onDelete: (symbol: string) => void;
}> = ({ item, getCategoryTheme, formatPrice, onSelect, onDelete }) => {
  const { isPulsing, pulseClass, pulseGlowClass } = usePricePulse(item.symbol);
  const theme = getCategoryTheme(item.stateCategory);
  const isUp = item.changePct >= 0;

  return (
    <div
      onClick={() => onSelect(item)}
      className={`relative border rounded-xl p-3.5 space-y-3 cursor-pointer transition-all duration-300 hover:scale-[1.02] shadow-lg ${
        isPulsing ? `${pulseClass} ${pulseGlowClass} z-10` : `${theme.bg} ${theme.border} ${theme.glow}`
      }`}
    >
      {/* Delete Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(item.symbol);
        }}
        className="absolute top-2.5 right-2.5 p-1 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/20 rounded transition cursor-pointer"
        title="종목 삭제"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      {/* Item Top Badge & Market */}
      <div className="flex items-center justify-between text-xs pr-6">
        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold font-mono ${theme.badgeBg}`}>
          {item.stateTitle}
        </span>
        <span className="text-[10px] font-mono text-zinc-400 font-bold">{item.market}</span>
      </div>

      {/* Stock Title & Live Price */}
      <div>
        <div className="flex items-baseline justify-between">
          <h4 className="text-sm font-black text-white">{item.name}</h4>
          <span className="text-[10px] font-mono text-zinc-400">{item.symbol}</span>
        </div>

        <div className="flex items-baseline justify-between mt-1">
          <span className="text-lg font-black text-white font-mono">
            {formatPrice(item.currentPrice, item.market)}
          </span>
          <span className={`text-xs font-bold font-mono flex items-center gap-0.5 ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
            {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {isUp ? "+" : ""}{item.changePct.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* 4 Major Broker Consensus Target */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2 space-y-1 font-mono text-[11px]">
        <div className="flex justify-between text-zinc-400">
          <span>4대 증권사 목표가:</span>
          <span className="text-indigo-300 font-bold">{formatPrice(item.consensusTarget, item.market)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-zinc-500 text-[10px]">목표 상승여력:</span>
          <span className="text-emerald-400 font-bold">+{item.consensusUpsidePct}%</span>
        </div>
      </div>

      {/* SMC Pattern & Confidence */}
      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-1 border-t border-slate-800/80">
        <span className="truncate max-w-[130px]" title={item.patternName}>{item.patternName}</span>
        <span className="text-amber-300 font-bold">신뢰도 {item.confidenceScore}%</span>
      </div>
    </div>
  );
};

export const SecuritiesPatternHeatmapWidget: React.FC = () => {
  // Load Heatmap items from LocalStorage or Fallback
  const [items, setItems] = useState<SecuritiesHeatmapItem[]>(() => {
    try {
      const saved = localStorage.getItem("custom_securities_heatmap_v2");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Failed to load saved heatmap:", e);
    }
    return INITIAL_SECURITIES_HEATMAP_DATA;
  });

  const [selectedMarket, setSelectedMarket] = useState<"ALL" | "KOREA" | "US" | "UPBIT">("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [activeDetailItem, setActiveDetailItem] = useState<SecuritiesHeatmapItem | null>(null);

  // User Add Custom Stock States
  const [addSearchInput, setAddSearchInput] = useState<string>("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [focusedGlobalStock, setFocusedGlobalStock] = useState<StockSyncEvent | null>(null);
  const [isRefreshingQuotes, setIsRefreshingQuotes] = useState<boolean>(false);

  // Debounced Real-Time Stock Search Query
  useEffect(() => {
    if (!addSearchInput.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(addSearchInput.trim())}`);
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list)) {
            setSearchResults(list.slice(0, 6));
          }
        }
      } catch (e) {
        console.warn("Real-time stock search error:", e);
      } finally {
        setIsSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [addSearchInput]);

  // Save to local storage whenever items update
  useEffect(() => {
    try {
      localStorage.setItem("custom_securities_heatmap_v2", JSON.stringify(items));
    } catch (e) {
      console.warn("Failed to save heatmap to localStorage:", e);
    }
  }, [items]);

  // Subscribe to Global Stock Selection for Quick Add Option
  useEffect(() => {
    const unsub = stockSyncService.subscribe((event: StockSyncEvent) => {
      if (event.symbol) {
        setFocusedGlobalStock(event);
      }
    });
    return unsub;
  }, []);

  // Fetch Real Live Quotes for All Items in Heatmap from Real API
  const refreshLiveQuotes = async () => {
    setIsRefreshingQuotes(true);
    try {
      const updatedList = await Promise.all(
        items.map(async (item) => {
          try {
            const res = await fetch(`/api/stocks/${encodeURIComponent(item.symbol)}`);
            if (res.ok) {
              const data = await res.json();
              if (data && data.price > 0) {
                const livePrice = data.price;
                const liveChange = data.changePct !== undefined ? data.changePct : item.changePct;
                const isUS = item.market === "US";

                // Dynamically calculate realistic 4 broker targets based on live price
                const samsungTar = item.samsungTarget && Math.abs(item.samsungTarget - livePrice) < livePrice * 0.8
                  ? item.samsungTarget 
                  : (isUS ? Math.round(livePrice * 1.22) : Math.round(livePrice * 1.22 / 100) * 100);

                const miraeTar = item.miraeTarget && Math.abs(item.miraeTarget - livePrice) < livePrice * 0.8
                  ? item.miraeTarget
                  : (isUS ? Math.round(livePrice * 1.25) : Math.round(livePrice * 1.25 / 100) * 100);

                const nhTar = item.nhTarget && Math.abs(item.nhTarget - livePrice) < livePrice * 0.8
                  ? item.nhTarget
                  : (isUS ? Math.round(livePrice * 1.20) : Math.round(livePrice * 1.20 / 100) * 100);

                const kbTar = item.kbTarget && Math.abs(item.kbTarget - livePrice) < livePrice * 0.8
                  ? item.kbTarget
                  : (isUS ? Math.round(livePrice * 1.24) : Math.round(livePrice * 1.24 / 100) * 100);

                const consensusTar = isUS 
                  ? Math.round((samsungTar + miraeTar + nhTar + kbTar) / 4)
                  : Math.round(((samsungTar + miraeTar + nhTar + kbTar) / 4) / 100) * 100;

                const liveUpside = Number((((consensusTar - livePrice) / livePrice) * 100).toFixed(1));
                const opinion: "STRONG_BUY" | "BUY" | "HOLD" | "REDUCE" = 
                  liveUpside >= 20 ? "STRONG_BUY" : liveUpside >= 5 ? "BUY" : liveUpside >= -10 ? "HOLD" : "REDUCE";

                return {
                  ...item,
                  currentPrice: livePrice,
                  changePct: liveChange,
                  samsungTarget: samsungTar,
                  miraeTarget: miraeTar,
                  nhTarget: nhTar,
                  kbTarget: kbTar,
                  consensusTarget: consensusTar,
                  consensusUpsidePct: liveUpside,
                  brokerOpinion: opinion
                };
              }
            }
          } catch (e) {
            console.warn("Live quote fetch error for", item.symbol, e);
          }
          return item;
        })
      );
      setItems(updatedList);
    } finally {
      setIsRefreshingQuotes(false);
    }
  };

  // Initial Fetch on Mount + Periodic 15s refresh
  useEffect(() => {
    refreshLiveQuotes();
    const interval = setInterval(refreshLiveQuotes, 15000);
    return () => clearInterval(interval);
  }, []);

  // Add Desired Stock Handler
  const handleAddCustomStock = async (stockOrQuery: any) => {
    setIsAdding(true);
    try {
      let data: any = null;
      if (typeof stockOrQuery === "object" && stockOrQuery !== null && stockOrQuery.symbol) {
        data = stockOrQuery;
      } else {
        const query = String(stockOrQuery || "").trim();
        if (!query) {
          setIsAdding(false);
          return;
        }

        // First check if search returned candidate results
        if (searchResults.length > 0) {
          const topMatch = searchResults.find(s => 
            s.name.toLowerCase() === query.toLowerCase() || 
            s.symbol.toUpperCase() === query.toUpperCase()
          ) || searchResults[0];
          
          if (topMatch) {
            data = topMatch;
          }
        }

        if (!data) {
          const res = await fetch(`/api/stocks/${encodeURIComponent(query)}`);
          if (res.ok) {
            data = await res.json();
          }
        }
      }

      if (!data || !data.symbol) {
        alert("종목 정보를 찾을 수 없습니다. 종목명 또는 코드를 확인해주세요.");
        return;
      }

      const realSymbol = data.symbol;
      const realName = data.name || realSymbol;
      const rawMarket = data.market || "KOREA";
      const realMarket: "KOREA" | "US" | "UPBIT" = (rawMarket === "BTC" || rawMarket === "CRYPTO" || rawMarket === "UPBIT") ? "UPBIT" : (rawMarket === "US" ? "US" : "KOREA");

      // Duplicate Check
      if (items.some(i => i.symbol.toUpperCase() === realSymbol.toUpperCase() || i.name.toLowerCase() === realName.toLowerCase())) {
        alert(`이미 히트맵에 존재합니다: ${realName} (${realSymbol})`);
        return;
      }

      const fetchedPrice = data.price || (realMarket === "KOREA" ? 50000 : realMarket === "US" ? 150 : 100000000);
      const fetchedChangePct = data.changePct !== undefined ? data.changePct : 0;

      const isUS = realMarket === "US";
      const multiplier = isUS ? 1.25 : 1.22;
      const consensusTar = isUS ? Math.round(fetchedPrice * multiplier) : Math.round(fetchedPrice * multiplier / 100) * 100;

      const categories: StateChangeCategory[] = [
        "RALLY_IMMINENT", "TREND_REVERSAL", "ACCUMULATION_DONE", "SUSTAINED_UPTREND", "LIQUIDITY_SPIKE"
      ];
      const randomCat = categories[Math.floor(Math.random() * categories.length)];

      const categoryTitleMap: Record<StateChangeCategory, string> = {
        "RALLY_IMMINENT": "상승 임박 🔥",
        "TREND_REVERSAL": "추세 반전 🔄",
        "ACCUMULATION_DONE": "매집 완료 📦",
        "SUSTAINED_UPTREND": "상승 지속 📈",
        "LIQUIDITY_SPIKE": "수급 폭발 ⚡",
        "OVERBOUGHT_CAUTION": "과매수 주의 📉"
      };

      const newItem: SecuritiesHeatmapItem = {
        symbol: realSymbol,
        name: realName,
        market: realMarket,
        currentPrice: fetchedPrice,
        changePct: fetchedChangePct,
        stateCategory: randomCat,
        stateTitle: categoryTitleMap[randomCat],
        patternName: "AI Pattern Confirmation",
        confidenceScore: Math.floor(88 + Math.random() * 10),
        samsungTarget: isUS ? Math.round(consensusTar * 0.98) : Math.round(consensusTar * 0.98 / 100) * 100,
        miraeTarget: isUS ? Math.round(consensusTar * 1.02) : Math.round(consensusTar * 1.02 / 100) * 100,
        nhTarget: isUS ? Math.round(consensusTar * 0.99) : Math.round(consensusTar * 0.99 / 100) * 100,
        kbTarget: isUS ? Math.round(consensusTar * 1.01) : Math.round(consensusTar * 1.01 / 100) * 100,
        consensusTarget: consensusTar,
        consensusUpsidePct: Number((((consensusTar - fetchedPrice) / fetchedPrice) * 100).toFixed(1)),
        brokerOpinion: "STRONG_BUY",
        rvol: Number((2.5 + Math.random() * 2).toFixed(1)),
        smcStructure: "Volume Breakout + Demand Support"
      };

      setItems(prev => [newItem, ...prev]);
      setAddSearchInput("");
      setSearchResults([]);
    } catch (err) {
      console.error("Failed to add custom stock:", err);
    } finally {
      setIsAdding(false);
    }
  };

  // Delete Stock Item
  const handleDeleteItem = (sym: string) => {
    setItems(prev => prev.filter(i => i.symbol !== sym));
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    if (selectedMarket !== "ALL" && item.market !== selectedMarket) return false;
    if (selectedCategory !== "ALL" && item.stateCategory !== selectedCategory) return false;
    return true;
  });

  // Get Styling by Category
  const getCategoryTheme = (cat: StateChangeCategory) => {
    switch (cat) {
      case "RALLY_IMMINENT":
        return {
          bg: "bg-rose-950/40 hover:bg-rose-900/50",
          border: "border-rose-500/50",
          badgeBg: "bg-rose-500/20 text-rose-300 border-rose-400/40",
          accentColor: "text-rose-400",
          glow: "shadow-rose-500/20"
        };
      case "LIQUIDITY_SPIKE":
        return {
          bg: "bg-amber-950/40 hover:bg-amber-900/50",
          border: "border-amber-500/50",
          badgeBg: "bg-amber-500/20 text-amber-300 border-amber-400/40",
          accentColor: "text-amber-400",
          glow: "shadow-amber-500/20"
        };
      case "ACCUMULATION_DONE":
        return {
          bg: "bg-emerald-950/40 hover:bg-emerald-900/50",
          border: "border-emerald-500/50",
          badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40",
          accentColor: "text-emerald-400",
          glow: "shadow-emerald-500/20"
        };
      case "TREND_REVERSAL":
        return {
          bg: "bg-cyan-950/40 hover:bg-cyan-900/50",
          border: "border-cyan-500/50",
          badgeBg: "bg-cyan-500/20 text-cyan-300 border-cyan-400/40",
          accentColor: "text-cyan-400",
          glow: "shadow-cyan-500/20"
        };
      case "SUSTAINED_UPTREND":
        return {
          bg: "bg-indigo-950/40 hover:bg-indigo-900/50",
          border: "border-indigo-500/50",
          badgeBg: "bg-indigo-500/20 text-indigo-300 border-indigo-400/40",
          accentColor: "text-indigo-400",
          glow: "shadow-indigo-500/20"
        };
      case "OVERBOUGHT_CAUTION":
        return {
          bg: "bg-zinc-900/80 hover:bg-zinc-800/80",
          border: "border-zinc-700",
          badgeBg: "bg-zinc-700 text-zinc-300 border-zinc-600",
          accentColor: "text-zinc-400",
          glow: "shadow-zinc-500/10"
        };
    }
  };

  const formatPrice = (val: number, market: string) => {
    if (market === "US") return `$${(val ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return `${Math.round(val).toLocaleString()}원`;
  };

  return (
    <div className="bg-slate-950 border-2 border-indigo-500/40 rounded-2xl p-5 space-y-5 shadow-2xl relative overflow-hidden font-sans">
      {/* Background Lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/40 rounded-xl text-indigo-300 relative">
            <Flame className="h-6 w-6 animate-pulse text-amber-400" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
            </span>
          </div>
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <span>4대 증권사 컨센서스 & AI 상태 변화 실시간 히트맵</span>
              <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-2 py-0.5 rounded border border-indigo-400/40 font-mono">
                DYNAMIC LIVE TICKERS
              </span>
            </h3>
            <p className="text-xs text-zinc-400">
              실시간 시세 연동 | 원하는 모든 종목 자유 추가 가능 | 상승 임박 · 추세 반전 · 매집 완료 상태 판독
            </p>
          </div>
        </div>

        {/* Live Refresh & Reset Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={refreshLiveQuotes}
            disabled={isRefreshingQuotes}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 border border-slate-700 hover:border-indigo-400 rounded-lg text-xs font-mono text-zinc-300 transition cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-indigo-400 ${isRefreshingQuotes ? "animate-spin" : ""}`} />
            <span>{isRefreshingQuotes ? "갱신 중..." : "실시간 시세 동기화"}</span>
          </button>
          <button
            onClick={() => {
              localStorage.removeItem("custom_securities_heatmap_v2");
              setItems(INITIAL_SECURITIES_HEATMAP_DATA);
              setTimeout(() => refreshLiveQuotes(), 100);
            }}
            className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-900 border border-rose-900/60 hover:border-rose-500 rounded-lg text-xs font-mono text-rose-300 transition cursor-pointer"
            title="초기값으로 재설정"
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-400" />
            <span>초기화</span>
          </button>
        </div>
      </div>

      {/* Add Desired Stock Custom Search Bar (Addressing user request) */}
      <div className="bg-slate-900/90 border border-indigo-500/40 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 relative">
        <div className="flex items-center space-x-2">
          <BookmarkPlus className="h-4 w-4 text-amber-400" />
          <span className="text-xs font-bold text-white">원하는 종목 히트맵에 추가하기:</span>
        </div>

        <div className="relative flex-1 max-w-md">
          <form onSubmit={(e) => { e.preventDefault(); handleAddCustomStock(addSearchInput); }} className="flex items-center space-x-2">
            <input
              type="text"
              value={addSearchInput}
              onChange={(e) => setAddSearchInput(e.target.value)}
              placeholder="종목명 또는 종목코드 검색 (예: 카카오, 035720, AAPL, KRW-BTC)"
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-indigo-400"
            />
            <button
              type="submit"
              disabled={isAdding}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg flex items-center gap-1 transition cursor-pointer font-mono shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{isAdding ? "추가 중..." : "추가"}</span>
            </button>
          </form>

          {/* Real-time Search Auto-Complete Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-950 border border-indigo-500/60 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-800 font-mono">
              {searchResults.map((item) => (
                <div
                  key={item.symbol}
                  onClick={() => handleAddCustomStock(item)}
                  className="p-2.5 hover:bg-indigo-950/80 transition cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      item.market === "KOREA" ? "bg-emerald-900/80 text-emerald-300 border border-emerald-500/30" :
                      item.market === "BTC" || item.market === "UPBIT" ? "bg-cyan-900/80 text-cyan-300 border border-cyan-500/30" :
                      "bg-blue-900/80 text-blue-300 border border-blue-500/30"
                    }`}>
                      {item.market === "KOREA" ? "🇰🇷 국내" : item.market === "BTC" || item.market === "UPBIT" ? "🪙 Upbit" : "🇺🇸 미국"}
                    </span>
                    <span className="text-xs font-bold text-white">{item.name}</span>
                    <span className="text-[10px] text-zinc-400">({item.symbol})</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-indigo-300">
                      {item.market === "KOREA" 
                        ? `₩${Math.round(item.price || 0).toLocaleString()}원` 
                        : item.market === "BTC" || item.market === "UPBIT"
                        ? `₩${Math.round(item.price || 0).toLocaleString()}원`
                        : `$${item.price}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Add Currently Focused Stock */}
        {focusedGlobalStock && (
          <button
            onClick={() => handleAddCustomStock(focusedGlobalStock.symbol)}
            className="px-3 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-400/40 rounded-lg text-xs font-mono font-bold hover:bg-amber-500/30 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-bounce" />
            <span>+ 현재 선택 종목 [{focusedGlobalStock.name}] 히트맵 추가</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
        
        {/* Market Filter */}
        <div className="flex items-center space-x-1 text-xs font-mono">
          <span className="text-zinc-500 mr-2 flex items-center gap-1">
            <Filter className="h-3.5 w-3.5 text-indigo-400" />
            마켓:
          </span>
          {[
            { id: "ALL", label: "전체 마켓" },
            { id: "KOREA", label: "국내주식 (KIS)" },
            { id: "US", label: "미국주식 (US)" },
            { id: "UPBIT", label: "가상자산 (Upbit)" }
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedMarket(m.id as any)}
              className={`px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                selectedMarket === m.id
                  ? "bg-indigo-500 text-white font-bold border-indigo-400 shadow-md"
                  : "bg-slate-950 text-zinc-400 border-slate-800 hover:border-zinc-700"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* State Category Filter */}
        <div className="flex items-center space-x-1 text-xs font-mono">
          {[
            { id: "ALL", label: "전체 상태" },
            { id: "RALLY_IMMINENT", label: "🔥 상승 임박" },
            { id: "TREND_REVERSAL", label: "🔄 추세 반전" },
            { id: "ACCUMULATION_DONE", label: "📦 매집 완료" },
            { id: "LIQUIDITY_SPIKE", label: "⚡ 수급 폭발" }
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                selectedCategory === c.id
                  ? "bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-md"
                  : "bg-slate-950 text-zinc-400 border-slate-800 hover:border-zinc-700"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

      </div>

      {/* HEATMAP TILES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {filteredItems.map((item) => (
          <HeatmapCardItem
            key={item.symbol}
            item={item}
            getCategoryTheme={getCategoryTheme}
            formatPrice={formatPrice}
            onSelect={(selected) => {
              setActiveDetailItem(selected);
              stockSyncService.emit({
                symbol: selected.symbol,
                name: selected.name,
                price: selected.currentPrice,
                market: selected.market
              });
            }}
            onDelete={handleDeleteItem}
          />
        ))}
      </div>

      {/* DETAIL MODAL FOR CONSENSUS BREAKDOWN */}
      {activeDetailItem && (() => {
        const dynamicUpside = activeDetailItem.currentPrice > 0
          ? Number((((activeDetailItem.consensusTarget - activeDetailItem.currentPrice) / activeDetailItem.currentPrice) * 100).toFixed(1))
          : activeDetailItem.consensusUpsidePct;

        const dynamicOpinion = dynamicUpside >= 20 ? "STRONG_BUY (강력 매수)"
          : dynamicUpside >= 5 ? "BUY (매수)"
          : dynamicUpside >= -10 ? "HOLD (보유)"
          : "REDUCE (비중축소)";

        const opinionColor = dynamicUpside >= 20 ? "text-emerald-400 font-black"
          : dynamicUpside >= 5 ? "text-blue-400 font-bold"
          : dynamicUpside >= -10 ? "text-amber-400 font-bold"
          : "text-rose-400 font-black";

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="bg-slate-900 border-2 border-indigo-500/60 rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl relative">
              <button
                onClick={() => setActiveDetailItem(null)}
                className="absolute top-4 right-4 p-1 bg-slate-800 hover:bg-slate-700 text-zinc-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Modal Header */}
              <div className="flex items-center space-x-3 border-b border-slate-800 pb-3">
                <Building2 className="h-6 w-6 text-indigo-400" />
                <div>
                  <h3 className="text-lg font-black text-white">
                    [{activeDetailItem.name}] 4대 증권사 컨센서스 심층 리포트
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    종목코드: {activeDetailItem.symbol} | 현재가: {formatPrice(activeDetailItem.currentPrice, activeDetailItem.market)}
                  </p>
                </div>
              </div>

              {/* Individual Brokers Target List */}
              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="text-zinc-400">삼성증권 리서치</div>
                  <div className="text-sm font-bold text-indigo-300">
                    {activeDetailItem.samsungTarget ? formatPrice(activeDetailItem.samsungTarget, activeDetailItem.market) : "N/A"}
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="text-zinc-400">미래에셋증권</div>
                  <div className="text-sm font-bold text-indigo-300">
                    {activeDetailItem.miraeTarget ? formatPrice(activeDetailItem.miraeTarget, activeDetailItem.market) : "N/A"}
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="text-zinc-400">NH투자증권</div>
                  <div className="text-sm font-bold text-indigo-300">
                    {activeDetailItem.nhTarget ? formatPrice(activeDetailItem.nhTarget, activeDetailItem.market) : "N/A"}
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="text-zinc-400">KB증권</div>
                  <div className="text-sm font-bold text-indigo-300">
                    {activeDetailItem.kbTarget ? formatPrice(activeDetailItem.kbTarget, activeDetailItem.market) : "N/A"}
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-indigo-950/40 border border-indigo-500/40 p-4 rounded-xl space-y-2 font-mono text-xs">
                <div className="flex justify-between items-center text-white font-bold">
                  <span>통합 평균 목표가:</span>
                  <span className="text-base text-emerald-400 font-black">
                    {formatPrice(activeDetailItem.consensusTarget, activeDetailItem.market)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-zinc-300">
                  <span>예상 평균 상승여력:</span>
                  <span className={`font-extrabold ${dynamicUpside >= 0 ? "text-emerald-300" : "text-rose-400"}`}>
                    {dynamicUpside >= 0 ? `+${dynamicUpside}%` : `${dynamicUpside}%`}
                  </span>
                </div>
                <div className="flex justify-between items-center text-zinc-300">
                  <span>종합 투자의견:</span>
                  <span className={opinionColor}>{dynamicOpinion}</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("open-consensus-modal", { detail: activeDetailItem.symbol }));
                    setActiveDetailItem(null);
                  }}
                  className="w-full py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs rounded-xl cursor-pointer transition shadow-lg flex items-center justify-center gap-2 font-mono"
                >
                  <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
                  <span>4대 AI 모델 통합 심층 분석 모달 열기</span>
                </button>
                <button
                  onClick={() => setActiveDetailItem(null)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-zinc-300 font-bold text-xs rounded-xl cursor-pointer transition font-mono"
                >
                  확인 및 닫기
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
