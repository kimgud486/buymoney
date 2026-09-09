import React, { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Play,
  Radar,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import {
  evaluateVerifiedSignal,
  type VerifiedSignalResult,
} from "../scanner/verifiedSignalEngine";

interface UniverseItem {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  market: "KOREA" | "US" | "BTC";
  volume?: number;
  tradingValue?: number;
}

interface ScannedCandidate extends UniverseItem {
  result: VerifiedSignalResult;
}

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
  if (!Number.isFinite(value)) return "-";
  return Math.round(value).toLocaleString("ko-KR");
}

async function fetchUniverse(): Promise<UniverseItem[]> {
  const merged = new Map<string, UniverseItem>();

  try {
    const res = await fetch("/api/realtime/small-mid-cap-universe");
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
    console.warn("[VerifiedScanner] small-mid universe unavailable", error);
  }

  try {
    const res = await fetch("/api/stocks");
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows)) {
        for (const row of rows) {
          const symbol = String(row?.symbol || "").trim();
          const price = num(row?.price);
          if (!symbol || price <= 0) continue;
          const market = normalizeMarket(row?.market, symbol);
          // This scanner is intentionally limited to stocks. Crypto gets a separate risk model.
          if (market === "BTC") continue;
          merged.set(symbol, {
            symbol,
            name: String(row?.name || symbol),
            price,
            changePct: num(row?.changePct),
            market,
            volume: num(row?.volume),
            tradingValue: num(row?.tradingValue ?? row?.marketCap),
          });
        }
      }
    }
  } catch (error) {
    console.warn("[VerifiedScanner] /api/stocks unavailable", error);
  }

  return Array.from(merged.values());
}

async function analyzeItem(item: UniverseItem): Promise<ScannedCandidate | null> {
  const res = await fetch(
    `/api/market/realtime-candles?symbol=${encodeURIComponent(item.symbol)}&timeframe=D&count=70`,
  );
  if (!res.ok) return null;
  const json = await res.json();
  if (!Array.isArray(json?.candles)) return null;
  const result = evaluateVerifiedSignal(json.candles);
  return result ? { ...item, result } : null;
}

export const VerifiedAiOpportunityScanner: React.FC = () => {
  const { setSelectedSymbol, addToast } = useApp() as any;
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<ScannedCandidate[]>([]);
  const [lastScanAt, setLastScanAt] = useState<string>("");
  const [scanError, setScanError] = useState<string>("");

  const approved = useMemo(
    () => results.filter((x) => x.result.decision === "BUY_APPROVED"),
    [results],
  );
  const watch = useMemo(
    () => results.filter((x) => x.result.decision === "BUY_WATCH"),
    [results],
  );

  const handleScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanError("");
    setProgress({ current: 0, total: 0 });

    try {
      const universe = await fetchUniverse();
      if (!universe.length) {
        throw new Error("실시간 종목 유니버스를 불러오지 못했습니다.");
      }

      // Keep the scan responsive and avoid hammering the candle endpoint.
      // Priority is liquidity + meaningful price movement, not a fabricated AI score.
      const shortlist = [...universe]
        .sort((a, b) => {
          const liquidityA = Math.log10(Math.max(1, a.tradingValue || a.volume || 1));
          const liquidityB = Math.log10(Math.max(1, b.tradingValue || b.volume || 1));
          const activityA = Math.min(8, Math.abs(a.changePct));
          const activityB = Math.min(8, Math.abs(b.changePct));
          return liquidityB + activityB - (liquidityA + activityA);
        })
        .slice(0, 24);

      setProgress({ current: 0, total: shortlist.length });
      const analyzed: ScannedCandidate[] = [];
      const concurrency = 4;

      for (let i = 0; i < shortlist.length; i += concurrency) {
        const batch = shortlist.slice(i, i + concurrency);
        const batchResults = await Promise.allSettled(batch.map(analyzeItem));
        for (const settled of batchResults) {
          if (settled.status === "fulfilled" && settled.value) analyzed.push(settled.value);
        }
        setProgress({ current: Math.min(i + batch.length, shortlist.length), total: shortlist.length });
      }

      analyzed.sort((a, b) => {
        const rank = { BUY_APPROVED: 2, BUY_WATCH: 1, NO_BUY: 0 } as const;
        const decisionDiff = rank[b.result.decision] - rank[a.result.decision];
        if (decisionDiff !== 0) return decisionDiff;
        return b.result.score - a.result.score;
      });

      setResults(analyzed);
      setLastScanAt(new Date().toLocaleTimeString("ko-KR"));

      const yesCount = analyzed.filter((x) => x.result.decision === "BUY_APPROVED").length;
      addToast?.({
        type: yesCount > 0 ? "SUCCESS" : "INFO",
        title: "검증형 AI 스캔 완료",
        message: `검증 ${analyzed.length}종목 · BUY APPROVED ${yesCount}종목`,
      });
    } catch (error: any) {
      const message = error?.message || "스캔 중 오류가 발생했습니다.";
      setScanError(message);
      addToast?.({ type: "ERROR", title: "AI 스캔 실패", message });
    } finally {
      setIsScanning(false);
    }
  };

  const selectCandidate = (candidate: ScannedCandidate) => {
    setSelectedSymbol?.(candidate.symbol);
    window.dispatchEvent(
      new CustomEvent("verified-ai-candidate-selected", {
        detail: {
          symbol: candidate.symbol,
          score: candidate.result.score,
          decision: candidate.result.decision,
        },
      }),
    );
  };

  const topFive = results
    .filter((x) => x.result.decision !== "NO_BUY")
    .slice(0, 5);

  return (
    <section className="w-full bg-slate-950 text-white border-b border-slate-800">
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
          <div>
            <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold tracking-[0.2em] uppercase">
              <Radar size={15} /> Verified Opportunity Scanner
            </div>
            <h2 className="mt-2 text-2xl md:text-3xl font-black tracking-tight">
              실시간 데이터 기반 AI 종목 스캔
            </h2>
            <p className="mt-1 text-sm text-slate-400 max-w-3xl">
              등락률로 점수를 만들어내지 않습니다. 완료 봉의 EMA · VWAP · MACD · RSI · RVOL · HH/HL을 각각 검증한 뒤 후보만 압축합니다.
            </p>
          </div>

          <button
            type="button"
            onClick={handleScan}
            disabled={isScanning}
            className="shrink-0 inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-6 py-4 font-black text-slate-950 shadow-lg shadow-cyan-500/10 hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isScanning ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} fill="currentColor" />}
            {isScanning ? "AI 스캔 중" : "AI 종목 스캔 시작"}
          </button>
        </div>

        {progress.total > 0 && (
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>검증 진행</span>
              <span>{progress.current} / {progress.total}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-cyan-400 transition-all duration-300"
                style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {scanError && (
          <div className="mt-4 flex gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            <AlertTriangle size={18} className="shrink-0" />
            <span>{scanError}</span>
          </div>
        )}

        {!isScanning && results.length > 0 && (
          <>
            <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="검증 완료" value={`${results.length}`} icon={<Activity size={17} />} />
              <Stat label="BUY APPROVED" value={`${approved.length}`} icon={<CheckCircle2 size={17} />} />
              <Stat label="BUY WATCH" value={`${watch.length}`} icon={<Target size={17} />} />
              <Stat label="마지막 스캔" value={lastScanAt || "-"} icon={<ShieldCheck size={17} />} />
            </div>

            <div className="mt-5 grid grid-cols-1 xl:grid-cols-5 gap-3">
              {topFive.length === 0 ? (
                <div className="xl:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-center text-slate-400">
                  현재 필수 조건을 통과한 BUY/BUY WATCH 후보가 없습니다. 조건을 억지로 완화하지 않고 NO BUY로 유지합니다.
                </div>
              ) : (
                topFive.map((candidate, index) => (
                  <CandidateCard
                    key={candidate.symbol}
                    rank={index + 1}
                    candidate={candidate}
                    onSelect={() => selectCandidate(candidate)}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

const Stat: React.FC<{ label: string; value: string; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
    <div className="flex items-center gap-2 text-slate-400 text-xs">{icon}{label}</div>
    <div className="mt-1 text-xl font-black text-white">{value}</div>
  </div>
);

const CandidateCard: React.FC<{
  rank: number;
  candidate: ScannedCandidate;
  onSelect: () => void;
}> = ({ rank, candidate, onSelect }) => {
  const { result } = candidate;
  const approved = result.decision === "BUY_APPROVED";

  return (
    <button
      type="button"
      onClick={onSelect}
      className="text-left rounded-2xl border border-slate-800 bg-slate-900/80 p-4 hover:border-cyan-400/60 hover:bg-slate-900 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs text-slate-500 font-bold">TOP {rank} · {candidate.market}</div>
          <div className="mt-1 font-black truncate">{candidate.name}</div>
          <div className="text-xs text-slate-400">{candidate.symbol}</div>
        </div>
        <div className={`rounded-xl px-2.5 py-1 text-xs font-black ${approved ? "bg-emerald-400 text-emerald-950" : "bg-amber-300 text-amber-950"}`}>
          {approved ? "BUY" : "WATCH"}
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <div className="text-xs text-slate-500">VERIFIED SCORE</div>
          <div className="text-3xl font-black text-cyan-300">{result.score}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold">{compactPrice(result.metrics.close)}</div>
          <div className="text-xs text-slate-400">RVOL {result.metrics.rvol.toFixed(2)}x</div>
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        {result.reasons.slice(0, 3).map((reason) => (
          <div key={reason} className="flex items-start gap-1.5 text-xs text-slate-300">
            <TrendingUp size={13} className="mt-0.5 shrink-0 text-emerald-400" />
            <span>{reason}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
        <Mini label="ENTRY" value={`${compactPrice(result.entryLow)}~${compactPrice(result.entryHigh)}`} />
        <Mini label="STOP" value={compactPrice(result.stopLoss)} />
        <Mini label="T1" value={compactPrice(result.target1)} />
      </div>

      <div className="mt-4 flex items-center justify-between text-xs font-bold text-cyan-300">
        <span className="inline-flex items-center gap-1"><Sparkles size={13} /> 상세 분석</span>
        <ChevronRight size={15} />
      </div>
    </button>
  );
};

const Mini: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-lg bg-slate-950/70 p-2 min-w-0">
    <div className="text-slate-600">{label}</div>
    <div className="mt-0.5 text-slate-300 font-bold truncate">{value}</div>
  </div>
);
