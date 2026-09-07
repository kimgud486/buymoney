import React, { useEffect, useState, useRef, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { Wifi, WifiOff, AlertTriangle, Activity, Zap, RefreshCw, ShieldAlert, Radio } from "lucide-react";
import { realtimeMarketStreamManager, NormalizedMarketTick } from "../services/RealtimeMarketStreamManager";

interface PriceAlert {
  id: string;
  symbol: string;
  name: string;
  market: string;
  oldPrice: number;
  newPrice: number;
  shiftPct: number;
  timestamp: string;
  message: string;
}

export const RealtimeMarketStreamManager: React.FC = () => {
  const { addToast } = useApp();
  const [streamStats, setStreamStats] = useState(realtimeMarketStreamManager.getStatus());
  const [activeAlerts, setActiveAlerts] = useState<PriceAlert[]>([]);

  useEffect(() => {
    // 1. Subscribe to Manager Status Updates
    const unsubscribeStatus = realtimeMarketStreamManager.subscribeStatus((st) => {
      setStreamStats(st);
    });

    // 2. Subscribe to Normalized Market Ticks (< 100ms sync)
    const unsubscribeTick = realtimeMarketStreamManager.subscribeTick((tick: NormalizedMarketTick) => {
      if (Math.abs(tick.changePct) >= 0.5) {
        const alertObj: PriceAlert = {
          id: "alert_" + Date.now() + "_" + Math.random(),
          symbol: tick.symbol,
          name: tick.name,
          market: tick.market,
          oldPrice: Math.round(tick.price / (1 + tick.changePct / 100)),
          newPrice: tick.price,
          shiftPct: tick.changePct,
          timestamp: tick.time,
          message: `⚡ [KIS 0.1초 연동] ${tick.name} (${tick.symbol}) ${(tick.price ?? 0).toLocaleString()}원 (${tick.changePct >= 0 ? "+" : ""}${tick.changePct}%) [지연시간: ${tick.latencyMs}ms]`
        };

        setActiveAlerts((prev) => [alertObj, ...prev.slice(0, 3)]);
      }
    });

    // 3. Listen to price alert update events
    const handleAlertEvent = (e: any) => {
      if (e.detail) {
        const d = e.detail;
        const alertObj: PriceAlert = {
          id: "alert_ev_" + Date.now() + "_" + Math.random(),
          symbol: d.symbol || "",
          name: d.name || d.symbol,
          market: d.market || "KOREA",
          oldPrice: d.oldPrice || d.newPrice,
          newPrice: d.newPrice || 0,
          shiftPct: d.shiftPct || 0,
          timestamp: new Date().toLocaleTimeString("ko-KR"),
          message: d.message || `⚡ [실시간 시세] ${d.name} (${d.symbol}) ${d.newPrice?.toLocaleString()}원`
        };
        setActiveAlerts((prev) => [alertObj, ...prev.slice(0, 3)]);
      }
    };

    window.addEventListener("stock_price_alert_update", handleAlertEvent);

    return () => {
      unsubscribeStatus();
      unsubscribeTick();
      window.removeEventListener("stock_price_alert_update", handleAlertEvent);
    };
  }, []);

  const handleManualReconnect = () => {
    realtimeMarketStreamManager.initStreams();
    if (addToast) {
      addToast({
        title: "⚡ 한국투자증권(KIS) 실시간 소켓 재연결 완료",
        message: "0.1초 초고속 데이터 스트림 파이프라인을 재구성했습니다.",
        type: "INFO"
      });
    }
  };

  if (activeAlerts.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-950/95 border-b border-amber-500/40 px-4 py-2 text-xs text-amber-200 select-none z-50 backdrop-blur-md">
      <div className="max-w-[1920px] mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="flex h-2 w-2 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-extrabold text-[11px] shrink-0 text-amber-300 flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            [KIS 0.1초 실시간 소켓 스트림]
          </span>
          <span className="truncate text-[11px] font-mono text-zinc-200">
            {activeAlerts[0].message}
          </span>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold shrink-0">
            지연속도: {streamStats.averageLatencyMs}ms
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleManualReconnect}
            className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 px-2 py-0.5 rounded cursor-pointer shrink-0 font-bold flex items-center gap-1 transition-colors"
          >
            <RefreshCw className="w-3 h-3 text-amber-400" />
            소켓 재연결
          </button>
          <button
            onClick={() => setActiveAlerts([])}
            className="text-[10px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded cursor-pointer shrink-0 font-bold transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};



