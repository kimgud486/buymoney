import React, { useEffect, useMemo, useState } from "react";
import { Activity, Bitcoin, Radio, RefreshCw, ShieldCheck, Wifi, WifiOff } from "lucide-react";
import {
  realtimeMarketStreamManager,
  type NormalizedMarketTick,
} from "../services/RealtimeMarketStreamManager";

type StreamStatus = ReturnType<typeof realtimeMarketStreamManager.getStatus>;

function formatKrw(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "실시간 시세 대기중";
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function formatNumber(value: number | null, maximumFractionDigits = 2): string {
  if (value === null || !Number.isFinite(value)) return "-";
  return value.toLocaleString("ko-KR", { maximumFractionDigits });
}

export const RealtimeBitcoinPanel: React.FC = () => {
  const [tick, setTick] = useState<NormalizedMarketTick | null>(null);
  const [status, setStatus] = useState<StreamStatus>(realtimeMarketStreamManager.getStatus());
  const [lastReceivedAt, setLastReceivedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const unsubscribeTick = realtimeMarketStreamManager.subscribeTick((nextTick) => {
      if (nextTick.market !== "UPBIT") return;
      if (nextTick.symbol !== "BTC") return;
      if (!Number.isFinite(nextTick.price) || nextTick.price <= 0) return;
      setTick(nextTick);
      setLastReceivedAt(Date.now());
    });

    const unsubscribeStatus = realtimeMarketStreamManager.subscribeStatus(setStatus);
    const timer = window.setInterval(() => setNow(Date.now()), 1000);

    return () => {
      unsubscribeTick();
      unsubscribeStatus();
      window.clearInterval(timer);
    };
  }, []);

  const quoteAgeMs = lastReceivedAt === null ? null : Math.max(0, now - lastReceivedAt);
  const isFresh = quoteAgeMs !== null && quoteAgeMs <= 10_000;
  const isConnected = status.upbitWsStatus === "CONNECTED";

  const sourceLabel = useMemo(() => {
    if (!tick) return "UPBIT 연결 대기";
    if (tick.feedSource === "UPBIT_WS") return "UPBIT WebSocket";
    return tick.feedSource;
  }, [tick]);

  const changeClass = !tick
    ? "text-slate-500"
    : tick.changePct > 0
      ? "text-rose-600"
      : tick.changePct < 0
        ? "text-blue-600"
        : "text-slate-600";

  return (
    <section className="w-full border-b border-slate-200 bg-white px-3 py-3 sm:px-4">
      <div className="mx-auto max-w-[1920px] rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-amber-50/30 p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <Bitcoin className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-black text-slate-900 sm:text-base">비트코인 실시간 시세</h2>
                <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500">KRW-BTC</span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${isConnected && isFresh ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {isConnected && isFresh ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                  {isConnected && isFresh ? "LIVE" : status.upbitWsStatus}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <strong className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{formatKrw(tick?.price ?? null)}</strong>
                <span className={`text-sm font-extrabold ${changeClass}`}>
                  {tick ? `${tick.changePct >= 0 ? "+" : ""}${tick.changePct.toFixed(2)}%` : "-"}
                </span>
                <span className={`text-xs font-bold ${changeClass}`}>
                  {tick ? `${tick.change >= 0 ? "+" : ""}${Math.round(tick.change).toLocaleString("ko-KR")}원` : "-"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[620px]">
            <Metric label="고가" value={formatKrw(tick?.highPrice ?? null)} />
            <Metric label="저가" value={formatKrw(tick?.lowPrice ?? null)} />
            <Metric label="누적 거래량" value={formatNumber(tick?.accumulatedVolume ?? null, 4)} />
            <Metric label="지연" value={tick ? `${tick.latencyMs}ms` : "-"} />
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2 border-t border-slate-200 pt-3 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1 font-bold text-slate-700"><Radio className="h-3.5 w-3.5" /> {sourceLabel}</span>
            <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> 0 이하 가격·잘못된 tick 제외</span>
            <span className="inline-flex items-center gap-1"><Activity className="h-3.5 w-3.5" /> 마지막 수신 {quoteAgeMs === null ? "대기중" : `${(quoteAgeMs / 1000).toFixed(1)}초 전`}</span>
          </div>
          <button
            type="button"
            onClick={() => realtimeMarketStreamManager.initStreams()}
            className="inline-flex w-fit items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-bold text-slate-600 transition hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            비트 시세 재연결
          </button>
        </div>
      </div>
    </section>
  );
};

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
    <div className="mt-0.5 truncate text-xs font-black text-slate-800 sm:text-sm">{value}</div>
  </div>
);
