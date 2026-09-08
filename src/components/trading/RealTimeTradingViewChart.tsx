import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  LineStyle,
  createSeriesMarkers,
  IChartApi,
  ISeriesApi,
  Time
} from "lightweight-charts";
import { 
  Sparkles, 
  Activity, 
  Zap, 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Sliders, 
  Maximize2,
  RefreshCw,
  Eye,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert
} from "lucide-react";
import { runPredictionPipeline } from "../../prediction";
import { globalOnlineEnsembleWeightEngine } from "../../prediction/OnlineEnsembleWeightEngine";
import type { LiveTick, LiveCandle, IndicatorSnapshot, TradingState, ForecastPoint } from "../../realtime/types";
import { CandleAggregator } from "../../realtime/CandleAggregator";
import { IndicatorEngine } from "../../realtime/IndicatorEngine";
import { MarketStructureEngine } from "../../realtime/MarketStructureEngine";
import { decideTradingState, calculateDynamicTrailingExit } from "../../realtime/TradingStateMachine";
import { AdaptiveTrailingExitEngineV137 } from "../../services/v13_7/AdaptiveTrailingExitEngineV137";
import { ExitDecisionBridgeV138 } from "../../services/v13_8/ExitDecisionBridgeV138";
import { PositionTrailingStateStoreV138 } from "../../services/v13_8/PositionTrailingStateStoreV138";
import { generateForecastPath } from "../../realtime/ForecastPathEngine";
import { realTimeMarketFeedManager } from "../../realtime/RealTimeMarketFeedService";

export type LiveFeedHealth = "REALTIME" | "DELAYED" | "STALE" | "NO_DATA" | "INVALID";

export interface FeedHealthState {
  source: string;
  quality: string;
  health: LiveFeedHealth;
  lastReceivedAt: number | null;
  ageMs: number | null;
}

export interface RealTimeTradingViewChartProps {
  symbol: string;
  name: string;
  market?: "KOREA" | "US" | "UPBIT" | "CRYPTO";
  initialPrice: number;
  initialCandles?: Array<{
    time: number | string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
  isWhiteTheme?: boolean;
  timeframe?: "1m" | "3m" | "5m" | "15m" | "1D";
  onStateChange?: (state: TradingState, confidence: number) => void;
  className?: string;
}

export const RealTimeTradingViewChart: React.FC<RealTimeTradingViewChartProps> = ({
  symbol,
  name,
  market = "KOREA",
  initialPrice,
  initialCandles = [],
  isWhiteTheme = false,
  timeframe = "1m",
  onStateChange,
  className = ""
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  // Series references
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const ema9SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ema20SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const vwapSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const forecastSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bullForecastSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bearForecastSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const trailingExitSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const markersRef = useRef<any>(null);

  const [feedHealth, setFeedHealth] = useState<FeedHealthState>({
    source: "UNKNOWN",
    quality: "UNKNOWN",
    health: "NO_DATA",
    lastReceivedAt: null,
    ageMs: null
  });

  // Current states
  const [selectedTf, setSelectedTf] = useState<"1m" | "3m" | "5m" | "15m" | "1D">(timeframe);
  const [tradingState, setTradingState] = useState<TradingState>("NO_TRADE");
  const [currentPrice, setCurrentPrice] = useState<number>(initialPrice);
  const [trailingExitPrice, setTrailingExitPrice] = useState<number>(0);
  const [aiConfidence, setAiConfidence] = useState<number>(0);
  const [lastForecast, setLastForecast] = useState<ForecastPoint[]>([]);
  const [activeIndicators, setActiveIndicators] = useState({
    ema: true,
    vwap: true,
    forecast: true,
    trailing: true,
    volume: true
  });
  const [lastTickTimeStr, setLastTickTimeStr] = useState<string>("");

  // Keep internal candle history and aggregator
  const historyRef = useRef<LiveCandle[]>([]);
  const aggregatorRef = useRef<CandleAggregator>(
    new CandleAggregator((timeframe as any) || "1m")
  );
  const entryPriceRef = useRef<number>(initialPrice);
  const highestPriceRef = useRef<number>(initialPrice);
  const previousTrailingFloorRef = useRef<number>(0);
  const trailingExitRef = useRef<number>(0);
  const tradingStateRef = useRef<TradingState>("NO_TRADE");

  // Restore persisted position trailing state on mount
  useEffect(() => {
    let active = true;
    PositionTrailingStateStoreV138.getState(symbol).then((persisted) => {
      if (active && persisted && persisted.highestPriceSinceBuy > 0) {
        entryPriceRef.current = persisted.entryPrice;
        highestPriceRef.current = persisted.highestPriceSinceBuy;
        previousTrailingFloorRef.current = persisted.trailingFloor;
        trailingExitRef.current = persisted.trailingFloor;
        setTrailingExitPrice(persisted.trailingFloor);

        if (persisted.lastState && persisted.lastState !== "HOLD") {
          const mapped = persisted.lastState as TradingState;
          tradingStateRef.current = mapped;
          setTradingState(mapped);
        }
      }
    });
    return () => {
      active = false;
    };
  }, [symbol]);

  // Format price helper based on market
  const formatDisplayPrice = useCallback((p: number) => {
    if (market === "US") return `$${(p ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return `₩${Math.round(p).toLocaleString()}`;
  }, [market]);

  // Handle timeframe change
  const handleTimeframeChange = (tf: "1m" | "3m" | "5m" | "15m" | "1D") => {
    setSelectedTf(tf);
    const ms = tf === "1m" ? 60_000 : tf === "3m" ? 180_000 : tf === "5m" ? 300_000 : tf === "15m" ? 900_000 : 86_400_000;
    historyRef.current = [];
    aggregatorRef.current.reset(ms);
  };

  // Convert initial candles to clean LiveCandle array (Return empty if no real initial candles)
  const normalizedInitialCandles: LiveCandle[] = useMemo(() => {
    if (initialCandles && initialCandles.length > 0) {
      return initialCandles.map(c => {
        let sec = typeof c.time === "number" ? c.time : Math.floor(new Date(c.time).getTime() / 1000);
        if (sec > 10_000_000_000) sec = Math.floor(sec / 1000);
        return {
          time: sec,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume,
          isClosed: true
        };
      }).sort((a, b) => a.time - b.time);
    }
    // LIVE MODE ENFORCEMENT: No synthetic seed candle generation!
    return [];
  }, [initialCandles]);

  // Recalculate indicators, prediction, and state when candle closes
  const onClosedCandle = useCallback((closedCandle: LiveCandle) => {
    const MAX_HISTORY_BARS = 600;
    historyRef.current = [...historyRef.current.slice(-(MAX_HISTORY_BARS - 1)), closedCandle];
    const candles = historyRef.current;

    // 1. Calculate technical indicators
    const indicators: IndicatorSnapshot = IndicatorEngine.calculate(candles);

    // 2. Analyze market structure (HH/HL, Breakout, etc.)
    const structure = MarketStructureEngine.analyze(candles, indicators.vwap);

    // 3. AI confidence / Real ML model probability & Online Ensemble
    let modelProb: number | undefined = undefined;
    let modelVerified = false;
    if (candles.length >= 30) {
      try {
        const verifiedCandles = candles.map(c => {
          const src = typeof (c as any).source === "string" ? (c as any).source : "UNKNOWN";
          const feedQual = typeof (c as any).feedQuality === "string" ? (c as any).feedQuality : "UNKNOWN";
          const isVer = (c as any).verified === true && (feedQual === "BROKER_REALTIME" || feedQual === "EXCHANGE_REALTIME");
          const integrityValid =
            isVer &&
            Number.isFinite(c.open) &&
            Number.isFinite(c.high) &&
            Number.isFinite(c.low) &&
            Number.isFinite(c.close) &&
            Number.isFinite(c.volume) &&
            c.open > 0 &&
            c.high > 0 &&
            c.low > 0 &&
            c.close > 0 &&
            c.volume >= 0;

          return {
            symbol,
            market: market === "US" ? "US" : market === "UPBIT" || market === "CRYPTO" ? "CRYPTO" : "KOREA",
            timeframe: selectedTf === "1D" ? "60m" : selectedTf,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume,
            startedAt: typeof c.time === "number" ? c.time * 1000 : new Date(c.time).getTime(),
            endedAt:
              (typeof c.time === "number" ? c.time * 1000 : new Date(c.time).getTime()) +
              (selectedTf === "1m"
                ? 60_000
                : selectedTf === "3m"
                ? 180_000
                : selectedTf === "5m"
                ? 300_000
                : selectedTf === "15m"
                ? 900_000
                : 86_400_000),
            source: src,
            receivedAt: Number.isFinite((c as any).receivedAt) ? (c as any).receivedAt : 0,
            verified: isVer,
            feedQuality: feedQual,
            integrityValid
          };
        });
        const mlResult = runPredictionPipeline({
          symbol,
          market: market === "US" ? "US" : market === "UPBIT" || market === "CRYPTO" ? "CRYPTO" : "KOREA",
          candles: verifiedCandles,
          requireRealData: true
        });
        const calibrated = mlResult.calibratedOutput;
        if (calibrated && typeof calibrated.calibratedProbability === "number" && mlResult.rawModelOutput?.probabilityVerified) {
          const lgbProb = calibrated.calibratedProbability / 100;
          modelProb = globalOnlineEnsembleWeightEngine.score(
            {
              LIGHTGBM: lgbProb,
              TREND: indicators.trendStrength,
              MOMENTUM: Math.min(1, Math.max(0, 0.5 + indicators.macdHistogram / 100)),
              STRUCTURE: structure.hhhlValid ? 0.8 : 0.4,
              VOLUME: structure.volumeExpansion ? 0.85 : 0.5
            },
            market,
            selectedTf
          );
          modelVerified = true;
        }
      } catch (err) {
        // Unverified source or pipeline skipped
      }
    }
    const confidenceScore = Math.round((indicators.trendStrength * 0.4 + (indicators.macdHistogram > 0 ? 0.3 : 0.1) + (structure.hhhlValid ? 0.3 : 0)) * 100);
    setAiConfidence(confidenceScore);

    // Determine execution feed quality from closed candle provenance
    const executionFeedValid = (closedCandle as any).source === "KIS_REALTIME_WS" && (closedCandle as any).feedQuality === "BROKER_REALTIME";
    const feedQuality = executionFeedValid ? "BROKER_REALTIME" : "POLLING_DELAYED";

    // 4. State Machine transition with MANDATORY EXECUTION GATES
    const nextState = decideTradingState({
      price: closedCandle.close,
      ema9: indicators.ema9,
      ema20: indicators.ema20,
      vwap: indicators.vwap,
      rsi: indicators.rsi14,
      macdHistogram: indicators.macdHistogram,
      hhhlValid: structure.hhhlValid,
      breakoutValid: structure.breakoutValid,
      volumeExpansion: structure.volumeExpansion,
      modelProbability: modelVerified && modelProb !== undefined ? modelProb : 0,
      currentState: tradingStateRef.current,
      trailingExitPrice: trailingExitRef.current,
      // MANDATORY EXECUTION GATES
      indicatorsReady: indicators.indicatorsReady === true,
      feedQuality,
      isClosedBar: closedCandle.isClosed === true,
      netEdgePositive: true
    });

    if (nextState !== tradingStateRef.current) {
      if (nextState === "BUY") {
        entryPriceRef.current = closedCandle.close;
        highestPriceRef.current = closedCandle.close;
        previousTrailingFloorRef.current = Math.round(closedCandle.close - 1.5 * indicators.atr14);
        trailingExitRef.current = previousTrailingFloorRef.current;
      } else if (nextState === "NO_TRADE") {
        entryPriceRef.current = 0;
        highestPriceRef.current = 0;
        previousTrailingFloorRef.current = 0;
        trailingExitRef.current = 0;
      }
      tradingStateRef.current = nextState;
      setTradingState(nextState);
      onStateChange?.(nextState, confidenceScore);
    }

    // 5. Update dynamic trailing stop via AdaptiveTrailingExitEngineV137 & ExitDecisionBridgeV138
    if (["BUY", "HOLD", "PROFIT_HOLD", "SELL_WATCH"].includes(tradingStateRef.current) && entryPriceRef.current > 0) {
      highestPriceRef.current = Math.max(highestPriceRef.current, closedCandle.close);

      const res = AdaptiveTrailingExitEngineV137.evaluate({
        symbol,
        market: market === "US" ? "US" : "KOREA",
        entryPrice: entryPriceRef.current,
        currentPrice: closedCandle.close,
        highestPriceSinceBuy: highestPriceRef.current,
        previousTrailingFloor: previousTrailingFloorRef.current,
        atr14: indicators.atr14,
        sessionVwap: indicators.vwap,
        ema20: indicators.ema20,
        recentSwingLow: structure.lastConfirmedSwingLow,
        confirmedSupport: structure.confirmedSupport,
        structure: structure.structure,
        rsi14: indicators.rsi14,
        macdHist: indicators.macdHistogram
      });

      const nextFloor = Math.max(previousTrailingFloorRef.current, res.trailingFloor);
      previousTrailingFloorRef.current = nextFloor;
      trailingExitRef.current = nextFloor;
      setTrailingExitPrice(nextFloor);

      const activeQty = entryPriceRef.current > 0 ? 1 : 0;
      const bridge = ExitDecisionBridgeV138.resolve({
        adaptive: res,
        feedVerified: executionFeedValid,
        indicatorsReady: indicators.indicatorsReady === true,
        completedBar: closedCandle.isClosed === true,
        currentPositionQty: activeQty,
        brokerHealthy: executionFeedValid,
        heartbeatHealthy: true
      });

      if (bridge.action === "SELL" || bridge.action === "EMERGENCY_EXIT") {
        tradingStateRef.current = "SELL";
        setTradingState("SELL");
        onStateChange?.("SELL", confidenceScore);
      } else if (bridge.action === "SELL_WATCH") {
        tradingStateRef.current = "SELL_WATCH";
        setTradingState("SELL_WATCH");
        onStateChange?.("SELL_WATCH", confidenceScore);
      } else if (bridge.action === "PROFIT_HOLD") {
        tradingStateRef.current = "PROFIT_HOLD";
        setTradingState("PROFIT_HOLD");
        onStateChange?.("PROFIT_HOLD", confidenceScore);
      }

      // Persist active position trailing state to store
      PositionTrailingStateStoreV138.saveState({
        positionId: `${symbol}_active`,
        symbol,
        market: market === "US" ? "US" : "KOREA",
        entryPrice: entryPriceRef.current,
        qty: activeQty,
        highestPriceSinceBuy: highestPriceRef.current,
        trailingFloor: res.trailingFloor,
        lastState: bridge.action,
        updatedAt: Date.now()
      });

      if (trailingExitSeriesRef.current) {
        trailingExitSeriesRef.current.update({
          time: closedCandle.time as Time,
          value: res.trailingFloor
        });
      }
    }

    // 6. Generate 3-line forecast path ONLY if data is verified and ready
    const forecastAllowed =
      executionFeedValid &&
      indicators.indicatorsReady === true &&
      closedCandle.isClosed === true &&
      candles.length >= 30;

    const forecast = forecastAllowed
      ? generateForecastPath(candles, indicators, 8, modelVerified ? modelProb : undefined)
      : [];

    setLastForecast(forecast);

    if (forecastSeriesRef.current && bullForecastSeriesRef.current && bearForecastSeriesRef.current) {
      forecastSeriesRef.current.setData(
        forecast
          .map(p => ({ time: p.time as Time, value: p.predicted }))
          .filter((p): p is { time: Time; value: number } => Number.isFinite(p.value) && p.value > 0)
      );
      bullForecastSeriesRef.current.setData(
        forecast
          .map(p => ({ time: p.time as Time, value: p.upper }))
          .filter((p): p is { time: Time; value: number } => Number.isFinite(p.value) && p.value > 0)
      );
      bearForecastSeriesRef.current.setData(
        forecast
          .map(p => ({ time: p.time as Time, value: p.lower }))
          .filter((p): p is { time: Time; value: number } => Number.isFinite(p.value) && p.value > 0)
      );
    }

    // 7. Update indicator series lines
    if (ema9SeriesRef.current && Number.isFinite(indicators.ema9) && indicators.ema9 > 0) {
      ema9SeriesRef.current.update({ time: closedCandle.time as Time, value: indicators.ema9 });
    }
    if (ema20SeriesRef.current && Number.isFinite(indicators.ema20) && indicators.ema20 > 0) {
      ema20SeriesRef.current.update({ time: closedCandle.time as Time, value: indicators.ema20 });
    }
    if (vwapSeriesRef.current && Number.isFinite(indicators.vwap) && indicators.vwap > 0) {
      vwapSeriesRef.current.update({ time: closedCandle.time as Time, value: indicators.vwap });
    }

    // 8. Update marker if special event happened
    if (markersRef.current && (nextState === "BUY" || nextState === "SELL" || nextState === "SELL_WATCH" || nextState === "PROFIT_HOLD")) {
      const currentMarkers = markersRef.current.markers() || [];
      const newMarker = {
        time: closedCandle.time as Time,
        position: nextState === "BUY" ? "belowBar" : "aboveBar",
        color: nextState === "BUY" ? "#10b981" : nextState === "PROFIT_HOLD" ? "#06b6d4" : nextState === "SELL_WATCH" ? "#f59e0b" : "#ef4444",
        shape: nextState === "BUY" ? "arrowUp" : nextState === "PROFIT_HOLD" ? "circle" : nextState === "SELL_WATCH" ? "square" : "arrowDown",
        text: `${nextState} (${confidenceScore}%)`
      };
      markersRef.current.setMarkers([...currentMarkers.slice(-20), newMarker]);
    }
  }, [symbol, market, selectedTf, onStateChange]);

  // Mount TradingView Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    historyRef.current = [...normalizedInitialCandles];

    // Background & theme colors
    const bg = isWhiteTheme ? "#ffffff" : "#08101e";
    const text = isWhiteTheme ? "#334155" : "#94a3b8";
    const grid = isWhiteTheme ? "#f1f5f9" : "#0f1f38";

    const chart = createChart(chartContainerRef.current, {
      autoSize: true,
      layout: {
        background: { color: bg },
        textColor: text,
      },
      grid: {
        vertLines: { color: grid },
        horzLines: { color: grid }
      },
      crosshair: {
        mode: 1 // Magnet crosshair
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: grid
      },
      rightPriceScale: {
        borderColor: grid,
        autoScale: true
      }
    });
    chartRef.current = chart;

    // 1. Candlestick Series (Korean red up, blue down by default for KRX, or standard)
    const isKrx = market === "KOREA";
    const upColor = isKrx ? "#ef4444" : "#10b981";
    const downColor = isKrx ? "#3b82f6" : "#f43f5e";

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor,
      downColor,
      wickUpColor: upColor,
      wickDownColor: downColor,
      borderVisible: false
    });
    candleSeriesRef.current = candleSeries;

    // Populate historical candles
    candleSeries.setData(
      historyRef.current.map(c => ({
        time: c.time as Time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close
      }))
    );

    // Markers setup
    markersRef.current = createSeriesMarkers(candleSeries);

    // 2. Volume Series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "#64748b",
      priceFormat: { type: "volume" },
      priceScaleId: "" // Overlay
    });
    volumeSeriesRef.current = volumeSeries;
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.82,
        bottom: 0
      }
    });
    volumeSeries.setData(
      historyRef.current.map(c => ({
        time: c.time as Time,
        value: c.volume,
        color: c.close >= c.open ? (isKrx ? "#ef444433" : "#10b98133") : (isKrx ? "#3b82f633" : "#f43f5e33")
      }))
    );

    // 3. EMA 9 (Amber) & EMA 20 (Cyan)
    const ema9Series = chart.addSeries(LineSeries, {
      color: "#f59e0b",
      lineWidth: 2,
      title: "EMA 9"
    });
    ema9SeriesRef.current = ema9Series;

    const ema20Series = chart.addSeries(LineSeries, {
      color: "#06b6d4",
      lineWidth: 2,
      title: "EMA 20"
    });
    ema20SeriesRef.current = ema20Series;

    // 4. VWAP (Purple)
    const vwapSeries = chart.addSeries(LineSeries, {
      color: "#8b5cf6",
      lineWidth: 2,
      title: "VWAP"
    });
    vwapSeriesRef.current = vwapSeries;

    // Compute initial indicators across history
    const initialIndicators = IndicatorEngine.calculate(historyRef.current);
    const initialCloses = historyRef.current.map(c => c.close);

    ema9Series.setData(
      historyRef.current
        .map((c, idx) => ({
          time: c.time as Time,
          value: IndicatorEngine.calcEMA(initialCloses.slice(0, idx + 1), 9)
        }))
        .filter((p): p is { time: Time; value: number } => Number.isFinite(p.value) && p.value > 0)
    );

    ema20Series.setData(
      historyRef.current
        .map((c, idx) => ({
          time: c.time as Time,
          value: IndicatorEngine.calcEMA(initialCloses.slice(0, idx + 1), 20)
        }))
        .filter((p): p is { time: Time; value: number } => Number.isFinite(p.value) && p.value > 0)
    );

    let runningCumVol = 0;
    let runningCumVolP = 0;
    vwapSeries.setData(
      historyRef.current
        .map(c => {
          runningCumVol += c.volume;
          runningCumVolP += ((c.high + c.low + c.close) / 3) * c.volume;
          return {
            time: c.time as Time,
            value: runningCumVol > 0 ? Math.round((runningCumVolP / runningCumVol) * 100) / 100 : c.close
          };
        })
        .filter((p): p is { time: Time; value: number } => Number.isFinite(p.value) && p.value > 0)
    );

    // 5. AI Forecast Paths (Base: dashed purple, Bull: dotted green, Bear: dotted red)
    const forecastSeries = chart.addSeries(LineSeries, {
      color: "#a855f7",
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      title: "AI Forecast (Base)"
    });
    forecastSeriesRef.current = forecastSeries;

    const bullForecastSeries = chart.addSeries(LineSeries, {
      color: "#10b981",
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      title: "Bull Scenario"
    });
    bullForecastSeriesRef.current = bullForecastSeries;

    const bearForecastSeries = chart.addSeries(LineSeries, {
      color: "#f43f5e",
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      title: "Bear Scenario"
    });
    bearForecastSeriesRef.current = bearForecastSeries;

    // 6. Dynamic Trailing Exit line (Orange dashed)
    const trailingExitSeries = chart.addSeries(LineSeries, {
      color: "#f97316",
      lineWidth: 2,
      lineStyle: LineStyle.LargeDashed,
      title: "Trailing Exit"
    });
    trailingExitSeriesRef.current = trailingExitSeries;

    // Initial forecast calculation
    const initForecast = generateForecastPath(historyRef.current, initialIndicators, 8);
    setLastForecast(initForecast);
    forecastSeries.setData(
      initForecast
        .map(p => ({ time: p.time as Time, value: p.predicted }))
        .filter((p): p is { time: Time; value: number } => Number.isFinite(p.value) && p.value > 0)
    );
    bullForecastSeries.setData(
      initForecast
        .map(p => ({ time: p.time as Time, value: p.upper }))
        .filter((p): p is { time: Time; value: number } => Number.isFinite(p.value) && p.value > 0)
    );
    bearForecastSeries.setData(
      initForecast
        .map(p => ({ time: p.time as Time, value: p.lower }))
        .filter((p): p is { time: Time; value: number } => Number.isFinite(p.value) && p.value > 0)
    );

    // Fit content smoothly
    chart.timeScale().fitContent();

    // Subscribe to live tick stream
    const unsubscribeFeed = realTimeMarketFeedManager.subscribe(symbol, (tick: LiveTick) => {
      const now = Date.now();

      const receivedAt = Number.isFinite((tick as any).receivedAt)
        ? (tick as any).receivedAt
        : Number.isFinite(tick.timestamp)
        ? tick.timestamp
        : now;

      const source = typeof (tick as any).source === "string"
        ? (tick as any).source
        : "UNKNOWN";

      const quality = typeof (tick as any).feedQuality === "string"
        ? (tick as any).feedQuality
        : "UNKNOWN";

      const validTick = Number.isFinite(tick.price) && tick.price > 0 && receivedAt > 0;

      const ageMs = Math.max(0, now - receivedAt);

      let health: LiveFeedHealth = "INVALID";

      if (!validTick) {
        health = "INVALID";
      } else if (ageMs > 15_000) {
        health = "STALE";
      } else if (quality === "BROKER_REALTIME" || quality === "EXCHANGE_REALTIME") {
        health = "REALTIME";
      } else {
        health = "DELAYED";
      }

      setFeedHealth({
        source,
        quality,
        health,
        lastReceivedAt: receivedAt,
        ageMs
      });

      if (!validTick) {
        return;
      }

      setCurrentPrice(tick.price);
      setLastTickTimeStr(new Date(receivedAt).toLocaleTimeString());

      const res = aggregatorRef.current.update(tick);

      // 1. Update active ongoing candle (animates in real-time)
      if (candleSeriesRef.current) {
        candleSeriesRef.current.update({
          time: res.candle.time as Time,
          open: res.candle.open,
          high: res.candle.high,
          low: res.candle.low,
          close: res.candle.close
        });
      }

      // 2. Update active volume
      if (volumeSeriesRef.current) {
        volumeSeriesRef.current.update({
          time: res.candle.time as Time,
          value: res.candle.volume,
          color: res.candle.close >= res.candle.open ? (isKrx ? "#ef444433" : "#10b98133") : (isKrx ? "#3b82f633" : "#f43f5e33")
        });
      }

      // 3. If closed a candle, trigger comprehensive recalculation
      if (res.closed) {
        onClosedCandle(res.candle);
      }
    });

    return () => {
      unsubscribeFeed();
      chart.remove();
      chartRef.current = null;
    };
  }, [symbol, isWhiteTheme, normalizedInitialCandles, market, onClosedCandle]);

  // Apply visibility toggles
  useEffect(() => {
    if (ema9SeriesRef.current) ema9SeriesRef.current.applyOptions({ visible: activeIndicators.ema });
    if (ema20SeriesRef.current) ema20SeriesRef.current.applyOptions({ visible: activeIndicators.ema });
    if (vwapSeriesRef.current) vwapSeriesRef.current.applyOptions({ visible: activeIndicators.vwap });
    if (forecastSeriesRef.current) forecastSeriesRef.current.applyOptions({ visible: activeIndicators.forecast });
    if (bullForecastSeriesRef.current) bullForecastSeriesRef.current.applyOptions({ visible: activeIndicators.forecast });
    if (bearForecastSeriesRef.current) bearForecastSeriesRef.current.applyOptions({ visible: activeIndicators.forecast });
    if (trailingExitSeriesRef.current) trailingExitSeriesRef.current.applyOptions({ visible: activeIndicators.trailing });
    if (volumeSeriesRef.current) volumeSeriesRef.current.applyOptions({ visible: activeIndicators.volume });
  }, [activeIndicators]);

  // Stale feed monitoring
  useEffect(() => {
    const id = window.setInterval(() => {
      setFeedHealth(prev => {
        if (!prev.lastReceivedAt) {
          return prev;
        }

        const ageMs = Date.now() - prev.lastReceivedAt;

        if (ageMs > 15_000 && prev.health !== "STALE") {
          return {
            ...prev,
            ageMs,
            health: "STALE"
          };
        }

        return {
          ...prev,
          ageMs
        };
      });
    }, 2_000);

    return () => window.clearInterval(id);
  }, []);

  const stateColors: Record<TradingState, { bg: string; text: string; border: string }> = {
    NO_TRADE: { bg: "bg-slate-700/40", text: "text-slate-300", border: "border-slate-600" },
    BUY_WATCH: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/50" },
    BUY: { bg: "bg-emerald-500/25", text: "text-emerald-400", border: "border-emerald-500/60" },
    HOLD: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/50" },
    PROFIT_HOLD: { bg: "bg-cyan-500/25", text: "text-cyan-300", border: "border-cyan-400" },
    SELL_WATCH: { bg: "bg-orange-500/25", text: "text-orange-400", border: "border-orange-500/60" },
    SELL: { bg: "bg-rose-500/25", text: "text-rose-400", border: "border-rose-500/60" }
  };

  return (
    <div className={`flex flex-col rounded-xl border ${isWhiteTheme ? "bg-white border-slate-200 text-slate-900" : "bg-[#08101e] border-[#13233c] text-slate-100"} p-3 gap-2 shadow-lg ${className}`}>
      
      {/* 1. TOP STATUS BAR & REALTIME TRADING STATE HUD */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-700/50">
        
        {/* Symbol & Price Header */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black">{name}</span>
            <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700 font-bold">
              {symbol}
            </span>
          </div>

          <div className="text-base font-mono font-black text-cyan-400">
            {formatDisplayPrice(currentPrice)}
          </div>

          {/* Live Tick Pulse Indicator */}
          <div className="flex items-center gap-1 text-[11px] font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                feedHealth.health === "REALTIME"
                  ? "bg-emerald-500 animate-ping"
                  : feedHealth.health === "STALE"
                  ? "bg-amber-500"
                  : "bg-slate-600"
              }`}
            />
            <span
              className={`font-bold ${
                feedHealth.health === "REALTIME"
                  ? "text-emerald-400"
                  : feedHealth.health === "STALE"
                  ? "text-amber-400"
                  : "text-slate-500"
              }`}
            >
              {feedHealth.health === "REALTIME"
                ? "LIVE TICK"
                : feedHealth.health === "STALE"
                ? "STALE"
                : "WAITING"}
            </span>
            {lastTickTimeStr && <span className="text-slate-400 text-[10px]">({lastTickTimeStr})</span>}
          </div>
        </div>

        {/* State Machine HUD Badge & Trailing Stop */}
        <div className="flex flex-wrap items-center gap-2">
          {/* State Badge */}
          <div className={`px-2.5 py-1 rounded-lg border text-xs font-black flex items-center gap-1.5 shadow-sm ${stateColors[tradingState].bg} ${stateColors[tradingState].text} ${stateColors[tradingState].border}`}>
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span>상태: {tradingState}</span>
          </div>

          {/* Technical Score Badge */}
          <div className="px-2 py-1 rounded-lg bg-purple-950/60 border border-purple-800/60 text-purple-300 text-xs font-mono font-bold flex items-center gap-1" title="기술적 종합 점수 (확률값 아님)">
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span>Technical Score {aiConfidence}/100</span>
          </div>

          {/* Feed Quality Badge */}
          <div
            className={`px-2 py-1 rounded-lg border text-xs font-mono font-bold flex items-center gap-1 ${
              feedHealth.health === "REALTIME"
                ? "bg-emerald-950/60 border-emerald-800/60 text-emerald-300"
                : feedHealth.health === "STALE"
                ? "bg-amber-950/60 border-amber-800/60 text-amber-300"
                : "bg-slate-900 border-slate-700 text-slate-400"
            }`}
          >
            <ShieldCheck className="w-3 h-3 text-current" />
            <span>FEED: {feedHealth.health}</span>
          </div>

          {/* Trailing Stop Display if Active */}
          {trailingExitPrice > 0 && (
            <div className="px-2 py-1 rounded-lg bg-orange-950/60 border border-orange-800/60 text-orange-300 text-xs font-mono font-bold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-orange-400" />
              <span>Trailing Stop: {formatDisplayPrice(trailingExitPrice)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Model Metadata Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-1 bg-slate-900/90 rounded border border-slate-800 text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-3">
          <span>
            SOURCE: <strong className="text-cyan-400">{feedHealth.source}</strong>
          </span>
          <span>
            QUALITY: <strong className="text-emerald-400">{feedHealth.quality}</strong>
          </span>
          <span>
            AGE: <strong>{feedHealth.ageMs !== null ? `${feedHealth.ageMs}ms` : "N/A"}</strong>
          </span>
          <span>TIMEFRAME: <strong className="text-amber-400">{selectedTf}</strong></span>
          <span>MODEL: <strong className="text-purple-400">TECHNICAL PROJECTION</strong></span>
        </div>
        <div>
          <span>BAR STATUS: <strong className="text-cyan-300">BUILDING (CONFIRM ON CLOSE)</strong></span>
        </div>
      </div>

      {/* 2. TIMEFRAME & INDICATOR TOGGLE TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        
        {/* Timeframe Buttons (1m, 3m, 5m, 15m, 1D) */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-slate-800">
          {(["1m", "3m", "5m", "15m", "1D"] as const).map(tf => (
            <button
              key={tf}
              type="button"
              onClick={() => handleTimeframeChange(tf)}
              className={`px-2 py-0.5 rounded transition font-bold cursor-pointer ${
                selectedTf === tf
                  ? "bg-cyan-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Indicator Toggles */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <button
            type="button"
            onClick={() => setActiveIndicators(prev => ({ ...prev, ema: !prev.ema }))}
            className={`px-2 py-0.5 rounded border transition cursor-pointer font-bold ${
              activeIndicators.ema
                ? "bg-amber-950/70 border-amber-600 text-amber-300"
                : "bg-slate-900/60 border-slate-800 text-slate-500"
            }`}
          >
            EMA (9/20)
          </button>

          <button
            type="button"
            onClick={() => setActiveIndicators(prev => ({ ...prev, vwap: !prev.vwap }))}
            className={`px-2 py-0.5 rounded border transition cursor-pointer font-bold ${
              activeIndicators.vwap
                ? "bg-purple-950/70 border-purple-600 text-purple-300"
                : "bg-slate-900/60 border-slate-800 text-slate-500"
            }`}
          >
            VWAP
          </button>

          <button
            type="button"
            onClick={() => setActiveIndicators(prev => ({ ...prev, forecast: !prev.forecast }))}
            className={`px-2 py-0.5 rounded border transition cursor-pointer font-bold flex items-center gap-1 ${
              activeIndicators.forecast
                ? "bg-cyan-950/70 border-cyan-500 text-cyan-300"
                : "bg-slate-900/60 border-slate-800 text-slate-500"
            }`}
          >
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>AI 3-Path 예측선</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveIndicators(prev => ({ ...prev, trailing: !prev.trailing }))}
            className={`px-2 py-0.5 rounded border transition cursor-pointer font-bold ${
              activeIndicators.trailing
                ? "bg-orange-950/70 border-orange-600 text-orange-300"
                : "bg-slate-900/60 border-slate-800 text-slate-500"
            }`}
          >
            Trailing Exit
          </button>

          <button
            type="button"
            onClick={() => {
              if (chartRef.current) {
                chartRef.current.timeScale().fitContent();
              }
            }}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition cursor-pointer font-bold"
            title="차트 전체 보기 맞춤"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 3. LIGHTWEIGHT CHARTS CANVAS CONTAINER */}
      <div 
        ref={chartContainerRef}
        className="w-full h-[480px] rounded-lg overflow-hidden border border-slate-800/80 relative"
      >
        {historyRef.current.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm z-10 p-6 text-center">
            <div className="max-w-md p-4 rounded-xl border border-slate-800 bg-slate-900/90 shadow-2xl flex flex-col items-center gap-2">
              <Activity className="w-8 h-8 text-cyan-400 animate-pulse" />
              <div className="text-sm font-bold text-slate-200">실시간 시장 데이터 대기 중 (WAITING_FOR_REAL_MARKET_DATA)</div>
              <div className="text-xs text-slate-400">
                가짜/합성 시세 생성이 금지된 LIVE-ONLY 상태입니다.<br />
                실제 WebSocket 체결 틱 또는 API 봉 수신 시 차트가 표시됩니다.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. BOTTOM FORECAST SUMMARY LEGEND */}
      {lastForecast.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 font-mono text-[11px] border-t border-slate-800/60">
          <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 border border-slate-800">
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-2 h-0.5 bg-emerald-400 inline-block" />
              <span>Bull Scenario (상방)</span>
            </span>
            <span className="text-emerald-300 font-black">
              {formatDisplayPrice(lastForecast[lastForecast.length - 1].upper)} ({(lastForecast[0].probabilityUp * 100).toFixed(0)}%)
            </span>
          </div>

          <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 border border-slate-800">
            <span className="text-purple-400 font-bold flex items-center gap-1">
              <span className="w-2 h-0.5 bg-purple-400 inline-block" />
              <span>AI Base Path (기본)</span>
            </span>
            <span className="text-purple-300 font-black">
              {formatDisplayPrice(lastForecast[lastForecast.length - 1].predicted)}
            </span>
          </div>

          <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 border border-slate-800">
            <span className="text-rose-400 font-bold flex items-center gap-1">
              <span className="w-2 h-0.5 bg-rose-400 inline-block" />
              <span>Bear Scenario (하방)</span>
            </span>
            <span className="text-rose-300 font-black">
              {formatDisplayPrice(lastForecast[lastForecast.length - 1].lower)} ({(lastForecast[0].probabilityDown * 100).toFixed(0)}%)
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
