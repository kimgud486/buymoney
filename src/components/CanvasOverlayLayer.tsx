import React from "react";

export type TechnicalPatternId =
  | "INVERSE_HEAD_SHOULDERS"
  | "CUP_HANDLE"
  | "FALLING_WEDGE"
  | "DOUBLE_BOTTOM"
  | "ASCENDING_TRIANGLE"
  | "BULLISH_FLAG"
  | "BOX_BREAKOUT"
  | "MORNING_STAR";

export interface ActionMarkerItem {
  id: string;
  timestamp: string;
  type: "BUY" | "SELL" | "TAKE_PROFIT" | "STOP_LOSS";
  price: number;
  qty?: number;
  amount?: number;
  confidence?: number;
  reason?: string;
  sourceBroker?: string;
}

export interface CanvasOverlayLayerProps {
  symbol: string;
  name: string;
  price: number;
  entryPrice: number;
  tpPrice1: number;
  tpPrice2: number;
  slPrice: number;
  patternId: TechnicalPatternId;
  actionMarkers?: ActionMarkerItem[];
  width?: number;
  height?: number;
  showDashedLines?: boolean;
  showTargetZones?: boolean;
  showPricePulse?: boolean;
  showActionMarkers?: boolean;
}

export const CanvasOverlayLayer: React.FC<CanvasOverlayLayerProps> = ({
  symbol,
  name,
  price,
  entryPrice,
  tpPrice1,
  tpPrice2,
  slPrice,
  patternId,
  actionMarkers = [],
  width = 600,
  height = 260,
  showDashedLines = true,
  showTargetZones = true,
  showPricePulse = true,
  showActionMarkers = true,
}) => {
  // Calculate relative target Y coordinates on the SVG canvas (height=260)
  // Higher price = lower Y in SVG
  const minP = Math.min(price, slPrice) * 0.95;
  const maxP = Math.max(price, tpPrice2) * 1.05;
  const rangeP = maxP - minP || 1;

  const getY = (p: number) => {
    const ratio = (p - minP) / rangeP;
    return Math.max(20, Math.min(height - 20, height - ratio * height));
  };

  const currentY = getY(price);
  const entryY = getY(entryPrice);
  const tp1Y = getY(tpPrice1);
  const tp2Y = getY(tpPrice2);
  const slY = getY(slPrice);

  // Render Pattern Geometry and Dashed Overlay Lines for the 8 Technical Patterns
  const renderPatternGraphics = () => {
    switch (patternId) {
      case "INVERSE_HEAD_SHOULDERS":
        return (
          <g className="pattern-inverse-head-shoulders">
            {/* Neckline Dashed Line */}
            <line x1="50" y1="130" x2="520" y2="125" stroke="#f59e0b" strokeWidth="2" strokeDasharray="5 3" />
            {/* Head and Shoulders Path */}
            <path d="M 50,130 Q 120,185 160,130 Q 250,235 300,128 Q 380,185 420,126 L 520,70" fill="none" stroke="#38bdf8" strokeWidth="3" />
            <circle cx="120" cy="185" r="5" fill="#38bdf8" />
            <circle cx="250" cy="235" r="6" fill="#f43f5e" />
            <circle cx="380" cy="185" r="5" fill="#38bdf8" />
            {/* Target Price Breakout Arrow */}
            <line x1="420" y1="126" x2="520" y2="70" stroke="#10b981" strokeWidth="2" strokeDasharray="3 3" />
            <text x="430" y="115" fill="#f59e0b" fontSize="10" fontWeight="bold" className="font-mono">
              [1] 목선(Neckline) 상방 돌파
            </text>
          </g>
        );

      case "CUP_HANDLE":
        return (
          <g className="pattern-cup-handle">
            {/* Cup Rim Upper Resistance Dashed Line */}
            <line x1="50" y1="110" x2="530" y2="110" stroke="#10b981" strokeWidth="2" strokeDasharray="4 4" />
            {/* Cup Body & Handle Path */}
            <path d="M 50,110 Q 240,245 370,110 L 410,135 L 440,112 L 530,55" fill="none" stroke="#a855f7" strokeWidth="3" />
            {/* Handle Zone Shaded Box */}
            <rect x="370" y="110" width="70" height="30" fill="rgba(168, 85, 247, 0.18)" stroke="#a855f7" strokeWidth="1" strokeDasharray="3 2" rx="4" />
            <text x="375" y="155" fill="#a855f7" fontSize="10" fontWeight="bold" className="font-mono">
              [2] Handle 눌림목 리테스트
            </text>
          </g>
        );

      case "FALLING_WEDGE":
        return (
          <g className="pattern-falling-wedge">
            {/* Converging Upper & Lower Dashed Trendlines */}
            <line x1="50" y1="90" x2="430" y2="185" stroke="#f43f5e" strokeWidth="2" strokeDasharray="5 3" />
            <line x1="50" y1="210" x2="430" y2="220" stroke="#06b6d4" strokeWidth="2" strokeDasharray="5 3" />
            {/* Oscillating Price Path */}
            <path d="M 50,135 L 110,110 L 170,185 L 230,145 L 290,195 L 360,175 L 430,120 L 520,50" fill="none" stroke="#38bdf8" strokeWidth="3" />
            <circle cx="430" cy="120" r="5" fill="#10b981" />
            <text x="410" y="105" fill="#10b981" fontSize="10" fontWeight="bold" className="font-mono">
              [3] 하향 쐐기 수렴 수급 분출
            </text>
          </g>
        );

      case "DOUBLE_BOTTOM":
        return (
          <g className="pattern-double-bottom">
            {/* W Formation Path */}
            <path d="M 50,80 L 140,210 L 230,130 L 320,210 L 410,125 L 520,60" fill="none" stroke="#22c55e" strokeWidth="3" />
            {/* Neckline Level */}
            <line x1="50" y1="130" x2="520" y2="130" stroke="#eab308" strokeWidth="2" strokeDasharray="4 3" />
            <circle cx="140" cy="210" r="5" fill="#f43f5e" />
            <circle cx="320" cy="210" r="5" fill="#f43f5e" />
            <text x="330" y="200" fill="#22c55e" fontSize="10" fontWeight="bold" className="font-mono">
              [4] 이중 바닥(W-Pattern) 완성
            </text>
          </g>
        );

      case "ASCENDING_TRIANGLE":
        return (
          <g className="pattern-ascending-triangle">
            {/* Upper Horizontal Resistance Dashed Line */}
            <line x1="50" y1="90" x2="450" y2="90" stroke="#f43f5e" strokeWidth="2" strokeDasharray="4 2" />
            {/* Ascending Support Line */}
            <line x1="50" y1="220" x2="450" y2="90" stroke="#10b981" strokeWidth="2.5" strokeDasharray="5 3" />
            {/* Price Zigzag */}
            <path d="M 50,210 L 130,90 L 200,170 L 280,90 L 350,130 L 420,90 L 520,40" fill="none" stroke="#a855f7" strokeWidth="3" />
            <text x="310" y="75" fill="#f43f5e" fontSize="10" fontWeight="bold" className="font-mono">
              [5] 수평 저항 돌파 타겟
            </text>
          </g>
        );

      case "BULLISH_FLAG":
        return (
          <g className="pattern-bullish-flag">
            {/* Vertical Flagpole */}
            <line x1="70" y1="230" x2="180" y2="80" stroke="#38bdf8" strokeWidth="4" />
            {/* Parallel Channel Flag Boundaries */}
            <line x1="180" y1="80" x2="380" y2="150" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 3" />
            <line x1="180" y1="120" x2="380" y2="190" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 3" />
            {/* Flag Consolidation and Breakout */}
            <path d="M 180,80 L 230,130 L 280,95 L 330,150 L 380,110 L 520,45" fill="none" stroke="#22c55e" strokeWidth="3" />
            <text x="385" y="100" fill="#22c55e" fontSize="10" fontWeight="bold" className="font-mono">
              [6] 깃발형 2차 폭등 시그널
            </text>
          </g>
        );

      case "BOX_BREAKOUT":
        return (
          <g className="pattern-box-breakout">
            {/* Box Boundary Shaded Area */}
            <rect x="60" y="110" width="320" height="90" fill="rgba(56, 189, 248, 0.08)" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="5 3" rx="4" />
            <line x1="50" y1="110" x2="520" y2="110" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" />
            <line x1="50" y1="200" x2="520" y2="200" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="3 3" />
            {/* Price Consolidation inside Box then Explosive Breakout */}
            <path d="M 60,180 L 110,120 L 160,190 L 210,125 L 270,175 L 340,115 L 400,80 L 520,35" fill="none" stroke="#eab308" strokeWidth="3" />
            <text x="350" y="100" fill="#eab308" fontSize="10" fontWeight="bold" className="font-mono">
              [7] 박스권 상단 대량거래 돌파
            </text>
          </g>
        );

      case "MORNING_STAR":
      default:
        return (
          <g className="pattern-morning-star">
            {/* Reversal Support Base */}
            <line x1="50" y1="200" x2="520" y2="200" stroke="#06b6d4" strokeWidth="2" strokeDasharray="4 4" />
            {/* 3-Candle Reversal Path */}
            <path d="M 50,80 L 160,200 L 240,210 L 330,130 L 420,90 L 520,40" fill="none" stroke="#f43f5e" strokeWidth="3" />
            <circle cx="240" cy="210" r="7" fill="#eab308" />
            <text x="255" y="200" fill="#eab308" fontSize="10" fontWeight="bold" className="font-mono">
              [8] 샛별형(Morning Star) 변곡점
            </text>
          </g>
        );
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden pointer-events-none select-none">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full"
        preserveAspectRatio="none"
      >
        <defs>
          {/* Target Zone Gradients */}
          <linearGradient id="tpZoneGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.03" />
          </linearGradient>
          <linearGradient id="slZoneGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.22" />
          </linearGradient>
        </defs>

        {/* Target Price Zones Shading */}
        {showTargetZones && (
          <>
            {/* Take Profit Target Zone (Green Band) */}
            <rect
              x="0"
              y={Math.min(tp2Y, tp1Y)}
              width={width}
              height={Math.max(12, Math.abs(tp2Y - entryY))}
              fill="url(#tpZoneGrad)"
            />

            {/* Stop Loss Zone (Red Band) */}
            <rect
              x="0"
              y={Math.min(entryY, slY)}
              width={width}
              height={Math.max(12, Math.abs(slY - entryY))}
              fill="url(#slZoneGrad)"
            />
          </>
        )}

        {/* Render Pattern Overlay Lines */}
        {renderPatternGraphics()}

        {/* Dashed Price Target Lines */}
        {showDashedLines && (
          <g className="dashed-price-lines">
            {/* TP2 Target Line (Purple) */}
            <line x1="0" y1={tp2Y} x2={width} y2={tp2Y} stroke="#a855f7" strokeWidth="1.5" strokeDasharray="4 2" />
            <text x={width - 120} y={tp2Y - 4} fill="#a855f7" fontSize="10" fontWeight="bold" className="font-mono">
              2차 목표가: {tpPrice2.toLocaleString()}원
            </text>

            {/* TP1 Target Line (Green) */}
            <line x1="0" y1={tp1Y} x2={width} y2={tp1Y} stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 2" />
            <text x={width - 120} y={tp1Y - 4} fill="#10b981" fontSize="10" fontWeight="bold" className="font-mono">
              1차 목표가: {tpPrice1.toLocaleString()}원
            </text>

            {/* Entry Price Line (Amber) */}
            <line x1="0" y1={entryY} x2={width} y2={entryY} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="2 2" />
            <text x={10} y={entryY - 4} fill="#f59e0b" fontSize="10" fontWeight="bold" className="font-mono">
              진입 권장선: {entryPrice.toLocaleString()}원
            </text>

            {/* Stop Loss Line (Red) */}
            <line x1="0" y1={slY} x2={width} y2={slY} stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="4 2" />
            <text x={width - 100} y={slY + 12} fill="#f43f5e" fontSize="10" fontWeight="bold" className="font-mono">
              손절선: {slPrice.toLocaleString()}원
            </text>
          </g>
        )}

        {/* DYNAMIC AI ACTION MARKERS OVERLAY (Buy / Sell / TP / SL) */}
        {showActionMarkers && actionMarkers && actionMarkers.length > 0 && (
          <g className="ai-action-markers-layer">
            {actionMarkers.slice(0, 5).map((marker, idx) => {
              const markerY = getY(marker.price);
              // Calculate staggered X coordinate on canvas (from right to left or distributed)
              const posX = Math.max(90, Math.min(width - 110, 100 + idx * 105));
              const isBuy = marker.type === "BUY";
              const isSell = marker.type === "SELL";
              const isTp = marker.type === "TAKE_PROFIT";
              const isSl = marker.type === "STOP_LOSS";

              const badgeBg = isBuy ? "#10b981" : isSell ? "#f43f5e" : isTp ? "#8b5cf6" : "#ef4444";
              const badgeStroke = isBuy ? "#34d399" : isSell ? "#f87171" : isTp ? "#c084fc" : "#fca5a5";
              const labelText = isBuy ? "AI 매수" : isSell ? "AI 매도" : isTp ? "AI 익절" : "AI 손절";

              return (
                <g key={marker.id || idx} className="action-marker-group animate-pulse">
                  {/* Vertical Guideline to Price Level */}
                  <line x1={posX} y1={markerY - 28} x2={posX} y2={markerY + 28} stroke={badgeBg} strokeWidth="1.5" strokeDasharray="2 2" opacity="0.8" />

                  {/* Pulsing Target Circle */}
                  <circle cx={posX} cy={markerY} r="9" fill={badgeBg} opacity="0.3" className="animate-ping" />
                  <circle cx={posX} cy={markerY} r="5" fill={badgeBg} stroke="#ffffff" strokeWidth="1.5" />

                  {/* Marker Badge Container */}
                  <g transform={`translate(${posX - 48}, ${markerY > height / 2 ? markerY - 36 : markerY + 12})`}>
                    <rect x="0" y="0" width="96" height="26" fill="#0f172a" stroke={badgeStroke} strokeWidth="1.5" rx="5" />
                    {/* Signal Header Icon/Text */}
                    <text x="6" y="11" fill={badgeBg} fontSize="9" fontWeight="black" className="font-mono">
                      {labelText} [{marker.timestamp}]
                    </text>
                    {/* Execution Price Subtext */}
                    <text x="6" y="21" fill="#f8fafc" fontSize="9" fontWeight="bold" className="font-mono">
                      @{marker.price.toLocaleString()}원
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        )}

        {/* Real-time Live Price Feed Line & Pulse */}
        {showPricePulse && (
          <g className="live-price-feed-pulse">
            <line x1="0" y1={currentY} x2={width} y2={currentY} stroke="#38bdf8" strokeWidth="2" />
            <circle cx={width - 20} cy={currentY} r="6" fill="#38bdf8" className="animate-ping opacity-75" />
            <circle cx={width - 20} cy={currentY} r="4" fill="#0284c7" />
            <rect x={width - 95} y={currentY - 10} width="72" height="20" rx="4" fill="#0284c7" />
            <text x={width - 59} y={currentY + 4} textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="black" className="font-mono">
              {price.toLocaleString()}원
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};
