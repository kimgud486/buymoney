import React, { useEffect, useMemo, useRef, useState } from "react";
import { Activity, AlertTriangle, BellRing, Bitcoin, Layers3, Radio, RefreshCw, ShieldCheck } from "lucide-react";
import { evaluateVerifiedSignal, type ScannerCandle, type VerifiedSignalResult } from "../scanner/verifiedSignalEngine";
import { realtimeMarketStreamManager, type NormalizedMarketTick } from "../services/RealtimeMarketStreamManager";

type Coin = "BTC" | "ETH" | "SOL" | "XRP";
type AlertRow = { at: number; coin: Coin; from: string; to: string; score: number };

const COINS: Array<{ symbol: Coin; label: string }> = [
  { symbol: "BTC", label: "비트코인" },
  { symbol: "ETH", label: "이더리움" },
  { symbol: "SOL", label: "솔라나" },
  { symbol: "XRP", label: "리플" },
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

function minuteBucket(timestamp: number): number {
  return Math.floor(timestamp / 60_000) * 60_000;
}

function candleBucket(candle: ScannerCandle): number {
  const raw = candle.timestamp ?? candle.time;
  if (typeof raw === "number" && Number.isFinite(raw)) return minuteBucket(raw);
  const parsed = Date.parse(String(raw ?? ""));
  return Number.isFinite(parsed) ? minuteBucket(parsed) : 0;
}

function emaSeries(values: number[], period: number): number[] {
  if (!values.length) return [];
  const alpha = 2 / (period + 1);
  const out = [values[0]];
  for (let i = 1; i < values.length; i += 1) out.push(alpha * values[i] + (1 - alpha) * out[i - 1]);
  return out;
}

function cumulativeVwapSeries(candles: ScannerCandle[]): number[] {
  let pv = 0;
  let vol = 0;
  return candles.map((c) => {
    const v = Math.max(0, c.volume);
    pv += ((c.high + c.low + c.close) / 3) * v;
    vol += v;
    return vol > 0 ? pv / vol : c.close;
  });
}

function formatPrice(coin: Coin, value?: number | null): string {
  if (!value || !Number.isFinite(value)) return "-";
  const digits = coin === "XRP" ? 1 : coin === "SOL" ? 0 : 0;
  return `${value.toLocaleString("ko-KR", { maximumFractionDigits: digits })}원`;
}

function signalLabel(result: VerifiedSignalResult | null): string {
  if (!result) return "NO DATA";
  if (result.decision === "BUY_APPROVED") return "BUY";
  if (result.decision === "BUY_WATCH") return "WATCH";
  if (result.direction === "BEARISH") return "SELL RISK";
  return "NO BUY";
}

export const CryptoLiveWorkbench: React.FC = () => {
  const [coin, setCoin] = useState<Coin>("BTC");
  const [candles, setCandles] = useState<ScannerCandle[]>([]);
  const [result, setResult] = useState<VerifiedSignalResult | null>(null);
  const [lastTick, setLastTick] = useState<NormalizedMarketTick | null>(null);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previousSignalRef = useRef<string | null>(null);

  const loadSeed = async (target: Coin = coin) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/upbit/public/candles?market=KRW-${target}&timeframe=minutes&unit=1&count=120`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const next = normalizeCandles(await response.json());
      if (next.length < 56) throw new Error("실제 1분봉이 56개 미만입니다.");
      setCandles(next);
      setResult(evaluateVerifiedSignal(next));
      setError(null);
    } catch (e) {
      setCandles([]);
      setResult(null);
      setError(e instanceof Error ? e.message : "캔들 조회 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    previousSignalRef.current = null;
    setLastTick(null);
    void loadSeed(coin);
  }, [coin]);

  useEffect(() => {
    const timer = window.setInterval(() => void loadSeed(coin), 30_000);
    return () => window.clearInterval(timer);
  }, [coin]);

  useEffect(() => {
    const unsubscribe = realtimeMarketStreamManager.subscribeTick((tick) => {
      if (tick.market !== "UPBIT" || tick.symbol !== coin || !Number.isFinite(tick.price) || tick.price <= 0) return;
      setLastTick(tick);
      const bucket = minuteBucket(tick.timestamp || Date.now());
      setCandles((prev) => {
        if (!prev.length) return prev;
        const next = [...prev];
        const last = next[next.length - 1];
        const lastBucket = candleBucket(last);
        if (lastBucket === bucket) {
          next[next.length - 1] = { ...last, close: tick.price, high: Math.max(last.high, tick.price), low: Math.min(last.low, tick.price) };
          return next;
        }
        if (bucket > lastBucket) {
          next.push({ time: bucket, timestamp: bucket, open: tick.price, high: tick.price, low: tick.price, close: tick.price, volume: 0 });
          return next.slice(-121);
        }
        return prev;
      });
    });
    return unsubscribe;
  }, [coin]);

  useEffect(() => {
    if (candles.length < 56) return;
    setResult(evaluateVerifiedSignal(candles));
  }, [candles]);

  useEffect(() => {
    const current = signalLabel(result);
    if (!result || current === "NO DATA") return;
    const previous = previousSignalRef.current;
    if (previous && previous !== current) {
      setAlerts((rows) => [{ at: Date.now(), coin, from: previous, to: current, score: result.score }, ...rows].slice(0, 5));
      window.dispatchEvent(new CustomEvent("crypto_verified_signal_change", { detail: { coin, from: previous, to: current, score: result.score, timestamp: Date.now() } }));
    }
    previousSignalRef.current = current;
  }, [coin, result?.decision, result?.direction, result?.score]);

  const visible = useMemo(() => candles.slice(-60), [candles]);
  const overlays = useMemo(() => {
    const closes = visible.map((c) => c.close);
    return { ema20: emaSeries(closes, 20), ema50: emaSeries(closes, 50), vwap: cumulativeVwapSeries(visible) };
  }, [visible]);
  const range = useMemo(() => {
    const values = visible.flatMap((c, i) => [c.low, c.high, overlays.ema20[i] ?? c.close, overlays.ema50[i] ?? c.close, overlays.vwap[i] ?? c.close]);
    return values.length ? { min: Math.min(...values), max: Math.max(...values) } : { min: 0, max: 1 };
  }, [visible, overlays]);
  const maxVol = Math.max(1, ...visible.map((c) => c.volume));
  const y = (price: number) => 10 + ((range.max - price) / Math.max(1, range.max - range.min)) * 128;
  const linePoints = (series: number[]) => series.map((value, i) => `${14 + i * (970 / Math.max(1, visible.length - 1))},${y(value)}`).join(" ");

  const liveAgeMs = lastTick ? Math.max(0, Date.now() - lastTick.timestamp) : null;
  const signal = signalLabel(result);

  return (
    <section className="w-full border-b border-slate-200 bg-slate-50 px-3 py-3 sm:px-4">
      <div className="mx-auto max-w-[1920px] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><Bitcoin className="h-5 w-5 text-amber-600" /><h2 className="font-black text-slate-900">Crypto Live Workbench</h2></div>
            <p className="mt-1 text-[11px] text-slate-500">실제 Upbit 1분봉 seed + WebSocket 진행봉 생성 · EMA20/EMA50/VWAP · 검증 신호 변화 감지</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {COINS.map((item) => <button key={item.symbol} onClick={() => setCoin(item.symbol)} className={`rounded-lg px-3 py-1.5 text-xs font-black ${coin === item.symbol ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600"}`}>{item.symbol}</button>)}
            <button onClick={() => void loadSeed()} disabled={loading} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> 갱신</button>
          </div>
        </div>

        {error ? <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700"><AlertTriangle className="h-4 w-4" /> {error}</div> : (
          <div className="mt-4 grid gap-4 xl:grid-cols-[1.7fr_1fr]">
            <div className="rounded-xl border border-slate-200 bg-slate-950 p-3">
              <svg viewBox="0 0 1000 190" className="h-[300px] w-full" preserveAspectRatio="none" aria-label={`${coin} 실시간 1분봉 차트`}>
                {visible.map((c, i) => {
                  const x = 14 + i * (970 / Math.max(1, visible.length - 1));
                  const width = Math.max(3, 650 / Math.max(1, visible.length));
                  const openY = y(c.open); const closeY = y(c.close); const highY = y(c.high); const lowY = y(c.low);
                  const up = c.close >= c.open;
                  const volH = Math.max(1, (c.volume / maxVol) * 30);
                  return <g key={`${c.timestamp ?? c.time}-${i}`}>
                    <line x1={x} x2={x} y1={highY} y2={lowY} stroke={up ? "#fb7185" : "#60a5fa"} strokeWidth="1.2" />
                    <rect x={x - width / 2} y={Math.min(openY, closeY)} width={width} height={Math.max(1.2, Math.abs(openY - closeY))} fill={up ? "#fb7185" : "#60a5fa"} rx="0.7" />
                    <rect x={x - width / 2} y={186 - volH} width={width} height={volH} fill={up ? "#4c1d2f" : "#172554"} opacity="0.85" />
                  </g>;
                })}
                {visible.length > 1 && <><polyline points={linePoints(overlays.ema20)} fill="none" stroke="#fbbf24" strokeWidth="1.6" /><polyline points={linePoints(overlays.ema50)} fill="none" stroke="#a78bfa" strokeWidth="1.5" /><polyline points={linePoints(overlays.vwap)} fill="none" stroke="#34d399" strokeWidth="1.5" strokeDasharray="4 3" /></>}
              </svg>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold text-slate-400"><span>최근 {visible.length}개 1분봉 · 거래량</span><span>EMA20 <b className="text-amber-300">━</b> · EMA50 <b className="text-violet-300">━</b> · VWAP <b className="text-emerald-300">┄</b></span></div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Metric label="코인" value={`${coin} · ${COINS.find((c) => c.symbol === coin)?.label ?? coin}`} />
                <Metric label="검증 신호" value={signal} />
                <Metric label="Setup Score" value={result ? `${result.score}/100` : "-"} />
                <Metric label="현재가" value={formatPrice(coin, lastTick?.price ?? result?.metrics.close)} />
              </div>
              <div className="rounded-xl border border-slate-200 p-3 text-[11px] text-slate-600">
                <div className="mb-2 flex items-center gap-1 font-black text-slate-800"><Layers3 className="h-4 w-4" /> 실시간 검증 상태</div>
                <div className="grid grid-cols-2 gap-2">
                  <Small label="EMA20" value={formatPrice(coin, result?.metrics.ema20)} />
                  <Small label="EMA50" value={formatPrice(coin, result?.metrics.ema50)} />
                  <Small label="VWAP" value={formatPrice(coin, result?.metrics.vwap)} />
                  <Small label="RSI / RVOL" value={result ? `${result.metrics.rsi.toFixed(1)} / ${result.metrics.rvol.toFixed(2)}` : "-"} />
                </div>
                <div className="mt-2 flex items-center gap-1 font-bold text-slate-500"><Radio className="h-3.5 w-3.5" /> {lastTick ? `${lastTick.feedSource} · ${lastTick.latencyMs}ms` : "WebSocket tick 대기"} {liveAgeMs !== null ? `· ${Math.round(liveAgeMs / 1000)}초 전` : ""}</div>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <div className="mb-2 flex items-center gap-1 text-xs font-black text-slate-800"><BellRing className="h-4 w-4" /> 신호 변화 로그</div>
                {alerts.length ? alerts.map((a) => <div key={a.at} className="mb-1 rounded-lg bg-slate-50 px-2 py-1.5 text-[10px] text-slate-600"><b>{a.coin}</b> {a.from} → <b>{a.to}</b> · Score {a.score} · {new Date(a.at).toLocaleTimeString("ko-KR")}</div>) : <div className="text-[11px] text-slate-400">검증 신호가 바뀌면 여기에 기록됩니다.</div>}
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500"><ShieldCheck className="h-3.5 w-3.5" /> 진행 중 1분봉은 기존 엔진 규칙상 BUY 확정 근거에서 제외 · 자동 주문 없음</div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><div className="text-[10px] font-bold text-slate-400">{label}</div><div className="mt-0.5 truncate text-sm font-black text-slate-800">{value}</div></div>;
const Small: React.FC<{ label: string; value: string }> = ({ label, value }) => <div className="rounded-lg bg-slate-50 px-2 py-2"><div className="text-[9px] font-bold text-slate-400">{label}</div><div className="mt-0.5 truncate font-black text-slate-700">{value}</div></div>;
