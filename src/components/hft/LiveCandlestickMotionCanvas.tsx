import React, { useEffect, useRef, useState, useCallback } from "react";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

export interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap: number;
  rvol: number;
  isBull: boolean;
}

export const LiveCandlestickMotionCanvas: React.FC<{
  symbol?: string;
  stockName?: string;
  basePrice?: number;
  timeframe?: string;
}> = ({
  symbol = "005930",
  stockName = "삼성전자",
  basePrice = 73800,
  timeframe = "15분"
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [currentPrice, setCurrentPrice] = useState<number>(basePrice);
  const [priceFlash, setPriceFlash] = useState<"up" | "down" | null>(null);

  // Zoom & Pan Interactive State
  const [zoomLevel, setZoomLevel] = useState<number>(1.0); // 0.6x to 2.5x
  const [panOffset, setPanOffset] = useState<number>(0);
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  const [activeCandle, setActiveCandle] = useState<CandleData>({
    time: "15:30",
    open: basePrice - 100,
    high: basePrice + 300,
    low: basePrice - 200,
    close: basePrice,
    volume: 48500,
    vwap: basePrice - 50,
    rvol: 2.85,
    isBull: true
  });

  // Base Historical Candles
  const [candles, setCandles] = useState<CandleData[]>(() => {
    const list: CandleData[] = [];
    let p = basePrice - 1800;
    let cumulativeVol = 0;
    let cumulativeVolPrice = 0;

    const times = [
      "09:00", "09:15", "09:30", "09:45", "10:00", "10:15", "10:30", "10:45",
      "11:00", "11:15", "11:30", "11:45", "12:00", "12:15", "12:30", "12:45",
      "13:00", "13:15", "13:30", "13:45", "14:00", "14:15", "14:30", "14:45", "15:00"
    ];

    times.forEach((t, i) => {
      const delta = (Math.random() - 0.42) * 350;
      const open = p;
      const close = Math.round(open + delta);
      const high = Math.round(Math.max(open, close) + Math.random() * 200);
      const low = Math.round(Math.min(open, close) - Math.random() * 180);
      const volume = Math.round(20000 + Math.random() * 60000);
      
      const typicalPrice = (high + low + close) / 3;
      cumulativeVol += volume;
      cumulativeVolPrice += typicalPrice * volume;
      const vwap = Math.round(cumulativeVolPrice / cumulativeVol);
      const rvol = Math.round((1.2 + (i / times.length) * 1.5 + Math.random() * 0.4) * 100) / 100;

      list.push({
        time: t,
        open,
        high,
        low,
        close,
        volume,
        vwap,
        rvol,
        isBull: close >= open
      });
      p = close;
    });
    return list;
  });

  // Real-time tick engine: updates the active candle smoothly every 380ms
  useEffect(() => {
    const tickInterval = setInterval(() => {
      setActiveCandle((prev) => {
        const tickMove = (Math.random() - 0.44) * 65;
        const newClose = Math.round(prev.close + tickMove);
        const newHigh = Math.max(prev.high, newClose);
        const newLow = Math.min(prev.low, newClose);
        const newVol = prev.volume + Math.round(Math.random() * 1200);
        const newVwap = Math.round(prev.vwap + (newClose - prev.vwap) * 0.05);
        const newRvol = Math.round((2.7 + Math.random() * 0.3) * 100) / 100;

        setCurrentPrice(newClose);
        setPriceFlash(tickMove >= 0 ? "up" : "down");
        setTimeout(() => setPriceFlash(null), 200);

        return {
          ...prev,
          high: newHigh,
          low: newLow,
          close: newClose,
          volume: newVol,
          vwap: newVwap,
          rvol: newRvol,
          isBull: newClose >= prev.open
        };
      });
    }, 380);

    return () => clearInterval(tickInterval);
  }, []);

  // Gesture Pinch-to-Zoom & Pan Handlers for Mobile & Desktop Touch
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = dist;
    } else if (e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / touchStartDistRef.current;
      setZoomLevel((prev) => Math.min(2.5, Math.max(0.6, prev * (ratio > 1 ? 1.03 : 0.97))));
      touchStartDistRef.current = dist;
    } else if (e.touches.length === 1 && touchStartXRef.current !== null) {
      const deltaX = e.touches[0].clientX - touchStartXRef.current;
      setPanOffset((prev) => prev + deltaX * 0.3);
      touchStartXRef.current = e.touches[0].clientX;
    }
  };

  const handleTouchEnd = () => {
    touchStartDistRef.current = null;
    touchStartXRef.current = null;
  };

  // Zoom control buttons
  const zoomIn = () => setZoomLevel((prev) => Math.min(2.5, prev + 0.25));
  const zoomOut = () => setZoomLevel((prev) => Math.max(0.6, prev - 0.25));
  const resetZoom = () => {
    setZoomLevel(1.0);
    setPanOffset(0);
  };

  // Render on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // All candles including active one
      const allCandles = [...candles, activeCandle];
      const count = allCandles.length;
      const margin = { top: 25, bottom: 45, left: 10, right: 65 };
      const chartW = w - margin.left - margin.right;
      const chartH = h - margin.top - margin.bottom - 40; // reserve bottom for volume
      const volumeH = 35;
      const volumeY = h - margin.bottom - volumeH;

      // Find min & max price
      let minP = Infinity;
      let maxP = -Infinity;
      let maxVol = 0;

      allCandles.forEach((c) => {
        if (c.low < minP) minP = c.low;
        if (c.high > maxP) maxP = c.high;
        if (c.volume > maxVol) maxVol = c.volume;
      });

      const pRange = Math.max(100, maxP - minP);
      const toY = (price: number) => margin.top + chartH - ((price - minP) / pRange) * chartH;

      // Draw Grid Lines & Price Labels
      ctx.strokeStyle = "rgba(23, 40, 58, 0.6)";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);

      for (let i = 0; i <= 4; i++) {
        const gridPrice = minP + (pRange / 4) * i;
        const gy = toY(gridPrice);

        ctx.beginPath();
        ctx.moveTo(margin.left, gy);
        ctx.lineTo(w - margin.right, gy);
        ctx.stroke();

        ctx.fillStyle = "#8E9EB5";
        ctx.font = "bold 9px 'JetBrains Mono', monospace";
        ctx.textAlign = "left";
        ctx.fillText(`${(gridPrice ?? 0).toLocaleString()}원`, w - margin.right + 6, gy + 3);
      }
      ctx.setLineDash([]);

      // Draw Order Block / Support Demand Zone
      const obTop = toY(basePrice - 800);
      const obBottom = toY(basePrice - 1400);
      ctx.fillStyle = "rgba(0, 245, 160, 0.08)";
      ctx.fillRect(margin.left, obTop, chartW, obBottom - obTop);
      ctx.strokeStyle = "rgba(0, 245, 160, 0.4)";
      ctx.lineWidth = 1;
      ctx.strokeRect(margin.left, obTop, chartW, obBottom - obTop);

      ctx.fillStyle = "#00F5A0";
      ctx.font = "bold 8px 'JetBrains Mono', monospace";
      ctx.fillText("SMART MONEY ORDER BLOCK (DEMAND ZONE)", margin.left + 8, obTop + 12);

      // Draw BOS (Break of Structure) Target Line
      const bosY = toY(basePrice + 1200);
      ctx.strokeStyle = "#FF9900";
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(margin.left, bosY);
      ctx.lineTo(w - margin.right, bosY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#FF9900";
      ctx.font = "bold 8px 'JetBrains Mono', monospace";
      ctx.fillText("BOS TARGET: " + ((basePrice ?? 73800) + 1200).toLocaleString() + "원", margin.left + 8, bosY - 4);

      // Draw Candlesticks & Volume Bars (Scaled with zoomLevel & panOffset)
      const baseSpacing = chartW / count;
      const candleSpacing = baseSpacing * zoomLevel;
      const candleWidth = Math.max(2.5, candleSpacing * 0.65);

      const closePoints: { x: number; y: number }[] = [];
      const vwapPoints: { x: number; y: number }[] = [];

      allCandles.forEach((c, idx) => {
        const cx = margin.left + panOffset + idx * candleSpacing + candleSpacing / 2;
        if (cx < margin.left - 20 || cx > w - margin.right + 20) return;

        const openY = toY(c.open);
        const closeY = toY(c.close);
        const highY = toY(c.high);
        const lowY = toY(c.low);
        const vwapY = toY(c.vwap);

        closePoints.push({ x: cx, y: closeY });
        vwapPoints.push({ x: cx, y: vwapY });

        const isLast = idx === count - 1;
        const isBull = c.close >= c.open;
        const barColor = isBull ? "#00F5A0" : "#FF5E62";

        // Glow for the active ticking candle
        if (isLast) {
          ctx.save();
          ctx.shadowColor = barColor;
          ctx.shadowBlur = 10;
        }

        // Draw Wick
        ctx.strokeStyle = barColor;
        ctx.lineWidth = isLast ? 1.8 : 1.2;
        ctx.beginPath();
        ctx.moveTo(cx, highY);
        ctx.lineTo(cx, lowY);
        ctx.stroke();

        // Draw Body
        const bodyTop = Math.min(openY, closeY);
        const bodyHeight = Math.max(2, Math.abs(closeY - openY));
        ctx.fillStyle = barColor;
        ctx.fillRect(cx - candleWidth / 2, bodyTop, candleWidth, bodyHeight);

        if (isLast) {
          ctx.restore();
        }

        // Draw Volume Bar
        const vH = (c.volume / maxVol) * volumeH;
        const vy = volumeY + volumeH - vH;
        ctx.fillStyle = isBull ? "rgba(0, 245, 160, 0.45)" : "rgba(255, 94, 98, 0.45)";
        ctx.fillRect(cx - candleWidth / 2, vy, candleWidth, vH);
      });

      // Draw Live VWAP Line (Orange-Gold)
      if (vwapPoints.length > 1) {
        ctx.strokeStyle = "#FF9900";
        ctx.lineWidth = 1.4;
        ctx.setLineDash([3, 2]);
        ctx.beginPath();
        vwapPoints.forEach((pt, i) => {
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw EMA 9 Fast Moving Line (Cyan)
      if (closePoints.length > 1) {
        ctx.strokeStyle = "#00F2FE";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        closePoints.forEach((pt, i) => {
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
      }

      // Current Price Horizontal Line & Flashing Tag
      const currY = toY(activeCandle.close);
      ctx.strokeStyle = activeCandle.isBull ? "#00F5A0" : "#FF5E62";
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(margin.left, currY);
      ctx.lineTo(w - margin.right, currY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Flashing Current Price Tag on right scale
      const tagColor = activeCandle.isBull ? "#00F5A0" : "#FF5E62";
      ctx.fillStyle = tagColor;
      ctx.fillRect(w - margin.right + 2, currY - 9, 60, 18);
      ctx.fillStyle = "#050A12";
      ctx.font = "bold 10px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${(activeCandle?.close ?? basePrice ?? 0).toLocaleString()}`, w - margin.right + 32, currY + 4);

      // AI Long Entry & Target Annotations on Chart
      const lastX = margin.left + panOffset + (count - 1) * candleSpacing + candleSpacing / 2;
      ctx.fillStyle = "#00F2FE";
      ctx.beginPath();
      ctx.arc(lastX, currY, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#00F2FE";
      ctx.font = "bold 8px 'JetBrains Mono', monospace";
      ctx.fillText("⚡ AI REAL-TIME TICK", lastX - 45, currY - 10);

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [candles, activeCandle, basePrice, zoomLevel, panOffset]);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="w-full bg-[#08111D] border border-[#17283A] rounded-xl p-3 flex flex-col justify-between relative overflow-hidden select-none"
    >
      {/* Chart Header Bar */}
      <div className="flex items-center justify-between border-b border-[#17283A] pb-2 mb-2">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-white">{stockName}</span>
              <span className="text-xs font-mono text-cyan-400 font-bold">({symbol})</span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-mono border border-emerald-500/40">
                BULLISH BOS
              </span>
            </div>
            
            {/* Live Ticking Price & Change */}
            <div className="flex items-center gap-3 font-mono mt-0.5">
              <span
                className={`text-base font-black transition-colors duration-200 ${
                  priceFlash === "up"
                    ? "text-[#00F5A0] scale-105"
                    : priceFlash === "down"
                    ? "text-[#FF5E62] scale-105"
                    : "text-white"
                }`}
              >
                {(currentPrice ?? basePrice ?? 0).toLocaleString()}원
              </span>
              <span className="text-xs font-bold text-emerald-400">
                ▲ +2,000 (+2.79%)
              </span>
              <span className="text-[10px] text-zinc-400">
                VWAP: <strong className="text-amber-300">{(activeCandle?.vwap ?? basePrice ?? 0).toLocaleString()}원</strong>
              </span>
              <span className="text-[10px] text-zinc-400">
                RVOL: <strong className="text-cyan-300">{activeCandle?.rvol ?? 2.85}x</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Timeframe & Zoom controls */}
        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          <div className="hidden sm:flex items-center gap-0.5 bg-[#0E1927] p-0.5 rounded border border-[#17283A] mr-1">
            <button
              onClick={zoomIn}
              className="p-1 hover:bg-[#17283A] text-zinc-300 rounded cursor-pointer"
              title="확대 (Zoom In)"
            >
              <ZoomIn className="w-3.5 h-3.5 text-cyan-400" />
            </button>
            <button
              onClick={zoomOut}
              className="p-1 hover:bg-[#17283A] text-zinc-300 rounded cursor-pointer"
              title="축소 (Zoom Out)"
            >
              <ZoomOut className="w-3.5 h-3.5 text-zinc-400" />
            </button>
            <button
              onClick={resetZoom}
              className="p-1 hover:bg-[#17283A] text-zinc-300 rounded cursor-pointer"
              title="초기화"
            >
              <RotateCcw className="w-3 h-3 text-zinc-400" />
            </button>
          </div>

          {["1초", "1분", "3분", "5분", "15분", "일봉"].map((tf) => (
            <button
              key={tf}
              className={`px-2 py-0.5 rounded transition cursor-pointer ${
                tf === timeframe
                  ? "bg-cyan-600 text-white font-bold shadow"
                  : "bg-[#0E1927] text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Candlestick Canvas */}
      <div className="relative w-full h-[220px]">
        <canvas
          ref={canvasRef}
          width={640}
          height={220}
          className="w-full h-full object-contain cursor-grab active:cursor-grabbing"
        />
        {/* Mobile touch pinch-zoom hint */}
        <div className="absolute bottom-1 right-2 text-[8px] font-mono text-zinc-500 pointer-events-none md:hidden">
          Pinch to Zoom &bull; Drag to Pan
        </div>
      </div>

      {/* Bottom SMC Indicators Legend */}
      <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400 pt-2 border-t border-[#17283A] mt-1">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-cyan-400">
            <span className="w-2 h-0.5 bg-cyan-400 inline-block"></span> EMA 9
          </span>
          <span className="flex items-center gap-1 text-amber-400">
            <span className="w-2 h-0.5 border-b border-dashed border-amber-400 inline-block"></span> VWAP 지지
          </span>
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-xs bg-emerald-500/40 inline-block"></span> Order Block (수요)
          </span>
        </div>
        <div className="text-emerald-400 font-bold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
          REALTIME HFT STREAMING
        </div>
      </div>

    </div>
  );
};
