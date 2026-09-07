import React, { useState, useMemo, useEffect } from "react";
import { 
  FileText, 
  Sparkles, 
  Building2, 
  LayoutDashboard, 
  CalendarCheck, 
  ClipboardList, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  ArrowRight, 
  Download, 
  Copy, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  Layers, 
  DollarSign, 
  BarChart2, 
  Clock, 
  Target, 
  Flame, 
  Crosshair, 
  PieChart, 
  Percent, 
  HelpCircle, 
  RefreshCw,
  Search,
  UserCheck,
  Settings,
  Activity,
  Award,
  Sliders,
  ChevronDown,
  ChevronUp,
  Eye,
  BookOpen,
  LineChart
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { BullishPatternsLifecycleEngine } from "./BullishPatternsLifecycleEngine";
import { BearishPatternsLifecycleEngine } from "./BearishPatternsLifecycleEngine";
import { QuantSetupQualityMatrixEngine } from "./QuantSetupQualityMatrixEngine";
import { searchStocksFromIndex, resolveStockName, COMPREHENSIVE_STOCK_INDEX } from "../lib/stockDictionary";
import { stockSyncService } from "../services/stockSyncService";

// ----------------------------------------------------------------------
// TYPES & INTERFACES
// ----------------------------------------------------------------------
export interface UserInvestProfile {
  targetReturnPct: number; // e.g. 25% annual
  stopLossLimitPct: number; // e.g. -10%
  taxExemptionLimit: number; // e.g. 2,500,000 KRW
  maxSinglePositionPct: number; // e.g. 25%
  cashReservePct: number; // e.g. 15%
  riskTolerance: "CONSERVATIVE" | "BALANCED" | "AGGRESSIVE";
}

export interface TradeJournalEntry {
  id: string;
  date: string;
  ticker: string;
  type: "BUY" | "SELL";
  price: number;
  qty: number;
  reason: string;
  resultPnlPct?: number;
  aiMistakeTag?: "FOMO_BUY" | "PANIC_SELL" | "GREED_NO_TP" | "PERFECT_EXEC";
  aiFeedback: string;
}

// ----------------------------------------------------------------------
// COMPONENT: METICULOUS DETAILED CHART (자세하게 꼼꼼하게보여주는 차트)
// ----------------------------------------------------------------------
const MeticulousDetailedChart: React.FC<{
  ticker: string;
  name: string;
  currentPrice: number;
}> = ({ ticker, name, currentPrice }) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<"1D" | "1W" | "1M" | "1Y">("1M");
  const [showMA, setShowMA] = useState(true);
  const [showBollinger, setShowBollinger] = useState(true);
  const [showRSI, setShowRSI] = useState(true);
  const [showMACD, setShowMACD] = useState(true);
  const [showPatterns, setShowPatterns] = useState(true);
  const [hoveredDataIndex, setHoveredDataIndex] = useState<number | null>(null);

  // Generate realistic OHLC candlestick mock dataset with technical indicators
  const candles = useMemo(() => {
    const data = [];
    let base = currentPrice * 0.88;
    const count = 30;
    const now = new Date();

    for (let i = 0; i < count; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - (count - i));
      const dateStr = d.toISOString().split("T")[0].slice(5);

      const change = (Math.random() - 0.46) * (base * 0.035);
      const open = base;
      const close = Math.max(open + change, base * 0.8);
      const high = Math.max(open, close) + Math.random() * (base * 0.015);
      const low = Math.min(open, close) - Math.random() * (base * 0.015);
      const volume = Math.floor(Math.random() * 500000 + 200000);

      base = close;

      data.push({
        date: dateStr,
        open,
        high,
        low,
        close,
        volume,
        isUp: close >= open,
      });
    }
    // Ensure last close matches current price
    if (data.length > 0) {
      data[data.length - 1].close = currentPrice;
      data[data.length - 1].high = Math.max(data[data.length - 1].high, currentPrice * 1.01);
      data[data.length - 1].isUp = data[data.length - 1].close >= data[data.length - 1].open;
    }

    // Compute moving averages & indicators
    return data.map((item, idx, arr) => {
      // MA20
      const slice20 = arr.slice(Math.max(0, idx - 19), idx + 1);
      const ma20 = slice20.reduce((acc, c) => acc + c.close, 0) / slice20.length;

      // MA50/10 placeholder
      const slice10 = arr.slice(Math.max(0, idx - 9), idx + 1);
      const ma10 = slice10.reduce((acc, c) => acc + c.close, 0) / slice10.length;

      // Bollinger Upper/Lower
      const stdDev = Math.sqrt(
        slice20.reduce((acc, c) => acc + Math.pow(c.close - ma20, 2), 0) / slice20.length
      );
      const bbUpper = ma20 + stdDev * 2;
      const bbLower = ma20 - stdDev * 2;

      // RSI (14)
      let rsi = 50;
      if (idx >= 14) {
        let gains = 0, losses = 0;
        for (let j = idx - 13; j <= idx; j++) {
          const diff = arr[j].close - arr[j - 1].close;
          if (diff >= 0) gains += diff;
          else losses += Math.abs(diff);
        }
        const avgGain = gains / 14;
        const avgLoss = losses / 14;
        const rs = avgGain / (avgLoss || 1);
        rsi = 100 - (100 / (1 + rs));
      } else {
        rsi = 45 + Math.random() * 20;
      }

      // MACD
      const macd = (ma10 - ma20);
      const signal = macd * 0.8;
      const hist = macd - signal;

      return {
        ...item,
        ma20,
        ma10,
        bbUpper,
        bbLower,
        rsi: Math.min(Math.max(rsi, 15), 85),
        macd,
        signal,
        hist
      };
    });
  }, [currentPrice, selectedTimeframe, ticker]);

  const minPrice = Math.min(...candles.map(c => c.low)) * 0.98;
  const maxPrice = Math.max(...candles.map(c => c.high)) * 1.02;
  const priceRange = maxPrice - minPrice || 1;

  const maxVolume = Math.max(...candles.map(c => c.volume)) || 1;

  // Chart SVG Coordinates Helper
  const svgWidth = 800;
  const svgHeight = 280;
  const paddingRight = 60;
  const paddingLeft = 10;
  const chartWidth = svgWidth - paddingLeft - paddingRight;

  const getY = (val: number) => {
    return svgHeight - ((val - minPrice) / priceRange) * (svgHeight - 30) - 15;
  };

  const getX = (index: number) => {
    return paddingLeft + (index / (candles.length - 1)) * chartWidth;
  };

  const hoveredCandle = hoveredDataIndex !== null ? candles[hoveredDataIndex] : candles[candles.length - 1];

  // Resistance & Support Levels
  const support1 = minPrice * 1.02;
  const resistance1 = maxPrice * 0.98;
  const targetTP = currentPrice * 1.08;
  const stopLossSL = currentPrice * 0.93;

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-4 sm:p-6 space-y-4 shadow-2xl">
      {/* Chart Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <LineChart className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-black text-white">
              {name} ({ticker}) 정밀 기술적 분석 차트
            </h3>
            <span className="px-2.5 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-mono font-bold rounded-full">
              30봉 OHLC + 보조지표
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            이동평균선(MA), 볼린저밴드, RSI, MACD 오실레이터 및 자동 기술적 패턴 감지
          </p>
        </div>

        {/* Timeframe & Indicator Toggles */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="bg-zinc-900 p-1 rounded-xl border border-zinc-800 flex items-center gap-1 font-mono">
            {(["1D", "1W", "1M", "1Y"] as const).map(tf => (
              <button
                key={tf}
                onClick={() => setSelectedTimeframe(tf)}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  selectedTimeframe === tf ? "bg-cyan-600 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <button
              onClick={() => setShowMA(!showMA)}
              className={`px-2 py-1 rounded-lg border transition ${showMA ? "bg-amber-950/60 text-amber-300 border-amber-700" : "bg-zinc-900 text-zinc-500 border-zinc-800"}`}
            >
              MA20
            </button>
            <button
              onClick={() => setShowBollinger(!showBollinger)}
              className={`px-2 py-1 rounded-lg border transition ${showBollinger ? "bg-purple-950/60 text-purple-300 border-purple-700" : "bg-zinc-900 text-zinc-500 border-zinc-800"}`}
            >
              볼린저밴드
            </button>
            <button
              onClick={() => setShowRSI(!showRSI)}
              className={`px-2 py-1 rounded-lg border transition ${showRSI ? "bg-emerald-950/60 text-emerald-300 border-emerald-700" : "bg-zinc-900 text-zinc-500 border-zinc-800"}`}
            >
              RSI
            </button>
            <button
              onClick={() => setShowMACD(!showMACD)}
              className={`px-2 py-1 rounded-lg border transition ${showMACD ? "bg-blue-950/60 text-blue-300 border-blue-700" : "bg-zinc-900 text-zinc-500 border-zinc-800"}`}
            >
              MACD
            </button>
          </div>
        </div>
      </div>

      {/* Hovered Price Info HUD Bar */}
      {hoveredCandle && (
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 bg-zinc-900/90 p-3 rounded-2xl border border-zinc-800 font-mono text-xs">
          <div>
            <span className="text-zinc-500 text-[10px] block">날짜:</span>
            <span className="text-white font-bold">{hoveredCandle.date}</span>
          </div>
          <div>
            <span className="text-zinc-500 text-[10px] block">시가 (Open):</span>
            <span className="text-white font-bold">{(hoveredCandle.open ?? 0).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}</span>
          </div>
          <div>
            <span className="text-zinc-500 text-[10px] block">고가 (High):</span>
            <span className="text-emerald-400 font-bold">{(hoveredCandle.high ?? 0).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}</span>
          </div>
          <div>
            <span className="text-zinc-500 text-[10px] block">저가 (Low):</span>
            <span className="text-rose-400 font-bold">{(hoveredCandle.low ?? 0).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}</span>
          </div>
          <div>
            <span className="text-zinc-500 text-[10px] block">종가 (Close):</span>
            <span className={`font-black ${hoveredCandle.isUp ? "text-emerald-400" : "text-rose-400"}`}>
              {(hoveredCandle.close ?? 0).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 text-[10px] block">RSI(14) / MA20:</span>
            <span className="text-amber-300 font-bold">
              {hoveredCandle.rsi.toFixed(1)} / {hoveredCandle.ma20.toFixed(1)}
            </span>
          </div>
        </div>
      )}

      {/* MAIN CANDLESTICK SVG CHART */}
      <div className="relative bg-zinc-900/60 rounded-2xl border border-zinc-800/80 p-2 overflow-hidden">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible select-none">
          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map((pct, i) => {
            const y = svgHeight * pct;
            const priceVal = maxPrice - (maxPrice - minPrice) * pct;
            return (
              <g key={i}>
                <line x1={paddingLeft} y1={y} x2={svgWidth - paddingRight} y2={y} stroke="#27272a" strokeDasharray="3 3" />
                <text x={svgWidth - paddingRight + 6} y={y + 4} fill="#71717a" fontSize="10" fontFamily="monospace">
                  {(priceVal ?? 0).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}
                </text>
              </g>
            );
          })}

          {/* Support S1 & Resistance R1 Target Lines */}
          <line x1={paddingLeft} y1={getY(resistance1)} x2={svgWidth - paddingRight} y2={getY(resistance1)} stroke="#ef4444" strokeWidth="1" strokeDasharray="4 2" opacity="0.6" />
          <text x={paddingLeft + 5} y={getY(resistance1) - 4} fill="#ef4444" fontSize="9" fontWeight="bold" fontFamily="monospace">
            저항선 R1: {resistance1.toFixed(1)}
          </text>

          <line x1={paddingLeft} y1={getY(support1)} x2={svgWidth - paddingRight} y2={getY(support1)} stroke="#10b981" strokeWidth="1" strokeDasharray="4 2" opacity="0.6" />
          <text x={paddingLeft + 5} y={getY(support1) + 12} fill="#10b981" fontSize="9" fontWeight="bold" fontFamily="monospace">
            지지선 S1: {support1.toFixed(1)}
          </text>

          {/* Target Take-Profit & Stop-Loss Visual Zone */}
          <line x1={paddingLeft} y1={getY(targetTP)} x2={svgWidth - paddingRight} y2={getY(targetTP)} stroke="#06b6d4" strokeWidth="1.5" />
          <text x={svgWidth - paddingRight + 6} y={getY(targetTP) + 3} fill="#06b6d4" fontSize="9" fontWeight="black" fontFamily="monospace">
            TP (+8%): {targetTP.toFixed(1)}
          </text>

          <line x1={paddingLeft} y1={getY(stopLossSL)} x2={svgWidth - paddingRight} y2={getY(stopLossSL)} stroke="#f43f5e" strokeWidth="1.5" />
          <text x={svgWidth - paddingRight + 6} y={getY(stopLossSL) + 3} fill="#f43f5e" fontSize="9" fontWeight="black" fontFamily="monospace">
            SL (-7%): {stopLossSL.toFixed(1)}
          </text>

          {/* Bollinger Bands Polyline */}
          {showBollinger && (
            <>
              <polygon
                points={
                  candles.map((c, i) => `${getX(i)},${getY(c.bbUpper)}`).join(" ") +
                  " " +
                  candles.slice().reverse().map((c, i) => `${getX(candles.length - 1 - i)},${getY(c.bbLower)}`).join(" ")
                }
                fill="#a855f7"
                fillOpacity="0.08"
              />
              <polyline
                fill="none"
                stroke="#c084fc"
                strokeWidth="1"
                strokeDasharray="2 2"
                points={candles.map((c, i) => `${getX(i)},${getY(c.bbUpper)}`).join(" ")}
              />
              <polyline
                fill="none"
                stroke="#c084fc"
                strokeWidth="1"
                strokeDasharray="2 2"
                points={candles.map((c, i) => `${getX(i)},${getY(c.bbLower)}`).join(" ")}
              />
            </>
          )}

          {/* MA20 Line */}
          {showMA && (
            <polyline
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              points={candles.map((c, i) => `${getX(i)},${getY(c.ma20)}`).join(" ")}
            />
          )}

          {/* Candlesticks */}
          {candles.map((c, idx) => {
            const x = getX(idx);
            const openY = getY(c.open);
            const closeY = getY(c.close);
            const highY = getY(c.high);
            const lowY = getY(c.low);

            const candleColor = c.isUp ? "#10b981" : "#f43f5e";
            const topY = Math.min(openY, closeY);
            const height = Math.max(Math.abs(closeY - openY), 2);
            const candleWidth = Math.max(chartWidth / candles.length - 4, 6);

            const isHovered = hoveredDataIndex === idx;

            return (
              <g
                key={idx}
                className="cursor-pointer transition-opacity hover:opacity-100"
                onMouseEnter={() => setHoveredDataIndex(idx)}
              >
                {/* High/Low Wick */}
                <line x1={x} y1={highY} x2={x} y2={lowY} stroke={candleColor} strokeWidth="1.5" />

                {/* Open/Close Body */}
                <rect
                  x={x - candleWidth / 2}
                  y={topY}
                  width={candleWidth}
                  height={height}
                  fill={candleColor}
                  rx="1"
                  stroke={isHovered ? "#ffffff" : "none"}
                  strokeWidth="1"
                />

                {/* Pattern Highlight Overlay on breakout point */}
                {showPatterns && idx === candles.length - 5 && (
                  <g>
                    <circle cx={x} cy={highY - 12} r="10" fill="#06b6d4" fillOpacity="0.3" stroke="#06b6d4" strokeWidth="1.5" className="animate-ping" />
                    <circle cx={x} cy={highY - 12} r="5" fill="#06b6d4" />
                    <text x={x} y={highY - 22} textAnchor="middle" fill="#22d3ee" fontSize="9" fontWeight="black">
                      Bull Flag Breakout ★
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* LOWER SUB-PANELS: VOLUME & RSI/MACD INDICATORS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* RSI Oscillator Panel */}
        {showRSI && (
          <div className="bg-zinc-900/80 p-3 rounded-2xl border border-zinc-800 space-y-1">
            <div className="flex justify-between items-center text-[11px] font-mono">
              <span className="font-black text-emerald-400">RSI (14) 오실레이터</span>
              <span className="text-zinc-400">현재: <strong className="text-emerald-300">{candles[candles.length - 1].rsi.toFixed(1)}</strong> (과매수 70 / 과매도 30)</span>
            </div>
            <div className="h-16 relative bg-zinc-950 rounded-xl p-1 overflow-hidden">
              <svg viewBox={`0 0 ${svgWidth} 60`} className="w-full h-full">
                <line x1="0" y1="18" x2={svgWidth} y2="18" stroke="#ef4444" strokeDasharray="2 2" strokeWidth="0.8" opacity="0.5" />
                <line x1="0" y1="42" x2={svgWidth} y2="42" stroke="#10b981" strokeDasharray="2 2" strokeWidth="0.8" opacity="0.5" />
                <polyline
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="1.5"
                  points={candles.map((c, i) => `${getX(i)},${60 - (c.rsi / 100) * 60}`).join(" ")}
                />
              </svg>
            </div>
          </div>
        )}

        {/* MACD Histogram Panel */}
        {showMACD && (
          <div className="bg-zinc-900/80 p-3 rounded-2xl border border-zinc-800 space-y-1">
            <div className="flex justify-between items-center text-[11px] font-mono">
              <span className="font-black text-blue-400">MACD (12, 26, 9) 모멘텀</span>
              <span className="text-zinc-400">골든크로스 <strong className="text-cyan-300">상승 추세 강화</strong></span>
            </div>
            <div className="h-16 relative bg-zinc-950 rounded-xl p-1 overflow-hidden">
              <svg viewBox={`0 0 ${svgWidth} 60`} className="w-full h-full">
                <line x1="0" y1="30" x2={svgWidth} y2="30" stroke="#52525b" strokeWidth="0.8" />
                {candles.map((c, i) => {
                  const x = getX(i);
                  const h = Math.min(Math.abs(c.hist) * 8, 25);
                  const y = c.hist >= 0 ? 30 - h : 30;
                  const color = c.hist >= 0 ? "#60a5fa" : "#f87171";
                  return <rect key={i} x={x - 2} y={y} width="4" height={Math.max(h, 1)} fill={color} rx="0.5" />;
                })}
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Chart AI Summary Footer */}
      <div className="bg-gradient-to-r from-cyan-950/40 via-zinc-900 to-emerald-950/40 p-3 rounded-2xl border border-cyan-800/60 text-xs font-mono flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="text-zinc-200">
            <strong>차트 AI 종합 판단:</strong> MA20 지지선 상회 중 + Bull Flag 패턴 형성 중. $128.50 부근 손익비(R:R 2.7) 유효 진입 구간.
          </span>
        </div>
        <span className="text-emerald-400 font-bold">권장 매수 비중: 포트폴리오의 15%</span>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// MAIN COMPONENT: CLAUDE STOCK ANALYSIS SUITE
// ----------------------------------------------------------------------
export const ClaudeStockAnalysisSuite: React.FC = () => {
  const { addToast, selectedSymbol, setSelectedSymbol, watchlist } = useApp();

  // Active Tab inside Claude Analysis Suite
  const [activeSuiteTab, setActiveSuiteTab] = useState<
    "DECODER" | "DASHBOARD" | "DAILY_LOG" | "EXEC_WORKSHEET" | "PATTERN_PROFIT"
  >("DECODER");

  // Selected Stock Ticker Context
  const [targetTicker, setTargetTicker] = useState<string>("NVDA");
  const [targetName, setTargetName] = useState<string>("엔비디아 (NVIDIA)");
  const [targetMarket, setTargetMarket] = useState<"US" | "KOREA" | "BTC">("US");
  const [targetPrice, setTargetPrice] = useState<number>(128.50);

  // Synchronize with global selectedSymbol
  useEffect(() => {
    if (!selectedSymbol) return;
    const cleanSym = selectedSymbol.trim().toUpperCase();
    
    // 1. Check in Watchlist
    const inWatchlist = watchlist.find(w => w.symbol.toUpperCase() === cleanSym);
    if (inWatchlist) {
      setTargetTicker(inWatchlist.symbol);
      setTargetName(inWatchlist.name);
      setTargetMarket(inWatchlist.market);
      setTargetPrice(inWatchlist.targetBuyPrice || (inWatchlist.market === "US" ? 150 : 50000));
      return;
    }

    // 2. Check in Comprehensive Index
    const inIndex = COMPREHENSIVE_STOCK_INDEX.find(s => s.symbol.toUpperCase() === cleanSym);
    if (inIndex) {
      setTargetTicker(inIndex.symbol);
      setTargetName(inIndex.name);
      setTargetMarket(inIndex.market);
      setTargetPrice(inIndex.price);
      return;
    }

    // 3. Fallback resolve
    const isKr = /^\d{6}$/.test(cleanSym);
    const mType: "US" | "KOREA" | "BTC" = isKr ? "KOREA" : ["BTC", "ETH", "SOL", "XRP"].includes(cleanSym) ? "BTC" : "US";
    const resolved = resolveStockName(cleanSym, cleanSym, mType);
    setTargetTicker(cleanSym);
    setTargetName(resolved);
    setTargetMarket(mType);
    setTargetPrice(mType === "KOREA" ? 50000 : mType === "US" ? 120 : 90000000);
  }, [selectedSymbol, watchlist]);

  // Also listen to stockSyncService broadcasts
  useEffect(() => {
    const unsub = stockSyncService.subscribe((evt) => {
      if (evt && evt.symbol) {
        setTargetTicker(evt.symbol);
        setTargetName(evt.name);
        if (evt.price) setTargetPrice(evt.price);
      }
    });
    return unsub;
  }, []);

  // Fetch real-time live price for targetTicker
  useEffect(() => {
    let isMounted = true;
    const fetchLiveQuote = async () => {
      if (!targetTicker) return;
      try {
        const res = await fetch(`/api/stocks/${encodeURIComponent(targetTicker)}`);
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.price === "number" && data.price > 0 && isMounted) {
            setTargetPrice(data.price);
          }
        }
      } catch (e) {
        console.warn("Claude Suite live fetch error:", e);
      }
    };
    fetchLiveQuote();
    const timer = setInterval(fetchLiveQuote, 5000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [targetTicker]);

  // PROMPT #0: USER INVESTMENT PROFILE & CONSTRAINTS (Editable)
  const [userProfile, setUserProfile] = useState<UserInvestProfile>({
    targetReturnPct: 25,
    stopLossLimitPct: -10,
    taxExemptionLimit: 2500000,
    maxSinglePositionPct: 25,
    cashReservePct: 15,
    riskTolerance: "BALANCED"
  });

  const [isProfileEditing, setIsProfileEditing] = useState<boolean>(false);

  // PROMPT #3: TRADE JOURNAL LOG ENTRIES
  const [journalEntries, setJournalEntries] = useState<TradeJournalEntry[]>([
    {
      id: "j1",
      date: "2026-08-08",
      ticker: "NVDA",
      type: "BUY",
      price: 115.20,
      qty: 20,
      reason: "MA20 지지 확인 후 15분봉 Bull Flag 돌파 지점 손익비 2.5 진입",
      resultPnlPct: 11.54,
      aiMistakeTag: "PERFECT_EXEC",
      aiFeedback: "✅ 원칙 준수 매수. 손절가 지정과 지지선 이탈 없는 안정적 분할 매수 돋보임."
    },
    {
      id: "j2",
      date: "2026-08-05",
      ticker: "TSLA",
      type: "BUY",
      price: 220.00,
      qty: 15,
      reason: "로보택시 발표 기대감으로 갭상승 직후 추격 매수",
      resultPnlPct: -5.20,
      aiMistakeTag: "FOMO_BUY",
      aiFeedback: "⚠️ FOMO 감정적 매수 감지: 갭상승 시 지지선 형성 확인 전 진입 위험. 다음엔 눌림목 재확인 후 진입 권장."
    }
  ]);

  const [newLogTicker, setNewLogTicker] = useState("005930");
  const [newLogType, setNewLogType] = useState<"BUY" | "SELL">("BUY");
  const [newLogPrice, setNewLogPrice] = useState("78500");
  const [newLogQty, setNewLogQty] = useState("10");
  const [newLogReason, setNewLogReason] = useState("HBM3E 양산 승인 기사 직후 분할 매수");

  const handleAddJournalEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(newLogPrice) || 0;
    const qty = parseInt(newLogQty) || 0;

    const newEntry: TradeJournalEntry = {
      id: `j_${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      ticker: newLogTicker.toUpperCase(),
      type: newLogType,
      price,
      qty,
      reason: newLogReason,
      aiMistakeTag: newLogReason.includes("급등") || newLogReason.includes("기대감") ? "FOMO_BUY" : "PERFECT_EXEC",
      aiFeedback: "AI 분석: 입력된 매매 이유를 원칙 리포트에 반영했습니다. 손절가 준수 여부를 모니터링합니다."
    };

    setJournalEntries([newEntry, ...journalEntries]);
    addToast({
      type: "SUCCESS",
      title: "📝 매매 일지 기록 완료",
      message: `${newLogTicker} ${newLogType} 일지가 AI 피드백 루프에 추가되었습니다.`
    });
    setNewLogReason("");
  };

  // Copied State
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopyText = (text: string, title: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(title);
    addToast({
      type: "SUCCESS",
      title: "📋 클립보드 복사 완료",
      message: `${title} 리포트가 성공적으로 복사되었습니다.`
    });
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleExportMarkdown = (filename: string, content: string) => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: "text/markdown;charset=utf-8" });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    addToast({
      type: "SUCCESS",
      title: "💾 파일 마크다운 내보내기",
      message: `${filename} 내보내기가 완료되었습니다.`
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-3 sm:p-6 font-sans space-y-6">
      
      {/* HEADER BANNER & PROMPT #0 PROFILE BAR */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-cyan-950 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-black flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                CLAUDE AI STOCK ANALYSIS SUITE V4.0
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs font-mono font-bold">
                프롬프트 #0~#4 완전 통합 &amp; 꼼꼼한 차트 엔진
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-1.5">
              실전 계좌 수익률 향상 AI 프롬프트 분석 &amp; 의사결정 워크북
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              사용자 프로필 설정 ➔ 기업 해독 카드 ➔ 포트폴리오 비중 산출 ➔ 매매 피드백 루프 ➔ 실행 워크시트 + 정밀 캔들스틱 차트
            </p>
          </div>

          {/* Quick Target Ticker Selector */}
          <div className="flex items-center gap-2 bg-zinc-950 p-2 rounded-2xl border border-zinc-800 font-mono text-xs">
            <span className="text-zinc-400 pl-2">분석 종목:</span>
            <input
              type="text"
              value={targetTicker}
              placeholder="종목/티커/초성"
              onChange={(e) => setTargetTicker(e.target.value)}
              className="bg-zinc-900 text-white font-black px-3 py-1.5 rounded-xl border border-zinc-700 w-32 text-center focus:outline-none focus:border-cyan-400"
            />
            <button
              onClick={() => {
                const query = targetTicker.trim();
                const found = searchStocksFromIndex(query, 1)[0];
                if (found) {
                  setTargetTicker(found.symbol);
                  setTargetName(found.name);
                  setTargetMarket(found.market);
                  setTargetPrice(found.price);
                  setSelectedSymbol(found.symbol);
                  stockSyncService.emit({
                    symbol: found.symbol,
                    name: found.name,
                    price: found.price,
                    theme: `${found.name} 통합 분석 연동`
                  });
                  addToast({ type: "SUCCESS", title: "🎯 종목 매칭 완료", message: `${found.name}(${found.symbol}) 전 시스템 연동 완료` });
                } else {
                  const resolved = resolveStockName(query);
                  setTargetName(resolved);
                  setTargetPrice(100.00);
                  setSelectedSymbol(query);
                  stockSyncService.emit({
                    symbol: query,
                    name: resolved,
                    price: 100.00,
                    theme: `${resolved} 통합 분석 연동`
                  });
                  addToast({ type: "INFO", title: "🎯 분석 타겟 변경", message: `${resolved}(${targetTicker}) 전 시스템 연동 완료` });
                }
              }}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition cursor-pointer"
            >
              적용
            </button>
          </div>
        </div>

        {/* PROMPT #0: USER PROFILE & INVESTMENT CONSTRAINTS (Expanded Bar) */}
        <div className="bg-zinc-950/80 border border-zinc-800/80 p-4 rounded-2xl space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-black text-cyan-300">
                [프롬프트 #0] 내 개인 투자 프로필 &amp; 원칙 설정 (User Profile &amp; Rules)
              </span>
            </div>
            <button
              onClick={() => setIsProfileEditing(!isProfileEditing)}
              className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300 rounded-lg border border-zinc-700 flex items-center gap-1 transition cursor-pointer font-mono"
            >
              <Settings className="w-3 h-3 text-cyan-400" />
              <span>{isProfileEditing ? "설정 완료" : "원칙 수정하기"}</span>
            </button>
          </div>

          {isProfileEditing ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono pt-1">
              <div>
                <label className="text-zinc-400 block mb-1">목표 연 수익률 (%)</label>
                <input
                  type="number"
                  value={userProfile.targetReturnPct}
                  onChange={(e) => setUserProfile({ ...userProfile, targetReturnPct: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-zinc-900 text-white font-bold p-2 rounded-xl border border-zinc-700"
                />
              </div>
              <div>
                <label className="text-zinc-400 block mb-1">원칙 손절 한도 (%)</label>
                <input
                  type="number"
                  value={userProfile.stopLossLimitPct}
                  onChange={(e) => setUserProfile({ ...userProfile, stopLossLimitPct: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-zinc-900 text-rose-400 font-bold p-2 rounded-xl border border-zinc-700"
                />
              </div>
              <div>
                <label className="text-zinc-400 block mb-1">해외주식 세금 공제한도 (원)</label>
                <input
                  type="number"
                  value={userProfile.taxExemptionLimit}
                  onChange={(e) => setUserProfile({ ...userProfile, taxExemptionLimit: parseInt(e.target.value) || 0 })}
                  className="w-full bg-zinc-900 text-emerald-400 font-bold p-2 rounded-xl border border-zinc-700"
                />
              </div>
              <div>
                <label className="text-zinc-400 block mb-1">단일 종목 최대 비중 (%)</label>
                <input
                  type="number"
                  value={userProfile.maxSinglePositionPct}
                  onChange={(e) => setUserProfile({ ...userProfile, maxSinglePositionPct: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-zinc-900 text-cyan-300 font-bold p-2 rounded-xl border border-zinc-700"
                />
              </div>
              <div>
                <label className="text-zinc-400 block mb-1">상시 현금 보유 비율 (%)</label>
                <input
                  type="number"
                  value={userProfile.cashReservePct}
                  onChange={(e) => setUserProfile({ ...userProfile, cashReservePct: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-zinc-900 text-amber-300 font-bold p-2 rounded-xl border border-zinc-700"
                />
              </div>
              <div>
                <label className="text-zinc-400 block mb-1">투자 성향</label>
                <select
                  value={userProfile.riskTolerance}
                  onChange={(e) => setUserProfile({ ...userProfile, riskTolerance: e.target.value as any })}
                  className="w-full bg-zinc-900 text-white font-bold p-2 rounded-xl border border-zinc-700"
                >
                  <option value="CONSERVATIVE">보수적 (안정 배당/대형주)</option>
                  <option value="BALANCED">중립적 (성장+배당 균형)</option>
                  <option value="AGGRESSIVE">공격적 (추세추종 모멘텀)</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs font-mono">
              <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800">
                <span className="text-zinc-500 text-[10px] block">목표 연 수익률</span>
                <span className="text-emerald-400 font-black text-sm">+{userProfile.targetReturnPct}%</span>
              </div>
              <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800">
                <span className="text-zinc-500 text-[10px] block">원칙 손절 한도</span>
                <span className="text-rose-400 font-black text-sm">{userProfile.stopLossLimitPct}%</span>
              </div>
              <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800">
                <span className="text-zinc-500 text-[10px] block">해외 양도세 공제</span>
                <span className="text-cyan-300 font-bold text-xs">{(userProfile.taxExemptionLimit / 10000).toLocaleString()}만원</span>
              </div>
              <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800">
                <span className="text-zinc-500 text-[10px] block">단일종목 상한</span>
                <span className="text-amber-300 font-bold text-xs">최대 {userProfile.maxSinglePositionPct}%</span>
              </div>
              <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800">
                <span className="text-zinc-500 text-[10px] block">상시 현금 비중</span>
                <span className="text-purple-300 font-bold text-xs">{userProfile.cashReservePct}% 유지</span>
              </div>
              <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800">
                <span className="text-zinc-500 text-[10px] block">투자 성향</span>
                <span className="text-white font-bold text-xs">{userProfile.riskTolerance}</span>
              </div>
            </div>
          )}
        </div>

        {/* 5-MODULE SUITE NAVIGATION TABS */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
          {[
            { id: "DECODER", label: "프롬프트 #1: 기업 해독 카드", icon: Building2, folder: "/research" },
            { id: "DASHBOARD", label: "프롬프트 #2: 포트폴리오 비중", icon: LayoutDashboard, folder: "/dashboard" },
            { id: "DAILY_LOG", label: "프롬프트 #3: 매매 일지 피드백", icon: CalendarCheck, folder: "/daily" },
            { id: "EXEC_WORKSHEET", label: "프롬프트 #4: 실행 워크시트", icon: ClipboardList, folder: "/portfolio" },
            { id: "PATTERN_PROFIT", label: "자세한 차트 & 패턴 수익", icon: Target, folder: "/pattern_ai" },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSuiteTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSuiteTab(tab.id as any)}
                className={`p-3 rounded-2xl border transition cursor-pointer text-left flex flex-col justify-between ${
                  isActive
                    ? "bg-gradient-to-br from-cyan-950 to-zinc-900 border-cyan-500 text-white shadow-xl ring-1 ring-cyan-500/50"
                    : "bg-zinc-900/70 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-zinc-500"}`} />
                  <span className="text-[9.5px] font-mono text-zinc-500 px-1.5 py-0.5 bg-zinc-950 rounded">
                    {tab.folder}
                  </span>
                </div>
                <div className="text-xs font-black mt-2 truncate">{tab.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* MODULE 1: PROMPT #1 COMPANY DECODER (기업 해독 카드) */}
      {activeSuiteTab === "DECODER" && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-3 gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-black text-white">
                  [프롬프트 #1] {targetName} ({targetTicker}) 기업 해독 카드 (Company Decoder)
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyText(
                    `# [기업 해독 카드] ${targetName} (${targetTicker})\n- 핵심 촉매: AI H100/B200 독점 공급 및 CUDA 생태계\n- 밸류에이션: DCF 목표가 $145.00 (PER 38.2x)\n- 진입 타겟: $125.00 ~ $128.50`,
                    "기업 해독 카드"
                  )}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-zinc-700"
                >
                  <Copy className="w-3.5 h-3.5 text-cyan-400" /> 텍스트 복사
                </button>
                <button
                  onClick={() => handleExportMarkdown(
                    `2026-08-10_${targetTicker}_DECODER.md`,
                    `# [기업 해독 카드] ${targetName} (${targetTicker})\n\n## 밸류에이션 & 핵심 촉매\n- PER: 38.2x / DCF 적정주가: $145.00\n- 손절한도: ${userProfile.stopLossLimitPct}% 준수\n`
                  )}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> /research 마크다운 저장
                </button>
              </div>
            </div>

            {/* Header Summary Box */}
            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-2 font-mono text-xs">
              <div className="flex justify-between items-center text-cyan-300 font-bold border-b border-zinc-800/80 pb-2">
                <span>📌 한 줄 정의: "AI 데이터센터 가속기 및 AI 인프라 소프트웨어 88% 시장 독점 기업"</span>
                <span className="text-emerald-400">포트폴리오 상한: 최대 {userProfile.maxSinglePositionPct}% 내 유지</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                <div><span className="text-zinc-500">현재주가:</span> <strong className="text-white">${targetPrice}</strong></div>
                <div><span className="text-zinc-500">시가총액:</span> <strong className="text-white">$3.15조</strong></div>
                <div><span className="text-zinc-500">DCF 산출 목표가:</span> <strong className="text-emerald-400">$145.00 (+12.8%)</strong></div>
                <div><span className="text-zinc-500">원칙 손절가:</span> <strong className="text-rose-400">${(targetPrice * (1 + userProfile.stopLossLimitPct / 100)).toFixed(2)} ({userProfile.stopLossLimitPct}%)</strong></div>
              </div>
            </div>

            {/* 1. 2분 드릴 & 해자 분석 */}
            <div className="bg-zinc-950/80 p-4 rounded-2xl border border-zinc-800 space-y-2">
              <h3 className="text-xs font-black text-cyan-300 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-cyan-400" />
                ① 2분 드릴 (Non-Expert 수익 엔진 설명) &amp; 경제적 해자 (Moat)
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {targetTicker}는 글로벌 빅테크가 생성형 AI 모델을 학습하고 추론하는 데 필수적인 **AI GPU 및 소프트웨어 생태계**를 독점 판매하여 고마진 수익을 올립니다. 소프트웨어 독점 병렬 처리 플랫폼(CUDA) 덕분에 고객 전환 비용이 극도로 높아 강한 경제적 해자(Wide Moat)를 보유하고 있습니다.
              </p>
              <div className="bg-cyan-950/50 p-2.5 rounded-xl border border-cyan-800/80 text-xs font-mono font-bold text-cyan-300 flex justify-between">
                <span>💡 해자 등급: Wide Moat (전환비용 극상 + 네트워크 효과)</span>
                <span>영업이익률: 68.5%</span>
              </div>
            </div>

            {/* 2. 돈 버는 구조 & 밸류에이션 메트릭 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-zinc-950/80 p-4 rounded-2xl border border-zinc-800 space-y-3 text-xs">
                <h3 className="font-black text-cyan-300 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-cyan-400" />
                  ② 돈 버는 구조 (Cash Flow Cycle)
                </h3>
                <div className="space-y-2 font-mono text-[11px]">
                  <div className="p-2.5 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center justify-between">
                    <span>1. 모으기</span>
                    <span className="text-cyan-300 font-bold">전세계 LLM AI 서버 증설 수요 폭증</span>
                  </div>
                  <div className="p-2.5 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center justify-between">
                    <span>2. 현금화</span>
                    <span className="text-emerald-400 font-bold">H100/B200 GPU 칩 + CUDA 소프트웨어 마진 68%</span>
                  </div>
                  <div className="p-2.5 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center justify-between">
                    <span>3. 재투자</span>
                    <span className="text-purple-300 font-bold">차세대 칩 R&amp;D 및 글로벌 데이터센터 지분 투자</span>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-950/80 p-4 rounded-2xl border border-zinc-800 space-y-3 text-xs">
                <h3 className="font-black text-cyan-300 flex items-center gap-1.5">
                  <PieChart className="w-4 h-4 text-cyan-400" />
                  ③ 정밀 밸류에이션 지표 (Valuation Metrics)
                </h3>
                <div className="space-y-2 font-mono text-[11px]">
                  <div className="flex justify-between p-2 bg-zinc-900 rounded-xl">
                    <span className="text-zinc-400">PER (주가수익비율)</span>
                    <span className="text-white font-bold">38.2x (5년 평균 45.0x 대비 저평가)</span>
                  </div>
                  <div className="flex justify-between p-2 bg-zinc-900 rounded-xl">
                    <span className="text-zinc-400">PBR (주가순자산비율)</span>
                    <span className="text-white font-bold">22.4x</span>
                  </div>
                  <div className="flex justify-between p-2 bg-zinc-900 rounded-xl">
                    <span className="text-zinc-400">EV / EBITDA</span>
                    <span className="text-emerald-400 font-bold">28.5x (이익 창출력 우수)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Risks & Portfolio Action */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-rose-950/30 p-4 rounded-2xl border border-rose-900/50 space-y-2 text-xs">
                <h3 className="font-black text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  ④ 이 회사가 무너지는 시나리오 (Risks)
                </h3>
                <ul className="space-y-1.5 text-zinc-300 text-[11px] font-mono">
                  <li>• 빅테크 AI CapEx 설비투자 축소 (확률 20% / 영향도 HIGH)</li>
                  <li>• 대만 TSMC 위탁생산 지정학적 리스크 (확률 15% / CRITICAL)</li>
                  <li>• 빅테크 자체 AI ASIC 칩 대체 가속</li>
                </ul>
              </div>

              <div className="bg-emerald-950/30 p-4 rounded-2xl border border-emerald-900/50 space-y-2 text-xs">
                <h3 className="font-black text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ⑤ 내 포트폴리오 액션 가이드
                </h3>
                <div className="font-mono text-[11px] space-y-1">
                  <div><strong>판단:</strong> <span className="text-emerald-400 font-bold">분할 매수 (BUY ZONE)</span></div>
                  <div><strong>적정 진입가:</strong> $125.00 ~ $128.50 구간 1차 진입</div>
                  <div><strong>손절 대응:</strong> ${ (targetPrice * (1 + userProfile.stopLossLimitPct/100)).toFixed(2) } 이탈 시 즉시 위험 관리</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODULE 2: PROMPT #2 PORTFOLIO ALLOCATION WEIGHT DASHBOARD */}
      {activeSuiteTab === "DASHBOARD" && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <LayoutDashboard className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-black text-white">
                  [프롬프트 #2] 포트폴리오 비중 가중치 산출 대시보드 (Allocation Dashboard)
                </h2>
              </div>
              <span className="px-3 py-1 bg-cyan-950 text-cyan-300 border border-cyan-800 text-xs font-mono font-bold rounded-full">
                AI 확신도 + 변동성 가중 산출
              </span>
            </div>

            {/* Allocation Weight Calculator */}
            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-4">
              <h3 className="text-xs font-black text-white flex items-center gap-1.5">
                <PieChart className="w-4 h-4 text-emerald-400" />
                종목별 최적 포트폴리오 목표 비중 vs 현재 보유 비중
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 text-[11px]">
                      <th className="pb-2">종목명</th>
                      <th className="pb-2">AI 확신도 점수</th>
                      <th className="pb-2">목표 산출 비중</th>
                      <th className="pb-2">현재 실시간 비중</th>
                      <th className="pb-2">리밸런싱 상태</th>
                      <th className="pb-2">권장 액션</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    <tr>
                      <td className="py-2.5 font-bold text-white">NVDA (엔비디아)</td>
                      <td className="text-cyan-300 font-bold">92 / 100</td>
                      <td className="text-emerald-400 font-bold">20.0%</td>
                      <td>18.5%</td>
                      <td><span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 rounded font-bold">적정</span></td>
                      <td className="text-zinc-300 text-[11px]">+1.5% 추가 분할 매수 가능</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-bold text-white">삼성전자 (005930)</td>
                      <td className="text-cyan-300 font-bold">85 / 100</td>
                      <td className="text-emerald-400 font-bold">22.0%</td>
                      <td>22.0%</td>
                      <td><span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 rounded font-bold">완벽 균형</span></td>
                      <td className="text-zinc-300 text-[11px]">비중 유지 (HOLD)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-bold text-white">TSLA (테슬라)</td>
                      <td className="text-amber-400 font-bold">68 / 100</td>
                      <td className="text-emerald-400 font-bold">10.0%</td>
                      <td>14.5%</td>
                      <td><span className="px-2 py-0.5 bg-amber-950 text-amber-300 rounded font-bold">비중 초과</span></td>
                      <td className="text-amber-300 text-[11px]">-4.5% 축소 축격 매도 권장</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-bold text-zinc-400">안전 현금 자산</td>
                      <td className="text-zinc-500">-</td>
                      <td className="text-purple-300 font-bold">{userProfile.cashReservePct}% (목표)</td>
                      <td className="text-purple-300 font-bold">15.0%</td>
                      <td><span className="px-2 py-0.5 bg-purple-950 text-purple-300 rounded font-bold">안전 유휴</span></td>
                      <td className="text-zinc-400 text-[11px]">하락장 저가 매수용 대기</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Asset Allocation Bar */}
            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-2">
              <span className="text-xs font-mono text-zinc-400">포트폴리오 시각화 시뮬레이션:</span>
              <div className="h-4 w-full bg-zinc-900 rounded-full overflow-hidden flex font-mono text-[9px] font-black text-black">
                <div style={{ width: "22%" }} className="bg-emerald-400 flex items-center justify-center">삼성전자 22%</div>
                <div style={{ width: "18.5%" }} className="bg-cyan-400 flex items-center justify-center">NVDA 18.5%</div>
                <div style={{ width: "14.5%" }} className="bg-amber-400 flex items-center justify-center">TSLA 14.5%</div>
                <div style={{ width: "15%" }} className="bg-purple-400 flex items-center justify-center text-white">BTC 15%</div>
                <div style={{ width: "30%" }} className="bg-zinc-700 flex items-center justify-center text-white">현금/기타 30%</div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODULE 3: PROMPT #3 TRADING JOURNAL & AI FEEDBACK LOOP */}
      {activeSuiteTab === "DAILY_LOG" && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-3 gap-2">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-black text-white">
                  [프롬프트 #3] 주간/월간 매매 일지 &amp; AI 피드백 루프 (Trading Journal &amp; Feedback)
                </h2>
              </div>
              <button
                onClick={() => handleExportMarkdown(
                  "TRADING_JOURNAL.md",
                  `# 매매 일지 피드백 루프\n\n${journalEntries.map(j => `- [${j.date}] ${j.ticker} ${j.type} @ ${j.price} (${j.reason})`).join("\n")}`
                )}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> /daily 일지 저장
              </button>
            </div>

            {/* Form to Add New Trade Entry */}
            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-3">
              <h3 className="text-xs font-black text-white flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4 text-cyan-400" />
                새 매매 거래 기록 작성 (AI 피드백 즉시 진단)
              </h3>
              <form onSubmit={handleAddJournalEntry} className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs font-mono">
                <input
                  type="text"
                  placeholder="종목코드 (예: NVDA)"
                  value={newLogTicker}
                  onChange={(e) => setNewLogTicker(e.target.value)}
                  className="bg-zinc-900 text-white p-2 rounded-xl border border-zinc-700"
                  required
                />
                <select
                  value={newLogType}
                  onChange={(e) => setNewLogType(e.target.value as any)}
                  className="bg-zinc-900 text-white p-2 rounded-xl border border-zinc-700"
                >
                  <option value="BUY">매수 (BUY)</option>
                  <option value="SELL">매도 (SELL)</option>
                </select>
                <input
                  type="number"
                  placeholder="체결가"
                  value={newLogPrice}
                  onChange={(e) => setNewLogPrice(e.target.value)}
                  className="bg-zinc-900 text-white p-2 rounded-xl border border-zinc-700"
                  required
                />
                <input
                  type="number"
                  placeholder="수량"
                  value={newLogQty}
                  onChange={(e) => setNewLogQty(e.target.value)}
                  className="bg-zinc-900 text-white p-2 rounded-xl border border-zinc-700"
                  required
                />
                <button
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold p-2 rounded-xl transition cursor-pointer"
                >
                  + 일지 추가 및 AI 진단
                </button>
                <div className="sm:col-span-5">
                  <input
                    type="text"
                    placeholder="매매 판단 근거 (예: 15분봉 Bull Flag 돌파 및 손익비 2.5 확인 후 진입)"
                    value={newLogReason}
                    onChange={(e) => setNewLogReason(e.target.value)}
                    className="w-full bg-zinc-900 text-white p-2 rounded-xl border border-zinc-700"
                    required
                  />
                </div>
              </form>
            </div>

            {/* List of Journal Entries */}
            <div className="space-y-3">
              <h3 className="text-xs font-black text-zinc-400">기록된 매매 일지 &amp; AI 피드백 내역:</h3>
              {journalEntries.map((j) => (
                <div key={j.id} className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-2 font-mono text-xs">
                  <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 text-[10px]">{j.date}</span>
                      <span className="font-black text-white">{j.ticker}</span>
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${j.type === "BUY" ? "bg-emerald-950 text-emerald-400" : "bg-rose-950 text-rose-400"}`}>
                        {j.type}
                      </span>
                      <span className="text-zinc-400">@{j.price} x {j.qty}주</span>
                    </div>
                    {j.aiMistakeTag === "FOMO_BUY" ? (
                      <span className="px-2 py-0.5 bg-rose-950 text-rose-300 rounded font-bold text-[10px] flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        FOMO 추격매수 경고
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 rounded font-bold text-[10px] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        원칙 준수 매매
                      </span>
                    )}
                  </div>

                  <div className="text-zinc-300">
                    <strong>매매 이유:</strong> {j.reason}
                  </div>

                  <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800/80 text-cyan-300 text-[11px]">
                    {j.aiFeedback}
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* MODULE 4: PROMPT #4 REAL TRADING EXECUTION WORKSHEET */}
      {activeSuiteTab === "EXEC_WORKSHEET" && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-3 gap-2">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-black text-white">
                  [프롬프트 #4] 실전 주문 수량 &amp; 손절 매수 워크시트 (Execution Worksheet)
                </h2>
              </div>
              <button
                onClick={() => handleExportMarkdown(
                  "EXECUTION_WORKSHEET.md",
                  `# 실전 주문 수량 워크시트\n\n매수 target: ${targetTicker} @ $${targetPrice}\n원칙 손절가: $${(targetPrice * (1 + userProfile.stopLossLimitPct/100)).toFixed(2)}`
                )}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> /portfolio 워크시트 저장
              </button>
            </div>

            {/* Order Quantity Calculator Rule */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* STEP 1: 매도 (수량 고정 법칙) */}
              <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-3">
                <h3 className="text-xs font-black text-rose-300 flex items-center gap-1.5 border-b border-zinc-800 pb-2">
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                  STEP 1 — 매도 계획 (수량 고정 원칙)
                </h3>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between p-2 bg-zinc-900 rounded-xl">
                    <span className="text-zinc-400">익절 목표가 도달 시</span>
                    <span className="text-rose-400 font-bold">10주 고정 매도 (부분 익절)</span>
                  </div>
                  <div className="flex justify-between p-2 bg-zinc-900 rounded-xl">
                    <span className="text-zinc-400">손절가 이탈 시 ({userProfile.stopLossLimitPct}%)</span>
                    <span className="text-rose-400 font-bold">전량 손절 즉시 실행</span>
                  </div>
                </div>
              </div>

              {/* STEP 2: 매수 (금액 고정 법칙) */}
              <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-3">
                <h3 className="text-xs font-black text-emerald-300 flex items-center gap-1.5 border-b border-zinc-800 pb-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  STEP 2 — 매수 계산기 (금액 고정 법칙)
                </h3>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between p-2 bg-zinc-900 rounded-xl">
                    <span className="text-zinc-400">총 고정 투입 배정 금액</span>
                    <span className="text-emerald-400 font-bold">$2,000.00 (약 ₩2,680,000)</span>
                  </div>
                  <div className="flex justify-between p-2 bg-zinc-900 rounded-xl">
                    <span className="text-zinc-400">현재가 기준 환산 주문 수량</span>
                    <span className="text-cyan-300 font-bold">{Math.floor(2000 / targetPrice)}주 매수 주문</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tax Exemption Status Checklist */}
            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-2 text-xs font-mono">
              <h3 className="font-black text-purple-300">해외주식 세금 한도 관리 워크시트:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                <div>• 연간 기본 공제: <strong>₩{(userProfile.taxExemptionLimit).toLocaleString()}</strong></div>
                <div>• 현재 실현 수익: <strong>₩2,100,000</strong></div>
                <div>• 남은 절세 실현 가능 여유분: <strong className="text-emerald-400">₩{(userProfile.taxExemptionLimit - 2100000).toLocaleString()}</strong></div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODULE 5: DETAILED CHART & GRAPH PATTERN PROFIT ENGINE */}
      {activeSuiteTab === "PATTERN_PROFIT" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Multi-Factor Quant Setup Quality Matrix Engine */}
          <QuantSetupQualityMatrixEngine
            targetSymbol={targetTicker}
            onSelectStock={(st) => {
              setTargetTicker(st.symbol);
              setTargetName(st.name);
              setTargetMarket(st.market as any);
              setTargetPrice(st.price);
            }}
          />

          {/* Real-time Bullish Patterns Lifecycle Engine */}
          <BullishPatternsLifecycleEngine />

          {/* Real-time Bearish Patterns Intelligence Engine */}
          <BearishPatternsLifecycleEngine />

          {/* Detailed Interactive Chart Component */}
          <MeticulousDetailedChart
            ticker={targetTicker}
            name={targetName}
            currentPrice={targetPrice}
          />

          {/* Pattern Matrix Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-black text-white">
                  그래프 패턴 포지션 수익 진입 계산기 (Pattern &amp; Profit Matrix)
                </h2>
              </div>
              <span className="px-3 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-mono font-bold rounded-full">
                손익비 R:R 1 : 2.74 (수익성 우수)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-3 font-mono">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                  <span className="text-xs font-black text-cyan-300 flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-400" />
                    감지된 포메이션 패턴: BULL FLAG (상승 깃발형)
                  </span>
                  <span className="px-2 py-0.5 bg-cyan-950 text-cyan-300 text-[10px] rounded font-bold">
                    완성도: 88/100
                  </span>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed">
                  전고점 돌파 후 거래량이 감소하며 눌림목 형성. 깃발 상단 돌파 시 2차 상승 파동이 개시되는 강력한 추세 지속 패턴입니다.
                </p>
              </div>

              <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-3 font-mono text-xs">
                <h3 className="font-black text-white flex items-center gap-1.5 border-b border-zinc-800 pb-2">
                  <Crosshair className="w-4 h-4 text-emerald-400" />
                  포지션 매매 진입 / 익절 / 손절 가이드 (Profit Matrix)
                </h3>

                <div className="space-y-2 text-[11px]">
                  <div className="flex justify-between p-2 bg-zinc-900 rounded-xl">
                    <span className="text-zinc-400">🎯 AI 진입 타겟</span>
                    <span className="text-cyan-300 font-bold">${targetPrice} (현재 진입 적기)</span>
                  </div>

                  <div className="flex justify-between p-2 bg-emerald-950/40 rounded-xl border border-emerald-800/80">
                    <span className="text-emerald-300">🟢 1차 목표가 (TP1 - 30% 익절)</span>
                    <span className="text-emerald-400 font-bold">${(targetPrice * 1.05).toFixed(2)} (+5.0%)</span>
                  </div>

                  <div className="flex justify-between p-2 bg-rose-950/40 rounded-xl border border-rose-800/80">
                    <span className="text-rose-300">🔴 손절선 (Stop Loss - {userProfile.stopLossLimitPct}%)</span>
                    <span className="text-rose-400 font-bold">${(targetPrice * (1 + userProfile.stopLossLimitPct/100)).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
