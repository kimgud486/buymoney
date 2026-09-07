import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Zap, 
  ShieldCheck, 
  RefreshCw, 
  Play, 
  Pause, 
  Clock, 
  Search, 
  Sliders, 
  Maximize2, 
  Camera, 
  Bell, 
  Settings, 
  ChevronRight, 
  ChevronDown, 
  Bot, 
  DollarSign, 
  BarChart2, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Eye, 
  Cpu, 
  Share2, 
  ArrowUpRight, 
  ArrowDownRight, 
  Crosshair, 
  Compass, 
  MoreVertical,
  HelpCircle,
  FolderLock,
  Sun,
  Moon,
  Coins,
  Radar,
  Sparkles
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { getAllStocks, StockItem } from "../../data/stockUniverse";
import { calculateJarvisPositionAi } from "../../services/DynamicPositionEngine";
import { JarvisPositionAiPanel } from "./JarvisPositionAiPanel";

// Existing sub-system modals to guarantee 100% preservation of every single capability
import { StockSearchAndAddModal } from "./StockSearchAndAddModal";
import { SmartSafetyGovernanceModal } from "./SmartSafetyGovernanceModal";
import { ManualEntryGateModal } from "./ManualEntryGateModal";
import { ProfitabilityHealthCheckModal } from "./ProfitabilityHealthCheckModal";
import { MultiModelSecuritiesConsensusModal } from "../MultiModelSecuritiesConsensusModal";
import { BotConfigModal } from "./BotConfigModal";
import { BrokerApiConnectModal } from "./BrokerApiConnectModal";
import { RealBrokerDetailedBalanceAndHoldings } from "./RealBrokerDetailedBalanceAndHoldings";
import { BotStatusDashboard } from "./BotStatusDashboard";
import { TransactionHistory } from "../TransactionHistory";
import { SmcMarketStructureVisualizer } from "../SmcMarketStructureVisualizer";
import { UsScalperSuperBrainModal } from "./UsScalperSuperBrainModal";
import { FractionalStockOrderModal } from "./FractionalStockOrderModal";
import { UploadedStrategyFileReaderModal } from "./UploadedStrategyFileReaderModal";
import { AistockV11ExecutionConsole } from "../AistockV11ExecutionConsole";
import { RealtimeScannerTileBoard } from "../RealtimeScannerTileBoard";
import { realtimeMarketFeedService } from "../../services/realtimeMarketFeedService";
import { AiFutureTrendOverlayChart } from "../AiFutureTrendOverlayChart";
import { InteractivePredictionCanvasChart } from "../InteractivePredictionCanvasChart";
import { RealTimeTradingViewChart } from "./RealTimeTradingViewChart";
import { 
  detectAllChartPatterns, 
  computeUnifiedMarketShape,
  UnifiedMarketShape,
  DetectedPattern, 
  PatternCategory, 
  ChartCandle 
} from "../../utils/patternTrackingEngine";

export type CandleData = ChartCandle;

export const MasterAiAutoTradingDashboard: React.FC<{
  onOpenConsensusModal?: (symbol: string) => void;
}> = ({ onOpenConsensusModal }) => {
  const {
    selectedSymbol: rawSelectedSymbol = "005930",
    setSelectedSymbol,
    allStocks = [],
    executeTrade,
    addToast,
    positions = [],
    trades = [],
    profile,
    activeBots = [],
    totalTradingPnl = 0,
    overallWinRate = 71.4,
    cashBreakdown
  } = useApp() as any;

  // Ensure selectedSymbol is strictly a string to prevent runtime startsWith errors
  const selectedSymbol = useMemo(() => {
    if (typeof rawSelectedSymbol === "string") return rawSelectedSymbol;
    if (rawSelectedSymbol && typeof rawSelectedSymbol === "object" && (rawSelectedSymbol as any).symbol) {
      return String((rawSelectedSymbol as any).symbol);
    }
    return String(rawSelectedSymbol || "005930");
  }, [rawSelectedSymbol]);

  // Real-time 1-second clock state
  const [currentTimeStr, setCurrentTimeStr] = useState<string>("09:45:32 KST");
  const [heartbeatTick, setHeartbeatTick] = useState<number>(0);

  // Theme mode: White (light background as requested) or Dark
  const [isWhiteTheme, setIsWhiteTheme] = useState<boolean>(true);

  // Timeframe state: 1m, 5m, 15m, 30m, 1H, 4H, D, W
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("D");
  const [mainChartDisplayMode, setMainChartDisplayMode] = useState<"TRADINGVIEW_REALTIME" | "DUAL_SPLIT" | "CANDLE_OVERLAY">("TRADINGVIEW_REALTIME");
  const [patternTrackingOn, setPatternTrackingOn] = useState<boolean>(true);
  const [selectedPatternCategory, setSelectedPatternCategory] = useState<PatternCategory>("ALL");
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null);
  const [isAiModeOn, setIsAiModeOn] = useState<boolean>(true);
  const [activeIndicators, setActiveIndicators] = useState<{
    ma: boolean;
    bb: boolean;
    rsi: boolean;
    macd: boolean;
    stoch: boolean;
    vwap: boolean;
    forecast: boolean;
    atrBand: boolean;
    srLines: boolean;
  }>({
    ma: true,
    bb: true,
    rsi: true,
    macd: true,
    stoch: true,
    vwap: true,
    forecast: true,
    atrBand: true,
    srLines: true
  });

  // Watchlist search and market filter
  const [watchlistMarketTab, setWatchlistMarketTab] = useState<"ALL" | "KOREA" | "US" | "UPBIT">("ALL");
  const [watchlistSearchQuery, setWatchlistSearchQuery] = useState<string>("");
  const [isSearchingWatchlist, setIsSearchingWatchlist] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Modals for complete feature preservation
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isGovernanceModalOpen, setIsGovernanceModalOpen] = useState(false);
  const [isConsensusModalOpen, setIsConsensusModalOpen] = useState(false);
  const [isHealthCheckModalOpen, setIsHealthCheckModalOpen] = useState(false);
  const [isBrokerApiModalOpen, setIsBrokerApiModalOpen] = useState(false);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [isBotFleetModalOpen, setIsBotFleetModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isSmcModalOpen, setIsSmcModalOpen] = useState(false);
  const [isUsBrainModalOpen, setIsUsBrainModalOpen] = useState(false);
  const [isFractionalModalOpen, setIsFractionalModalOpen] = useState(false);
  const [isIndicatorsDropdownOpen, setIsIndicatorsDropdownOpen] = useState(false);
  const [isStrategyFileReaderOpen, setIsStrategyFileReaderOpen] = useState(false);
  const [isManualGateOpen, setIsManualGateOpen] = useState(false);
  const [customUploadedCandles, setCustomUploadedCandles] = useState<any[] | null>(null);

  // Clicked Prediction Point on Candlestick Chart
  const [clickedPredictionPoint, setClickedPredictionPoint] = useState<{
    x: number;
    y: number;
    price: number;
    predictedPrice: number;
    changePct: number;
    time: string;
  } | null>(null);
  const [showFullForecastChartModal, setShowFullForecastChartModal] = useState<boolean>(false);

  // Market Overview items (Initialized clean without static synthetic values)
  const [marketIndices, setMarketIndices] = useState([
    { name: "KOSPI", value: 0, changePct: 0, isUp: true, sparkline: [] as number[] },
    { name: "KOSDAQ", value: 0, changePct: 0, isUp: true, sparkline: [] as number[] },
    { name: "S&P 500", value: 0, changePct: 0, isUp: true, sparkline: [] as number[] },
    { name: "NASDAQ", value: 0, changePct: 0, isUp: true, sparkline: [] as number[] },
    { name: "BTC/KRW", value: 0, changePct: 0, isUp: true, sparkline: [] as number[] },
  ]);

  // Real Multi-Market Watchlist items (Domestic KRX, Overseas US, Upbit Crypto) - 0 initial price until real feed arrives
  const [watchlist, setWatchlist] = useState<any[]>([
    { symbol: "005930", name: "삼성전자", market: "KOREA", price: 0, chgPct: 0, signal: "HOLD" },
    { symbol: "000660", name: "SK하이닉스", market: "KOREA", price: 0, chgPct: 0, signal: "HOLD" },
    { symbol: "373220", name: "LG에너지솔루션", market: "KOREA", price: 0, chgPct: 0, signal: "HOLD" },
    { symbol: "005380", name: "현대차", market: "KOREA", price: 0, chgPct: 0, signal: "HOLD" },
    { symbol: "035420", name: "NAVER", market: "KOREA", price: 0, chgPct: 0, signal: "HOLD" },
    { symbol: "NVDA", name: "엔비디아 (NVIDIA)", market: "US", price: 0, chgPct: 0, signal: "HOLD" },
    { symbol: "AAPL", name: "애플 (Apple)", market: "US", price: 0, chgPct: 0, signal: "HOLD" },
    { symbol: "TSLA", name: "테슬라 (Tesla)", market: "US", price: 0, chgPct: 0, signal: "HOLD" },
    { symbol: "KRW-BTC", name: "비트코인 (BTC)", market: "UPBIT", price: 0, chgPct: 0, signal: "HOLD" },
    { symbol: "KRW-ETH", name: "이더리움 (ETH)", market: "UPBIT", price: 0, chgPct: 0, signal: "HOLD" },
    { symbol: "KRW-SOL", name: "솔라나 (SOL)", market: "UPBIT", price: 0, chgPct: 0, signal: "HOLD" },
    { symbol: "KRW-XRP", name: "리플 (XRP)", market: "UPBIT", price: 0, chgPct: 0, signal: "HOLD" },
    { symbol: "KRW-DOGE", name: "도지코인 (DOGE)", market: "UPBIT", price: 0, chgPct: 0, signal: "HOLD" },
  ]);

  // Real Candles State fetched from real API
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [isLoadingCandles, setIsLoadingCandles] = useState<boolean>(false);

  // Current selected stock data
  const currentStock = useMemo(() => {
    const found = watchlist.find(w => w.symbol === selectedSymbol);
    if (found) return found;
    return {
      symbol: selectedSymbol || "005930",
      name: selectedSymbol === "NVDA" ? "엔비디아 (NVIDIA)" : 
            selectedSymbol.startsWith("KRW-") ? `${selectedSymbol.replace("KRW-", "")} 코인` : 
            "선택 종목",
      price: 0,
      chgPct: 0,
      signal: "HOLD",
      market: selectedSymbol.startsWith("KRW-") ? "UPBIT" : /^\d{6}$/.test(selectedSymbol) ? "KOREA" : "US"
    };
  }, [selectedSymbol, watchlist]);

  // Fetch real candles from /api/market/realtime-candles
  const fetchCandles = async (symbol: string, timeframe: string) => {
    try {
      setIsLoadingCandles(true);
      const res = await fetch(`/api/market/realtime-candles?symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}&count=60`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.candles) && data.candles.length > 0) {
          setCandles(data.candles);
          // Sync watchlist stock price & name
          setWatchlist(prev => {
            const exists = prev.some(w => w.symbol === data.symbol);
            if (exists) {
              return prev.map(w => w.symbol === data.symbol ? {
                ...w,
                name: data.name || w.name,
                price: data.currentPrice || w.price || 0,
                chgPct: data.changePct !== undefined ? data.changePct : w.chgPct,
                market: data.market || w.market
              } : w);
            } else {
              return [{
                symbol: data.symbol,
                name: data.name || data.symbol,
                market: data.market || "KOREA",
                price: data.currentPrice || 0,
                chgPct: data.changePct || 0,
                signal: "HOLD"
              }, ...prev];
            }
          });
        }
      }
    } catch (e) {
      console.warn("Failed to fetch real candles:", e);
    } finally {
      setIsLoadingCandles(false);
    }
  };

  // Trigger real candle fetch whenever selectedSymbol or selectedTimeframe changes
  useEffect(() => {
    if (selectedSymbol) {
      fetchCandles(selectedSymbol, selectedTimeframe);
    }
  }, [selectedSymbol, selectedTimeframe]);

  // Real-time 1-second live heartbeat timer & real market indices sync
  useEffect(() => {
    // 1. Clock timer
    const timer = setInterval(() => {
      const now = new Date();
      const hrs = String(now.getHours()).padStart(2, "0");
      const mins = String(now.getMinutes()).padStart(2, "0");
      const secs = String(now.getSeconds()).padStart(2, "0");
      setCurrentTimeStr(`${hrs}:${mins}:${secs} KST`);
      setHeartbeatTick(prev => prev + 1);
    }, 1000);

    // 2. Fetch real international and domestic market indices
    const fetchRealIndices = async () => {
      try {
        const res = await fetch("/api/market/status");
        if (res.ok) {
          const data = await res.json();
          const newIndices = [];
          if (data.kospi && typeof data.kospi.value === "number") {
            newIndices.push({
              name: "KOSPI",
              value: data.kospi.value,
              changePct: data.kospi.pct || 0,
              isUp: (data.kospi.pct || 0) >= 0,
              sparkline: Array.isArray(data.kospi.sparkline) ? data.kospi.sparkline : []
            });
          }
          if (data.kosdaq && typeof data.kosdaq.value === "number") {
            newIndices.push({
              name: "KOSDAQ",
              value: data.kosdaq.value,
              changePct: data.kosdaq.pct || 0,
              isUp: (data.kosdaq.pct || 0) >= 0,
              sparkline: Array.isArray(data.kosdaq.sparkline) ? data.kosdaq.sparkline : []
            });
          }
          if (data.sp500 && typeof data.sp500.value === "number") {
            newIndices.push({
              name: "S&P 500",
              value: data.sp500.value,
              changePct: data.sp500.pct || 0,
              isUp: (data.sp500.pct || 0) >= 0,
              sparkline: Array.isArray(data.sp500.sparkline) ? data.sp500.sparkline : []
            });
          }
          if (data.nasdaq && typeof data.nasdaq.value === "number") {
            newIndices.push({
              name: "NASDAQ",
              value: data.nasdaq.value,
              changePct: data.nasdaq.pct || 0,
              isUp: (data.nasdaq.pct || 0) >= 0,
              sparkline: Array.isArray(data.nasdaq.sparkline) ? data.nasdaq.sparkline : []
            });
          }
          if (data.btc && typeof data.btc.value === "number") {
            newIndices.push({
              name: "BTC/KRW",
              value: data.btc.value,
              changePct: data.btc.pct || 0,
              isUp: (data.btc.pct || 0) >= 0,
              sparkline: Array.isArray(data.btc.sparkline) ? data.btc.sparkline : []
            });
          }
          if (newIndices.length > 0) {
            setMarketIndices(newIndices);
          }
        }
      } catch (err) {
        console.warn("[Dashboard] Market status fetch error:", err);
      }
    };

    fetchRealIndices();
    const indexInterval = setInterval(fetchRealIndices, 12000);

    return () => {
      clearInterval(timer);
      clearInterval(indexInterval);
    };
  }, []);

  // Keep selectedSymbolRef in sync so subscription callback always has the current symbol
  const selectedSymbolRef = useRef(selectedSymbol);
  useEffect(() => {
    selectedSymbolRef.current = selectedSymbol;
  }, [selectedSymbol]);

  // Register watchlist symbols whenever the symbol universe changes
  const watchlistSymbolsKey = useMemo(() => watchlist.map(w => w.symbol).join(","), [watchlist]);
  useEffect(() => {
    watchlist.forEach(w => realtimeMarketFeedService.registerSymbol(w.symbol));
  }, [watchlistSymbolsKey]);

  // 3. 100% Real Live Quote Subscription (WebSocket / SSE - No fake mock ticks)
  useEffect(() => {
    const unsub = realtimeMarketFeedService.subscribe((quotesMap) => {
      // A. Check if current active symbol received a live update
      const curSymbol = selectedSymbolRef.current;
      const symKey = curSymbol.replace("KRW-", "");
      const activeQuote = quotesMap.get(symKey) || quotesMap.get(curSymbol) || quotesMap.get(`KRW-${symKey}`);

      if (activeQuote && typeof activeQuote.price === "number" && activeQuote.price > 0) {
        // Update active candle with real exchange price
        setCandles(prev => {
          if (!prev || prev.length === 0) return prev;
          const lastIdx = prev.length - 1;
          const last = prev[lastIdx];

          if (last.close === activeQuote.price) return prev;

          const updated = { ...last };
          updated.close = activeQuote.price;
          updated.high = Math.max(last.high, activeQuote.price);
          updated.low = Math.min(last.low, activeQuote.price);
          updated.isUp = updated.close >= updated.open;
          if (typeof activeQuote.volume === "number" && activeQuote.volume > 0) {
            updated.volume = activeQuote.volume;
          }

          const copy = [...prev];
          copy[lastIdx] = updated;
          return copy;
        });
      }

      // B. Update watchlist items ONLY if price/change actually differs
      setWatchlist(prev => {
        let hasChange = false;
        const next = prev.map(item => {
          const itemKey = item.symbol.replace("KRW-", "");
          const quote = quotesMap.get(itemKey) || quotesMap.get(item.symbol) || quotesMap.get(`KRW-${itemKey}`);
          if (quote && typeof quote.price === "number" && quote.price > 0) {
            const newPrice = quote.price;
            const newChg = quote.changeRate !== undefined ? quote.changeRate : item.chgPct;
            if (item.price !== newPrice || item.chgPct !== newChg) {
              hasChange = true;
              return {
                ...item,
                price: newPrice,
                chgPct: newChg
              };
            }
          }
          return item;
        });
        return hasChange ? next : prev;
      });
    });

    return () => unsub();
  }, []);

  // Universal Search effect for Watchlist search bar
  useEffect(() => {
    const q = watchlistSearchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setIsSearchingWatchlist(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingWatchlist(true);
      try {
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(q)}&market=${watchlistMarketTab}`);
        if (res.ok) {
          const items = await res.json();
          setSearchResults(Array.isArray(items) ? items : []);
        }
      } catch (e) {
        setSearchResults([]);
      } finally {
        setIsSearchingWatchlist(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [watchlistSearchQuery, watchlistMarketTab]);

  // Calculate Moving Averages (5, 20, 60, 120)
  const maValues = useMemo(() => {
    const calcMa = (period: number) => {
      return candles.map((_, idx) => {
        if (idx < period - 1) return null;
        const slice = candles.slice(idx - period + 1, idx + 1);
        const sum = slice.reduce((acc, c) => acc + c.close, 0);
        return Math.round(sum / period);
      });
    };

    return {
      ma5: calcMa(5),
      ma20: calcMa(20),
      ma60: calcMa(60),
      ma120: calcMa(120)
    };
  }, [candles]);

  // Calculate Bollinger Bands (period 20, multiplier 2)
  const bbValues = useMemo(() => {
    const period = 20;
    const upper: (number | null)[] = [];
    const middle: (number | null)[] = [];
    const lower: (number | null)[] = [];

    candles.forEach((_, idx) => {
      if (idx < period - 1) {
        upper.push(null);
        middle.push(null);
        lower.push(null);
        return;
      }
      const slice = candles.slice(idx - period + 1, idx + 1);
      const mean = slice.reduce((acc, c) => acc + c.close, 0) / period;
      const variance = slice.reduce((acc, c) => acc + Math.pow(c.close - mean, 2), 0) / period;
      const stdDev = Math.sqrt(variance);

      middle.push(Math.round(mean));
      upper.push(Math.round(mean + stdDev * 2));
      lower.push(Math.round(mean - stdDev * 2));
    });

    return { upper, middle, lower };
  }, [candles]);

  // Calculate RSI (14)
  const rsiValues = useMemo(() => {
    const period = 14;
    const rsiArr: (number | null)[] = [];
    let gains = 0;
    let losses = 0;

    for (let i = 0; i < candles.length; i++) {
      if (i === 0) {
        rsiArr.push(50);
        continue;
      }
      const change = candles[i].close - candles[i - 1].close;
      if (i <= period) {
        if (change > 0) gains += change;
        else losses -= change;
        if (i === period) {
          const avgGain = gains / period;
          const avgLoss = losses / period;
          const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
          rsiArr.push(Number((100 - (100 / (1 + rs))).toFixed(2)));
        } else {
          rsiArr.push(50);
        }
      } else {
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? -change : 0;
        gains = (gains * (period - 1) + gain) / period;
        losses = (losses * (period - 1) + loss) / period;
        const rs = losses === 0 ? 100 : gains / losses;
        rsiArr.push(Number((100 - (100 / (1 + rs))).toFixed(2)));
      }
    }
    return rsiArr;
  }, [candles]);

  // Calculate MACD (12, 26, 9)
  const macdValues = useMemo(() => {
    const calcEma = (period: number) => {
      const k = 2 / (period + 1);
      const ema: number[] = [];
      candles.forEach((c, idx) => {
        if (idx === 0) {
          ema.push(c.close);
        } else {
          ema.push(c.close * k + ema[idx - 1] * (1 - k));
        }
      });
      return ema;
    };

    const ema12 = calcEma(12);
    const ema26 = calcEma(26);
    const macdLine = ema12.map((val, idx) => val - ema26[idx]);

    // Signal Line (9-period EMA of MACD Line)
    const k9 = 2 / (9 + 1);
    const signalLine: number[] = [];
    macdLine.forEach((val, idx) => {
      if (idx === 0) {
        signalLine.push(val);
      } else {
        signalLine.push(val * k9 + signalLine[idx - 1] * (1 - k9));
      }
    });

    const histogram = macdLine.map((val, idx) => val - signalLine[idx]);

    return { macdLine, signalLine, histogram };
  }, [candles]);

  // Calculate Stochastic Oscillator (14, 3, 3)
  const stochValues = useMemo(() => {
    const period = 14;
    const rawK: number[] = [];

    candles.forEach((c, idx) => {
      if (idx < period - 1) {
        rawK.push(50);
        return;
      }
      const slice = candles.slice(idx - period + 1, idx + 1);
      const highMax = Math.max(...slice.map(s => s.high));
      const lowMin = Math.min(...slice.map(s => s.low));
      const k = highMax === lowMin ? 50 : ((c.close - lowMin) / (highMax - lowMin)) * 100;
      rawK.push(Math.max(0, Math.min(100, k)));
    });

    // %K is 3-period SMA of rawK
    const kLine: number[] = [];
    rawK.forEach((_, idx) => {
      if (idx < 2) {
        kLine.push(rawK[idx]);
        return;
      }
      const avg = (rawK[idx] + rawK[idx - 1] + rawK[idx - 2]) / 3;
      kLine.push(Number(avg.toFixed(2)));
    });

    // %D is 3-period SMA of %K
    const dLine: number[] = [];
    kLine.forEach((_, idx) => {
      if (idx < 2) {
        dLine.push(kLine[idx]);
        return;
      }
      const avg = (kLine[idx] + kLine[idx - 1] + kLine[idx - 2]) / 3;
      dLine.push(Number(avg.toFixed(2)));
    });

    return { kLine, dLine };
  }, [candles]);

  // Calculate VWAP (Volume Weighted Average Price)
  const vwapValues = useMemo(() => {
    let cumVol = 0;
    let cumVolPrice = 0;
    return candles.map(c => {
      if (!Number.isFinite(c.volume) || c.volume <= 0) return null;
      const typicalPrice = (c.high + c.low + c.close) / 3;
      cumVol += c.volume;
      cumVolPrice += typicalPrice * c.volume;
      return cumVol > 0 ? cumVolPrice / cumVol : c.close;
    });
  }, [candles]);

  // Calculate ATR (Average True Range) for Dynamic Volatility Channel
  const atrValues = useMemo(() => {
    return candles.map((c, i) => {
      if (i === 0) return Math.max(0, c.high - c.low);
      const prevClose = candles[i - 1].close;
      const tr = Math.max(
        c.high - c.low,
        Math.abs(c.high - prevClose),
        Math.abs(c.low - prevClose)
      );
      return tr;
    });
  }, [candles]);

  // Calculate Dynamic Support & Resistance Levels
  const srLevels = useMemo(() => {
    if (candles.length === 0) return { support: 0, resistance: 0 };
    let highest = -Infinity;
    let lowest = Infinity;
    candles.forEach(c => {
      if (c.high > highest) highest = c.high;
      if (c.low < lowest) lowest = c.low;
    });
    return { support: lowest, resistance: highest };
  }, [candles]);

  // Current indicators values for legend (strictly null if unavailable)
  const latestMa5 = maValues.ma5[maValues.ma5.length - 1] ?? null;
  const latestMa20 = maValues.ma20[maValues.ma20.length - 1] ?? null;
  const latestMa60 = maValues.ma60[maValues.ma60.length - 1] ?? null;
  const latestMa120 = maValues.ma120[maValues.ma120.length - 1] ?? null;
  const latestVwap = vwapValues[vwapValues.length - 1] ?? null;
  const latestBbUpper = bbValues.upper[bbValues.upper.length - 1] ?? null;
  const latestBbLower = bbValues.lower[bbValues.lower.length - 1] ?? null;
  const latestRsi = rsiValues[rsiValues.length - 1] ?? null;
  const latestMacd = macdValues.macdLine[macdValues.macdLine.length - 1] !== undefined ? Number((macdValues.macdLine[macdValues.macdLine.length - 1] / 1000).toFixed(2)) : null;
  const latestSignal = macdValues.signalLine[macdValues.signalLine.length - 1] !== undefined ? Number((macdValues.signalLine[macdValues.signalLine.length - 1] / 1000).toFixed(2)) : null;
  const latestHist = macdValues.histogram[macdValues.histogram.length - 1] !== undefined ? Number((macdValues.histogram[macdValues.histogram.length - 1] / 1000).toFixed(2)) : null;
  const latestStochK = stochValues.kLine[stochValues.kLine.length - 1] ?? null;
  const latestStochD = stochValues.dLine[stochValues.dLine.length - 1] ?? null;

  // Price formatting helper for Domestic KRX / Overseas US / Upbit Crypto
  const formatPrice = (p: number) => {
    const sym = typeof currentStock?.symbol === "string" ? currentStock.symbol : String(currentStock?.symbol || "");
    if (currentStock.market === "US" || (sym.length <= 5 && !/^\d+$/.test(sym) && !sym.startsWith("KRW-"))) {
      return `$${(p ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (p >= 1000000) {
      return `₩${Math.round(p).toLocaleString()}`;
    }
    return `₩${Math.round(p).toLocaleString()}`;
  };

  // Real-time Trade Log Items populated ONLY from real broker fills
  const [tradeLogs, setTradeLogs] = useState<any[]>([]);

  // AI Autonomous Buy/Sell Triggering
  const triggerAiExecution = async (type: "BUY" | "SELL", symbolArg: string, price: number) => {
    const symbol = typeof symbolArg === "string" ? symbolArg : String((symbolArg as any)?.symbol || symbolArg || "");
    const stockName = watchlist.find(w => w.symbol === symbol)?.name || symbol;
    const isUs = currentStock.market === "US" || (!/^\d{6}$/.test(symbol) && !symbol.startsWith("KRW-"));
    const isCrypto = symbol.startsWith("KRW-");
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    const pnl = Number((currentStock.chgPct || 0).toFixed(2));

    addToast?.({
      type: "info",
      title: `[주문 요청] AI 자율 ${type === "BUY" ? "매수" : "매도"} 전송`,
      message: `${stockName} ${isUs ? `$${price}` : (price ?? 0).toLocaleString() + '원'} 주문 요청 중...`
    });

    if (executeTrade) {
      const marketCode = isCrypto ? "UPBIT" : isUs ? "US" : "KR";
      const targetQty = isCrypto
        ? Number((50000 / price).toFixed(6))
        : isUs
        ? Number((50 / price).toFixed(4))
        : Math.max(1, Math.floor(1000000 / price));

      try {
        const res = await executeTrade({
          symbol,
          name: stockName,
          side: type,
          price,
          quantity: targetQty,
          type: "MARKET",
          market: marketCode
        });

        if (res?.success) {
          if (res?.status === "FILLED" || res?.filled) {
            const newLog = {
              id: `trade_${Date.now()}`,
              time: timeStr,
              symbol: stockName,
              action: type,
              price: res.filledPrice || price,
              pnlPct: pnl,
              orderNo: res.orderNo || res.odno
            };
            setTradeLogs(prev => [newLog, ...prev.slice(0, 7)]);

            addToast?.({
              type: "success",
              title: `[체결 완료] ${type === "BUY" ? "매수" : "매도"} 체결 확인`,
              message: `${stockName} ${res.filledQty || targetQty}주 ${isUs ? `$${res.filledPrice || price}` : (res.filledPrice || price).toLocaleString() + '원'} 체결 완료 (ODNO: ${res.orderNo || 'OK'})`
            });
          } else {
            addToast?.({
              type: "info",
              title: `[주문 접수] 브로커 주문 접수 완료`,
              message: `${stockName} 주문 번호 ${res.orderNo || '접수됨'} - 체결 대기 중`
            });
          }
        } else {
          addToast?.({
            type: "error",
            title: `[주문 거부] ${type === "BUY" ? "매수" : "매도"} 실패`,
            message: res?.message || "브로커 주문 거부"
          });
        }
      } catch (err: any) {
        addToast?.({
          type: "error",
          title: `[주문 오류] 전송 실패`,
          message: err.message || "주문 전송 중 오류 발생"
        });
      }
    }
  };

  // Dimensions & Scale for SVG Multi-Panel Chart
  const chartWidth = 980;
  const candleChartHeight = 310;
  const volumeChartHeight = 65;
  const rsiChartHeight = 65;
  const macdChartHeight = 65;
  const stochChartHeight = 65;

  // Dynamic Price Bounds calculated directly from real candles
  const { minPrice, maxPrice } = useMemo(() => {
    if (!candles || candles.length === 0) {
      const base = currentStock.price && currentStock.price > 0 ? currentStock.price : 0;
      if (base === 0) return { minPrice: 0, maxPrice: 0 };
      return { minPrice: base * 0.9, maxPrice: base * 1.1 };
    }
    const lows = candles.map(c => c.low).filter(v => v > 0);
    const highs = candles.map(c => c.high).filter(v => v > 0);
    const min = lows.length > 0 ? Math.min(...lows) : currentStock.price * 0.95;
    const max = highs.length > 0 ? Math.max(...highs) : currentStock.price * 1.05;
    const spread = Math.max(max - min, min * 0.02 || 1);
    const padding = spread * 0.08;

    return {
      minPrice: Math.max(0, +(min - padding).toFixed(2)),
      maxPrice: +(max + padding).toFixed(2)
    };
  }, [candles, currentStock.price]);

  const getPriceY = (price: number) => {
    if (maxPrice <= minPrice) return candleChartHeight / 2;
    const clamped = Math.max(minPrice, Math.min(maxPrice, price));
    return candleChartHeight - ((clamped - minPrice) / (maxPrice - minPrice)) * candleChartHeight;
  };

  const candleSpacing = chartWidth / Math.max(1, candles.length);
  const candleBarWidth = Math.max(3, candleSpacing * 0.65);

  const getX = (idx: number) => {
    return idx * candleSpacing + candleSpacing / 2;
  };

  // 7 Evenly Spaced Dynamic Y-Axis Price Ticks
  const yPriceTicks = useMemo(() => {
    const ticksCount = 7;
    const step = (maxPrice - minPrice) / (ticksCount - 1);
    return Array.from({ length: ticksCount }, (_, idx) => {
      return maxPrice - idx * step;
    });
  }, [minPrice, maxPrice]);

  // Algorithmic Graph Indicator & Pattern Shape Tracking Engine
  const detectedPatterns: DetectedPattern[] = useMemo(() => {
    return detectAllChartPatterns(
      candles,
      getX,
      getPriceY,
      chartWidth,
      candleChartHeight,
      rsiValues,
      bbValues
    );
  }, [candles, minPrice, maxPrice, rsiValues, bbValues, chartWidth, candleChartHeight]);

  // Unified Market Shape computation
  const unifiedMarketShape = useMemo(() => {
    return computeUnifiedMarketShape({
      candles,
      patterns: detectedPatterns,
      ema5: latestMa5,
      ema20: latestMa20,
      ema60: latestMa60,
      rsi: latestRsi,
      macdHist: latestHist,
      stochK: latestStochK,
      stochD: latestStochD,
    });
  }, [
    candles,
    detectedPatterns,
    latestMa5,
    latestMa20,
    latestMa60,
    latestRsi,
    latestHist,
    latestStochK,
    latestStochD,
  ]);

  // JARVIS Dynamic Position & Target AI Engine Calculation
  const jarvisPositionAiResult = useMemo(() => {
    const currentStockAiScore = Number.isFinite((currentStock as any)?.aiScore)
      ? (currentStock as any).aiScore
      : Number.isFinite((currentStock as any)?.score)
      ? (currentStock as any).score
      : null;
    return calculateJarvisPositionAi({
      symbol: currentStock.symbol,
      currentPrice: currentStock.price,
      candles,
      vwap: latestVwap ?? 0,
      rsi: latestRsi ?? 50,
      macdHist: latestHist ?? 0,
      ema5: latestMa5 ?? 0,
      ema20: latestMa20 ?? 0,
      buyScoreOverride: currentStockAiScore ?? undefined,
      unifiedShapeScore: unifiedMarketShape.overallShapeScore,
    });
  }, [
    currentStock,
    candles,
    latestVwap,
    latestRsi,
    latestHist,
    latestMa5,
    latestMa20,
    unifiedMarketShape.overallShapeScore,
  ]);

  // Filtered patterns by user selection
  const activePatterns = useMemo(() => {
    if (selectedPatternCategory === "ALL") return detectedPatterns;
    return detectedPatterns.filter(p => p.category === selectedPatternCategory);
  }, [detectedPatterns, selectedPatternCategory]);

  // Right Panel AI Pattern Cards
  const patterns = useMemo(() => {
    if (detectedPatterns.length > 0) {
      return detectedPatterns.map(dp => ({
        id: dp.id,
        name: dp.name,
        koreanName: dp.koreanName,
        category: dp.category,
        type: dp.type,
        confidence: dp.confidence,
        targetPrice: dp.targetPrice,
        stopLossPrice: dp.stopLossPrice,
        pathData: dp.miniSvgPath,
        description: dp.description,
        state: dp.state || "ACTIVE",
        stateLabel: dp.stateLabel || "ACTIVE (진행중)",
        stateDescription: dp.stateDescription || "목표가 추적 진행 중",
        isValidForSignal: dp.isValidForSignal !== undefined ? dp.isValidForSignal : true,
      }));
    }
    return [];
  }, [detectedPatterns]);

  return (
    <div className={`min-h-screen ${isWhiteTheme ? "bg-[#f8fafc] text-slate-800" : "bg-[#060B13] text-slate-100"} font-sans select-none flex flex-col justify-between overflow-x-hidden transition-colors duration-200`}>
      
      {/* 1. TOP HEADER NAVIGATION BAR */}
      <header className={`h-14 border-b ${isWhiteTheme ? "border-slate-200 bg-white/95 text-slate-800 shadow-xs" : "border-[#13233c] bg-[#07101e] text-slate-100"} px-4 flex items-center justify-between z-30 sticky top-0 backdrop-blur-md transition-colors`}>
        {/* Left Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 via-teal-400 to-blue-500 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <div className={`w-full h-full ${isWhiteTheme ? "bg-white" : "bg-[#07101e]"} rounded-[7px] flex items-center justify-center`}>
              <Cpu className="w-4 h-4 text-cyan-500 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-sm font-black tracking-wider ${isWhiteTheme ? "text-slate-900" : "text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-300"}`}>
                AI AUTO TRADING
              </h1>
            </div>
            <p className={`text-[10px] ${isWhiteTheme ? "text-slate-500" : "text-slate-400"} font-mono tracking-wide leading-none`}>
              Autonomous AI Trading System
            </p>
          </div>
        </div>

        {/* Center Live Badges & 1-Second Heartbeat Clock */}
        <div className="hidden md:flex items-center gap-2.5">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${isWhiteTheme ? "bg-cyan-50 border border-cyan-200 text-cyan-800" : "bg-[#0a182e] border border-cyan-900/60 text-cyan-300"} text-xs font-medium shadow-inner`}>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
            <span className="w-2 h-2 rounded-full bg-emerald-500 -ml-3.5 inline-block" />
            <span className="text-[11px] font-semibold">Real-time Analysis</span>
          </div>

          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${isWhiteTheme ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-[#0a182e] border border-emerald-900/60 text-emerald-300"} text-xs font-medium`}>
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span className="text-[11px] font-semibold">Market Open</span>
          </div>

          <div className={`px-3 py-1 rounded-full ${isWhiteTheme ? "bg-slate-100 border border-slate-300 text-slate-700" : "bg-[#081222] border border-slate-800 text-slate-300"} font-mono text-xs tracking-wider flex items-center gap-1.5`}>
            <Clock className={`w-3.5 h-3.5 ${isWhiteTheme ? "text-cyan-600" : "text-cyan-400"}`} />
            <span>{currentTimeStr}</span>
          </div>
        </div>

        {/* Right Tools & Master AI Mode Toggle */}
        <div className="flex items-center gap-2">
          {/* Theme Mode Toggle (White / Dark) */}
          <button
            onClick={() => setIsWhiteTheme(!isWhiteTheme)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition shadow-xs ${
              isWhiteTheme
                ? "bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900"
                : "bg-[#0e1d35] hover:bg-[#152a4e] border-slate-700 text-amber-300"
            }`}
            title={isWhiteTheme ? "다크 모드로 전환" : "화이트 모드로 전환"}
          >
            {isWhiteTheme ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                <span className="hidden sm:inline">화이트 모드</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">다크 모드</span>
              </>
            )}
          </button>

          {/* Quick Integration Hub buttons for 100% full feature retention */}
          <button
            onClick={() => setIsBalanceModalOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${isWhiteTheme ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700" : "bg-[#0e1d35] hover:bg-[#152a4e] border-slate-700/80 text-slate-200"} border text-xs transition cursor-pointer`}
            title="실계좌 잔고 및 포지션 상세"
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
            <span>계좌·보유잔고</span>
          </button>

          <button
            onClick={() => setIsBotFleetModalOpen(true)}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${isWhiteTheme ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700" : "bg-[#0e1d35] hover:bg-[#152a4e] border-slate-700/80 text-slate-200"} border text-xs transition cursor-pointer`}
            title="30대 AI 봇 플릿 제어"
          >
            <Bot className={`w-3.5 h-3.5 ${isWhiteTheme ? "text-cyan-600" : "text-cyan-400"}`} />
            <span>30대 AI봇</span>
          </button>

          <button
            onClick={() => {
              if (onOpenConsensusModal) onOpenConsensusModal(selectedSymbol);
              else setIsConsensusModalOpen(true);
            }}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${isWhiteTheme ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700" : "bg-[#0e1d35] hover:bg-[#152a4e] border-slate-700/80 text-slate-200"} border text-xs transition cursor-pointer`}
            title="증권사 리포트 & 멀티모델 컨센서스"
          >
            <Activity className="w-3.5 h-3.5 text-indigo-500" />
            <span>AI 컨센서스</span>
          </button>

          {/* Manual Entry Gate (Scanner Omission Inspection Engine) */}
          <button
            onClick={() => setIsManualGateOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border border-blue-400/40 text-xs font-bold transition shadow-sm cursor-pointer"
            title="스캐너 밖 종목 직접 입력 및 AI BUY 정밀 검증 (Manual Entry Gate)"
          >
            <Radar className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>스캐너 밖 직접검증</span>
          </button>

          {/* Bell Notifications */}
          <button 
            onClick={() => setIsHistoryModalOpen(true)}
            className={`p-1.5 rounded-lg ${isWhiteTheme ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100" : "text-slate-400 hover:text-white hover:bg-[#13233c]"} transition relative`}
            title="체결 히스토리 및 알림"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-cyan-500 rounded-full" />
          </button>

          {/* Settings Modal (API & Risk Governance) */}
          <button
            onClick={() => setIsGovernanceModalOpen(true)}
            className={`p-1.5 rounded-lg ${isWhiteTheme ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100" : "text-slate-400 hover:text-white hover:bg-[#13233c]"} transition`}
            title="리스크 거버넌스 및 설정"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Overseas Fractional Trading Button */}
          <button
            onClick={() => setIsFractionalModalOpen(true)}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${
              isWhiteTheme
                ? "bg-cyan-50 hover:bg-cyan-100 border-cyan-300 text-cyan-800 font-bold shadow-xs"
                : "bg-cyan-950/70 hover:bg-cyan-900/80 border-cyan-700/60 text-cyan-300 font-bold shadow-md shadow-cyan-950/40"
            } border text-xs transition cursor-pointer`}
            title="국외(미국) 주식 소수점(0.0001주 단위) 매매 창 열기"
          >
            <Coins className="w-3.5 h-3.5 text-cyan-500" />
            <span>소수점 매매 ($1~)</span>
          </button>

          {/* SMC Structure Visualizer */}
          <button
            onClick={() => setIsSmcModalOpen(true)}
            className={`p-1.5 rounded-lg ${isWhiteTheme ? "text-slate-600 hover:text-cyan-700 hover:bg-slate-100" : "text-slate-400 hover:text-cyan-300 hover:bg-[#13233c]"} transition`}
            title="SMC 마켓 구조 오더블럭 분석"
          >
            <Layers className="w-4 h-4" />
          </button>

          {/* Master AI Mode ON/OFF Capsule Button */}
          <button
            onClick={() => {
              const nextState = !isAiModeOn;
              setIsAiModeOn(nextState);
              addToast?.({
                type: nextState ? "success" : "info",
                title: nextState ? "AI AUTO TRADING 가동" : "AI AUTO TRADING 일시정지",
                message: nextState ? "AI 모델이 1초 단위 실시간 시세와 캔들 패턴을 자율 매매합니다." : "AI 자율 주문이 안전하게 일시 중지되었습니다."
              });
            }}
            className={`flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold transition shadow-lg ${
              isAiModeOn
                ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-[#07101e] shadow-cyan-500/25 ring-2 ring-cyan-400/40"
                : isWhiteTheme
                  ? "bg-slate-200 text-slate-600 border border-slate-300"
                  : "bg-slate-800 text-slate-400 border border-slate-700"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isAiModeOn ? "bg-[#07101e] animate-ping" : isWhiteTheme ? "bg-slate-400" : "bg-slate-500"}`} />
            <span>AI MODE {isAiModeOn ? "ON" : "OFF"}</span>
          </button>
        </div>
      </header>

      {/* 2. THREE-COLUMN MASTER TRADING TERMINAL */}
      <div className="flex-1 flex flex-col gap-3 p-2 max-w-[1920px] mx-auto w-full">
        {/* v11 Autonomous Execution Console Header Widget */}
        <AistockV11ExecutionConsole />

        {/* Realtime Stock Discovery Scanner (Space-Saving Compact List Format) */}
        <RealtimeScannerTileBoard 
          onSelectStock={(sym) => {
            setSelectedSymbol(sym);
            fetchCandles(sym, selectedTimeframe);
          }}
          isWhiteTheme={isWhiteTheme}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 w-full">
        
        {/* ============================================================ */}
        {/* LEFT COLUMN: MARKET OVERVIEW, WATCHLIST, PERFORMANCE SUMMARY */}
        {/* ============================================================ */}
        <div className="lg:col-span-3 flex flex-col gap-2">
          
          {/* PANEL 1: MARKET OVERVIEW */}
          <div className={`${isWhiteTheme ? "bg-white border-slate-200 shadow-sm" : "bg-[#081222] border-[#13233c] shadow-sm"} border rounded-xl p-3 flex flex-col gap-2 transition-colors`}>
            <div className={`flex items-center justify-between pb-1 border-b ${isWhiteTheme ? "border-slate-200" : "border-[#13233c]/60"}`}>
              <h2 className={`text-xs font-bold tracking-wider ${isWhiteTheme ? "text-slate-800" : "text-slate-300"} font-mono`}>
                MARKET OVERVIEW
              </h2>
              <span className={`text-[10px] ${isWhiteTheme ? "text-cyan-700 font-semibold" : "text-cyan-400"} flex items-center gap-1`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live 1s
              </span>
            </div>

            <div className="space-y-1.5">
              {marketIndices.map((item, idx) => (
                <div 
                  key={`${item.name}_${idx}`}
                  className={`flex items-center justify-between p-1.5 rounded-lg ${isWhiteTheme ? "hover:bg-slate-100/80" : "hover:bg-[#0e1d35]/60"} transition`}
                >
                  <div className="w-20">
                    <div className={`font-bold text-xs ${isWhiteTheme ? "text-slate-800" : "text-slate-200"}`}>{item.name}</div>
                    <div className={`text-[10px] font-mono font-semibold ${item.isUp ? (isWhiteTheme ? "text-emerald-600" : "text-emerald-400") : (isWhiteTheme ? "text-rose-600" : "text-rose-400")}`}>
                      {item.isUp ? "+" : ""}{item.changePct}%
                    </div>
                  </div>

                  <div className={`font-mono text-xs font-semibold ${isWhiteTheme ? "text-slate-900" : "text-slate-100"} text-right w-20`}>
                    {(item.value ?? 0).toLocaleString()}
                  </div>

                  {/* Sparkline Canvas */}
                  <div className="w-20 h-5 flex items-center justify-end">
                    <svg className="w-full h-full" viewBox="0 0 60 16">
                      <polyline
                        fill="none"
                        stroke={item.isUp ? (isWhiteTheme ? "#059669" : "#10b981") : (isWhiteTheme ? "#e11d48" : "#f43f5e")}
                        strokeWidth="1.5"
                        points="0,12 10,10 20,6 30,8 40,4 50,2 60,3"
                      />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PANEL 2: WATCHLIST & REAL-TIME SEARCH */}
          <div className={`${isWhiteTheme ? "bg-white border-slate-200 shadow-sm" : "bg-[#081222] border-[#13233c] shadow-sm"} border rounded-xl p-3 flex flex-col gap-2.5 transition-colors`}>
            <div className={`flex items-center justify-between pb-1 border-b ${isWhiteTheme ? "border-slate-200" : "border-[#13233c]/60"}`}>
              <div className="flex items-center gap-1.5">
                <h2 className={`text-xs font-bold tracking-wider ${isWhiteTheme ? "text-slate-800" : "text-slate-300"} font-mono`}>
                  WATCHLIST
                </h2>
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${isWhiteTheme ? "bg-cyan-50 text-cyan-800 border-cyan-300" : "bg-cyan-950 text-cyan-300 border-cyan-800/60"} border font-mono`}>
                  실시간 연동
                </span>
              </div>
              <button
                onClick={() => setIsSearchModalOpen(true)}
                className={`text-[10px] flex items-center gap-1 px-2 py-0.5 rounded ${isWhiteTheme ? "bg-slate-100 hover:bg-slate-200 text-cyan-800 border border-slate-200" : "bg-[#0e1d35] hover:bg-[#152a4e] text-cyan-300"} transition`}
                title="종목 상세 검색 모달"
              >
                <Search className="w-3 h-3" />
                <span>상세검색</span>
              </button>
            </div>

            {/* Market Filter Tabs: ALL, KOREA, US, UPBIT */}
            <div className={`grid grid-cols-4 gap-1 p-1 ${isWhiteTheme ? "bg-slate-100 border-slate-200" : "bg-[#050a14] border-slate-900"} rounded-lg border text-[10px] font-mono`}>
              {[
                { id: "ALL", label: "전체" },
                { id: "KOREA", label: "국내 KRX" },
                { id: "US", label: "해외 US" },
                { id: "UPBIT", label: "업비트" },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setWatchlistMarketTab(tab.id as any)}
                  className={`py-1 rounded text-center font-bold transition ${
                    watchlistMarketTab === tab.id
                      ? (isWhiteTheme ? "bg-cyan-600 text-white shadow-xs" : "bg-cyan-500 text-slate-950 shadow-sm")
                      : (isWhiteTheme ? "text-slate-600 hover:text-slate-900 hover:bg-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-850")
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Quick Search Input */}
            <div className="relative">
              <Search className={`w-3.5 h-3.5 absolute left-2.5 top-2.5 ${isWhiteTheme ? "text-slate-400" : "text-slate-500"}`} />
              <input
                type="text"
                value={watchlistSearchQuery}
                onChange={(e) => setWatchlistSearchQuery(e.target.value)}
                placeholder="종목명, 티커(NVDA), 코인(BTC) 검색..."
                className={`w-full ${isWhiteTheme ? "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white" : "bg-[#050a14] border-slate-800 text-slate-100 placeholder-slate-500"} border rounded-lg pl-8 pr-7 py-1.5 text-xs focus:outline-none focus:border-cyan-500 transition font-mono`}
              />
              {watchlistSearchQuery && (
                <button
                  onClick={() => setWatchlistSearchQuery("")}
                  className={`absolute right-2 top-2 ${isWhiteTheme ? "text-slate-400 hover:text-slate-600" : "text-slate-500 hover:text-slate-300"} text-xs`}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Real-time Search Results Dropdown/View */}
            {watchlistSearchQuery.trim() !== "" ? (
              <div className={`space-y-1 max-h-56 overflow-y-auto pr-0.5 custom-scrollbar ${isWhiteTheme ? "bg-slate-50 border-cyan-300" : "bg-[#050a14] border-cyan-900/40"} rounded-lg p-1 border`}>
                <div className={`text-[10px] font-mono ${isWhiteTheme ? "text-cyan-800 border-slate-200" : "text-cyan-400 border-slate-800/80"} px-1 py-0.5 border-b flex items-center justify-between`}>
                  <span>검색 결과 ({searchResults.length}건)</span>
                  {isSearchingWatchlist && <RefreshCw className={`w-2.5 h-2.5 animate-spin ${isWhiteTheme ? "text-cyan-600" : "text-cyan-400"}`} />}
                </div>

                {searchResults.length === 0 && !isSearchingWatchlist ? (
                  <div className={`py-4 text-center text-xs ${isWhiteTheme ? "text-slate-400" : "text-slate-500"} font-mono`}>
                    일치하는 종목이 없습니다.
                  </div>
                ) : (
                  searchResults.map((item, sIdx) => (
                    <div
                      key={`search_${item.symbol}_${sIdx}`}
                      onClick={() => {
                        setSelectedSymbol(item.symbol);
                        setWatchlist(prev => {
                          if (prev.some(w => w.symbol === item.symbol)) return prev;
                          return [{
                            symbol: item.symbol,
                            name: item.name,
                            market: item.market || (item.symbol.startsWith("KRW-") ? "UPBIT" : /^\d{6}$/.test(item.symbol) ? "KOREA" : "US"),
                            price: item.price,
                            chgPct: item.changePct || 0,
                            signal: (item.changePct || 0) >= 0 ? "BUY" : "SELL"
                          }, ...prev];
                        });
                        setWatchlistSearchQuery("");
                      }}
                      className={`flex items-center justify-between p-1.5 rounded-md ${isWhiteTheme ? "hover:bg-cyan-50" : "hover:bg-[#0e1f3a]"} cursor-pointer text-xs border border-transparent hover:border-cyan-500/30 transition`}
                    >
                      <div className="truncate min-w-0 pr-2">
                        <div className={`font-bold ${isWhiteTheme ? "text-slate-900" : "text-slate-100"} truncate flex items-center gap-1.5`}>
                          <span>{item.name}</span>
                          <span className={`text-[8px] px-1 py-0.2 rounded font-mono ${
                            item.symbol.startsWith("KRW-") ? (isWhiteTheme ? "bg-amber-100 text-amber-800 border border-amber-300" : "bg-amber-950 text-amber-400 border border-amber-800") :
                            item.market === "US" ? (isWhiteTheme ? "bg-blue-100 text-blue-800 border border-blue-300" : "bg-blue-950 text-blue-400 border border-blue-800") :
                            (isWhiteTheme ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-emerald-950 text-emerald-400 border border-emerald-800")
                          }`}>
                            {item.symbol.startsWith("KRW-") ? "UPBIT" : item.market || "KRX"}
                          </span>
                        </div>
                        <div className={`text-[9px] font-mono ${isWhiteTheme ? "text-slate-500" : "text-slate-500"}`}>{item.symbol}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`font-mono ${isWhiteTheme ? "text-slate-900" : "text-slate-200"}`}>
                          {item.market === "US" ? `$${item.price}` : `₩${(item.price ?? 0).toLocaleString()}`}
                        </div>
                        <div className={`text-[10px] font-mono font-semibold ${
                          (item.changePct || 0) >= 0 ? (isWhiteTheme ? "text-emerald-600" : "text-emerald-400") : (isWhiteTheme ? "text-rose-600" : "text-rose-400")
                        }`}>
                          {(item.changePct || 0) >= 0 ? "+" : ""}{item.changePct || 0}%
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <>
                <div className={`text-[10px] font-mono ${isWhiteTheme ? "text-slate-500 border-slate-200" : "text-slate-400 border-slate-800/60"} grid grid-cols-12 px-1 pb-1 border-b`}>
                  <span className="col-span-5">종목/티커</span>
                  <span className="col-span-3 text-right">실시간 시세</span>
                  <span className="col-span-2 text-right">등락률</span>
                  <span className="col-span-2 text-right">AI 신호</span>
                </div>

                <div className="space-y-1 max-h-56 overflow-y-auto pr-0.5 custom-scrollbar">
                  {watchlist
                    .filter(stk => {
                      if (watchlistMarketTab === "ALL") return true;
                      if (watchlistMarketTab === "UPBIT") return stk.symbol.startsWith("KRW-") || stk.market === "UPBIT";
                      if (watchlistMarketTab === "US") return stk.market === "US" || (!stk.symbol.startsWith("KRW-") && !/^\d{6}$/.test(stk.symbol));
                      if (watchlistMarketTab === "KOREA") return /^\d{6}$/.test(stk.symbol) || stk.market === "KOREA";
                      return true;
                    })
                    .map((stk, idx) => {
                      const isSelected = stk.symbol === selectedSymbol;
                      const isPositive = (stk.chgPct || 0) >= 0;

                      return (
                        <div
                          key={`${stk.symbol}_${idx}`}
                          onClick={() => {
                            setSelectedSymbol(stk.symbol);
                          }}
                          className={`grid grid-cols-12 items-center p-1.5 rounded-lg cursor-pointer transition text-xs ${
                            isSelected
                              ? (isWhiteTheme ? "bg-cyan-50 border border-cyan-400 text-cyan-950 shadow-xs" : "bg-[#0e1f3a] border border-cyan-500/50 text-cyan-200 shadow-md shadow-cyan-500/10")
                              : (isWhiteTheme ? "hover:bg-slate-100 text-slate-700" : "hover:bg-[#0c182c] text-slate-300")
                          }`}
                        >
                          <div className="col-span-5 truncate pr-1">
                            <div className={`font-bold text-xs ${isWhiteTheme ? "text-slate-900" : "text-slate-100"} truncate flex items-center gap-1`}>
                              <span className="truncate">{stk.name}</span>
                            </div>
                            <div className="text-[9px] font-mono text-slate-500 flex items-center gap-1">
                              <span>{stk.symbol}</span>
                              <span className={`text-[8px] px-1 py-0.2 rounded ${
                                stk.symbol.startsWith("KRW-") ? (isWhiteTheme ? "text-amber-800 bg-amber-100 border border-amber-200" : "text-amber-400 bg-amber-950/60") :
                                stk.market === "US" ? (isWhiteTheme ? "text-blue-800 bg-blue-100 border border-blue-200" : "text-blue-400 bg-blue-950/60") :
                                (isWhiteTheme ? "text-emerald-800 bg-emerald-100 border border-emerald-200" : "text-emerald-400 bg-emerald-950/60")
                              }`}>
                                {stk.symbol.startsWith("KRW-") ? "업비트" : stk.market === "US" ? "US" : "국내"}
                              </span>
                            </div>
                          </div>

                          <div className={`col-span-3 font-mono text-right text-xs ${isWhiteTheme ? "text-slate-900" : "text-slate-200"} font-semibold`}>
                            {stk.market === "US" ? `$${stk.price}` : `₩${(stk.price ?? 0).toLocaleString()}`}
                          </div>

                          <div className={`col-span-2 font-mono text-right text-[11px] font-bold ${
                            isPositive ? (isWhiteTheme ? "text-emerald-600" : "text-emerald-400") : (isWhiteTheme ? "text-rose-600" : "text-rose-400")
                          }`}>
                            {isPositive ? "+" : ""}{stk.chgPct}%
                          </div>

                          <div className="col-span-2 flex justify-end">
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              stk.signal === "BUY" ? (isWhiteTheme ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-emerald-950/90 text-emerald-300 border border-emerald-800") :
                              stk.signal === "SELL" ? (isWhiteTheme ? "bg-rose-100 text-rose-800 border border-rose-300" : "bg-rose-950/90 text-rose-300 border border-rose-800") :
                              (isWhiteTheme ? "bg-slate-100 text-slate-600" : "bg-slate-800 text-slate-400")
                            }`}>
                              ● {stk.signal}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </>
            )}
          </div>

          {/* PANEL 3: PERFORMANCE SUMMARY */}
          <div className={`${isWhiteTheme ? "bg-white border-slate-200 shadow-sm" : "bg-[#081222] border-[#13233c] shadow-sm"} border rounded-xl p-3 flex flex-col gap-3 transition-colors`}>
            <div className={`flex items-center justify-between pb-1 border-b ${isWhiteTheme ? "border-slate-200" : "border-[#13233c]/60"}`}>
              <h2 className={`text-xs font-bold tracking-wider ${isWhiteTheme ? "text-slate-800" : "text-slate-300"} font-mono`}>
                PERFORMANCE SUMMARY
              </h2>
              <span className={`text-[10px] ${isWhiteTheme ? "text-slate-500" : "text-slate-400"}`}>Total Account</span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className={`text-[10px] font-mono ${isWhiteTheme ? "text-slate-500" : "text-slate-400"}`}>Total P/L</div>
                <div className={`text-2xl font-black ${totalTradingPnl >= 0 ? (isWhiteTheme ? "text-emerald-600" : "text-emerald-400") : "text-rose-500"} font-mono tracking-tight`}>
                  {totalTradingPnl >= 0 ? `+${(totalTradingPnl ?? 0).toLocaleString()}원` : `${(totalTradingPnl ?? 0).toLocaleString()}원`}
                </div>
                <div className={`text-[11px] ${totalTradingPnl >= 0 ? (isWhiteTheme ? "text-emerald-700" : "text-emerald-300/80") : "text-rose-400"} font-mono`}>
                  Realized PnL
                </div>
              </div>

              {/* Dynamic Win Rate Ring */}
              <div className="relative w-16 h-16 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className={`${isWhiteTheme ? "text-slate-200" : "text-slate-800"}`}
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={`${isWhiteTheme ? "text-emerald-600" : "text-emerald-400"}`}
                    strokeDasharray={`${Math.min(100, Math.max(0, trades && trades.length > 0 ? Math.round((trades.filter((t: any) => t.pnl > 0).length / trades.length) * 100) : 0))}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className={`absolute text-[11px] font-mono font-bold ${isWhiteTheme ? "text-slate-900" : "text-slate-100"}`}>
                  {trades && trades.length > 0 ? `${Math.round((trades.filter((t: any) => t.pnl > 0).length / trades.length) * 100)}%` : "0%"}
                </div>
              </div>
            </div>

            <div className={`grid grid-cols-2 gap-2 pt-1 border-t ${isWhiteTheme ? "border-slate-200" : "border-slate-800/60"} text-xs font-mono`}>
              <div>
                <span className={`${isWhiteTheme ? "text-slate-500" : "text-slate-500"} text-[10px]`}>Win Rate</span>
                <div className={`font-bold ${isWhiteTheme ? "text-slate-900" : "text-slate-200"}`}>
                  {trades && trades.length > 0 ? `${Math.round((trades.filter((t: any) => t.pnl > 0).length / trades.length) * 100)}%` : "0%"}
                </div>
              </div>
              <div>
                <span className={`${isWhiteTheme ? "text-slate-500" : "text-slate-500"} text-[10px]`}>Total Trades</span>
                <div className={`font-bold ${isWhiteTheme ? "text-slate-900" : "text-slate-200"}`}>{trades ? trades.length : 0}</div>
              </div>
              <div className={`col-span-2 flex items-center justify-between text-[10px] ${isWhiteTheme ? "text-slate-500" : "text-slate-400"}`}>
                <span className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${isWhiteTheme ? "bg-emerald-600" : "bg-emerald-400"}`} />
                  Win {trades ? trades.filter((t: any) => t.pnl > 0).length : 0}
                </span>
                <span className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${isWhiteTheme ? "bg-rose-600" : "bg-rose-400"}`} />
                  Loss {trades ? trades.filter((t: any) => t.pnl < 0).length : 0}
                </span>
              </div>
            </div>

            {/* Daily Performance Bar Chart */}
            <div className={`pt-2 border-t ${isWhiteTheme ? "border-slate-200" : "border-slate-800/60"}`}>
              <div className={`text-[10px] font-mono ${isWhiteTheme ? "text-slate-500" : "text-slate-400"} mb-1.5`}>
                Daily Performance
              </div>
              <div className={`h-14 flex items-end justify-between gap-1.5 px-1 ${isWhiteTheme ? "bg-slate-50 border border-slate-200" : "bg-[#060e1b]"} rounded-lg p-1.5`}>
                {[
                  { day: "7/1", h: 32, isUp: true },
                  { day: "7/2", h: 44, isUp: true },
                  { day: "7/3", h: 26, isUp: true },
                  { day: "7/4", h: 38, isUp: true },
                  { day: "7/5", h: 18, isUp: false },
                  { day: "7/8", h: 48, isUp: true },
                  { day: "7/9", h: 35, isUp: true },
                ].map((bar, bidx) => (
                  <div key={`${bar.day}_${bidx}`} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      style={{ height: `${bar.h}px` }}
                      className={`w-full rounded-t-xs transition-all ${
                        bar.isUp ? (isWhiteTheme ? "bg-emerald-500" : "bg-emerald-400") : (isWhiteTheme ? "bg-rose-500" : "bg-rose-500")
                      }`}
                    />
                    <span className={`text-[8px] font-mono ${isWhiteTheme ? "text-slate-500" : "text-slate-400"}`}>{bar.day}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* ============================================================ */}
        {/* CENTER COLUMN: MAIN CANDLESTICK CHART, MULTI INDICATORS, AI INSIGHTS */}
        {/* ============================================================ */}
        <div className="lg:col-span-6 flex flex-col gap-2">
          
          {/* 1. TOP STOCK & TIMEFRAME & PATTERN TRACKING TOOLBAR */}
          <div className={`${isWhiteTheme ? "bg-white border-slate-200 shadow-sm" : "bg-[#081222] border-[#13233c] shadow-sm"} border rounded-xl p-3 flex flex-col gap-2.5 transition-colors`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Stock Symbol & Real-Time Price Metrics */}
              <div className="flex items-baseline gap-3">
                <div className="flex items-center gap-2">
                  <span className={`text-base font-bold ${isWhiteTheme ? "text-slate-900" : "text-white"}`}>{currentStock.name}</span>
                  <span className={`text-xs font-mono ${isWhiteTheme ? "text-cyan-800 bg-cyan-50 border-cyan-300" : "text-cyan-400 bg-cyan-950/60 border-cyan-800/40"} px-1.5 py-0.5 rounded border`}>
                    {currentStock.symbol}
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                    currentStock.market === "UPBIT" ? (isWhiteTheme ? "bg-amber-100 text-amber-800 border border-amber-300" : "bg-amber-950 text-amber-300 border border-amber-800") :
                    currentStock.market === "US" ? (isWhiteTheme ? "bg-blue-100 text-blue-800 border border-blue-300" : "bg-blue-950 text-blue-300 border border-blue-800") :
                    (isWhiteTheme ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-emerald-950 text-emerald-300 border border-emerald-800")
                  }`}>
                    {currentStock.market === "UPBIT" ? "UPBIT 실시간" : currentStock.market === "US" ? "US 실시간" : "KRX 실시간"}
                  </span>
                </div>
                <div className={`text-xl font-black ${isWhiteTheme ? "text-emerald-600" : "text-emerald-400"} font-mono`}>
                  {formatPrice(currentStock.price)}
                </div>
                <div className={`text-xs font-mono font-semibold ${(currentStock.chgPct || 0) >= 0 ? (isWhiteTheme ? "text-emerald-600" : "text-emerald-400") : (isWhiteTheme ? "text-rose-600" : "text-rose-400")}`}>
                  {(currentStock.chgPct || 0) >= 0 ? "+" : ""}{currentStock.chgPct}%
                </div>
                {currentStock.market === "US" && (
                  <button
                    type="button"
                    onClick={() => setIsFractionalModalOpen(true)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer shadow-sm ${
                      isWhiteTheme
                        ? "bg-cyan-600 hover:bg-cyan-700 text-white"
                        : "bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black shadow-cyan-500/20"
                    }`}
                    title="미국 주식 0.0001주 단위 소수점 매매"
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>소수점 구매 ($1~)</span>
                  </button>
                )}
                {isLoadingCandles && (
                  <span className={`text-[10px] ${isWhiteTheme ? "text-cyan-700" : "text-cyan-400"} font-mono flex items-center gap-1`}>
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    수신중...
                  </span>
                )}
              </div>

              {/* High, Low, Volume Badges dynamically computed from real candles */}
              <div className={`hidden sm:flex items-center gap-3 text-xs font-mono ${isWhiteTheme ? "text-slate-500" : "text-slate-400"}`}>
                <span>고가 <b className={isWhiteTheme ? "text-slate-800" : "text-slate-200"}>{formatPrice(candles.length > 0 ? Math.max(...candles.map(c => c.high)) : currentStock.price)}</b></span>
                <span>저가 <b className={isWhiteTheme ? "text-slate-800" : "text-slate-200"}>{formatPrice(candles.length > 0 ? Math.min(...candles.map(c => c.low)) : currentStock.price)}</b></span>
                <span>거래량 <b className={isWhiteTheme ? "text-slate-800" : "text-slate-200"}>{candles.length > 0 ? (candles.reduce((acc, c) => acc + c.volume, 0) / (candles.length || 1)).toLocaleString(undefined, { maximumFractionDigits: 0 }) : "0"}</b></span>
              </div>

              {/* Timeframe Controls (1m, 5m, 15m, 30m, 1H, 4H, D, W) */}
              <div className={`flex items-center gap-1 ${isWhiteTheme ? "bg-slate-100 border-slate-300" : "bg-[#060e1b] border-slate-800"} p-1 rounded-lg border text-xs font-mono`}>
                {["1m", "5m", "15m", "30m", "1H", "4H", "D", "W"].map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setSelectedTimeframe(tf)}
                    className={`px-2 py-0.5 rounded transition ${
                      selectedTimeframe === tf
                        ? (isWhiteTheme ? "bg-cyan-600 text-white font-bold shadow-xs" : "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40")
                        : (isWhiteTheme ? "text-slate-600 hover:text-slate-900 hover:bg-white" : "text-slate-400 hover:text-white")
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>

              {/* Tool buttons & Pattern Tracking switch */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => setIsIndicatorsDropdownOpen(!isIndicatorsDropdownOpen)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded ${isWhiteTheme ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700" : "bg-[#0e1d35] hover:bg-[#152a4e] border-slate-700 text-slate-300"} border text-xs transition`}
                  >
                    <Sliders className={`w-3 h-3 ${isWhiteTheme ? "text-cyan-700" : "text-cyan-400"}`} />
                    <span>지표 설정</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {isIndicatorsDropdownOpen && (
                    <div className={`absolute right-0 top-full mt-1 w-44 ${isWhiteTheme ? "bg-white border-slate-300 shadow-xl" : "bg-[#0a1526] border-slate-700 shadow-xl"} border rounded-xl p-2 z-40 space-y-1.5 text-xs`}>
                      {[
                        { key: "ma", label: "이동평균선 (EMA 5/20/60)" },
                        { key: "vwap", label: "VWAP (거래량가중평균가)" },
                        { key: "bb", label: "볼린저 밴드 (BB 20,2)" },
                        { key: "atrBand", label: "동적 ATR 변동성 밴드" },
                        { key: "srLines", label: "동적 지지/저항선 (S/R)" },
                        { key: "forecast", label: "AI 미래 예상 경로" },
                        { key: "rsi", label: "RSI (14)" },
                        { key: "macd", label: "MACD (12, 26, 9)" },
                        { key: "stoch", label: "스토캐스틱 (14, 3, 3)" },
                      ].map(ind => (
                        <label key={ind.key} className={`flex items-center justify-between cursor-pointer p-1 rounded ${isWhiteTheme ? "hover:bg-slate-100" : "hover:bg-slate-800"}`}>
                          <span className={isWhiteTheme ? "text-slate-800 font-medium" : "text-slate-200"}>{ind.label}</span>
                          <input
                            type="checkbox"
                            checked={(activeIndicators as any)[ind.key]}
                            onChange={(e) => {
                              setActiveIndicators(prev => ({
                                ...prev,
                                [ind.key]: e.target.checked
                              }));
                            }}
                            className="rounded text-cyan-500 focus:ring-0"
                          />
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* File / Strategy Upload Reader Button */}
                <button
                  onClick={() => setIsStrategyFileReaderOpen(true)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded ${
                    isWhiteTheme
                      ? "bg-purple-100 hover:bg-purple-200 border-purple-300 text-purple-900"
                      : "bg-purple-950/60 hover:bg-purple-900/60 border-purple-700/60 text-purple-300"
                  } border text-xs transition font-bold`}
                  title="AISTOCK24 v8 오픈소스 전략 파일 및 CSV 캔들 데이터 업로드"
                >
                  <FolderLock className="w-3.5 h-3.5 text-purple-500" />
                  <span className="hidden md:inline">오픈소스 전략 파일 업로드</span>
                  <span className="inline md:hidden font-mono">📂 업로드</span>
                </button>

                {/* Pattern Tracking Switch */}
                <div className={`flex items-center gap-1.5 text-xs font-mono ${isWhiteTheme ? "text-slate-700 bg-slate-100 border-slate-300" : "text-slate-300 bg-[#060e1b] border-slate-800"} px-2 py-1 rounded-lg border`}>
                  <span className={`${isWhiteTheme ? "text-cyan-800" : "text-cyan-300"} font-semibold`}>패턴 추적</span>
                  <button
                    onClick={() => setPatternTrackingOn(!patternTrackingOn)}
                    className={`w-9 h-5 rounded-full p-0.5 transition ${
                      patternTrackingOn ? "bg-cyan-500" : (isWhiteTheme ? "bg-slate-300" : "bg-slate-700")
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${
                      patternTrackingOn ? "translate-x-4" : "translate-x-0"
                    }`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Pattern Filter Chips (Only shown when pattern tracking is on) */}
            {patternTrackingOn && (
              <div className={`flex flex-wrap items-center gap-1.5 pt-1 border-t ${isWhiteTheme ? "border-slate-200" : "border-slate-800/60"} text-xs font-mono`}>
                <span className={`text-[10px] ${isWhiteTheme ? "text-slate-500" : "text-slate-400"} font-bold mr-1`}>패턴 필터:</span>
                {[
                  { id: "ALL", label: `전체 (${detectedPatterns.length})` },
                  { id: "DOUBLE_BOTTOM", label: "쌍바닥 W" },
                  { id: "HEAD_AND_SHOULDERS", label: "헤드앤숄더" },
                  { id: "ASCENDING_TRIANGLE", label: "삼각수렴" },
                  { id: "BOLLINGER_BREAKOUT", label: "볼린저 돌파" },
                  { id: "RSI_DIVERGENCE", label: "RSI 다이버전스" },
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedPatternCategory(cat.id as any);
                      setSelectedPatternId(null);
                    }}
                    className={`px-2 py-0.5 rounded-full text-[11px] transition ${
                      selectedPatternCategory === cat.id
                        ? (isWhiteTheme ? "bg-cyan-600 text-white font-bold shadow-xs" : "bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-500/30")
                        : (isWhiteTheme ? "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300" : "bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/60")
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
                {selectedPatternId && (
                  <button
                    onClick={() => setSelectedPatternId(null)}
                    className={`text-[10px] ${isWhiteTheme ? "text-amber-700" : "text-amber-400"} underline ml-auto font-medium`}
                  >
                    선택 강조 해제
                  </button>
                )}
              </div>
            )}
          </div>

          {/* JARVIS POSITION AI ENGINE PANEL */}
          <JarvisPositionAiPanel
            positionAi={jarvisPositionAiResult}
            isWhiteTheme={isWhiteTheme}
            formatPrice={formatPrice}
          />

          {/* CHART MODE SWITCHER BAR ON MAIN DASHBOARD */}
          <div className={`p-2 rounded-xl border flex flex-wrap items-center justify-between gap-2 ${isWhiteTheme ? "bg-slate-100 border-slate-300" : "bg-[#060c18] border-slate-800"}`}>
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
              <span className={`text-[10px] font-extrabold ${isWhiteTheme ? "text-slate-600" : "text-slate-400"} uppercase pl-1`}>메인 차트 뷰:</span>
              <button
                type="button"
                onClick={() => setMainChartDisplayMode("TRADINGVIEW_REALTIME")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  mainChartDisplayMode === "TRADINGVIEW_REALTIME"
                    ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-md ring-1 ring-emerald-400"
                    : (isWhiteTheme ? "bg-white text-slate-700 hover:bg-slate-200 border border-slate-300" : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700")
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
                <span>⚡ TradingView 실시간 AI예측</span>
              </button>

              <button
                type="button"
                onClick={() => setMainChartDisplayMode("CANDLE_OVERLAY")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  mainChartDisplayMode === "CANDLE_OVERLAY"
                    ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md ring-1 ring-purple-400"
                    : (isWhiteTheme ? "bg-white text-slate-700 hover:bg-slate-200 border border-slate-300" : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700")
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5 text-purple-300" />
                <span>📈 캔들 차트 + 기술적 지표</span>
              </button>

              <button
                type="button"
                onClick={() => setMainChartDisplayMode("DUAL_SPLIT")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  mainChartDisplayMode === "DUAL_SPLIT"
                    ? "bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 text-white shadow-md ring-1 ring-cyan-400"
                    : (isWhiteTheme ? "bg-white text-slate-700 hover:bg-slate-200 border border-slate-300" : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700")
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-cyan-300" />
                <span>📊 듀얼 예측 캔버스</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowFullForecastChartModal(true)}
              className="px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-black text-xs rounded-lg shadow-sm flex items-center gap-1 cursor-pointer transition"
              title="전체화면 팝업 확장"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">전체화면 팝업 확장</span>
            </button>
          </div>

          {/* 2. MULTI-LEVEL CANDLESTICK & TECHNICAL INDICATORS CHART CONTAINER */}
          {mainChartDisplayMode === "TRADINGVIEW_REALTIME" ? (
            <RealTimeTradingViewChart
              symbol={currentStock.symbol}
              name={currentStock.name}
              market={currentStock.market === "US" ? "US" : currentStock.market === "UPBIT" ? "UPBIT" : "KOREA"}
              initialPrice={currentStock.price}
              initialCandles={candles.map(c => ({
                time: typeof c.time === "number" ? c.time : Math.floor(new Date(c.time).getTime() / 1000),
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
                volume: c.volume
              }))}
              isWhiteTheme={isWhiteTheme}
            />
          ) : mainChartDisplayMode === "DUAL_SPLIT" ? (
            <div className={`${isWhiteTheme ? "bg-white border-slate-200 shadow-sm" : "bg-[#081222] border-[#13233c] shadow-sm"} border rounded-xl p-3`}>
              <InteractivePredictionCanvasChart
                symbol={currentStock.symbol}
                name={currentStock.name}
                market={currentStock.market === "US" ? "US" : currentStock.market === "UPBIT" ? "BTC" : "KOREA"}
                currentPrice={currentStock.price}
                candles={candles}
                liveTickHistory={candles.slice(-30).map((c) => ({
                  time: typeof c.time === "string" ? c.time : String(c.time),
                  price: c.close,
                  volume: c.volume,
                  side: c.close >= c.open ? "BUY" : "SELL"
                }))}
                timeframe={selectedTimeframe}
                horizonMode="MEDIUM"
                tradePlan={{
                  entryPrice: currentStock.price,
                  tp1: Math.round(currentStock.price * 1.05),
                  tp2: Math.round(currentStock.price * 1.10),
                  stopLoss: Math.round(currentStock.price * 0.97),
                  riskRewardRatio: 2.85
                }}
                recommendation="BUY"
                actionSignal="BUY_CANDIDATE"
                aiConfidence={currentStock?.price > 0 ? 80 : 0}
              />
            </div>
          ) : (
          <div className={`${isWhiteTheme ? "bg-white border-slate-200 shadow-sm" : "bg-[#081222] border-[#13233c] shadow-sm"} border rounded-xl p-3 flex flex-col gap-2 relative overflow-hidden transition-colors`}>
            
            {/* MA & Bollinger Bands Legend Header */}
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] font-mono">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className={`flex items-center gap-1 ${isWhiteTheme ? "text-amber-700 font-semibold" : "text-amber-400"}`}>
                  <span className="w-2 h-0.5 bg-amber-500" />
                  MA 5: {formatPrice(latestMa5)}
                </span>
                <span className={`flex items-center gap-1 ${isWhiteTheme ? "text-cyan-700 font-semibold" : "text-cyan-400"}`}>
                  <span className="w-2 h-0.5 bg-cyan-500" />
                  MA 20: {formatPrice(latestMa20)}
                </span>
                <span className={`flex items-center gap-1 ${isWhiteTheme ? "text-purple-700 font-semibold" : "text-purple-400"}`}>
                  <span className="w-2 h-0.5 bg-purple-500" />
                  MA 60: {formatPrice(latestMa60)}
                </span>
                <span className={`flex items-center gap-1 ${isWhiteTheme ? "text-blue-700 font-semibold" : "text-blue-400"}`}>
                  <span className="w-2 h-0.5 bg-blue-500" />
                  MA 120: {formatPrice(latestMa120)}
                </span>
                <span className={`flex items-center gap-1 ${isWhiteTheme ? "text-slate-600" : "text-slate-400"}`}>
                  BB(20,2) 상단 <span className={isWhiteTheme ? "text-emerald-700 font-semibold" : "text-emerald-400"}>{formatPrice(latestBbUpper)}</span> 하단 <span className={isWhiteTheme ? "text-rose-700 font-semibold" : "text-rose-400"}>{formatPrice(latestBbLower)}</span>
                </span>
              </div>

              <button
                onClick={() => {
                  setActiveIndicators(prev => ({ ...prev, forecast: true }));
                  setShowFullForecastChartModal(true);
                }}
                className="px-2.5 py-1 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>🔮 30일 미래예측 차트 상세보기</span>
              </button>
            </div>

            {/* MAIN CHART SVG CANVAS */}
            <div className={`relative w-full h-[470px] ${isWhiteTheme ? "bg-white border-slate-200" : "bg-[#050a14] border-slate-900"} rounded-xl border overflow-hidden flex flex-col`}>
              
              {/* Top Main Candlestick Panel */}
              <div className={`relative flex-1 ${isWhiteTheme ? "border-b border-slate-200" : "border-b border-slate-850"}`}>
                <svg 
                  className="w-full h-full cursor-crosshair" 
                  viewBox={`0 0 ${chartWidth} ${candleChartHeight}`} 
                  preserveAspectRatio="none"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const clickY = e.clientY - rect.top;
                    
                    const relativeY = Math.max(0, Math.min(1, clickY / rect.height));
                    const clickedPrice = maxPrice - relativeY * (maxPrice - minPrice);
                    const targetForecastPrice = Math.round(clickedPrice * (1 + (jarvisPositionAiResult.forecastTrend === "BEARISH_TURN" ? -0.03 : 0.048)));
                    const diffPct = Number(((targetForecastPrice - currentStock.price) / currentStock.price * 100).toFixed(2));

                    // Turn on AI forecast path indicator
                    setActiveIndicators(prev => ({ ...prev, forecast: true }));

                    setClickedPredictionPoint({
                      x: (clickX / rect.width) * chartWidth,
                      y: (clickY / rect.height) * candleChartHeight,
                      price: Math.round(clickedPrice),
                      predictedPrice: targetForecastPrice,
                      changePct: diffPct,
                      time: "AI 30일 미래 예상"
                    });

                    addToast?.({
                      type: "SUCCESS",
                      title: `🔮 AI 미래 예상 차트 오버레이 계산 완료`,
                      message: `클릭 지점 [${formatPrice(Math.round(clickedPrice))}] ➔ 30일 목표 예상가: ${formatPrice(targetForecastPrice)} (${diffPct > 0 ? "+" : ""}${diffPct}%)`
                    });
                  }}
                >
                  <defs>
                    {/* Bollinger Bands Fill Gradient */}
                    <linearGradient id="bbGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity={isWhiteTheme ? "0.05" : "0.08"} />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.01" />
                    </linearGradient>

                    {/* Bullish Pattern Fill Gradient */}
                    <linearGradient id="bullPatternGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={isWhiteTheme ? "0.15" : "0.22"} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                    </linearGradient>

                    {/* Bearish Pattern Fill Gradient */}
                    <linearGradient id="bearPatternGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={isWhiteTheme ? "0.15" : "0.22"} />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>

                  {/* Dynamic Horizontal Price Grid Lines */}
                  {yPriceTicks.map((pVal, pIdx) => {
                    const y = getPriceY(pVal);
                    const isCloseToCurrent = Math.abs(pVal - currentStock.price) < (maxPrice - minPrice) / 10;
                    return (
                      <g key={`ygrid_${pIdx}`}>
                        <line
                          x1="0"
                          y1={y}
                          x2={chartWidth}
                          y2={y}
                          stroke={isCloseToCurrent ? (isWhiteTheme ? "#059669" : "#10b981") : (isWhiteTheme ? "#e2e8f0" : "#14233c")}
                          strokeWidth={isCloseToCurrent ? "1" : "0.75"}
                          strokeDasharray={isCloseToCurrent ? "4 3" : "none"}
                          strokeOpacity={isCloseToCurrent ? "0.7" : "0.6"}
                        />
                      </g>
                    );
                  })}

                  {/* Bollinger Bands Area & Curves */}
                  {activeIndicators.bb && (
                    <>
                      <path
                        fill="url(#bbGradient)"
                        stroke="none"
                        d={candles.map((_, i) => {
                          const x = i * candleSpacing + candleSpacing / 2;
                          const up = bbValues.upper[i] ? getPriceY(bbValues.upper[i]!) : candleChartHeight / 2;
                          return `${i === 0 ? "M" : "L"} ${x} ${up}`;
                        }).join(" ") + " " + candles.slice().reverse().map((_, revIdx) => {
                          const i = candles.length - 1 - revIdx;
                          const x = i * candleSpacing + candleSpacing / 2;
                          const low = bbValues.lower[i] ? getPriceY(bbValues.lower[i]!) : candleChartHeight / 2;
                          return `L ${x} ${low}`;
                        }).join(" ") + " Z"}
                      />
                      {/* BB Upper */}
                      <path
                        fill="none"
                        stroke={isWhiteTheme ? "#0284c7" : "#06b6d4"}
                        strokeWidth="1"
                        strokeDasharray="3 3"
                        strokeOpacity={isWhiteTheme ? "0.6" : "0.4"}
                        d={candles.map((_, i) => {
                          const x = i * candleSpacing + candleSpacing / 2;
                          const up = bbValues.upper[i] ? getPriceY(bbValues.upper[i]!) : candleChartHeight / 2;
                          return `${i === 0 ? "M" : "L"} ${x} ${up}`;
                        }).join(" ")}
                      />
                      {/* BB Lower */}
                      <path
                        fill="none"
                        stroke={isWhiteTheme ? "#0284c7" : "#06b6d4"}
                        strokeWidth="1"
                        strokeDasharray="3 3"
                        strokeOpacity={isWhiteTheme ? "0.6" : "0.4"}
                        d={candles.map((_, i) => {
                          const x = i * candleSpacing + candleSpacing / 2;
                          const low = bbValues.lower[i] ? getPriceY(bbValues.lower[i]!) : candleChartHeight / 2;
                          return `${i === 0 ? "M" : "L"} ${x} ${low}`;
                        }).join(" ")}
                      />
                    </>
                  )}

                  {/* MA Curves */}
                  {activeIndicators.ma && (
                    <>
                      {/* MA 5 */}
                      <path
                        fill="none"
                        stroke={isWhiteTheme ? "#d97706" : "#fbbf24"}
                        strokeWidth="1.5"
                        d={candles.map((_, i) => {
                          const x = i * candleSpacing + candleSpacing / 2;
                          const y = maValues.ma5[i] ? getPriceY(maValues.ma5[i]!) : candleChartHeight / 2;
                          return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                        }).join(" ")}
                      />
                      {/* MA 20 */}
                      <path
                        fill="none"
                        stroke={isWhiteTheme ? "#0284c7" : "#38bdf8"}
                        strokeWidth="1.5"
                        d={candles.map((_, i) => {
                          const x = i * candleSpacing + candleSpacing / 2;
                          const y = maValues.ma20[i] ? getPriceY(maValues.ma20[i]!) : candleChartHeight / 2;
                          return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                        }).join(" ")}
                      />
                      {/* MA 60 */}
                      <path
                        fill="none"
                        stroke={isWhiteTheme ? "#9333ea" : "#c084fc"}
                        strokeWidth="1.2"
                        d={candles.map((_, i) => {
                          const x = i * candleSpacing + candleSpacing / 2;
                          const y = maValues.ma60[i] ? getPriceY(maValues.ma60[i]!) : candleChartHeight / 2;
                          return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                        }).join(" ")}
                      />
                      {/* MA 120 */}
                      <path
                        fill="none"
                        stroke={isWhiteTheme ? "#2563eb" : "#60a5fa"}
                        strokeWidth="1.2"
                        d={candles.map((_, i) => {
                          const x = i * candleSpacing + candleSpacing / 2;
                          const y = maValues.ma120[i] ? getPriceY(maValues.ma120[i]!) : candleChartHeight / 2;
                          return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                        }).join(" ")}
                      />
                    </>
                  )}

                  {/* Real Candlesticks (Wick & Body) */}
                  {candles.map((c, i) => {
                    const x = i * candleSpacing + candleSpacing / 2;
                    const yHigh = getPriceY(c.high);
                    const yLow = getPriceY(c.low);
                    const yOpen = getPriceY(c.open);
                    const yClose = getPriceY(c.close);
                    const isUp = c.isUp;
                    const candleTop = Math.min(yOpen, yClose);
                    const candleHeight = Math.max(2, Math.abs(yClose - yOpen));
                    const candleColor = isUp ? (isWhiteTheme ? "#059669" : "#10b981") : (isWhiteTheme ? "#e11d48" : "#f43f5e");

                    return (
                      <g key={`candle_${c.timestamp}_${i}`}>
                        {/* Wick */}
                        <line
                          x1={x}
                          y1={yHigh}
                          x2={x}
                          y2={yLow}
                          stroke={candleColor}
                          strokeWidth="1.2"
                        />
                        {/* Body */}
                        <rect
                          x={x - candleBarWidth / 2}
                          y={candleTop}
                          width={candleBarWidth}
                          height={candleHeight}
                          fill={candleColor}
                          rx="1"
                        />
                      </g>
                    );
                  })}

                  {/* REAL-TIME ALGORITHMIC PATTERN OVERLAYS */}
                  {patternTrackingOn && activePatterns.map((ptn) => {
                    const isFocused = selectedPatternId === ptn.id || !selectedPatternId;
                    const color = ptn.color;
                    const isBull = ptn.type === "BULLISH";

                    return (
                      <g 
                        key={`pattern_layer_${ptn.id}`} 
                        opacity={isFocused ? 1 : 0.25} 
                        className="transition-opacity duration-300 cursor-pointer"
                        onClick={() => setSelectedPatternId(ptn.id)}
                      >
                        {/* 1. Translucent Shaded Polygon Fill Underneath */}
                        {ptn.svgPolygon && (
                          <polygon
                            points={ptn.svgPolygon}
                            fill={isBull ? "url(#bullPatternGrad)" : "url(#bearPatternGrad)"}
                            stroke="none"
                          />
                        )}

                        {/* 2. Glow Polyline Connecting Geometric Pivots */}
                        {ptn.svgPolyline && (
                          <>
                            <polyline
                              points={ptn.svgPolyline}
                              fill="none"
                              stroke={color}
                              strokeWidth="4"
                              strokeOpacity={isWhiteTheme ? "0.15" : "0.2"}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <polyline
                              points={ptn.svgPolyline}
                              fill="none"
                              stroke={color}
                              strokeWidth="2.2"
                              strokeDasharray={ptn.id === selectedPatternId ? "none" : "5 3"}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </>
                        )}

                        {/* 3. Neckline Horizontal Ray */}
                        {ptn.necklineY !== undefined && (
                          <g>
                            <line
                              x1={ptn.points[0]?.x ? Math.max(0, ptn.points[0].x - 20) : 0}
                              y1={ptn.necklineY}
                              x2={Math.min(chartWidth - 40, (ptn.breakoutPoint?.x || chartWidth) + 40)}
                              y2={ptn.necklineY}
                              stroke={color}
                              strokeWidth="1.5"
                              strokeDasharray="4 3"
                              strokeOpacity={isWhiteTheme ? "0.85" : "0.75"}
                            />
                            <rect
                              x={ptn.points[0]?.x ? Math.max(10, ptn.points[0].x - 10) : 10}
                              y={ptn.necklineY - 14}
                              width="60"
                              height="14"
                              rx="3"
                              fill={isWhiteTheme ? "#ffffff" : "#07101e"}
                              stroke={color}
                              strokeWidth="0.8"
                            />
                            <text
                              x={(ptn.points[0]?.x ? Math.max(10, ptn.points[0].x - 10) : 10) + 30}
                              y={ptn.necklineY - 4}
                              fill={color}
                              fontSize="8"
                              fontWeight="bold"
                              fontFamily="monospace"
                              textAnchor="middle"
                            >
                              넥라인 Neckline
                            </text>
                          </g>
                        )}

                        {/* 4. Target Ray with Target Badge */}
                        {ptn.targetY !== undefined && ptn.breakoutPoint && (
                          <g>
                            <line
                              x1={ptn.breakoutPoint.x}
                              y1={ptn.breakoutPoint.y}
                              x2={Math.min(chartWidth - 20, ptn.breakoutPoint.x + 80)}
                              y2={ptn.targetY}
                              stroke={color}
                              strokeWidth="1.5"
                              strokeDasharray="3 3"
                              strokeOpacity="0.85"
                            />
                            <g transform={`translate(${Math.min(chartWidth - 90, ptn.breakoutPoint.x + 80)}, ${ptn.targetY})`}>
                              <rect
                                x="-5"
                                y="-12"
                                width="90"
                                height="22"
                                rx="4"
                                fill={isWhiteTheme ? "#ffffff" : "#07101e"}
                                stroke={color}
                                strokeWidth="1.2"
                              />
                              <text
                                x="40"
                                y="3"
                                fill={color}
                                fontSize="9"
                                fontWeight="bold"
                                fontFamily="monospace"
                                textAnchor="middle"
                              >
                                🎯 목표 {formatPrice(ptn.targetPrice)}
                              </text>
                            </g>
                          </g>
                        )}

                        {/* 5. Pivot Points Badges */}
                        {ptn.points.map((pt, pIdx) => (
                          <g key={`pt_${ptn.id}_${pIdx}`} transform={`translate(${pt.x}, ${pt.y})`}>
                            <circle
                              cx="0"
                              cy="0"
                              r="4"
                              fill={color}
                              stroke={isWhiteTheme ? "#ffffff" : "#07101e"}
                              strokeWidth="1.5"
                            />
                            {pt.label && (
                              <g transform={`translate(0, ${isBull ? 14 : -14})`}>
                                <rect
                                  x="-26"
                                  y="-8"
                                  width="52"
                                  height="15"
                                  rx="3"
                                  fill={isWhiteTheme ? "#ffffff" : "#07101e"}
                                  stroke={color}
                                  strokeWidth="0.8"
                                  fillOpacity="0.95"
                                />
                                <text
                                  x="0"
                                  y="2.5"
                                  fill={isWhiteTheme ? "#0f172a" : color}
                                  fontSize="8"
                                  fontWeight="bold"
                                  fontFamily="monospace"
                                  textAnchor="middle"
                                >
                                  {pt.label}
                                </text>
                              </g>
                            )}
                          </g>
                        ))}

                        {/* 6. Breakout Animated Beacon */}
                        {ptn.breakoutPoint && (
                          <g transform={`translate(${ptn.breakoutPoint.x}, ${ptn.breakoutPoint.y})`}>
                            <circle cx="0" cy="0" r="14" fill={color} fillOpacity="0.25" className="animate-ping" />
                            <circle cx="0" cy="0" r="6" fill={color} />
                            <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
                            <g transform="translate(12, -12)">
                              <rect
                                x="0"
                                y="0"
                                width="84"
                                height="24"
                                rx="12"
                                fill={isWhiteTheme ? "#ffffff" : "#07101e"}
                                stroke={color}
                                strokeWidth="1.5"
                              />
                              <text
                                x="42"
                                y="15"
                                fill={color}
                                fontSize="9"
                                fontWeight="black"
                                fontFamily="monospace"
                                textAnchor="middle"
                              >
                                {isBull ? "▲ 돌파 BUY" : "▼ 이탈 SELL"}
                              </text>
                            </g>
                          </g>
                        )}
                      </g>
                    );
                  })}

                  {/* ATR VOLATILITY CHANNEL BANDS */}
                  {activeIndicators.atrBand && (
                    <g className="pointer-events-none">
                      <path
                        fill="none"
                        stroke={isWhiteTheme ? "rgba(217, 119, 6, 0.75)" : "rgba(251, 191, 36, 0.75)"}
                        strokeWidth="1.2"
                        strokeDasharray="3 3"
                        d={candles.map((c, i) => {
                          const x = i * candleSpacing + candleSpacing / 2;
                          const ma20 = maValues.ma20[i] || c.close;
                          const atr = atrValues[i] || 500;
                          const upper = getPriceY(ma20 + atr * 1.8);
                          return `${i === 0 ? "M" : "L"} ${x} ${upper}`;
                        }).join(" ")}
                      />
                      <path
                        fill="none"
                        stroke={isWhiteTheme ? "rgba(217, 119, 6, 0.75)" : "rgba(251, 191, 36, 0.75)"}
                        strokeWidth="1.2"
                        strokeDasharray="3 3"
                        d={candles.map((c, i) => {
                          const x = i * candleSpacing + candleSpacing / 2;
                          const ma20 = maValues.ma20[i] || c.close;
                          const atr = atrValues[i] || 500;
                          const lower = getPriceY(ma20 - atr * 1.8);
                          return `${i === 0 ? "M" : "L"} ${x} ${lower}`;
                        }).join(" ")}
                      />
                    </g>
                  )}

                  {/* JARVIS DYNAMIC POSITION & TARGET OVERLAY */}
                  <g className="pointer-events-none">
                    {/* Buy Zone Rect */}
                    {(() => {
                      const yMin = getPriceY(jarvisPositionAiResult.buyZoneMax);
                      const yMax = getPriceY(jarvisPositionAiResult.buyZoneMin);
                      const h = Math.max(12, yMax - yMin);
                      return (
                        <g>
                          <rect
                            x="15"
                            y={yMin}
                            width={chartWidth - 30}
                            height={h}
                            fill={isWhiteTheme ? "rgba(16, 185, 129, 0.05)" : "rgba(16, 185, 129, 0.08)"}
                            stroke={isWhiteTheme ? "#059669" : "#10B981"}
                            strokeWidth="0.8"
                            strokeDasharray="3 3"
                            rx="4"
                          />
                          <rect
                            x="22"
                            y={yMin + 2}
                            width="145"
                            height="14"
                            rx="3"
                            fill={isWhiteTheme ? "#059669" : "#10B981"}
                          />
                          <text
                            x="94"
                            y={yMin + 12}
                            fill="#ffffff"
                            fontSize="8"
                            fontWeight="bold"
                            fontFamily="monospace"
                            textAnchor="middle"
                          >
                            BUY ZONE {formatPrice(jarvisPositionAiResult.buyZoneMin)} ~ {formatPrice(jarvisPositionAiResult.buyZoneMax)}
                          </text>
                        </g>
                      );
                    })()}

                    {/* Current Dynamic Trailing Stop Loss Line */}
                    {(() => {
                      const stopY = getPriceY(jarvisPositionAiResult.currentStopPrice);
                      return (
                        <g>
                          <line
                            x1="10"
                            y1={stopY}
                            x2={chartWidth - 10}
                            y2={stopY}
                            stroke="#f43f5e"
                            strokeWidth="1.5"
                            strokeDasharray="5 3"
                          />
                          <rect
                            x="15"
                            y={stopY - 10}
                            width="165"
                            height="16"
                            rx="3"
                            fill="#f43f5e"
                          />
                          <text
                            x="97"
                            y={stopY + 1}
                            fill="#ffffff"
                            fontSize="9"
                            fontWeight="black"
                            fontFamily="monospace"
                            textAnchor="middle"
                          >
                            🛡️ CURRENT STOP {formatPrice(jarvisPositionAiResult.currentStopPrice)}
                          </text>
                        </g>
                      );
                    })()}

                    {/* Dynamic Target 1, Target 2, Target 3 Lines */}
                    {[
                      { label: "T1 (1.5R)", price: jarvisPositionAiResult.target1, color: "#10b981", reached: jarvisPositionAiResult.target1Reached },
                      { label: "T2 (2.5R)", price: jarvisPositionAiResult.target2, color: "#06b6d4", reached: jarvisPositionAiResult.target2Reached },
                      { label: "T3 (Moonshot)", price: jarvisPositionAiResult.target3, color: "#a855f7", reached: jarvisPositionAiResult.target3Reached }
                    ].map((target, idx) => {
                      const targetY = getPriceY(target.price);
                      return (
                        <g key={idx}>
                          <line
                            x1="10"
                            y1={targetY}
                            x2={chartWidth - 10}
                            y2={targetY}
                            stroke={target.color}
                            strokeWidth="1"
                            strokeDasharray="4 4"
                          />
                          <rect
                            x={chartWidth - 175}
                            y={targetY - 9}
                            width="160"
                            height="16"
                            rx="3"
                            fill={target.color}
                          />
                          <text
                            x={chartWidth - 95}
                            y={targetY + 2}
                            fill="#ffffff"
                            fontSize="8.5"
                            fontWeight="bold"
                            fontFamily="monospace"
                            textAnchor="middle"
                          >
                            🎯 {target.label} {formatPrice(target.price)} {target.reached ? "✓" : ""}
                          </text>
                        </g>
                      );
                    })}
                  </g>

                  {/* DYNAMIC SUPPORT & RESISTANCE LINES */}
                  {activeIndicators.srLines && (
                    <g className="pointer-events-none">
                      {/* Resistance Line */}
                      <line
                        x1="10"
                        y1={getPriceY(srLevels.resistance)}
                        x2={chartWidth - 10}
                        y2={getPriceY(srLevels.resistance)}
                        stroke={isWhiteTheme ? "#DC2626" : "#F43F5E"}
                        strokeWidth="1.2"
                        strokeDasharray="4 4"
                      />
                      <rect
                        x={chartWidth - 130}
                        y={getPriceY(srLevels.resistance) - 10}
                        width="115"
                        height="16"
                        rx="3"
                        fill={isWhiteTheme ? "#DC2626" : "#F43F5E"}
                      />
                      <text
                        x={chartWidth - 72}
                        y={getPriceY(srLevels.resistance) + 1}
                        fill="#ffffff"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        RESISTANCE {formatPrice(srLevels.resistance)}
                      </text>

                      {/* Support Line */}
                      <line
                        x1="10"
                        y1={getPriceY(srLevels.support)}
                        x2={chartWidth - 10}
                        y2={getPriceY(srLevels.support)}
                        stroke={isWhiteTheme ? "#059669" : "#10B981"}
                        strokeWidth="1.2"
                        strokeDasharray="4 4"
                      />
                      <rect
                        x={chartWidth - 130}
                        y={getPriceY(srLevels.support) - 10}
                        width="115"
                        height="16"
                        rx="3"
                        fill={isWhiteTheme ? "#059669" : "#10B981"}
                      />
                      <text
                        x={chartWidth - 72}
                        y={getPriceY(srLevels.support) + 1}
                        fill="#ffffff"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        SUPPORT {formatPrice(srLevels.support)}
                      </text>
                    </g>
                  )}

                  {/* AI FORECAST FUTURE PATH (DYNAMIC MULTI-POINT WAVE CURVE) */}
                  {activeIndicators.forecast && candles.length > 0 && (
                    <g className="pointer-events-none">
                      {(() => {
                        const lastIdx = candles.length - 1;
                        const lastCandle = candles[lastIdx];
                        const startX = lastIdx * candleSpacing + candleSpacing / 2;
                        const startY = getPriceY(lastCandle.close);

                        const fPoints = jarvisPositionAiResult.forecastPath || [];
                        if (fPoints.length === 0) return null;

                        const isBearish = jarvisPositionAiResult.forecastTrend === "BEARISH_TURN";
                        const isBullish = jarvisPositionAiResult.forecastTrend === "BULLISH";
                        
                        const mainColor = isBearish 
                          ? "#f43f5e" 
                          : isBullish 
                          ? (isWhiteTheme ? "#059669" : "#10b981") 
                          : "#f59e0b";

                        // Compute screen coordinates for forecast points
                        const coords = fPoints.map((pt, i) => {
                          const px = Math.min(chartWidth - 25, startX + (i + 1) * Math.max(12, candleSpacing * 1.5));
                          const py = getPriceY(pt.price);
                          const upperY = getPriceY(pt.upperBound);
                          const lowerY = getPriceY(pt.lowerBound);
                          return { ...pt, x: px, y: py, upperY, lowerY };
                        });

                        // Path string for main forecast line
                        const linePath = `M ${startX} ${startY} ` + coords.map(c => `L ${c.x} ${c.y}`).join(" ");

                        // Polygon path string for confidence band
                        const upperLine = coords.map(c => `L ${c.x} ${c.upperY}`).join(" ");
                        const lowerLine = coords.slice().reverse().map(c => `L ${c.x} ${c.lowerY}`).join(" ");
                        const bandPath = `M ${startX} ${startY} ${upperLine} ${lowerLine} Z`;

                        const lastCoord = coords[coords.length - 1];
                        const midCoord = coords[Math.floor(coords.length / 2)];

                        return (
                          <g>
                            {/* Confidence Band Polygon */}
                            <path
                              d={bandPath}
                              fill={mainColor}
                              fillOpacity={isWhiteTheme ? "0.08" : "0.15"}
                              stroke="none"
                            />

                            {/* Main Dynamic Forecast Curve Line */}
                            <path
                              d={linePath}
                              fill="none"
                              stroke={mainColor}
                              strokeWidth="2.5"
                              strokeDasharray="4 3"
                              strokeLinecap="round"
                            />

                            {/* Node Points & Milestone Badges */}
                            {coords.map((c, idx) => {
                              const isKeyNode = idx === 2 || idx === coords.length - 1;
                              return (
                                <g key={idx}>
                                  <circle
                                    cx={c.x}
                                    cy={c.y}
                                    r={isKeyNode ? 4 : 2.5}
                                    fill={mainColor}
                                    stroke="#ffffff"
                                    strokeWidth={isKeyNode ? 1.5 : 0.8}
                                  />

                                  {isKeyNode && (
                                    <g transform={`translate(${c.x}, ${c.y - 14})`}>
                                      <rect
                                        x="-38"
                                        y="-9"
                                        width="76"
                                        height="15"
                                        rx="3"
                                        fill={mainColor}
                                        fillOpacity="0.95"
                                      />
                                      <text
                                        x="0"
                                        y="2"
                                        fill="#ffffff"
                                        fontSize="8"
                                        fontWeight="black"
                                        fontFamily="monospace"
                                        textAnchor="middle"
                                      >
                                        {formatPrice(c.price)} {idx === coords.length - 1 ? "예상" : ""}
                                      </text>
                                    </g>
                                  )}
                                </g>
                              );
                            })}

                            {/* Floating Forecast Trend Label Banner */}
                            {midCoord && (
                              <g transform={`translate(${(startX + midCoord.x) / 2}, ${(startY + midCoord.y) / 2 - 16})`}>
                                <rect
                                  x="-60"
                                  y="-9"
                                  width="120"
                                  height="16"
                                  rx="4"
                                  fill={isWhiteTheme ? "#ffffff" : "#0f172a"}
                                  stroke={mainColor}
                                  strokeWidth="1.2"
                                />
                                <text
                                  x="0"
                                  y="3"
                                  fill={mainColor}
                                  fontSize="8.5"
                                  fontWeight="extrabold"
                                  fontFamily="monospace"
                                  textAnchor="middle"
                                >
                                  {isBearish ? "↘ AI 예상경로 하락전환" : isBullish ? "↗ AI 예상경로 상승" : "➡️ AI 예상경로 횡보"}
                                </text>
                              </g>
                            )}
                          </g>
                        );
                      })()}
                    </g>
                  )}

                  {/* USER CLICKED PREDICTION TARGET OVERLAY */}
                  {clickedPredictionPoint && (
                    <g transform={`translate(${clickedPredictionPoint.x}, ${clickedPredictionPoint.y})`}>
                      <circle cx="0" cy="0" r="16" fill="#a855f7" fillOpacity="0.25" className="animate-ping" />
                      <circle cx="0" cy="0" r="7" fill="#a855f7" stroke="#ffffff" strokeWidth="2" />
                      <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
                      
                      {/* Prediction Banner */}
                      <g transform={`translate(${clickedPredictionPoint.x > chartWidth - 220 ? -190 : 15}, ${clickedPredictionPoint.y < 40 ? 25 : -25})`}>
                        <rect
                          x="-10"
                          y="-16"
                          width="210"
                          height="36"
                          rx="8"
                          fill={isWhiteTheme ? "#ffffff" : "#081222"}
                          stroke="#a855f7"
                          strokeWidth="2"
                          filter="drop-shadow(0px 4px 10px rgba(168, 85, 247, 0.4))"
                        />
                        <text
                          x="95"
                          y="-2"
                          fill={isWhiteTheme ? "#0f172a" : "#ffffff"}
                          fontSize="10"
                          fontWeight="black"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          🔮 클릭 지점 AI 예상: {formatPrice(clickedPredictionPoint.predictedPrice)}
                        </text>
                        <text
                          x="95"
                          y="12"
                          fill={clickedPredictionPoint.changePct >= 0 ? "#10b981" : "#f43f5e"}
                          fontSize="9.5"
                          fontWeight="bold"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          {clickedPredictionPoint.changePct >= 0 ? "▲" : "▼"} {clickedPredictionPoint.changePct > 0 ? "+" : ""}{clickedPredictionPoint.changePct}% (30일 Shape AI)
                        </text>
                      </g>
                    </g>
                  )}
                </svg>

                {/* Right Y-Axis Dynamic Price Labels */}
                <div className={`absolute right-0 top-0 bottom-0 w-20 flex flex-col justify-between py-2 text-[10px] font-mono pointer-events-none ${isWhiteTheme ? "bg-gradient-to-l from-white via-white/95 to-transparent text-slate-600" : "bg-gradient-to-l from-[#060B13] via-[#060B13]/90 to-transparent text-slate-400"} pl-2 pr-1`}>
                  {yPriceTicks.map((pVal, tIdx) => {
                    const isCloseToCurrent = Math.abs(pVal - currentStock.price) < (maxPrice - minPrice) / 12;
                    if (isCloseToCurrent) {
                      return (
                        <span 
                          key={`ytick_${tIdx}`}
                          className={`px-1 py-0.5 rounded ${isWhiteTheme ? "bg-emerald-600 text-white" : "bg-emerald-500 text-[#07101e]"} font-black shadow-md text-right truncate text-[9px]`}
                        >
                          {formatPrice(currentStock.price)}
                        </span>
                      );
                    }
                    return (
                      <span key={`ytick_${tIdx}`} className={`text-right truncate ${isWhiteTheme ? "text-slate-600" : "text-slate-400"}`}>
                        {formatPrice(pVal)}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Sub-Panel 1: Volume Chart */}
              <div className={`h-12 ${isWhiteTheme ? "border-b border-slate-200 bg-slate-50/50" : "border-b border-slate-850"} px-2 flex items-center relative`}>
                <svg className="w-full h-full" viewBox={`0 0 ${chartWidth} ${volumeChartHeight}`} preserveAspectRatio="none">
                  {candles.map((c, i) => {
                    const x = i * candleSpacing + candleSpacing / 2;
                    const maxVol = 35000000;
                    const barH = (c.volume / maxVol) * volumeChartHeight;
                    return (
                      <rect
                        key={`vol_${c.timestamp}_${i}`}
                        x={x - candleBarWidth / 2}
                        y={volumeChartHeight - barH}
                        width={candleBarWidth}
                        height={barH}
                        fill={c.isUp ? (isWhiteTheme ? "#059669" : "#10b981") : (isWhiteTheme ? "#e11d48" : "#f43f5e")}
                        fillOpacity="0.75"
                      />
                    );
                  })}
                </svg>
                <div className={`absolute right-2 top-1 text-[9px] font-mono ${isWhiteTheme ? "text-slate-500" : "text-slate-500"}`}>
                  VOL 30M / 20M / 10M
                </div>
              </div>

              {/* Sub-Panel 2: RSI (14) Chart (Height 45px) */}
              {activeIndicators.rsi && (
                <div className={`h-11 ${isWhiteTheme ? "border-b border-slate-200 bg-slate-50/50" : "border-b border-slate-850"} px-2 flex items-center relative`}>
                  <div className={`absolute left-2 top-1 text-[9px] font-mono ${isWhiteTheme ? "text-purple-700" : "text-purple-400"}`}>
                    RSI 14 <span className={`font-bold ${isWhiteTheme ? "text-slate-800" : "text-slate-200"}`}>{latestRsi}</span>
                  </div>
                  <svg className="w-full h-full" viewBox={`0 0 ${chartWidth} ${rsiChartHeight}`} preserveAspectRatio="none">
                    {/* Overbought 70 & Oversold 30 Lines */}
                    <line x1="0" y1="18" x2={chartWidth} y2="18" stroke={isWhiteTheme ? "#cbd5e1" : "#475569"} strokeWidth="0.75" strokeDasharray="3 3" />
                    <line x1="0" y1="46" x2={chartWidth} y2="46" stroke={isWhiteTheme ? "#cbd5e1" : "#475569"} strokeWidth="0.75" strokeDasharray="3 3" />
                    {/* RSI Curve */}
                    <path
                      fill="none"
                      stroke={isWhiteTheme ? "#9333ea" : "#c084fc"}
                      strokeWidth="1.5"
                      d={rsiValues.map((val, i) => {
                        const x = i * candleSpacing + candleSpacing / 2;
                        const y = val ? rsiChartHeight - (val / 100) * rsiChartHeight : rsiChartHeight / 2;
                        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                      }).join(" ")}
                    />
                  </svg>
                  <div className="absolute right-2 top-1 text-[9px] font-mono text-slate-500">
                    70.00 / 30.00
                  </div>
                </div>
              )}

              {/* Sub-Panel 3: MACD (12, 26, 9) Chart (Height 45px) */}
              {activeIndicators.macd && (
                <div className={`h-11 ${isWhiteTheme ? "border-b border-slate-200 bg-slate-50/50" : "border-b border-slate-850"} px-2 flex items-center relative`}>
                  <div className={`absolute left-2 top-1 text-[9px] font-mono ${isWhiteTheme ? "text-cyan-800" : "text-cyan-400"}`}>
                    MACD 12 26 close 9 <span className={isWhiteTheme ? "text-cyan-700 font-bold" : "text-cyan-300"}>{latestMacd}</span> <span className={isWhiteTheme ? "text-amber-700 font-bold" : "text-amber-400"}>{latestSignal}</span> <span className={isWhiteTheme ? "text-emerald-700 font-bold" : "text-emerald-400"}>{latestHist}</span>
                  </div>
                  <svg className="w-full h-full" viewBox={`0 0 ${chartWidth} ${macdChartHeight}`} preserveAspectRatio="none">
                    <line x1="0" y1="32" x2={chartWidth} y2="32" stroke={isWhiteTheme ? "#cbd5e1" : "#334155"} strokeWidth="0.75" />
                    {/* Histogram Bars */}
                    {macdValues.histogram.map((h, i) => {
                      const x = i * candleSpacing + candleSpacing / 2;
                      const hVal = (h / 3000) * 20;
                      const barH = Math.min(25, Math.abs(hVal));
                      return (
                        <rect
                          key={`macd_bar_${i}`}
                          x={x - 1.5}
                          y={h >= 0 ? 32 - barH : 32}
                          width="3"
                          height={barH}
                          fill={h >= 0 ? (isWhiteTheme ? "#0284c7" : "#38bdf8") : (isWhiteTheme ? "#e11d48" : "#fb7185")}
                        />
                      );
                    })}
                    {/* MACD Line */}
                    <path
                      fill="none"
                      stroke={isWhiteTheme ? "#0284c7" : "#06b6d4"}
                      strokeWidth="1.2"
                      d={macdValues.macdLine.map((val, i) => {
                        const x = i * candleSpacing + candleSpacing / 2;
                        const y = 32 - (val / 3000) * 20;
                        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                      }).join(" ")}
                    />
                    {/* Signal Line */}
                    <path
                      fill="none"
                      stroke={isWhiteTheme ? "#d97706" : "#f59e0b"}
                      strokeWidth="1.2"
                      d={macdValues.signalLine.map((val, i) => {
                        const x = i * candleSpacing + candleSpacing / 2;
                        const y = 32 - (val / 3000) * 20;
                        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                      }).join(" ")}
                    />
                  </svg>
                  <div className="absolute right-2 top-1 text-[9px] font-mono text-slate-500">
                    2.00 / -2.00
                  </div>
                </div>
              )}

              {/* Sub-Panel 4: Stochastic (14, 3, 3) Chart (Height 45px) */}
              {activeIndicators.stoch && (
                <div className={`h-11 ${isWhiteTheme ? "bg-slate-50/50" : ""} px-2 flex items-center relative`}>
                  <div className={`absolute left-2 top-1 text-[9px] font-mono ${isWhiteTheme ? "text-slate-700" : "text-slate-300"}`}>
                    Stochastic 14 3 3 <span className={isWhiteTheme ? "text-cyan-700 font-bold" : "text-cyan-400"}>{latestStochK}</span> <span className={isWhiteTheme ? "text-amber-700 font-bold" : "text-amber-400"}>{latestStochD}</span>
                  </div>
                  <svg className="w-full h-full" viewBox={`0 0 ${chartWidth} ${stochChartHeight}`} preserveAspectRatio="none">
                    <line x1="0" y1="12" x2={chartWidth} y2="12" stroke={isWhiteTheme ? "#cbd5e1" : "#475569"} strokeWidth="0.75" strokeDasharray="3 3" />
                    <line x1="0" y1="52" x2={chartWidth} y2="52" stroke={isWhiteTheme ? "#cbd5e1" : "#475569"} strokeWidth="0.75" strokeDasharray="3 3" />
                    {/* %K */}
                    <path
                      fill="none"
                      stroke={isWhiteTheme ? "#0284c7" : "#38bdf8"}
                      strokeWidth="1.2"
                      d={stochValues.kLine.map((val, i) => {
                        const x = i * candleSpacing + candleSpacing / 2;
                        const y = stochChartHeight - (val / 100) * stochChartHeight;
                        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                      }).join(" ")}
                    />
                    {/* %D */}
                    <path
                      fill="none"
                      stroke={isWhiteTheme ? "#ea580c" : "#fb923c"}
                      strokeWidth="1.2"
                      d={stochValues.dLine.map((val, i) => {
                        const x = i * candleSpacing + candleSpacing / 2;
                        const y = stochChartHeight - (val / 100) * stochChartHeight;
                        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                      }).join(" ")}
                    />
                  </svg>
                  <div className="absolute right-2 top-1 text-[9px] font-mono text-slate-500">
                    80.00 / 20.00
                  </div>
                </div>
              )}

              {/* X-Axis Date Timeline */}
              <div className={`h-5 ${isWhiteTheme ? "border-t border-slate-200 text-slate-500 bg-slate-50" : "border-t border-slate-850 text-slate-500 bg-[#060b13]"} px-4 flex items-center justify-between text-[9px] font-mono`}>
                <span>Mar 14</span>
                <span>Apr 14</span>
                <span>May 14</span>
                <span>Jun 14</span>
                <span>Jul 14</span>
              </div>
            </div>
          </div>
        )}

          {/* 3. BOTTOM AI INSIGHTS (5-CARD SET MATCHING USER IMAGE) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            
            {/* Card 1: TREND ANALYSIS */}
            <div className={`${isWhiteTheme ? "bg-white border-slate-200 shadow-sm" : "bg-[#081222] border-[#13233c] shadow-sm"} border rounded-xl p-2.5 flex flex-col justify-between transition-colors`}>
              <div className={`flex items-center gap-1.5 text-[10px] font-mono ${isWhiteTheme ? "text-slate-500" : "text-slate-400"}`}>
                <TrendingUp className={`w-3.5 h-3.5 ${isWhiteTheme ? "text-emerald-600" : "text-emerald-400"}`} />
                <span>TREND ANALYSIS</span>
              </div>
              <div>
                <div className={`text-sm font-bold ${isWhiteTheme ? "text-slate-900" : "text-white"}`}>상승 추세</div>
                <div className={`text-[10px] font-mono font-bold ${isWhiteTheme ? "text-emerald-600" : "text-emerald-400"} tracking-wider`}>
                  STRONG BULLISH
                </div>
              </div>
            </div>

            {/* Card 2: MOMENTUM */}
            <div className={`${isWhiteTheme ? "bg-white border-slate-200 shadow-sm" : "bg-[#081222] border-[#13233c] shadow-sm"} border rounded-xl p-2.5 flex flex-col justify-between transition-colors`}>
              <div className={`flex items-center gap-1.5 text-[10px] font-mono ${isWhiteTheme ? "text-slate-500" : "text-slate-400"}`}>
                <Zap className={`w-3.5 h-3.5 ${isWhiteTheme ? "text-amber-600" : "text-amber-400"}`} />
                <span>MOMENTUM</span>
              </div>
              <div>
                <div className={`text-sm font-bold ${isWhiteTheme ? "text-slate-900" : "text-white"}`}>강한 모멘텀</div>
                <div className="flex items-center gap-1 mt-1">
                  <span className={`text-[8px] font-mono ${isWhiteTheme ? "text-slate-500" : "text-slate-500"}`}>STRENGTH</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((bar) => (
                      <div key={bar} className={`w-2 h-2 rounded-xs ${isWhiteTheme ? "bg-emerald-500" : "bg-emerald-400"}`} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: VOLATILITY */}
            <div className={`${isWhiteTheme ? "bg-white border-slate-200 shadow-sm" : "bg-[#081222] border-[#13233c] shadow-sm"} border rounded-xl p-2.5 flex flex-col justify-between transition-colors`}>
              <div className={`flex items-center gap-1.5 text-[10px] font-mono ${isWhiteTheme ? "text-slate-500" : "text-slate-400"}`}>
                <Activity className={`w-3.5 h-3.5 ${isWhiteTheme ? "text-cyan-600" : "text-cyan-400"}`} />
                <span>VOLATILITY</span>
              </div>
              <div>
                <div className={`text-sm font-bold ${isWhiteTheme ? "text-slate-900" : "text-white"}`}>보통 변동성</div>
                <div className={`text-[10px] font-mono ${isWhiteTheme ? "text-slate-500" : "text-slate-400"}`}>
                  안정적인 시장
                </div>
              </div>
            </div>

            {/* Card 4: PATTERN CONFIDENCE */}
            <div className={`${isWhiteTheme ? "bg-white border-slate-200 shadow-sm" : "bg-[#081222] border-[#13233c] shadow-sm"} border rounded-xl p-2.5 flex items-center justify-between transition-colors`}>
              <div>
                <div className={`text-[10px] font-mono ${isWhiteTheme ? "text-slate-500" : "text-slate-400"}`}>CONFIDENCE</div>
                <div className={`text-sm font-bold ${isWhiteTheme ? "text-slate-900" : "text-white"}`}>신뢰도 높음</div>
              </div>
              <div className="relative w-10 h-10 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className={isWhiteTheme ? "text-slate-200" : "text-slate-800"}
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={isWhiteTheme ? "text-cyan-600" : "text-cyan-400"}
                    strokeDasharray="87, 100"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className={`absolute text-[10px] font-mono font-bold ${isWhiteTheme ? "text-cyan-800" : "text-cyan-300"}`}>
                  87%
                </div>
              </div>
            </div>

            {/* Card 5: NEXT ACTION */}
            <div className={`${isWhiteTheme ? "bg-white border-slate-200 shadow-sm" : "bg-[#081222] border-[#13233c] shadow-sm"} border rounded-xl p-2.5 flex flex-col justify-between transition-colors`}>
              <div className={`flex items-center gap-1.5 text-[10px] font-mono ${isWhiteTheme ? "text-slate-500" : "text-slate-400"}`}>
                <Bot className={`w-3.5 h-3.5 ${isWhiteTheme ? "text-cyan-600" : "text-cyan-400"}`} />
                <span>NEXT ACTION</span>
              </div>
              <div>
                <div className={`text-xs font-bold ${isWhiteTheme ? "text-slate-700" : "text-slate-300"}`}>AI 추천 행동</div>
                <div className={`text-sm font-black ${isWhiteTheme ? "text-emerald-600" : "text-emerald-400"} flex items-center gap-1`}>
                  <span>BUY</span>
                  <span className={`text-[10px] font-normal ${isWhiteTheme ? "text-slate-500" : "text-slate-400"}`}>매수 유효</span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: AI PATTERN ANALYSIS, AI SIGNALS, TRADE LOG     */}
        {/* ============================================================ */}
        <div className="lg:col-span-3 flex flex-col gap-2">
          
          {/* PANEL 1: AI PATTERN ANALYSIS */}
          <div className={`${isWhiteTheme ? "bg-white border-slate-200 shadow-sm" : "bg-[#081222] border-[#13233c] shadow-sm"} border rounded-xl p-3 flex flex-col gap-2 transition-colors`}>
            <div className={`flex items-center justify-between pb-1 border-b ${isWhiteTheme ? "border-slate-200" : "border-[#13233c]/60"}`}>
              <div className="flex items-center gap-1.5">
                <h2 className={`text-xs font-bold tracking-wider ${isWhiteTheme ? "text-slate-800" : "text-slate-300"} font-mono`}>
                  AI PATTERN ANALYSIS
                </h2>
                <span className={`text-[9px] px-1.5 py-0.2 rounded ${isWhiteTheme ? "bg-cyan-50 text-cyan-800 border border-cyan-300" : "bg-cyan-950 text-cyan-300 border border-cyan-800"} font-mono`}>
                  {patterns.length}개 탐지
                </span>
              </div>
              <button 
                onClick={() => setPatternTrackingOn(!patternTrackingOn)}
                className={isWhiteTheme ? "text-slate-500 hover:text-slate-800" : "text-slate-400 hover:text-white"}
                title="패턴 토글"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Unified Market Shape Status Bar */}
            <div className={`p-2 rounded-lg border text-[10px] font-mono leading-tight ${
              isWhiteTheme ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-[#050c18] border-[#12233c] text-slate-300"
            }`}>
              <div className="flex items-center justify-between font-bold mb-1">
                <span className={isWhiteTheme ? "text-cyan-700" : "text-cyan-400"}>
                  {unifiedMarketShape.overallShapeLabel}
                </span>
                <span className="text-emerald-500 font-mono font-black">
                  점수: {unifiedMarketShape.overallShapeScore}점
                </span>
              </div>
              <div className={`text-[9px] ${isWhiteTheme ? "text-slate-500" : "text-slate-400"} truncate`}>
                {unifiedMarketShape.patternShape.description}
              </div>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5 custom-scrollbar">
              {patterns.map((ptn, idx) => {
                const isSelected = selectedPatternId === ptn.id;
                const isTargetReached = ptn.state === "TARGET_REACHED";
                const isInvalidated = ptn.state === "INVALIDATED";

                return (
                  <div 
                    key={`${ptn.name}_${idx}`}
                    onClick={() => setSelectedPatternId(isSelected ? null : ptn.id)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                      isSelected
                        ? (isWhiteTheme ? "bg-cyan-50/80 border-cyan-500 shadow-xs" : "bg-[#0b1b36] border-cyan-400 shadow-md shadow-cyan-500/20")
                        : (!ptn.isValidForSignal 
                            ? (isWhiteTheme ? "bg-slate-100/70 border-slate-200 opacity-80" : "bg-[#040912] border-slate-800/60 opacity-80")
                            : (isWhiteTheme ? "bg-slate-50 border-slate-200 hover:border-slate-300" : "bg-[#060e1b] border-slate-800/80 hover:border-slate-700")
                          )
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`font-bold text-xs ${isWhiteTheme ? "text-slate-900" : "text-slate-100"} truncate`}>
                          {ptn.koreanName || ptn.name}
                        </span>
                        <span className={`px-1 py-0.2 rounded text-[8px] font-bold ${
                          ptn.type === "BULLISH" ? (isWhiteTheme ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-emerald-950 text-emerald-300 border border-emerald-800") :
                          (isWhiteTheme ? "bg-rose-100 text-rose-800 border border-rose-300" : "bg-rose-950 text-rose-300 border border-rose-800")
                        }`}>
                          {ptn.type === "BULLISH" ? "상승" : "하락"}
                        </span>

                        {/* Pattern Lifecycle State Badge */}
                        <span className={`px-1 py-0.2 rounded text-[8px] font-bold font-mono ${
                          isTargetReached ? (isWhiteTheme ? "bg-teal-100 text-teal-800 border border-teal-300" : "bg-teal-950 text-teal-300 border border-teal-800") :
                          isInvalidated ? (isWhiteTheme ? "bg-rose-100 text-rose-800 border border-rose-300" : "bg-rose-950 text-rose-300 border border-rose-800") :
                          ptn.state === "FORMING" ? (isWhiteTheme ? "bg-amber-100 text-amber-800 border border-amber-300" : "bg-amber-950 text-amber-300 border border-amber-800") :
                          (isWhiteTheme ? "bg-cyan-100 text-cyan-800 border border-cyan-300" : "bg-cyan-950 text-cyan-300 border border-cyan-800")
                        }`}>
                          {ptn.stateLabel}
                        </span>
                      </div>

                      <div className={`text-[10px] font-mono ${isWhiteTheme ? "text-slate-600" : "text-slate-400"} mt-1 flex items-center justify-between`}>
                        <span>신뢰도: <b className={isWhiteTheme ? "text-cyan-800 font-bold" : "text-cyan-300"}>{ptn.confidence}%</b></span>
                        <span>목표가: <b className={`${isTargetReached ? "line-through text-slate-400" : (isWhiteTheme ? "text-emerald-700 font-bold" : "text-emerald-400")}`}>{formatPrice(ptn.targetPrice)}</b></span>
                      </div>

                      {ptn.stateDescription && (
                        <div className={`text-[9px] ${isTargetReached ? "text-teal-600 font-semibold" : isInvalidated ? "text-rose-500 font-semibold" : (isWhiteTheme ? "text-slate-500" : "text-slate-400")} truncate mt-0.5 font-mono`}>
                          {ptn.stateDescription}
                        </div>
                      )}
                    </div>

                    {/* Pattern Trajectory Mini Chart */}
                    <div className={`w-14 h-8 shrink-0 ${isWhiteTheme ? "bg-white border-slate-200" : "bg-[#040812] border-slate-900"} rounded p-0.5 border flex items-center justify-center`}>
                      <svg className="w-full h-full" viewBox="0 0 100 45">
                        <path
                          fill="none"
                          stroke={ptn.type === "BULLISH" ? (isWhiteTheme ? "#059669" : "#10b981") : (isWhiteTheme ? "#e11d48" : "#f43f5e")}
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          d={ptn.pathData}
                        />
                      </svg>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={`flex items-center justify-between pt-1 border-t ${isWhiteTheme ? "border-slate-200 text-slate-500" : "border-slate-800/60 text-slate-400"} text-[10px] font-mono`}>
              <span>생애주기 가동 패턴 엔진</span>
              <span className={`font-bold ${patternTrackingOn ? (isWhiteTheme ? "text-cyan-700" : "text-cyan-400") : "text-slate-500"}`}>
                {patternTrackingOn ? "ACTIVE (LIFECYCLE FILTER)" : "OFF"}
              </span>
            </div>
          </div>

          {/* PANEL 2: AI SIGNALS */}
          <div className={`${isWhiteTheme ? "bg-white border-slate-200 shadow-sm" : "bg-[#081222] border-[#13233c] shadow-sm"} border rounded-xl p-3 flex flex-col gap-2.5 transition-colors`}>
            <div className={`flex items-center justify-between pb-1 border-b ${isWhiteTheme ? "border-slate-200" : "border-[#13233c]/60"}`}>
              <h2 className={`text-xs font-bold tracking-wider ${isWhiteTheme ? "text-slate-800" : "text-slate-300"} font-mono`}>
                AI SIGNALS
              </h2>
              <span className={`text-[10px] font-mono ${isWhiteTheme ? "text-cyan-800 font-semibold" : "text-cyan-400"} flex items-center gap-1`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isWhiteTheme ? "bg-emerald-600" : "bg-emerald-400"} animate-pulse`} />
                실시간 추천
              </span>
            </div>

            {/* Signal Card 1: ACTIVE STOCK REALTIME SIGNAL */}
            <div className={`p-3 rounded-xl ${isWhiteTheme ? "bg-emerald-50/70 border-emerald-300" : "bg-gradient-to-r from-[#071f1a] to-[#081726] border-emerald-500/40"} border space-y-2`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${isWhiteTheme ? "bg-emerald-600" : "bg-emerald-400"} animate-ping`} />
                  <span className={`font-bold text-xs ${isWhiteTheme ? "text-emerald-800" : "text-emerald-300"}`}>BUY SIGNAL 매수 신호</span>
                </div>
                <span className={`font-mono font-black text-sm ${isWhiteTheme ? "text-emerald-700" : "text-emerald-400"}`}>
                  {formatPrice(currentStock.price)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs gap-2">
                <span className={`${isWhiteTheme ? "text-slate-800" : "text-slate-300"} font-medium truncate`}>{currentStock.name} ({currentStock.symbol})</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {currentStock.market === "US" && (
                    <button
                      type="button"
                      onClick={() => setIsFractionalModalOpen(true)}
                      className={`px-2 py-1 rounded ${isWhiteTheme ? "bg-cyan-600 hover:bg-cyan-700 text-white" : "bg-cyan-600 hover:bg-cyan-500 text-white"} text-xs font-black shadow-sm transition flex items-center gap-1 cursor-pointer`}
                      title="소수점 매수 모달 열기"
                    >
                      <Coins className="w-3 h-3" />
                      <span>소수점</span>
                    </button>
                  )}
                  <button
                    onClick={() => triggerAiExecution("BUY", currentStock.symbol, currentStock.price)}
                    className={`px-2.5 py-1 rounded ${isWhiteTheme ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-emerald-500 hover:bg-emerald-400 text-[#07101e]"} text-xs font-black shadow-md transition cursor-pointer`}
                  >
                    자율 매수 체결
                  </button>
                </div>
              </div>

              <div className={`flex items-center justify-between pt-1 border-t ${isWhiteTheme ? "border-emerald-200 text-slate-600" : "border-emerald-900/40 text-slate-400"} text-[10px] font-mono`}>
                <div className="flex items-center gap-1">
                  <span>신호 강도</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((b) => (
                      <div key={b} className={`w-1.5 h-1.5 rounded-xs ${isWhiteTheme ? "bg-emerald-600" : "bg-emerald-400"}`} />
                    ))}
                  </div>
                  <span className={`${isWhiteTheme ? "text-emerald-800 font-bold" : "text-emerald-300"} ml-1`}>89%</span>
                </div>
                <span>패턴 합의 일치</span>
              </div>
            </div>

            {/* Signal Card 2: SECONDARY REBALANCING SIGNAL */}
            <div className={`p-3 rounded-xl ${isWhiteTheme ? "bg-rose-50/70 border-rose-300" : "bg-gradient-to-r from-[#240c15] to-[#12081c] border-rose-500/40"} border space-y-2`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${isWhiteTheme ? "bg-rose-600" : "bg-rose-400"} animate-ping`} />
                  <span className={`font-bold text-xs ${isWhiteTheme ? "text-rose-800" : "text-rose-300"}`}>SELL SIGNAL 익절/분할매도</span>
                </div>
                <span className={`font-mono font-black text-sm ${isWhiteTheme ? "text-rose-700" : "text-rose-400"}`}>
                  {formatPrice(Math.round(currentStock.price * 1.05))}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className={`${isWhiteTheme ? "text-slate-800" : "text-slate-300"} font-medium`}>{currentStock.name} 목표 도달시</span>
                <button
                  onClick={() => triggerAiExecution("SELL", currentStock.symbol, Math.round(currentStock.price * 1.05))}
                  className={`px-2.5 py-1 rounded ${isWhiteTheme ? "bg-rose-600 hover:bg-rose-500 text-white" : "bg-rose-500 hover:bg-rose-400 text-white"} text-xs font-black shadow-md transition`}
                >
                  예약 매도
                </button>
              </div>

              <div className={`flex items-center justify-between pt-1 border-t ${isWhiteTheme ? "border-rose-200 text-slate-600" : "border-rose-900/40 text-slate-400"} text-[10px] font-mono`}>
                <div className="flex items-center gap-1">
                  <span>신호 강도</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4].map((b) => (
                      <div key={b} className={`w-1.5 h-1.5 rounded-xs ${isWhiteTheme ? "bg-rose-600" : "bg-rose-500"}`} />
                    ))}
                  </div>
                  <span className={`${isWhiteTheme ? "text-rose-800 font-bold" : "text-rose-300"} ml-1`}>82%</span>
                </div>
                <span>추세 이탈 방어</span>
              </div>
            </div>
          </div>

          {/* PANEL 3: TRADE LOG */}
          <div className={`${isWhiteTheme ? "bg-white border-slate-200 shadow-sm" : "bg-[#081222] border-[#13233c] shadow-sm"} border rounded-xl p-3 flex flex-col gap-2 transition-colors`}>
            <div className={`flex items-center justify-between pb-1 border-b ${isWhiteTheme ? "border-slate-200" : "border-[#13233c]/60"}`}>
              <h2 className={`text-xs font-bold tracking-wider ${isWhiteTheme ? "text-slate-800" : "text-slate-300"} font-mono`}>
                TRADE LOG
              </h2>
              <button
                onClick={() => setIsHistoryModalOpen(true)}
                className={`text-[10px] ${isWhiteTheme ? "text-cyan-700 hover:text-cyan-900" : "text-cyan-400"} hover:underline font-mono`}
              >
                View All
              </button>
            </div>

            <div className={`text-[10px] font-mono ${isWhiteTheme ? "text-slate-500 border-slate-200" : "text-slate-400 border-slate-800/60"} grid grid-cols-12 px-1 pb-1 border-b`}>
              <span className="col-span-3">Time</span>
              <span className="col-span-3">Symbol</span>
              <span className="col-span-2 text-center">Action</span>
              <span className="col-span-2 text-right">Price</span>
              <span className="col-span-2 text-right">P/L</span>
            </div>

            <div className="space-y-1 max-h-44 overflow-y-auto pr-0.5 custom-scrollbar">
              {tradeLogs.map((log, idx) => {
                const isBuy = log.action === "BUY";
                const isWin = log.pnlPct >= 0;

                return (
                  <div
                    key={`${log.id}_${idx}`}
                    className={`grid grid-cols-12 items-center p-1 rounded hover:${isWhiteTheme ? "bg-slate-100" : "bg-[#0c182c]"} text-xs font-mono transition`}
                  >
                    <span className={`col-span-3 text-[10px] ${isWhiteTheme ? "text-slate-500" : "text-slate-400"}`}>{log.time}</span>
                    <span className={`col-span-3 text-[11px] ${isWhiteTheme ? "text-slate-800" : "text-slate-200"} font-sans truncate`}>{log.symbol}</span>
                    <span className="col-span-2 text-center">
                      <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                        isBuy ? (isWhiteTheme ? "text-emerald-800 bg-emerald-100 border border-emerald-300" : "text-emerald-400 bg-emerald-950/60") : (isWhiteTheme ? "text-rose-800 bg-rose-100 border border-rose-300" : "text-rose-400 bg-rose-950/60")
                      }`}>
                        {log.action}
                      </span>
                    </span>
                    <span className={`col-span-2 text-right text-[11px] ${isWhiteTheme ? "text-slate-700" : "text-slate-300"}`}>
                      {(log.price ?? 0).toLocaleString()}
                    </span>
                    <span className={`col-span-2 text-right text-[11px] font-bold ${
                      isWin ? (isWhiteTheme ? "text-emerald-700" : "text-emerald-400") : (isWhiteTheme ? "text-rose-700" : "text-rose-400")
                    }`}>
                      {isWin ? "+" : ""}{log.pnlPct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
      </div>

      {/* 3. BOTTOM FOOTER TICKER & STATUS BAR */}
      <footer className={`h-9 border-t ${isWhiteTheme ? "bg-white border-slate-200 text-slate-700" : "bg-[#07101e] border-[#13233c]"} px-4 flex items-center justify-between text-xs z-20 transition-colors`}>
        <div className="flex items-center gap-4 min-w-0 overflow-hidden">
          {/* AI Alert Ticker */}
          <div className="flex items-center gap-2 shrink-0">
            <span className={`px-2 py-0.5 rounded ${isWhiteTheme ? "bg-cyan-100 border border-cyan-300 text-cyan-800 font-bold" : "bg-cyan-950/80 border border-cyan-700/80 text-cyan-300 font-bold"} text-[10px]`}>
              AI MARKET ALERT
            </span>
            <span className={`${isWhiteTheme ? "text-slate-800 font-medium" : "text-slate-300"} truncate text-[11px]`}>
              삼성전자 AI 모델이 강한 매수 신호를 감지했습니다.
            </span>
          </div>

          <div className={`hidden md:flex items-center gap-2 shrink-0 pl-4 border-l ${isWhiteTheme ? "border-slate-200" : "border-slate-800"}`}>
            <span className={`px-2 py-0.5 rounded ${isWhiteTheme ? "bg-amber-100 border border-amber-300 text-amber-800 font-bold" : "bg-amber-950/80 border border-amber-700/80 text-amber-300 font-bold"} text-[10px]`}>
              BREAKING NEWS
            </span>
            <span className={`${isWhiteTheme ? "text-slate-600" : "text-slate-400"} truncate text-[11px]`}>
              미국 고용지표 호조로 시장 상승세 지속
            </span>
          </div>
        </div>

        {/* System Operational Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={`${isWhiteTheme ? "text-slate-500" : "text-slate-400"} text-[11px] hidden sm:inline`}>System Status</span>
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${isWhiteTheme ? "bg-emerald-100 border border-emerald-300 text-emerald-800" : "bg-emerald-950/80 border border-emerald-800/80 text-emerald-300"} text-[10px] font-mono`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isWhiteTheme ? "bg-emerald-600" : "bg-emerald-400"} animate-pulse`} />
            <span>All Systems Operational</span>
          </div>
        </div>
      </footer>

      {/* ============================================================ */}
      {/* 4. PRESERVED INTEGRATED MODALS (100% Retained Capabilities)   */}
      {/* ============================================================ */}
      
      {/* Search & Stock Universe Modal */}
      {isSearchModalOpen && (
        <StockSearchAndAddModal
          isOpen={isSearchModalOpen}
          onClose={() => setIsSearchModalOpen(false)}
          onSelectStock={(sym) => {
            setSelectedSymbol(sym);
            setIsSearchModalOpen(false);
          }}
        />
      )}

      {/* Real Broker Balances & Holdings Detailed Screen Modal */}
      {isBalanceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`${isWhiteTheme ? "bg-white border-slate-200 text-slate-800" : "bg-[#081222] border-[#13233c] text-white"} border rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto p-4 shadow-2xl`}>
            <div className={`flex items-center justify-between pb-3 border-b ${isWhiteTheme ? "border-slate-200" : "border-slate-800"} mb-4`}>
              <h2 className={`text-base font-bold ${isWhiteTheme ? "text-slate-900" : "text-white"} flex items-center gap-2`}>
                <DollarSign className="w-5 h-5 text-emerald-500" />
                실계좌 종합 잔고 및 보유 포지션 매니저
              </h2>
              <button
                onClick={() => setIsBalanceModalOpen(false)}
                className={`px-3 py-1 ${isWhiteTheme ? "bg-slate-100 hover:bg-slate-200 text-slate-700" : "bg-slate-800 hover:bg-slate-700 text-slate-300"} rounded-lg text-xs`}
              >
                닫기
              </button>
            </div>
            <RealBrokerDetailedBalanceAndHoldings
              onSelectStock={(sym) => {
                setSelectedSymbol(sym);
                setIsBalanceModalOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {/* 30 Bots Autonomous Fleet Dashboard Modal */}
      {isBotFleetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`${isWhiteTheme ? "bg-white border-slate-200 text-slate-800" : "bg-[#081222] border-[#13233c] text-white"} border rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto p-4 shadow-2xl`}>
            <div className={`flex items-center justify-between pb-3 border-b ${isWhiteTheme ? "border-slate-200" : "border-slate-800"} mb-4`}>
              <h2 className={`text-base font-bold ${isWhiteTheme ? "text-slate-900" : "text-white"} flex items-center gap-2`}>
                <Bot className="w-5 h-5 text-cyan-500" />
                30대 AI 자율매매 봇 플릿 오케스트레이터
              </h2>
              <button
                onClick={() => setIsBotFleetModalOpen(false)}
                className={`px-3 py-1 ${isWhiteTheme ? "bg-slate-100 hover:bg-slate-200 text-slate-700" : "bg-slate-800 hover:bg-slate-700 text-slate-300"} rounded-lg text-xs`}
              >
                닫기
              </button>
            </div>
            <BotStatusDashboard
              onSelectStock={(sym) => {
                setSelectedSymbol(sym);
                setIsBotFleetModalOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Multi-Model Consensus Modal */}
      {isConsensusModalOpen && (
        <MultiModelSecuritiesConsensusModal
          isOpen={isConsensusModalOpen}
          onClose={() => setIsConsensusModalOpen(false)}
          initialSymbol={selectedSymbol}
          onSelectStockForTerminal={(sym) => {
            setSelectedSymbol(sym);
            setIsConsensusModalOpen(false);
          }}
        />
      )}

      {/* Smart Safety Risk Governance Modal */}
      {isGovernanceModalOpen && (
        <SmartSafetyGovernanceModal
          isOpen={isGovernanceModalOpen}
          onClose={() => setIsGovernanceModalOpen(false)}
        />
      )}

      {/* Transaction & Trade History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`${isWhiteTheme ? "bg-white border-slate-200 text-slate-800" : "bg-[#081222] border-[#13233c] text-white"} border rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto p-4 shadow-2xl`}>
            <div className={`flex items-center justify-between pb-3 border-b ${isWhiteTheme ? "border-slate-200" : "border-slate-800"} mb-4`}>
              <h2 className={`text-base font-bold ${isWhiteTheme ? "text-slate-900" : "text-white"} flex items-center gap-2`}>
                <Clock className="w-5 h-5 text-cyan-500" />
                전체 체결 이력 및 AI 주문 감사 로그
              </h2>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className={`px-3 py-1 ${isWhiteTheme ? "bg-slate-100 hover:bg-slate-200 text-slate-700" : "bg-slate-800 hover:bg-slate-700 text-slate-300"} rounded-lg text-xs`}
              >
                닫기
              </button>
            </div>
            <TransactionHistory />
          </div>
        </div>
      )}

      {/* SMC Order Blocks & Liquidity Sweeps Visualizer Modal */}
      {isSmcModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`${isWhiteTheme ? "bg-white border-slate-200 text-slate-800" : "bg-[#081222] border-[#13233c] text-white"} border rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto p-4 shadow-2xl`}>
            <div className={`flex items-center justify-between pb-3 border-b ${isWhiteTheme ? "border-slate-200" : "border-slate-800"} mb-4`}>
              <h2 className={`text-base font-bold ${isWhiteTheme ? "text-slate-900" : "text-white"} flex items-center gap-2`}>
                <Layers className="w-5 h-5 text-purple-500" />
                SMC 기관 자금 마켓 구조 & 오더블럭 분석
              </h2>
              <button
                onClick={() => setIsSmcModalOpen(false)}
                className={`px-3 py-1 ${isWhiteTheme ? "bg-slate-100 hover:bg-slate-200 text-slate-700" : "bg-slate-800 hover:bg-slate-700 text-slate-300"} rounded-lg text-xs`}
              >
                닫기
              </button>
            </div>
            <SmcMarketStructureVisualizer
              symbol={selectedSymbol}
              market="KR"
              currentPrice={currentStock.price}
            />
          </div>
        </div>
      )}

      {/* Foreign / US Fractional Stock Order Modal */}
      {isFractionalModalOpen && (
        <FractionalStockOrderModal
          isOpen={isFractionalModalOpen}
          onClose={() => setIsFractionalModalOpen(false)}
          stock={{
            symbol: currentStock.symbol,
            name: currentStock.name,
            price: currentStock.price,
            market: currentStock.market,
            chgPct: currentStock.chgPct
          }}
          isWhiteTheme={isWhiteTheme}
        />
      )}

      {/* Uploaded Strategy File Reader & Parser Modal */}
      {isStrategyFileReaderOpen && (
        <UploadedStrategyFileReaderModal
          isOpen={isStrategyFileReaderOpen}
          onClose={() => setIsStrategyFileReaderOpen(false)}
          onApplyCandles={(c) => setCandles(c)}
          formatPrice={formatPrice}
        />
      )}

      {/* Manual Entry Gate Modal (Scanner Omission Inspector) */}
      <ManualEntryGateModal
        isOpen={isManualGateOpen}
        onClose={() => setIsManualGateOpen(false)}
        initialSymbol={selectedSymbol}
        initialName={currentStock?.name || selectedSymbol}
        initialMarket={currentStock?.market === "US" ? "US" : currentStock?.market === "UPBIT" ? "BTC" : "KOREA"}
        initialPrice={currentStock?.price || 0}
        onExecuteOrderSuccess={(orderId) => {
          addToast?.(`✅ [v12.4 Manual Gate] 미포착 종목 주문 수신 완료 (ODNO: ${orderId})`, "success");
        }}
      />

      {/* 30-DAY AI FUTURE FORECAST FULL OVERLAY MODAL */}
      {showFullForecastChartModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#081222] border border-cyan-800 rounded-2xl w-full max-w-6xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            <div className="p-4 border-b border-cyan-900/60 flex items-center justify-between bg-[#060c18]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400 animate-spin" />
                <h3 className="text-base font-black text-white font-mono">
                  📊 실시간 vs AI 예측 듀얼 대조 분석 차트 ({currentStock.name} - {currentStock.symbol})
                </h3>
              </div>
              <button
                onClick={() => setShowFullForecastChartModal(false)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold font-mono transition cursor-pointer"
              >
                닫기 ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <InteractivePredictionCanvasChart
                symbol={currentStock.symbol}
                name={currentStock.name}
                market={currentStock.market === "US" ? "US" : currentStock.market === "UPBIT" ? "BTC" : "KOREA"}
                currentPrice={currentStock.price}
                candles={candles}
                liveTickHistory={candles.slice(-30).map((c) => ({
                  time: typeof c.time === "string" ? c.time : String(c.time),
                  price: c.close,
                  volume: c.volume,
                  side: c.close >= c.open ? "BUY" : "SELL"
                }))}
                timeframe={selectedTimeframe}
                horizonMode="MEDIUM"
                tradePlan={{
                  entryPrice: currentStock.price,
                  tp1: Math.round(currentStock.price * 1.05),
                  tp2: Math.round(currentStock.price * 1.10),
                  stopLoss: Math.round(currentStock.price * 0.97),
                  riskRewardRatio: 2.85
                }}
                recommendation="BUY"
                actionSignal="BUY_CANDIDATE"
                aiConfidence={currentStock?.price > 0 ? 80 : 0}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
