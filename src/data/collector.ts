// J.A.R.V.I.S. V4.0 Stage 1 Data Pipeline: Market Data Collector
// Synthetic candle generator permanently disabled in real-only live mode.

export interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  bidVolume: number;
  askVolume: number;
}

export interface MarketSymbolInfo {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "CRYPTO";
  basePrice: number;
}

export class MarketDataCollector {
  /**
   * LEGACY SYNTHETIC GENERATOR IS PERMANENTLY DISABLED
   * Throws fail-closed error to prevent synthetic/fake OHLCV candles from entering live pipelines.
   */
  public static fetchOHLCV(
    symbol: string,
    market: "KOREA" | "US" | "CRYPTO" = "KOREA",
    timeframe: "1m" | "5m" | "15m" | "60m" | "1D" = "15m",
    count: number = 60
  ): Candle[] {
    throw new Error(
      "LEGACY_SYNTHETIC_COLLECTOR_DISABLED: Use KISHistoricalCandleService or real-time WebSocket bar builder instead."
    );
  }
}
