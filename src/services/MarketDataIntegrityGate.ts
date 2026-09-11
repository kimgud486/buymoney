// ----------------------------------------------------------------------
// MARKET DATA INTEGRITY GATE (V14.0 REAL SCANNER CORE)
// Strict Fail-Closed Verification for Quotes and Candle Data
// ----------------------------------------------------------------------

import { defaultFakeDataDetector, MarketTick } from "../market-data/FakeDataDetector";

export interface VerifiedQuoteMetadata {
  provider: "UPBIT" | "NAVER_POLLING" | "YAHOO_FINANCE" | "KIS" | "SYSTEM_HUB";
  source: string;
  exchange: string;
  providerTimestamp: string | null;
  receivedAt: string;
  ageMs: number | null;
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

function parseOptionalFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const parsed = Number(typeof value === "string" ? value.replace(/,/g, "") : value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseTimestampMs(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;

  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;

  const parsed = new Date(String(value)).getTime();
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export class MarketDataIntegrityGate {
  private static MAX_QUOTE_AGE_MS = 60000; // 60s max staleness for live quotes
  private static MAX_FUTURE_ALLOWANCE_MS = 5000; // 5s clock skew allowance

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

    const rawProviderTimestamp = quote.providerTimestamp ?? quote.timestamp ?? null;
    const tsMs = parseTimestampMs(rawProviderTimestamp);
    const providerTimestamp = tsMs == null ? null : new Date(tsMs).toISOString();
    const ageMs = tsMs == null ? null : Math.max(0, now - tsMs);
    const isFuture = tsMs != null && tsMs > now + this.MAX_FUTURE_ALLOWANCE_MS;
    const isStaleByAge = ageMs != null && ageMs > this.MAX_QUOTE_AGE_MS;

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
    const parsedVolume = parseOptionalFiniteNumber(quote.volume);

    // Run FakeDataDetector inspection. Missing data stays missing: never invent
    // a zero volume or a current timestamp merely to satisfy the detector.
    const tick: MarketTick = {
      symbol: quote.symbol,
      price: quote.price,
      timestamp: tsMs ?? Number.NaN,
      source: quote.source || quote.provider || "REALTIME_STREAM",
    };
    if (parsedVolume != null) tick.volume = parsedVolume;

    const detectorResult = defaultFakeDataDetector.inspect(tick, now);

    let isVerified = detectorResult.liveTradingAllowed;
    let failureReason = detectorResult.reasons.length > 0
      ? detectorResult.reasons.map(r => r.code).join(", ")
      : "VERIFIED_OK";

    if (!quote.symbol || typeof quote.symbol !== "string") {
      isVerified = false;
      failureReason = "INVALID_SYMBOL";
    } else if (typeof quote.price !== "number" || isNaN(quote.price) || quote.price <= 0) {
      isVerified = false;
      failureReason = "INVALID_PRICE_NON_POSITIVE";
    } else if (tsMs == null) {
      isVerified = false;
      failureReason = "MISSING_OR_INVALID_PROVIDER_TIMESTAMP";
    } else if (isFuture) {
      isVerified = false;
      failureReason = "FUTURE_PROVIDER_TIMESTAMP";
    } else if (isStaleByAge) {
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
        isRealtime: isVerified && detectorResult.status === "VERIFIED",
        isVerified,
        isStale: tsMs == null || isStaleByAge || detectorResult.status === "STALE",
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
    let lastTimestamp = 0;
    const now = Date.now();

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      if (!c || typeof c !== "object") {
        return { isVerified: false, verifiedCandles: [], errorReason: `INVALID_CANDLE_OBJECT_AT_INDEX_${i}` };
      }

      const open = parseOptionalFiniteNumber(c.open);
      const high = parseOptionalFiniteNumber(c.high);
      const low = parseOptionalFiniteNumber(c.low);
      const close = parseOptionalFiniteNumber(c.close);
      const volume = parseOptionalFiniteNumber(c.volume);
      const timestamp = parseTimestampMs(c.timestamp ?? c.time);
      const tradeValue = parseOptionalFiniteNumber(c.tradeValue);

      // Logical OHLC checks
      if (open == null || open <= 0 || high == null || high <= 0 || low == null || low <= 0 || close == null || close <= 0) {
        return { isVerified: false, verifiedCandles: [], errorReason: `NON_POSITIVE_OR_MISSING_OHLC_AT_INDEX_${i}` };
      }

      if (low > Math.min(open, close) || high < Math.max(open, close)) {
        return { isVerified: false, verifiedCandles: [], errorReason: `OHLC_LOGICAL_INCONSISTENCY_AT_INDEX_${i}` };
      }

      if (volume == null || volume < 0) {
        return { isVerified: false, verifiedCandles: [], errorReason: `MISSING_OR_INVALID_VOLUME_AT_INDEX_${i}` };
      }

      if (timestamp == null) {
        return { isVerified: false, verifiedCandles: [], errorReason: `MISSING_OR_INVALID_TIMESTAMP_AT_INDEX_${i}` };
      }

      if (tradeValue != null && tradeValue < 0) {
        return { isVerified: false, verifiedCandles: [], errorReason: `INVALID_TRADE_VALUE_AT_INDEX_${i}` };
      }

      if (timestamp > now + this.MAX_FUTURE_ALLOWANCE_MS) {
        return { isVerified: false, verifiedCandles: [], errorReason: `FUTURE_CANDLE_TIMESTAMP_AT_INDEX_${i}` };
      }

      if (i > 0 && timestamp <= lastTimestamp) {
        return { isVerified: false, verifiedCandles: [], errorReason: `OUT_OF_ORDER_OR_DUPLICATE_TIMESTAMP_AT_INDEX_${i}` };
      }

      lastTimestamp = timestamp;
      verifiedCandles.push({
        timestamp,
        open,
        high,
        low,
        close,
        volume,
        ...(tradeValue != null ? { tradeValue } : {}),
        isVerified: true
      });
    }

    return {
      isVerified: true,
      verifiedCandles
    };
  }
}
