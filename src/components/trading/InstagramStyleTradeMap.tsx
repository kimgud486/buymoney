import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";

interface Candle {
  time: number | string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface TradeLevels {
  stop: number;
  entry: number;
  tp1: number;
  tp2: number;
  tp3: number;
  atr: number;
  trend: "BULLISH" | "BEARISH" | "NEUTRAL";
  score: number;
  winRate: number | null;
  samples: number;
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function toUnixTime(value: number | string, fallbackIndex: number): UTCTimestamp {
  if (typeof value === "number") {
    if (value > 10_000_000_000) return Math.floor(value / 1000) as UTCTimestamp;
    if (value > 1_000_000_000) return Math.floor(value) as UTCTimestamp;
  }
  const parsed = new Date(value).getTime();
  if (Number.isFinite(parsed)) return Math.floor(parsed / 1000) as UTCTimestamp;
  return Math.floor(Date.now() / 1000 - (200 - fallbackIndex) * 86400) as UTCTimestamp;
}

function average(values: number[]) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function ema(values: number[], period: number) {
  if (!values.length) return 0;
  const k = 2 / (period + 1);
  return values.slice(1).reduce((prev, value) => value * k + prev * (1 - k), values[0]);
}

function buildLevels(candles: Candle[]): TradeLevels | null {
  if (candles.length < 25) return null;
  const recent = candles.slice(-60);
  const closes = recent.map((c) => c.close);
  const trueRanges = recent.slice(1).map((c, i) => {
    const prevClose = recent[i].close;
    return Math.max(c.high - c.low, Math.abs(c.high - prevClose), Math.abs(c.low - prevClose));
  });
  const atr = average(trueRanges.slice(-14));
  const last = recent[recent.length - 1];
  const fast = ema(closes.slice(-30), 9);
  const slow = ema(closes.slice(-40), 21);
  const trend: TradeLevels["trend"] = fast > slow * 1.002 ? "BULLISH" : fast < slow * 0.998 ? "BEARISH" : "NEUTRAL";

  const swing = recent.slice(-20);
  const support = Math.min(...swing.map((c) => c.low));
  const resistance = Math.max(...swing.map((c) => c.high));
  const usableAtr = atr || Math.max(last.close * 0.01, 1);

  const entry = trend === "BEARISH" ? Math.min(last.close, resistance - usableAtr * 0.25) : Math.max(last.close, support + usableAtr * 0.25);
  const stop = trend === "BEARISH" ? entry + usableAtr * 1.15 : entry - usableAtr * 1.15;
  const direction = trend === "BEARISH" ? -1 : 1;
  const tp1 = entry + direction * usableAtr * 0.9;
  const tp2 = entry + direction * usableAtr * 1.65;
  const tp3 = entry + direction * usableAtr * 2.45;

  const momentum = Math.abs(fast - slow) / Math.max(last.close, 1);
  const score = Math.round(clamp(55 + momentum * 2200 + (trend === "NEUTRAL" ? -12 : 8), 0, 100));

  let wins = 0;
  let samples = 0;
  for (let i = 22; i < recent.length - 5; i++) {
    const hist = recent.slice(0, i + 1);
    const histClose = hist.map((c) => c.close);
    const hf = ema(histClose.slice(-30), 9);
    const hs = ema(histClose.slice(-40), 21);
    const dir = hf >= hs ? 1 : -1;
    const base = hist[hist.length - 1].close;
    const trs = hist.slice(-15).slice(1).map((c, j) => {
      const pc = hist[hist.length - 15 + j].close;
      return Math.max(c.high - c.low, Math.abs(c.high - pc), Math.abs(c.low - pc));
    });
    const a = average(trs) || base * 0.01;
    const target = base + dir * a * 0.9;
    const risk = base - dir * a * 1.15;
    const future = recent.slice(i + 1, i + 6);
    let outcome: "WIN" | "LOSS" | null = null;
    for (const bar of future) {
      if (dir > 0) {
        if (bar.low <= risk) { outcome = "LOSS"; break; }
        if (bar.high >= target) { outcome = "WIN"; break; }
      } else {
        if (bar.high >= risk) { outcome = "LOSS"; break; }
        if (bar.low <= target) { outcome = "WIN"; break; }
      }
    }
    if (outcome) {
      samples += 1;
      if (outcome === "WIN") wins += 1;
    }
  }

  return {
    stop,
    entry,
    tp1,
    tp2,
    tp3,
    atr: usableAtr,
    trend,
    score,
    winRate: samples >= 5 ? Math.round((wins / samples) * 100) : null,
    samples,
  };
}

export function InstagramStyleTradeMap() {
  const [symbol, setSymbol] = useState("005930");
  const [activeSymbol, setActiveSymbol] = useState("005930");
  const [name, setName] = useState("005930");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chartHostRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const levels = useMemo(() => buildLevels(candles), [candles]);

  async function load(nextSymbol: string) {
    const clean = nextSymbol.trim();
    if (!clean) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/market/realtime-candles?symbol=${encodeURIComponent(clean)}&timeframe=D&count=120`, { cache: "no-store" });
      if (!response.ok) throw new Error(`market candle endpoint ${response.status}`);
      const payload = await response.json();
      const raw = Array.isArray(payload?.candles) ? payload.candles : [];
      const normalized: Candle[] = raw
        .map((c: any) => ({
          time: c.time ?? c.timestamp ?? c.date,
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),
          volume: Number(c.volume || 0),
        }))
        .filter((c: Candle) => [c.open, c.high, c.low, c.close].every(Number.isFinite));
      if (normalized.length < 25) throw new Error("실제 완료봉 데이터가 부족합니다.");
      setCandles(normalized);
      setName(String(payload?.name || clean));
      setActiveSymbol(clean);
    } catch (e) {
      setCandles([]);
      setError(e instanceof Error ? e.message : "시세 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load("005930"); }, []);

  useEffect(() => {
    if (!chartHostRef.current) return;
    const host = chartHostRef.current;
    const chart = createChart(host, {
      width: host.clientWidth,
      height: 520,
      layout: { background: { type: ColorType.Solid, color: "#05070b" }, textColor: "#8d99aa" },
      grid: { vertLines: { color: "#111827" }, horzLines: { color: "#111827" } },
      rightPriceScale: { borderColor: "#1f2937" },
      timeScale: { borderColor: "#1f2937", timeVisible: true },
      crosshair: { vertLine: { color: "#64748b" }, horzLine: { color: "#64748b" } },
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#18d5a8",
      downColor: "#ff3b5c",
      wickUpColor: "#18d5a8",
      wickDownColor: "#ff3b5c",
      borderVisible: false,
      priceLineVisible: false,
    });
    chartRef.current = chart;
    seriesRef.current = series;
    const resize = () => chart.applyOptions({ width: host.clientWidth });
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series || !candles.length) return;
    const data: CandlestickData[] = candles.map((c, i) => ({
      time: toUnixTime(c.time, i), open: c.open, high: c.high, low: c.low, close: c.close,
    }));
    series.setData(data);
    chart.timeScale().fitContent();
    if (!levels) return;
    const lines = [
      { price: levels.stop, color: "#ef4444", title: "STOP" },
      { price: levels.entry, color: "#22c55e", title: "ENTRY" },
      { price: levels.tp1, color: "#06b6d4", title: "TP1" },
      { price: levels.tp2, color: "#f59e0b", title: "TP2" },
      { price: levels.tp3, color: "#a855f7", title: "TP3" },
    ];
    const created = lines.map((line) => series.createPriceLine({
      price: line.price, color: line.color, lineWidth: 2, lineStyle: 2, axisLabelVisible: true, title: line.title,
    }));
    return () => created.forEach((line) => series.removePriceLine(line));
  }, [candles, levels]);

  const price = candles.at(-1)?.close ?? 0;
  const bias = levels?.trend === "BULLISH" ? "BUY BIAS" : levels?.trend === "BEARISH" ? "SELL BIAS" : "WAIT";

  return (
    <section className="w-full bg-[#03050a] px-3 py-5 text-slate-100 md:px-6">
      <div className="mx-auto max-w-[1600px] overflow-hidden rounded-3xl border border-slate-800 bg-[#060910] shadow-2xl">
        <div className="flex flex-col gap-3 border-b border-slate-800 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[11px] font-black tracking-[0.22em] text-cyan-400">AI TRADE MAP · VERIFIED CANDLES</div>
            <div className="mt-1 text-xl font-black">{name} <span className="text-sm text-slate-500">{activeSymbol}</span></div>
          </div>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void load(symbol); }}>
            <input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="종목코드" className="w-36 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold outline-none focus:border-cyan-500" />
            <button disabled={loading} className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 disabled:opacity-50">{loading ? "분석중" : "분석"}</button>
          </form>
        </div>

        <div className="grid gap-0 xl:grid-cols-[1fr_280px]">
          <div className="relative min-w-0">
            <div ref={chartHostRef} className="w-full" />
            {levels && (
              <div className="pointer-events-none absolute left-4 top-4 rounded-2xl border border-slate-700/80 bg-slate-950/85 p-3 backdrop-blur">
                <div className="text-xs font-black text-slate-400">LIVE DECISION</div>
                <div className={`mt-1 text-lg font-black ${levels.trend === "BULLISH" ? "text-emerald-400" : levels.trend === "BEARISH" ? "text-rose-400" : "text-amber-300"}`}>{bias}</div>
                <div className="mt-2 text-xs text-slate-400">AI SCORE <span className="font-black text-white">{levels.score}/100</span></div>
              </div>
            )}
          </div>

          <aside className="border-t border-slate-800 bg-[#080c14] p-4 xl:border-l xl:border-t-0">
            <div className="grid grid-cols-2 gap-2 xl:grid-cols-1">
              <Metric label="현재가" value={price ? price.toLocaleString() : "-"} />
              <Metric label="방향" value={levels?.trend ?? "-"} />
              <Metric label="진입" value={levels ? levels.entry.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "-"} />
              <Metric label="손절" value={levels ? levels.stop.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "-"} />
              <Metric label="TP1" value={levels ? levels.tp1.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "-"} />
              <Metric label="TP2" value={levels ? levels.tp2.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "-"} />
              <Metric label="TP3" value={levels ? levels.tp3.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "-"} />
            </div>
            <div className="mt-3 rounded-2xl border border-slate-700 bg-slate-950 p-4 text-center">
              <div className="text-xs font-black uppercase tracking-widest text-slate-500">Historical hit rate</div>
              <div className="mt-1 text-3xl font-black text-white">{levels?.winRate == null ? "N/A" : `${levels.winRate}%`}</div>
              <div className="mt-1 text-[11px] text-slate-500">최근 완료봉 간이검증 · 표본 {levels?.samples ?? 0}회</div>
            </div>
            <p className="mt-3 text-[11px] leading-5 text-slate-500">영상의 시각 구조를 재현하되, 승률은 고정값으로 만들지 않습니다. 실제 완료봉에서 계산 가능한 경우에만 표시합니다.</p>
          </aside>
        </div>
        {error && <div className="border-t border-rose-900/50 bg-rose-950/40 px-4 py-3 text-sm font-bold text-rose-300">{error}</div>}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
      <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-black text-slate-100">{value}</div>
    </div>
  );
}
