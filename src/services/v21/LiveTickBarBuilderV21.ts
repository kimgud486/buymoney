// JUSIK2 V21 LIVE TICK BAR BUILDER
// Real-time OHLCV bar builder powered purely by verified trade ticks. No synthetic bars.

import { BarV21, TickV21 } from "./types";

export class LiveTickBarBuilderV21 {
  private symbol: string;
  private timeframe: string;
  private timeframeMs: number;
  private currentBar: BarV21 | null = null;
  private currentSlotMs = 0;

  constructor(symbol: string, timeframe = "1m") {
    this.symbol = symbol;
    this.timeframe = timeframe;
    this.timeframeMs = LiveTickBarBuilderV21.getTimeframeMs(timeframe);
  }

  public static getTimeframeMs(tf: string): number {
    switch (tf) {
      case "1m": return 60_000;
      case "3m": return 3 * 60_000;
      case "5m": return 5 * 60_000;
      case "15m": return 15 * 60_000;
      case "60m": return 60 * 60_000;
      default: return 60_000;
    }
  }

  public reset(timeframe?: string): void {
    if (timeframe) {
      this.timeframe = timeframe;
      this.timeframeMs = LiveTickBarBuilderV21.getTimeframeMs(timeframe);
    }
    this.currentBar = null;
    this.currentSlotMs = 0;
  }

  public getCurrentBar(): BarV21 | null {
    return this.currentBar;
  }

  public processTick(tick: TickV21): {
    updatedBar: BarV21;
    completedBar: BarV21 | null;
  } {
    if (!tick || typeof tick.price !== "number" || tick.price <= 0) {
      throw new Error("[LiveTickBarBuilderV21] Invalid tick price");
    }

    const tickTs = tick.timestamp || Date.now();
    const slotStartMs = Math.floor(tickTs / this.timeframeMs) * this.timeframeMs;
    const slotStartSec = Math.floor(slotStartMs / 1000);

    // Case 1: First tick
    if (!this.currentBar) {
      this.currentSlotMs = slotStartMs;
      this.currentBar = {
        symbol: this.symbol,
        market: tick.market,
        timeframe: this.timeframe,
        time: slotStartSec,
        open: tick.price,
        high: tick.price,
        low: tick.price,
        close: tick.price,
        volume: Math.max(0, tick.volume || 0),
        startedAt: slotStartMs,
        endedAt: slotStartMs + this.timeframeMs - 1,
        isClosed: false,
        tickCount: 1,
      };
      return { updatedBar: this.currentBar, completedBar: null };
    }

    // Case 2: Same time slot
    if (slotStartMs === this.currentSlotMs) {
      this.currentBar.high = Math.max(this.currentBar.high, tick.price);
      this.currentBar.low = Math.min(this.currentBar.low, tick.price);
      this.currentBar.close = tick.price;
      this.currentBar.volume += Math.max(0, tick.volume || 0);
      this.currentBar.tickCount += 1;

      return { updatedBar: this.currentBar, completedBar: null };
    }

    // Case 3: New time slot -> Close current bar and open new bar
    const completedBar: BarV21 = {
      ...this.currentBar,
      isClosed: true,
    };

    this.currentSlotMs = slotStartMs;
    this.currentBar = {
      symbol: this.symbol,
      market: tick.market,
      timeframe: this.timeframe,
      time: slotStartSec,
      open: tick.price,
      high: tick.price,
      low: tick.price,
      close: tick.price,
      volume: Math.max(0, tick.volume || 0),
      startedAt: slotStartMs,
      endedAt: slotStartMs + this.timeframeMs - 1,
      isClosed: false,
      tickCount: 1,
    };

    return { updatedBar: this.currentBar, completedBar };
  }
}
