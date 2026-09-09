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

export interface ServerMarketCandleV204 extends Candle {
  /** Timestamp of the most recent real trade incorporated into this candle. */
  lastTradeTimestamp: number;
  /** Provenance is retained so synthetic/fallback candles cannot enter BUY gates. */
  source?: string;
}

export class ServerRealtimeMarketHubV20 {
  private static instance: ServerRealtimeMarketHubV20;
  private quotes: Map<string, ServerMarketQuoteV20> = new Map();
  private candleHistory: Map<string, ServerMarketCandleV204[]> = new Map();
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
    providerTradeTimestamp?: number,
  ): ServerMarketQuoteV20 {
    const key = symbol.toUpperCase();
    this.sequenceCounter++;
    const receivedAt = Date.now();
    const tradeTimestamp = providerTradeTimestamp && Number.isFinite(providerTradeTimestamp)
      ? providerTradeTimestamp
      : receivedAt;

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
      updatedAt: receivedAt,
      sequence: this.sequenceCounter
    };

    this.quotes.set(key, quote);
    this.updateCandleStore(
      key,
      price,
      Math.max(0, candleTradeVolume ?? volume),
      tradeTimestamp,
      source,
    );

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

  public getCandles(symbol: string): ServerMarketCandleV204[] {
    const key = symbol.toUpperCase();
    return this.candleHistory.get(key) || [];
  }

  /**
   * Returns server-built intraday candles from the 1-minute truth store.
   * completedOnly=true deliberately drops the currently forming bucket so
   * ORB/VWAP/First Pullback rules never confirm from an unfinished candle.
   */
  public getIntradayCandles(
    symbol: string,
    timeframeMinutes: 1 | 3 | 5 = 1,
    completedOnly = true,
  ): ServerMarketCandleV204[] {
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

  /**
   * Seeds only externally verified candles. Missing bars are never fabricated.
   */
  public setCandles(symbol: string, candles: Array<Candle & Partial<Pick<ServerMarketCandleV204, "lastTradeTimestamp" | "source">>>): void {
    const key = symbol.toUpperCase();
    const normalized = candles
      .map((candle) => {
        const ts = typeof candle.timestamp === "number"
          ? candle.timestamp
          : Date.parse(candle.timestamp) || 0;
        const lastTradeTimestamp = Number.isFinite(candle.lastTradeTimestamp)
          ? Number(candle.lastTradeTimestamp)
          : ts;
        return {
          ...candle,
          timestamp: ts,
          lastTradeTimestamp,
          source: candle.source || "VERIFIED_EXTERNAL"
        } as ServerMarketCandleV204;
      })
      .filter((candle) => candle.timestamp && candle.close > 0)
      .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

    this.candleHistory.set(key, normalized);
  }

  public aggregateCandles(
    candles: ServerMarketCandleV204[],
    timeframeMinutes: number,
  ): ServerMarketCandleV204[] {
    const bucketMs = timeframeMinutes * 60_000;
    const out: ServerMarketCandleV204[] = [];

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
          lastTradeTimestamp: candle.lastTradeTimestamp || ts,
          source: candle.source,
        });
        continue;
      }

      last.high = Math.max(last.high, candle.high);
      last.low = Math.min(last.low, candle.low);
      last.close = candle.close;
      last.volume += candle.volume;
      last.lastTradeTimestamp = Math.max(
        last.lastTradeTimestamp || 0,
        candle.lastTradeTimestamp || ts,
      );
      if (last.source !== candle.source) {
        last.source = "MIXED_VERIFIED";
      }
    }

    return out;
  }

  private updateCandleStore(
    symbol: string,
    price: number,
    volume: number,
    tradeTimestamp: number,
    source: string,
  ): void {
    const candles = this.candleHistory.get(symbol) || [];
    const minuteTs = Math.floor(tradeTimestamp / 60000) * 60000;

    if (candles.length === 0) {
      candles.push({
        timestamp: minuteTs,
        open: price,
        high: price,
        low: price,
        close: price,
        volume,
        lastTradeTimestamp: tradeTimestamp,
        source,
      });
    } else {
      const last = candles[candles.length - 1];
      const lastTs = typeof last.timestamp === "number" ? last.timestamp : Date.parse(last.timestamp) || 0;

      if (lastTs === minuteTs) {
        last.high = Math.max(last.high, price);
        last.low = Math.min(last.low, price);
        last.close = price;
        last.volume += volume;
        last.lastTradeTimestamp = Math.max(last.lastTradeTimestamp || 0, tradeTimestamp);
        last.source = source || last.source;
      } else if (minuteTs > lastTs) {
        candles.push({
          timestamp: minuteTs,
          open: price,
          high: price,
          low: price,
          close: price,
          volume,
          lastTradeTimestamp: tradeTimestamp,
          source,
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
