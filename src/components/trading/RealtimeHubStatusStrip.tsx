import React, { useEffect, useMemo, useState } from "react";

interface RealtimeHubStatusPayload {
  generatedAt: number;
  subscriptions: { KOREA: number; US: number; UPBIT: number; total: number };
  quotes: { KOREA: number; US: number; UPBIT: number; total: number; fresh: number; stale: number };
  warming: {
    requested: number;
    warmed1m: number;
    warmed15m: number;
    failed: number;
    lastWarmAt: number | null;
  };
  health: "HEALTHY" | "DEGRADED" | "NO_DATA";
  lastQuoteAt: number | null;
}

interface ScannerStatusEnvelope {
  hubStatus?: RealtimeHubStatusPayload;
  runtimeStatus?: RealtimeHubStatusPayload;
}

function timeLabel(timestamp: number | null | undefined): string {
  if (!timestamp || !Number.isFinite(timestamp)) return "-";
  return new Date(timestamp).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function RealtimeHubStatusStrip() {
  const [status, setStatus] = useState<RealtimeHubStatusPayload | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const response = await fetch("/api/explainable-scanner?market=ALL&aiExplain=true", {
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`HTTP_${response.status}`);
        const payload = (await response.json()) as ScannerStatusEnvelope;
        const next = payload.hubStatus ?? payload.runtimeStatus ?? null;
        if (!alive) return;
        setStatus(next);
        setUnavailable(!next);
      } catch {
        if (!alive) return;
        setStatus(null);
        setUnavailable(true);
      }
    };

    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  const warmProgress = useMemo(() => {
    if (!status || status.warming.requested <= 0) return null;
    const done = status.warming.warmed1m + status.warming.warmed15m;
    const total = status.warming.requested * 2;
    return Math.min(100, Math.max(0, Math.round((done / total) * 100)));
  }, [status]);

  const healthLabel = status?.health === "HEALTHY"
    ? "🟢 데이터 정상"
    : status?.health === "DEGRADED"
      ? "🟡 일부 지연"
      : "⚪ 데이터 없음";

  const n = (value: number | undefined) => status ? value ?? 0 : "-";

  return (
    <section
      aria-label="실시간 데이터 허브 상태"
      className="mx-2 mt-2 rounded-xl border border-slate-700/60 bg-slate-950/70 px-3 py-2 text-xs text-slate-200 shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <strong className="text-sm text-white">📡 실시간 데이터 허브</strong>
        <span>{healthLabel}</span>
        <span>구독 국내 {n(status?.subscriptions.KOREA)}</span>
        <span>미국 {n(status?.subscriptions.US)}</span>
        <span>업비트 {n(status?.subscriptions.UPBIT)}</span>
        <span>실시간 {n(status?.quotes.fresh)}</span>
        <span>지연/검증대기 {n(status?.quotes.stale)}</span>
        <span>워밍 1분 {n(status?.warming.warmed1m)}</span>
        <span>15분 {n(status?.warming.warmed15m)}</span>
        <span>실패 {n(status?.warming.failed)}</span>
        <span>워밍 진행 {warmProgress == null ? "-" : `${warmProgress}%`}</span>
        <span>시세 갱신 {timeLabel(status?.lastQuoteAt)}</span>
      </div>
      {unavailable && (
        <div className="mt-1 text-[11px] text-slate-400">
          서버 상태값을 아직 받지 못했습니다. 숫자를 임의로 표시하지 않습니다.
        </div>
      )}
    </section>
  );
}
