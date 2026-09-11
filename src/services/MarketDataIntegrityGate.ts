// ----------------------------------------------------------------------
// MARKET DATA INTEGRITY GATE (V14.1 REAL SCANNER CORE)
// Strict Fail-Closed Verification for Quotes and Candle Data
// Uses d3 median cadence statistics to detect malformed candle timelines.
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

export class MarketDataIntegrityGate {
  private static MAX_QUOTE_AGE_MS = 60000;
  private static MAX_FUTURE_ALLOWANCE_MS = 5000;

  /** Normalize common market timestamp formats to epoch milliseconds. */
  private static normalizeTimestamp(value: unknown): number | null {
    if (value == null || value === "") return null;

    let ts: number;
    if (typeof value === "number") {
      ts = value;
    } else if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return null;
      const numeric = Number(trimmed);
      ts = Number.isFinite(numeric) ? numeric : Date.parse(trimmed);
    } else {
      return null;
    }

    if (!Number.isFinite(ts) || ts <= 0) return null;
    // Many crypto/market APIs return epoch seconds. Normalize to milliseconds.
    if (ts < 1_000_000_000_000) ts *= 1000;
    return Number.isFinite(ts) && ts > 0 ? ts : null;
  }

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

    const rawProviderTime = quote.providerTimestamp ?? quote.timestamp;
    const tsMs = this.normalizeTimestamp(rawProviderTime);
    const providerTimestamp = tsMs != null ? new Date(tsMs).toISOString() : "INVALID_TIMESTAMP";
    const ageMs = tsMs == null ? Number.POSITIVE_INFINITY : Math.max(0, now - tsMs);
    const isFuture = tsMs != null && tsMs > now + this.MAX_FUTURE_ALLOWANCE_MS;
    const isStale = tsMs == null || ageMs > this.MAX_QUOTE_AGE_MS;

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
      timestamp: tsMs ?? 0,
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
    } else if (tsMs == null) {
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
      const timestamp = this.normalizeTimestamp(c.timestamp ?? c.time);

      if (![open, high, low, close].every(Number.isFinite) || open <= 0 || high <= 0 || low <= 0 || close <= 0) {
        return { isVerified: false, verifiedCandles: [], errorReason: `NON_POSITIVE_OR_NON_FINITE_OHLC_AT_INDEX_${i}` };
      }

      if (low > Math.min(open, close) || high < Math.max(open, close) || high < low) {
        return { isVerified: false, verifiedCandles: [], errorReason: `OHLC_LOGICAL_INCONSISTENCY_AT_INDEX_${i}` };
      }

      if (!Number.isFinite(volume) || volume < 0) {
        return { isVerified: false, verifiedCandles: [], errorReason: `INVALID_VOLUME_AT_INDEX_${i}` };
      }

      if (timestamp == null) {
        return { isVerified: false, verifiedCandles: [], errorReason: `INVALID_TIMESTAMP_AT_INDEX_${i}` };
      }

      if (timestamp > now + this.MAX_FUTURE_ALLOWANCE_MS) {
        return { isVerified: false, verifiedCandles: [], errorReason: `FUTURE_CANDLE_TIMESTAMP_AT_INDEX_${i}` };
      }

      if (i > 0) {
        if (timestamp <= lastTimestamp) {
          return { isVerified: false, verifiedCandles: [], errorReason: `OUT_OF_ORDER_OR_DUPLICATE_TIMESTAMP_AT_INDEX_${i}` };
        }
        intervals.push(timestamp - lastTimestamp);
      }

      lastTimestamp = timestamp;
      verifiedCandles.push({
        timestamp,
        open,
        high,
        low,
        close,
        volume,
        tradeValue: Number.isFinite(Number(c.tradeValue)) ? Number(c.tradeValue) : 0,
        isVerified: true
      });
    }

    // d3-backed robust cadence check. One overnight/session gap is allowed, but a feed
    // with many wildly irregular intervals is rejected instead of contaminating indicators.
    if (intervals.length >= 8) {
      const typicalInterval = median(intervals);
      if (typicalInterval == null || !Number.isFinite(typicalInterval) || typicalInterval <= 0) {
        return { isVerified: false, verifiedCandles: [], errorReason: "INVALID_CANDLE_CADENCE" };
      }

      const severeIrregularities = intervals.filter(
        gap => gap < typicalInterval * 0.2 || gap > typicalInterval * 20
      ).length;
      const allowedIrregularities = Math.max(2, Math.floor(intervals.length * 0.2));
      if (severeIrregularities > allowedIrregularities) {
        return { isVerified: false, verifiedCandles: [], errorReason: "IRREGULAR_CANDLE_CADENCE" };
      }
    }

    return {
      isVerified: true,
      verifiedCandles
    };
  }
}
