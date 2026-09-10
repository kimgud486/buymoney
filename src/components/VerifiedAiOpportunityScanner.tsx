import React, { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ChevronRight,
  Loader2,
  Play,
  Radar,
  ShieldCheck,
  Target,
  TrendingUp
} from "lucide-react";
import { useApp } from "../context/AppContext";

interface FinalTradePlan {
  entry: number | null;
  stop: number | null;
  tp1: number | null;
  tp2: number | null;
  tp3: number | null;
  source: "ATR_STRUCTURE" | "NO_VERIFIED_PLAN";
}

interface RealtimeTruthTelemetry {
  symbol: string;
  source: string | null;
  dataGrade: string | null;
  lastTickAt: number | null;
  latencyMs: number | null;
  candleCount: number;
  latestCandleAt: number | null;
  fresh: boolean;
}

interface ServerFinalDecision {
  symbol: string;
  name: string;
  action: "STRONG_BUY" | "BUY" | "WATCH" | "NO" | "KEEP_HOLD" | "REDUCE" | "EXIT";
  aiScore: number;
  grade: string;
  recommendation: "BUY_CANDIDATE" | "WATCH" | "REJECT";
  verifiedWinRatePct: number | null;
  sampleSize: number;
  profitFactor: number | null;
  expectancyPct: number | null;
  holdScore: number;
  trueMtfPassed: boolean;
  blockers: string[];
  confirmations: string[];
  reasons: string[];
  plan: FinalTradePlan;
  dataCoveragePct: number;
  dataStatus: string;
}

interface PrecheckCandidate {
  symbol: string;
  name: string;
  market: "KR" | "US" | "CRYPTO";
  exchange: "KOSPI" | "KOSDAQ" | "NASDAQ" | "NYSE" | "AMEX" | "UPBIT" | "UNKNOWN";
  currentPrice: number;
  priceChange24hPct: number;
  volume: number;
  tradeValue: number;
  volumeIncreaseRatio: number;
  patternType?: string;
  patternName?: string;
  setupScore?: number;
  grade?: string;
  reasoning?: string;
  metrics?: {
    rs5m?: number;
    rs15m?: number;
    rs1h?: number;
    rs1d?: number;
    vwap?: number;
    ema9?: number;
    ema20?: number;
    ema50?: number;
    atr14?: number;
    rsi14?: number;
    spreadBps?: number;
    orderbookImbalance?: number;
    signedFlow?: number;
  };
  trueMtf?: unknown;
  dataStatus: string;
  finalDecision?: ServerFinalDecision;
  realtimeTruth?: RealtimeTruthTelemetry;
  finalError?: string;
}

function num(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function compactPrice(value: unknown): string {
  const n = num(value);
  return n == null ? "-" : Math.round(n).toLocaleString("ko-KR");
}

function compactLatency(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "N/A";
  if (value < 1000) return `${Math.round(value)}ms`;
  return `${(value / 1000).toFixed(value < 10_000 ? 1 : 0)}s`;
}

function tickTime(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return "N/A";
  return new Date(value).toLocaleTimeString("ko-KR", { hour12: false });
}

function finalLabel(candidate: PrecheckCandidate): ServerFinalDecision["action"] | "VERIFYING" {
  return candidate.finalDecision?.action ?? "VERIFYING";
}

function isFinalBuy(candidate: PrecheckCandidate): boolean {
  const action = candidate.finalDecision?.action;
  return action === "BUY" || action === "STRONG_BUY";
}

async function requestFinalDecision(candidate: PrecheckCandidate): Promise<PrecheckCandidate> {
  const m = candidate.metrics || {};
  const response = await fetch("/api/v20/final-buy-hold", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      candidate: {
        symbol: candidate.symbol,
        name: candidate.name,
        market: candidate.market,
        exchange: candidate.exchange,
        price: candidate.currentPrice,
        changePct: candidate.priceChange24hPct,
        volume: candidate.volume,
        tradeValue: candidate.tradeValue,
        rvol: candidate.volumeIncreaseRatio,
        rs5m: m.rs5m,
        rs15m: m.rs15m,
        rs1h: m.rs1h,
        rs1d: m.rs1d,
        vwap: m.vwap,
        ema9: m.ema9,
        ema20: m.ema20,
        ema50: m.ema50,
        atr14: m.atr14,
        rsi14: m.rsi14,
        spreadBps: m.spreadBps,
        orderbookImbalance: m.orderbookImbalance,
        signedFlow: m.signedFlow,
        patterns: candidate.patternType ? [candidate.patternType] : [],
        trueMtf: candidate.trueMtf,
        dataStatus: candidate.dataStatus
      },
      performanceKey: {
        setup: candidate.patternType || "NO_EXECUTABLE_SETUP",
        symbol: candidate.symbol,
        market: candidate.market
      }
    })
  });

  if (!response.ok) {
    return {
      ...candidate,
      finalError: `FINAL_V20_${response.status}`
    };
  }

  const payload = await response.json();
  if (
    payload?.authority !== "SERVER_V20_FINAL" ||
    payload?.execution !== "DECISION_ONLY" ||
    payload?.realtimeAuthority !== "SERVER_MARKET_HUB" ||
    !payload?.decision
  ) {
    return {
      ...candidate,
      finalError: "INVALID_FINAL_AUTHORITY_RESPONSE"
    };
  }

  return {
    ...candidate,
    finalDecision: payload.decision as ServerFinalDecision,
    realtimeTruth: payload.realtimeTruth as RealtimeTruthTelemetry,
    finalError: undefined
  };
}

export const VerifiedAiOpportunityScanner: React.FC = () => {
  const { setSelectedSymbol, addToast } = useApp() as any;
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<PrecheckCandidate[]>([]);
  const [lastScanAt, setLastScanAt] = useState("");
  const [scanError, setScanError] = useState("");

  const buyCount = useMemo(() => results.filter(isFinalBuy).length, [results]);
  const watchCount = results.length - buyCount;
  const freshCount = useMemo(() => results.filter((x) => x.realtimeTruth?.fresh).length, [results]);

  const handleScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanError("");

    try {
      const res = await fetch("/api/ai/hot-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          marketFilter: "ALL",
          exchangeFilter: "ALL",
          patternFilter: "ALL",
          minYield: 0
        })
      });

      if (!res.ok) throw new Error(`PRECHECK 실패 (${res.status})`);

      const json = await res.json();
      const rows = Array.isArray(json?.hotItems) ? json.hotItems : [];
      const precheck: PrecheckCandidate[] = rows
        .filter((row: any) => row && typeof row.symbol === "string")
        .map((row: any) => ({
          symbol: String(row.symbol),
          name: String(row.name || row.symbol),
          market: row.market === "US" || row.market === "CRYPTO" ? row.market : "KR",
          exchange: ["KOSPI", "KOSDAQ", "NASDAQ", "NYSE", "AMEX", "UPBIT"].includes(row.exchange)
            ? row.exchange
            : "UNKNOWN",
          currentPrice: Number(row.currentPrice),
          priceChange24hPct: num(row.priceChange24hPct) ?? 0,
          volume: num(row.volume) ?? 0,
          tradeValue: num(row.tradeValue) ?? 0,
          volumeIncreaseRatio: num(row.volumeIncreaseRatio) ?? 0,
          patternType: row.patternType ? String(row.patternType) : undefined,
          patternName: row.patternName ? String(row.patternName) : undefined,
          setupScore: num(row.setupScore) ?? undefined,
          grade: row.grade ? String(row.grade) : undefined,
          reasoning: row.reasoning ? String(row.reasoning) : undefined,
          metrics: row.metrics,
          trueMtf: row.trueMtf,
          dataStatus: row.dataStatus ? String(row.dataStatus) : "NO_DATA"
        }))
        .filter((row: PrecheckCandidate) => Number.isFinite(row.currentPrice) && row.currentPrice > 0)
        .sort((a: PrecheckCandidate, b: PrecheckCandidate) => (b.setupScore ?? 0) - (a.setupScore ?? 0))
        .slice(0, 12);

      const finalRows = await Promise.all(precheck.map(requestFinalDecision));
      const ranked = finalRows.sort((a, b) => {
        const buyDelta = Number(isFinalBuy(b)) - Number(isFinalBuy(a));
        if (buyDelta !== 0) return buyDelta;
        const freshDelta = Number(Boolean(b.realtimeTruth?.fresh)) - Number(Boolean(a.realtimeTruth?.fresh));
        if (freshDelta !== 0) return freshDelta;
        return (b.finalDecision?.aiScore ?? b.setupScore ?? 0) - (a.finalDecision?.aiScore ?? a.setupScore ?? 0);
      });

      setResults(ranked);
      setLastScanAt(new Date().toLocaleTimeString("ko-KR"));
      const finalBuyCount = ranked.filter(isFinalBuy).length;
      const realtimeFreshCount = ranked.filter((x) => x.realtimeTruth?.fresh).length;
      addToast?.({
        type: finalBuyCount > 0 ? "SUCCESS" : "INFO",
        title: "SERVER V20 FINAL 완료",
        message: `PRECHECK ${precheck.length}종목 · 실시간 ${realtimeFreshCount} · 최종 BUY ${finalBuyCount} · 억지 TOP5 없음`
      });
    } catch (error: any) {
      const message = error?.message || "SERVER V20 FINAL 스캔 중 오류가 발생했습니다.";
      setScanError(message);
      addToast?.({ type: "ERROR", title: "V20 스캔 실패", message });
    } finally {
      setIsScanning(false);
    }
  };

  const selectCandidate = (candidate: PrecheckCandidate) => {
    setSelectedSymbol?.(candidate.symbol);
    window.dispatchEvent(new CustomEvent("verified-ai-candidate-selected", {
      detail: {
        symbol: candidate.symbol,
        score: candidate.finalDecision?.aiScore ?? null,
        decision: candidate.finalDecision?.action ?? "WATCH",
        finalAuthority: candidate.finalDecision ? "SERVER_V20_FINAL" : "SERVER_V20_PENDING",
        dataStatus: candidate.finalDecision?.dataStatus || candidate.dataStatus,
        source: candidate.realtimeTruth?.source ?? null,
        latencyMs: candidate.realtimeTruth?.latencyMs ?? null,
        fresh: candidate.realtimeTruth?.fresh ?? false
      }
    }));
  };

  const topFive = results
    .filter((x) => isFinalBuy(x) || x.finalDecision?.action === "WATCH")
    .slice(0, 5);

  return (
    <section className="w-full border-b border-slate-800 bg-slate-950 text-white">
      <div className="mx-auto max-w-[1600px] px-4 py-5 md:px-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-300"><Radar size={15} /> SERVER V20 FINAL AUTHORITY</div>
            <h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">AI BUY & HOLD 최종판정</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-400">BUY/STRONG BUY는 `/api/v20/final-buy-hold`의 SERVER_V20_FINAL 응답만 인정합니다. 카드에는 SERVER_MARKET_HUB의 실제 데이터 출처·마지막 틱·지연·캔들 수를 함께 표시합니다.</p>
          </div>
          <button type="button" onClick={handleScan} disabled={isScanning} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-6 py-4 font-black text-slate-950 disabled:opacity-50">
            {isScanning ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} fill="currentColor" />}{isScanning ? "FINAL 검증 중" : "AI BUY & HOLD 스캔"}
          </button>
        </div>

        {scanError && <div className="mt-4 flex gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"><AlertTriangle size={18} /><span>{scanError}</span></div>}

        {!isScanning && results.length > 0 && <>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
            <Stat label="FINAL 검증" value={`${results.length}`} icon={<Activity size={17} />} />
            <Stat label="실시간 FRESH" value={`${freshCount}`} icon={<Radar size={17} />} />
            <Stat label="최종 BUY" value={`${buyCount}`} icon={<ShieldCheck size={17} />} />
            <Stat label="WATCH/미검증" value={`${watchCount}`} icon={<Target size={17} />} />
            <Stat label="마지막 스캔" value={lastScanAt || "-"} icon={<Radar size={17} />} />
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-5">
            {topFive.length === 0 ? <div className="xl:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-center text-slate-400">현재 SERVER_V20_FINAL 기준을 통과한 후보가 없습니다. TOP5를 억지로 채우지 않습니다.</div> : topFive.map((candidate, index) => <CandidateCard key={candidate.symbol} rank={index + 1} candidate={candidate} onSelect={() => selectCandidate(candidate)} />)}
          </div>
        </>}

        {!isScanning && !scanError && lastScanAt && results.length === 0 && <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-center text-slate-400">현재 최종판정 후보 없음. 근거를 만들어 채우지 않습니다.</div>}
      </div>
    </section>
  );
};

const Stat: React.FC<{ label: string; value: string; icon: React.ReactNode }> = ({ label, value, icon }) => <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3"><div className="flex items-center gap-2 text-xs text-slate-400">{icon}{label}</div><div className="mt-1 text-xl font-black text-white">{value}</div></div>;

const CandidateCard: React.FC<{ rank: number; candidate: PrecheckCandidate; onSelect: () => void }> = ({ rank, candidate, onSelect }) => {
  const decision = finalLabel(candidate);
  const buy = isFinalBuy(candidate);
  const final = candidate.finalDecision;
  const truth = candidate.realtimeTruth;
  return <button type="button" onClick={onSelect} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-left hover:border-cyan-400/60">
    <div className="flex items-start justify-between gap-2"><div><div className="text-xs font-bold text-slate-500">TOP {rank} · {candidate.market}</div><div className="mt-1 truncate font-black">{candidate.name}</div><div className="text-xs text-slate-400">{candidate.symbol}</div></div><div className={`rounded-xl px-2.5 py-1 text-xs font-black ${buy ? "bg-emerald-400 text-emerald-950" : "bg-amber-300 text-amber-950"}`}>{decision}</div></div>
    <div className="mt-4 flex items-end justify-between"><div><div className="text-xs text-slate-500">FINAL AI SCORE</div><div className="text-3xl font-black text-cyan-300">{final?.aiScore ?? "-"}</div></div><div className="text-right"><div className="text-sm font-bold">{compactPrice(candidate.currentPrice)}</div><div className="text-xs text-slate-400">RVOL {candidate.volumeIncreaseRatio > 0 ? `${candidate.volumeIncreaseRatio.toFixed(2)}x` : "N/A"}</div></div></div>
    <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
      <div className="flex items-center justify-between gap-2 text-[11px] font-black"><span className={truth?.fresh ? "text-emerald-300" : "text-amber-300"}>{truth?.fresh ? "REALTIME FRESH" : "STALE / NO LIVE TICK"}</span><span className="text-slate-500">{truth?.dataGrade ?? "NO_DATA"}</span></div>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-400">
        <div>SOURCE <span className="text-slate-200">{truth?.source ?? "N/A"}</span></div>
        <div>LATENCY <span className="text-slate-200">{compactLatency(truth?.latencyMs)}</span></div>
        <div>LAST TICK <span className="text-slate-200">{tickTime(truth?.lastTickAt)}</span></div>
        <div>CANDLES <span className="text-slate-200">{truth?.candleCount ?? 0}</span></div>
      </div>
    </div>
    <div className="mt-4 space-y-1.5">
      {candidate.patternName && <div className="flex items-start gap-1.5 text-xs text-slate-300"><TrendingUp size={13} className="mt-0.5 text-cyan-400" /><span>{candidate.patternName}</span></div>}
      <div className="text-xs text-slate-400">MTF {final?.trueMtfPassed ? "PASS" : "NOT PASSED"} · 표본 {final?.sampleSize ?? 0} · 승률 {final?.verifiedWinRatePct == null ? "N/A" : `${final.verifiedWinRatePct.toFixed(1)}%`}</div>
      <div className="text-xs text-slate-400">PF {final?.profitFactor == null ? "N/A" : final.profitFactor.toFixed(2)} · EV {final?.expectancyPct == null ? "N/A" : `${final.expectancyPct.toFixed(2)}%`}</div>
      {final?.plan?.source === "ATR_STRUCTURE" && <div className="text-xs text-emerald-300">ENTRY {compactPrice(final.plan.entry)} · STOP {compactPrice(final.plan.stop)} · TP1 {compactPrice(final.plan.tp1)} · TP2 {compactPrice(final.plan.tp2)} · TP3 {compactPrice(final.plan.tp3)}</div>}
      {candidate.finalError && <div className="text-xs text-amber-300">최종검증 미완료: {candidate.finalError}</div>}
      {final?.blockers?.length ? <div className="text-[11px] text-slate-500">BLOCK: {final.blockers.slice(0, 3).join(" · ")}</div> : null}
    </div>
    <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3 text-xs font-bold text-cyan-300"><span>{final ? "SERVER_V20_FINAL · SERVER_MARKET_HUB" : "FINAL 검증대기"}</span><ChevronRight size={16} /></div>
  </button>;
};