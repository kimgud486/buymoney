import React, { useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  LineSeries,
  createChart,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import type { VerifiedSignalResult } from "../scanner/verifiedSignalEngine";

interface Props {
  symbol: string;
  result: VerifiedSignalResult;
}

interface CandleRow {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function toTime(raw: unknown, index: number): Time {
  if (typeof raw === "number") {
    const seconds = raw > 1e12 ? Math.floor(raw / 1000) : Math.floor(raw);
    return seconds as Time;
  }
  if (typeof raw === "string" && raw.trim()) {
    const ts = Date.parse(raw);
    if (Number.isFinite(ts)) return Math.floor(ts / 1000) as Time;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw as Time;
  }
  return (Math.floor(Date.now() / 1000) - (1000 - index) * 86400) as Time;
}

function ema(values: number[], period: number): number[] {
  if (!values.length) return [];
  const alpha = 2 / (period + 1);
  const out = [values[0]];
  for (let i = 1; i < values.length; i += 1) out.push(alpha * values[i] + (1 - alpha) * out[i - 1]);
  return out;
}

function rollingVwap(candles: CandleRow[]): number[] {
  let pv = 0;
  let vol = 0;
  return candles.map((c) => {
    const typical = (c.high + c.low + c.close) / 3;
    const v = Math.max(0, c.volume);
    pv += typical * v;
    vol += v;
    return vol > 0 ? pv / vol : c.close;
  });
}

export const VerifiedSignalOverlayChart: React.FC<Props> = ({ symbol, result }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/market/realtime-candles?symbol=${encodeURIComponent(symbol)}&timeframe=D&count=70`);
        if (!res.ok) throw new Error(`캔들 조회 실패 (${res.status})`);
        const json = await res.json();
        if (!Array.isArray(json?.candles) || json.candles.length < 20) throw new Error("차트용 완료봉 데이터가 부족합니다.");

        const normalized: CandleRow[] = json.candles
          .map((c: any, i: number) => ({
            time: toTime(c?.time ?? c?.timestamp, i),
            open: Number(c?.open),
            high: Number(c?.high),
            low: Number(c?.low),
            close: Number(c?.close),
            volume: Number(c?.volume) || 0,
          }))
          .filter((c: CandleRow) => [c.open, c.high, c.low, c.close].every(Number.isFinite) && c.close > 0 && c.high >= c.low)
          .slice(0, -1);

        if (!containerRef.current || cancelled || normalized.length < 20) return;
        chartRef.current?.remove();

        const chart = createChart(containerRef.current, {
          height: 420,
          layout: { background: { type: ColorType.Solid, color: "#07111f" }, textColor: "#94a3b8" },
          grid: { vertLines: { color: "#122033" }, horzLines: { color: "#122033" } },
          rightPriceScale: { borderColor: "#243244" },
          timeScale: { borderColor: "#243244", timeVisible: false },
          crosshair: { vertLine: { color: "#475569" }, horzLine: { color: "#475569" } },
        });
        chartRef.current = chart;

        const candles = chart.addSeries(CandlestickSeries, {
          upColor: "#22c55e",
          downColor: "#ef4444",
          borderVisible: false,
          wickUpColor: "#22c55e",
          wickDownColor: "#ef4444",
        });
        candles.setData(normalized.map(({ time, open, high, low, close }) => ({ time, open, high, low, close })));

        const closes = normalized.map((c) => c.close);
        const e9 = ema(closes, 9);
        const e20 = ema(closes, 20);
        const e50 = ema(closes, 50);
        const vw = rollingVwap(normalized);

        const addLine = (values: number[], color: string, width: 1 | 2 = 1): ISeriesApi<"Line"> => {
          const s = chart.addSeries(LineSeries, { color, lineWidth: width, priceLineVisible: false, lastValueVisible: false });
          s.setData(values.map((value, i) => ({ time: normalized[i].time, value })));
          return s;
        };

        addLine(e9, "#22d3ee", 2);
        addLine(e20, "#a78bfa", 2);
        addLine(e50, "#f59e0b", 1);
        addLine(vw, "#f8fafc", 1);

        const priceLines = [
          { price: result.entryLow, title: "ENTRY LOW", color: "#22d3ee" },
          { price: result.entryHigh, title: "ENTRY HIGH", color: "#06b6d4" },
          { price: result.stopLoss, title: "STOP", color: "#ef4444" },
          { price: result.target1, title: "TP1", color: "#22c55e" },
          { price: result.target2, title: "TP2", color: "#84cc16" },
        ];
        priceLines.forEach((p) => candles.createPriceLine({ price: p.price, color: p.color, lineWidth: 2, lineStyle: 2, axisLabelVisible: true, title: p.title }));

        const last = normalized[normalized.length - 1];
        createSeriesMarkers(candles, [
          {
            time: last.time,
            position: "belowBar",
            color: result.decision === "BUY_APPROVED" ? "#22c55e" : "#f59e0b",
            shape: "arrowUp",
            text: result.decision === "BUY_APPROVED" ? `BUY ${result.score}` : `WATCH ${result.score}`,
          },
        ]);

        chart.timeScale().fitContent();
        resizeObserver = new ResizeObserver((entries) => {
          const width = entries[0]?.contentRect.width;
          if (width) chart.applyOptions({ width });
        });
        resizeObserver.observe(containerRef.current);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "검증 차트를 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      chartRef.current?.remove();
      chartRef.current = null;
    };
  }, [symbol, result]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="font-black text-cyan-300">VERIFIED SIGNAL CHART · {symbol}</div>
        <div className="text-slate-500">EMA9 · EMA20 · EMA50 · VWAP · ENTRY · STOP · TP1 · TP2</div>
      </div>
      {loading && <div className="flex h-[420px] items-center justify-center text-sm text-slate-400">완료봉 기반 검증 차트 구성 중...</div>}
      {error && !loading && <div className="flex h-[160px] items-center justify-center text-sm text-rose-300">{error}</div>}
      <div ref={containerRef} className={loading || error ? "hidden" : "block w-full"} />
    </div>
  );
};
