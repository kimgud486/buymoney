import React, { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, BrainCircuit, ShieldAlert, Target } from "lucide-react";
import { evaluateVerifiedSignal, type ScannerCandle, type VerifiedSignalResult } from "../scanner/verifiedSignalEngine";
import { realtimeMarketStreamManager, type NormalizedMarketTick } from "../services/RealtimeMarketStreamManager";

type UpbitCandleRaw = {
  candle_date_time_kst?: string;
  timestamp?: number;
  opening_price?: number;
  high_price?: number;
  low_price?: number;
  trade_price?: number;
  candle_acc_trade_volume?: number;
};

const toFinite = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

function normalizeCandles(payload: any): ScannerCandle[] {
  const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.candles) ? payload.candles : Array.isArray(payload?.data) ? payload.data : [];
  return rows
    .map((raw: UpbitCandleRaw) => ({
      time: raw.candle_date_time_kst ?? raw.timestamp,
      timestamp: raw.timestamp ?? raw.candle_date_time_kst,
      open: toFinite(raw.opening_price ?? (raw as any).open),
      high: toFinite(raw.high_price ?? (raw as any).high),
      low: toFinite(raw.low_price ?? (raw as any).low),
      close: toFinite(raw.trade_price ?? (raw as any).close),
      volume: toFinite(raw.candle_acc_trade_volume ?? (raw as any).volume),
    }))
    .filter((c: ScannerCandle) => c.open > 0 && c.high >= c.low && c.low > 0 && c.close > 0)
    .reverse();
}

function formatKrw(value?: number | null): string {
  return value && Number.isFinite(value) ? `${Math.round(value).toLocaleString("ko-KR")}원` : "-";
}

export const BitcoinLiveChartAnalysis: React.FC = () => {
  const [candles, setCandles] = useState<ScannerCandle[]>([]);
  const [result, setResult] = useState<VerifiedSignalResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCandles = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/upbit/public/candles?market=KRW-BTC&timeframe=minutes&unit=5&count=120", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const next = normalizeCandles(await response.json());
      if (next.length < 56) throw new Error("검증용 5분봉 데이터가 부족합니다.");
      setCandles(next);
      setResult(evaluateVerifiedSignal(next));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "BTC 캔들 조회 실패");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCandles();
    const timer = window.setInterval(() => void loadCandles(), 30_000);
    const unsubscribe = realtimeMarketStreamManager.subscribeTick((tick: NormalizedMarketTick) => {
      if (tick.market !== "UPBIT" || tick.symbol !== "BTC" || tick.price <= 0) return;
      setCandles((prev) => {
        if (!prev.length) return prev;
        const next = [...prev];
        const last = { ...next[next.length - 1] };
        last.close = tick.price;
        last.high = Math.max(last.high, tick.price);
        last.low = Math.min(last.low, tick.price);
        next[next.length - 1] = last;
        return next;
      });
    });
    return () => {
      window.clearInterval(timer);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (candles.length >= 56) setResult(evaluateVerifiedSignal(candles));
  }, [candles]);

  const visible = useMemo(() => candles.slice(-48), [candles]);
  const range = useMemo(() => {
    if (!visible.length) return { min: 0, max: 1 };
    return { min: Math.min(...visible.map((c) => c.low)), max: Math.max(...visible.map((c) => c.high)) };
  }, [visible]);
  const maxVol = Math.max(1, ...visible.map((c) => c.volume));
  const scaleY = (price: number) => 8 + ((range.max - price) / Math.max(1, range.max - range.min)) * 132;

  const stance = !result ? "NO DATA" : result.direction === "BULLISH" ? "매수 관심" : result.direction === "BEARISH" ? "매도/방어 관심" : "관망";

  return (
    <section className="w-full border-b border-slate-200 bg-slate-50 px-3 py-3 sm:px-4">
      <div className="mx-auto max-w-[1920px] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-amber-600" /><h2 className="font-black text-slate-900">BTC 5분봉 실시간 차트 · 검증 분석</h2></div>
            <p className="mt-1 text-[11px] text-slate-500">Upbit 실제 캔들 + 실시간 tick 보정 · 진행 중 캔들은 매수 확정 근거에서 제외</p>
          </div>
          <button onClick={() => void loadCandles()} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">새로고침</button>
        </div>

        {error ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700"><ShieldAlert className="h-4 w-4" /> {error}</div>
        ) : (
          <div className="mt-4 grid gap-4 xl:grid-cols-[1.65fr_1fr]">
            <div className="rounded-xl border border-slate-200 bg-slate-950 p-3">
              <svg viewBox="0 0 1000 190" className="h-[250px] w-full" preserveAspectRatio="none" aria-label="BTC 5분봉 캔들 차트">
                {visible.map((c, i) => {
                  const x = 12 + i * (976 / Math.max(1, visible.length));
                  const width = Math.max(4, 760 / Math.max(1, visible.length));
                  const yOpen = scaleY(c.open); const yClose = scaleY(c.close); const yHigh = scaleY(c.high); const yLow = scaleY(c.low);
                  const up = c.close >= c.open;
                  const bodyY = Math.min(yOpen, yClose); const bodyH = Math.max(1.5, Math.abs(yClose - yOpen));
                  const volH = Math.max(1, (c.volume / maxVol) * 34);
                  return <g key={i}>
                    <line x1={x} x2={x} y1={yHigh} y2={yLow} stroke={up ? "#fb7185" : "#60a5fa"} strokeWidth="1.5" />
                    <rect x={x - width / 2} y={bodyY} width={width} height={bodyH} fill={up ? "#fb7185" : "#60a5fa"} rx="1" />
                    <rect x={x - width / 2} y={184 - volH} width={width} height={volH} fill={up ? "#4c1d2f" : "#172554"} opacity="0.9" />
                  </g>;
                })}
              </svg>
              <div className="flex justify-between text-[10px] font-bold text-slate-400"><span>최근 {visible.length}개 5분봉</span><span>거래량 포함</span></div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Metric label="검증 상태" value={loading ? "갱신 중" : result ? result.decision : "NO DATA"} />
                <Metric label="방향" value={stance} />
                <Metric label="Setup Score" value={result ? `${result.score}/100` : "-"} />
                <Metric label="패턴 일치" value={result ? `${result.patternRegistry.matched}/${result.patternRegistry.evaluated}` : "-"} />
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <div className="mb-2 flex items-center gap-1 text-xs font-black text-slate-700"><Target className="h-4 w-4" /> 관심 가격 구간</div>
                <div className="grid grid-cols-2 gap-2 text-xs"><Price label="Entry Low" value={result?.entryLow} /><Price label="Entry High" value={result?.entryHigh} /><Price label="Stop" value={result?.stopLoss} /><Price label="TP1" value={result?.target1} /><Price label="TP2" value={result?.target2} /><Price label="R:R" value={result?.riskReward} plain /></div>
              </div>
              <div className="rounded-xl border border-slate-200 p-3 text-[11px] text-slate-600">
                <div className="mb-1 flex items-center gap-1 font-black text-slate-800"><BrainCircuit className="h-4 w-4" /> 검증 근거</div>
                {result ? (result.reasons.slice(0, 4).map((r, i) => <div key={i}>• {r}</div>)) : <div>충분한 실제 캔들이 확보될 때까지 신호를 생성하지 않습니다.</div>}
                {result && <div className="mt-2 flex items-center gap-1 font-bold text-slate-500"><Activity className="h-3.5 w-3.5" /> RSI {result.metrics.rsi.toFixed(1)} · RVOL {result.metrics.rvol.toFixed(2)} · VWAP {formatKrw(result.metrics.vwap)}</div>}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><div className="text-[10px] font-bold text-slate-400">{label}</div><div className="mt-0.5 text-sm font-black text-slate-800">{value}</div></div>;
const Price: React.FC<{ label: string; value?: number; plain?: boolean }> = ({ label, value, plain }) => <div><span className="text-slate-400">{label}</span><div className="font-black text-slate-800">{plain ? (value && Number.isFinite(value) ? value.toFixed(2) : "-") : formatKrw(value)}</div></div>;
