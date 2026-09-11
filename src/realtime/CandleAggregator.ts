// AISTOCK REAL-TIME CANDLE AGGREGATOR
// Aggregates real ticks only. No synthetic bars or fake gap fills.

import type { FeedQuality, LiveTick } from "./types";

export type Timeframe = "1m" | "3m" | "5m" | "15m" | "60m" | string;

export interface AggregatedCandle {
  timeframe: Timeframe;
  symbol: string;
  market: "KOREA" | "US" | "CRYPTO" | string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  time: number;
  startedAt: number;
  endedAt: number;
  isFinal: boolean;
  isClosed: boolean;
  source: string;
  quality: FeedQuality;
  feedQuality: FeedQuality;
  receivedAt: number;
  providerTimestamp: number;
  tickCount: number;
  lastSequence?: string;
}

export interface CandleUpdateResult {
  updatedCandle: AggregatedCandle;
  completedCandle: AggregatedCandle | null;
  // Compatibility aliases used by the existing chart layer.
  candle: AggregatedCandle;
  closed: boolean;
}

type CompatibleRealtimeTick = LiveTick & {
  tradeVolume?: number;
};

export class CandleAggregator {
  private timeframe: Timeframe;
  private timeframeMs: number;
  private currentCandle: AggregatedCandle | null = null;
  private currentSlotMs = 0;

  constructor(timeframe: Timeframe = "1m") {
    this.timeframe = timeframe;
    this.timeframeMs = CandleAggregator.getTimeframeMs(timeframe);
  }

  public static getTimeframeMs(timeframe: Timeframe): number {
    switch (timeframe) {
      case "1m": return 60_000;
      case "3m": return 3 * 60_000;
      case "5m": return 5 * 60_000;
      case "15m": return 15 * 60_000;
      case "60m": return 60 * 60_000;
      default: return 60_000;
    }
  }

  public reset(timeframeOrMs?: Timeframe | number): void {
    if (typeof timeframeOrMs === "number") {
      this.timeframeMs = timeframeOrMs > 0 ? timeframeOrMs : 60_000;
    } else if (timeframeOrMs) {
      this.timeframe = timeframeOrMs;
      this.timeframeMs = CandleAggregator.getTimeframeMs(timeframeOrMs);
    }
    this.currentCandle = null;
    this.currentSlotMs = 0;
  }

  public getCurrentCandle(): AggregatedCandle | null {
    return this.currentCandle;
  }

  public update(tick: LiveTick): CandleUpdateResult {
    return this.processTick(tick);
  }

  public processTick(tick: LiveTick): CandleUpdateResult {
    const providerTimestamp = tick.providerTimestamp || tick.exchangeTimestamp || tick.timestamp || Date.now();
    const receivedAt = tick.receivedAt || tick.receivedTimestamp || Date.now();
    const slotStartMs = Math.floor(providerTimestamp / this.timeframeMs) * this.timeframeMs;
    const slotStartSec = Math.floor(slotStartMs / 1000);
    const market = tick.market === "UPBIT" || tick.market === "CRYPTO" ? "CRYPTO" : tick.market || "KOREA";
    const source = tick.source || "SERVER_STREAM";
    const quality: FeedQuality = tick.feedQuality || tick.quality || (tick.isRealtime ? "BROKER_REALTIME" : "POLLING_DELAYED");

    // KIS legacy normalized ticks use tradeVolume while the unified realtime model uses volume.
    // Both are per-trade quantities. Never substitute cumulative/accumulated volume here.
    const compatibleTick = tick as CompatibleRealtimeTick;
    const rawTradeVolume = compatibleTick.volume ?? compatibleTick.tradeVolume;
    const volumeToAdd = Math.max(0, Number(rawTradeVolume) || 0);

    const makeCandle = (): AggregatedCandle => ({
      timeframe: this.timeframe,
      symbol: tick.symbol,
      market,
      open: tick.price,
      high: tick.price,
      low: tick.price,
      close: tick.price,
      volume: volumeToAdd,
      time: slotStartSec,
      startedAt: slotStartMs,
      endedAt: slotStartMs + this.timeframeMs,
      isFinal: false,
      isClosed: false,
      source,
      quality,
      feedQuality: quality,
      receivedAt,
      providerTimestamp,
      tickCount: 1,
      lastSequence: tick.sequence != null ? String(tick.sequence) : undefined
    });

    if (!this.currentCandle) {
      this.currentSlotMs = slotStartMs;
      this.currentCandle = makeCandle();
      return {
        updatedCandle: this.currentCandle,
        completedCandle: null,
        candle: this.currentCandle,
        closed: false
      };
    }

    if (slotStartMs > this.currentSlotMs) {
      const completedCandle: AggregatedCandle = {
        ...this.currentCandle,
        isFinal: true,
        isClosed: true
      };

      this.currentSlotMs = slotStartMs;
      this.currentCandle = makeCandle();

      return {
        updatedCandle: this.currentCandle,
        completedCandle,
        // Existing chart calls onClosedCandle(res.candle) when closed=true.
        // Return the completed bar here so indicators never run on an unclosed bar.
        candle: completedCandle,
        closed: true
      };
    }

    if (slotStartMs < this.currentSlotMs) {
      return {
        updatedCandle: this.currentCandle,
        completedCandle: null,
        candle: this.currentCandle,
        closed: false
      };
    }

    this.currentCandle.high = Math.max(this.currentCandle.high, tick.price);
    this.currentCandle.low = Math.min(this.currentCandle.low, tick.price);
    this.currentCandle.close = tick.price;
    this.currentCandle.volume += volumeToAdd;
    this.currentCandle.receivedAt = receivedAt;
    this.currentCandle.providerTimestamp = providerTimestamp;
    this.currentCandle.source = source;
    this.currentCandle.quality = quality;
    this.currentCandle.feedQuality = quality;
    this.currentCandle.tickCount += 1;
    this.currentCandle.lastSequence = tick.sequence != null ? String(tick.sequence) : this.currentCandle.lastSequence;

    return {
      updatedCandle: this.currentCandle,
      completedCandle: null,
      candle: this.currentCandle,
      closed: false
    };
  }
}
