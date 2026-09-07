// AISTOCK v13.8 RealBarBuilder using VerifiedTradeTick

import { VerifiedTradeTick, validateTradeTick } from "./VerifiedTradeTick";
import { VerifiedCandle } from "./MarketCandle";

interface WorkingBar {
  symbol: string;
  market: "KOREA" | "US" | "CRYPTO";
  start: number;
  end: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class RealBarBuilder {
  private bars = new Map<string, WorkingBar>();

  constructor(
    private timeframeMs: number = 60000,
    private timeframe: "1m" | "3m" | "5m" | "15m" = "1m"
  ) {}

  public push(tick: VerifiedTradeTick): VerifiedCandle | null {
    validateTradeTick(tick);

    const bucketStart = Math.floor(tick.exchangeTimestamp / this.timeframeMs) * this.timeframeMs;
    const bucketEnd = bucketStart + this.timeframeMs;
    const key = tick.symbol;

    const current = this.bars.get(key);

    if (!current) {
      this.bars.set(key, {
        symbol: tick.symbol,
        market: tick.market,
        start: bucketStart,
        end: bucketEnd,
        open: tick.price,
        high: tick.price,
        low: tick.price,
        close: tick.price,
        volume: tick.size
      });
      return null;
    }

    if (bucketStart !== current.start) {
      const completed: VerifiedCandle = {
        symbol: current.symbol,
        market: current.market,
        timeframe: this.timeframe,

        open: current.open,
        high: current.high,
        low: current.low,
        close: current.close,
        volume: current.volume,

        startedAt: current.start,
        endedAt: current.end,

        source: "KIS_REALTIME_WS",
        receivedAt: Date.now(),

        verified: true
      };

      this.bars.set(key, {
        symbol: tick.symbol,
        market: tick.market,
        start: bucketStart,
        end: bucketEnd,
        open: tick.price,
        high: tick.price,
        low: tick.price,
        close: tick.price,
        volume: tick.size
      });

      return completed;
    }

    current.high = Math.max(current.high, tick.price);
    current.low = Math.min(current.low, tick.price);
    current.close = tick.price;
    current.volume += tick.size;

    return null;
  }
}
