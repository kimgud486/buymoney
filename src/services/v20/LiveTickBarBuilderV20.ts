// AISTOCK V20 LIVE TICK BAR BUILDER
// Aggregates verified real-time trade ticks into OHLCV bars without synthetic gap bars.

export interface V20Tick {
  symbol: string;
  market?: "KOREA" | "US" | "UPBIT" | "CRYPTO" | string;
  price: number;
  volume: number;
  timestamp: number; // ms
  isVerified?: boolean;
}

export interface V20Bar {
  symbol: string;
  timeframe: "1m" | "3m" | "5m" | "15m" | string;
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  tickCount: number;
  isClosed: boolean;
  startedAt: number;
  endedAt: number;
}

export class LiveTickBarBuilderV20 {
  private symbol: string;
  private timeframe: "1m" | "3m" | "5m" | "15m" | string;
  private timeframeMs: number;
  private currentBar: V20Bar | null = null;
  private currentSlotMs = 0;

  constructor(symbol: string, timeframe: "1m" | "3m" | "5m" | "15m" | string = "1m") {
    this.symbol = symbol;
    this.timeframe = timeframe;
    this.timeframeMs = LiveTickBarBuilderV20.getTimeframeMs(timeframe);
  }

  public static getTimeframeMs(tf: string): number {
    switch (tf) {
      case "1m": return 60_000;
      case "3m": return 3 * 60_000;
      case "5m": return 5 * 60_000;
      case "15m": return 15 * 60_000;
      default: return 60_000;
    }
  }

  public reset(timeframe?: string): void {
    if (timeframe) {
      this.timeframe = timeframe;
      this.timeframeMs = LiveTickBarBuilderV20.getTimeframeMs(timeframe);
    }
    this.currentBar = null;
    this.currentSlotMs = 0;
  }

  public getCurrentBar(): V20Bar | null {
    return this.currentBar;
  }

  public processTick(tick: V20Tick): {
    updatedBar: V20Bar;
    completedBar: V20Bar | null;
  } {
    // Fail closed on invalid price
    if (!tick || typeof tick.price !== "number" || tick.price <= 0) {
      throw new Error("[LiveTickBarBuilderV20] Invalid tick price");
    }

    const tickTime = tick.timestamp || Date.now();
    const slotStartMs = Math.floor(tickTime / this.timeframeMs) * this.timeframeMs;
    const slotStartSec = Math.floor(slotStartMs / 1000);

    // Case 1: First tick
    if (!this.currentBar) {
      this.currentSlotMs = slotStartMs;
      this.currentBar = {
        symbol: this.symbol,
        timeframe: this.timeframe,
        time: slotStartSec,
        open: tick.price,
        high: tick.price,
        low: tick.price,
        close: tick.price,
        volume: Math.max(0, tick.volume || 0),
        tickCount: 1,
        isClosed: false,
        startedAt: slotStartMs,
        endedAt: slotStartMs + this.timeframeMs - 1,
      };
      return { updatedBar: this.currentBar, completedBar: null };
    }

    // Case 2: Same time slot tick
    if (slotStartMs === this.currentSlotMs) {
      this.currentBar.high = Math.max(this.currentBar.high, tick.price);
      this.currentBar.low = Math.min(this.currentBar.low, tick.price);
      this.currentBar.close = tick.price;
      this.currentBar.volume += Math.max(0, tick.volume || 0);
      this.currentBar.tickCount += 1;

      return { updatedBar: this.currentBar, completedBar: null };
    }

    // Case 3: New time slot -> Close current bar and start new bar
    const completedBar: V20Bar = {
      ...this.currentBar,
      isClosed: true,
    };

    this.currentSlotMs = slotStartMs;
    this.currentBar = {
      symbol: this.symbol,
      timeframe: this.timeframe,
      time: slotStartSec,
      open: tick.price,
      high: tick.price,
      low: tick.price,
      close: tick.price,
      volume: Math.max(0, tick.volume || 0),
      tickCount: 1,
      isClosed: false,
      startedAt: slotStartMs,
      endedAt: slotStartMs + this.timeframeMs - 1,
    };

    return { updatedBar: this.currentBar, completedBar };
  }
}
