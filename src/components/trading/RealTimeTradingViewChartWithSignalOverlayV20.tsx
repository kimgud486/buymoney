// AISTOCK V20 REALTIME TRADINGVIEW CHART WITH LIVE SIGNAL OVERLAY
// Real-time chart wrapper integrating Lightweight Charts 5.2 and V20 Signal Overlay Intel.

import React, { useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  IChartApi,
  ISeriesApi,
  LineStyle,
} from "lightweight-charts";
import { LiveTickBarBuilderV20, V20Bar, V20Tick } from "../../services/v20/LiveTickBarBuilderV20";
import { V20SetupScorer, V20SetupScoreResult } from "../../services/v20/V20SetupScorer";
import { AdaptiveTradePlanEngineV20 } from "../../services/v20/AdaptiveTradePlanEngineV20";
import { LiveTradeSignalTrackerV20, FrozenTradeSignal, SignalOverlayStats } from "../../services/v20/LiveTradeSignalTrackerV20";
import { LiveSignalOverlayPanelV20 } from "./LiveSignalOverlayPanelV20";
import { realTimeMarketFeedManager } from "../../realtime/RealTimeMarketFeedService";
import { IndicatorEngine } from "../../realtime/IndicatorEngine";

export interface RealTimeTradingViewChartWithSignalOverlayV20Props {
  symbol: string;
  name?: string;
  market?: "KOREA" | "US" | "UPBIT" | "CRYPTO";
  initialPrice: number;
  initialCandles?: Array<{
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
  isWhiteTheme?: boolean;
  timeframe?: "1m" | "3m" | "5m" | "15m";
  className?: string;
}

export const RealTimeTradingViewChartWithSignalOverlayV20: React.FC<
  RealTimeTradingViewChartWithSignalOverlayV20Props
> = ({
  symbol,
  name = symbol,
  market = "KOREA",
  initialPrice,
  initialCandles = [],
  isWhiteTheme = false,
  timeframe = "1m",
  className = "",
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const vwapSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ema9SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ema20SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  // Signal lines
  const entryLineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const slLineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const tp1LineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const tp2LineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const tp3LineRef = useRef<ISeriesApi<"Line"> | null>(null);

  const barBuilderRef = useRef<LiveTickBarBuilderV20>(new LiveTickBarBuilderV20(symbol, timeframe));
  const signalTrackerRef = useRef<LiveTradeSignalTrackerV20>(new LiveTradeSignalTrackerV20());
  const indicatorEngineRef = useRef<IndicatorEngine>(new IndicatorEngine());

  const [currentPrice, setCurrentPrice] = useState<number>(initialPrice);
  const [activeSignal, setActiveSignal] = useState<FrozenTradeSignal | null>(null);
  const [setupScoreResult, setSetupScoreResult] = useState<V20SetupScoreResult | null>(null);
  const [stats, setStats] = useState<SignalOverlayStats>({
    totalSignals: 0,
    tp1HitCount: 0,
    tp2HitCount: 0,
    tp3HitCount: 0,
    slHitCount: 0,
    ambiguousCount: 0,
    tp1HitRate: 0,
    tp2HitRate: 0,
    tp3HitRate: 0,
    slHitRate: 0,
  });

  // Chart setup
  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (chartRef.current) {
      try {
        chartRef.current.remove();
      } catch {
        // Ignore if disposed
      }
      chartRef.current = null;
    }
    candleSeriesRef.current = null;
    vwapSeriesRef.current = null;
    ema9SeriesRef.current = null;
    ema20SeriesRef.current = null;
    volumeSeriesRef.current = null;
    entryLineRef.current = null;
    slLineRef.current = null;
    tp1LineRef.current = null;
    tp2LineRef.current = null;
    tp3LineRef.current = null;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 480,
      layout: {
        background: { color: isWhiteTheme ? "#ffffff" : "#0f172a" },
        textColor: isWhiteTheme ? "#334155" : "#94a3b8",
      },
      grid: {
        vertLines: { color: isWhiteTheme ? "#f1f5f9" : "#1e293b" },
        horzLines: { color: isWhiteTheme ? "#f1f5f9" : "#1e293b" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#ef4444",
      borderUpColor: "#10b981",
      borderDownColor: "#ef4444",
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    });
    candleSeriesRef.current = candleSeries;

    const vwapSeries = chart.addSeries(LineSeries, {
      color: "#f59e0b",
      lineWidth: 2,
      title: "VWAP",
    });
    vwapSeriesRef.current = vwapSeries;

    const ema9Series = chart.addSeries(LineSeries, {
      color: "#3b82f6",
      lineWidth: 1,
      title: "EMA9",
    });
    ema9SeriesRef.current = ema9Series;

    const ema20Series = chart.addSeries(LineSeries, {
      color: "#a855f7",
      lineWidth: 1,
      title: "EMA20",
    });
    ema20SeriesRef.current = ema20Series;

    // Populate initial candles
    if (initialCandles.length > 0) {
      candleSeries.setData(
        initialCandles.map((c) => ({
          time: c.time as any,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );
    }

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        try {
          chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
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
      chartRef.current = null;
      candleSeriesRef.current = null;
      vwapSeriesRef.current = null;
      ema9SeriesRef.current = null;
      ema20SeriesRef.current = null;
      volumeSeriesRef.current = null;
      entryLineRef.current = null;
      slLineRef.current = null;
      tp1LineRef.current = null;
      tp2LineRef.current = null;
      tp3LineRef.current = null;
    };
  }, [symbol, isWhiteTheme]);

  // Subscribe to market ticks
  useEffect(() => {
    const handleTick = (liveTick: any) => {
      if (!liveTick || liveTick.symbol !== symbol) return;

      const v20Tick: V20Tick = {
        symbol: liveTick.symbol,
        price: liveTick.price,
        volume: liveTick.volume || 0,
        timestamp: liveTick.timestamp || Date.now(),
        isVerified: liveTick.quality === "BROKER_REALTIME" || liveTick.isRealtime,
      };

      setCurrentPrice(v20Tick.price);

      // Aggregate into candle bar
      const { updatedBar, completedBar } = barBuilderRef.current.processTick(v20Tick);

      try {
        if (candleSeriesRef.current && updatedBar) {
          candleSeriesRef.current.update({
            time: updatedBar.time as any,
            open: updatedBar.open,
            high: updatedBar.high,
            low: updatedBar.low,
            close: updatedBar.close,
          });
        }

        // Compute indicators on bar completion or update
        const barForIndicators = completedBar || updatedBar;
        const indicatorSnapshot = indicatorEngineRef.current.calculate({
          time: barForIndicators.time,
          open: barForIndicators.open,
          high: barForIndicators.high,
          low: barForIndicators.low,
          close: barForIndicators.close,
          volume: barForIndicators.volume,
        });

        if (vwapSeriesRef.current && indicatorSnapshot.vwap) {
          vwapSeriesRef.current.update({ time: barForIndicators.time as any, value: indicatorSnapshot.vwap });
        }

        if (ema9SeriesRef.current && indicatorSnapshot.ema9) {
          ema9SeriesRef.current.update({ time: barForIndicators.time as any, value: indicatorSnapshot.ema9 });
        }

        if (ema20SeriesRef.current && indicatorSnapshot.ema20) {
          ema20SeriesRef.current.update({ time: barForIndicators.time as any, value: indicatorSnapshot.ema20 });
        }

        // Evaluate Setup Score
        const setupResult = V20SetupScorer.evaluate({
          price: v20Tick.price,
          vwap: indicatorSnapshot.vwap,
          ema9: indicatorSnapshot.ema9,
          ema20: indicatorSnapshot.ema20,
          macdHist: indicatorSnapshot.macdHist,
          rsi14: indicatorSnapshot.rsi14,
          isHigherHighHigherLow: indicatorSnapshot.structureTrend === "BULLISH",
          isBreakoutConfirmed: indicatorSnapshot.isBreakoutConfirmed,
          rvol: indicatorSnapshot.rvol,
          dataStatus: v20Tick.isVerified ? "REALTIME_VERIFIED" : "STALE",
        });

        setSetupScoreResult(setupResult);

        // Trigger new trade plan if setup score is qualified and no active signal exists
        let currentActiveSignal = activeSignal;
        if (setupResult.isQualified && !currentActiveSignal) {
          const plan = AdaptiveTradePlanEngineV20.createTradePlan({
            symbol,
            market,
            entryPrice: v20Tick.price,
            atr14: indicatorSnapshot.atr14,
            vwap: indicatorSnapshot.vwap,
            ema20: indicatorSnapshot.ema20,
            lastSwingLow: indicatorSnapshot.lastSwingLow,
            rvol: indicatorSnapshot.rvol,
          });

          currentActiveSignal = signalTrackerRef.current.registerSignal(plan);
          setActiveSignal(currentActiveSignal);

          // Render Lines on Chart
          if (chartRef.current) {
            if (!entryLineRef.current) {
              entryLineRef.current = chartRef.current.addSeries(LineSeries, {
                color: "#3b82f6",
                lineStyle: LineStyle.Dashed,
                title: "Entry",
              });
            }
            if (!slLineRef.current) {
              slLineRef.current = chartRef.current.addSeries(LineSeries, {
                color: "#ef4444",
                lineStyle: LineStyle.Solid,
                title: "Stop Loss",
              });
            }
            if (!tp1LineRef.current) {
              tp1LineRef.current = chartRef.current.addSeries(LineSeries, {
                color: "#10b981",
                lineStyle: LineStyle.Dotted,
                title: "TP1",
              });
            }
            if (!tp2LineRef.current) {
              tp2LineRef.current = chartRef.current.addSeries(LineSeries, {
                color: "#10b981",
                lineStyle: LineStyle.Dashed,
                title: "TP2",
              });
            }
            if (!tp3LineRef.current) {
              tp3LineRef.current = chartRef.current.addSeries(LineSeries, {
                color: "#10b981",
                lineStyle: LineStyle.Solid,
                title: "TP3",
              });
            }

            const t = barForIndicators.time as any;
            entryLineRef.current.setData([{ time: t, value: plan.entryPrice }]);
            slLineRef.current.setData([{ time: t, value: plan.stopLossPrice }]);
            tp1LineRef.current.setData([{ time: t, value: plan.tp1 }]);
            tp2LineRef.current.setData([{ time: t, value: plan.tp2 }]);
            tp3LineRef.current.setData([{ time: t, value: plan.tp3 }]);
          }
        }

        // Process ticks through signal tracker
        signalTrackerRef.current.processTick(v20Tick);
        const activeList = signalTrackerRef.current.getActiveSignals(symbol);
        setActiveSignal(activeList[0] || null);

        // Update trailing floor line on chart if active signal exists
        if (activeList[0] && slLineRef.current) {
          slLineRef.current.update({
            time: barForIndicators.time as any,
            value: activeList[0].currentTrailingFloor,
          });
        }
      } catch {
        // Ignore if chart is disposed
      }

      setStats(signalTrackerRef.current.getStats(symbol));
    };

    const unsubscribe = realTimeMarketFeedManager.subscribe(symbol, handleTick);
    return () => {
      unsubscribe();
    };
  }, [symbol, market, activeSignal]);

  return (
    <div className={`flex flex-col lg:flex-row gap-4 w-full ${className}`}>
      {/* Left: Lightweight Chart */}
      <div className="flex-1 rounded-xl border border-slate-800 bg-slate-900 overflow-hidden relative min-h-[480px]">
        <div ref={chartContainerRef} className="w-full h-full min-h-[480px]" />
      </div>

      {/* Right: Live Signal Overlay Panel */}
      <div className="w-full lg:w-80 flex-shrink-0">
        <LiveSignalOverlayPanelV20
          symbol={symbol}
          currentPrice={currentPrice}
          activeSignal={activeSignal}
          setupScoreResult={setupScoreResult}
          stats={stats}
          isWhiteTheme={isWhiteTheme}
        />
      </div>
    </div>
  );
};
