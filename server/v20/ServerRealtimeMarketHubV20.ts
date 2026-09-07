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
    bidPrice?: number
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
    this.updateCandleStore(key, price, volume);

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
        grade: "DISPLAY_ONLY" // Stale data downgraded to DISPLAY_ONLY
      };
    }

    return q;
  }

  public getCandles(symbol: string): Candle[] {
    const key = symbol.toUpperCase();
    return this.candleHistory.get(key) || [];
  }

  public setCandles(symbol: string, candles: Candle[]): void {
    const key = symbol.toUpperCase();
    this.candleHistory.set(key, candles);
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
        volume: volume
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
          volume: volume
        });
        if (candles.length > 200) {
          candles.shift();
        }
      }
    }

    this.candleHistory.set(symbol, candles);
  }
}

export const serverRealtimeMarketHubV20 = ServerRealtimeMarketHubV20.getInstance();
