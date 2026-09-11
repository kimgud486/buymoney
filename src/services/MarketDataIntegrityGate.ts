// ----------------------------------------------------------------------
// MARKET DATA INTEGRITY GATE (V14.1 REAL SCANNER CORE)
// Strict Fail-Closed Verification for Quotes and Candle Data
// ----------------------------------------------------------------------

import { median } from "d3";
import { defaultFakeDataDetector, MarketTick } from "../market-data/FakeDataDetector";

export interface VerifiedQuoteMetadata {
  provider: "UPBIT" | "NAVER_POLLING" | "YAHOO_FINANCE" | "KIS" | "SYSTEM_HUB";
  source: string;
  exchange: string;
  providerTimestamp: string;
  receivedAt: string;
  ageMs: number;
  isRealtime: boolean;
  isVerified: boolean;
  isStale: boolean;
  verificationReason: string;
  trustScore?: number;
}

export interface VerifiedCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  tradeValue?: number;
  isVerified: boolean;
  verificationError?: string;
}

function normalizeTimestampMs(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 0 && value < 10_000_000_000 ? value * 1000 : value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return NaN;
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) return numeric > 0 && numeric < 10_000_000_000 ? numeric * 1000 : numeric;
    return Date.parse(trimmed);
  }
  return NaN;
}

export class MarketDataIntegrityGate {
  private static MAX_QUOTE_AGE_MS = 60000;
  private static MAX_FUTURE_ALLOWANCE_MS = 5000;

  public static verifyQuote(quote: {
    symbol: string;
    price: number;
    volume?: number | string;
    market?: string;
    providerTimestamp?: string | number | null;
    timestamp?: string | number;
    provider?: string;
    source?: string;
  }): { isVerified: boolean; metadata: VerifiedQuoteMetadata } {
    const now = Date.now();
    const receivedAt = new Date(now).toISOString();
    const provTime = quote.providerTimestamp ?? quote.timestamp ?? now;
    const tsMs = normalizeTimestampMs(provTime);
    const providerTimestamp = Number.isFinite(tsMs) ? new Date(tsMs).toISOString() : String(provTime);
    const ageMs = Number.isFinite(tsMs) ? Math.max(0, now - tsMs) : Number.POSITIVE_INFINITY;
    const isFuture = Number.isFinite(tsMs) && tsMs > now + this.MAX_FUTURE_ALLOWANCE_MS;
    const isStale = !Number.isFinite(tsMs) || ageMs > this.MAX_QUOTE_AGE_MS;

    const providerName: "UPBIT" | "NAVER_POLLING" | "YAHOO_FINANCE" | "KIS" | "SYSTEM_HUB" =
      (quote.provider as any) ||
      (quote.source === "NAVER_POLLING"
        ? "NAVER_POLLING"
        : quote.market === "UPBIT"
        ? "UPBIT"
        : quote.market === "US"
        ? "YAHOO_FINANCE"
        : "SYSTEM_HUB");

    const exchangeName = quote.market || "KOSPI";
    const tick: MarketTick = {
      symbol: quote.symbol,
      price: quote.price,
      volume: typeof quote.volume === "number" ? quote.volume : parseFloat(String(quote.volume || 0)) || 0,
      timestamp: Number.isFinite(tsMs) ? tsMs : now,
      source: quote.source || quote.provider || "REALTIME_STREAM",
    };
    const detectorResult = defaultFakeDataDetector.inspect(tick, now);

    let isVerified = detectorResult.liveTradingAllowed;
    let failureReason = detectorResult.reasons.length > 0
      ? detectorResult.reasons.map(r => r.code).join(", ")
      : "VERIFIED_OK";

    if (!quote.symbol || typeof quote.symbol !== "string") {
      isVerified = false;
      failureReason = "INVALID_SYMBOL";
    } else if (typeof quote.price !== "number" || !Number.isFinite(quote.price) || quote.price <= 0) {
      isVerified = false;
      failureReason = "INVALID_PRICE_NON_POSITIVE";
    } else if (!Number.isFinite(tsMs)) {
      isVerified = false;
      failureReason = "INVALID_PROVIDER_TIMESTAMP";
    } else if (isFuture) {
      isVerified = false;
      failureReason = "FUTURE_PROVIDER_TIMESTAMP";
    } else if (isStale) {
      isVerified = false;
      failureReason = "STALE_PROVIDER_TIMESTAMP";
    }

    return {
      isVerified,
      metadata: {
        provider: providerName,
        source: quote.source || "REALTIME_STREAM",
        exchange: exchangeName,
        providerTimestamp,
        receivedAt,
        ageMs,
        isRealtime: isVerified && !isStale && !isFuture && detectorResult.status === "VERIFIED",
        isVerified,
        isStale,
        verificationReason: failureReason,
        trustScore: detectorResult.trustScore,
      }
    };
  }

  public static verifyCandles(candles: any[]): { isVerified: boolean; verifiedCandles: VerifiedCandle[]; errorReason?: string } {
    if (!Array.isArray(candles) || candles.length === 0) {
      return { isVerified: false, verifiedCandles: [], errorReason: "NO_CANDLES_PROVIDED" };
    }

    const verifiedCandles: VerifiedCandle[] = [];
    const intervals: number[] = [];
    let lastTimestamp = 0;
    const now = Date.now();

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      if (!c || typeof c !== "object") {
        return { isVerified: false, verifiedCandles: [], errorReason: `INVALID_CANDLE_OBJECT_AT_INDEX_${i}` };
      }

      const open = Number(c.open);
      const high = Number(c.high);
      const low = Number(c.low);
      const close = Number(c.close);
      const volume = Number(c.volume ?? 0);
      const timestamp = normalizeTimestampMs(c.timestamp ?? c.time ?? 0);

      if (![open, high, low, close].every(Number.isFinite) || open <= 0 || high <= 0 || low <= 0 || close <= 0) {
        return { isVerified: false, verifiedCandles: [], errorReason: `NON_POSITIVE_OR_INVALID_OHLC_AT_INDEX_${i}` };
      }
      if (low > Math.min(open, close) || high < Math.max(open, close) || high < low) {
        return { isVerified: false, verifiedCandles: [], errorReason: `OHLC_LOGICAL_INCONSISTENCY_AT_INDEX_${i}` };
      }
      if (!Number.isFinite(volume) || volume < 0) {
        return { isVerified: false, verifiedCandles: [], errorReason: `NEGATIVE_OR_INVALID_VOLUME_AT_INDEX_${i}` };
      }
      if (!Number.isFinite(timestamp) || timestamp <= 0) {
        return { isVerified: false, verifiedCandles: [], errorReason: `INVALID_CANDLE_TIMESTAMP_AT_INDEX_${i}` };
      }
      if (timestamp > now + this.MAX_FUTURE_ALLOWANCE_MS) {
        return { isVerified: false, verifiedCandles: [], errorReason: `FUTURE_CANDLE_TIMESTAMP_AT_INDEX_${i}` };
      }
      if (i > 0 && timestamp <= lastTimestamp) {
        return { isVerified: false, verifiedCandles: [], errorReason: `OUT_OF_ORDER_OR_DUPLICATE_TIMESTAMP_AT_INDEX_${i}` };
      }
      if (i > 0) intervals.push(timestamp - lastTimestamp);

      lastTimestamp = timestamp;
      verifiedCandles.push({ timestamp, open, high, low, close, volume, tradeValue: Number(c.tradeValue || 0), isVerified: true });
    }

    if (intervals.length >= 4) {
      const cadenceMs = median(intervals);
      if (!Number.isFinite(cadenceMs) || !cadenceMs || cadenceMs <= 0) {
        return { isVerified: false, verifiedCandles: [], errorReason: "INVALID_CANDLE_CADENCE" };
      }
      const extremeGap = intervals.find(gap => gap > cadenceMs * 8);
      if (extremeGap !== undefined) {
        return { isVerified: false, verifiedCandles: [], errorReason: "IRREGULAR_CANDLE_CADENCE_EXTREME_GAP" };
      }
    }

    return { isVerified: true, verifiedCandles };
  }
}
