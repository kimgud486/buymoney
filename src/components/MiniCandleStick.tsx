import React from "react";

interface MiniCandleStickProps {
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  currentPrice: number;
  market?: "KOREA" | "BTC" | "US";
  width?: number;
  height?: number;
}

export const MiniCandleStick: React.FC<MiniCandleStickProps> = ({
  openPrice,
  highPrice,
  lowPrice,
  currentPrice,
  market = "KOREA",
  width = 64,
  height = 32
}) => {
  // Ensure valid math boundaries
  const cPrice = Number.isFinite(currentPrice) && currentPrice > 0 ? currentPrice : 1000;
  const oPrice = Number.isFinite(openPrice) && openPrice > 0 ? openPrice : cPrice * 0.98;
  const hPrice = Number.isFinite(highPrice) && highPrice > 0 ? Math.max(highPrice, oPrice, cPrice) : Math.max(oPrice, cPrice);
  const lPrice = Number.isFinite(lowPrice) && lowPrice > 0 ? Math.min(lowPrice, oPrice, cPrice) : Math.min(oPrice, cPrice);

  const range = (hPrice - lPrice) > 0 ? (hPrice - lPrice) : 1;
  const isUp = cPrice >= oPrice;

  // Colors: Korea/BTC usually Red=Up, Blue=Down. US usually Green=Up, Red=Down.
  const isUs = market === "US";
  const upColor = isUs ? "#10b981" : "#ef4444";   // Green or Red
  const downColor = isUs ? "#ef4444" : "#3b82f6"; // Red or Blue

  const candleColor = isUp ? upColor : downColor;

  // Calculate percentages relative to container height (padding top/bottom = 2px)
  const pad = 2;
  const chartHeight = Math.max(height - pad * 2, 1);

  const getY = (val: number) => {
    const pct = (hPrice - val) / range;
    const res = pad + pct * chartHeight;
    return Number.isFinite(res) ? res : pad;
  };

  const highY = getY(hPrice);
  const lowY = getY(lPrice);
  const openY = getY(oPrice);
  const closeY = getY(cPrice);

  const topBodyY = Number.isFinite(Math.min(openY, closeY)) ? Math.min(openY, closeY) : pad;
  const bodyHeight = Number.isFinite(Math.abs(openY - closeY)) ? Math.max(Math.abs(openY - closeY), 2) : 2;

  const pctChange = oPrice > 0 ? ((cPrice - oPrice) / oPrice) * 100 : 0;

  return (
    <div 
      className="inline-flex flex-col items-center justify-center group relative cursor-pointer"
      title={`시가: ₩${Math.round(oPrice).toLocaleString()} | 고가: ₩${Math.round(hPrice).toLocaleString()} | 저가: ₩${Math.round(lPrice).toLocaleString()} | 현재가: ₩${Math.round(cPrice).toLocaleString()} (${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(2)}%)`}
    >
      <svg width={width} height={height} className="overflow-visible">
        {/* Background Grid Line */}
        <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="#e2e8f0" strokeDasharray="2 2" strokeWidth={0.8} />

        {/* High-Low Wick Shadow Line */}
        <line
          x1={width / 2}
          y1={highY}
          x2={width / 2}
          y2={lowY}
          stroke={candleColor}
          strokeWidth={1.5}
          strokeLinecap="round"
        />

        {/* Open-Close Candle Body */}
        <rect
          x={width / 2 - 8}
          y={topBodyY}
          width={16}
          height={bodyHeight}
          fill={candleColor}
          rx={1.5}
          className="transition-all duration-300"
        />
      </svg>

      {/* Mini Indicator Tooltip on Hover */}
      <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center bg-slate-900 text-white text-[10px] font-mono p-1.5 rounded-md shadow-xl border border-slate-700 whitespace-nowrap z-30 pointer-events-none">
        <div className="font-bold flex items-center gap-1">
          <span>봉 변동:</span>
          <span style={{ color: candleColor }}>
            {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(2)}%
          </span>
        </div>
        <div className="text-[9px] text-slate-300">
          H: {Math.round(hPrice).toLocaleString()} | L: {Math.round(lPrice).toLocaleString()}
        </div>
      </div>
    </div>
  );
};
