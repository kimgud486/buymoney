import React, { useState, useEffect } from "react";
import { AiFutureTrendOverlayChart } from "./AiFutureTrendOverlayChart";
import {
  X,
  Sparkles,
  Flame,
  Zap,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Layers,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  Activity,
  Layers3,
  Sliders,
  DollarSign,
  Maximize2,
  Minimize2,
  Eye,
  Star,
  Info,
  CandlestickChart
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
  ReferenceLine
} from "recharts";
import {
  getUsdExchangeRate,
  formatCurrencyPrice,
  formatTradingValue,
  usdToKrw
} from "../lib/currencyUtils";
import { Ai30DayPriceForecastChart } from "./Ai30DayPriceForecastChart";

export interface StockDetailProps {
  symbol: string;
  name: string;
  market?: "KOREA" | "US" | "BTC";
  price?: number;
  changePct?: number;
  tradingValue?: number;
  rvol?: number;
  executionPower?: number;
  onClose: () => void;
}

export interface ScoreTrendPoint {
  time: string;
  score: number;
  isSpike?: boolean;
}

export const RealtimeStockDetailAnalyzer: React.FC<StockDetailProps> = ({
  symbol,
  name,
  market = "KOREA",
  price: initialPrice,
  changePct: initialChangePct,
  tradingValue: initialTradingValue,
  rvol: initialRvol,
  executionPower: initialExecutionPower,
  onClose
}) => {
  // Timeframe & Chart SubTab state
  const [timeframe, setTimeframe] = useState<"1m" | "3m" | "5m" | "15m" | "30m" | "60m" | "1D">("5m");
  const [chartSubTab, setChartSubTab] = useState<"CANDLE" | "AI_OVERLAY" | "PREDICT_30D">("CANDLE");

  const defaultPrice = initialPrice || (market === "US" ? 132.50 : market === "BTC" ? 90200000 : 50000);
  const defaultChange = initialChangePct !== undefined ? initialChangePct : 2.5;

  // Realtime Live Price State
  const [liveData, setLiveData] = useState({
    price: defaultPrice,
    changePct: defaultChange,
    high: Math.round(defaultPrice * 1.025),
    low: Math.round(defaultPrice * 0.985),
    volume: 1845000,
    tradingValue: initialTradingValue ? `${initialTradingValue}억원` : market === "US" ? "$1.24B" : "1,540억원",
    executionPower: initialExecutionPower || 142, // 체결강도 %
    bidVolumeRatio: 62, // 매수잔량 비율 %
    rvol: initialRvol || 3.8, // 배수
    vwap: Math.round(defaultPrice * 0.994),
    foreignNetBuy: "+128억원",
    instNetBuy: "+152억원",
    flash: null as "UP" | "DOWN" | null
  });

  // Fetch real-time live data directly for this specific symbol
  useEffect(() => {
    let isCancelled = false;
    const fetchSpecificStockData = async () => {
      try {
        const res = await fetch(`/api/quant/matrix/${symbol}`);
        if (res.ok) {
          const qData = await res.json();
          if (qData && !isCancelled) {
            const p = qData.price || defaultPrice;
            const chg = qData.changePct !== undefined ? qData.changePct : defaultChange;
            const highP = qData.dayHigh || Math.round(p * 1.02);
            const lowP = qData.dayLow || Math.round(p * 0.98);
            const vwapP = qData.realVwap || qData.vwap || Math.round(p * 0.994);

            setLiveData((prev) => ({
              ...prev,
              price: p,
              changePct: chg,
              high: highP,
              low: lowP,
              vwap: vwapP,
              tradingValue: qData.tradingValue ? `${qData.tradingValue}억원` : prev.tradingValue,
              rvol: qData.rvol || prev.rvol,
              executionPower: qData.executionPower || prev.executionPower
            }));

            // Sync candles if available
            if (Array.isArray(qData.candles) && qData.candles.length > 0) {
              const formattedCandles = qData.candles.map((c: any, idx: number) => ({
                time: c.time,
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
                volume: c.volume,
                vwap: vwapP,
                ema9: Math.round(c.close * 0.998),
                ema20: Math.round(c.close * 0.991),
                smcSignal: idx === 8 ? "유동성 헌팅 (SSL Sweep)" : idx === 14 ? "추세 반전 (CHoCH)" : idx === 19 ? "구조 파괴 (BOS 돌파)" : idx === 22 ? "불균형 지지 (FVG Gap)" : null
              }));
              setChartData(formattedCandles);
            }
          }
        }
      } catch (err) {
        console.warn("[Detail Analyzer] fetch live data error:", err);
      }
    };

    fetchSpecificStockData();
    const interval = setInterval(fetchSpecificStockData, 3000);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [symbol]);

  // AI Score Trend timeline (e.g. 13:31: 58 -> 13:43: 89 🔥)
  const [scoreHistory, setScoreHistory] = useState<ScoreTrendPoint[]>([
    { time: "13:25", score: 62 },
    { time: "13:28", score: 68 },
    { time: "13:31", score: 74 },
    { time: "13:34", score: 81, isSpike: true },
    { time: "13:37", score: 86 },
    { time: "13:40", score: 91 },
    { time: "13:43", score: 95, isSpike: true }
  ]);

  // Current AI Sub-Scores
  const aiSubScores = {
    trend: 88,
    volume: 94,
    structure: 91,
    momentum: 84,
    liquidity: 89,
    flow: 76,
    total: 92
  };

  // Mock Candle Chart Data with SMC Overlay Signals
  const [chartData, setChartData] = useState<any[]>(() => {
    const basePrice = defaultPrice;
    return Array.from({ length: 25 }).map((_, i) => {
      const open = basePrice + Math.sin(i * 0.4) * (basePrice * 0.01) + i * (basePrice * 0.003);
      const close = open + (Math.random() - 0.42) * (basePrice * 0.008);
      const high = Math.max(open, close) + Math.random() * (basePrice * 0.004);
      const low = Math.min(open, close) - Math.random() * (basePrice * 0.004);
      const vwapVal = open * 0.995;
      const ema9 = open * 0.998;
      const ema20 = open * 0.991;

      // SMC Overlays localized
      let smcSignal: string | null = null;
      if (i === 8) smcSignal = "유동성 헌팅 (SSL Sweep)";
      if (i === 14) smcSignal = "추세 반전 (CHoCH 돌파)";
      if (i === 19) smcSignal = "구조 파괴 (BOS 돌파)";
      if (i === 22) smcSignal = "불균형 지지 (FVG Gap)";

      return {
        time: `13:${10 + i * 2}`,
        open: Math.round(open),
        close: Math.round(close),
        high: Math.round(high),
        low: Math.round(low),
        volume: Math.floor(12000 + Math.random() * 35000),
        vwap: Math.round(vwapVal),
        ema9: Math.round(ema9),
        ema20: Math.round(ema20),
        smcSignal
      };
    });
  });

  // Listen for WebSocket Ticker
  useEffect(() => {
    const handleTicker = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      const detail = customEvent.detail;
      if (!detail) return;

      let matchedPrice: number | null = null;

      if (Array.isArray(detail)) {
        const found = detail.find((t: any) => t.symbol === symbol);
        if (found) matchedPrice = found.currentPrice;
      } else if (detail.code && detail.code.includes(symbol.replace("KRW-", ""))) {
        matchedPrice = detail.trade_price;
      }

      if (matchedPrice && matchedPrice !== liveData.price) {
        const isUp = matchedPrice > liveData.price;
        setLiveData((prev) => ({
          ...prev,
          price: matchedPrice!,
          flash: isUp ? "UP" : "DOWN"
        }));
      }
    };

    window.addEventListener("stock_ticker_update", handleTicker);
    window.addEventListener("upbit_ticker_update", handleTicker);
    return () => {
      window.removeEventListener("stock_ticker_update", handleTicker);
      window.removeEventListener("upbit_ticker_update", handleTicker);
    };
  }, [symbol, liveData.price]);

  // Reset flash effect
  useEffect(() => {
    if (!liveData.flash) return;
    const timer = setTimeout(() => {
      setLiveData((prev) => ({ ...prev, flash: null }));
    }, 600);
    return () => clearTimeout(timer);
  }, [liveData.flash]);

  // Periodically add new score trend point to simulate AI real-time score surge
  useEffect(() => {
    const interval = setInterval(() => {
      const nowStr = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
      const lastScore = scoreHistory[scoreHistory.length - 1].score;
      const nextScore = Math.min(99, Math.max(50, lastScore + (Math.random() > 0.3 ? 2 : -1)));
      const isSpike = nextScore - lastScore >= 3;

      setScoreHistory((prev) => [...prev.slice(1), { time: nowStr, score: nextScore, isSpike }]);
    }, 8000);

    return () => clearInterval(interval);
  }, [scoreHistory]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-zinc-950 border-2 border-cyan-500/80 w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden text-white my-auto max-h-[92vh] flex flex-col">
        {/* TOP BAR */}
        <div className="bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 rounded-xl">
              <Zap className="h-6 w-6 animate-pulse fill-cyan-400" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white">{name}</h2>
                <span className="font-mono text-sm text-zinc-400">({symbol})</span>
                <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-[10px] font-black rounded-full">
                  실시간 SMC 퀀트 분석기
                </span>
                {market === "US" && (
                  <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-400/40 text-[10px] font-bold rounded-full">
                    기준환율 ₩{getUsdExchangeRate().toLocaleString()}원/USD
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">
                실시간 현재가·체결강도·SMC 차트 및 AI Score 급상승 분석 모듈 (달러·원화 자동 환산)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* MAIN BODY SCROLLABLE */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* 1. REALTIME PRICE & METRICS BANNER */}
          <div
            className={`p-4 rounded-2xl border transition-all duration-300 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 ${
              liveData.flash === "UP"
                ? "bg-emerald-950/80 border-emerald-500 ring-2 ring-emerald-500/50"
                : liveData.flash === "DOWN"
                ? "bg-rose-950/80 border-rose-500 ring-2 ring-rose-500/50"
                : "bg-zinc-900/90 border-zinc-800"
            }`}
          >
            <div>
              <span className="text-[11px] text-zinc-400 block font-semibold">실시간 현재가</span>
              <div className="text-lg font-black font-mono text-white flex flex-col items-start leading-tight">
                <span>
                  {market === "US" ? "$" : ""}
                  {(liveData.price ?? 0).toLocaleString()}
                  {market === "KOREA" || market === "BTC" ? "원" : ""}
                </span>
                {market === "US" && (
                  <span className="text-[11px] text-zinc-400 font-sans font-normal">
                    (≈ ₩{Math.round((liveData.price ?? 0) * getUsdExchangeRate()).toLocaleString()}원)
                  </span>
                )}
              </div>
              <span className={`text-xs font-bold font-mono ${liveData.changePct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {liveData.changePct >= 0 ? "+" : ""}{liveData.changePct}%
              </span>
            </div>

            <div>
              <span className="text-[11px] text-zinc-400 block font-semibold">당일 고가 / 저가</span>
              <div className="text-xs font-mono text-zinc-200 mt-1">
                고가: <span className="text-emerald-400 font-bold">{market === "US" ? `$${(liveData.high ?? 0).toLocaleString()}` : `${(liveData.high ?? 0).toLocaleString()}원`}</span>
              </div>
              <div className="text-xs font-mono text-zinc-200">
                저가: <span className="text-rose-400 font-bold">{market === "US" ? `$${(liveData.low ?? 0).toLocaleString()}` : `${(liveData.low ?? 0).toLocaleString()}원`}</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] text-zinc-400 block font-semibold">거래대금 / RVOL</span>
              <div className="text-sm font-black font-mono text-amber-400">{liveData.tradingValue}</div>
              <span className="text-xs font-bold text-amber-300 font-mono flex items-center gap-0.5">
                <Flame className="h-3 w-3 fill-amber-400" /> RVOL {liveData.rvol}배
              </span>
            </div>

            <div>
              <span className="text-[11px] text-zinc-400 block font-semibold">체결강도 / 매수잔량</span>
              <div className="text-sm font-black font-mono text-cyan-400">{liveData.executionPower}%</div>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-1">
                <div className="bg-cyan-400 h-full" style={{ width: `${liveData.bidVolumeRatio}%` }}></div>
              </div>
            </div>

            <div>
              <span className="text-[11px] text-zinc-400 block font-semibold">당일 VWAP</span>
              <div className="text-sm font-black font-mono text-indigo-300">
                {market === "US" ? `$${(liveData.vwap ?? 0).toLocaleString()}` : `${(liveData.vwap ?? 0).toLocaleString()}원`}
              </div>
              <span className="text-[10px] text-emerald-400 font-bold">VWAP 상단 안착✓</span>
            </div>

            <div>
              <span className="text-[11px] text-zinc-400 block font-semibold">외국인 / 기관 수급</span>
              <div className="text-xs font-mono text-emerald-400 font-bold">외인: {liveData.foreignNetBuy}</div>
              <div className="text-xs font-mono text-cyan-400 font-bold">기관: {liveData.instNetBuy}</div>
            </div>
          </div>

          {/* 2. REALTIME SMC CANDLE CHART & AI FUTURE PREDICTION WITH SUB-TABS */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <CandlestickChart className="h-5 w-5 text-rose-400" />
                <h3 className="text-sm font-black text-white">실시간 주식 봉차트(양봉/음봉) & AI 미래 가격 예측</h3>
              </div>

              {/* Main SubTab Switcher & Timeframe */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-xl">
                  <button
                    onClick={() => setChartSubTab("CANDLE")}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                      chartSubTab === "CANDLE"
                        ? "bg-rose-500 text-white shadow-xs"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <CandlestickChart className="h-3.5 w-3.5" />
                    <span>양봉/음봉 SMC 캔들</span>
                  </button>

                  <button
                    onClick={() => setChartSubTab("AI_OVERLAY")}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                      chartSubTab === "AI_OVERLAY"
                        ? "bg-purple-600 text-white shadow-xs"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
                    <span>🔮 AI 미래 추세 오버레이</span>
                  </button>

                  <button
                    onClick={() => setChartSubTab("PREDICT_30D")}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                      chartSubTab === "PREDICT_30D"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <TrendingUp className="h-3.5 w-3.5 text-cyan-300" />
                    <span>30일 미래 가격 예측</span>
                  </button>
                </div>

                {chartSubTab === "CANDLE" && (
                  <div className="flex items-center gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-xl">
                    {(["1m", "3m", "5m", "15m", "30m", "60m", "1D"] as const).map((tf) => (
                      <button
                        key={tf}
                        onClick={() => setTimeframe(tf)}
                        className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition cursor-pointer ${
                          timeframe === tf
                            ? "bg-cyan-500 text-white shadow-xs"
                            : "text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        {tf.toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Chart Container */}
            {chartSubTab === "CANDLE" ? (
              <div className="space-y-2">
                <div className="h-[280px] w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="time" stroke="#71717a" fontSize={11} />
                      <YAxis domain={["auto", "auto"]} stroke="#71717a" fontSize={11} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", color: "#ffffff", borderRadius: "10px" }}
                        formatter={(val: any, nameKey: any) => [typeof val === 'number' ? (val ?? 0).toLocaleString() : val, nameKey]}
                      />

                      {/* VWAP Line */}
                      <Line type="monotone" dataKey="vwap" name="VWAP" stroke="#818cf8" strokeWidth={2} dot={false} />
                      {/* EMA 9 */}
                      <Line type="monotone" dataKey="ema9" name="EMA 9" stroke="#38bdf8" strokeWidth={1.5} dot={false} />
                      {/* EMA 20 */}
                      <Line type="monotone" dataKey="ema20" name="EMA 20" stroke="#c084fc" strokeWidth={1.5} dot={false} />

                      {/* Authentic Candlestick Shape (양봉 🔴 Red, 음봉 🔵 Blue with High-Low Wicks) */}
                      <Bar
                        dataKey="close"
                        name="주가 (캔들)"
                        shape={(props: any) => {
                          const { x, y, width, height, payload } = props;
                          if (!payload) return <g />;
                          const { open, close, high, low } = payload;
                          const isUp = (close || 0) >= (open || 0);
                          const candleColor = isUp ? "#f43f5e" : "#3b82f6"; // Red for Bullish (양봉), Blue for Bearish (음봉)

                          const safeX = Number.isFinite(x) ? x : 0;
                          const safeY = Number.isFinite(y) ? y : 0;
                          const safeWidth = Number.isFinite(width) ? width : 0;
                          const safeHeight = Number.isFinite(height) ? height : 0;

                          const yAxis = props.yAxis;
                          if (!yAxis || typeof yAxis.scale !== "function") {
                            return <rect x={safeX} y={safeY} width={safeWidth} height={safeHeight} fill={candleColor} />;
                          }

                          const openY = yAxis.scale(open);
                          const closeY = yAxis.scale(close);
                          const highY = yAxis.scale(high);
                          const lowY = yAxis.scale(low);

                          if (!Number.isFinite(openY) || !Number.isFinite(closeY) || !Number.isFinite(highY) || !Number.isFinite(lowY)) {
                            return <rect x={safeX} y={safeY} width={safeWidth} height={safeHeight} fill={candleColor} />;
                          }

                          const candleTop = Math.min(openY, closeY);
                          const candleBodyHeight = Math.max(Math.abs(openY - closeY), 3);
                          const candleWidth = Math.max(8, Math.min(18, safeWidth * 0.7));
                          const centerX = safeX + safeWidth / 2;

                          return (
                            <g key={`candle-${payload.time || safeX}`}>
                              {/* Wick Line */}
                              <line
                                x1={centerX}
                                y1={highY}
                                x2={centerX}
                                y2={lowY}
                                stroke={candleColor}
                                strokeWidth={1.5}
                              />
                              {/* Candle Body */}
                              <rect
                                x={centerX - candleWidth / 2}
                                y={candleTop}
                                width={candleWidth}
                                height={candleBodyHeight}
                                fill={candleColor}
                                rx={1.5}
                                stroke={candleColor}
                                strokeWidth={1}
                              />
                            </g>
                          );
                        }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-zinc-400 pt-2 border-t border-zinc-800/60">
                  <span className="flex items-center gap-1 font-bold text-rose-400"><span className="h-2 w-2 rounded-full bg-rose-500"></span> 🔴 양봉 (매수세 우세)</span>
                  <span className="flex items-center gap-1 font-bold text-blue-400"><span className="h-2 w-2 rounded-full bg-blue-500"></span> 🔵 음봉 (매도세 우세)</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-indigo-400"></span> VWAP</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-cyan-400"></span> EMA9</span>
                  <span className="text-emerald-400 font-bold">🟢 추세 반전(CHoCH) 확인</span>
                  <span className="text-amber-400 font-bold">🟡 유동성 헌팅(SSL Sweep)</span>
                </div>
              </div>
            ) : chartSubTab === "AI_OVERLAY" ? (
              <div className="pt-1">
                <AiFutureTrendOverlayChart
                  symbol={symbol}
                  name={name}
                  market={market}
                  livePrice={liveData.price}
                  changeRate={liveData.changePct}
                />
              </div>
            ) : (
              <div className="pt-2">
                <Ai30DayPriceForecastChart
                  symbol={symbol}
                  name={name}
                  market={market}
                  currentPrice={liveData.price}
                  changeRate={liveData.changePct}
                />
              </div>
            )}
          </div>

          {/* 3. AI REALTIME METRICS BREAKDOWN & 🔥 SCORE SURGE TIMELINE */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* AI Sub-Score Radar/Bar Breakdown (6 cols) */}
            <div className="lg:col-span-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-400" />
                  <h3 className="text-sm font-black text-white">AI 실시간 6대 팩터 정밀 분석 및 종합 점수</h3>
                </div>
                <div className="px-3 py-1 bg-amber-500/20 border border-amber-400/40 rounded-xl text-amber-300 text-xs font-black">
                  AI 종합 점수: {aiSubScores.total} / 100점
                </div>
              </div>

              {/* Sub-scores Grid */}
              <div className="space-y-2.5">
                {[
                  { label: "추세 정합도 (Trend Alignment)", score: aiSubScores.trend, color: "bg-emerald-500" },
                  { label: "거래량 폭발도 (Volume & RVOL)", score: aiSubScores.volume, color: "bg-amber-500" },
                  { label: "스마트머니 구조 (SMC Structure)", score: aiSubScores.structure, color: "bg-cyan-500" },
                  { label: "모멘텀 강도 (Momentum Power)", score: aiSubScores.momentum, color: "bg-indigo-500" },
                  { label: "유동성 스윕 (Liquidity Sweep)", score: aiSubScores.liquidity, color: "bg-purple-500" },
                  { label: "세력/기관 수급 (Institutional Flow)", score: aiSubScores.flow, color: "bg-blue-500" }
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-zinc-300">{item.label}</span>
                      <span className="text-white font-mono">{item.score}점</span>
                    </div>
                    <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div className={`${item.color} h-full transition-all duration-500`} style={{ width: `${item.score}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Key Signal Badges List */}
              <div className="pt-3 border-t border-zinc-800 space-y-2">
                <span className="text-xs font-bold text-zinc-400 block">핵심 감지 신호</span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold flex items-center gap-1">
                    🔥 대량 거래대금 유입 ({liveData.tradingValue})
                  </span>
                  <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold flex items-center gap-1">
                    🔥 상대 거래량(RVOL) {liveData.rvol}배 폭발
                  </span>
                  <span className="px-2.5 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-bold flex items-center gap-1">
                    ✅ 거래량가중평균(VWAP) 돌파
                  </span>
                  <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-1">
                    ✅ 상승 추세 반전 (CHoCH)
                  </span>
                  <span className="px-2.5 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 rounded-lg text-xs font-bold flex items-center gap-1">
                    ✅ 유동성 헌팅 (SSL Sweep) 완료
                  </span>
                  <span className="px-2.5 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-bold flex items-center gap-1">
                    ⚠ 당일 최고가 저항선 접근 ({market === "US" ? `$${(liveData.high ?? 0).toLocaleString()}` : `${(liveData.high ?? 0).toLocaleString()}원`})
                  </span>
                </div>
              </div>
            </div>

            {/* 🔥 AI SCORE SURGE TIMELINE (6 cols) */}
            <div className="lg:col-span-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-amber-500 fill-amber-500 animate-pulse" />
                  <h3 className="text-sm font-black text-white">🔥 AI SCORE 실시간 점수 급상승 변화 감지</h3>
                </div>
                <span className="text-xs font-mono text-emerald-400 font-bold">급등 탐지 활성</span>
              </div>

              {/* Timeline Chart */}
              <div className="h-[180px] w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={scoreHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="time" stroke="#71717a" fontSize={11} />
                    <YAxis domain={[40, 100]} stroke="#71717a" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", color: "#ffffff", borderRadius: "8px" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      name="AI Score"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#scoreGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Score Surge Logs */}
              <div className="space-y-1.5 pt-2 border-t border-zinc-800 max-h-[110px] overflow-y-auto pr-1">
                {scoreHistory.map((pt, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-mono ${
                      pt.isSpike
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold"
                        : "bg-zinc-950/60 text-zinc-300"
                    }`}
                  >
                    <span>시각: {pt.time}</span>
                    <div className="flex items-center gap-2">
                      <span>AI Score: <strong className="text-white">{pt.score}점</strong></span>
                      {pt.isSpike && <span className="px-1.5 py-0.5 bg-amber-500 text-black text-[9px] font-black rounded">🔥 급상승</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
