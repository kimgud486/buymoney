import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, BellRing, Bitcoin, ChevronDown, ChevronUp, RefreshCw, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import { evaluateVerifiedSignal, type ScannerCandle, type VerifiedSignalResult } from "../scanner/verifiedSignalEngine";
import { realtimeMarketStreamManager, type NormalizedMarketTick } from "../services/RealtimeMarketStreamManager";

type Coin = "BTC" | "ETH" | "SOL" | "XRP";
type Side = "LONG" | "SHORT";
type AlertRow = { at: number; coin: Coin; from: string; to: string; score: number };

type OrderIntent = {
  side: Side;
  coin: Coin;
  price: number;
  stop: number | null;
  target: number | null;
};

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
  const digits = coin === "XRP" ? 1 : 0;
  return `${value.toLocaleString("ko-KR", { maximumFractionDigits: digits })}원`;
}

function signalLabel(result: VerifiedSignalResult | null): string {
  if (!result) return "데이터 없음";
  if (result.decision === "BUY_APPROVED") return "매수 우세";
  if (result.decision === "BUY_WATCH") return "관심 구간";
  if (result.direction === "BEARISH") return "하락 주의";
  return "대기";
}

export const CryptoLiveWorkbench: React.FC = () => {
  const [coin, setCoin] = useState<Coin>("BTC");
  const [candles, setCandles] = useState<ScannerCandle[]>([]);
  const [result, setResult] = useState<VerifiedSignalResult | null>(null);
  const [lastTick, setLastTick] = useState<NormalizedMarketTick | null>(null);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [orderIntent, setOrderIntent] = useState<OrderIntent | null>(null);
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
    setOrderIntent(null);
    void loadSeed(coin);
  }, [coin]);

  useEffect(() => {
    const timer = window.setInterval(() => void loadSeed(coin), 30_000);
    return () => window.clearInterval(timer);
  }, [coin]);

  useEffect(() => realtimeMarketStreamManager.subscribeTick((tick) => {
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
  }), [coin]);

  useEffect(() => {
    if (candles.length >= 56) setResult(evaluateVerifiedSignal(candles));
  }, [candles]);

  useEffect(() => {
    const current = signalLabel(result);
    if (!result || current === "데이터 없음") return;
    const previous = previousSignalRef.current;
    if (previous && previous !== current) {
      setAlerts((rows) => [{ at: Date.now(), coin, from: previous, to: current, score: result.score }, ...rows].slice(0, 4));
      window.dispatchEvent(new CustomEvent("crypto_verified_signal_change", { detail: { coin, from: previous, to: current, score: result.score, timestamp: Date.now() } }));
    }
    previousSignalRef.current = current;
  }, [coin, result?.decision, result?.direction, result?.score]);

  const visible = useMemo(() => candles.slice(-48), [candles]);
  const overlays = useMemo(() => {
    const closes = visible.map((c) => c.close);
    return { ema20: emaSeries(closes, 20), ema50: emaSeries(closes, 50), vwap: cumulativeVwapSeries(visible) };
  }, [visible]);
  const range = useMemo(() => {
    const values = visible.flatMap((c, i) => [c.low, c.high, overlays.ema20[i] ?? c.close, overlays.ema50[i] ?? c.close, overlays.vwap[i] ?? c.close]);
    return values.length ? { min: Math.min(...values), max: Math.max(...values) } : { min: 0, max: 1 };
  }, [visible, overlays]);
  const maxVol = Math.max(1, ...visible.map((c) => c.volume));
  const y = (price: number) => 8 + ((range.max - price) / Math.max(1, range.max - range.min)) * 94;
  const linePoints = (series: number[]) => series.map((value, i) => `${12 + i * (970 / Math.max(1, visible.length - 1))},${y(value)}`).join(" ");
  const currentPrice = lastTick?.price ?? result?.metrics.close ?? 0;
  const signal = signalLabel(result);

  const prepareOrder = (side: Side) => {
    if (!currentPrice || !result) return;
    const atr = Math.max(1, result.metrics.atr || currentPrice * 0.005);
    setOrderIntent({
      side,
      coin,
      price: currentPrice,
      stop: side === "LONG" ? currentPrice - atr : currentPrice + atr,
      target: side === "LONG" ? currentPrice + atr * 2 : currentPrice - atr * 2,
    });
  };

  const confirmIntent = () => {
    if (!orderIntent) return;
    window.dispatchEvent(new CustomEvent("crypto_manual_order_intent_confirmed", { detail: { ...orderIntent, timestamp: Date.now() } }));
    setOrderIntent(null);
  };

  return (
    <section className="w-full border-b border-slate-200 bg-white px-2 py-2 sm:px-3">
      <div className="mx-auto max-w-[1500px] rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Bitcoin className="h-4 w-4 shrink-0 text-amber-600" />
            <div className="min-w-0">
              <h2 className="text-sm font-black text-slate-900">코인 실시간 분석</h2>
              <p className="text-[10px] text-slate-500">업비트 실시간 · 1분봉 · 매수/하락 위험 확인</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {COINS.map((item) => <button key={item.symbol} onClick={() => setCoin(item.symbol)} className={`rounded-md px-2 py-1 text-[10px] font-black ${coin === item.symbol ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600"}`}>{item.label}</button>)}
            <button onClick={() => void loadSeed()} disabled={loading} className="rounded-md border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600"><RefreshCw className={`inline h-3 w-3 ${loading ? "animate-spin" : ""}`} /></button>
          </div>
        </div>

        {error ? <div className="mt-2 flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1.5 text-xs font-bold text-rose-700"><AlertTriangle className="h-3.5 w-3.5" /> {error}</div> : <>
          <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            <Metric label="현재가" value={formatPrice(coin, currentPrice)} />
            <Metric label="상태" value={signal} />
            <Metric label="점수" value={result ? `${Math.round(result.score)}점` : "-"} />
            <Metric label="RSI / 거래강도" value={result ? `${result.metrics.rsi.toFixed(0)} / ${result.metrics.rvol.toFixed(1)}` : "-"} />
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <button onClick={() => prepareOrder("LONG")} className="flex items-center justify-center gap-1 rounded-lg bg-rose-600 px-3 py-2 text-sm font-black text-white"><TrendingUp className="h-4 w-4" /> 롱 준비</button>
            <button onClick={() => prepareOrder("SHORT")} className="flex items-center justify-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-black text-white"><TrendingDown className="h-4 w-4" /> 숏 준비</button>
          </div>

          {orderIntent && <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] text-slate-700">
            <div className="font-black">{orderIntent.coin} {orderIntent.side === "LONG" ? "롱" : "숏"} 주문 준비</div>
            <div className="mt-1 grid grid-cols-3 gap-1"><Small label="기준가" value={formatPrice(coin, orderIntent.price)} /><Small label="손절 기준" value={formatPrice(coin, orderIntent.stop)} /><Small label="목표 기준" value={formatPrice(coin, orderIntent.target)} /></div>
            <div className="mt-2 flex gap-1.5"><button onClick={confirmIntent} className="flex-1 rounded-md bg-slate-900 px-2 py-1.5 font-black text-white">주문 내용 확인</button><button onClick={() => setOrderIntent(null)} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-bold">취소</button></div>
            <div className="mt-1 flex items-center gap-1 text-[9px] text-slate-500"><ShieldCheck className="h-3 w-3" /> 이 화면은 주문 의도 확인까지만 하며 실제 자동 체결은 실행하지 않습니다.</div>
          </div>}

          <button onClick={() => setExpanded((v) => !v)} className="mt-2 flex w-full items-center justify-center gap-1 rounded-md bg-slate-50 py-1.5 text-[10px] font-bold text-slate-600">{expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}{expanded ? "상세 차트 접기" : "상세 차트 보기"}</button>

          {expanded && <div className="mt-2 grid gap-2 lg:grid-cols-[1.7fr_1fr]">
            <div className="rounded-lg bg-slate-950 p-2">
              <svg viewBox="0 0 1000 132" className="h-[180px] w-full" preserveAspectRatio="none" aria-label={`${coin} 실시간 1분봉 차트`}>
                {visible.map((c, i) => {
                  const x = 12 + i * (970 / Math.max(1, visible.length - 1));
                  const width = Math.max(3, 620 / Math.max(1, visible.length));
                  const openY = y(c.open); const closeY = y(c.close); const highY = y(c.high); const lowY = y(c.low);
                  const up = c.close >= c.open; const volH = Math.max(1, (c.volume / maxVol) * 22);
                  return <g key={`${c.timestamp ?? c.time}-${i}`}><line x1={x} x2={x} y1={highY} y2={lowY} stroke={up ? "#fb7185" : "#60a5fa"} strokeWidth="1" /><rect x={x - width / 2} y={Math.min(openY, closeY)} width={width} height={Math.max(1, Math.abs(openY - closeY))} fill={up ? "#fb7185" : "#60a5fa"} /><rect x={x - width / 2} y={128 - volH} width={width} height={volH} fill={up ? "#4c1d2f" : "#172554"} /></g>;
                })}
                {visible.length > 1 && <><polyline points={linePoints(overlays.ema20)} fill="none" stroke="#fbbf24" strokeWidth="1.4" /><polyline points={linePoints(overlays.ema50)} fill="none" stroke="#a78bfa" strokeWidth="1.3" /><polyline points={linePoints(overlays.vwap)} fill="none" stroke="#34d399" strokeWidth="1.3" strokeDasharray="4 3" /></>}
              </svg>
              <div className="text-[9px] text-slate-400">노랑 EMA20 · 보라 EMA50 · 초록 VWAP · 최근 {visible.length}개 1분봉</div>
            </div>
            <div className="rounded-lg border border-slate-200 p-2 text-[10px]">
              <div className="grid grid-cols-2 gap-1"><Small label="EMA20" value={formatPrice(coin, result?.metrics.ema20)} /><Small label="EMA50" value={formatPrice(coin, result?.metrics.ema50)} /><Small label="VWAP" value={formatPrice(coin, result?.metrics.vwap)} /><Small label="실시간 지연" value={lastTick ? `${lastTick.latencyMs}ms` : "대기"} /></div>
              <div className="mt-2 font-black text-slate-700"><BellRing className="mr-1 inline h-3.5 w-3.5" />신호 변화</div>
              <div className="mt-1 space-y-1 text-slate-500">{alerts.length ? alerts.map((a) => <div key={a.at}>{a.from} → <b>{a.to}</b> · {Math.round(a.score)}점</div>) : <div>변화 없음</div>}</div>
            </div>
          </div>}
        </>}
      </div>
    </section>
  );
};

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => <div className="rounded-lg bg-slate-50 px-2 py-1.5"><div className="text-[9px] font-bold text-slate-400">{label}</div><div className="truncate text-xs font-black text-slate-800">{value}</div></div>;
const Small: React.FC<{ label: string; value: string }> = ({ label, value }) => <div className="rounded-md bg-white px-2 py-1.5"><div className="text-[8px] font-bold text-slate-400">{label}</div><div className="truncate text-[10px] font-black text-slate-700">{value}</div></div>;
