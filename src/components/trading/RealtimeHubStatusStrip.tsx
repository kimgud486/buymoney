import React, { useEffect, useMemo, useState } from "react";
import {
  LiveMarketQuote,
  realtimeMarketFeedService,
} from "../../services/realtimeMarketFeedService";

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

type ClientFeedStatus = {
  KOREA: number;
  US: number;
  UPBIT: number;
  total: number;
  fresh: number;
  stale: number;
  lastQuoteAt: number | null;
};

function timeLabel(timestamp: number | null | undefined): string {
  if (!timestamp || !Number.isFinite(timestamp)) return "-";
  return new Date(timestamp).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function normalizeMarket(market: LiveMarketQuote["market"]): "KOREA" | "US" | "UPBIT" {
  if (market === "UPBIT") return "UPBIT";
  if (market === "US") return "US";
  return "KOREA";
}

function buildClientStatus(quotesMap: Map<string, LiveMarketQuote>): ClientFeedStatus {
  const unique = new Map<string, LiveMarketQuote>();
  quotesMap.forEach((quote) => {
    if (!quote?.symbol) return;
    const market = normalizeMarket(quote.market);
    unique.set(`${market}:${quote.symbol.toUpperCase()}`, quote);
  });

  let KOREA = 0;
  let US = 0;
  let UPBIT = 0;
  let fresh = 0;
  let stale = 0;
  let lastQuoteAt: number | null = null;
  const now = Date.now();

  unique.forEach((quote) => {
    const market = normalizeMarket(quote.market);
    if (market === "KOREA") KOREA += 1;
    else if (market === "US") US += 1;
    else UPBIT += 1;

    const receivedAt = Number(quote.receivedAt) || 0;
    const ageMs = receivedAt > 0 ? Math.max(0, now - receivedAt) : Number.POSITIVE_INFINITY;
    const isFresh = quote.status === "LIVE" && quote.price != null && quote.price > 0 && ageMs <= 15_000;
    if (isFresh) fresh += 1;
    else stale += 1;
    if (receivedAt > 0) lastQuoteAt = Math.max(lastQuoteAt || 0, receivedAt);
  });

  return {
    KOREA,
    US,
    UPBIT,
    total: unique.size,
    fresh,
    stale,
    lastQuoteAt,
  };
}

export default function RealtimeHubStatusStrip() {
  const [serverStatus, setServerStatus] = useState<RealtimeHubStatusPayload | null>(null);
  const [clientStatus, setClientStatus] = useState<ClientFeedStatus>(() => ({
    KOREA: 0,
    US: 0,
    UPBIT: 0,
    total: 0,
    fresh: 0,
    stale: 0,
    lastQuoteAt: null,
  }));
  const [serverUnavailable, setServerUnavailable] = useState(false);

  useEffect(() => {
    const unsubscribe = realtimeMarketFeedService.subscribe((quotesMap) => {
      setClientStatus(buildClientStatus(quotesMap));
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    let alive = true;
    let activeController: AbortController | null = null;

    const load = async () => {
      activeController?.abort();
      const controller = new AbortController();
      activeController = controller;
      try {
        const response = await fetch("/api/explainable-scanner?market=ALL&aiExplain=true", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP_${response.status}`);
        const payload = (await response.json()) as ScannerStatusEnvelope;
        const next = payload.hubStatus ?? payload.runtimeStatus ?? null;
        if (!alive || controller.signal.aborted) return;
        setServerStatus(next);
        setServerUnavailable(!next);
      } catch (error: any) {
        if (!alive || error?.name === "AbortError") return;
        setServerStatus(null);
        setServerUnavailable(true);
      }
    };

    void load();
    const timer = window.setInterval(() => void load(), 10_000);
    return () => {
      alive = false;
      activeController?.abort();
      window.clearInterval(timer);
    };
  }, []);

  const warmProgress = useMemo(() => {
    if (!serverStatus || serverStatus.warming.requested <= 0) return null;
    const done = serverStatus.warming.warmed1m + serverStatus.warming.warmed15m;
    const total = serverStatus.warming.requested * 2;
    return Math.min(100, Math.max(0, Math.round((done / total) * 100)));
  }, [serverStatus]);

  const hasClientFeed = clientStatus.total > 0;
  const effectiveFresh = serverStatus?.quotes.fresh ?? clientStatus.fresh;
  const effectiveStale = serverStatus?.quotes.stale ?? clientStatus.stale;
  const effectiveLastQuoteAt = serverStatus?.lastQuoteAt ?? clientStatus.lastQuoteAt;
  const effectiveHealth: RealtimeHubStatusPayload["health"] = serverStatus?.health
    ?? (clientStatus.fresh > 0 ? (clientStatus.stale > 0 ? "DEGRADED" : "HEALTHY") : "NO_DATA");

  const healthLabel = effectiveHealth === "HEALTHY"
    ? "🟢 데이터 정상"
    : effectiveHealth === "DEGRADED"
      ? "🟡 일부 지연"
      : "⚪ 데이터 없음";

  const marketCount = (market: "KOREA" | "US" | "UPBIT") => {
    if (serverStatus) return serverStatus.quotes[market];
    return clientStatus[market];
  };

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("aistock-runtime-hub-status", {
      detail: {
        health: effectiveHealth,
        fresh: effectiveFresh,
        stale: effectiveStale,
        lastQuoteAt: effectiveLastQuoteAt,
        hasData: effectiveFresh > 0,
        source: serverStatus ? "SERVER_HUB" : hasClientFeed ? "CLIENT_FEED" : "NO_DATA",
      },
    }));
  }, [effectiveHealth, effectiveFresh, effectiveStale, effectiveLastQuoteAt, serverStatus, hasClientFeed]);

  return (
    <section
      aria-label="실시간 데이터 허브 상태"
      data-testid="realtime-hub-status-strip"
      className="mx-2 mt-2 rounded-xl border border-slate-700/60 bg-slate-950/70 px-3 py-2 text-xs text-slate-200 shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <strong className="text-sm text-white">📡 실시간 데이터 허브</strong>
        <span>{healthLabel}</span>
        <span>국내 {marketCount("KOREA")}</span>
        <span>미국 {marketCount("US")}</span>
        <span>업비트 {marketCount("UPBIT")}</span>
        <span>실시간 {effectiveFresh}</span>
        <span>지연/검증대기 {effectiveStale}</span>
        <span>워밍 1분 {serverStatus ? serverStatus.warming.warmed1m : "-"}</span>
        <span>15분 {serverStatus ? serverStatus.warming.warmed15m : "-"}</span>
        <span>실패 {serverStatus ? serverStatus.warming.failed : "-"}</span>
        <span>워밍 진행 {warmProgress == null ? "-" : `${warmProgress}%`}</span>
        <span>시세 갱신 {timeLabel(effectiveLastQuoteAt)}</span>
      </div>

      {serverUnavailable && hasClientFeed && (
        <div className="mt-1 text-[11px] text-cyan-300/80">
          서버 허브 통계는 대기 중이지만, 화면의 실시간 시세 피드에서 실제 수신 상태를 확인하고 있습니다.
        </div>
      )}
      {serverUnavailable && !hasClientFeed && (
        <div className="mt-1 text-[11px] text-slate-400">
          서버와 화면 시세 피드 모두 아직 실제 상태값을 주지 않았습니다. 숫자를 임의로 만들지 않습니다.
        </div>
      )}
    </section>
  );
}
