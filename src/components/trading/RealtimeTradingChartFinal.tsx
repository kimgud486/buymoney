// ----------------------------------------------------------------------
// REALTIME TRADING CHART FINAL (AISTOCK FINAL RC)
// TradingView Lightweight Charts 5.2 rendering layer driven by Position Runtime DTO
// ----------------------------------------------------------------------

import React, { useEffect, useRef, useState } from "react";
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, SeriesMarker } from "lightweight-charts";
import { PositionState } from "../../trading/PositionStateMachine";

export interface ChartMarkerDTO {
  time: Time;
  position: "aboveBar" | "belowBar";
  color: string;
  shape: "circle" | "square" | "arrowUp" | "arrowDown";
  text: string;
}

export interface PositionRuntimeChartDTO {
  positionState: PositionState;
  entryPrice?: number | null;
  currentPrice?: number | null;
  highestPriceSinceBuy?: number | null;
  initialStopPrice?: number | null;
  trailingFloor?: number | null;
  defenseSellPrice?: number | null;
  expectedSellLow?: number | null;
  expectedSellMid?: number | null;
  expectedSellHigh?: number | null;
  dataStatus: "REALTIME_VERIFIED" | "REALTIME_DERIVED" | "STALE" | "NO_DATA" | "CLOSED";
}

export interface RealtimeTradingChartFinalProps {
  symbol: string;
  timeframe?: string; // 1m, 5m, 15m, 1h, 1d
  candles: {
    time: string | number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    vwap?: number;
    ema9?: number;
    ema20?: number;
  }[];
  positionDto?: PositionRuntimeChartDTO | null;
  height?: number;
}

export const RealtimeTradingChartFinal: React.FC<RealtimeTradingChartFinalProps> = ({
  symbol,
  timeframe = "5m",
  candles,
  positionDto,
  height = 420
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartApiRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const vwapSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  const [tf, setTf] = useState<string>(timeframe.toLowerCase());

  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (chartApiRef.current) {
      try {
        chartApiRef.current.remove();
      } catch {
        // Ignore if disposed
      }
      chartApiRef.current = null;
    }
    candlestickSeriesRef.current = null;
    volumeSeriesRef.current = null;
    vwapSeriesRef.current = null;

    const chart = createChart(chartContainerRef.current, {
      height,
      layout: {
        background: { color: "#0F172A" },
        textColor: "#94A3B8"
      },
      grid: {
        vertLines: { color: "#1E293B" },
        horzLines: { color: "#1E293B" }
      },
      crosshair: {
        mode: 1
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false
      }
    });

    chartApiRef.current = chart;

    const candlestickSeries = (chart as any).addCandlestickSeries
      ? (chart as any).addCandlestickSeries({
          upColor: "#10B981",
          downColor: "#EF4444",
          borderUpColor: "#10B981",
          borderDownColor: "#EF4444",
          wickUpColor: "#10B981",
          wickDownColor: "#EF4444"
        })
      : (chart as any).addSeries({ type: "Candlestick" }, {
          upColor: "#10B981",
          downColor: "#EF4444"
        });
    candlestickSeriesRef.current = candlestickSeries;

    const volumeSeries = (chart as any).addHistogramSeries
      ? (chart as any).addHistogramSeries({
          priceFormat: { type: "volume" },
          priceScaleId: ""
        })
      : (chart as any).addSeries({ type: "Histogram" }, {
          priceFormat: { type: "volume" },
          priceScaleId: ""
        });
    if (volumeSeries.priceScale) {
      volumeSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 }
      });
    }
    volumeSeriesRef.current = volumeSeries;

    const vwapSeries = (chart as any).addLineSeries
      ? (chart as any).addLineSeries({
          color: "#F59E0B",
          lineWidth: 2,
          title: "VWAP"
        })
      : (chart as any).addSeries({ type: "Line" }, {
          color: "#F59E0B",
          lineWidth: 2
        });
    vwapSeriesRef.current = vwapSeries;

    const handleResize = () => {
      if (chartContainerRef.current && chartApiRef.current) {
        try {
          chartApiRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
        } catch {
          // Ignore if disposed
        }
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      try {
        chart.remove();
      } catch {
        // Ignore if disposed
      }
      chartApiRef.current = null;
      candlestickSeriesRef.current = null;
      volumeSeriesRef.current = null;
      vwapSeriesRef.current = null;
    };
  }, [height]);

  useEffect(() => {
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current || !vwapSeriesRef.current) return;

    try {
      if (!candles || candles.length === 0) {
        candlestickSeriesRef.current.setData([]);
        volumeSeriesRef.current.setData([]);
        vwapSeriesRef.current.setData([]);
        return;
      }

      const candleData: CandlestickData<Time>[] = [];
      const volumeData: any[] = [];
      const vwapData: any[] = [];
      const markers: SeriesMarker<Time>[] = [];

      candles.forEach((c, idx) => {
        let sec: number;
        if (typeof c.time === "number") {
          sec = c.time;
        } else if (typeof c.time === "string") {
          const pNum = Number(c.time);
          if (Number.isFinite(pNum) && pNum > 0) {
            sec = pNum;
          } else {
            sec = Math.floor(new Date(c.time).getTime() / 1000);
          }
        } else {
          sec = 0;
        }
        if (!Number.isFinite(sec) || sec <= 0) {
          sec = Math.floor(Date.now() / 1000) - (candles.length - idx) * 300;
        }
        if (sec > 10_000_000_000) {
          sec = Math.floor(sec / 1000);
        }

        const timeVal = sec as Time;
        candleData.push({
          time: timeVal,
          open: Number(c.open) || 0,
          high: Number(c.high) || 0,
          low: Number(c.low) || 0,
          close: Number(c.close) || 0
        });

        volumeData.push({
          time: timeVal,
          value: c.volume,
          color: c.close >= c.open ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)"
        });

        if (c.vwap) {
          vwapData.push({
            time: timeVal,
            value: c.vwap
          });
        }

        // Add position markers on last bar if position exists
        if (idx === candles.length - 1 && positionDto) {
          if (positionDto.positionState === "BUY_FILLED") {
            markers.push({
              time: timeVal,
              position: "belowBar",
              color: "#10B981",
              shape: "arrowUp",
              text: "BUY FILLED"
            });
          } else if (positionDto.positionState.startsWith("PROFIT_HOLD")) {
            markers.push({
              time: timeVal,
              position: "aboveBar",
              color: "#3B82F6",
              shape: "circle",
              text: positionDto.positionState
            });
          } else if (positionDto.positionState.startsWith("SELL_WATCH")) {
            markers.push({
              time: timeVal,
              position: "aboveBar",
              color: "#F59E0B",
              shape: "square",
              text: positionDto.positionState
            });
          } else if (positionDto.positionState === "CLOSED") {
            markers.push({
              time: timeVal,
              position: "aboveBar",
              color: "#EF4444",
              shape: "arrowDown",
              text: "SELL FILLED"
            });
          }
        }
      });

      candlestickSeriesRef.current.setData(candleData);
      volumeSeriesRef.current.setData(volumeData);
      vwapSeriesRef.current.setData(vwapData);

      if (markers.length > 0) {
        candlestickSeriesRef.current.setMarkers(markers);
      }
    } catch {
      // Ignore if chart/series is disposed
    }
  }, [candles, positionDto]);

  return (
    <div className="flex flex-col w-full bg-slate-900 border border-slate-800 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-white font-bold text-lg">{symbol}</span>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono uppercase">
            {tf}
          </span>
          {positionDto?.dataStatus && (
            <span
              className={`text-xs px-2 py-0.5 rounded font-mono ${
                positionDto.dataStatus === "REALTIME_VERIFIED"
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                  : "bg-amber-950 text-amber-400 border border-amber-800"
              }`}
            >
              {positionDto.dataStatus}
            </span>
          )}
        </div>

        <div className="flex space-x-1">
          {["1m", "5m", "15m", "1h", "1d"].map((t) => (
            <button
              key={t}
              onClick={() => setTf(t)}
              className={`px-2 py-1 text-xs rounded font-medium transition ${
                tf === t ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div ref={chartContainerRef} className="w-full rounded" />
    </div>
  );
};
