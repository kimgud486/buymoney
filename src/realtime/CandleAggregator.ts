// AISTOCK v13.8 REAL-TIME CANDLE AGGREGATOR
// Aggregates real-time trade ticks into OHLCV candles (1m, 3m, 5m, 15m).
// STRICT DIRECTIVE: Uses REAL ticks ONLY. No synthetic bars, no fake gap fills.

import { NormalizedTick } from "../../server/market/KISRealtimeWebSocketService";

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
  time: number; // bar start timestamp in seconds (Unix epoch sec)
  startedAt: number; // bar start timestamp in ms
  endedAt: number; // bar end timestamp in ms
  isFinal: boolean; // true when bar is officially completed by new time slot tick
  isClosed: boolean; // compatibility alias
  source: "KIS_WS" | "KIS_REALTIME_WS" | "KIS_REST_HISTORY" | string;
  quality: "REALTIME_TICK_AGGREGATED";
  tickCount: number;
  lastSequence?: string;
}

export class CandleAggregator {
  private timeframe: Timeframe;
  private timeframeMs: number;
  private currentCandle: AggregatedCandle | null = null;
  private currentSlotMs = 0;
  private prevCumulativeVolume: number | null = null;

  constructor(timeframe: Timeframe = "1m") {
    this.timeframe = timeframe;
    this.timeframeMs = CandleAggregator.getTimeframeMs(timeframe);
  }

  public static getTimeframeMs(timeframe: Timeframe): number {
    switch (timeframe) {
      case "1m":
        return 60_000;
      case "3m":
        return 3 * 60_000;
      case "5m":
        return 5 * 60_000;
      case "15m":
        return 15 * 60_000;
      default:
        return 60_000;
    }
  }

  public reset(timeframe?: Timeframe): void {
    if (timeframe) {
      this.timeframe = timeframe;
      this.timeframeMs = CandleAggregator.getTimeframeMs(timeframe);
    }
    this.currentCandle = null;
    this.currentSlotMs = 0;
    this.prevCumulativeVolume = null;
  }

  public getCurrentCandle(): AggregatedCandle | null {
    return this.currentCandle;
  }

  public update(tick: NormalizedTick): {
    updatedCandle: AggregatedCandle;
    completedCandle: AggregatedCandle | null;
  } {
    return this.processTick(tick);
  }

  public processTick(tick: NormalizedTick): {
    updatedCandle: AggregatedCandle;
    completedCandle: AggregatedCandle | null;
  } {
    const tickTime = tick.providerTimestamp || tick.receivedAt;
    const slotStartMs = Math.floor(tickTime / this.timeframeMs) * this.timeframeMs;
    const slotStartSec = Math.floor(slotStartMs / 1000);

    // Calculate volume delta if cumulativeVolume provided
    let volumeToAdd = tick.tradeVolume;
    if (tick.cumulativeVolume != null && tick.cumulativeVolume > 0) {
      if (this.prevCumulativeVolume != null && tick.cumulativeVolume >= this.prevCumulativeVolume) {
        volumeToAdd = tick.cumulativeVolume - this.prevCumulativeVolume;
      }
      this.prevCumulativeVolume = tick.cumulativeVolume;
    }

    // Case 1: First tick ever
    if (!this.currentCandle) {
      this.currentSlotMs = slotStartMs;
      this.currentCandle = {
        timeframe: this.timeframe,
        symbol: tick.symbol,
        market: tick.market,
        open: tick.price,
        high: tick.price,
        low: tick.price,
        close: tick.price,
        volume: Math.max(0, volumeToAdd),
        time: slotStartSec,
        startedAt: slotStartMs,
        endedAt: slotStartMs + this.timeframeMs,
        isFinal: false,
        isClosed: false,
        source: "KIS_WS",
        quality: "REALTIME_TICK_AGGREGATED",
        tickCount: 1,
        lastSequence: tick.sequence,
      };

      return {
        updatedCandle: this.currentCandle,
        completedCandle: null,
      };
    }

    // Case 2: Tick belongs to a NEW time slot -> complete existing candle and start new one
    if (slotStartMs > this.currentSlotMs) {
      const completedCandle: AggregatedCandle = {
        ...this.currentCandle,
        isFinal: true,
        isClosed: true,
      };

      this.currentSlotMs = slotStartMs;
      this.currentCandle = {
        timeframe: this.timeframe,
        symbol: tick.symbol,
        market: tick.market,
        open: tick.price,
        high: tick.price,
        low: tick.price,
        close: tick.price,
        volume: Math.max(0, volumeToAdd),
        time: slotStartSec,
        startedAt: slotStartMs,
        endedAt: slotStartMs + this.timeframeMs,
        isFinal: false,
        isClosed: false,
        source: "KIS_WS",
        quality: "REALTIME_TICK_AGGREGATED",
        tickCount: 1,
        lastSequence: tick.sequence,
      };

      return {
        updatedCandle: this.currentCandle,
        completedCandle,
      };
    }

    // Case 3: Tick belongs to CURRENT ongoing bar -> update high/low/close/volume
    this.currentCandle.high = Math.max(this.currentCandle.high, tick.price);
    this.currentCandle.low = Math.min(this.currentCandle.low, tick.price);
    this.currentCandle.close = tick.price;
    this.currentCandle.volume += Math.max(0, volumeToAdd);
    this.currentCandle.tickCount += 1;
    this.currentCandle.lastSequence = tick.sequence;

    return {
      updatedCandle: this.currentCandle,
      completedCandle: null,
    };
  }
}
