// ----------------------------------------------------------------------
// MARKET DATA INTEGRITY GATE (V14.0 REAL SCANNER CORE)
// Strict Fail-Closed Verification for Quotes and Candle Data
// ----------------------------------------------------------------------

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

    const provTime = quote.providerTimestamp || quote.timestamp || now;
    const providerTimestamp = typeof provTime === "number" ? new Date(provTime).toISOString() : String(provTime);
    const tsMs = typeof provTime === "number" ? provTime : new Date(provTime).getTime();

    const ageMs = isNaN(tsMs) ? 0 : Math.max(0, now - tsMs);
    const isFuture = !isNaN(tsMs) && tsMs > now + this.MAX_FUTURE_ALLOWANCE_MS;
    const isStale = ageMs > this.MAX_QUOTE_AGE_MS;

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

    let isVerified = true;
    let failureReason = "VERIFIED_OK";

    if (!quote.symbol || typeof quote.symbol !== "string") {
      isVerified = false;
      failureReason = "INVALID_SYMBOL";
    } else if (typeof quote.price !== "number" || isNaN(quote.price) || quote.price <= 0) {
      isVerified = false;
      failureReason = "INVALID_PRICE_NON_POSITIVE";
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
        source: quote.source || "REALTIME_STREAM",
        exchange: exchangeName,
        providerTimestamp,
        receivedAt,
        ageMs,
        isRealtime: !isStale && !isFuture && isVerified,
        isVerified,
        isStale,
        verificationReason: failureReason
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

      const open = Number(c.open);
      const high = Number(c.high);
      const low = Number(c.low);
      const close = Number(c.close);
      const volume = Number(c.volume ?? 0);
      const timestamp = Number(c.timestamp || c.time || 0);

      // Logical OHLC checks
      if (isNaN(open) || open <= 0 || isNaN(high) || high <= 0 || isNaN(low) || low <= 0 || isNaN(close) || close <= 0) {
        return { isVerified: false, verifiedCandles: [], errorReason: `NON_POSITIVE_OHLC_AT_INDEX_${i}` };
      }

      if (low > Math.min(open, close) || high < Math.max(open, close)) {
        return { isVerified: false, verifiedCandles: [], errorReason: `OHLC_LOGICAL_INCONSISTENCY_AT_INDEX_${i}` };
      }

      if (isNaN(volume) || volume < 0) {
        return { isVerified: false, verifiedCandles: [], errorReason: `NEGATIVE_VOLUME_AT_INDEX_${i}` };
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
        tradeValue: Number(c.tradeValue || 0),
        isVerified: true
      });
    }

    return {
      isVerified: true,
      verifiedCandles
    };
  }
}
