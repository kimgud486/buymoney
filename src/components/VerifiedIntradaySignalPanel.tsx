import React, { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Crosshair,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Waves,
} from "lucide-react";
import {
  evaluateVerifiedIntradayPatterns,
  type VerifiedIntradayPatternResult,
} from "../scanner/verifiedIntradayPatternEngine";

interface SelectedCandidateEvent {
  symbol: string;
}

interface CandlePayload {
  symbol?: string;
  name?: string;
  market?: string;
  currentPrice?: number;
  candles?: unknown[];
}

const PATTERN_LABELS: Record<string, string> = {
  ORB_BREAKOUT: "ORB 돌파",
  OPENING_DRIVE: "Opening Drive",
  VWAP_RETEST_HOLD: "VWAP Retest",
  FIRST_PULLBACK_HOLD_INTRADAY: "First Pullback",
};

function fmt(value: number, digits = 2): string {
  if (!Number.isFinite(value) || value <= 0) return "-";
  return value.toLocaleString("ko-KR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export const VerifiedIntradaySignalPanel: React.FC = () => {
  const [selected, setSelected] = useState<SelectedCandidateEvent | null>(null);
  const [result, setResult] = useState<VerifiedIntradayPatternResult | null>(null);
  const [payload, setPayload] = useState<CandlePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<SelectedCandidateEvent>).detail;
      if (!detail?.symbol) return;
      setSelected({ symbol: String(detail.symbol).trim() });
      setRefreshNonce((value) => value + 1);
    };

    window.addEventListener("verified-ai-candidate-selected", handler);
    return () => window.removeEventListener("verified-ai-candidate-selected", handler);
  }, []);

  useEffect(() => {
    if (!selected?.symbol) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      setResult(null);

      try {
        const response = await fetch(
          `/api/market/realtime-candles?symbol=${encodeURIComponent(selected.symbol)}&timeframe=5m&count=120`,
          { cache: "no-store" },
        );
        if (!response.ok) throw new Error(`5분봉 조회 실패 (${response.status})`);

        const json = (await response.json()) as CandlePayload;
        const market = String(json?.market || "").toUpperCase();
        if (market === "BTC" || market === "CRYPTO" || market === "UPBIT") {
          throw new Error("가상자산은 주식 장중 ORB 엔진과 분리하여 평가합니다.");
        }

        const candles = Array.isArray(json?.candles) ? json.candles : [];
        const verified = evaluateVerifiedIntradayPatterns(candles as any[], 5);
        if (!verified) {
          throw new Error("완료된 5분봉이 부족해 장중 패턴을 검증할 수 없습니다.");
        }

        if (!cancelled) {
          setPayload(json);
          setResult(verified);
        }
      } catch (e: any) {
        if (!cancelled) {
          setPayload(null);
          setError(e?.message || "장중 패턴 검증에 실패했습니다.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [selected?.symbol, refreshNonce]);

  if (!selected) return null;

  const hasSetup = Boolean(result && !result.blocked && result.hits.length > 0);

  return (
    <section className="w-full border-b border-slate-800 bg-[#050b14] text-white">
      <div className="mx-auto max-w-[1600px] px-4 py-4 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`rounded-xl p-2 ${hasSetup ? "bg-emerald-400/15 text-emerald-300" : "bg-slate-800 text-slate-300"}`}>
              <Clock3 size={20} />
            </div>
            <div>
              <div className="text-[11px] font-black tracking-[0.18em] text-cyan-300">VERIFIED INTRADAY · 5M COMPLETED BARS</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-black">{payload?.name || selected.symbol} 장중 셋업</h3>
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-black ${hasSetup ? "bg-emerald-400 text-emerald-950" : "bg-slate-700 text-slate-200"}`}>
                  {hasSetup ? `${result?.hits.length} SETUP MATCH` : "NO VERIFIED SETUP"}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setRefreshNonce((value) => value + 1)}
            disabled={loading}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-300 hover:border-cyan-500/50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={`mr-1 inline ${loading ? "animate-spin" : ""}`} /> 새로 검증
          </button>
        </div>

        {loading && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-4 text-sm text-slate-300">
            <Loader2 className="animate-spin text-cyan-300" size={18} /> 실제 5분봉 완료봉을 읽어 장중 패턴 검증 중...
          </div>
        )}

        {error && !loading && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-4 text-sm text-amber-200">
            <AlertTriangle size={18} /> {error}
          </div>
        )}

        {result && !loading && (
          <>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              <MetricCard icon={<Activity size={15} />} label="완료 5분봉" value={`${result.completedBars}개`} />
              <MetricCard icon={<Waves size={15} />} label="Session VWAP" value={fmt(result.metrics.vwap)} />
              <MetricCard icon={<Activity size={15} />} label="Latest RVOL" value={result.metrics.rvol > 0 ? `${result.metrics.rvol.toFixed(2)}x` : "-"} />
              <MetricCard icon={<Crosshair size={15} />} label="Opening Range" value={`${fmt(result.metrics.openingRangeLow)} ~ ${fmt(result.metrics.openingRangeHigh)}`} />
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="flex items-center gap-2 text-xs font-black text-emerald-300">
                  <CheckCircle2 size={16} /> 확인된 장중 패턴
                </div>
                <div className="mt-3 space-y-2">
                  {result.hits.length ? result.hits.map((hit) => (
                    <div key={hit.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black text-white">{PATTERN_LABELS[hit.id] || hit.id}</span>
                        <span className={`rounded px-1.5 py-0.5 text-[9px] font-black ${hit.confidence === "STRONG" ? "bg-emerald-400 text-emerald-950" : "bg-cyan-400/15 text-cyan-200"}`}>
                          {hit.confidence}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] leading-5 text-slate-400">{hit.reason}</div>
                    </div>
                  )) : (
                    <div className="text-xs leading-5 text-slate-500">
                      현재 완료봉에서는 ORB / Opening Drive / VWAP Retest / First Pullback 조건이 확인되지 않았습니다. 조건을 느슨하게 만들어 BUY를 생성하지 않습니다.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="flex items-center gap-2 text-xs font-black text-amber-300">
                  <ShieldCheck size={16} /> 장중 검증 규칙
                </div>
                <div className="mt-3 space-y-2 text-xs leading-5 text-slate-400">
                  <p>• 현재 형성 중인 5분봉은 신호 판정에서 제외합니다.</p>
                  <p>• ORB는 Opening Range 종가 돌파와 RVOL 확인을 동시에 요구합니다.</p>
                  <p>• VWAP Retest는 VWAP 재시험 후 완료봉이 다시 위에서 마감해야 합니다.</p>
                  <p>• First Pullback은 돌파 뒤 눌림 거래량 감소와 Opening Range 지지를 확인합니다.</p>
                  <p className="text-slate-500">장중 패턴 일치는 수익 보장이 아니며 자동 주문 명령이 아닙니다.</p>
                </div>
              </div>
            </div>

            {result.blocked && (
              <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
                <AlertTriangle size={14} className="mr-1 inline" /> {result.blockReason || "장중 검증 차단"}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

const MetricCard: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
    <div className="flex items-center gap-1.5 text-[10px] font-black text-cyan-300">{icon}{label}</div>
    <div className="mt-1 text-sm font-black text-white">{value}</div>
  </div>
);
