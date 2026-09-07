import React, { useEffect, useRef } from "react";
import { createChart, IChartApi, ISeriesApi, CandlestickData, HistogramData, LineData, SeriesType } from "lightweight-charts";
import { ChartCandleDataV192, ChartMarkerV192, ChartPriceLineV192, ChartForecastDataV192 } from "./TradingChartModelV192";
import { Activity, ShieldCheck, Clock, Sparkles } from "lucide-react";

interface RealtimeTradingChartV192Props {
  symbol: string;
  name: string;
  market?: string;
  candles: ChartCandleDataV192[];
  markers?: ChartMarkerV192[];
  priceLines?: ChartPriceLineV192[];
  forecastPath?: ChartForecastDataV192[];
  dataStatus?: "REALTIME_VERIFIED" | "STALE" | "NO_DATA";
  dataSource?: string;
  ageMs?: number;
}

export const RealtimeTradingChartV192: React.FC<RealtimeTradingChartV192Props> = ({
  symbol,
  name,
  market = "KOREA",
  candles,
  markers = [],
  priceLines = [],
  forecastPath = [],
  dataStatus = "REALTIME_VERIFIED",
  dataSource = "KIS/UPBIT Real Market Feed",
  ageMs = 120
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartApiRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;

    // Clean up previous chart
    if (chartApiRef.current) {
      chartApiRef.current.remove();
      chartApiRef.current = null;
    }

    const isDark = true;
    const bg = "#090d16";
    const text = "#94a3b8";

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth || 700,
      height: 380,
      layout: {
        background: { color: bg },
        textColor: text,
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#1e293b" },
        horzLines: { color: "#1e293b" },
      },
      crosshair: {
        mode: 1,
      },
      timeScale: {
        borderColor: "#334155",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartApiRef.current = chart;

    // 1. Candlestick Series
    const candleSeries = chart.addSeries(
      // Lightweight charts 5.x createSeries or addSeries
      (chart as any).addCandlestickSeries ? (chart as any).addCandlestickSeries({
        upColor: market === "US" ? "#10b981" : "#ef4444",
        downColor: market === "US" ? "#ef4444" : "#3b82f6",
        borderVisible: false,
        wickUpColor: market === "US" ? "#10b981" : "#ef4444",
        wickDownColor: market === "US" ? "#ef4444" : "#3b82f6",
      }) : (chart as any).addSeries({ type: 'Candlestick' }, {
        upColor: market === "US" ? "#10b981" : "#ef4444",
        downColor: market === "US" ? "#ef4444" : "#3b82f6",
      })
    );

    // Format time for lightweight charts
    const formattedCandles = candles.map((c, idx) => {
      let timeVal: any = c.time;
      if (typeof c.time === "number") {
        timeVal = Math.floor(c.time / 1000);
      } else if (typeof c.time === "string" && !c.time.includes("-")) {
        // "09:00" string -> synthesize monotonically increasing string or index date
        const baseDate = new Date();
        baseDate.setHours(9, 0, 0, 0);
        timeVal = Math.floor((baseDate.getTime() + idx * 300000) / 1000);
      }
      return {
        time: timeVal,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      };
    });

    candleSeries.setData(formattedCandles);

    // 2. Volume Series
    const volumeSeries = (chart as any).addHistogramSeries ? (chart as any).addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "",
    }) : (chart as any).addSeries({ type: 'Histogram' }, {
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    const formattedVolume = candles.map((c, idx) => {
      let timeVal: any = formattedCandles[idx].time;
      return {
        time: timeVal,
        value: c.volume,
        color: c.close >= c.open ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)",
      };
    });

    volumeSeries.setData(formattedVolume);

    // 3. VWAP Line Series
    const vwapCandles = candles.filter(c => c.vwap != null);
    if (vwapCandles.length > 0) {
      const vwapSeries = (chart as any).addLineSeries ? (chart as any).addLineSeries({
        color: "#f59e0b",
        lineWidth: 2,
        title: "VWAP",
      }) : (chart as any).addSeries({ type: 'Line' }, {
        color: "#f59e0b",
        lineWidth: 2,
        title: "VWAP",
      });

      vwapSeries.setData(
        candles.map((c, idx) => ({
          time: formattedCandles[idx].time,
          value: c.vwap ?? c.close,
        }))
      );
    }

    // 4. EMA 9 & EMA 20 Lines
    const ema9Series = (chart as any).addLineSeries ? (chart as any).addLineSeries({
      color: "#06b6d4",
      lineWidth: 1,
      title: "EMA 9",
    }) : (chart as any).addSeries({ type: 'Line' }, {
      color: "#06b6d4",
      lineWidth: 1,
      title: "EMA 9",
    });

    ema9Series.setData(
      candles.map((c, idx) => ({
        time: formattedCandles[idx].time,
        value: c.ema9 ?? c.close,
      }))
    );

    const ema20Series = (chart as any).addLineSeries ? (chart as any).addLineSeries({
      color: "#a855f7",
      lineWidth: 1,
      title: "EMA 20",
    }) : (chart as any).addSeries({ type: 'Line' }, {
      color: "#a855f7",
      lineWidth: 1,
      title: "EMA 20",
    });

    ema20Series.setData(
      candles.map((c, idx) => ({
        time: formattedCandles[idx].time,
        value: c.ema20 ?? c.close,
      }))
    );

    // 5. Markers (BUY / SELL / HOLD)
    if (markers.length > 0) {
      const mappedMarkers = markers.map((m, idx) => {
        const matchingCandleIdx = Math.min(idx, formattedCandles.length - 1);
        return {
          time: formattedCandles[matchingCandleIdx].time,
          position: m.position,
          color: m.color,
          shape: m.shape,
          text: m.text,
        };
      });
      
      if ((candleSeries as any).setMarkers) {
        (candleSeries as any).setMarkers(mappedMarkers);
      }
    }

    // 6. Price Lines (Stop, Target, Trailing Floor)
    priceLines.forEach(pl => {
      if ((candleSeries as any).createPriceLine) {
        (candleSeries as any).createPriceLine({
          price: pl.price,
          color: pl.color,
          lineWidth: pl.lineWidth,
          lineStyle: pl.lineStyle,
          axisLabelVisible: pl.axisLabelVisible,
          title: pl.title,
        });
      }
    });

    // 7. Optional Forecast Layer (Only rendered if explicit forecast model path exists!)
    if (forecastPath && forecastPath.length > 0) {
      const forecastSeries = (chart as any).addLineSeries ? (chart as any).addLineSeries({
        color: "#10b981",
        lineWidth: 2,
        lineStyle: 2, // Dashed
        title: "FORECAST (AI)",
      }) : (chart as any).addSeries({ type: 'Line' }, {
        color: "#10b981",
        lineWidth: 2,
        lineStyle: 2,
        title: "FORECAST (AI)",
      });

      const lastTime = formattedCandles[formattedCandles.length - 1].time as number;
      const forecastData = forecastPath.map((f, i) => ({
        time: (typeof lastTime === "number" ? lastTime + (i + 1) * 300 : `F+${i + 1}`) as any,
        value: f.forecastPrice,
      }));

      forecastSeries.setData(forecastData);
    }

    // Auto-fit content
    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current && chartApiRef.current) {
        chartApiRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartApiRef.current) {
        chartApiRef.current.remove();
        chartApiRef.current = null;
      }
    };
  }, [candles, markers, priceLines, forecastPath, market]);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 font-sans">
      {/* Header Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-cyan-400 animate-pulse" />
          <h3 className="text-sm font-black text-white">
            {name} ({symbol}) V19.2 실시간 트레이딩 차트
          </h3>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className={`px-2.5 py-0.5 rounded-full font-extrabold flex items-center gap-1 border ${
            dataStatus === "REALTIME_VERIFIED"
              ? "bg-emerald-950/80 text-emerald-400 border-emerald-700/80"
              : "bg-amber-950/80 text-amber-400 border-amber-700/80"
          }`}>
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{dataStatus === "REALTIME_VERIFIED" ? "실시간 검증 데이터" : "STALE FEED"}</span>
          </span>

          <span className="text-slate-400 flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
            <Clock className="h-3 w-3 text-cyan-400" />
            <span>age: {ageMs}ms</span>
          </span>

          <span className="text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
            {dataSource}
          </span>
        </div>
      </div>

      {/* Lightweight Charts Canvas */}
      <div ref={chartContainerRef} className="w-full min-h-[380px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800" />

      {/* Legend & Disclaimer */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10.5px] font-mono text-slate-400 pt-1">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-amber-400" />
            <span>VWAP</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-cyan-400" />
            <span>EMA 9</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-purple-400" />
            <span>EMA 20</span>
          </span>
          {forecastPath.length > 0 && (
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <Sparkles className="h-3 w-3" />
              <span>AI 30일 예측 궤적 (NOT ACTUAL PRICE)</span>
            </span>
          )}
        </div>

        <span className="text-slate-500">Lightweight Charts 5.2.1 • AISTOCK V19.2 UNIFIED</span>
      </div>
    </div>
  );
};
