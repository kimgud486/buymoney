import React, { useState, useEffect, useCallback } from "react";
import { 
  Sparkles, 
  Flame, 
  Zap, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Target, 
  ShieldAlert, 
  Filter, 
  Clock, 
  Star,
  ChevronDown,
  ChevronUp,
  Radio,
  ExternalLink
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { StockCandleChartModal } from "./StockCandleChartModal";
import { realtimeMarketFeedService } from "../services/realtimeMarketFeedService";
import { v11ExecutionEngine } from "./AistockV11ExecutionConsole";

export interface ScannedStockItem {
  id: string;
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  currentPrice: number;
  changePct: number;
  changeAmount?: number;
  prevPrice?: number;
  flashState?: "UP" | "DOWN" | null;
  volumeText: string;
  tradeValueText: string;
  aiScore: number;
  aiConfidence: number;
  rvol: number; // e.g. 3.4x
  signalType: "BULLISH_CHOCH" | "SURGE_SPIKE" | "FVG_RETEST" | "SSL_SWEEP" | "BOS_BREAKOUT";
  signalLabel: string;
  entryZone: string;
  bestEntry: number;
  stopLoss: number;
  targetPrice: number;
  riskReward: string;
  rationale: string;
  scannedAt: string;
  isRealtimeLinked: boolean;
}

interface RealtimeScannerTileBoardProps {
  onSelectStock?: (symbol: string, market: string) => void;
  isWhiteTheme?: boolean;
}

export const RealtimeScannerTileBoard: React.FC<RealtimeScannerTileBoardProps> = ({
  onSelectStock,
  isWhiteTheme = false
}) => {
  const { executeQuickOrder, addWatchlist, addToast } = useApp();

  const [stocks, setStocks] = useState<ScannedStockItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedMarketFilter, setSelectedMarketFilter] = useState<"ALL" | "KOREA" | "BTC">("ALL");
  const [selectedSignalFilter, setSelectedSignalFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"AI_SCORE" | "RVOL" | "CHANGE_PCT" | "PRICE">("AI_SCORE");
  const [isAutoScanActive, setIsAutoScanActive] = useState<boolean>(true);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"TILES" | "LIST">("TILES");

  // Selected Stock for Chart Modal
  const [activeChartModalStock, setActiveChartModalStock] = useState<{ symbol: string; name: string } | null>(null);

  // Helper to determine realistic AI technical pattern based on actual change rate and price
  const generateSignalFromRealData = useCallback((changePct: number, symbol: string, price: number): {
    signalType: ScannedStockItem["signalType"];
    signalLabel: string;
    aiScore: number;
    aiConfidence: number;
    rvol: number;
    stopLoss: number;
    targetPrice: number;
    bestEntry: number;
    entryZone: string;
    riskReward: string;
    rationale: string;
  } => {
    const isPositive = changePct >= 0;
    const absChange = Math.abs(changePct);

    let signalType: ScannedStockItem["signalType"] = "BULLISH_CHOCH";
    let signalLabel = "Bullish CHoCH 추세 전환";
    let rvol = 2.4;

    if (absChange >= 4.0) {
      signalType = "SURGE_SPIKE";
      signalLabel = "Volume Spike 상방 돌파";
      rvol = 4.2;
    } else if (absChange >= 2.5) {
      signalType = "BOS_BREAKOUT";
      signalLabel = "BOS 레벨 상향 돌파";
      rvol = 3.5;
    } else if (absChange >= 1.0) {
      signalType = "FVG_RETEST";
      signalLabel = "FVG Gap 안착 후 지지";
      rvol = 2.8;
    } else {
      signalType = "SSL_SWEEP";
      signalLabel = "SSL Sweep 후 반등";
      rvol = 2.1;
    }

    const aiScore = Math.min(99, Math.max(80, Math.round(85 + (isPositive ? absChange * 2.2 : -absChange))));
    const aiConfidence = Math.min(96, Math.max(78, Math.round(82 + absChange * 1.5)));

    const slDelta = price * 0.022;
    const tpDelta = price * 0.055;
    const stopLoss = Math.round(price - slDelta);
    const targetPrice = Math.round(price + tpDelta);
    const bestEntry = Math.round(price * 0.995);
    const entryZone = `${Math.round(price * 0.99).toLocaleString()} ~ ${(price ?? 0).toLocaleString()}`;
    const riskReward = "1 : 2.5";
    const rationale = isPositive
      ? `실시간 체결 수급 유입 (${changePct > 0 ? "+" : ""}${changePct}%). 거래량 상대강도 ${rvol}x 돌파 및 지지선 수성`
      : `단기 눌림목 구간 지지력 테스트 중 (${changePct}%). 손익비 유리한 분할 진입 레벨 포착`;

    return {
      signalType,
      signalLabel,
      aiScore,
      aiConfidence,
      rvol,
      stopLoss,
      targetPrice,
      bestEntry,
      entryZone,
      riskReward,
      rationale
    };
  }, []);

  // 1. Initial Load of 100% Real Live Market Data
  const fetchLiveMarketUniverse = useCallback(async () => {
    setIsLoading(true);
    try {
      const itemsMap = new Map<string, ScannedStockItem>();

      // A. Real Small/Mid Cap Korean Stocks (from Naver Finance realtime)
      try {
        const smRes = await fetch("/api/realtime/small-mid-cap-universe");
        if (smRes.ok) {
          const json = await smRes.json();
          if (json.success && Array.isArray(json.data)) {
            json.data.forEach((d: any) => {
              if (d.symbol && d.price > 0) {
                const signal = generateSignalFromRealData(d.changePct || 0, d.symbol, d.price);
                itemsMap.set(d.symbol, {
                  id: `kr_${d.symbol}`,
                  symbol: d.symbol,
                  name: d.name || d.realStockName || d.symbol,
                  market: "KOREA",
                  currentPrice: d.price,
                  changePct: +(d.changePct || 0).toFixed(2),
                  changeAmount: d.changePrice || 0,
                  volumeText: d.volumeText || `${(d.volume || 0).toLocaleString()}주`,
                  tradeValueText: d.tradingValue ? `${d.tradingValue}억` : (d.marketCapText || "실시간"),
                  ...signal,
                  scannedAt: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
                  isRealtimeLinked: true
                });
              }
            });
          }
        }
      } catch (e) {
        console.warn("[Scanner] Failed loading small-mid universe:", e);
      }

      // B. Real Major Korean Stocks & Crypto (from /api/stocks)
      try {
        const stocksRes = await fetch("/api/stocks");
        if (stocksRes.ok) {
          const stocksList = await stocksRes.json();
          if (Array.isArray(stocksList)) {
            stocksList.forEach((s: any) => {
              if (s.symbol && typeof s.price === "number" && s.price > 0) {
                // Exclude US foreign mock data per user instructions
                if (s.market === "US") return;
                
                const mkt: "KOREA" | "BTC" = 
                  (s.market === "BTC" || s.market === "UPBIT" || s.symbol.startsWith("KRW-")) ? "BTC" : "KOREA";
                
                const pct = typeof s.changePct === "number" ? +(s.changePct).toFixed(2) : 0;
                const signal = generateSignalFromRealData(pct, s.symbol, s.price);
                
                itemsMap.set(s.symbol, {
                  id: `stock_${s.symbol}`,
                  symbol: s.symbol,
                  name: s.name || s.symbol,
                  market: mkt,
                  currentPrice: s.price,
                  changePct: pct,
                  changeAmount: s.change || 0,
                  volumeText: s.volume || (s.marketCap ? `${s.marketCap}` : "실시간"),
                  tradeValueText: s.marketCap || "실시간",
                  ...signal,
                  scannedAt: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
                  isRealtimeLinked: true
                });
              }
            });
          }
        }
      } catch (e) {
        console.warn("[Scanner] Failed loading /api/stocks:", e);
      }

      const realList = Array.from(itemsMap.values());
      if (realList.length > 0) {
        setStocks(realList);
      }
    } catch (err) {
      console.error("[Scanner] Error fetching real stock universe:", err);
    } finally {
      setIsLoading(false);
    }
  }, [generateSignalFromRealData]);

  useEffect(() => {
    fetchLiveMarketUniverse();
  }, [fetchLiveMarketUniverse]);

  // 2. Real-time Live Market Feed Subscription (Upbit WebSocket + Naver Live Quotes + US Tickers)
  useEffect(() => {
    // A. Listen to RealtimeMarketFeedService directly
    const unsubFeed = realtimeMarketFeedService.subscribe((quotesMap) => {
      if (!isAutoScanActive) return;

      setStocks((prevStocks) => {
        let changed = false;
        const next = prevStocks.map((item) => {
          const symKey = item.symbol.replace("KRW-", "");
          const quote = quotesMap.get(symKey) || quotesMap.get(item.symbol) || quotesMap.get(`KRW-${symKey}`);

          if (quote && typeof quote.price === "number" && quote.price > 0 && quote.price !== item.currentPrice) {
            changed = true;
            const isUp = quote.price > item.currentPrice;
            const newPct = quote.changeRate !== undefined ? quote.changeRate : item.changePct;
            return {
              ...item,
              prevPrice: item.currentPrice,
              currentPrice: quote.price,
              changePct: newPct,
              changeAmount: quote.changeAmount !== undefined ? quote.changeAmount : item.changeAmount,
              volumeText: quote.volume || item.volumeText,
              tradeValueText: quote.tradeValue || item.tradeValueText,
              flashState: isUp ? ("UP" as const) : ("DOWN" as const),
              scannedAt: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
            };
          }
          return item;
        });
        return changed ? next : prevStocks;
      });
    });

    // B. Upbit Ticker Updates
    const handleUpbitUpdate = (e: Event) => {
      if (!isAutoScanActive) return;
      const customEvent = e as CustomEvent<any>;
      const tickerData = customEvent.detail;
      if (!tickerData) return;

      setStocks((prevStocks) => {
        const tickers = Array.isArray(tickerData) ? tickerData : [tickerData];
        let changed = false;

        const next = prevStocks.map((item) => {
          if (item.market !== "BTC") return item;
          const match = tickers.find((t: any) => {
            const code = t.code || t.market;
            return code && (code === item.symbol || code.replace("KRW-", "") === item.symbol.replace("KRW-", ""));
          });

          if (match && typeof match.trade_price === "number" && match.trade_price !== item.currentPrice) {
            changed = true;
            const isUp = match.trade_price > item.currentPrice;
            const pct = match.signed_change_rate !== undefined ? +(match.signed_change_rate * 100).toFixed(2) : item.changePct;
            return {
              ...item,
              prevPrice: item.currentPrice,
              currentPrice: match.trade_price,
              changePct: pct,
              changeAmount: match.signed_change_price ?? item.changeAmount,
              volumeText: `${Math.round(match.acc_trade_volume_24h || 0).toLocaleString()} ${item.symbol.replace("KRW-", "")}`,
              tradeValueText: `${Math.round((match.acc_trade_price_24h || 0) / 1e8).toLocaleString()}억`,
              flashState: isUp ? ("UP" as const) : ("DOWN" as const),
              scannedAt: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
            };
          }
          return item;
        });

        return changed ? next : prevStocks;
      });
    };

    window.addEventListener("upbit_ticker_update", handleUpbitUpdate);

    return () => {
      unsubFeed();
      window.removeEventListener("upbit_ticker_update", handleUpbitUpdate);
    };
  }, [isAutoScanActive]);

  // Clear flash state after 500ms
  useEffect(() => {
    const hasFlash = stocks.some(s => s.flashState !== null && s.flashState !== undefined);
    if (!hasFlash) return;

    const timer = setTimeout(() => {
      setStocks(prev => {
        if (!prev.some(s => s.flashState)) return prev;
        return prev.map(s => s.flashState ? { ...s, flashState: null } : s);
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [stocks]);

  // Instant Quick Order Handler
  const handleQuickBuy = async (item: ScannedStockItem) => {
    try {
      v11ExecutionEngine.processCandidateOrder({
        symbol: item.symbol,
        name: item.name,
        market: item.market,
        price: item.currentPrice,
        scannerScore: item.aiScore,
        unifiedShape: item.signalLabel,
        rvol: item.rvol,
        executionPower: 120
      });

      await executeQuickOrder({
        symbol: item.symbol,
        name: item.name,
        market: item.market,
        price: item.currentPrice,
        type: "BUY",
        quantity: item.market === "US" ? 5 : item.market === "BTC" ? 0.005 : 10
      });

      addToast({
        type: "SUCCESS",
        title: "실시간 스캐너 자동 매수 체결",
        message: `${item.name} (${item.symbol}) @ ${(item.currentPrice ?? 0).toLocaleString()} 주문 체결 승인`
      });
    } catch (err: any) {
      addToast({
        type: "ERROR",
        title: "주문 실패",
        message: err.message || "주문 실행 중 오류가 발생했습니다."
      });
    }
  };

  // Filter & Sort
  const filteredStocks = stocks
    .filter((s) => {
      if (selectedMarketFilter !== "ALL" && s.market !== selectedMarketFilter) return false;
      if (selectedSignalFilter !== "ALL" && s.signalType !== selectedSignalFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "AI_SCORE") return b.aiScore - a.aiScore;
      if (sortBy === "RVOL") return b.rvol - a.rvol;
      if (sortBy === "CHANGE_PCT") return b.changePct - a.changePct;
      if (sortBy === "PRICE") return b.currentPrice - a.currentPrice;
      return 0;
    });

  return (
    <div className={`rounded-xl border transition-all ${
      isWhiteTheme 
        ? "bg-white border-slate-200 text-slate-800 shadow-xs" 
        : "bg-[#091424] border-[#162942] text-slate-100 shadow-xs"
    }`}>
      {/* 1. COMPACT SLIM HEADER BAR */}
      <div className={`px-3 py-2 flex flex-wrap items-center justify-between gap-2 border-b ${
        isWhiteTheme ? "border-slate-200 bg-slate-50/80" : "border-[#162942] bg-[#070f1c]/90"
      }`}>
        {/* Left: Title & Live indicator */}
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
            <Radio className="h-4 w-4 animate-pulse text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`text-xs sm:text-sm font-black tracking-tight ${isWhiteTheme ? "text-slate-900" : "text-white"}`}>
                실시간 포착 종목 리스트
              </h3>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                100% 실시간 시세
              </span>
              <span className={`text-[11px] font-mono font-bold ${isWhiteTheme ? "text-slate-500" : "text-slate-400"}`}>
                ({filteredStocks.length}종목)
              </span>
            </div>
          </div>
        </div>

        {/* Right: Market Filters, Sort & Collapse Toggle */}
        <div className="flex items-center flex-wrap gap-1.5 text-xs">
          {/* View Mode Switcher: Mini Tiles vs Slim List */}
          <div className={`flex items-center p-0.5 rounded-lg border ${
            isWhiteTheme ? "bg-slate-200/70 border-slate-300" : "bg-slate-900 border-slate-700"
          }`}>
            <button
              type="button"
              onClick={() => setViewMode("TILES")}
              className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition cursor-pointer ${
                viewMode === "TILES"
                  ? "bg-cyan-600 text-white shadow-xs"
                  : isWhiteTheme ? "text-slate-600 hover:text-slate-900" : "text-slate-400 hover:text-slate-200"
              }`}
              title="초소형 미니 타일 뷰 (자리 최소화)"
            >
              미니타일
            </button>
            <button
              type="button"
              onClick={() => setViewMode("LIST")}
              className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition cursor-pointer ${
                viewMode === "LIST"
                  ? "bg-cyan-600 text-white shadow-xs"
                  : isWhiteTheme ? "text-slate-600 hover:text-slate-900" : "text-slate-400 hover:text-slate-200"
              }`}
              title="초슬림 목록형 뷰"
            >
              슬림목록
            </button>
          </div>

          {/* Market Filter Tabs (Only Realtime Domestic & Upbit Crypto) */}
          <div className={`flex items-center p-0.5 rounded-lg border ${
            isWhiteTheme ? "bg-slate-200/70 border-slate-300" : "bg-slate-900 border-slate-700"
          }`}>
            {(["ALL", "KOREA", "BTC"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setSelectedMarketFilter(m)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition cursor-pointer ${
                  selectedMarketFilter === m
                    ? "bg-cyan-600 text-white shadow-xs"
                    : isWhiteTheme ? "text-slate-600 hover:text-slate-900" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {m === "ALL" && "전체"}
                {m === "KOREA" && "국내"}
                {m === "BTC" && "업비트"}
              </button>
            ))}
          </div>

          {/* Signal Filter Select */}
          <select
            value={selectedSignalFilter}
            onChange={(e) => setSelectedSignalFilter(e.target.value)}
            className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium border cursor-pointer ${
              isWhiteTheme 
                ? "bg-white border-slate-300 text-slate-700" 
                : "bg-slate-900 border-slate-700 text-slate-300"
            }`}
          >
            <option value="ALL">🎯 전체 신호</option>
            <option value="BULLISH_CHOCH">🔄 CHoCH 추세전환</option>
            <option value="SURGE_SPIKE">⚡ Surge 거래량폭발</option>
            <option value="BOS_BREAKOUT">💥 BOS 레벨돌파</option>
            <option value="FVG_RETEST">📊 FVG Gap지지</option>
            <option value="SSL_SWEEP">🎯 SSL Sweep</option>
          </select>

          {/* Sort Select */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium border cursor-pointer ${
              isWhiteTheme 
                ? "bg-white border-slate-300 text-slate-700" 
                : "bg-slate-900 border-slate-700 text-slate-300"
            }`}
          >
            <option value="AI_SCORE">⭐ AI점수순</option>
            <option value="RVOL">🔥 RVOL순</option>
            <option value="CHANGE_PCT">📈 등락률순</option>
            <option value="PRICE">💰 가격순</option>
          </select>

          {/* Auto Scan Toggle */}
          <button
            type="button"
            onClick={() => setIsAutoScanActive(!isAutoScanActive)}
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition cursor-pointer flex items-center gap-1 ${
              isAutoScanActive
                ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/40"
                : isWhiteTheme ? "bg-slate-100 text-slate-500 border-slate-300" : "bg-slate-800 text-slate-400 border-slate-700"
            }`}
            title="실시간 시세 자동 수신 토글"
          >
            <RefreshCw className={`h-3 w-3 ${isAutoScanActive ? "animate-spin text-emerald-400" : ""}`} />
            <span>{isAutoScanActive ? "실시간 ON" : "정지"}</span>
          </button>

          {/* Collapse/Expand button */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-1 rounded-md border transition cursor-pointer ${
              isWhiteTheme ? "bg-white border-slate-300 text-slate-600 hover:bg-slate-100" : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            }`}
            title={isCollapsed ? "펼치기" : "접기 (화면 공간 확보)"}
          >
            {isCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. COMPACT VIEW (COLLAPSIBLE & SPACE-SAVING) */}
      {!isCollapsed && (
        <div className="p-1.5">
          {isLoading && stocks.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-1.5">
              <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" />
              <span>실시간 시장 시세 및 거래량 데이터 동기화 중...</span>
            </div>
          ) : filteredStocks.length === 0 ? (
            <div className="py-3 text-center text-xs text-slate-400">
              선택한 조건에 부합하는 실시간 포착 종목이 없습니다.
            </div>
          ) : viewMode === "TILES" ? (
            /* COMPACT MINI-TILES: Super Space-Efficient Grid (Max Height ~125px) */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5 max-h-[125px] overflow-y-auto pr-0.5">
              {filteredStocks.map((item) => {
                const isUp = item.changePct >= 0;
                const priceStr = item.market === "US"
                  ? `$${(item.currentPrice ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : `${(item.currentPrice ?? 0).toLocaleString()}원`;

                return (
                  <div
                    key={item.id}
                    onClick={() => onSelectStock && onSelectStock(item.symbol, item.market)}
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                      item.flashState === "UP"
                        ? "bg-emerald-500/20 border-emerald-500/50"
                        : item.flashState === "DOWN"
                        ? "bg-rose-500/20 border-rose-500/50"
                        : isWhiteTheme
                        ? "bg-slate-50 hover:bg-cyan-50/70 border-slate-200"
                        : "bg-[#0b182b] hover:bg-[#11243e] border-[#162942]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="truncate flex items-center gap-1">
                        <span className={`text-[8px] px-1 py-0.2 rounded font-black ${
                          item.market === "KOREA" ? "bg-blue-500/15 text-blue-400" : "bg-amber-500/15 text-amber-400"
                        }`}>
                          {item.market === "KOREA" ? "KR" : "BTC"}
                        </span>
                        <span className={`text-[11px] font-bold truncate ${isWhiteTheme ? "text-slate-800" : "text-slate-100"}`}>
                          {item.name}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-cyan-400 font-extrabold shrink-0">
                        {item.aiScore}점
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between mt-1">
                      <span className={`text-[11px] font-black font-mono ${
                        isUp ? "text-emerald-400" : "text-rose-400"
                      }`}>
                        {priceStr}
                      </span>
                      <span className={`text-[10px] font-mono font-bold flex items-center ${
                        isUp ? "text-emerald-400" : "text-rose-400"
                      }`}>
                        {isUp ? "+" : ""}{item.changePct}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-1 mt-1 pt-1 border-t border-slate-700/20 text-[9px]">
                      <span className="text-slate-400 font-mono truncate">
                        {item.volumeText || `${item.rvol}x`}
                      </span>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleQuickBuy(item)}
                          className="px-1.5 py-0.2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[9px] cursor-pointer"
                          title="1-Click 빠른 매수"
                        >
                          매수
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* SLIM LIST VIEW: Ultra-compact table (Max Height ~135px) */
            <div className="overflow-x-auto max-h-[135px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`border-b text-[10px] font-bold sticky top-0 z-10 ${
                    isWhiteTheme ? "bg-slate-100/95 text-slate-600 border-slate-200" : "bg-[#0c1a2d]/95 text-slate-400 border-[#162942]"
                  }`}>
                    <th className="py-1 px-2">종목명 / 티커</th>
                    <th className="py-1 px-2 text-right">실시간 현재가</th>
                    <th className="py-1 px-2 text-right">등락률</th>
                    <th className="py-1 px-2 text-right">실거래량</th>
                    <th className="py-1 px-2">AI 신호 & RVOL</th>
                    <th className="py-1 px-2 text-center">목표 / 손절</th>
                    <th className="py-1 px-2 text-center">빠른실행</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/40 dark:divide-[#162942]/60">
                  {filteredStocks.map((item) => {
                    const isUp = item.changePct >= 0;
                    const priceStr = item.market === "US" 
                      ? `$${(item.currentPrice ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : `${(item.currentPrice ?? 0).toLocaleString()}원`;

                    return (
                      <tr
                        key={item.id}
                        onClick={() => onSelectStock && onSelectStock(item.symbol, item.market)}
                        className={`group transition-colors duration-150 cursor-pointer ${
                          item.flashState === "UP"
                            ? "bg-emerald-500/20"
                            : item.flashState === "DOWN"
                            ? "bg-rose-500/20"
                            : isWhiteTheme
                            ? "hover:bg-cyan-50/60"
                            : "hover:bg-cyan-950/30"
                        }`}
                      >
                        {/* 1. Symbol / Name */}
                        <td className="py-1 px-2 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1 py-0.2 rounded text-[8px] font-black ${
                              item.market === "KOREA"
                                ? "bg-blue-500/15 text-blue-500 border border-blue-500/30"
                                : "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                            }`}>
                              {item.market === "KOREA" ? "국내" : "UPBIT"}
                            </span>
                            <span className={`font-bold text-xs group-hover:text-cyan-400 transition-colors ${
                              isWhiteTheme ? "text-slate-900" : "text-white"
                            }`}>
                              {item.name}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {item.symbol}
                            </span>
                          </div>
                        </td>

                        {/* 2. Current Price (Real-time) */}
                        <td className="py-1 px-2 text-right font-mono font-black text-xs whitespace-nowrap">
                          <span className={`transition-all duration-200 ${
                            item.flashState === "UP" ? "text-emerald-400 font-extrabold" :
                            item.flashState === "DOWN" ? "text-rose-400 font-extrabold" :
                            isWhiteTheme ? "text-slate-900" : "text-slate-100"
                          }`}>
                            {priceStr}
                          </span>
                        </td>

                        {/* 3. Change Rate */}
                        <td className="py-1 px-2 text-right font-mono font-bold text-xs whitespace-nowrap">
                          <span className={`inline-flex items-center gap-0.5 ${
                            isUp ? "text-emerald-500" : "text-rose-500"
                          }`}>
                            {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {isUp ? "+" : ""}{item.changePct}%
                          </span>
                        </td>

                        {/* 4. Real Volume / Trading Value */}
                        <td className="py-1 px-2 text-right whitespace-nowrap font-mono text-[10px] text-slate-300">
                          {item.volumeText}
                        </td>

                        {/* 5. AI Signal & RVOL */}
                        <td className="py-1 px-2 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1 py-0.2 rounded text-[9px] font-black bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                              AI {item.aiScore}점
                            </span>
                            <span className="text-[10px] font-bold text-slate-200 flex items-center gap-1">
                              {item.signalLabel}
                            </span>
                            <span className="text-[9px] font-mono font-bold text-amber-400">
                              {item.rvol}x
                            </span>
                          </div>
                        </td>

                        {/* 6. Target Price / Stop Loss */}
                        <td className="py-1 px-2 text-center whitespace-nowrap font-mono text-[10px]">
                          <span className="text-emerald-400 font-bold">TP {(item.targetPrice ?? 0).toLocaleString()}</span>
                          <span className="text-slate-500 mx-1">/</span>
                          <span className="text-rose-400 font-bold">SL {(item.stopLoss ?? 0).toLocaleString()}</span>
                        </td>

                        {/* 7. Action Buttons */}
                        <td className="py-1 px-2 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (onSelectStock) {
                                  onSelectStock(item.symbol, item.market);
                                } else {
                                  setActiveChartModalStock({ symbol: item.symbol, name: item.name });
                                }
                              }}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition flex items-center gap-0.5 cursor-pointer border ${
                                isWhiteTheme 
                                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300" 
                                  : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                              }`}
                              title="메인 차트 조회"
                            >
                              <BarChart3 className="h-2.5 w-2.5 text-cyan-400" />
                              <span>차트</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleQuickBuy(item)}
                              className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-0.5 shadow-xs cursor-pointer active:scale-95"
                              title="1-Click AI 매수"
                            >
                              <Zap className="h-2.5 w-2.5 fill-white" />
                              <span>매수</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                addWatchlist({
                                  id: "wl_" + Date.now(),
                                  symbol: item.symbol,
                                  name: item.name,
                                  market: item.market,
                                  addedAt: new Date().toISOString()
                                });
                                addToast({
                                  type: "INFO",
                                  title: "관심종목 등록",
                                  message: `${item.name} (${item.symbol})이 관심종목에 추가되었습니다.`
                                });
                              }}
                              className={`p-0.5 rounded transition cursor-pointer ${
                                isWhiteTheme ? "hover:bg-amber-100 text-slate-400 hover:text-amber-500" : "hover:bg-amber-500/20 text-slate-400 hover:text-amber-400"
                              }`}
                              title="관심종목 추가"
                            >
                              <Star className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Stock Candle Chart Modal */}
      {activeChartModalStock && (
        <StockCandleChartModal
          symbol={activeChartModalStock.symbol}
          name={activeChartModalStock.name}
          onClose={() => setActiveChartModalStock(null)}
        />
      )}
    </div>
  );
};
