// AISTOCK Verified Market Candle Specification

export type RealMarketSource =
  | "KIS_REALTIME_WS"
  | "KIS_REST_HISTORY";

export interface VerifiedCandle {
  symbol: string;
  market: "KOREA" | "US" | "CRYPTO";
  timeframe: "1m" | "3m" | "5m" | "15m" | "60m";

  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;

  startedAt: number; // Unix timestamp in ms
  endedAt: number;   // Unix timestamp in ms

  source: RealMarketSource;
  sourceRequestId?: string;
  receivedAt: number; // Local processing timestamp in ms

  verified: true;
}

export function assertVerifiedCandles(candles: VerifiedCandle[]): void {
  if (!candles || !Array.isArray(candles) || candles.length < 30) {
    throw new Error("REAL_MARKET_DATA_REQUIRED");
  }

  const now = Date.now();

  for (const c of candles) {
    if (c.verified !== true) {
      throw new Error("UNVERIFIED_CANDLE");
    }

    if (c.source !== "KIS_REALTIME_WS" && c.source !== "KIS_REST_HISTORY") {
      throw new Error(`NON_REAL_CANDLE_SOURCE:${c.source}`);
    }

    if (
      !Number.isFinite(c.open) ||
      !Number.isFinite(c.high) ||
      !Number.isFinite(c.low) ||
      !Number.isFinite(c.close) ||
      !Number.isFinite(c.volume) ||
      c.open <= 0 ||
      c.high <= 0 ||
      c.low <= 0 ||
      c.close <= 0 ||
      c.volume < 0
    ) {
      throw new Error("INVALID_CANDLE");
    }

    if (c.high < c.low) {
      throw new Error("INVALID_OHLC_STRUCTURE");
    }

    if (c.high < Math.max(c.open, c.close) || c.low > Math.min(c.open, c.close)) {
      throw new Error("INVALID_OHLC_STRUCTURE");
    }

    if (c.endedAt > now + 60000) {
      throw new Error("FUTURE_TIMESTAMP_CANDLE");
    }
  }
}
