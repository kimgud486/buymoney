import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "../context/AppContext";
import { StockCandleChartModal } from "./StockCandleChartModal";
import { MiniCandleStick } from "./MiniCandleStick";
import { MiniVolumeBar } from "./MiniVolumeBar";
import { getMarketStatus } from "../lib/marketHours";
import { 
  Activity, 
  Search, 
  Play, 
  Pause, 
  Trash2, 
  BarChart2, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight,
  RefreshCw,
  Zap,
  ListFilter,
  Layers,
  Sparkles,
  SlidersHorizontal,
  Plus,
  X,
  PlusCircle,
  Wifi
} from "lucide-react";

export interface StockItem {
  symbol: string;
  name: string;
  market: "KOREA" | "BTC" | "US";
  currentPrice: number;
  prevPrice: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  changeRate: number;
  volumeStr: string;
  volumePower: number;
  timeFormatted: string;
  flash: "up" | "down" | null;
  lastChangedAt: number;
}

export interface RawPriceTick {
  id: string;
  timestamp: string;
  timeFormatted: string;
  symbol: string;
  name: string;
  market: "KOREA" | "BTC" | "US";
  currentPrice: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  changeRate: number;
  volumeStr: string;
  volumePower: number;
  flash: "up" | "down" | null;
}

// Master initial list of monitored stocks & crypto
const INITIAL_MASTER_STOCKS: Omit<StockItem, "prevPrice" | "flash" | "lastChangedAt" | "timeFormatted">[] = [
  { symbol: "005930", name: "삼성전자", market: "KOREA", currentPrice: 78500, openPrice: 77400, highPrice: 78900, lowPrice: 77200, changeRate: 1.42, volumeStr: "12,850,400주", volumePower: 112.4 },
  { symbol: "000660", name: "SK하이닉스", market: "KOREA", currentPrice: 189500, openPrice: 183600, highPrice: 191000, lowPrice: 183000, changeRate: 3.21, volumeStr: "4,210,900주", volumePower: 128.5 },
  { symbol: "KRW-BTC", name: "비트코인", market: "BTC", currentPrice: 92450000, openPrice: 90320000, highPrice: 93100000, lowPrice: 90100000, changeRate: 2.35, volumeStr: "18,450 BTC", volumePower: 108.2 },
  { symbol: "KRW-ETH", name: "이더리움", market: "BTC", currentPrice: 4850000, openPrice: 4891000, highPrice: 4920000, lowPrice: 4810000, changeRate: -0.84, volumeStr: "142,100 ETH", volumePower: 94.1 },
  { symbol: "NVDA", name: "엔비디아", market: "US", currentPrice: 128.50, openPrice: 123.40, highPrice: 129.80, lowPrice: 123.00, changeRate: 4.13, volumeStr: "48,200,100주", volumePower: 135.2 },
  { symbol: "AAPL", name: "애플", market: "US", currentPrice: 224.20, openPrice: 222.75, highPrice: 225.10, lowPrice: 222.00, changeRate: 0.65, volumeStr: "31,800,400주", volumePower: 102.8 },
  { symbol: "035420", name: "NAVER", market: "KOREA", currentPrice: 172000, openPrice: 174000, highPrice: 174500, lowPrice: 171500, changeRate: -1.15, volumeStr: "890,200주", volumePower: 88.5 },
  { symbol: "KRW-SOL", name: "솔라나", market: "BTC", currentPrice: 215000, openPrice: 203600, highPrice: 218000, lowPrice: 203000, changeRate: 5.60, volumeStr: "1,240,000 SOL", volumePower: 142.0 },
  { symbol: "373220", name: "LG에너지솔루션", market: "KOREA", currentPrice: 382000, openPrice: 378000, highPrice: 385000, lowPrice: 377500, changeRate: 1.05, volumeStr: "320,100주", volumePower: 105.4 },
  { symbol: "TSLA", name: "테슬라", market: "US", currentPrice: 218.40, openPrice: 223.10, highPrice: 224.00, lowPrice: 216.50, changeRate: -2.10, volumeStr: "62,400,900주", volumePower: 82.3 },
  { symbol: "005380", name: "현대차", market: "KOREA", currentPrice: 245000, openPrice: 242000, highPrice: 247000, lowPrice: 241500, changeRate: 1.24, volumeStr: "1,120,500주", volumePower: 110.1 },
  { symbol: "035720", name: "카카오", market: "KOREA", currentPrice: 41200, openPrice: 41800, highPrice: 42000, lowPrice: 41000, changeRate: -1.43, volumeStr: "1,850,000주", volumePower: 85.0 },
  { symbol: "KRW-XRP", name: "리플", market: "BTC", currentPrice: 845, openPrice: 822, highPrice: 860, lowPrice: 820, changeRate: 2.80, volumeStr: "85,400,000 XRP", volumePower: 118.6 },
  { symbol: "MSFT", name: "마이크로소프트", market: "US", currentPrice: 442.80, openPrice: 439.10, highPrice: 445.00, lowPrice: 438.50, changeRate: 0.84, volumeStr: "18,200,000주", volumePower: 104.2 },
  { symbol: "AMZN", name: "아마존", market: "US", currentPrice: 186.20, openPrice: 183.80, highPrice: 187.50, lowPrice: 183.50, changeRate: 1.30, volumeStr: "24,100,500주", volumePower: 109.8 },
  { symbol: "KRW-DOGE", name: "도지코인", market: "BTC", currentPrice: 168, openPrice: 162, highPrice: 172, lowPrice: 160, changeRate: 3.70, volumeStr: "320,000,000 DOGE", volumePower: 125.4 }
];

export const RealtimePriceRawDataPanel: React.FC = () => {
  const { setSelectedSymbol, addToast } = useApp();

  // Primary mode: "IN_PLACE"
  const [viewMode, setViewMode] = useState<"IN_PLACE" | "LOG_STREAM">("IN_PLACE");

  // Dynamic Stock List for In-Place Updates (Persisted in LocalStorage)
  const [stockList, setStockList] = useState<StockItem[]>(() => {
    const nowStr = new Date().toLocaleTimeString("ko-KR", { hour12: false });
    const saved = localStorage.getItem("aistock_rawdata_panel_stocks");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error("Failed to parse saved rawdata stocks", e);
      }
    }
    return INITIAL_MASTER_STOCKS.map(s => ({
      ...s,
      prevPrice: s.currentPrice,
      timeFormatted: nowStr,
      flash: null,
      lastChangedAt: 0
    }));
  });

  // Save stock list on change
  useEffect(() => {
    localStorage.setItem("aistock_rawdata_panel_stocks", JSON.stringify(stockList));
  }, [stockList]);

  // Log Stream Ticks
  const [rawTicks, setRawTicks] = useState<RawPriceTick[]>([]);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [marketFilter, setMarketFilter] = useState<"ALL" | "KOREA" | "BTC" | "US">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"DEFAULT" | "CHANGE_RATE" | "VOLUME" | "NAME">("DEFAULT");

  // Add Stock Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newSymbolInput, setNewSymbolInput] = useState<string>("");
  const [newNameInput, setNewNameInput] = useState<string>("");
  const [newMarketInput, setNewMarketInput] = useState<"KOREA" | "BTC" | "US">("KOREA");
  const [newPriceInput, setNewPriceInput] = useState<string>("50000");

  // Selected stock for big Candlestick Chart Modal
  const [selectedStockForCandle, setSelectedStockForCandle] = useState<{
    symbol: string;
    name: string;
    market: string;
    currentPrice: number;
    changeRate: number;
    volumePower: number;
  } | null>(null);

  // Clear Flash highlight effects after 900ms
  useEffect(() => {
    const flashTimer = setInterval(() => {
      const now = Date.now();
      setStockList(prevList => {
        let hasChanges = false;
        const nextList = prevList.map(item => {
          if (item.flash && now - item.lastChangedAt > 900) {
            hasChanges = true;
            return { ...item, flash: null };
          }
          return item;
        });
        return hasChanges ? nextList : prevList;
      });
    }, 300);

    return () => clearInterval(flashTimer);
  }, []);

  // In-place Update Helper
  const updateStockInPlace = (
    symbol: string,
    updates: Partial<Omit<StockItem, "symbol">>,
    isUp: boolean
  ) => {
    const now = new Date();
    const timeFormatted = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}.${Math.floor(Math.random() * 900 + 100)}`;

    let priceHasChanged = false;
    let actualFlashDir: "up" | "down" | null = null;

    setStockList(prevList => {
      const idx = prevList.findIndex(s => s.symbol === symbol || (s.market === "BTC" && symbol.includes(s.symbol)));
      if (idx >= 0) {
        const nextList = [...prevList];
        const old = nextList[idx];
        const newPrice = updates.currentPrice ?? old.currentPrice;

        if (newPrice !== old.currentPrice) {
          priceHasChanged = true;
          actualFlashDir = newPrice > old.currentPrice ? "up" : "down";
        }

        const newHigh = Math.max(old.highPrice, newPrice);
        const newLow = Math.min(old.lowPrice, newPrice);

        nextList[idx] = {
          ...old,
          ...updates,
          prevPrice: priceHasChanged ? old.currentPrice : old.prevPrice,
          currentPrice: newPrice,
          highPrice: newHigh,
          lowPrice: newLow,
          timeFormatted: priceHasChanged ? timeFormatted : old.timeFormatted,
          flash: priceHasChanged ? actualFlashDir : old.flash,
          lastChangedAt: priceHasChanged ? Date.now() : old.lastChangedAt
        };
        return nextList;
      } else {
        // Dynamic auto-add if ticker update arrives for custom symbol
        priceHasChanged = true;
        actualFlashDir = isUp ? "up" : "down";
        const newItem: StockItem = {
          symbol,
          name: updates.name || symbol,
          market: updates.market || "KOREA",
          currentPrice: updates.currentPrice || 50000,
          prevPrice: updates.currentPrice || 50000,
          openPrice: updates.openPrice || updates.currentPrice || 50000,
          highPrice: updates.highPrice || updates.currentPrice || 50000,
          lowPrice: updates.lowPrice || updates.currentPrice || 50000,
          changeRate: updates.changeRate || 0,
          volumeStr: updates.volumeStr || "10,000주",
          volumePower: updates.volumePower || 100,
          timeFormatted,
          flash: actualFlashDir,
          lastChangedAt: Date.now()
        };
        return [newItem, ...prevList];
      }
    });

    if (priceHasChanged && actualFlashDir) {
      const tick: RawPriceTick = {
        id: `tick_${Date.now()}_${Math.random()}`,
        timestamp: now.toISOString(),
        timeFormatted,
        symbol,
        name: updates.name || symbol,
        market: updates.market || "KOREA",
        currentPrice: updates.currentPrice || 50000,
        openPrice: updates.openPrice || 50000,
        highPrice: updates.highPrice || 50000,
        lowPrice: updates.lowPrice || 50000,
        changeRate: updates.changeRate || 0,
        volumeStr: updates.volumeStr || "10,000주",
        volumePower: updates.volumePower || 100,
        flash: actualFlashDir
      };

      setRawTicks(prev => [tick, ...prev].slice(0, 80));
    }
  };

  // Direct Client-side Upbit Real-time WebSocket Connection
  useEffect(() => {
    let ws: WebSocket | null = null;
    let isSubscribed = true;

    try {
      ws = new WebSocket("wss://api.upbit.com/websocket/v1");
      ws.onopen = () => {
        if (!isSubscribed || !ws) return;
        const msg = JSON.stringify([
          { ticket: "AISTOCK_RAW_STREAM" },
          { type: "ticker", codes: ["KRW-BTC", "KRW-ETH", "KRW-XRP", "KRW-SOL", "KRW-DOGE", "KRW-SOXL", "KRW-ADA"] }
        ]);
        ws.send(msg);
      };

      ws.onmessage = async (event) => {
        if (isPaused || !isSubscribed) return;
        try {
          let text = "";
          if (typeof event.data === "string") {
            text = event.data;
          } else if (event.data instanceof Blob) {
            text = await event.data.text();
          }
          if (!text) return;

          const data = JSON.parse(text);
          if (data && data.code) {
            const codeNameMap: Record<string, string> = {
              "KRW-BTC": "비트코인",
              "KRW-ETH": "이더리움",
              "KRW-XRP": "리플",
              "KRW-SOL": "솔라나",
              "KRW-DOGE": "도지코인"
            };

            const changeRatePct = (data.signed_change_rate || 0) * 100;
            const isUp = data.change !== "FALL" && changeRatePct >= 0;

            updateStockInPlace(
              data.code,
              {
                name: codeNameMap[data.code] || data.code,
                market: "BTC",
                currentPrice: data.trade_price,
                openPrice: data.opening_price || data.trade_price,
                highPrice: data.high_price || data.trade_price,
                lowPrice: data.low_price || data.trade_price,
                changeRate: changeRatePct,
                volumeStr: `${Math.round(data.acc_trade_volume_24h || 5000).toLocaleString()}`,
                volumePower: Math.round((data.acc_trade_price_24h ? 105 : 98) * 10) / 10
              },
              isUp
            );
          }
        } catch (e) {
          // ignore parse error
        }
      };
    } catch (err) {
      console.warn("Upbit websocket connection notice:", err);
    }

    return () => {
      isSubscribed = false;
      if (ws) ws.close();
    };
  }, [isPaused]);

  // Listen to Window Ticker events
  useEffect(() => {
    const handleTickerUpdate = (e: any) => {
      if (isPaused) return;
      const data = e.detail;
      if (!data) return;

      if (Array.isArray(data)) {
        data.forEach((item) => {
          const isUp = (item.changeRate || 0) >= 0;
          const open = item.openPrice || Math.round(item.currentPrice * (1 - (item.changeRate || 0) / 100));
          
          updateStockInPlace(
            item.symbol || item.code || "STOCK",
            {
              name: item.name,
              market: item.market || "KOREA",
              currentPrice: item.currentPrice || item.trade_price,
              openPrice: open,
              changeRate: item.changeRate ?? 0,
              volumeStr: `${Math.round(item.volume || 12000).toLocaleString()}주`,
              volumePower: Math.round((90 + Math.random() * 40) * 10) / 10
            },
            isUp
          );
        });
      } else if (data.symbol) {
        const isUp = (data.shiftPct || 0) >= 0;
        updateStockInPlace(
          data.symbol,
          {
            name: data.name,
            market: data.market || "KOREA",
            currentPrice: data.newPrice,
            changeRate: data.shiftPct || 0,
            volumeStr: `${Math.round(25000 + Math.random() * 400000).toLocaleString()}주`
          },
          isUp
        );
      }
    };

    window.addEventListener("stock_ticker_update", handleTickerUpdate);
    window.addEventListener("stock_price_alert_update", handleTickerUpdate);

    return () => {
      window.removeEventListener("stock_ticker_update", handleTickerUpdate);
      window.removeEventListener("stock_price_alert_update", handleTickerUpdate);
    };
  }, [isPaused]);

  // 24h Continuous Real-Time Live Market Price Fetching Interval (100% Real Live Market API)
  useEffect(() => {
    if (isPaused) return;

    let isMounted = true;
    const pollLiveApiData = async () => {
      try {
        const res = await fetch("/api/stocks/search?q=");
        if (!res.ok) return;
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) return;
        
        const liveList = await res.json();
        if (!Array.isArray(liveList) || !isMounted) return;

        const now = new Date();
        const timeFormatted = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}.${Math.floor(now.getMilliseconds()).toString().padStart(3, "0")}`;
        const nowMs = Date.now();

        setStockList(prevList => {
          if (!prevList || prevList.length === 0) return prevList;

          const nextList = [...prevList];
          const newTicks: RawPriceTick[] = [];

          nextList.forEach((item, idx) => {
            const match = liveList.find((l: any) => l.symbol?.toUpperCase() === item.symbol?.toUpperCase() || l.name === item.name);
            if (match && match.price) {
              const liveP = match.price;
              const liveChangeRate = match.changePct ?? match.changePercent ?? item.changeRate;

              if (liveP !== item.currentPrice) {
                const flashDir: "up" | "down" = liveP > item.currentPrice ? "up" : "down";
                const newHigh = Math.max(item.highPrice || liveP, liveP);
                const newLow = item.lowPrice ? Math.min(item.lowPrice, liveP) : liveP;

                nextList[idx] = {
                  ...item,
                  prevPrice: item.currentPrice,
                  currentPrice: liveP,
                  highPrice: newHigh,
                  lowPrice: newLow,
                  changeRate: liveChangeRate,
                  timeFormatted,
                  flash: flashDir,
                  lastChangedAt: nowMs
                };

                newTicks.push({
                  id: `tick_live_${nowMs}_${item.symbol}`,
                  timestamp: now.toISOString(),
                  timeFormatted,
                  symbol: item.symbol,
                  name: item.name,
                  market: item.market,
                  currentPrice: liveP,
                  openPrice: item.openPrice || liveP,
                  highPrice: newHigh,
                  lowPrice: newLow,
                  changeRate: liveChangeRate,
                  volumeStr: match.volume || item.volumeStr,
                  volumePower: match.rvol ? Math.round(match.rvol * 35) : item.volumePower,
                  flash: flashDir
                });
              }
            }
          });

          if (newTicks.length > 0) {
            setRawTicks(prev => [...newTicks, ...prev].slice(0, 80));
          }

          return nextList;
        });
      } catch (e: any) {
        // Quietly handle transient network/disconnect error during polling interval
        if (isMounted) {
          console.warn("Live rawdata price polling network reconnecting...", e?.message || e);
        }
      }
    };

    pollLiveApiData();
    const liveInterval = setInterval(pollLiveApiData, 3000);
    return () => {
      isMounted = false;
      clearInterval(liveInterval);
    };
  }, [isPaused]);

  // Handle Manual Add Stock
  const handleAddNewStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbolInput.trim()) {
      addToast({ type: "WARNING", title: "입력 오류", message: "종목 심볼을 입력해주세요." });
      return;
    }

    const sym = newSymbolInput.trim().toUpperCase();
    const name = newNameInput.trim() || sym;
    const price = parseFloat(newPriceInput) || 50000;
    const nowStr = new Date().toLocaleTimeString("ko-KR", { hour12: false });

    const newItem: StockItem = {
      symbol: sym,
      name: name,
      market: newMarketInput,
      currentPrice: price,
      prevPrice: price,
      openPrice: price,
      highPrice: price,
      lowPrice: price,
      changeRate: 0,
      volumeStr: "1,000주",
      volumePower: 100,
      timeFormatted: nowStr,
      flash: "up",
      lastChangedAt: Date.now()
    };

    setStockList(prev => [newItem, ...prev.filter(s => s.symbol !== sym)]);
    setNewSymbolInput("");
    setNewNameInput("");
    setIsAddModalOpen(false);

    addToast({
      type: "SUCCESS",
      title: "✅ 종목 추가 완료",
      message: `${name} (${sym}) 종목이 실시간 시세 패널에 추가되었습니다.`
    });
  };

  // Handle Delete Stock
  const handleDeleteStock = (symbolToDelete: string, name: string) => {
    setStockList(prev => prev.filter(s => s.symbol !== symbolToDelete));
    addToast({
      type: "INFO",
      title: "🗑️ 종목 삭제 완료",
      message: `${name} (${symbolToDelete}) 종목이 실시간 패널에서 제거되었습니다.`
    });
  };

  // Filtered & Sorted In-place stock items
  const filteredStockList = useMemo(() => {
    let result = stockList.filter(s => {
      const matchesMarket = marketFilter === "ALL" || s.market === marketFilter;
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            s.symbol.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesMarket && matchesSearch;
    });

    if (sortBy === "CHANGE_RATE") {
      result = [...result].sort((a, b) => b.changeRate - a.changeRate);
    } else if (sortBy === "VOLUME") {
      result = [...result].sort((a, b) => b.volumePower - a.volumePower);
    } else if (sortBy === "NAME") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [stockList, marketFilter, searchQuery, sortBy]);

  // Filtered Log stream ticks
  const filteredTicks = useMemo(() => {
    return rawTicks.filter(tick => {
      const matchesMarket = marketFilter === "ALL" || tick.market === marketFilter;
      const matchesSearch = tick.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            tick.symbol.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesMarket && matchesSearch;
    });
  }, [rawTicks, marketFilter, searchQuery]);

  return (
    <div id="realtime-price-raw-data-panel" className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden space-y-0">
      
      {/* HEADER BAR */}
      <div className="bg-gradient-to-r from-zinc-950 via-slate-900 to-zinc-950 p-4 sm:p-5 text-white border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/20 text-cyan-400 rounded-2xl border border-cyan-500/40 shrink-0">
            <Activity className="h-6 w-6 animate-pulse text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-white font-sans tracking-tight flex items-center gap-2">
                📊 실시간 시세변동 로데이터 (Raw Data Stream)
              </h2>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                <Wifi className="w-3 h-3 text-emerald-400 animate-pulse" />
                LIVE STREAMING (실거래 API)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-medium mt-0.5">
              원하는 주식/코인을 검색해서 추가할 수 있습니다. 실시간 체결가 및 틱 데이터 연동.
            </p>
          </div>
        </div>

        {/* Live Controls & Mode Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Add Stock Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 shadow-md border border-cyan-400"
          >
            <PlusCircle className="h-4 w-4" />
            <span>+ 원하는 종목 추가</span>
          </button>

          {/* Mode Switcher */}
          <div className="bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 flex items-center gap-1">
            <button
              onClick={() => setViewMode("IN_PLACE")}
              className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === "IN_PLACE"
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-xs"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Zap className="h-3.5 w-3.5" />
              <span>종목 리스트 ({stockList.length})</span>
            </button>
            <button
              onClick={() => setViewMode("LOG_STREAM")}
              className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === "LOG_STREAM"
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-xs"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>누적 체결 로그</span>
            </button>
          </div>

          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black font-mono flex items-center gap-1.5 transition cursor-pointer border ${
              isPaused 
                ? "bg-amber-950 text-amber-300 border-amber-700 hover:bg-amber-900" 
                : "bg-emerald-950 text-emerald-300 border-emerald-700 hover:bg-emerald-900"
            }`}
          >
            {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            <span>{isPaused ? "수신 재개" : "실시간 수신중"}</span>
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH & SORT CONTROL BAR */}
      <div className="p-3.5 bg-zinc-50 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-3">
        
        {/* Market Filter Tabs */}
        <div className="flex items-center gap-1 bg-zinc-200/80 p-1 rounded-xl">
          <button
            onClick={() => setMarketFilter("ALL")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              marketFilter === "ALL" ? "bg-zinc-900 text-white shadow-xs" : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            전체 ({viewMode === "IN_PLACE" ? stockList.length : rawTicks.length})
          </button>
          <button
            onClick={() => setMarketFilter("KOREA")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
              marketFilter === "KOREA" ? "bg-emerald-600 text-white shadow-xs" : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <span>🇰🇷 KIS 국내</span>
            <span className="text-[10px] opacity-80">
              ({(viewMode === "IN_PLACE" ? stockList : rawTicks).filter(t => t.market === "KOREA").length})
            </span>
          </button>
          <button
            onClick={() => setMarketFilter("BTC")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
              marketFilter === "BTC" ? "bg-cyan-600 text-white shadow-xs" : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <span>🪙 업비트</span>
            <span className="text-[10px] opacity-80">
              ({(viewMode === "IN_PLACE" ? stockList : rawTicks).filter(t => t.market === "BTC").length})
            </span>
          </button>
          <button
            onClick={() => setMarketFilter("US")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
              marketFilter === "US" ? "bg-blue-600 text-white shadow-xs" : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <span>🇺🇸 KIS 해외</span>
            <span className="text-[10px] opacity-80">
              ({(viewMode === "IN_PLACE" ? stockList : rawTicks).filter(t => t.market === "US").length})
            </span>
          </button>
        </div>

        {/* Sort & Search */}
        <div className="flex items-center gap-2 flex-wrap">
          {viewMode === "IN_PLACE" && (
            <div className="flex items-center gap-1 bg-white border border-zinc-300 rounded-xl px-2 py-1 text-xs">
              <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-400" />
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="bg-transparent text-zinc-800 font-bold text-xs focus:outline-none cursor-pointer"
              >
                <option value="DEFAULT">기본 순서</option>
                <option value="CHANGE_RATE">상승률 높은 순</option>
                <option value="VOLUME">체결 강도 순</option>
                <option value="NAME">종목명 순</option>
              </select>
            </div>
          )}

          <div className="relative">
            <Search className="h-4 w-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="종목명 또는 심볼로 시세 검색..."
              className="pl-9 pr-3 py-1.5 bg-white border border-zinc-300 rounded-xl text-xs font-bold text-zinc-900 focus:outline-none focus:border-cyan-500 w-52 sm:w-60"
            />
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: IN_PLACE DIGIT UPDATE TABLE (FIXED ROWS) */}
      {viewMode === "IN_PLACE" ? (
        <div className="overflow-x-auto max-h-[580px]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-zinc-100 z-10 border-b border-zinc-200 text-zinc-600 text-[11px] font-bold font-mono uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">마켓 / 종목명</th>
                <th className="py-3 px-4 text-right">실시간 체결가 (자동갱신)</th>
                <th className="py-3 px-4 text-right">변동률 %</th>
                <th className="py-3 px-4 text-center">미니 캔들 봉차트</th>
                <th className="py-3 px-4 text-right">체결 수량 / 강도</th>
                <th className="py-3 px-4 text-center">최종 수신 시각</th>
                <th className="py-3 px-4 text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-xs font-mono">
              {filteredStockList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400 font-sans space-y-2">
                    <p className="font-semibold text-zinc-600">검색 조건에 해당하는 종목이 패널에 없습니다.</p>
                    <button
                      onClick={() => {
                        if (searchQuery.trim()) {
                          setNewSymbolInput(searchQuery.trim().toUpperCase());
                          setNewNameInput(searchQuery.trim());
                        }
                        setIsAddModalOpen(true);
                      }}
                      className="px-4 py-2 bg-cyan-600 text-white font-bold text-xs rounded-xl hover:bg-cyan-500 transition cursor-pointer"
                    >
                      + "{searchQuery}" 종목 시세 패널에 추가하기
                    </button>
                  </td>
                </tr>
              ) : (
                filteredStockList.map((item) => {
                  const isUp = item.changeRate >= 0;
                  const isUs = item.market === "US";
                  const priceFormatted = isUs 
                    ? `$${item.currentPrice.toFixed(2)}`
                    : `₩${Math.round(item.currentPrice).toLocaleString()}원`;

                  return (
                    <tr
                      key={item.symbol}
                      onClick={() => {
                        setSelectedSymbol(item.symbol);
                        setSelectedStockForCandle({
                          symbol: item.symbol,
                          name: item.name,
                          market: item.market,
                          currentPrice: item.currentPrice,
                          changeRate: item.changeRate,
                          volumePower: item.volumePower
                        });
                      }}
                      className={`hover:bg-cyan-50/80 transition-all duration-300 cursor-pointer group ${
                        item.flash === "up" ? "bg-emerald-100/80 ring-2 ring-emerald-400/80" :
                        item.flash === "down" ? "bg-rose-100/80 ring-2 ring-rose-400/80" : ""
                      }`}
                    >
                      {/* Market & Stock Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black shrink-0 ${
                            item.market === "KOREA" ? "bg-emerald-100 text-emerald-800 border border-emerald-300" :
                            item.market === "BTC" ? "bg-cyan-100 text-cyan-800 border border-cyan-300" :
                            "bg-blue-100 text-blue-800 border border-blue-300"
                          }`}>
                            {item.market === "KOREA" ? "🇰🇷 KIS" : item.market === "BTC" ? "🪙 Upbit" : "🇺🇸 KIS"}
                          </span>
                          <div>
                            <span className="font-bold text-zinc-900 block font-sans text-sm group-hover:text-cyan-700 group-hover:underline">
                              {item.name}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono">{item.symbol}</span>
                          </div>
                        </div>
                      </td>

                      {/* Realtime Price Digit */}
                      <td className="py-3 px-4 text-right">
                        <div className={`font-black text-sm sm:text-base tracking-tight transition-colors duration-300 flex items-center justify-end gap-1.5 ${
                          isUp ? "text-emerald-600" : "text-rose-600"
                        }`}>
                          {item.flash === "up" && (
                            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                          )}
                          {item.flash === "down" && (
                            <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                          )}
                          <span className={`font-mono transition-transform duration-200 ${item.flash ? "scale-105" : ""}`}>
                            {priceFormatted}
                          </span>
                        </div>
                      </td>

                      {/* Change Rate % */}
                      <td className="py-3 px-4 text-right">
                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded font-black text-xs ${
                          isUp ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}>
                          {isUp ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                          <span>{isUp ? "+" : ""}{item.changeRate.toFixed(2)}%</span>
                        </span>
                      </td>

                      {/* Mini Candlestick Visual */}
                      <td className="py-3 px-4 text-center">
                        <MiniCandleStick
                          openPrice={item.openPrice}
                          highPrice={item.highPrice}
                          lowPrice={item.lowPrice}
                          currentPrice={item.currentPrice}
                          market={item.market}
                        />
                      </td>

                      {/* Volume & Power */}
                      <td className="py-3 px-4 text-right">
                        <MiniVolumeBar
                          volume={item.volumeStr}
                          volumePower={item.volumePower}
                          market={item.market}
                        />
                      </td>

                      {/* Timestamp */}
                      <td className="py-3 px-4 text-center font-mono text-[11px] text-zinc-500">
                        <span className="flex items-center justify-center gap-1">
                          <Clock className="h-3 w-3 text-zinc-400" />
                          <span>{item.timeFormatted}</span>
                        </span>
                      </td>

                      {/* Actions (Candle Chart + Delete) */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSymbol(item.symbol);
                              setSelectedStockForCandle({
                                symbol: item.symbol,
                                name: item.name,
                                market: item.market,
                                currentPrice: item.currentPrice,
                                changeRate: item.changeRate,
                                volumePower: item.volumePower
                              });
                            }}
                            className="px-2.5 py-1 bg-zinc-900 hover:bg-cyan-900 text-cyan-300 font-bold text-[11px] rounded-lg border border-cyan-500/40 flex items-center gap-1 transition cursor-pointer shadow-xs"
                          >
                            <BarChart2 className="h-3 w-3 text-cyan-400" />
                            <span>차트</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteStock(item.symbol, item.name)}
                            className="p-1 hover:bg-rose-100 text-zinc-400 hover:text-rose-600 rounded transition cursor-pointer"
                            title="이 종목 패널에서 제거"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* VIEW MODE 2: APPENDING HISTORICAL LOG STREAM TABLE */
        <div className="overflow-x-auto max-h-[520px]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-zinc-100 z-10 border-b border-zinc-200 text-zinc-600 text-[11px] font-bold font-mono uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">체결 수신 시각</th>
                <th className="py-3 px-4">마켓 / 종목명</th>
                <th className="py-3 px-4 text-right">체결 실시간가</th>
                <th className="py-3 px-4 text-right">변동률 %</th>
                <th className="py-3 px-4 text-center">미니 봉차트</th>
                <th className="py-3 px-4 text-right">체결 수량 / 강도</th>
                <th className="py-3 px-4 text-center">차트 보기</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-xs font-mono">
              {filteredTicks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400 font-sans">
                    <p className="font-semibold text-zinc-600">수신된 체결 로그 스트림이 없습니다.</p>
                  </td>
                </tr>
              ) : (
                filteredTicks.map((tick) => {
                  const isUp = tick.changeRate >= 0;

                  return (
                    <tr
                      key={tick.id}
                      onClick={() => {
                        setSelectedSymbol(tick.symbol);
                        setSelectedStockForCandle({
                          symbol: tick.symbol,
                          name: tick.name,
                          market: tick.market,
                          currentPrice: tick.currentPrice,
                          changeRate: tick.changeRate,
                          volumePower: tick.volumePower
                        });
                      }}
                      className="hover:bg-cyan-50/80 transition cursor-pointer group"
                    >
                      <td className="py-3 px-4 text-zinc-500 font-mono text-[11px]">
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-zinc-400" />
                          <span>{tick.timeFormatted}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black shrink-0 ${
                            tick.market === "KOREA" ? "bg-emerald-100 text-emerald-800 border border-emerald-300" :
                            tick.market === "BTC" ? "bg-cyan-100 text-cyan-800 border border-cyan-300" :
                            "bg-blue-100 text-blue-800 border border-blue-300"
                          }`}>
                            {tick.market === "KOREA" ? "🇰🇷 KIS" : tick.market === "BTC" ? "🪙 Upbit" : "🇺🇸 KIS"}
                          </span>
                          <div>
                            <span className="font-bold text-zinc-900 block font-sans text-sm group-hover:text-cyan-700 group-hover:underline">
                              {tick.name}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono">{tick.symbol}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className={`font-black text-sm tracking-tight ${
                          isUp ? "text-emerald-600" : "text-rose-600"
                        }`}>
                          ₩{Math.round(tick.currentPrice).toLocaleString()}원
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded font-black text-xs ${
                          isUp ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}>
                          {isUp ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                          <span>{isUp ? "+" : ""}{tick.changeRate.toFixed(2)}%</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <MiniCandleStick
                          openPrice={tick.openPrice}
                          highPrice={tick.highPrice}
                          lowPrice={tick.lowPrice}
                          currentPrice={tick.currentPrice}
                          market={tick.market}
                        />
                      </td>

                      <td className="py-3 px-4 text-right">
                        <MiniVolumeBar
                          volume={tick.volumeStr}
                          volumePower={tick.volumePower}
                          market={tick.market}
                        />
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSymbol(tick.symbol);
                            setSelectedStockForCandle({
                              symbol: tick.symbol,
                              name: tick.name,
                              market: tick.market,
                              currentPrice: tick.currentPrice,
                              changeRate: tick.changeRate,
                              volumePower: tick.volumePower
                            });
                          }}
                          className="px-3 py-1.5 bg-gradient-to-r from-slate-900 to-zinc-900 hover:from-cyan-900 hover:to-indigo-900 text-cyan-300 font-bold text-[11px] rounded-lg border border-cyan-500/40 flex items-center gap-1 mx-auto transition cursor-pointer shadow-xs"
                        >
                          <BarChart2 className="h-3.5 w-3.5 text-cyan-400" />
                          <span>봉차트</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* FOOTER NOTICE */}
      <div className="p-3 bg-zinc-100 border-t border-zinc-200 text-xs font-mono text-zinc-500 flex items-center justify-between flex-wrap gap-2">
        <span>※ 항목 클릭 시 1분/5분/일봉 정밀 캔들스틱 봉차트 및 이동평균선(MA) 그래프가 즉시 열립니다.</span>
        <span className="font-bold text-zinc-700">
          모드: {viewMode === "IN_PLACE" ? `원하는 종목 추가 및 관측 (${filteredStockList.length}개 종목)` : `누적 체결 로그 ${filteredTicks.length}개`}
        </span>
      </div>

      {/* MANUAL ADD STOCK MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 text-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-scaleUp my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-cyan-400" />
                <span>원하는 주식 / 코인 시세 패널에 추가</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewStock} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 font-bold mb-1">마켓 선택</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "KOREA", label: "🇰🇷 KIS 국내" },
                    { id: "US", label: "🇺🇸 KIS 해외" },
                    { id: "BTC", label: "🪙 업비트" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setNewMarketInput(m.id as any)}
                      className={`py-2 rounded-xl border text-center font-bold transition ${
                        newMarketInput === m.id
                          ? "bg-cyan-600 text-white border-cyan-400 shadow-xs"
                          : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 font-bold mb-1">종목 심볼 / 코드 (예: 005930, NVDA, KRW-BTC)</label>
                <input
                  type="text"
                  value={newSymbolInput}
                  onChange={(e) => setNewSymbolInput(e.target.value.toUpperCase())}
                  placeholder="예: 005930 또는 TSLA 또는 KRW-SOL"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-white font-mono font-bold focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-bold mb-1">종목명 (예: 삼성전자, 테슬라, 솔라나)</label>
                <input
                  type="text"
                  value={newNameInput}
                  onChange={(e) => setNewNameInput(e.target.value)}
                  placeholder="예: 카카오, 애플, 이더리움"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-white font-bold focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-bold mb-1">현재 예상 기준가 (원 / $)</label>
                <input
                  type="number"
                  value={newPriceInput}
                  onChange={(e) => setNewPriceInput(e.target.value)}
                  placeholder="50000"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-white font-mono font-bold focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 font-bold rounded-xl hover:bg-zinc-700 transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-black rounded-xl hover:from-cyan-500 hover:to-blue-500 transition shadow-lg"
                >
                  종목 추가 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BIG CANDLESTICK CHART MODAL */}
      {selectedStockForCandle && (
        <StockCandleChartModal
          symbol={selectedStockForCandle.symbol}
          name={selectedStockForCandle.name}
          market={selectedStockForCandle.market}
          currentPrice={selectedStockForCandle.currentPrice}
          changeRate={selectedStockForCandle.changeRate}
          volumePower={selectedStockForCandle.volumePower}
          onClose={() => setSelectedStockForCandle(null)}
          onAiAnalyze={() => {
            setSelectedSymbol(selectedStockForCandle.symbol);
            setSelectedStockForCandle(null);
            window.dispatchEvent(new CustomEvent("switch-tab", { detail: "omni_brain" }));
          }}
        />
      )}

    </div>
  );
};
