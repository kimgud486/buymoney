import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Crosshair,
  Loader2,
  ShieldCheck,
  Target,
  TrendingUp,
  X,
} from "lucide-react";
import {
  evaluateVerifiedSignal,
  type VerifiedSignalResult,
} from "../scanner/verifiedSignalEngine";
import { VerifiedSignalOverlayChart } from "./VerifiedSignalOverlayChart";

interface SelectedCandidateEvent {
  symbol: string;
  score?: number;
  decision?: "BUY_APPROVED" | "BUY_WATCH" | "NO_BUY";
}

interface BreakdownItem {
  key: "SCANNER" | "SHAPE" | "CONFIRMATION" | "RISK";
  label: string;
  score: number;
  max: number;
  passed: boolean;
  detail: string;
}

function fmt(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return "-";
  return value.toLocaleString("ko-KR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function deriveBreakdown(result: VerifiedSignalResult): BreakdownItem[] {
  const m = result.metrics;

  let scanner = 0;
  if (m.rvol >= 2) scanner += 15;
  else if (m.rvol >= 1.5) scanner += 11;
  else if (m.rvol >= 1.2) scanner += 6;
  if (result.score >= 70) scanner += 10;

  let shape = 0;
  if (m.hhhl) shape += 15;
  if (m.close > m.ema9 && m.ema9 > m.ema20 && m.ema20 > m.ema50) shape += 15;
  else if (m.close > m.ema20 && m.ema20 > m.ema50) shape += 10;
  if (result.pattern !== "NONE") shape += 5;

  let confirmation = 0;
  if (m.close >= m.vwap) confirmation += 10;
  if (m.macdHist > 0 && m.macd > m.macdSignal) confirmation += 10;
  if (m.rsi >= 52 && m.rsi <= 74) confirmation += 10;
  else if (m.rsi >= 48 && m.rsi < 78) confirmation += 5;

  let risk = 0;
  if (result.stopLoss > 0 && result.entryHigh > result.stopLoss) risk += 10;
  if (result.target1 > result.entryHigh) risk += 8;
  if (result.riskReward >= 2) risk += 7;

  return [
    {
      key: "SCANNER",
      label: "Scanner Score",
      score: Math.min(25, scanner),
      max: 25,
      passed: scanner >= 18,
      detail: `RVOL ${m.rvol.toFixed(2)}x · 전체 점수 ${result.score}`,
    },
    {
      key: "SHAPE",
      label: "Shape Score",
      score: Math.min(35, shape),
      max: 35,
      passed: shape >= 25,
      detail: `${m.hhhl ? "HH/HL 확인" : "HH/HL 미확인"} · ${result.pattern}`,
    },
    {
      key: "CONFIRMATION",
      label: "Confirmation Score",
      score: Math.min(30, confirmation),
      max: 30,
      passed: confirmation >= 20,
      detail: `VWAP · MACD · RSI ${m.rsi.toFixed(1)}`,
    },
    {
      key: "RISK",
      label: "Risk Score",
      score: Math.min(25, risk),
      max: 25,
      passed: risk >= 18,
      detail: `R:R 1:${result.riskReward.toFixed(1)} · ATR ${fmt(m.atr, 2)}`,
    },
  ];
}

export const VerifiedDecisionDetailPanel: React.FC = () => {
  const [selected, setSelected] = useState<SelectedCandidateEvent | null>(null);
  const [result, setResult] = useState<VerifiedSignalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<SelectedCandidateEvent>).detail;
      if (!detail?.symbol) return;
      setSelected(detail);
      setExpanded(true);
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
        const res = await fetch(
          `/api/market/realtime-candles?symbol=${encodeURIComponent(selected.symbol)}&timeframe=D&count=70`,
        );
        if (!res.ok) throw new Error(`캔들 조회 실패 (${res.status})`);
        const json = await res.json();
        if (!Array.isArray(json?.candles)) throw new Error("유효한 캔들 데이터가 없습니다.");
        const verified = evaluateVerifiedSignal(json.candles);
        if (!verified) throw new Error("완료봉 데이터가 부족하여 검증할 수 없습니다.");
        if (!cancelled) setResult(verified);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "상세 검증 중 오류가 발생했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [selected?.symbol]);

  const breakdown = useMemo(() => (result ? deriveBreakdown(result) : []), [result]);

  if (!selected) return null;

  const decision = result?.decision ?? selected.decision ?? "BUY_WATCH";
  const approved = decision === "BUY_APPROVED";

  return (
    <section className="w-full border-b border-slate-800 bg-[#07111f] text-white">
      <div className="mx-auto max-w-[1600px] px-4 py-4 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`rounded-xl p-2 ${approved ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-300/15 text-amber-300"}`}>
              <Crosshair size={20} />
            </div>
            <div>
              <div className="text-[11px] font-black tracking-[0.18em] text-cyan-300">WHY THIS CANDIDATE?</div>
              <div className="mt-0.5 flex items-center gap-2">
                <h3 className="text-lg font-black">{selected.symbol} 검증 상세</h3>
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-black ${approved ? "bg-emerald-400 text-emerald-950" : "bg-amber-300 text-amber-950"}`}>
                  {approved ? "BUY APPROVED" : "BUY WATCH"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-300 hover:border-cyan-500/50"
            >
              {expanded ? <ChevronUp size={15} className="inline" /> : <ChevronDown size={15} className="inline" />} {expanded ? "접기" : "펼치기"}
            </button>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-400 hover:text-white"
              title="상세 분석 닫기"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4">
            {loading && (
              <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-5 text-sm text-slate-300">
                <Loader2 className="animate-spin text-cyan-300" size={18} /> 완료봉을 다시 읽어 동일 엔진으로 상세 검증 중...
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-4 text-sm text-rose-200">
                <AlertTriangle size={18} /> {error}
              </div>
            )}

            {result && !loading && (
              <>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {breakdown.map((item) => (
                    <div key={item.key} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-400">{item.label}</span>
                        {item.passed ? <CheckCircle2 size={16} className="text-emerald-400" /> : <AlertTriangle size={16} className="text-amber-300" />}
                      </div>
                      <div className="mt-2 text-2xl font-black text-white">{item.score}<span className="text-sm text-slate-500">/{item.max}</span></div>
                      <div className="mt-1 text-[11px] text-slate-500">{item.detail}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                    <div className="flex items-center gap-2 text-xs font-black text-cyan-300"><TrendingUp size={16} /> 상승 근거</div>
                    <div className="mt-3 space-y-2">
                      {result.reasons.length ? result.reasons.map((reason) => (
                        <div key={reason} className="flex items-start gap-2 text-xs text-slate-300">
                          <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-400" />
                          <span>{reason}</span>
                        </div>
                      )) : <div className="text-xs text-slate-500">확인된 상승 근거 없음</div>}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                    <div className="flex items-center gap-2 text-xs font-black text-amber-300"><ShieldCheck size={16} /> 실패 / 주의 조건</div>
                    <div className="mt-3 space-y-2">
                      {result.failedChecks.length ? result.failedChecks.map((check) => (
                        <div key={check} className="flex items-start gap-2 text-xs text-slate-300">
                          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-300" />
                          <span>{check}</span>
                        </div>
                      )) : (
                        <div className="flex items-center gap-2 text-xs text-emerald-300">
                          <CheckCircle2 size={14} /> 필수 기술 조건 통과
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                    <div className="flex items-center gap-2 text-xs font-black text-violet-300"><BarChart3 size={16} /> 핵심 지표</div>
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <Metric label="Close" value={fmt(result.metrics.close)} />
                      <Metric label="VWAP" value={fmt(result.metrics.vwap)} />
                      <Metric label="EMA9" value={fmt(result.metrics.ema9)} />
                      <Metric label="EMA20" value={fmt(result.metrics.ema20)} />
                      <Metric label="EMA50" value={fmt(result.metrics.ema50)} />
                      <Metric label="RSI" value={fmt(result.metrics.rsi, 1)} />
                      <Metric label="RVOL" value={`${fmt(result.metrics.rvol, 2)}x`} />
                      <Metric label="MACD Hist" value={fmt(result.metrics.macdHist, 3)} />
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <VerifiedSignalOverlayChart symbol={selected.symbol} result={result} />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
                  <PriceBox icon={<Crosshair size={15} />} label="ENTRY LOW" value={fmt(result.entryLow)} />
                  <PriceBox icon={<Crosshair size={15} />} label="ENTRY HIGH" value={fmt(result.entryHigh)} />
                  <PriceBox icon={<ShieldCheck size={15} />} label="INVALID / STOP" value={fmt(result.stopLoss)} danger />
                  <PriceBox icon={<Target size={15} />} label="TARGET 1" value={fmt(result.target1)} positive />
                  <PriceBox icon={<CircleDollarSign size={15} />} label="TARGET 2" value={fmt(result.target2)} positive />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-[11px] text-slate-400">
                  <span className="inline-flex items-center gap-1"><Activity size={13} /> 완료봉 {result.evaluatedBars}개 평가</span>
                  <span>Pattern: <strong className="text-slate-200">{result.pattern}</strong></span>
                  <span>Direction: <strong className="text-slate-200">{result.direction}</strong></span>
                  <span>R:R <strong className="text-slate-200">1:{result.riskReward.toFixed(1)}</strong></span>
                  <span className="text-slate-500">점수는 수익 확률이 아니라 현재 기술 조건 충족도입니다.</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between gap-3 border-b border-slate-800/70 pb-1">
    <span className="text-slate-500">{label}</span>
    <span className="font-mono font-bold text-slate-200">{value}</span>
  </div>
);

const PriceBox: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  danger?: boolean;
  positive?: boolean;
}> = ({ icon, label, value, danger, positive }) => (
  <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
    <div className={`flex items-center gap-1.5 text-[10px] font-black ${danger ? "text-rose-300" : positive ? "text-emerald-300" : "text-cyan-300"}`}>
      {icon}{label}
    </div>
    <div className="mt-1 font-mono text-sm font-black text-white">{value}</div>
  </div>
);
