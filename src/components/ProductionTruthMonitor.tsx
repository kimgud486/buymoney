import React, { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Database, Radio, ShieldCheck, XCircle } from "lucide-react";
import { useApp } from "../context/AppContext";
import { LiveMarketQuote, realtimeMarketFeedService } from "../services/realtimeMarketFeedService";

type TruthState = "LIVE" | "STALE" | "NO_DATA" | "DISCONNECTED" | "UNKNOWN";

type TruthItem = {
  label: string;
  state: TruthState;
  detail: string;
};

const stateClass: Record<TruthState, string> = {
  LIVE: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  STALE: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  NO_DATA: "border-slate-700 bg-slate-800/50 text-slate-400",
  DISCONNECTED: "border-rose-500/40 bg-rose-500/10 text-rose-300",
  UNKNOWN: "border-slate-700 bg-slate-800/50 text-slate-400"
};

export const ProductionTruthMonitor: React.FC = () => {
  const {
    brokerApiStatus,
    apiResponseLogs = [],
    decisionLogs = [],
    positions = [],
    trades = [],
    profile,
    isLiveTradingActive
  } = useApp() as any;

  const [quotes, setQuotes] = useState<LiveMarketQuote[]>([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => realtimeMarketFeedService.subscribe(map => setQuotes(Array.from(map.values()))), []);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const uniqueQuotes = useMemo(() => {
    const map = new Map<string, LiveMarketQuote>();
    for (const quote of quotes) map.set(`${quote.market}:${quote.symbol}`, quote);
    return Array.from(map.values());
  }, [quotes]);

  const newestQuote = useMemo(() => uniqueQuotes.reduce<number | null>((latest, q) => {
    if (!q.receivedAt) return latest;
    return latest == null || q.receivedAt > latest ? q.receivedAt : latest;
  }, null), [uniqueQuotes]);

  const quoteAge = newestQuote == null ? null : now - newestQuote;
  const verifiedLiveCount = uniqueQuotes.filter(q => q.status === "LIVE" && q.isVerified).length;
  const executionGradeCount = uniqueQuotes.filter(q => q.status === "LIVE" && q.isVerified && q.trust === "EXECUTION_GRADE").length;

  const latestApiLogAt = useMemo(() => {
    let max = 0;
    for (const log of apiResponseLogs as any[]) {
      const ts = Date.parse(log?.timestamp || "");
      if (Number.isFinite(ts) && ts > max) max = ts;
    }
    return max || null;
  }, [apiResponseLogs]);

  const latestDecisionAt = useMemo(() => {
    let max = 0;
    for (const log of decisionLogs as any[]) {
      const raw = log?.timestamp ?? log?.createdAt ?? log?.time;
      const ts = typeof raw === "number" ? raw : Date.parse(raw || "");
      if (Number.isFinite(ts) && ts > max) max = ts;
    }
    return max || null;
  }, [decisionLogs]);

  const brokerConnected = brokerApiStatus?.korea === "CONNECTED" || brokerApiStatus?.upbit === "CONNECTED";
  const liveMode = Boolean(profile?.isRealTrade && isLiveTradingActive);

  const items: TruthItem[] = [
    {
      label: "시세 데이터",
      state: newestQuote == null ? "NO_DATA" : quoteAge != null && quoteAge < 10_000 && verifiedLiveCount > 0 ? "LIVE" : "STALE",
      detail: newestQuote == null ? "수신 데이터 없음" : `검증 LIVE ${verifiedLiveCount}개 · 최근 ${Math.floor((quoteAge || 0) / 1000)}초 전`
    },
    {
      label: "주문용 시세",
      state: executionGradeCount > 0 && quoteAge != null && quoteAge < 5_000 ? "LIVE" : executionGradeCount > 0 ? "STALE" : "NO_DATA",
      detail: `EXECUTION_GRADE ${executionGradeCount}개`
    },
    {
      label: "증권사 통신",
      state: brokerConnected ? "LIVE" : "DISCONNECTED",
      detail: `KIS ${brokerApiStatus?.korea ?? "UNKNOWN"} · Upbit ${brokerApiStatus?.upbit ?? "UNKNOWN"}`
    },
    {
      label: "LIVE 주문모드",
      state: liveMode && brokerConnected ? "LIVE" : liveMode ? "DISCONNECTED" : "NO_DATA",
      detail: liveMode ? "실거래 모드 요청됨" : "실거래 모드 아님"
    },
    {
      label: "AI 판단 로그",
      state: latestDecisionAt == null ? "NO_DATA" : now - latestDecisionAt < 60_000 ? "LIVE" : "STALE",
      detail: latestDecisionAt == null ? "최근 판단 로그 없음" : `최근 ${Math.floor((now - latestDecisionAt) / 1000)}초 전`
    },
    {
      label: "계좌/체결 데이터",
      state: positions.length > 0 || trades.length > 0 || latestApiLogAt != null ? "LIVE" : "NO_DATA",
      detail: `보유 ${positions.length} · 체결기록 ${trades.length}`
    }
  ];

  const unsafe = items.some(item => item.state === "DISCONNECTED" || item.state === "STALE");

  return (
    <div className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 px-3 py-2 backdrop-blur">
      <div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-2">
        <div className="mr-1 flex items-center gap-1.5 text-xs font-black text-white">
          <ShieldCheck className="h-4 w-4 text-cyan-400" /> TRUTH MONITOR
        </div>
        {items.map(item => (
          <div key={item.label} title={item.detail} className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-bold ${stateClass[item.state]}`}>
            {item.state === "LIVE" ? <CheckCircle2 className="h-3 w-3" /> : item.state === "DISCONNECTED" ? <XCircle className="h-3 w-3" /> : item.state === "STALE" ? <AlertTriangle className="h-3 w-3" /> : <Database className="h-3 w-3" />}
            <span>{item.label}</span>
            <span className="font-mono opacity-80">{item.state}</span>
          </div>
        ))}
        <div className={`ml-auto flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-black ${unsafe ? "border-amber-500/40 bg-amber-500/10 text-amber-300" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"}`}>
          {unsafe ? <AlertTriangle className="h-3 w-3" /> : <Radio className="h-3 w-3" />}
          {unsafe ? "검증 필요" : "표시 데이터 정상"}
        </div>
      </div>
    </div>
  );
};
