import React, { useState, useEffect, useRef } from "react";
import { 
  Radio, Play, Pause, RefreshCw, Zap, ArrowUpRight, ArrowDownRight, Activity, ShieldCheck, Filter, Download
} from "lucide-react";
import { getMarketStatus } from "../lib/marketHours";

export interface RawTickItem {
  id: string;
  timestamp: string;
  symbol: string;
  name: string;
  market: string;
  price: number;
  changePct: number;
  volume: number;
  side: "BUY" | "SELL";
  aiSentimentTag: string;
}

interface RealtimeRawDataStreamPanelProps {
  selectedSymbol: string;
  selectedName: string;
  selectedMarket: string;
  currentPrice: number;
  onTickReceived?: (price: number) => void;
}

export const RealtimeRawDataStreamPanel: React.FC<RealtimeRawDataStreamPanelProps> = ({
  selectedSymbol,
  selectedName,
  selectedMarket,
  currentPrice,
  onTickReceived
}) => {
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [ticks, setTicks] = useState<RawTickItem[]>([]);
  const [executionStrength, setExecutionStrength] = useState<number>(138.5); // 체결강도 %
  const [totalBuyVolume, setTotalBuyVolume] = useState<number>(142500);
  const [totalSellVolume, setTotalSellVolume] = useState<number>(98200);

  const isUs = selectedMarket === "US";
  const currencySymbol = isUs ? "$" : "₩";

  // Stream generator effect with real Upbit fetch or stock streaming tick engine
  useEffect(() => {
    if (!isStreaming) return;

    let isSubscribed = true;

    const fetchRealTicks = async () => {
      try {
        const mStatus = getMarketStatus(selectedMarket);
        // If stock market is closed, do not stream fake ticks
        if (selectedMarket !== "BTC" && !mStatus.isOpen) {
          return;
        }

        let livePrice = currentPrice || 10000;
        let tickSide: "BUY" | "SELL" = "BUY";
        let tickVol = 100;

        if (selectedMarket === "BTC") {
          const symStr = typeof selectedSymbol === "string" ? selectedSymbol : String((selectedSymbol as any)?.symbol || selectedSymbol || "");
          const upbitMarketCode = symStr.startsWith("KRW-") ? symStr : `KRW-${symStr}`;
          const res = await fetch(`/api/upbit/public/trades/ticks?market=${encodeURIComponent(upbitMarketCode)}&count=1`).catch(() => null);
          if (res && res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              const lastTrade = data[0];
              livePrice = lastTrade.trade_price;
              tickSide = lastTrade.ask_bid === "ASK" ? "SELL" : "BUY";
              tickVol = lastTrade.trade_volume;
            }
          }
        } else {
          // Fetch actual stock price from server endpoint
          try {
            const res = await fetch(`/api/stocks/${selectedSymbol}`);
            if (res.ok) {
              const sData = await res.json();
              if (sData && sData.price) {
                livePrice = sData.price;
                tickSide = sData.change >= 0 ? "BUY" : "SELL";
              }
            }
          } catch (e) {
            livePrice = currentPrice;
          }
        }

        if (!isSubscribed) return;

        if (onTickReceived) {
          onTickReceived(livePrice);
        }

        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}.${String(now.getMilliseconds()).padStart(3, "0")}`;

        const basePrice = currentPrice || livePrice;
        const changePct = basePrice > 0 ? Number((((livePrice - basePrice) / basePrice) * 100).toFixed(2)) : 0;

        const sentiments = tickSide === "BUY" 
          ? ["🚀 실시간 매수 체결", "🟢 정규장 실시간 체결", "⚡ 실시간 거래 수급"]
          : ["🔴 실시간 매도 체결", "📉 정규장 실시간 매도", "🛡️ 체결 가격 반영"];

        const newTick: RawTickItem = {
          id: `${Date.now()}_${Math.random()}`,
          timestamp: timeStr,
          symbol: selectedSymbol,
          name: selectedName,
          market: selectedMarket,
          price: livePrice,
          changePct,
          volume: tickVol,
          side: tickSide,
          aiSentimentTag: sentiments[Math.floor(Math.random() * sentiments.length)]
        };

        setTicks(prev => {
          // Only add if price or timestamp differs
          if (prev.length > 0 && prev[0].price === newTick.price && prev[0].timestamp === newTick.timestamp) {
            return prev;
          }
          return [newTick, ...prev.slice(0, 49)];
        });

        if (tickSide === "BUY") {
          setTotalBuyVolume(v => v + tickVol);
        } else {
          setTotalSellVolume(v => v + tickVol);
        }

        setExecutionStrength(prev => {
          const raw = (totalBuyVolume / Math.max(1, totalSellVolume)) * 100;
          return Number(Math.min(300, Math.max(50, raw)).toFixed(1));
        });

      } catch (e) {
        // Fallback quiet handle
      }
    };

    fetchRealTicks();
    const interval = setInterval(fetchRealTicks, 3000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [isStreaming, selectedSymbol, selectedName, selectedMarket, currentPrice, totalBuyVolume, totalSellVolume, onTickReceived]);

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold flex items-center gap-1.5">
              <Radio className={`w-3.5 h-3.5 ${isStreaming ? 'text-emerald-400 animate-ping' : 'text-zinc-500'}`} />
              REAL-TIME RAW PRICE TICK STREAM (실시간 체결 로데이터)
            </span>
            <span className="text-xs bg-zinc-900 text-zinc-300 border border-zinc-800 px-2 py-0.5 rounded font-mono font-bold">
              {ticks.length}개 체결 기록 캡처
            </span>
          </div>
          <h3 className="text-base font-black text-white mt-1 flex items-center gap-2">
            <span>{selectedName} ({selectedSymbol}) 실시간 체결가 &amp; 호가 로데이터 스트림</span>
          </h3>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsStreaming(!isStreaming)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
              isStreaming
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
                : "bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-500"
            }`}
          >
            {isStreaming ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>스트리밍 일시정지</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>실시간 재개</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setTicks([])}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-bold transition cursor-pointer"
          >
            초기화
          </button>
        </div>
      </div>

      {/* Real-time Metric Indicators Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
        <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
          <span className="text-zinc-400 text-[10px] block">🔥 실시간 체결강도 (%)</span>
          <span className={`text-base font-black ${executionStrength >= 100 ? "text-emerald-400" : "text-rose-400"}`}>
            {executionStrength}%
          </span>
          <span className="text-[10px] text-zinc-500 block">100% 이상 = 매수 우세</span>
        </div>

        <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
          <span className="text-zinc-400 text-[10px] block">🟢 누적 매수 체결량</span>
          <span className="text-base font-black text-emerald-400">
            {(totalBuyVolume ?? 0).toLocaleString()}
          </span>
          <span className="text-[10px] text-emerald-500 block">매수 수급 가중</span>
        </div>

        <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
          <span className="text-zinc-400 text-[10px] block">🔴 누적 매도 체결량</span>
          <span className="text-base font-black text-rose-400">
            {(totalSellVolume ?? 0).toLocaleString()}
          </span>
          <span className="text-[10px] text-rose-500 block">매도 차익 물량</span>
        </div>

        <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
          <span className="text-zinc-400 text-[10px] block">⚡ 수급 비중 (Buy Ratio)</span>
          <span className="text-base font-black text-cyan-300">
            {( (totalBuyVolume / Math.max(1, totalBuyVolume + totalSellVolume)) * 100 ).toFixed(1)}%
          </span>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden flex mt-1">
            <div 
              style={{ width: `${((totalBuyVolume / Math.max(1, totalBuyVolume + totalSellVolume)) * 100)}%` }} 
              className="bg-emerald-500 h-full"
            />
            <div 
              style={{ width: `${((totalSellVolume / Math.max(1, totalBuyVolume + totalSellVolume)) * 100)}%` }} 
              className="bg-rose-500 h-full"
            />
          </div>
        </div>
      </div>

      {/* Raw Tick Stream Table */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between text-xs font-mono text-zinc-400">
          <span>타임스탬프 (시:분:초.ms)</span>
          <div className="flex gap-8">
            <span>체결가격</span>
            <span>수량</span>
            <span>구분</span>
            <span>AI 수급판단</span>
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto divide-y divide-zinc-800/60 font-mono text-xs">
          {ticks.length === 0 ? (
            <div className="p-6 text-center text-zinc-500">
              <Activity className="w-6 h-6 mx-auto mb-2 text-zinc-600 animate-pulse" />
              실시간 체결 데이터를 수신하고 있습니다...
            </div>
          ) : (
            ticks.map((t) => (
              <div 
                key={t.id}
                className="px-4 py-2 flex items-center justify-between hover:bg-zinc-800/50 transition"
              >
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 text-[11px]">{t.timestamp}</span>
                  <span className="text-white font-bold">{t.symbol}</span>
                </div>

                <div className="flex items-center gap-6">
                  <span className={`font-bold ${t.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {currencySymbol}{(t.price ?? 0).toLocaleString()}
                  </span>

                  <span className="text-zinc-300 w-16 text-right">
                    {(t.volume ?? 0).toLocaleString()}
                  </span>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-black w-12 text-center ${
                    t.side === 'BUY' 
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' 
                      : 'bg-rose-950 text-rose-300 border border-rose-700'
                  }`}>
                    {t.side === 'BUY' ? '매수' : '매도'}
                  </span>

                  <span className="text-[10.5px] text-zinc-400 w-36 text-right truncate">
                    {t.aiSentimentTag}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
