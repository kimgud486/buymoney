// ----------------------------------------------------------------------
// AISTOCK V20 SERVER REALTIME MARKET HUB
// Multi-market (Korea, US, Upbit) centralized quote & candle store with data grades
// ----------------------------------------------------------------------

import { DataGradeV20 } from "./KISOverseasParserV20";
import { Candle } from "../../src/services/StructureBrain";

export interface ServerMarketQuoteV20 {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "UPBIT";
  price: number;
  changeAmount: number;
  changePct: number;
  volume: number;
  tradeValue: number;
  askPrice?: number;
  bidPrice?: number;
  source: string;
  grade: DataGradeV20;
  updatedAt: number;
  sequence: number;
}

export class ServerRealtimeMarketHubV20 {
  private static instance: ServerRealtimeMarketHubV20;
  private quotes: Map<string, ServerMarketQuoteV20> = new Map();
  private candleHistory: Map<string, Candle[]> = new Map();
  private sequenceCounter = 0;

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): ServerRealtimeMarketHubV20 {
    if (!ServerRealtimeMarketHubV20.instance) {
      ServerRealtimeMarketHubV20.instance = new ServerRealtimeMarketHubV20();
    }
    return ServerRealtimeMarketHubV20.instance;
  }

  public updateQuote(
    symbol: string,
    name: string,
    market: "KOREA" | "US" | "UPBIT",
    price: number,
    changeAmount: number,
    changePct: number,
    volume: number,
    tradeValue: number,
    source: string,
    grade: DataGradeV20,
    askPrice?: number,
    bidPrice?: number,
    candleTradeVolume?: number,
  ): ServerMarketQuoteV20 {
    const key = symbol.toUpperCase();
    this.sequenceCounter++;

    const quote: ServerMarketQuoteV20 = {
      symbol: key,
      name,
      market,
      price,
      changeAmount,
      changePct,
      volume,
      tradeValue,
      askPrice,
      bidPrice,
      source,
      grade,
      updatedAt: Date.now(),
      sequence: this.sequenceCounter
    };

    this.quotes.set(key, quote);
    this.updateCandleStore(key, price, Math.max(0, candleTradeVolume ?? volume));

    return quote;
  }

  public getQuote(symbol: string): ServerMarketQuoteV20 | null {
    const key = symbol.toUpperCase();
    const q = this.quotes.get(key) || this.quotes.get(key.replace("KRW-", ""));
    if (!q) return null;

    // Freshness check (15 seconds cutoff)
    if (Date.now() - q.updatedAt > 15000) {
      return {
        ...q,
        grade: "DISPLAY_ONLY"
      };
    }

    return q;
  }

  public getCandles(symbol: string): Candle[] {
    const key = symbol.toUpperCase();
    return this.candleHistory.get(key) || [];
  }

  /**
   * Returns server-built intraday candles from the 1-minute truth store.
   * completedOnly=true deliberately drops the currently forming bucket so
   * ORB/VWAP/First Pullback rules never confirm from an unfinished candle.
   *
   * 3m is aggregated deterministically from the same verified 1m store. It is
   * not relabeled 5m data and therefore preserves True-MTF interval integrity.
   */
  public getIntradayCandles(
    symbol: string,
    timeframeMinutes: 1 | 3 | 5 = 1,
    completedOnly = true,
  ): Candle[] {
    const oneMinute = this.getCandles(symbol).slice();
    if (!oneMinute.length) return [];

    const aggregated = timeframeMinutes === 1
      ? oneMinute
      : this.aggregateCandles(oneMinute, timeframeMinutes);

    if (!completedOnly || !aggregated.length) return aggregated;

    const bucketMs = timeframeMinutes * 60_000;
    const currentBucket = Math.floor(Date.now() / bucketMs) * bucketMs;
    return aggregated.filter((c) => {
      const ts = typeof c.timestamp === "number" ? c.timestamp : Date.parse(c.timestamp) || 0;
      return ts < currentBucket;
    });
  }

  public setCandles(symbol: string, candles: Candle[]): void {
    const key = symbol.toUpperCase();
    this.candleHistory.set(key, candles);
  }

  private aggregateCandles(candles: Candle[], timeframeMinutes: number): Candle[] {
    const bucketMs = timeframeMinutes * 60_000;
    const out: Candle[] = [];

    for (const candle of candles) {
      const ts = typeof candle.timestamp === "number" ? candle.timestamp : Date.parse(candle.timestamp) || 0;
      if (!ts) continue;
      const bucket = Math.floor(ts / bucketMs) * bucketMs;
      const last = out[out.length - 1];
      const lastTs = last
        ? (typeof last.timestamp === "number" ? last.timestamp : Date.parse(last.timestamp) || 0)
        : -1;

      if (!last || lastTs !== bucket) {
        out.push({
          timestamp: bucket,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
        });
        continue;
      }

      last.high = Math.max(last.high, candle.high);
      last.low = Math.min(last.low, candle.low);
      last.close = candle.close;
      last.volume += candle.volume;
    }

    return out;
  }

  private updateCandleStore(symbol: string, price: number, volume: number): void {
    const candles = this.candleHistory.get(symbol) || [];
    const now = Date.now();
    const minuteTs = Math.floor(now / 60000) * 60000;

    if (candles.length === 0) {
      candles.push({
        timestamp: minuteTs,
        open: price,
        high: price,
        low: price,
        close: price,
        volume
      });
    } else {
      const last = candles[candles.length - 1];
      const lastTs = typeof last.timestamp === "number" ? last.timestamp : Date.parse(last.timestamp) || 0;

      if (lastTs === minuteTs) {
        last.high = Math.max(last.high, price);
        last.low = Math.min(last.low, price);
        last.close = price;
        last.volume += volume;
      } else if (minuteTs > lastTs) {
        candles.push({
          timestamp: minuteTs,
          open: price,
          high: price,
          low: price,
          close: price,
          volume
        });
        if (candles.length > 500) {
          candles.shift();
        }
      }
    }

    this.candleHistory.set(symbol, candles);
  }
}

export const serverRealtimeMarketHubV20 = ServerRealtimeMarketHubV20.getInstance();
