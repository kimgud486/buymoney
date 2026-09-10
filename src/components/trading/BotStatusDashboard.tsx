import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  RefreshCw,
  Server,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wallet,
  XCircle
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { realtimeMarketFeedService, LiveMarketQuote } from "../../services/realtimeMarketFeedService";

export interface ActiveBotStatus {
  id: string;
  name: string;
  strategyType: string;
  market: "KOREA" | "US" | "BTC";
  status: "ACTIVE" | "IDLE" | "OFFLINE" | "UNKNOWN" | "ERROR";
  lastHeartbeatAt: number | null;
  activeSymbol?: string;
  activeSymbolName?: string;
}

type FeedSummary = {
  live: number;
  stale: number;
  unavailable: number;
  executionGrade: number;
  newestReceivedAt: number | null;
};

const BOT_DEFINITIONS = [
  { id: "scanner", name: "실시간 스캐너 봇", strategyType: "전종목 스캔 / 후보 선별", market: "KOREA" as const },
  { id: "pattern", name: "패턴 검증 봇", strategyType: "BOS / CHoCH / VWAP / 돌파 패턴", market: "KOREA" as const },
  { id: "risk", name: "리스크 게이트 봇", strategyType: "손실한도 / 주문 차단 / 포지션 위험", market: "KOREA" as const },
  { id: "crypto", name: "업비트 감시 봇", strategyType: "24H 코인 시세 / 모멘텀", market: "BTC" as const },
  { id: "us", name: "미국시장 감시 봇", strategyType: "미국주식 시세 / 추세", market: "US" as const },
  { id: "execution", name: "주문 실행 감시 봇", strategyType: "주문 / 체결 / 상태머신 추적", market: "KOREA" as const }
];

const formatAge = (timestamp: number | null) => {
  if (!timestamp) return "확인 불가";
  const sec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (sec < 60) return `${sec}초 전`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  return `${Math.floor(min / 60)}시간 전`;
};

export const BotStatusDashboard: React.FC = () => {
  const {
    positions = [],
    trades = [],
    cashBreakdown,
    profile,
    brokerApiStatus,
    syncRealAccountBalance,
    decisionLogs = [],
    apiResponseLogs = [],
    isLiveTradingActive
  } = useApp() as any;

  const [isSyncing, setIsSyncing] = useState(false);
  const [feedSummary, setFeedSummary] = useState<FeedSummary>({
    live: 0,
    stale: 0,
    unavailable: 0,
    executionGrade: 0,
    newestReceivedAt: null
  });

  useEffect(() => {
    const update = (quotes: Map<string, LiveMarketQuote>) => {
      const unique = Array.from(new Map(Array.from(quotes.values()).map(q => [`${q.market}:${q.symbol}`, q])).values());
      const newestReceivedAt = unique.reduce<number | null>((latest, q) => {
        if (!q.receivedAt) return latest;
        return latest == null || q.receivedAt > latest ? q.receivedAt : latest;
      }, null);
      setFeedSummary({
        live: unique.filter(q => q.status === "LIVE" && q.isVerified).length,
        stale: unique.filter(q => q.status === "STALE").length,
        unavailable: unique.filter(q => q.status === "UNAVAILABLE").length,
        executionGrade: unique.filter(q => q.trust === "EXECUTION_GRADE" && q.status === "LIVE" && q.isVerified).length,
        newestReceivedAt
      });
    };
    return realtimeMarketFeedService.subscribe(update);
  }, []);

  const stats = useMemo(() => {
    let realizedPnl = 0;
    let winCount = 0;
    let lossCount = 0;
    let evaluatedTrades = 0;

    for (const trade of trades as any[]) {
      if (typeof trade?.pnl === "number" && Number.isFinite(trade.pnl) && trade.pnl !== 0) {
        evaluatedTrades += 1;
        realizedPnl += trade.pnl;
        if (trade.pnl > 0) winCount += 1;
        if (trade.pnl < 0) lossCount += 1;
      } else if (typeof trade?.pnl === "number" && trade.pnl === 0) {
        realizedPnl += 0;
      }
    }

    const unrealizedPnl = (positions as any[]).reduce((sum, pos) => {
      const qty = Number(pos?.quantity ?? pos?.qty ?? 0);
      const avg = Number(pos?.avgPrice ?? pos?.avgBuyPrice ?? 0);
      const current = Number(pos?.currentPrice ?? 0);
      if (!qty || !avg || !current) return sum;
      return sum + (current - avg) * qty;
    }, 0);

    const totalCash = Number(cashBreakdown?.grandTotalCash ?? cashBreakdown?.totalCash ?? 0);
    const grandTotal = Number(cashBreakdown?.grandTotalAssets ?? 0);

    return {
      realizedPnl,
      unrealizedPnl,
      winCount,
      lossCount,
      evaluatedTrades,
      winRate: evaluatedTrades > 0 ? (winCount / evaluatedTrades) * 100 : null,
      totalCash,
      grandTotal
    };
  }, [trades, positions, cashBreakdown]);

  const latestDecisionAt = useMemo(() => {
    let latest = 0;
    for (const log of decisionLogs as any[]) {
      const raw = log?.timestamp ?? log?.createdAt ?? log?.time;
      const parsed = typeof raw === "number" ? raw : Date.parse(raw || "");
      if (Number.isFinite(parsed) && parsed > latest) latest = parsed;
    }
    return latest || null;
  }, [decisionLogs]);

  const latestApiAt = useMemo(() => {
    let latest = 0;
    for (const log of apiResponseLogs as any[]) {
      const parsed = Date.parse(log?.timestamp || "");
      if (Number.isFinite(parsed) && parsed > latest) latest = parsed;
    }
    return latest || null;
  }, [apiResponseLogs]);

  const brokerConnected = brokerApiStatus?.korea === "CONNECTED" || brokerApiStatus?.upbit === "CONNECTED";
  const liveMode = Boolean(profile?.isRealTrade && isLiveTradingActive);
  const feedFresh = Boolean(feedSummary.newestReceivedAt && Date.now() - feedSummary.newestReceivedAt < 10_000);

  const botStatuses: ActiveBotStatus[] = useMemo(() => {
    const now = Date.now();
    const decisionFresh = latestDecisionAt != null && now - latestDecisionAt < 60_000;
    const apiFresh = latestApiAt != null && now - latestApiAt < 60_000;

    return BOT_DEFINITIONS.map(def => {
      let status: ActiveBotStatus["status"] = "UNKNOWN";
      let heartbeat: number | null = null;

      if (def.id === "execution") {
        heartbeat = latestApiAt;
        status = liveMode && brokerConnected && apiFresh ? "ACTIVE" : brokerConnected ? "IDLE" : "OFFLINE";
      } else if (def.id === "risk") {
        heartbeat = latestDecisionAt;
        status = decisionFresh ? "ACTIVE" : latestDecisionAt ? "IDLE" : "UNKNOWN";
      } else if (def.id === "crypto") {
        heartbeat = feedSummary.newestReceivedAt;
        status = feedFresh && feedSummary.live > 0 ? "ACTIVE" : feedSummary.newestReceivedAt ? "IDLE" : "OFFLINE";
      } else {
        heartbeat = latestDecisionAt ?? feedSummary.newestReceivedAt;
        status = decisionFresh || feedFresh ? "ACTIVE" : heartbeat ? "IDLE" : "UNKNOWN";
      }

      return { ...def, status, lastHeartbeatAt: heartbeat };
    });
  }, [latestDecisionAt, latestApiAt, liveMode, brokerConnected, feedFresh, feedSummary]);

  const statusClass = (status: ActiveBotStatus["status"]) => {
    if (status === "ACTIVE") return "text-emerald-400 border-emerald-500/40 bg-emerald-500/10";
    if (status === "IDLE") return "text-cyan-300 border-cyan-500/40 bg-cyan-500/10";
    if (status === "ERROR") return "text-rose-400 border-rose-500/40 bg-rose-500/10";
    if (status === "OFFLINE") return "text-amber-300 border-amber-500/40 bg-amber-500/10";
    return "text-slate-400 border-slate-700 bg-slate-800/40";
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncRealAccountBalance?.("all", false);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <section className="w-full rounded-2xl border border-slate-800 bg-slate-900 p-4 text-slate-100 shadow-xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-2 text-cyan-300">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-black">AI 봇 상태 및 매매 성과 대시보드 · TRUTH MODE</h3>
            <p className="mt-0.5 text-[11px] text-slate-400">실제 heartbeat, 계좌상태, 체결내역, 검증 시세가 있을 때만 LIVE/ACTIVE로 표시합니다.</p>
          </div>
        </div>
        <button onClick={handleSync} disabled={isSyncing} className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} /> 계좌 새로고침
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TruthCard title="실시간 시세" value={feedFresh ? `${feedSummary.live}개 LIVE` : "STALE / 대기"} detail={`Execution-grade ${feedSummary.executionGrade}개 · 최근 ${formatAge(feedSummary.newestReceivedAt)}`} ok={feedFresh} />
        <TruthCard title="증권사 연결" value={brokerConnected ? "CONNECTED" : "DISCONNECTED"} detail={`KIS ${brokerApiStatus?.korea ?? "UNKNOWN"} · Upbit ${brokerApiStatus?.upbit ?? "UNKNOWN"}`} ok={brokerConnected} />
        <TruthCard title="오늘/누적 실현손익" value={`${stats.realizedPnl >= 0 ? "+" : ""}${Math.round(stats.realizedPnl).toLocaleString()}원`} detail={`${stats.evaluatedTrades}건 PnL 기록 기준`} ok={stats.evaluatedTrades > 0} />
        <TruthCard title="승률" value={stats.winRate == null ? "--" : `${stats.winRate.toFixed(1)}%`} detail={stats.winRate == null ? "PnL 기록이 없어 산출하지 않음" : `승 ${stats.winCount} · 패 ${stats.lossCount}`} ok={stats.winRate != null} />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <MetricCard icon={<Wallet className="h-4 w-4" />} label="가용 현금" value={stats.totalCash > 0 ? `${Math.round(stats.totalCash).toLocaleString()}원` : "--"} />
        <MetricCard icon={stats.unrealizedPnl >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />} label="평가손익" value={`${stats.unrealizedPnl >= 0 ? "+" : ""}${Math.round(stats.unrealizedPnl).toLocaleString()}원`} />
        <MetricCard icon={<Server className="h-4 w-4" />} label="총 자산" value={stats.grandTotal > 0 ? `${Math.round(stats.grandTotal).toLocaleString()}원` : "--"} />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="flex items-center gap-1.5 text-xs font-black text-slate-300"><Activity className="h-3.5 w-3.5 text-cyan-400" /> 봇 실제 상태</h4>
          <span className="text-[10px] text-slate-500">고정 ACTIVE 값 사용 안 함</span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {botStatuses.map(bot => (
            <div key={bot.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-black text-white">{bot.name}</div>
                  <div className="mt-0.5 text-[10px] text-slate-500">{bot.strategyType}</div>
                </div>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${statusClass(bot.status)}`}>{bot.status}</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-2 text-[10px] text-slate-400">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> heartbeat</span>
                <span className="font-mono">{formatAge(bot.lastHeartbeatAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!liveMode && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div><strong>실거래 LIVE로 확인되지 않았습니다.</strong> API 키가 존재하는 것만으로 연결 성공으로 간주하지 않습니다. 실제 broker status와 최근 통신 기록이 확인되어야 합니다.</div>
        </div>
      )}
    </section>
  );
};

const TruthCard: React.FC<{ title: string; value: string; detail: string; ok: boolean }> = ({ title, value, detail, ok }) => (
  <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] font-bold text-slate-400">{title}</span>
      {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-amber-400" />}
    </div>
    <div className="mt-1 text-base font-black text-white">{value}</div>
    <div className="mt-1 text-[10px] text-slate-500">{detail}</div>
  </div>
);

const MetricCard: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 p-3">
    <div>
      <div className="text-[10px] font-bold text-slate-500">{label}</div>
      <div className="mt-1 font-mono text-sm font-black text-white">{value}</div>
    </div>
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-cyan-300">{icon}</div>
  </div>
);
