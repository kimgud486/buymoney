// AISTOCK Real-Time Bar Builder
// Constructs VerifiedCandles from real tick feeds (open=first trade, high=max trade, low=min trade, close=last trade, volume=accumulated real volume delta).

import { VerifiedCandle, RealMarketSource } from "./MarketCandle";
import { LiveTick } from "./types";

export class RealTimeBarBuilder {
  private candles: Map<string, VerifiedCandle> = new Map();

  public update(
    tick: LiveTick,
    timeframe: "1m" | "3m" | "5m" | "15m" | "60m" = "15m",
    market: "KOREA" | "US" | "CRYPTO" = "KOREA"
  ): { candle: VerifiedCandle; closed: boolean } {
    const timeframeMs = timeframe === "1m" ? 60000 : timeframe === "3m" ? 180000 : timeframe === "5m" ? 300000 : timeframe === "15m" ? 900000 : 3600000;
    const slotMs = Math.floor(tick.timestamp / timeframeMs) * timeframeMs;
    const key = `${tick.symbol}_${timeframe}_${slotMs}`;

    let current = this.candles.get(key);
    let closed = false;

    if (!current) {
      current = {
        symbol: tick.symbol,
        market,
        timeframe,
        open: tick.price,
        high: tick.price,
        low: tick.price,
        close: tick.price,
        volume: tick.volume,
        startedAt: slotMs,
        endedAt: slotMs + timeframeMs,
        source: "KIS_REALTIME_WS" as RealMarketSource,
        receivedAt: Date.now(),
        verified: true
      };
      this.candles.set(key, current);
    } else {
      current.high = Math.max(current.high, tick.price);
      current.low = Math.min(current.low, tick.price);
      current.close = tick.price;
      current.volume += tick.volume;
      current.receivedAt = Date.now();
    }

    if (Date.now() >= current.endedAt) {
      closed = true;
    }

    return { candle: current, closed };
  }
}

export const globalRealTimeBarBuilder = new RealTimeBarBuilder();
