import React, { useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { detectIntradayOrbBreakout, type IntradayOrbEvaluation } from "../scanner/intradayOrbPatternEngine";

type CandidateEvent = { symbol?: string };

async function fetchFiveMinuteCandles(symbol: string): Promise<unknown[]> {
  const timeframes = ["5m", "5"];
  let lastError = "";
  for (const timeframe of timeframes) {
    try {
      const response = await fetch(
        `/api/market/realtime-candles?symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}&count=120`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        lastError = `5분봉 API ${response.status}`;
        continue;
      }
      const payload = await response.json();
      if (Array.isArray(payload?.candles)) return payload.candles;
      lastError = "5분봉 배열이 없습니다.";
    } catch (error: any) {
      lastError = error?.message || "5분봉 요청 실패";
    }
  }
  throw new Error(lastError || "5분봉 조회 실패");
}

export const VerifiedIntradayOrbPanel: React.FC = () => {
  const [symbol, setSymbol] = useState("");
  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] = useState<IntradayOrbEvaluation | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<CandidateEvent>).detail;
      const next = String(detail?.symbol || "").trim();
      if (next) setSymbol(next);
    };
    window.addEventListener("verified-ai-candidate-selected", handler);
    return () => window.removeEventListener("verified-ai-candidate-selected", handler);
  }, []);

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError("");
      setEvaluation(null);
      try {
        const candles = await fetchFiveMinuteCandles(symbol);
        const next = detectIntradayOrbBreakout(candles);
        if (!cancelled) setEvaluation(next);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "ORB 5분봉 검증 실패");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    const timer = window.setInterval(run, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [symbol]);

  if (!symbol) return null;

  return (
    <section className="w-full border-b border-slate-800 bg-slate-950 text-white">
      <div className="mx-auto max-w-[1600px] px-4 pb-4 md:px-6">
        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-black tracking-[0.14em] text-cyan-300">
                <Activity size={16} /> VERIFIED INTRADAY ORB · 5M
              </div>
              <div className="mt-1 text-sm font-black">{symbol} · 09:00~09:15 Opening Range</div>
            </div>
            <span className="rounded-lg border border-cyan-500/20 bg-slate-950 px-3 py-2 text-[11px] font-bold text-cyan-200">
              완료된 5분봉만 평가 · 60초 재검증
            </span>
          </div>

          {loading && !evaluation && (
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-400">
              <Loader2 size={16} className="animate-spin" /> 5분 완료봉에서 ORB를 검증 중입니다.
            </div>
          )}

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-xs text-amber-200">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>ORB는 일봉으로 추정하지 않습니다. 현재 5분봉 연결 실패: {error}</span>
            </div>
          )}

          {evaluation && (
            <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto]">
              <div className={`rounded-xl border px-4 py-3 ${evaluation.matched ? "border-emerald-500/30 bg-emerald-500/10" : "border-slate-700 bg-slate-900/70"}`}>
                <div className="flex items-center gap-2 text-sm font-black">
                  {evaluation.matched ? <CheckCircle2 size={17} className="text-emerald-300" /> : <AlertTriangle size={17} className="text-slate-400" />}
                  ORB_BREAKOUT · {evaluation.matched ? "MATCHED" : evaluation.evaluated ? "NOT MATCHED" : "WAITING DATA"}
                </div>
                <div className="mt-1 text-xs text-slate-300">{evaluation.reason}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[520px]">
                <Metric label="OR HIGH" value={evaluation.openingRangeHigh > 0 ? evaluation.openingRangeHigh.toLocaleString() : "-"} />
                <Metric label="OR LOW" value={evaluation.openingRangeLow > 0 ? evaluation.openingRangeLow.toLocaleString() : "-"} />
                <Metric label="BREAK CLOSE" value={evaluation.breakoutClose > 0 ? evaluation.breakoutClose.toLocaleString() : "-"} />
                <Metric label="5M RVOL" value={evaluation.rvol > 0 ? `${evaluation.rvol.toFixed(2)}x` : "-"} />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2">
    <div className="text-[9px] font-bold text-slate-500">{label}</div>
    <div className="mt-1 text-sm font-black text-white">{value}</div>
  </div>
);
