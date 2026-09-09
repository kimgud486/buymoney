// ----------------------------------------------------------------------
// MARKET DATA INTEGRITY GATE (V15.1 TRUTH-FIRST)
// Strict Fail-Closed Verification for Quotes and Candle Data
// ----------------------------------------------------------------------

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

  private static normalizeSymbol(symbol: unknown): string {
    return String(symbol ?? "").trim().toUpperCase();
  }

  public static verifyQuote(
    quote: {
      symbol: string;
      price: number | null | undefined;
      volume?: number | string | null;
      market?: string | null;
      providerTimestamp?: string | number | null;
      timestamp?: string | number | null;
      provider?: string | null;
      source?: string | null;
    },
    expectedSymbol?: string
  ): { isVerified: boolean; metadata: VerifiedQuoteMetadata } {
    const now = Date.now();
    const receivedAt = new Date(now).toISOString();

    const actualSymbol = this.normalizeSymbol(quote.symbol);
    const normalizedExpected = this.normalizeSymbol(expectedSymbol);
    const rawTimestamp = quote.providerTimestamp ?? quote.timestamp ?? null;
    const hasExplicitTimestamp = rawTimestamp !== null && rawTimestamp !== undefined && rawTimestamp !== "";
    const tsMs = !hasExplicitTimestamp
      ? Number.NaN
      : typeof rawTimestamp === "number"
      ? rawTimestamp
      : new Date(rawTimestamp).getTime();

    const timestampValid = Number.isFinite(tsMs) && tsMs > 0;
    const providerTimestamp = timestampValid ? new Date(tsMs).toISOString() : "";
    const ageMs = timestampValid ? Math.max(0, now - tsMs) : Number.POSITIVE_INFINITY;
    const isFuture = timestampValid && tsMs > now + this.MAX_FUTURE_ALLOWANCE_MS;
    const isStale = !timestampValid || ageMs > this.MAX_QUOTE_AGE_MS;

    const provider = String(quote.provider ?? "").trim();
    const source = String(quote.source ?? "").trim();
    const market = String(quote.market ?? "").trim();

    const allowedProviders = new Set([
      "UPBIT",
      "NAVER_POLLING",
      "YAHOO_FINANCE",
      "KIS",
      "SYSTEM_HUB",
    ]);

    const providerName = (allowedProviders.has(provider) ? provider : "SYSTEM_HUB") as VerifiedQuoteMetadata["provider"];
    const exchangeName = market || "UNKNOWN";

    const detectorTick: MarketTick = {
      symbol: actualSymbol,
      price: typeof quote.price === "number" ? quote.price : Number.NaN,
      volume:
        typeof quote.volume === "number"
          ? quote.volume
          : Number.parseFloat(String(quote.volume ?? 0)) || 0,
      timestamp: timestampValid ? tsMs : now,
      source: source || provider || "UNVERIFIED",
    };
    const detectorResult = defaultFakeDataDetector.inspect(detectorTick, now);

    let isVerified = detectorResult.liveTradingAllowed;
    let failureReason = detectorResult.reasons.length > 0
      ? detectorResult.reasons.map((reason) => reason.code).join(", ")
      : "VERIFIED_OK";

    if (!actualSymbol) {
      isVerified = false;
      failureReason = "INVALID_SYMBOL";
    } else if (normalizedExpected && actualSymbol !== normalizedExpected) {
      isVerified = false;
      failureReason = `SYMBOL_MISMATCH_EXPECTED_${normalizedExpected}_GOT_${actualSymbol}`;
    } else if (typeof quote.price !== "number" || !Number.isFinite(quote.price) || quote.price <= 0) {
      isVerified = false;
      failureReason = "INVALID_PRICE_NON_POSITIVE";
    } else if (!provider || !allowedProviders.has(provider)) {
      isVerified = false;
      failureReason = "MISSING_OR_UNSUPPORTED_PROVIDER";
    } else if (!source) {
      isVerified = false;
      failureReason = "MISSING_SOURCE";
    } else if (!hasExplicitTimestamp) {
      isVerified = false;
      failureReason = "MISSING_PROVIDER_TIMESTAMP";
    } else if (!timestampValid) {
      isVerified = false;
      failureReason = "INVALID_PROVIDER_TIMESTAMP";
    } else if (isFuture) {
      isVerified = false;
      failureReason = "FUTURE_TIMESTAMP_DETECTED";
    } else if (isStale) {
      isVerified = false;
      failureReason = "STALE_QUOTE_EXCEEDED_MAX_AGE";
    }

    return {
      isVerified,
      metadata: {
        provider: providerName,
        source: source || "UNVERIFIED",
        exchange: exchangeName,
        providerTimestamp,
        receivedAt,
        ageMs,
        isRealtime: isVerified && !isStale && !isFuture,
        isVerified,
        isStale,
        verificationReason: failureReason,
        trustScore: isVerified ? detectorResult.trustScore : 0,
      },
    };
  }

  public static verifyCandles(candles: any[]): {
    isVerified: boolean;
    verifiedCandles: VerifiedCandle[];
    errorReason?: string;
  } {
    if (!Array.isArray(candles) || candles.length === 0) {
      return { isVerified: false, verifiedCandles: [], errorReason: "NO_CANDLES_PROVIDED" };
    }

    const verifiedCandles: VerifiedCandle[] = [];
    let lastTimestamp = 0;
    const now = Date.now();

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      if (!c || typeof c !== "object") {
        return {
          isVerified: false,
          verifiedCandles: [],
          errorReason: `INVALID_CANDLE_OBJECT_AT_INDEX_${i}`,
        };
      }

      const open = Number(c.open);
      const high = Number(c.high);
      const low = Number(c.low);
      const close = Number(c.close);
      const volume = Number(c.volume ?? 0);
      const timestamp = Number(c.timestamp ?? c.time ?? 0);

      if (
        !Number.isFinite(open) || open <= 0 ||
        !Number.isFinite(high) || high <= 0 ||
        !Number.isFinite(low) || low <= 0 ||
        !Number.isFinite(close) || close <= 0
      ) {
        return {
          isVerified: false,
          verifiedCandles: [],
          errorReason: `NON_POSITIVE_OHLC_AT_INDEX_${i}`,
        };
      }

      if (low > Math.min(open, close) || high < Math.max(open, close) || low > high) {
        return {
          isVerified: false,
          verifiedCandles: [],
          errorReason: `OHLC_LOGICAL_INCONSISTENCY_AT_INDEX_${i}`,
        };
      }

      if (!Number.isFinite(volume) || volume < 0) {
        return {
          isVerified: false,
          verifiedCandles: [],
          errorReason: `NEGATIVE_VOLUME_AT_INDEX_${i}`,
        };
      }

      if (!Number.isFinite(timestamp) || timestamp <= 0) {
        return {
          isVerified: false,
          verifiedCandles: [],
          errorReason: `INVALID_CANDLE_TIMESTAMP_AT_INDEX_${i}`,
        };
      }

      if (timestamp > now + this.MAX_FUTURE_ALLOWANCE_MS) {
        return {
          isVerified: false,
          verifiedCandles: [],
          errorReason: `FUTURE_CANDLE_TIMESTAMP_AT_INDEX_${i}`,
        };
      }

      if (i > 0 && timestamp <= lastTimestamp) {
        return {
          isVerified: false,
          verifiedCandles: [],
          errorReason: `OUT_OF_ORDER_OR_DUPLICATE_TIMESTAMP_AT_INDEX_${i}`,
        };
      }

      lastTimestamp = timestamp;
      verifiedCandles.push({
        timestamp,
        open,
        high,
        low,
        close,
        volume,
        tradeValue: Number(c.tradeValue || 0),
        isVerified: true,
      });
    }

    return { isVerified: true, verifiedCandles };
  }
}
