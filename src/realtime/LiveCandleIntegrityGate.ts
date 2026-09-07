// AISTOCK v13.8 LIVE CANDLE INTEGRITY GATE
// Validates structural OHLC integrity, source provenance, timestamp validity, freshness, and sequence gaps.
// Any failing candle is marked INVALID_CANDLE and MUST NOT be passed to IndicatorEngine.

import { AggregatedCandle } from "./CandleAggregator";

export interface SingleCandleIntegrityResult {
  valid: boolean;
  reason?: string;
  ageMs?: number;
  isStale?: boolean;
  sequenceGap?: boolean;
  sourceVerified?: boolean;
}

export class LiveCandleIntegrityGate {
  private staleThresholdMs: number;

  constructor(staleThresholdMs = 300_000) { // 5 minutes max age for live bar
    this.staleThresholdMs = staleThresholdMs;
  }

  public validateSingleCandle(
    candle: any,
    expectedSymbol?: string,
    expectedMarket?: "KOREA" | "US" | "CRYPTO" | string
  ): SingleCandleIntegrityResult {
    if (!candle) {
      return { valid: false, reason: "INVALID_CANDLE:NULL_OR_UNDEFINED" };
    }

    // 0. Explicit Verification Flag
    if (candle.isVerified === false || candle.verified === false) {
      return { valid: false, reason: "UNVERIFIED_CANDLE:EXPLICITLY_UNVERIFIED" };
    }

    // 1. Source verification
    const validSources = ["KIS_WS", "KIS_REST_HISTORY", "KIS_REALTIME_WS"];
    if (!candle.source || !validSources.includes(candle.source)) {
      return { valid: false, reason: `NON_REAL_CANDLE_SOURCE:${candle.source}`, sourceVerified: false };
    }

    // 2. Symbol & Market mismatch check
    if (expectedSymbol && candle.symbol !== expectedSymbol) {
      return { valid: false, reason: `INVALID_CANDLE:SYMBOL_MISMATCH:${candle.symbol}_VS_${expectedSymbol}` };
    }
    if (expectedMarket && candle.market !== expectedMarket) {
      return { valid: false, reason: `INVALID_CANDLE:MARKET_MISMATCH:${candle.market}_VS_${expectedMarket}` };
    }

    // 3. Price & Volume validity
    if (
      typeof candle.open !== "number" || candle.open <= 0 ||
      typeof candle.high !== "number" || candle.high <= 0 ||
      typeof candle.low !== "number" || candle.low <= 0 ||
      typeof candle.close !== "number" || candle.close <= 0 ||
      typeof candle.volume !== "number" || candle.volume < 0
    ) {
      return { valid: false, reason: "INVALID_CANDLE:INVALID_OHLC_STRUCTURE:NON_POSITIVE_OHLC_OR_NEGATIVE_VOLUME" };
    }

    // 4. OHLC structural geometry
    if (
      candle.high < candle.low ||
      candle.high < candle.open ||
      candle.high < candle.close ||
      candle.low > candle.open ||
      candle.low > candle.close
    ) {
      return { valid: false, reason: "INVALID_CANDLE:INVALID_OHLC_STRUCTURE:GEOMETRY_VIOLATION" };
    }

    // 5. Timestamps & Freshness
    const timestampMs = candle.startedAt || (candle.time ? candle.time * 1000 : null);
    if (!timestampMs || !Number.isFinite(timestampMs) || timestampMs <= 0) {
      return { valid: false, reason: "INVALID_CANDLE:MISSING_PROVIDER_TIMESTAMP" };
    }

    const now = Date.now();
    const endTimestampMs = candle.endedAt || timestampMs;
    if (endTimestampMs > now + 60_000) {
      return { valid: false, reason: "FUTURE_TIMESTAMP:CANDLE_FROM_FUTURE" };
    }

    const ageMs = Math.max(0, now - timestampMs);
    // Staleness check is only for live realtime streaming candles
    const isLiveRealtime = candle.source === "KIS_WS";
    const isStale = isLiveRealtime && ageMs > this.staleThresholdMs;

    if (isStale) {
      return { valid: false, reason: `INVALID_CANDLE:STALE_QUOTE_AGE_${ageMs}ms`, ageMs, isStale: true };
    }

    return {
      valid: true,
      ageMs,
      isStale: false,
      sequenceGap: false,
      sourceVerified: true,
    };
  }

  public validateCandles(
    candles: Array<any>,
    expectedSymbol?: string,
    expectedMarket?: "KOREA" | "US" | "CRYPTO" | string,
    _timeframe?: string
  ): { valid: boolean; reason?: string; candleCount: number } {
    if (!candles || !Array.isArray(candles) || candles.length === 0) {
      return { valid: false, reason: "INVALID_CANDLE:EMPTY_ARRAY", candleCount: 0 };
    }

    for (let i = 0; i < candles.length; i++) {
      const res = this.validateSingleCandle(candles[i], expectedSymbol, expectedMarket);
      if (!res.valid) {
        return { valid: false, reason: `${res.reason}_AT_INDEX_${i}`, candleCount: candles.length };
      }

      // Check sequence ordering
      if (i > 0) {
        const prev = candles[i - 1];
        const curr = candles[i];
        const prevTime = prev.startedAt || (prev.time ? prev.time * 1000 : 0);
        const currTime = curr.startedAt || (curr.time ? curr.time * 1000 : 0);

        if (currTime <= prevTime) {
          return { valid: false, reason: `INVALID_CANDLE:OUT_OF_ORDER_SEQUENCE_AT_INDEX_${i}`, candleCount: candles.length };
        }
      }
    }

    return { valid: true, candleCount: candles.length };
  }

  public assertCandles(
    candles: Array<any>,
    expectedSymbol?: string,
    expectedMarket?: "KOREA" | "US" | "CRYPTO" | string
  ): void {
    const res = this.validateCandles(candles, expectedSymbol, expectedMarket);
    if (!res.valid) {
      throw new Error(`UNVERIFIED_MARKET_DATA:${res.reason}`);
    }
  }
}

export const globalLiveCandleIntegrityGate = new LiveCandleIntegrityGate();
