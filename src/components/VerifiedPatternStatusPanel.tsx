import React, { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Layers3, Loader2, ShieldAlert } from "lucide-react";
import { evaluateVerifiedSignal, type VerifiedSignalResult } from "../scanner/verifiedSignalEngine";

interface CandidateEvent {
  symbol: string;
}

function badgeClass(direction: "BULLISH" | "BEARISH" | "NEUTRAL"): string {
  if (direction === "BULLISH") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (direction === "BEARISH") return "border-rose-500/30 bg-rose-500/10 text-rose-300";
  return "border-slate-700 bg-slate-800/70 text-slate-300";
}

export const VerifiedPatternStatusPanel: React.FC = () => {
  const [symbol, setSymbol] = useState("");
  const [result, setResult] = useState<VerifiedSignalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<CandidateEvent>).detail;
      if (detail?.symbol) setSymbol(detail.symbol);
    };
    window.addEventListener("verified-ai-candidate-selected", handler);
    return () => window.removeEventListener("verified-ai-candidate-selected", handler);
  }, []);

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/market/realtime-candles?symbol=${encodeURIComponent(symbol)}&timeframe=D&count=70`);
        if (!res.ok) throw new Error(`패턴 검증용 캔들 조회 실패 (${res.status})`);
        const json = await res.json();
        if (!Array.isArray(json?.candles)) throw new Error("패턴 검증용 캔들 데이터가 없습니다.");
        const verified = evaluateVerifiedSignal(json.candles);
        if (!verified) throw new Error("완료봉 데이터가 부족해 패턴을 검증할 수 없습니다.");
        if (!cancelled) setResult(verified);
      } catch (e: any) {
        if (!cancelled) {
          setResult(null);
          setError(e?.message || "패턴 검증 실패");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  if (!symbol) return null;

  return (
    <section className="w-full border-b border-slate-800 bg-slate-950 text-white">
      <div className="mx-auto max-w-[1600px] px-4 py-4 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-black tracking-[0.16em] text-violet-300">
              <Layers3 size={16} /> VERIFIED PATTERN ENGINE
            </div>
            <h3 className="mt-1 text-lg font-black">{symbol} 패턴 실행 상태</h3>
          </div>
          {result && (
            <div className="flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">등록 {result.patternRegistry.registered}</span>
              <span className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-cyan-300">실행 {result.patternRegistry.evaluated}</span>
              <span className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-violet-300">탐지 {result.patternRegistry.matched}</span>
            </div>
          )}
        </div>

        {loading && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-4 text-sm text-slate-400">
            <Loader2 size={17} className="animate-spin" /> 완료봉에서 등록 패턴을 실제 실행 중...
          </div>
        )}

        {error && !loading && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-4 text-sm text-rose-200">
            <AlertTriangle size={17} /> {error}
          </div>
        )}

        {result && !loading && (
          <>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Count label="상승 패턴" value={result.patternRegistry.bullishMatched} tone="BULLISH" />
              <Count label="약세 패턴" value={result.patternRegistry.bearishMatched} tone="BEARISH" />
              <Count label="총 탐지" value={result.patternRegistry.matched} tone="NEUTRAL" />
              <Count label="미탐지" value={Math.max(0, result.patternRegistry.evaluated - result.patternRegistry.matched)} tone="NEUTRAL" />
            </div>

            <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-black text-slate-300">이번 완료봉에서 실제 탐지된 패턴</div>
                {result.failedChecks.includes("BEARISH_PATTERN") ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-300"><ShieldAlert size={14} /> 강한 약세 패턴으로 BUY 차단</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-300"><CheckCircle2 size={14} /> 약세 패턴 차단 없음</span>
                )}
              </div>

              {result.patternHits.length === 0 ? (
                <div className="mt-3 text-sm text-slate-500">현재 완료봉에서는 등록 패턴이 탐지되지 않았습니다. 패턴을 억지로 생성하지 않습니다.</div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {result.patternHits.map((hit) => (
                    <div key={hit.id} className={`rounded-xl border px-3 py-2 ${badgeClass(hit.direction)}`}>
                      <div className="text-xs font-black">{hit.name}</div>
                      <div className="mt-0.5 text-[10px] opacity-75">{hit.id} · {hit.direction} · {hit.confidence} · weight {hit.weight}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-3 text-[11px] text-slate-500">
              등록 수는 실제 TypeScript 판정 함수가 연결된 패턴만 집계합니다. 이름만 저장된 미구현 패턴은 실행 수에 포함하지 않습니다.
            </div>
          </>
        )}
      </div>
    </section>
  );
};

const Count: React.FC<{
  label: string;
  value: number;
  tone: "BULLISH" | "BEARISH" | "NEUTRAL";
}> = ({ label, value, tone }) => (
  <div className={`rounded-xl border p-3 ${badgeClass(tone)}`}>
    <div className="text-[10px] font-bold opacity-75">{label}</div>
    <div className="mt-1 text-2xl font-black">{value}</div>
  </div>
);
