import React, { useState } from "react";
import { Sparkles, Layers, Sliders, Target, AlertTriangle, ShieldCheck, Zap, Eye, EyeOff, Activity } from "lucide-react";
import { TechnicalPatternId, TECHNICAL_PATTERNS } from "./UnifiedOmniBrainAiControlCenter";
import { CanvasOverlayLayer, ActionMarkerItem } from "./CanvasOverlayLayer";

export interface AiChartOverlayCanvasProps {
  symbol: string;
  name: string;
  price: number;
  entryPrice: number;
  tpPrice1: number;
  tpPrice2: number;
  slPrice: number;
  patternId: TechnicalPatternId;
  isAutoTradingActive: boolean;
  quantScore: number;
  rvol: number;
  smlStructure: string;
  actionMarkers?: ActionMarkerItem[];
  timeframe?: string;
  onPatternChange?: (patternId: TechnicalPatternId) => void;
}

export const AiChartOverlayCanvas: React.FC<AiChartOverlayCanvasProps> = ({
  symbol,
  name,
  price,
  entryPrice,
  tpPrice1,
  tpPrice2,
  slPrice,
  patternId,
  isAutoTradingActive,
  quantScore,
  rvol,
  smlStructure,
  actionMarkers = [],
  timeframe = "5분",
  onPatternChange
}) => {
  const [showOrderBlocks, setShowOrderBlocks] = useState(true);
  const [showTrajectory, setShowTrajectory] = useState(true);
  const [showRiskRewardBands, setShowRiskRewardBands] = useState(true);
  const [showMarketSync, setShowMarketSync] = useState(true);

  const currentPattern = TECHNICAL_PATTERNS.find((p) => p.id === patternId) || TECHNICAL_PATTERNS[0];

  // Determine counterpart ticker for market sync overlay
  const counterpartInfo = (() => {
    const sym = symbol.toUpperCase();
    if (sym.includes("BTC")) return { name: "Binance BTCUSDT", spread: "+2.4%", lead: "+3.5s" };
    if (sym.includes("ETH")) return { name: "Binance ETHUSDT", spread: "+2.6%", lead: "+4.1s" };
    if (sym.includes("SOL")) return { name: "Binance SOLUSDT", spread: "+3.2%", lead: "+2.8s" };
    if (sym.includes("DOS")) return { name: "Global DOS/USDT", spread: "+4.1%", lead: "+6.2s" };
    if (sym.includes("000660") || name.includes("하이닉스")) return { name: "NVDA (NASDAQ)", spread: "+1.8%", lead: "+12.0s" };
    if (sym.includes("005930") || name.includes("삼성전자")) return { name: "US OTC GDR (SSNLF)", spread: "+0.8%", lead: "+8.5s" };
    if (sym.includes("TSLA") || sym.includes("373220")) return { name: "TSLA vs LIT ETF", spread: "-0.4%", lead: "+15.0s" };
    return { name: "Global Counterpart Index", spread: "+1.2%", lead: "+5.0s" };
  })();

  // Detect market currency unit
  const isUS = /^[A-Z]{1,5}$/.test(symbol) && symbol !== "BTC" && symbol !== "ETH" && symbol !== "SOL" && symbol !== "XRP" && symbol !== "DOGE";
  const currencyUnit = isUS ? "$" : "원";
  const formatPrice = (val: number) => isUS ? `${(val ?? 0).toLocaleString()}` : `${(val ?? 0).toLocaleString()}원`;

  // Calculate percentage returns & risk
  const tp1Return = price > 0 ? (((tpPrice1 - price) / price) * 100).toFixed(1) : "0.0";
  const tp2Return = price > 0 ? (((tpPrice2 - price) / price) * 100).toFixed(1) : "0.0";
  const slRisk = price > 0 ? (((price - slPrice) / price) * 100).toFixed(1) : "0.0";

  // Render Pattern Overlay Geometry
  const renderPatternGeometry = (id: TechnicalPatternId) => {
    switch (id) {
      case "INVERSE_HEAD_SHOULDERS":
        return (
          <g>
            {/* Neckline */}
            <line x1="60" y1="130" x2="520" y2="125" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 2" />
            {/* Left Shoulder, Head, Right Shoulder Path */}
            <path d="M 60,130 Q 130,180 170,130 Q 260,230 310,128 Q 390,180 430,126 L 520,70" fill="none" stroke="#38bdf8" strokeWidth="3" />
            <circle cx="130" cy="180" r="5" fill="#38bdf8" />
            <circle cx="260" cy="230" r="6" fill="#f43f5e" />
            <circle cx="390" cy="180" r="5" fill="#38bdf8" />
            {/* Neckline Breakout Marker */}
            <polygon points="430,126 422,136 438,136" fill="#f59e0b" />
            <text x="445" y="122" fill="#f59e0b" fontSize="10" fontWeight="black" className="font-mono">
              목선(Neckline) 돌파 완성
            </text>
          </g>
        );

      case "CUP_HANDLE":
        return (
          <g>
            {/* Cup Body and Handle */}
            <path d="M 60,110 Q 250,240 380,110 L 420,135 L 450,112 L 530,55" fill="none" stroke="#a855f7" strokeWidth="3" />
            {/* Rim Line */}
            <line x1="60" y1="110" x2="530" y2="110" stroke="#10b981" strokeWidth="2" strokeDasharray="3 3" />
            {/* Handle Zone Rect */}
            <rect x="380" y="110" width="70" height="30" fill="rgba(168, 85, 247, 0.15)" stroke="#a855f7" strokeWidth="1" strokeDasharray="2 2" rx="4" />
            <text x="455" y="105" fill="#10b981" fontSize="10" fontWeight="black" className="font-mono">
              컵 상단 림(Rim) 신고가 분출
            </text>
          </g>
        );

      case "FALLING_WEDGE":
        return (
          <g>
            {/* Upper resistance & lower support converging lines */}
            <line x1="60" y1="90" x2="420" y2="185" stroke="#f43f5e" strokeWidth="2.5" />
            <line x1="60" y1="210" x2="420" y2="220" stroke="#06b6d4" strokeWidth="2.5" />
            {/* Price oscillation inside wedge */}
            <path d="M 60,140 L 120,115 L 180,185 L 240,145 L 300,195 L 370,175 L 430,120 L 520,50" fill="none" stroke="#38bdf8" strokeWidth="3" />
            <circle cx="430" cy="120" r="5" fill="#10b981" />
            <text x="435" y="170" fill="#f43f5e" fontSize="10" fontWeight="black" className="font-mono">
              하향 수렴 끝단 상방 대량 분출
            </text>
          </g>
        );

      case "DOUBLE_BOTTOM":
        return (
          <g>
            {/* W-Shape Rebound Path */}
            <path d="M 60,110 L 140,220 L 250,135 L 350,220 L 440,115 L 530,60" fill="none" stroke="#22c55e" strokeWidth="3" />
            {/* Neckline */}
            <line x1="60" y1="135" x2="520" y2="135" stroke="#eab308" strokeWidth="2" strokeDasharray="3 3" />
            {/* Bottom 1 & Bottom 2 markers */}
            <circle cx="140" cy="220" r="6" fill="#22c55e" />
            <circle cx="350" cy="220" r="6" fill="#22c55e" />
            <text x="120" y="238" fill="#22c55e" fontSize="9" fontWeight="bold" className="font-mono">1차 바닥</text>
            <text x="330" y="238" fill="#22c55e" fontSize="9" fontWeight="bold" className="font-mono">2차 바닥 (지존 지지)</text>
            <text x="260" y="128" fill="#eab308" fontSize="10" fontWeight="black" className="font-mono">W자 목선 완전 재탈환</text>
          </g>
        );

      case "ASCENDING_TRIANGLE":
        return (
          <g>
            {/* Horizontal Resistance Upper Line */}
            <line x1="60" y1="105" x2="480" y2="105" stroke="#f43f5e" strokeWidth="2.5" />
            {/* Ascending Support Line */}
            <line x1="60" y1="230" x2="480" y2="105" stroke="#10b981" strokeWidth="2.5" />
            {/* Price Wave */}
            <path d="M 60,230 L 150,105 L 230,190 L 320,105 L 390,135 L 460,105 L 530,45" fill="none" stroke="#38bdf8" strokeWidth="3" />
            <text x="475" y="98" fill="#f43f5e" fontSize="10" fontWeight="black" className="font-mono">
              수평 저항선 돌파 폭발
            </text>
          </g>
        );

      case "BULLISH_FLAG":
        return (
          <g>
            {/* Flagpole */}
            <line x1="60" y1="240" x2="180" y2="90" stroke="#10b981" strokeWidth="5" />
            {/* Flag Channel */}
            <polygon points="180,90 350,120 350,165 180,135" fill="rgba(168, 85, 247, 0.18)" stroke="#a855f7" strokeWidth="2" strokeDasharray="3 3" />
            {/* Flagpole 2 Expansion */}
            <path d="M 350,120 L 480,25" fill="none" stroke="#22c55e" strokeWidth="4" strokeDasharray="4 2" />
            <text x="360" y="70" fill="#22c55e" fontSize="10" fontWeight="black" className="font-mono">
              깃대 길이만큼 2차 대세 상승
            </text>
          </g>
        );

      case "BOX_BREAKOUT":
        return (
          <g>
            {/* Consolidated Box Area */}
            <rect x="60" y="115" width="340" height="100" fill="rgba(6, 182, 212, 0.1)" stroke="#06b6d4" strokeWidth="2" strokeDasharray="4 2" rx="6" />
            {/* Price Wave */}
            <path d="M 60,190 L 130,130 L 200,200 L 280,130 L 350,185 L 400,115 L 510,40" fill="none" stroke="#38bdf8" strokeWidth="3" />
            <text x="415" y="105" fill="#38bdf8" fontSize="10" fontWeight="black" className="font-mono">
              박스권 상단 대량 수급 돌파
            </text>
          </g>
        );

      case "MORNING_STAR":
        return (
          <g>
            {/* Bearish Candle 1 */}
            <rect x="110" y="110" width="22" height="90" fill="#ef4444" rx="2" />
            <line x1="121" y1="90" x2="121" y2="215" stroke="#ef4444" strokeWidth="2" />
            {/* Doji Candle 2 */}
            <line x1="240" y1="190" x2="240" y2="240" stroke="#f59e0b" strokeWidth="2" />
            <rect x="229" y="210" width="22" height="10" fill="#f59e0b" rx="2" />
            {/* Bullish Candle 3 */}
            <rect x="360" y="95" width="22" height="110" fill="#10b981" rx="2" />
            <line x1="371" y1="75" x2="371" y2="220" stroke="#10b981" strokeWidth="2" />
            {/* Confirmation Line */}
            <line x1="60" y1="130" x2="520" y2="130" stroke="#10b981" strokeWidth="2" strokeDasharray="3 3" />
            <text x="390" y="85" fill="#10b981" fontSize="10" fontWeight="black" className="font-mono">
              샛별형 3캔들 하락 반전 확정
            </text>
          </g>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xl relative overflow-hidden">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-amber-400 animate-pulse" />
          <h4 className="text-base font-black text-white flex items-center gap-2 flex-wrap">
            <span>AI 예측 실시간 오버레이 캔버스</span>
            <span className="text-xs font-mono text-cyan-300 bg-cyan-950 border border-cyan-800 px-2 py-0.5 rounded font-bold">
              {name} ({symbol})
            </span>
            <span className="text-xs font-mono text-amber-300 bg-amber-950/80 border border-amber-700/80 px-2 py-0.5 rounded font-bold">
              ⚡ {timeframe} 차트
            </span>
          </h4>
        </div>

        {/* Dynamic Display Toggles */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <button
            type="button"
            onClick={() => setShowRiskRewardBands(!showRiskRewardBands)}
            className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
              showRiskRewardBands ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-400 border border-slate-800"
            }`}
          >
            {showRiskRewardBands ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            <span>손익구간 밴드</span>
          </button>

          <button
            type="button"
            onClick={() => setShowOrderBlocks(!showOrderBlocks)}
            className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
              showOrderBlocks ? "bg-cyan-600 text-white" : "bg-slate-900 text-slate-400 border border-slate-800"
            }`}
          >
            {showOrderBlocks ? <Layers className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            <span>SMC 오더블록</span>
          </button>

          <button
            type="button"
            onClick={() => setShowTrajectory(!showTrajectory)}
            className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
              showTrajectory ? "bg-amber-600 text-white" : "bg-slate-900 text-slate-400 border border-slate-800"
            }`}
          >
            {showTrajectory ? <Sparkles className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            <span>AI 미래 궤적</span>
          </button>

          <button
            type="button"
            onClick={() => setShowMarketSync(!showMarketSync)}
            className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
              showMarketSync ? "bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow ring-1 ring-cyan-400/50" : "bg-slate-900 text-slate-400 border border-slate-800"
            }`}
          >
            <Zap className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
            <span>시장 간 동기화 오버레이</span>
          </button>
        </div>
      </div>

      {/* Pattern Selector Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
        <span className="text-slate-400 font-bold mr-1">8대 패턴:</span>
        {TECHNICAL_PATTERNS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPatternChange && onPatternChange(p.id)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
              patternId === p.id
                ? "bg-indigo-600 text-white shadow-md ring-1 ring-indigo-400"
                : "bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800"
            }`}
          >
            {p.nameKr.split(" ")[0]} ({p.winRate}%)
          </button>
        ))}
      </div>

      {/* Primary Interactive Chart Canvas */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 relative overflow-hidden">
        
        {/* SVG Canvas Container */}
        <svg className="w-full h-88" viewBox="0 0 600 300">
          
          {/* Background Grid Lines */}
          <line x1="40" y1="40" x2="580" y2="40" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="40" y1="90" x2="580" y2="90" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="40" y1="140" x2="580" y2="140" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="40" y1="190" x2="580" y2="190" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="40" y1="240" x2="580" y2="240" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />

          {/* Shaded Profit & Risk Bands */}
          {showRiskRewardBands && (
            <g>
              {/* Profit Target Zone Band */}
              <rect x="40" y="40" width="540" height="100" fill="rgba(16, 185, 129, 0.07)" />
              {/* Stop-Loss Risk Zone Band */}
              <rect x="40" y="210" width="540" height="70" fill="rgba(239, 68, 68, 0.08)" />
            </g>
          )}

          {/* SMC Order Block Area */}
          {showOrderBlocks && (
            <g>
              <rect x="40" y="130" width="540" height="25" fill="rgba(6, 182, 212, 0.12)" stroke="#06b6d4" strokeWidth="1" strokeDasharray="2 2" />
              <text x="50" y="146" fill="#06b6d4" fontSize="9" fontWeight="black" className="font-mono">
                SMC BULLISH ORDER BLOCK [{smlStructure}]
              </text>
            </g>
          )}

          {/* Render Active Technical Pattern Geometry */}
          {renderPatternGeometry(patternId)}

          {/* AI Future Trajectory Projection */}
          {showTrajectory && (
            <g>
              <path d="M 430,126 Q 480,80 540,45" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="3 3" />
              <circle cx="540" cy="45" r="4" fill="#f59e0b" />
              <text x="470" y="55" fill="#f59e0b" fontSize="9" fontWeight="black" className="font-mono">
                AI 상승 궤적
              </text>
            </g>
          )}

          {/* ------------------------------------------------------------- */}
          {/* AI-PREDICTED DASHED TRIGGER & TARGET LINES OVERLAY            */}
          {/* ------------------------------------------------------------- */}

          {/* 1. 🚀 2차 매도선 (TP2 Target Line) */}
          <g>
            <line x1="40" y1="40" x2="580" y2="40" stroke="#a855f7" strokeWidth="2" strokeDasharray="5 3" />
            <rect x="40" y="28" width="200" height="22" fill="#a855f7" rx="5" />
            <text x="48" y="43" fill="#ffffff" fontSize="10" fontWeight="black" className="font-mono">
              🚀 2차 AI 목표가(TP2) @ {formatPrice(tpPrice2)} (+{tp2Return}%)
            </text>
          </g>

          {/* 2. 🎯 1차 매도선 (TP1 Target Line) */}
          <g>
            <line x1="40" y1="90" x2="580" y2="90" stroke="#10b981" strokeWidth="2.5" strokeDasharray="5 3" />
            <rect x="40" y="78" width="200" height="22" fill="#10b981" rx="5" />
            <text x="48" y="93" fill="#ffffff" fontSize="10" fontWeight="black" className="font-mono">
              🎯 1차 AI 목표가(TP1) @ {formatPrice(tpPrice1)} (+{tp1Return}%)
            </text>
          </g>

          {/* 3. 💙 AI 매수선 (Entry Price Line) */}
          <g>
            <line x1="40" y1="140" x2="580" y2="140" stroke="#eab308" strokeWidth="2.5" strokeDasharray="6 3" />
            <rect x="40" y="128" width="190" height="22" fill="#eab308" rx="5" />
            <text x="48" y="143" fill="#000000" fontSize="10" fontWeight="black" className="font-mono">
              💛 AI 매수선 @ {formatPrice(entryPrice)}
            </text>
          </g>

          {/* 4. 🚨 AI 손절선 (SL Risk Line) */}
          <g>
            <line x1="40" y1="210" x2="580" y2="210" stroke="#ef4444" strokeWidth="2.5" strokeDasharray="5 3" />
            <rect x="40" y="198" width="180" height="22" fill="#ef4444" rx="5" />
            <text x="48" y="213" fill="#ffffff" fontSize="10" fontWeight="black" className="font-mono">
              🚨 AI 손절선(SL) @ {formatPrice(slPrice)} (-{slRisk}%)
            </text>
          </g>

          {/* ------------------------------------------------------------- */}
          {/* DYNAMIC ACTION MARKERS OVERLAY (BUY/SELL SIGNALS ON CANVAS)   */}
          {/* ------------------------------------------------------------- */}
          {actionMarkers && actionMarkers.length > 0 && (
            <g className="dynamic-action-markers-layer">
              {actionMarkers.slice(0, 4).map((marker, idx) => {
                // Calculate Y position based on relative price mapping
                const minP = Math.min(price, slPrice) * 0.95;
                const maxP = Math.max(price, tpPrice2) * 1.05;
                const rangeP = maxP - minP || 1;
                const markerY = Math.max(30, Math.min(270, 300 - ((marker.price - minP) / rangeP) * 260));
                const posX = 120 + idx * 115;

                const isBuy = marker.type === "BUY";
                const isSell = marker.type === "SELL";
                const isTp = marker.type === "TAKE_PROFIT";

                const badgeBg = isBuy ? "#10b981" : isSell ? "#f43f5e" : isTp ? "#a855f7" : "#ef4444";
                const badgeStroke = isBuy ? "#34d399" : isSell ? "#f87171" : isTp ? "#c084fc" : "#fca5a5";
                const typeText = isBuy ? "AI 매수 체결" : isSell ? "AI 매도 체결" : isTp ? "AI 익절 감지" : "AI 손절 감지";

                return (
                  <g key={marker.id || idx} className="action-marker-item">
                    {/* Vertical dashed guideline */}
                    <line x1={posX} y1="30" x2={posX} y2="270" stroke={badgeBg} strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
                    
                    {/* Pulsing signal pin */}
                    <circle cx={posX} cy={markerY} r="10" fill={badgeBg} opacity="0.4" className="animate-ping" />
                    <circle cx={posX} cy={markerY} r="6" fill={badgeBg} stroke="#ffffff" strokeWidth="2" />

                    {/* Badge Container */}
                    <g transform={`translate(${posX - 52}, ${markerY > 150 ? markerY - 38 : markerY + 12})`}>
                      <rect x="0" y="0" width="104" height="28" fill="#0f172a" stroke={badgeStroke} strokeWidth="1.5" rx="6" />
                      <text x="6" y="12" fill={badgeBg} fontSize="9" fontWeight="black" className="font-mono">
                        {typeText} [{marker.timestamp}]
                      </text>
                      <text x="6" y="22" fill="#f8fafc" fontSize="9" fontWeight="bold" className="font-mono">
                        @{(marker.price ?? 0).toLocaleString()}원
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>
          )}

          {/* ------------------------------------------------------------- */}
          {/* CROSS-MARKET COUNTERPART DUAL OVERLAY PATH                    */}
          {/* ------------------------------------------------------------- */}
          {showMarketSync && (
            <g className="market-sync-overlay-layer">
              {/* Overlaid Counterpart Wave (Gold/Amber) */}
              <path
                d="M 60,195 Q 120,160 170,185 Q 240,140 300,120 Q 370,135 430,95 Q 480,75 530,45"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.5"
                strokeDasharray="4 2"
                opacity="0.9"
              />
              {/* Counterpart Indicator Badge */}
              <g transform="translate(360, 48)">
                <rect x="0" y="0" width="180" height="26" fill="#1e1b4b" stroke="#f59e0b" strokeWidth="1.5" rx="6" />
                <text x="8" y="12" fill="#fbbf24" fontSize="9" fontWeight="black" className="font-mono">
                  ⚡ {counterpartInfo.name}
                </text>
                <text x="8" y="21" fill="#67e8f9" fontSize="8" fontWeight="bold" className="font-mono">
                  스프레드 {counterpartInfo.spread} ({counterpartInfo.lead} 선행)
                </text>
              </g>
            </g>
          )}

          {/* ------------------------------------------------------------- */}
          {/* AUTONOMOUS TRADING EXECUTION OVERLAY SIGNALS                  */}
          {/* ------------------------------------------------------------- */}
          {isAutoTradingActive && (
            <g>
              {/* Auto Trading Entry Pulse Signal */}
              <g className="animate-pulse">
                <circle cx="280" cy="140" r="16" fill="#10b981" opacity="0.35" />
                <circle cx="280" cy="140" r="9" fill="#10b981" />
                <rect x="230" y="156" width="120" height="20" fill="#065f46" stroke="#34d399" strokeWidth="1.5" rx="5" />
                <text x="236" y="170" fill="#34d399" fontSize="9" fontWeight="black" className="font-mono">
                  ⚡ AI 자율매수 체결 완료
                </text>
              </g>

              {/* Auto Trading TP Target Zone Signal */}
              <g className="animate-pulse">
                <circle cx="490" cy="90" r="14" fill="#3b82f6" opacity="0.35" />
                <circle cx="490" cy="90" r="7" fill="#3b82f6" />
                <rect x="430" y="104" width="120" height="20" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="1.5" rx="5" />
                <text x="436" y="118" fill="#60a5fa" fontSize="9" fontWeight="black" className="font-mono">
                  🎯 자율익절 감시 구역
                </text>
              </g>
            </g>
          )}

        </svg>
      </div>

      {/* Summary Footer Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
        <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-center">
          <span className="text-[10px] text-slate-400 block font-bold">감지 패턴 승률</span>
          <span className="text-emerald-400 font-black">{currentPattern.winRate}%</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-center">
          <span className="text-[10px] text-slate-400 block font-bold">기대 손익비</span>
          <span className="text-amber-300 font-black">1 : 3.4</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-center">
          <span className="text-[10px] text-slate-400 block font-bold">마스터 퀀트 점수</span>
          <span className="text-cyan-300 font-black">{quantScore}점</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-center">
          <span className="text-[10px] text-slate-400 block font-bold">자율매매 연동</span>
          <span className={isAutoTradingActive ? "text-emerald-400 font-black" : "text-slate-500"}>
            {isAutoTradingActive ? "실시간 연동중" : "OFF"}
          </span>
        </div>
      </div>

    </div>
  );
};
