import React, { useMemo, useState } from "react";
import { Activity, AlertTriangle, ChevronRight, Loader2, Play, Radar, ShieldCheck, Target, TrendingUp } from "lucide-react";
import { useApp } from "../context/AppContext";
import { evaluateVerifiedSignal, type VerifiedSignalResult } from "../scanner/verifiedSignalEngine";

interface UniverseItem {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  market: "KOREA" | "US" | "BTC";
  volume?: number;
  tradingValue?: number;
}

interface PrecheckCandidate extends UniverseItem { result: VerifiedSignalResult; }

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeMarket(raw: unknown, symbol: string): "KOREA" | "US" | "BTC" {
  const m = String(raw || "").toUpperCase();
  if (m === "BTC" || m === "UPBIT" || symbol.startsWith("KRW-")) return "BTC";
  if (m === "US") return "US";
  return "KOREA";
}

function compactPrice(value: number): string {
  return Number.isFinite(value) ? Math.round(value).toLocaleString("ko-KR") : "-";
}

async function fetchUniverse(): Promise<UniverseItem[]> {
  const merged = new Map<string, UniverseItem>();
  try {
    const res = await fetch("/api/realtime/small-mid-cap-universe", { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      const rows = Array.isArray(json?.data) ? json.data : [];
      for (const row of rows) {
        const symbol = String(row?.symbol || "").trim();
        const price = num(row?.price);
        if (!symbol || price <= 0) continue;
        merged.set(symbol, {
          symbol,
          name: String(row?.name || row?.realStockName || symbol),
          price,
          changePct: num(row?.changePct),
          market: "KOREA",
          volume: num(row?.volume),
          tradingValue: num(row?.tradingValue),
        });
      }
    }
  } catch (error) {
    console.warn("[PrecheckScanner] small-mid universe unavailable", error);
  }

  try {
    const res = await fetch("/api/stocks", { cache: "no-store" });
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows)) {
        for (const row of rows) {
          const symbol = String(row?.symbol || "").trim();
          const price = num(row?.price);
          if (!symbol || price <= 0) continue;
          const market = normalizeMarket(row?.market, symbol);
          if (market === "BTC") continue;
          merged.set(symbol, {
            symbol,
            name: String(row?.name || symbol),
            price,
            changePct: num(row?.changePct),
            market,
            volume: num(row?.volume),
            tradingValue: num(row?.tradingValue),
          });
        }
      }
    }
  } catch (error) {
    console.warn("[PrecheckScanner] /api/stocks unavailable", error);
  }
  return Array.from(merged.values());
}

async function analyzePrecheck(item: UniverseItem): Promise<PrecheckCandidate | null> {
  const res = await fetch(`/api/market/realtime-candles?symbol=${encodeURIComponent(item.symbol)}&timeframe=D&count=70`, { cache: "no-store" });
  if (!res.ok) return null;
  const json = await res.json();
  if (json?.dataStatus === "NO_DATA" || !Array.isArray(json?.candles) || json.candles.length === 0) return null;
  const result = evaluateVerifiedSignal(json.candles);
  return result ? { ...item, result } : null;
}

export const VerifiedAiOpportunityScanner: React.FC = () => {
  const { setSelectedSymbol, addToast } = useApp() as any;
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<PrecheckCandidate[]>([]);
  const [lastScanAt, setLastScanAt] = useState("");
  const [scanError, setScanError] = useState("");

  const passCount = useMemo(() => results.filter((x) => x.result.decision === "BUY_APPROVED").length, [results]);
  const watchCount = useMemo(() => results.filter((x) => x.result.decision === "BUY_WATCH").length, [results]);

  const handleScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanError("");
    setProgress({ current: 0, total: 0 });
    try {
      const universe = await fetchUniverse();
      if (!universe.length) throw new Error("실시간 종목 유니버스를 불러오지 못했습니다.");
      const shortlist = [...universe].sort((a, b) => {
        const liquidityA = Math.log10(Math.max(1, a.tradingValue || a.volume || 1));
        const liquidityB = Math.log10(Math.max(1, b.tradingValue || b.volume || 1));
        const activityA = Math.min(8, Math.abs(a.changePct));
        const activityB = Math.min(8, Math.abs(b.changePct));
        return liquidityB + activityB - (liquidityA + activityA);
      }).slice(0, 24);

      setProgress({ current: 0, total: shortlist.length });
      const analyzed: PrecheckCandidate[] = [];
      for (let i = 0; i < shortlist.length; i += 4) {
        const batch = shortlist.slice(i, i + 4);
        const settled = await Promise.allSettled(batch.map(analyzePrecheck));
        for (const item of settled) if (item.status === "fulfilled" && item.value) analyzed.push(item.value);
        setProgress({ current: Math.min(i + batch.length, shortlist.length), total: shortlist.length });
      }
      analyzed.sort((a, b) => b.result.score - a.result.score);
      setResults(analyzed);
      setLastScanAt(new Date().toLocaleTimeString("ko-KR"));
      addToast?.({ type: "INFO", title: "PRECHECK 완료", message: `사전검증 ${analyzed.length}종목 · V20 최종검증 대기 ${analyzed.filter((x) => x.result.decision !== "NO_BUY").length}종목` });
    } catch (error: any) {
      const message = error?.message || "PRECHECK 중 오류가 발생했습니다.";
      setScanError(message);
      addToast?.({ type: "ERROR", title: "PRECHECK 실패", message });
    } finally {
      setIsScanning(false);
    }
  };

  const selectCandidate = (candidate: PrecheckCandidate) => {
    setSelectedSymbol?.(candidate.symbol);
    window.dispatchEvent(new CustomEvent("verified-ai-candidate-selected", { detail: {
      symbol: candidate.symbol,
      precheckScore: candidate.result.score,
      precheckDecision: candidate.result.decision,
      finalAuthority: "SERVER_V20",
    } }));
  };

  const topFive = results.filter((x) => x.result.decision !== "NO_BUY").slice(0, 5);

  return (
    <section className="w-full border-b border-slate-800 bg-slate-950 text-white">
      <div className="mx-auto max-w-[1600px] px-4 py-5 md:px-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-300"><Radar size={15} /> Market PRECHECK Scanner</div>
            <h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">실데이터 후보 압축</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-400">여기서 통과해도 BUY가 아닙니다. 실제 BUY는 서버 V20의 1m/3m/5m/D True MTF, 실행 가능한 패턴, RS/RVOL/VWAP/FLOW, 성과DB를 모두 통과해야 합니다.</p>
          </div>
          <button type="button" onClick={handleScan} disabled={isScanning} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-6 py-4 font-black text-slate-950 disabled:opacity-50">
            {isScanning ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} fill="currentColor" />}{isScanning ? "PRECHECK 중" : "시장 PRECHECK 시작"}
          </button>
        </div>

        {progress.total > 0 && <div className="mt-5"><div className="mb-2 flex items-center justify-between text-xs text-slate-400"><span>사전검증 진행</span><span>{progress.current} / {progress.total}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-cyan-400 transition-all" style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }} /></div></div>}
        {scanError && <div className="mt-4 flex gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"><AlertTriangle size={18} /><span>{scanError}</span></div>}

        {!isScanning && results.length > 0 && <>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="PRECHECK 완료" value={`${results.length}`} icon={<Activity size={17} />} />
            <Stat label="V20 검증대기" value={`${passCount}`} icon={<ShieldCheck size={17} />} />
            <Stat label="관찰대기" value={`${watchCount}`} icon={<Target size={17} />} />
            <Stat label="마지막 스캔" value={lastScanAt || "-"} icon={<Radar size={17} />} />
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-5">
            {topFive.length === 0 ? <div className="xl:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-center text-slate-400">현재 V20 최종검증으로 보낼 후보가 없습니다. 빈 자리를 억지로 채우지 않습니다.</div> : topFive.map((candidate, index) => <CandidateCard key={candidate.symbol} rank={index + 1} candidate={candidate} onSelect={() => selectCandidate(candidate)} />)}
          </div>
        </>}
      </div>
    </section>
  );
};

const Stat: React.FC<{ label: string; value: string; icon: React.ReactNode }> = ({ label, value, icon }) => <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3"><div className="flex items-center gap-2 text-xs text-slate-400">{icon}{label}</div><div className="mt-1 text-xl font-black text-white">{value}</div></div>;

const CandidateCard: React.FC<{ rank: number; candidate: PrecheckCandidate; onSelect: () => void }> = ({ rank, candidate, onSelect }) => {
  const { result } = candidate;
  const ready = result.decision === "BUY_APPROVED";
  return <button type="button" onClick={onSelect} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-left hover:border-cyan-400/60">
    <div className="flex items-start justify-between gap-2"><div><div className="text-xs font-bold text-slate-500">PRECHECK {rank} · {candidate.market}</div><div className="mt-1 truncate font-black">{candidate.name}</div><div className="text-xs text-slate-400">{candidate.symbol}</div></div><div className={`rounded-xl px-2.5 py-1 text-xs font-black ${ready ? "bg-cyan-300 text-slate-950" : "bg-amber-300 text-amber-950"}`}>{ready ? "V20 검증대기" : "관찰"}</div></div>
    <div className="mt-4 flex items-end justify-between"><div><div className="text-xs text-slate-500">PRECHECK SCORE</div><div className="text-3xl font-black text-cyan-300">{result.score}</div></div><div className="text-right"><div className="text-sm font-bold">{compactPrice(result.metrics.close)}</div><div className="text-xs text-slate-400">RVOL {result.metrics.rvol.toFixed(2)}x</div></div></div>
    <div className="mt-4 space-y-1.5">{result.reasons.slice(0, 3).map((reason) => <div key={reason} className="flex items-start gap-1.5 text-xs text-slate-300"><TrendingUp size={13} className="mt-0.5 text-cyan-400" /><span>{reason}</span></div>)}</div>
    <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3 text-xs font-bold text-cyan-300"><span>최종 BUY 아님 · V20 확인 필요</span><ChevronRight size={16} /></div>
  </button>;
};
