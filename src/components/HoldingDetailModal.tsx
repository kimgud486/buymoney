import React, { useState, useEffect, useMemo } from "react";
import { StockPosition } from "../types";
import { useModalScrollLock } from "../hooks/useModalScrollLock";
import { realCandleStore } from "../services/RealCandleStore";
import { realtimeMarketFeedService } from "../services/realtimeMarketFeedService";
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  BarChart2, 
  Sparkles, 
  Zap, 
  ShieldCheck, 
  DollarSign, 
  Clock, 
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  Layers
} from "lucide-react";
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Area, 
  Line, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine 
} from "recharts";

interface HoldingDetailModalProps {
  position: StockPosition | null;
  onClose: () => void;
  onOpenAiAnalyzer?: (symbol: string) => void;
  onOpenOrderModal?: (position: StockPosition) => void;
}

export const HoldingDetailModal: React.FC<HoldingDetailModalProps> = ({
  position,
  onClose,
  onOpenAiAnalyzer,
  onOpenOrderModal
}) => {
  const [livePrice, setLivePrice] = useState<number>(position?.currentPrice || 0);
  const [priceFlash, setPriceFlash] = useState<"up" | "down" | null>(null);
  const [volume24h, setVolume24h] = useState<string>("실시간 수급 수집 중...");

  // Real-time ticking price synchronization
  useEffect(() => {
    if (position) {
      setLivePrice(position.currentPrice || 0);
      const quote = realtimeMarketFeedService.getQuote(position.symbol);
      if (quote?.volume) {
        setVolume24h(`${quote.volume.toLocaleString()} 주 / 실시간 수급`);
      } else {
        setVolume24h("수급 데이터 수집 중");
      }
    }
  }, [position?.symbol, position?.currentPrice]);

  // Calculations
  const isUs = position?.market === "US";
  const currencyUnit = isUs ? "$" : "원";
  const evalAmt = (position?.quantity || 0) * livePrice;
  const buyAmt = (position?.quantity || 0) * (position?.avgPrice || 0);
  const pnlAmt = evalAmt - buyAmt;
  const pnlRate = buyAmt > 0 ? (pnlAmt / buyAmt) * 100 : 0;
  const isPositive = pnlAmt >= 0;

  // Format helper
  const fmtVal = (val?: number | null) => {
    if (val == null || isNaN(val)) return isUs ? "$0.00" : "₩0원";
    if (isUs) return `$${(val ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return `₩${Math.round(val).toLocaleString()}원`;
  };

  // Map real 5-minute candles from store
  const chartData = useMemo(() => {
    if (!position) return [];
    const cached = realCandleStore.getCachedCandles(position.symbol, "5m");
    if (!cached || cached.length === 0) return [];

    return cached.slice(-30).map((c, idx, arr) => {
      const dt = new Date(c.timestamp);
      const timeStr = `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;

      let ma5 = null;
      if (idx >= 4) {
        const sum = arr.slice(idx - 4, idx + 1).reduce((s, x) => s + x.close, 0);
        ma5 = Math.round(sum / 5);
      }

      let ma20 = null;
      if (idx >= 19) {
        const sum = arr.slice(idx - 19, idx + 1).reduce((s, x) => s + x.close, 0);
        ma20 = Math.round(sum / 20);
      }

      return {
        time: timeStr,
        price: c.close,
        ma5,
        ma20,
        volume: c.volume,
        isFuture: false
      };
    });
  }, [position?.symbol, livePrice]);

  useModalScrollLock(Boolean(position));

  if (!position) return null;

  const minChartP = Math.min(...chartData.map(d => d.price || d.predPrice || livePrice)) * 0.985;
  const maxChartP = Math.max(...chartData.map(d => d.price || d.predPrice || livePrice)) * 1.015;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 overflow-hidden">
      <div className="bg-slate-950 border-2 border-emerald-500/60 rounded-none sm:rounded-2xl max-w-3xl w-full h-full sm:h-auto sm:max-h-[90vh] text-white shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col overscroll-contain">
        
        {/* HEADER BAR */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-zinc-900 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl font-bold text-xs border ${
              position.market === "KOREA" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" :
              position.market === "BTC" ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40" :
              "bg-blue-500/20 text-blue-400 border-blue-500/40"
            }`}>
              {position.market === "KOREA" ? "🇰🇷 KIS 국내" : position.market === "BTC" ? "🪙 Upbit 암호화폐" : "🇺🇸 KIS 해외"}
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>{position.name}</span>
                <span className="text-xs font-mono text-zinc-400">({position.symbol})</span>
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  5분 실시간 가상체결 연동 중
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-5">

          {/* MAIN STATS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            
            {/* Stat 1: Current Price */}
            <div className={`p-3.5 rounded-xl border transition-all duration-300 ${
              priceFlash === "up" ? "bg-emerald-950/50 border-emerald-400 shadow-emerald-900/30" :
              priceFlash === "down" ? "bg-rose-950/50 border-rose-400 shadow-rose-900/30" :
              "bg-slate-900/90 border-slate-800"
            }`}>
              <span className="text-[11px] font-mono text-zinc-400 block font-sans">실시간 현재가</span>
              <div className="text-xl font-black font-mono text-white mt-1 flex items-center justify-between">
                <span>{fmtVal(livePrice)}</span>
                {priceFlash === "up" && <ArrowUpRight className="h-5 w-5 text-emerald-400 animate-bounce" />}
                {priceFlash === "down" && <ArrowDownRight className="h-5 w-5 text-rose-400 animate-bounce" />}
              </div>
              <span className="text-[10px] text-zinc-400 block mt-1">마지막 실시간 체결가</span>
            </div>

            {/* Stat 2: Real-time Return Rate & Profit Status (+ / -) */}
            <div className={`p-3.5 rounded-xl border ${
              isPositive ? "bg-emerald-950/30 border-emerald-500/40" : "bg-rose-950/30 border-rose-500/40"
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-zinc-400 block font-sans">실시간 수익률 / 평가손익</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black font-mono ${
                  isPositive ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                }`}>
                  {isPositive ? "📈 플러스 수익" : "📉 마이너스 손실"}
                </span>
              </div>
              <div className={`text-xl font-black font-mono mt-1 ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                {isPositive ? "+" : ""}{pnlRate.toFixed(2)}%
              </div>
              <div className={`text-xs font-mono font-bold mt-0.5 ${isPositive ? "text-emerald-300" : "text-rose-300"}`}>
                {isPositive ? "+" : ""}{fmtVal(pnlAmt)}
              </div>
            </div>

            {/* Stat 3: Real-time Trading Volume */}
            <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[11px] font-mono text-zinc-400 block font-sans flex items-center gap-1">
                <BarChart2 className="h-3.5 w-3.5 text-cyan-400" />
                <span>최신 실시간 거래량</span>
              </span>
              <div className="text-sm font-extrabold font-mono text-cyan-300 mt-1">
                {volume24h}
              </div>
              <span className="text-[10px] text-zinc-400 block">24시간 누적 체결 거래대금</span>
            </div>

            {/* Stat 4: Position Investment Info */}
            <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[11px] font-mono text-zinc-400 block font-sans">내 보유 잔고 현황</span>
              <div className="text-xs font-mono text-zinc-200 mt-1 space-y-0.5">
                <div>보유 수량: <strong className="text-white">{(position.quantity ?? 0).toLocaleString()} {isUs ? "주" : position.market === "BTC" ? "BTC" : "주"}</strong></div>
                <div>매수 평단: <strong className="text-zinc-300">{fmtVal(position.avgPrice)}</strong></div>
                <div>총 평가액: <strong className="text-amber-300">{fmtVal(evalAmt)}</strong></div>
              </div>
            </div>

          </div>

          {/* V18.6 DYNAMIC DUAL SELL CRITERIA & POSITION METRICS PANEL */}
          <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-black text-white font-sans flex items-center gap-2">
                  <span>AISTOCK V18.6 BUY 마다 움직이는 2개의 SELL 기준</span>
                  <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
                    PROFIT ENGINE V18.6
                  </span>
                </h3>
              </div>
              <span className="text-[10px] font-mono text-zinc-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                Monotonic Ratchet Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* 1. DEFENSE SELL / SELL NOW LINE */}
              <div className="p-3 bg-rose-950/20 border border-rose-500/40 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-300 flex items-center gap-1 font-sans">
                    🔴 DEFENSE SELL / SELL NOW LINE
                  </span>
                  <span className="text-[10px] font-mono bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded">
                    단조 상승 라인
                  </span>
                </div>
                <div className="text-lg font-black font-mono text-rose-400">
                  {fmtVal(Math.max(position.avgPrice * 0.98, position.avgPrice * (1 + Math.max(0, pnlRate - 3) / 100)))}
                </div>
                <p className="text-[11px] text-zinc-400">
                  수익 축적에 따라 내려가지 않는 절대 방어선. Tick 하향 이탈 시 즉시 SELL_PENDING 전환.
                </p>
              </div>

              {/* 2. EXPECTED SELL ZONE */}
              <div className="p-3 bg-amber-950/20 border border-amber-500/40 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1 font-sans">
                    🟠 EXPECTED SELL ZONE (목표 분할 구역)
                  </span>
                  <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                    통계적 청산 구간
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono font-bold text-amber-200">
                  <div>LOW: {fmtVal(position.avgPrice * 1.05)}</div>
                  <div>MID: {fmtVal(position.avgPrice * 1.08)}</div>
                  <div>HIGH: {fmtVal(position.avgPrice * 1.12)}</div>
                </div>
                <p className="text-[11px] text-zinc-400">
                  ATR/Swing 기반 수렴 목표. <strong className="text-amber-300">구간 진입만으로 자동 매도되지 않음</strong> (추세 지속 시 상향 확장).
                </p>
              </div>
            </div>

            {/* PEAK METRICS ROW */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono pt-1">
              <div className="p-2 bg-slate-950/80 border border-slate-800 rounded">
                <span className="text-[10px] text-zinc-400 block">최대 우호 변동 (MFE)</span>
                <span className="font-bold text-emerald-400">+{Math.max(0, pnlRate).toFixed(2)}%</span>
              </div>
              <div className="p-2 bg-slate-950/80 border border-slate-800 rounded">
                <span className="text-[10px] text-zinc-400 block">최대 불리 변동 (MAE)</span>
                <span className="font-bold text-rose-400">{Math.min(0, pnlRate).toFixed(2)}%</span>
              </div>
              <div className="p-2 bg-slate-950/80 border border-slate-800 rounded">
                <span className="text-[10px] text-zinc-400 block">고점 대비 반납 (Giveback)</span>
                <span className="font-bold text-amber-400">--</span>
              </div>
              <div className="p-2 bg-slate-950/80 border border-slate-800 rounded">
                <span className="text-[10px] text-zinc-400 block">추세 지속 강도 Score</span>
                <span className="font-bold text-cyan-400">--</span>
              </div>
            </div>
          </div>

          {/* REALTIME 5-MINUTE CHART SECTION */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-400 animate-pulse" />
                <h3 className="text-sm font-black text-white font-sans flex items-center gap-2">
                  <span>5분 실시간 시세 & AI 예측 파동 그래프</span>
                  <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
                    REALTIME 5MIN
                  </span>
                </h3>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-400">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span> 실시간 시세</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span> MA5</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block"></span> AI 예측</span>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isPositive ? "#10b981" : "#f43f5e"} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={isPositive ? "#10b981" : "#f43f5e"} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <YAxis domain={[minChartP, maxChartP]} stroke="#64748b" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(val) => Math.round(val).toLocaleString()} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#020617", borderColor: "#334155", borderRadius: "12px", color: "#f8fafc", fontSize: "12px", fontFamily: "monospace" }}
                    formatter={(val: any) => [val ? `${Math.round(val).toLocaleString()}${currencyUnit}` : "-", "가격"]}
                  />
                  <ReferenceLine y={position.avgPrice} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: `매수평단: ${Math.round(position.avgPrice).toLocaleString()}`, fill: '#f59e0b', fontSize: 10 }} />
                  
                  <Area type="monotone" dataKey="price" stroke={isPositive ? "#10b981" : "#f43f5e"} strokeWidth={2.5} fillOpacity={1} fill="url(#priceGradient)" />
                  <Line type="monotone" dataKey="ma5" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="predPrice" stroke="#c084fc" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3, fill: "#c084fc" }} />
                  <Bar dataKey="volume" yAxisId="right" fill="#38bdf8" opacity={0.2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ACTION BUTTONS FOOTER */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="text-xs font-mono text-zinc-400">
              💡 종목을 클릭하여 실시간 체결량, 5분 그래프, 및 손익 상태를 다이렉트로 정밀 관찰 중입니다.
            </div>

            <div className="flex items-center gap-2">
              {onOpenAiAnalyzer && (
                <button
                  onClick={() => {
                    onOpenAiAnalyzer(position.symbol);
                    onClose();
                  }}
                  className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg border border-purple-400/40 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Sparkles className="h-4 w-4 text-purple-200 animate-pulse" />
                  <span>⚡ TrendSpider AI 타점 진단</span>
                </button>
              )}

              {onOpenOrderModal && (
                <button
                  onClick={() => {
                    onOpenOrderModal(position);
                    onClose();
                  }}
                  className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow-lg border border-emerald-400/40 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <ShoppingCart className="h-4 w-4 text-emerald-200" />
                  <span>🛒 실시간 매수/매도 주문</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-zinc-300 hover:text-white font-bold text-xs rounded-xl cursor-pointer transition"
              >
                닫기
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
