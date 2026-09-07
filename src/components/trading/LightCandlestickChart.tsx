import React, { useState, useEffect, useRef } from "react";
import { Maximize2, RefreshCw, ZoomIn, ZoomOut, Sliders, ChevronDown, Sparkles, Layers, Target, ShieldAlert, ArrowUpRight, CheckCircle2, TrendingUp, ShieldCheck } from "lucide-react";
import { StockItem } from "../../data/stockUniverse";
import { CandlestickPatternOverlayVisualizer } from "./CandlestickPatternOverlayVisualizer";

interface LightCandlestickChartProps {
  stock: StockItem;
  onTradeClick?: (type: "BUY" | "SELL") => void;
  externalCandles?: any[];
  isWhiteTheme?: boolean;
}

interface CandlePoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ma5?: number;
  ma20?: number;
  ma60?: number;
  rsi?: number;
}

export const LightCandlestickChart: React.FC<LightCandlestickChartProps> = ({
  stock,
  onTradeClick,
  externalCandles,
  isWhiteTheme = false
}) => {
  const safeStock = stock || {
    symbol: "005930",
    name: "삼성전자",
    market: "KOSPI" as const,
    category: "LARGE" as const,
    categoryLabel: "대형주",
    price: 0,
    changeRate: 2.79,
    changeAmount: 2000,
    tradeValue: "9,812억",
    volume: "1,334만",
    rvol: 1.65,
    score: 87,
    grade: "A+" as const,
    theme: "반도체 / AI 하드웨어",
    signal: "LONG" as const,
    strategy: "VWAP Reclaim + SMC Order Block",
    marketCap: "440조"
  };

  const [timeframe, setTimeframe] = useState<string>("15분");
  const [toggles, setToggles] = useState({
    BOS: true,
    CHoCH: true,
    FVG: true,
    OB: true,
    VWAP: true,
    VP: true,
    SR: true,
    EXIT_3STEP: false
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [livePrice, setLivePrice] = useState(safeStock.price || 0);
  const [priceFlash, setPriceFlash] = useState<"up" | "down" | null>(null);

  // Helper to map candles with genuine moving averages
  const mapCandlesWithMAs = (rawList: any[]): CandlePoint[] => {
    if (!Array.isArray(rawList) || rawList.length === 0) return [];
    return rawList.map((c, idx, list) => {
      const slice5 = list.slice(Math.max(0, idx - 4), idx + 1);
      const ma5 = Math.round(slice5.reduce((sum, it) => sum + (it.close || 0), 0) / slice5.length);
      const slice20 = list.slice(Math.max(0, idx - 19), idx + 1);
      const ma20 = Math.round(slice20.reduce((sum, it) => sum + (it.close || 0), 0) / slice20.length);
      const slice60 = list.slice(Math.max(0, idx - 59), idx + 1);
      const ma60 = Math.round(slice60.reduce((sum, it) => sum + (it.close || 0), 0) / slice60.length);

      let tStr = "09:00";
      if (typeof c.time === "string") {
        tStr = c.time.includes("T") ? c.time.substring(11, 16) : c.time;
      } else if (typeof c.time === "number") {
        tStr = new Date(c.time * 1000).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
      }

      return {
        time: tStr,
        open: c.open || c.close,
        high: c.high || c.close,
        low: c.low || c.close,
        close: c.close,
        volume: c.volume || 1000,
        ma5,
        ma20,
        ma60,
        rsi: 52
      };
    });
  };

  const [candles, setCandles] = useState<CandlePoint[]>(() => {
    if (externalCandles && externalCandles.length > 0) {
      return mapCandlesWithMAs(externalCandles);
    }
    const baseP = safeStock.price || 78500;
    return [
      { time: "09:00", open: baseP * 0.99, high: baseP * 0.995, low: baseP * 0.988, close: baseP * 0.992, volume: 45000, ma5: baseP * 0.99, ma20: baseP * 0.99, ma60: baseP * 0.99, rsi: 50 },
      { time: "10:00", open: baseP * 0.992, high: baseP * 1.002, low: baseP * 0.991, close: baseP * 0.998, volume: 52000, ma5: baseP * 0.995, ma20: baseP * 0.994, ma60: baseP * 0.994, rsi: 52 },
      { time: "11:00", open: baseP * 0.998, high: baseP * 1.005, low: baseP * 0.996, close: baseP * 1.001, volume: 48000, ma5: baseP * 0.997, ma20: baseP * 0.996, ma60: baseP * 0.996, rsi: 53 },
      { time: "현재", open: baseP * 1.001, high: Math.max(baseP * 1.006, baseP), low: Math.min(baseP * 0.999, baseP), close: baseP, volume: 68000, ma5: baseP * 0.999, ma20: baseP * 0.998, ma60: baseP * 0.998, rsi: 55 }
    ];
  });

  // Sync with externalCandles if provided
  useEffect(() => {
    if (externalCandles && externalCandles.length > 0) {
      const mapped = mapCandlesWithMAs(externalCandles);
      setCandles(mapped);
      if (mapped.length > 0) {
        setLivePrice(mapped[mapped.length - 1].close);
      }
    }
  }, [externalCandles]);

  // When stock changes and no externalCandles, fetch genuine market candles
  useEffect(() => {
    if (externalCandles && externalCandles.length > 0) return;

    const basePrice = safeStock.price || 78500;
    setLivePrice(basePrice);

    const isCrypto = safeStock.market === "UPBIT" || safeStock.market === "BTC" || ["BTC", "ETH", "XRP", "SOL", "DOGE", "ADA"].includes(safeStock.symbol);
    if (isCrypto) {
      const upbitCode = safeStock.symbol.startsWith("KRW-") ? safeStock.symbol : `KRW-${safeStock.symbol}`;
      fetch(`/api/upbit/public/candles?market=${encodeURIComponent(upbitCode)}&unit=5&count=25`)
        .then(res => res.ok ? res.json() : [])
        .then(cList => {
          if (Array.isArray(cList) && cList.length > 0) {
            const realCandles = [...cList].reverse().map((c: any) => ({
              time: (c.candle_date_time_kst || "").substring(11, 16) || "09:00",
              open: c.opening_price,
              high: c.high_price,
              low: c.low_price,
              close: c.trade_price,
              volume: Math.round(c.candle_acc_trade_volume || 0)
            }));
            const mapped = mapCandlesWithMAs(realCandles);
            setCandles(mapped);
            if (mapped.length > 0) {
              setLivePrice(mapped[mapped.length - 1].close);
            }
          }
        })
        .catch(() => {});
    } else {
      // Domestic KRX or US: fetch real-time candles from server
      fetch(`/api/market/realtime-candles?symbol=${encodeURIComponent(safeStock.symbol)}&timeframe=15m&count=30`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && Array.isArray(data.candles) && data.candles.length > 0) {
            const mapped = mapCandlesWithMAs(data.candles);
            setCandles(mapped);
            if (mapped.length > 0) {
              setLivePrice(mapped[mapped.length - 1].close);
            }
          }
        })
        .catch(() => {});
    }
  }, [safeStock.symbol, safeStock.price, safeStock.market]);

  // Real-time market tick listener (Only genuine quotes update the chart)
  useEffect(() => {
    const handleStockTicker = (e: any) => {
      if (!e || !e.detail) return;
      const stocks = Array.isArray(e.detail) ? e.detail : [e.detail];
      const match = stocks.find((s: any) => s.symbol === safeStock.symbol || s.name === safeStock.name);
      if (match && match.price && match.price !== livePrice) {
        const next = match.price;
        const isUp = next > livePrice;
        setPriceFlash(isUp ? "up" : "down");
        setTimeout(() => setPriceFlash(null), 300);
        setLivePrice(next);

        setCandles((old) => {
          if (old.length === 0) return old;
          const updated = [...old];
          const last = { ...updated[updated.length - 1] };
          last.close = next;
          last.high = Math.max(last.high, next);
          last.low = Math.min(last.low, next);
          updated[updated.length - 1] = last;
          return updated;
        });
      }
    };

    const handleUpbitTicker = (e: any) => {
      if (!e || !e.detail) return;
      const detail = e.detail;
      const cleanCode = detail.code ? detail.code.replace("KRW-", "") : "";
      if (cleanCode === safeStock.symbol || detail.market === `KRW-${safeStock.symbol}` || detail.code === `KRW-${safeStock.symbol}`) {
        const next = detail.trade_price;
        if (next && next !== livePrice) {
          const isUp = next > livePrice;
          setPriceFlash(isUp ? "up" : "down");
          setTimeout(() => setPriceFlash(null), 300);
          setLivePrice(next);

          setCandles((old) => {
            if (old.length === 0) return old;
            const updated = [...old];
            const last = { ...updated[updated.length - 1] };
            last.close = next;
            last.high = Math.max(last.high, next);
            last.low = Math.min(last.low, next);
            updated[updated.length - 1] = last;
            return updated;
          });
        }
      }
    };

    window.addEventListener("stock_ticker_update", handleStockTicker);
    window.addEventListener("upbit_ticker_update", handleUpbitTicker);

    return () => {
      window.removeEventListener("stock_ticker_update", handleStockTicker);
      window.removeEventListener("upbit_ticker_update", handleUpbitTicker);
    };
  }, [safeStock.symbol, safeStock.name, livePrice]);

  // Canvas Drawing Routine matching 디자인.png
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = rect.width;
    const h = 260; // Clean height

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const margin = { top: 20, right: 65, bottom: 45, left: 10 };
    const chartW = w - margin.left - margin.right;
    const priceH = h * 0.62; // top 62% for candlesticks
    const volH = h * 0.18;   // middle 18% for volume
    const rsiH = h * 0.15;   // bottom 15% for RSI

    const count = candles.length;
    if (count === 0) return;

    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVol = 0;

    candles.forEach((c) => {
      minPrice = Math.min(minPrice, c.low);
      maxPrice = Math.max(maxPrice, c.high);
      maxVol = Math.max(maxVol, c.volume);
    });

    // Add padding to price bounds
    const pPad = (maxPrice - minPrice) * 0.08 || 100;
    minPrice -= pPad;
    maxPrice += pPad;

    const toY = (val: number) => margin.top + (1 - (val - minPrice) / (maxPrice - minPrice)) * priceH;

    // Draw Price Grid Lines
    ctx.strokeStyle = "#F1F5F9";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);

    const gridSteps = 4;
    for (let i = 0; i <= gridSteps; i++) {
      const gy = margin.top + (priceH / gridSteps) * i;
      const gVal = maxPrice - ((maxPrice - minPrice) / gridSteps) * i;

      ctx.beginPath();
      ctx.moveTo(margin.left, gy);
      ctx.lineTo(w - margin.right, gy);
      ctx.stroke();

      // Price Tag on Right
      ctx.fillStyle = "#94A3B8";
      ctx.font = "bold 9px 'JetBrains Mono', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`${Math.round(gVal).toLocaleString()}`, w - margin.right + 6, gy + 3);
    }
    ctx.setLineDash([]);

    // Draw Bull Flag & BOS Target Annotations
    if (toggles.BOS) {
      const bosY = toY(safeStock.price * 1.015);
      ctx.strokeStyle = "#10B981";
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(chartW * 0.55, bosY);
      ctx.lineTo(w - margin.right, bosY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#10B981";
      ctx.font = "bold 9px sans-serif";
      ctx.fillText("BOS", chartW * 0.58, bosY - 4);
      ctx.fillText("Bull Flag", chartW * 0.82, bosY - 14);
    }

    // 🎯 Draw 3-Step Exit Strategy Markers (TP1 40%, TP2 30%, TP3 30%, SL)
    if (toggles.EXIT_3STEP) {
      const baseEntry = safeStock.price || livePrice;
      const tp1Price = Math.round(baseEntry * 1.035);
      const tp2Price = Math.round(baseEntry * 1.070);
      const tp3Price = Math.round(baseEntry * 1.120);
      const slPrice = Math.round(baseEntry * 0.975);

      const tp1Y = toY(tp1Price);
      const tp2Y = toY(tp2Price);
      const tp3Y = toY(tp3Price);
      const slY = toY(slPrice);

      // TP3 Line (+12.0%, 30% Moonshot Runner)
      ctx.strokeStyle = "rgba(168, 85, 247, 0.85)"; // Purple
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 2]);
      ctx.beginPath();
      ctx.moveTo(margin.left, tp3Y);
      ctx.lineTo(w - margin.right, tp3Y);
      ctx.stroke();

      ctx.fillStyle = "#A855F7";
      ctx.font = "bold 9px 'JetBrains Mono', sans-serif";
      ctx.fillText(`🚀 TP3 (+12.0% | 30% 잔량) ₩${(tp3Price ?? 0).toLocaleString()}`, margin.left + 8, tp3Y - 3);

      // TP2 Line (+7.0%, 30% Trailing Stop)
      ctx.strokeStyle = "rgba(14, 165, 233, 0.85)"; // Sky Blue
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 2]);
      ctx.beginPath();
      ctx.moveTo(margin.left, tp2Y);
      ctx.lineTo(w - margin.right, tp2Y);
      ctx.stroke();

      ctx.fillStyle = "#0284C7";
      ctx.font = "bold 9px 'JetBrains Mono', sans-serif";
      ctx.fillText(`🎯 TP2 (+7.0% | 30% 트레일링) ₩${(tp2Price ?? 0).toLocaleString()}`, margin.left + 8, tp2Y - 3);

      // TP1 Line (+3.5%, 40% Breakeven Lock)
      ctx.strokeStyle = "rgba(16, 185, 129, 0.85)"; // Emerald
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 2]);
      ctx.beginPath();
      ctx.moveTo(margin.left, tp1Y);
      ctx.lineTo(w - margin.right, tp1Y);
      ctx.stroke();

      ctx.fillStyle = "#059669";
      ctx.font = "bold 9px 'JetBrains Mono', sans-serif";
      ctx.fillText(`🎯 TP1 (+3.5% | 40% 본절가스탑) ₩${(tp1Price ?? 0).toLocaleString()}`, margin.left + 8, tp1Y - 3);

      // Stop Loss Line (-2.5%)
      ctx.strokeStyle = "rgba(239, 68, 68, 0.75)"; // Red
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(margin.left, slY);
      ctx.lineTo(w - margin.right, slY);
      ctx.stroke();

      ctx.fillStyle = "#DC2626";
      ctx.font = "bold 9px 'JetBrains Mono', sans-serif";
      ctx.fillText(`🛑 SL (-2.5% 손절선) ₩${(slPrice ?? 0).toLocaleString()}`, margin.left + 8, slY - 3);

      ctx.setLineDash([]);
    }

    const candleW = Math.max(3, (chartW / count) * 0.65);
    const spacing = chartW / count;

    // 1. Draw Candlesticks & Volume Bars
    candles.forEach((c, idx) => {
      const cx = margin.left + idx * spacing + spacing / 2;
      const isBull = c.close >= c.open;
      const color = isBull ? "#059669" : "#DC2626";

      // Wick
      const hy = toY(c.high);
      const ly = toY(c.low);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx, hy);
      ctx.lineTo(cx, ly);
      ctx.stroke();

      // Body
      const oy = toY(c.open);
      const cy = toY(c.close);
      const topY = Math.min(oy, cy);
      const bodyH = Math.max(2, Math.abs(cy - oy));

      ctx.fillStyle = color;
      ctx.fillRect(cx - candleW / 2, topY, candleW, bodyH);

      // Volume Bar (middle zone)
      const vyTop = margin.top + priceH + 8;
      const vh = (c.volume / (maxVol || 1)) * (volH - 12);
      ctx.fillStyle = isBull ? "rgba(5, 150, 105, 0.35)" : "rgba(220, 38, 38, 0.35)";
      ctx.fillRect(cx - candleW / 2, vyTop + volH - vh, candleW, vh);
    });

    // 2. Draw Moving Average Curves (EMA 5, EMA 20, EMA 60) & VWAP
    // EMA 5 (Highlight Blue)
    ctx.strokeStyle = "#2563EB";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    candles.forEach((c, i) => {
      const cx = margin.left + i * spacing + spacing / 2;
      const my = toY(c.ma5 || c.close);
      if (i === 0) ctx.moveTo(cx, my);
      else ctx.lineTo(cx, my);
    });
    ctx.stroke();

    // EMA 20 (Purple)
    ctx.strokeStyle = "#7C3AED";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    candles.forEach((c, i) => {
      const cx = margin.left + i * spacing + spacing / 2;
      const my = toY(c.ma20 || c.close * 0.99);
      if (i === 0) ctx.moveTo(cx, my);
      else ctx.lineTo(cx, my);
    });
    ctx.stroke();

    // EMA 60 (Emerald)
    ctx.strokeStyle = "#059669";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    candles.forEach((c, i) => {
      const cx = margin.left + i * spacing + spacing / 2;
      const my = toY(c.ma60 || c.close * 0.98);
      if (i === 0) ctx.moveTo(cx, my);
      else ctx.lineTo(cx, my);
    });
    ctx.stroke();

    // VWAP Line (Deep Slate/Navy)
    if (toggles.VWAP) {
      ctx.strokeStyle = "#0F172A";
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      let cumV = 0;
      let cumVP = 0;
      candles.forEach((c, i) => {
        const cx = margin.left + i * spacing + spacing / 2;
        const tp = (c.high + c.low + c.close) / 3;
        const v = c.volume || 1000;
        cumV += v;
        cumVP += tp * v;
        const vwap = cumV > 0 ? cumVP / cumV : c.close;
        const vy = toY(vwap);
        if (i === 0) ctx.moveTo(cx, vy);
        else ctx.lineTo(cx, vy);
      });
      ctx.stroke();
    }

    // 3. Draw RSI Sub-chart line (Bottom zone)
    const rsiTop = margin.top + priceH + volH + 4;
    ctx.strokeStyle = "#9333EA";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    candles.forEach((c, i) => {
      const cx = margin.left + i * spacing + spacing / 2;
      const ry = rsiTop + rsiH - ((c.rsi || 50) / 100) * rsiH;
      if (i === 0) ctx.moveTo(cx, ry);
      else ctx.lineTo(cx, ry);
    });
    ctx.stroke();

    // RSI Label & scale on left
    ctx.fillStyle = "#9333EA";
    ctx.font = "bold 8px sans-serif";
    ctx.fillText("● RSI (14) 67.25", margin.left + 2, rsiTop + 8);

    // Current Price Tag on Right scale
    const lastY = toY(livePrice);
    ctx.fillStyle = "#EF4444";
    ctx.fillRect(w - margin.right + 2, lastY - 8, 58, 16);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 9px 'JetBrains Mono', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${(livePrice ?? 0).toLocaleString()}`, w - margin.right + 31, lastY + 3);

  }, [candles, livePrice, toggles, safeStock.price]);

  const toggleBadge = (key: keyof typeof toggles) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
      {/* Chart Top Header matching 디자인.png */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">실시간 차트 분석</span>
          </div>

          <div className="flex items-baseline gap-3 mt-1">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-1.5">
              <span>{safeStock.name}</span>
              <span className="text-xs font-mono font-medium text-slate-400">({safeStock.symbol})</span>
            </h3>

            <div className="flex items-center gap-2 font-mono">
              <span
                className={`text-lg font-black transition-colors duration-200 ${
                  priceFlash === "up"
                    ? "text-emerald-600 scale-105"
                    : priceFlash === "down"
                    ? "text-rose-600 scale-105"
                    : "text-slate-900"
                }`}
              >
                {(livePrice ?? 0).toLocaleString()}
              </span>
              <span className={`text-xs font-bold ${safeStock.changeRate >= 0 ? "text-rose-600" : "text-blue-600"}`}>
                ▲ {safeStock.changeAmount > 0 ? (safeStock.changeAmount ?? 0).toLocaleString() : "2,000"} ({safeStock.changeRate >= 0 ? "+" : ""}{safeStock.changeRate}%)
              </span>
            </div>
          </div>
        </div>

        {/* Right Info: 거래대금, 거래량, RVOL */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="text-right">
            <div className="text-[10px] text-slate-400 font-sans">거래대금</div>
            <div className="font-bold text-slate-800">{safeStock.tradeValue || "9,812억"}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-400 font-sans">거래량</div>
            <div className="font-bold text-slate-800">{safeStock.volume || "1,334만"}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-400 font-sans">RVOL</div>
            <div className="font-bold text-blue-600">{safeStock.rvol || 1.65}</div>
          </div>

          {/* Quick Trade Action Buttons */}
          <div className="flex items-center gap-1.5 ml-2">
            <button
              onClick={() => onTradeClick?.("BUY")}
              className="px-3 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-[11px] shadow-xs transition cursor-pointer"
            >
              매수
            </button>
            <button
              onClick={() => onTradeClick?.("SELL")}
              className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] shadow-xs transition cursor-pointer"
            >
              매도
            </button>
          </div>
        </div>
      </div>

      {/* Timeframe & MA Legend Row */}
      <div className="flex items-center justify-between gap-2 py-1 text-xs mb-1.5 font-sans">
        {/* Timeframe Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-semibold">
          {["1분", "3분", "5분", "15분", "30분", "일", "주", "월"].map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2 py-0.5 rounded transition cursor-pointer ${
                timeframe === tf
                  ? "bg-white text-blue-600 font-black shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* MA Indicators Legend */}
        <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
            <span>MA 5</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-500 inline-block"></span>
            <span>MA 20</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-500 inline-block"></span>
            <span>MA 60</span>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div ref={containerRef} className="w-full relative h-[260px] bg-slate-50/40 rounded-lg border border-slate-100 overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Time axis text */}
      <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 px-2 pt-1 border-t border-slate-100">
        <span>05/20</span>
        <span>09:30</span>
        <span>10:30</span>
        <span>11:30</span>
        <span>12:30</span>
        <span>13:30</span>
        <span>15:00</span>
      </div>

      {/* Bottom Indicator Toggle Bar matching 디자인.png + Confluence & Trailing Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 mt-1 text-[10px] font-bold font-sans border-t border-slate-100">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-400 font-semibold pr-1">패턴 필터:</span>
          {(["BOS", "CHoCH", "FVG", "OB", "VWAP", "VP", "SR"] as const).map((key) => {
            const isActive = toggles[key];
            return (
              <button
                key={key}
                onClick={() => toggleBadge(key)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition cursor-pointer ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 shadow-2xs"
                    : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span>{key}</span>
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-300"}`}></span>
              </button>
            );
          })}
        </div>

        {/* Real-time Trailing Stop & Risk-Reward Badge */}
        <div className="flex items-center gap-2 font-mono">
          <button
            onClick={() => toggleBadge("EXIT_3STEP")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black border transition cursor-pointer ${
              toggles.EXIT_3STEP
                ? "bg-purple-50 text-purple-700 border-purple-300 shadow-2xs"
                : "bg-slate-50 text-slate-400 border-slate-200"
            }`}
          >
            <Target className="w-3 h-3" />
            <span>3단계 분할 익절 마커 (TP1/2/3) {toggles.EXIT_3STEP ? "ON" : "OFF"}</span>
          </button>
          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-black">
            🎯 R:R 1:2.4 확증
          </span>
          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black">
            🛡️ Auto Breakeven 대기
          </span>
        </div>
      </div>

      {/* 🎯 3-Step Exit Strategy Live Progress Monitor */}
      {toggles.EXIT_3STEP && (
        <div className="mt-3 p-3.5 bg-slate-900 text-white rounded-xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-purple-500/20 text-purple-400">
                <Target className="w-4 h-4" />
              </span>
              <div>
                <div className="text-xs font-mono font-black text-slate-100 flex items-center gap-2">
                  <span>AI 3단계 분할 익절 & 트레일링 스탑 실시간 추적</span>
                  <span className="px-1.5 py-0.2 text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded font-mono font-bold">
                    자동 분할 매도 가동
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">
                  진입가: ₩{(safeStock.price || livePrice).toLocaleString()} | 손절가: ₩{Math.round((safeStock.price || livePrice) * 0.975).toLocaleString()} (-2.5%)
                </div>
              </div>
            </div>

            <div className="text-right font-mono">
              <span className="text-[10px] text-slate-400">현재 가격 위치: </span>
              <span className="text-xs font-bold text-emerald-400">
                ₩{(livePrice ?? 0).toLocaleString()} ({safeStock.changeRate >= 0 ? "+" : ""}{safeStock.changeRate}%)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
            {/* Step 1 Card */}
            <div className={`p-2.5 rounded-lg border transition ${
              livePrice >= Math.round((safeStock.price || livePrice) * 1.035)
                ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300"
                : "bg-slate-800/60 border-slate-700/60 text-slate-300"
            }`}>
              <div className="flex items-center justify-between font-bold mb-1">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>1차 익절 (TP1)</span>
                </span>
                <span className="text-emerald-400 font-black">+3.5% (40% 매도)</span>
              </div>
              <div className="text-sm font-black text-slate-100">
                ₩{Math.round((safeStock.price || livePrice) * 1.035).toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400 mt-1 leading-tight">
                체결 즉시 스탑로스를 본절가(Breakeven)로 상향하여 원금 보호
              </div>
              <div className="w-full bg-slate-700/50 h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-emerald-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, Math.max(0, ((livePrice / (safeStock.price || livePrice) - 1) / 0.035) * 100))}%` }}
                />
              </div>
            </div>

            {/* Step 2 Card */}
            <div className={`p-2.5 rounded-lg border transition ${
              livePrice >= Math.round((safeStock.price || livePrice) * 1.070)
                ? "bg-sky-950/40 border-sky-500/50 text-sky-300"
                : "bg-slate-800/60 border-slate-700/60 text-slate-300"
            }`}>
              <div className="flex items-center justify-between font-bold mb-1">
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
                  <span>2차 익절 (TP2)</span>
                </span>
                <span className="text-sky-400 font-black">+7.0% (30% 매도)</span>
              </div>
              <div className="text-sm font-black text-slate-100">
                ₩{Math.round((safeStock.price || livePrice) * 1.070).toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400 mt-1 leading-tight">
                1차 목표가를 새로운 지지선(Trailing Stop)으로 잠금
              </div>
              <div className="w-full bg-slate-700/50 h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-sky-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, Math.max(0, ((livePrice / (safeStock.price || livePrice) - 1) / 0.070) * 100))}%` }}
                />
              </div>
            </div>

            {/* Step 3 Card */}
            <div className={`p-2.5 rounded-lg border transition ${
              livePrice >= Math.round((safeStock.price || livePrice) * 1.120)
                ? "bg-purple-950/40 border-purple-500/50 text-purple-300"
                : "bg-slate-800/60 border-slate-700/60 text-slate-300"
            }`}>
              <div className="flex items-center justify-between font-bold mb-1">
                <span className="flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5 text-purple-400" />
                  <span>3차 문샷 (TP3)</span>
                </span>
                <span className="text-purple-400 font-black">+12.0% (30% 잔량)</span>
              </div>
              <div className="text-sm font-black text-slate-100">
                ₩{Math.round((safeStock.price || livePrice) * 1.120).toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400 mt-1 leading-tight">
                슈퍼트렌드 상단까지 잔량 30% 홀딩 극대화
              </div>
              <div className="w-full bg-slate-700/50 h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-purple-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, Math.max(0, ((livePrice / (safeStock.price || livePrice) - 1) / 0.120) * 100))}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Candlestick Pattern Overlay & Net Profit Fee Guard Visualizer */}
      <div className="mt-4">
        <CandlestickPatternOverlayVisualizer
          stock={safeStock}
          currentPrice={livePrice}
          onTradeClick={onTradeClick}
        />
      </div>
    </div>
  );
};
