import React, { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, BrainCircuit, Gauge, Layers3, RefreshCw, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import { evaluateVerifiedSignal, type ScannerCandle, type VerifiedSignalResult } from "../scanner/verifiedSignalEngine";

type TimeframeKey = "1m" | "5m" | "15m" | "1h";

type TimeframeSnapshot = {
  key: TimeframeKey;
  label: string;
  unit: number;
  candles: ScannerCandle[];
  result: VerifiedSignalResult | null;
  error?: string;
};

type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
type CompositeState = "BUY" | "WATCH" | "SELL_RISK" | "NO_DATA";

const TIMEFRAMES: Array<{ key: TimeframeKey; label: string; unit: number }> = [
  { key: "1m", label: "1분", unit: 1 },
  { key: "5m", label: "5분", unit: 5 },
  { key: "15m", label: "15분", unit: 15 },
  { key: "1h", label: "1시간", unit: 60 },
];

const finite = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

function normalizeCandles(payload: any): ScannerCandle[] {
  const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.candles) ? payload.candles : [];
  return rows
    .map((raw: any) => ({
      time: raw?.candle_date_time_kst ?? raw?.timestamp,
      timestamp: raw?.timestamp ?? raw?.candle_date_time_kst,
      open: finite(raw?.opening_price ?? raw?.open),
      high: finite(raw?.high_price ?? raw?.high),
      low: finite(raw?.low_price ?? raw?.low),
      close: finite(raw?.trade_price ?? raw?.close),
      volume: finite(raw?.candle_acc_trade_volume ?? raw?.volume),
    }))
    .filter((c: ScannerCandle) => c.open > 0 && c.high > 0 && c.low > 0 && c.close > 0 && c.high >= c.low)
    .reverse();
}

function formatKrw(value?: number | null): string {
  if (!value || !Number.isFinite(value)) return "-";
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function deriveRisk(result: VerifiedSignalResult | null): { level: RiskLevel; score: number; reasons: string[] } {
  if (!result) return { level: "HIGH", score: 75, reasons: ["검증 데이터 부족"] };

  const price = result.metrics.close;
  const atr = Math.max(1, result.metrics.atr);
  const vwapDistanceAtr = Math.abs(price - result.metrics.vwap) / atr;
  let score = 0;
  const reasons: string[] = [];

  if (result.metrics.rsi >= 78) { score += 35; reasons.push(`RSI 과열 ${result.metrics.rsi.toFixed(1)}`); }
  else if (result.metrics.rsi >= 70) { score += 22; reasons.push(`RSI 고점권 ${result.metrics.rsi.toFixed(1)}`); }

  if (vwapDistanceAtr >= 2.5) { score += 35; reasons.push(`VWAP 이격 ${vwapDistanceAtr.toFixed(1)} ATR`); }
  else if (vwapDistanceAtr >= 1.5) { score += 22; reasons.push(`VWAP 이격 ${vwapDistanceAtr.toFixed(1)} ATR`); }

  if (result.metrics.rvol >= 3) { score += 22; reasons.push(`RVOL 급증 ${result.metrics.rvol.toFixed(2)}`); }
  else if (result.metrics.rvol >= 2) { score += 12; reasons.push(`RVOL 확대 ${result.metrics.rvol.toFixed(2)}`); }

  if (result.direction === "BULLISH" && price > result.entryHigh && result.entryHigh > 0) {
    const chaseAtr = (price - result.entryHigh) / atr;
    if (chaseAtr >= 1) { score += 20; reasons.push(`Entry 상단 ${chaseAtr.toFixed(1)} ATR 추격`); }
  }

  score = Math.min(100, score);
  const level: RiskLevel = score >= 75 ? "EXTREME" : score >= 50 ? "HIGH" : score >= 25 ? "MEDIUM" : "LOW";
  return { level, score, reasons: reasons.length ? reasons : ["과열·추격 경고 없음"] };
}

export const BitcoinMultiTimeframeRiskPanel: React.FC = () => {
  const [snapshots, setSnapshots] = useState<TimeframeSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    const next = await Promise.all(TIMEFRAMES.map(async (tf): Promise<TimeframeSnapshot> => {
      try {
        const response = await fetch(`/api/upbit/public/candles?market=KRW-BTC&timeframe=minutes&unit=${tf.unit}&count=120`, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const candles = normalizeCandles(await response.json());
        if (candles.length < 56) return { ...tf, candles, result: null, error: "56봉 미만" };
        return { ...tf, candles, result: evaluateVerifiedSignal(candles) };
      } catch (error) {
        return { ...tf, candles: [], result: null, error: error instanceof Error ? error.message : "조회 실패" };
      }
    }));
    setSnapshots(next);
    setUpdatedAt(Date.now());
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const composite = useMemo(() => {
    const valid = snapshots.filter((s) => s.result);
    if (!valid.length) return { state: "NO_DATA" as CompositeState, bull: 0, bear: 0, neutral: 0, avgScore: 0, risk: "HIGH" as RiskLevel, riskScore: 75, riskReasons: ["검증 데이터 없음"] };
    const bull = valid.filter((s) => s.result?.direction === "BULLISH").length;
    const bear = valid.filter((s) => s.result?.direction === "BEARISH").length;
    const neutral = valid.length - bull - bear;
    const avgScore = valid.reduce((sum, s) => sum + (s.result?.score ?? 0), 0) / valid.length;
    const risks = valid.map((s) => deriveRisk(s.result));
    const riskScore = Math.max(...risks.map((r) => r.score));
    const risk: RiskLevel = riskScore >= 75 ? "EXTREME" : riskScore >= 50 ? "HIGH" : riskScore >= 25 ? "MEDIUM" : "LOW";
    const riskReasons = Array.from(new Set(risks.flatMap((r) => r.reasons))).slice(0, 4);

    let state: CompositeState = "WATCH";
    if (bear >= 3) state = "SELL_RISK";
    else if (bull >= 3 && avgScore >= 70 && risk !== "EXTREME") state = "BUY";
    else state = "WATCH";

    return { state, bull, bear, neutral, avgScore, risk, riskScore, riskReasons };
  }, [snapshots]);

  const stateLabel = composite.state === "BUY" ? "BUY 관심" : composite.state === "SELL_RISK" ? "SELL/방어 경고" : composite.state === "WATCH" ? "WATCH" : "NO DATA";

  return (
    <section className="w-full border-b border-slate-200 bg-white px-3 py-3 sm:px-4">
      <div className="mx-auto max-w-[1920px] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><Layers3 className="h-5 w-5 text-amber-600" /><h2 className="font-black text-slate-900">BTC 멀티타임프레임 · 추격위험 레이더</h2></div>
            <p className="mt-1 text-[11px] text-slate-500">1m · 5m · 15m · 1h 실제 Upbit 캔들 기반 · EMA/VWAP 정렬 + RSI/RVOL/ATR 과열 검증</p>
          </div>
          <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> 갱신</button>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1.25fr_1fr]">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {TIMEFRAMES.map((tf) => {
              const snap = snapshots.find((s) => s.key === tf.key);
              const r = snap?.result ?? null;
              const direction = !r ? "NO DATA" : r.direction;
              const bullish = r?.direction === "BULLISH";
              const bearish = r?.direction === "BEARISH";
              return (
                <div key={tf.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between"><span className="font-black text-slate-900">{tf.label}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${bullish ? "bg-rose-100 text-rose-700" : bearish ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-600"}`}>{direction}</span></div>
                  <div className="mt-2 text-2xl font-black text-slate-950">{r ? r.score : "-"}<span className="text-xs text-slate-400"> /100</span></div>
                  <div className="mt-2 space-y-1 text-[10px] text-slate-500">
                    <div className="flex justify-between"><span>EMA20</span><b className="text-slate-700">{formatKrw(r?.metrics.ema20)}</b></div>
                    <div className="flex justify-between"><span>EMA50</span><b className="text-slate-700">{formatKrw(r?.metrics.ema50)}</b></div>
                    <div className="flex justify-between"><span>VWAP</span><b className="text-slate-700">{formatKrw(r?.metrics.vwap)}</b></div>
                    <div className="flex justify-between"><span>RSI / RVOL</span><b className="text-slate-700">{r ? `${r.metrics.rsi.toFixed(1)} / ${r.metrics.rvol.toFixed(2)}` : snap?.error ?? "-"}</b></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-slate-200 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Composite Signal</div>
                <div className="mt-1 flex items-center gap-2 text-xl font-black text-slate-900">{composite.state === "BUY" ? <TrendingUp className="h-5 w-5 text-rose-600" /> : composite.state === "SELL_RISK" ? <TrendingDown className="h-5 w-5 text-blue-600" /> : <BrainCircuit className="h-5 w-5 text-amber-600" />}{stateLabel}</div>
              </div>
              <div className={`rounded-xl px-3 py-2 text-right ${composite.risk === "LOW" ? "bg-emerald-50 text-emerald-700" : composite.risk === "MEDIUM" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>
                <div className="flex items-center gap-1 text-[10px] font-black"><Gauge className="h-3.5 w-3.5" /> 추격 위험</div>
                <div className="text-lg font-black">{composite.risk} {composite.riskScore}/100</div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
              <Stat label="Bull" value={composite.bull} />
              <Stat label="Bear" value={composite.bear} />
              <Stat label="Neutral" value={composite.neutral} />
              <Stat label="Avg Score" value={Math.round(composite.avgScore)} />
            </div>

            <div className="mt-3 rounded-lg bg-slate-50 p-3 text-[11px] text-slate-600">
              <div className="mb-1 flex items-center gap-1 font-black text-slate-800">{composite.risk === "LOW" ? <ShieldCheck className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />} 과열·추격 체크</div>
              {composite.riskReasons.map((reason, index) => <div key={index}>• {reason}</div>)}
              <div className="mt-2 flex items-center gap-1 font-bold text-slate-500"><Activity className="h-3.5 w-3.5" /> {updatedAt ? `최근 갱신 ${new Date(updatedAt).toLocaleTimeString("ko-KR")}` : "데이터 대기"} · 자동 주문 없음</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const Stat: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="rounded-lg bg-slate-50 px-2 py-2"><div className="text-[9px] font-bold text-slate-400">{label}</div><div className="font-black text-slate-800">{value}</div></div>
);
