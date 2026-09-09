import React, { useMemo, useState } from "react";
import { Activity, AlertTriangle, ChevronRight, Loader2, Play, Radar, ShieldCheck, Target, TrendingUp } from "lucide-react";
import { useApp } from "../context/AppContext";

interface FinalCandidate {
  symbol: string;
  name: string;
  market: string;
  exchange?: string;
  currentPrice: number;
  priceChange24hPct?: number;
  patternName?: string;
  volumeIncreaseRatio?: number;
  setupScore?: number;
  grade?: string;
  reasoning?: string;
  metrics?: {
    rs15m?: number;
    vwap?: number;
    ema9?: number;
    ema20?: number;
    ema50?: number;
    atr14?: number;
    rsi14?: number;
  };
  dataStatus?: string;
}

function num(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function compactPrice(value: unknown): string {
  const n = num(value);
  return n == null ? "-" : Math.round(n).toLocaleString("ko-KR");
}

function labelFor(candidate: FinalCandidate): "BUY" | "WATCH" {
  const score = num(candidate.setupScore) ?? 0;
  const verified = candidate.dataStatus === "REALTIME_VERIFIED";
  return verified && score >= 76 ? "BUY" : "WATCH";
}

export const VerifiedAiOpportunityScanner: React.FC = () => {
  const { setSelectedSymbol, addToast } = useApp() as any;
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<FinalCandidate[]>([]);
  const [lastScanAt, setLastScanAt] = useState("");
  const [scanError, setScanError] = useState("");

  const buyCount = useMemo(() => results.filter((x) => labelFor(x) === "BUY").length, [results]);
  const watchCount = results.length - buyCount;

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

      if (!res.ok) {
        throw new Error(`V20 서버 스캔 실패 (${res.status})`);
      }

      const json = await res.json();
      const rows = Array.isArray(json?.hotItems) ? json.hotItems : [];
      const verifiedRows: FinalCandidate[] = rows
        .filter((row: any) => row && typeof row.symbol === "string")
        .map((row: any) => ({
          symbol: String(row.symbol),
          name: String(row.name || row.symbol),
          market: String(row.market || "UNKNOWN"),
          exchange: row.exchange ? String(row.exchange) : undefined,
          currentPrice: Number(row.currentPrice),
          priceChange24hPct: num(row.priceChange24hPct) ?? undefined,
          patternName: row.patternName ? String(row.patternName) : undefined,
          volumeIncreaseRatio: num(row.volumeIncreaseRatio) ?? undefined,
          setupScore: num(row.setupScore) ?? undefined,
          grade: row.grade ? String(row.grade) : undefined,
          reasoning: row.reasoning ? String(row.reasoning) : undefined,
          metrics: row.metrics,
          dataStatus: row.dataStatus ? String(row.dataStatus) : undefined
        }))
        .filter((row: FinalCandidate) => Number.isFinite(row.currentPrice) && row.currentPrice > 0)
        .sort((a: FinalCandidate, b: FinalCandidate) => (b.setupScore ?? 0) - (a.setupScore ?? 0));

      setResults(verifiedRows);
      setLastScanAt(new Date().toLocaleTimeString("ko-KR"));
      addToast?.({
        type: buyCount > 0 ? "SUCCESS" : "INFO",
        title: "SERVER V20 스캔 완료",
        message: `서버 판정 ${verifiedRows.length}종목 · BUY 후보 ${verifiedRows.filter((x) => labelFor(x) === "BUY").length}종목`
      });
    } catch (error: any) {
      const message = error?.message || "SERVER V20 스캔 중 오류가 발생했습니다.";
      setScanError(message);
      addToast?.({ type: "ERROR", title: "V20 스캔 실패", message });
    } finally {
      setIsScanning(false);
    }
  };

  const selectCandidate = (candidate: FinalCandidate) => {
    setSelectedSymbol?.(candidate.symbol);
    window.dispatchEvent(new CustomEvent("verified-ai-candidate-selected", {
      detail: {
        symbol: candidate.symbol,
        score: candidate.setupScore ?? null,
        decision: labelFor(candidate),
        finalAuthority: "SERVER_V20",
        dataStatus: candidate.dataStatus || "UNKNOWN"
      }
    }));
  };

  const topFive = results.filter((x) => labelFor(x) !== "WATCH" || (x.setupScore ?? 0) >= 62).slice(0, 5);

  return (
    <section className="w-full border-b border-slate-800 bg-slate-950 text-white">
      <div className="mx-auto max-w-[1600px] px-4 py-5 md:px-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-300"><Radar size={15} /> SERVER V20 FINAL SCANNER</div>
            <h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">서버 단일권한 AI 종목 스캔</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-400">브라우저가 BUY를 만들지 않습니다. production 서버 V20 결과만 표시하며, 데이터·패턴·MTF 근거가 부족하면 WATCH 또는 빈 결과로 유지합니다.</p>
          </div>
          <button type="button" onClick={handleScan} disabled={isScanning} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-6 py-4 font-black text-slate-950 disabled:opacity-50">
            {isScanning ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} fill="currentColor" />}{isScanning ? "SERVER V20 스캔 중" : "SERVER V20 전체 스캔"}
          </button>
        </div>

        {scanError && <div className="mt-4 flex gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"><AlertTriangle size={18} /><span>{scanError}</span></div>}

        {!isScanning && results.length > 0 && <>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="SERVER V20 결과" value={`${results.length}`} icon={<Activity size={17} />} />
            <Stat label="BUY 후보" value={`${buyCount}`} icon={<ShieldCheck size={17} />} />
            <Stat label="WATCH" value={`${watchCount}`} icon={<Target size={17} />} />
            <Stat label="마지막 스캔" value={lastScanAt || "-"} icon={<Radar size={17} />} />
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-5">
            {topFive.length === 0 ? <div className="xl:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-center text-slate-400">현재 V20 기준을 통과한 후보가 없습니다. TOP5를 억지로 채우지 않습니다.</div> : topFive.map((candidate, index) => <CandidateCard key={candidate.symbol} rank={index + 1} candidate={candidate} onSelect={() => selectCandidate(candidate)} />)}
          </div>
        </>}

        {!isScanning && !scanError && lastScanAt && results.length === 0 && <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-center text-slate-400">현재 SERVER V20 통과 후보 없음. 데이터나 근거를 만들어 채우지 않습니다.</div>}
      </div>
    </section>
  );
};

const Stat: React.FC<{ label: string; value: string; icon: React.ReactNode }> = ({ label, value, icon }) => <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3"><div className="flex items-center gap-2 text-xs text-slate-400">{icon}{label}</div><div className="mt-1 text-xl font-black text-white">{value}</div></div>;

const CandidateCard: React.FC<{ rank: number; candidate: FinalCandidate; onSelect: () => void }> = ({ rank, candidate, onSelect }) => {
  const decision = labelFor(candidate);
  const buy = decision === "BUY";
  return <button type="button" onClick={onSelect} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-left hover:border-cyan-400/60">
    <div className="flex items-start justify-between gap-2"><div><div className="text-xs font-bold text-slate-500">TOP {rank} · {candidate.market}</div><div className="mt-1 truncate font-black">{candidate.name}</div><div className="text-xs text-slate-400">{candidate.symbol}</div></div><div className={`rounded-xl px-2.5 py-1 text-xs font-black ${buy ? "bg-emerald-400 text-emerald-950" : "bg-amber-300 text-amber-950"}`}>{decision}</div></div>
    <div className="mt-4 flex items-end justify-between"><div><div className="text-xs text-slate-500">V20 SCORE</div><div className="text-3xl font-black text-cyan-300">{candidate.setupScore ?? "-"}</div></div><div className="text-right"><div className="text-sm font-bold">{compactPrice(candidate.currentPrice)}</div><div className="text-xs text-slate-400">RVOL {candidate.volumeIncreaseRatio != null ? `${candidate.volumeIncreaseRatio.toFixed(2)}x` : "N/A"}</div></div></div>
    <div className="mt-4 space-y-1.5">
      {candidate.patternName && <div className="flex items-start gap-1.5 text-xs text-slate-300"><TrendingUp size={13} className="mt-0.5 text-cyan-400" /><span>{candidate.patternName}</span></div>}
      {candidate.reasoning && <div className="text-xs text-slate-400">{candidate.reasoning}</div>}
      <div className="text-[11px] text-slate-500">DATA {candidate.dataStatus || "UNKNOWN"} · GRADE {candidate.grade || "-"}</div>
    </div>
    <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3 text-xs font-bold text-cyan-300"><span>SERVER V20 판정</span><ChevronRight size={16} /></div>
  </button>;
};
