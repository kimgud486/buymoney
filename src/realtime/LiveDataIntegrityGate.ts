// AISTOCK v13.5 Live Data Integrity Gate
// Enforces strict data validation for all incoming ticks in LIVE trading mode.

export type LiveFeedSource = "KIS_REALTIME_WS" | "US_BROKER_WS" | "UPBIT_WS" | "SERVER_STREAM";

export const ALLOWED_LIVE_FEED_SOURCES: Set<string> = new Set([
  "KIS_REALTIME_WS",
  "US_BROKER_WS",
  "UPBIT_WS",
  "SERVER_STREAM"
]);

export interface LiveDataIntegrityInput {
  symbol: string;
  price: number;
  timestamp: number; // Exchange timestamp in milliseconds
  source: string;
  receivedAt: number; // Client/Server received timestamp in milliseconds
  volume?: number;
}

export interface LiveDataIntegrityResult {
  valid: boolean;
  reason?: string;
  ageMs: number;
  exchangeTimestamp?: number;
  receivedTimestamp?: number;
  latencyMs?: number | null;
}

export class LiveDataIntegrityGate {
  private lastSeenTimestamps: Map<string, number> = new Map();

  /**
   * Validate incoming market feed record against strict live integrity rules.
   */
  public validate(input: LiveDataIntegrityInput, maxAgeMs = 5000): LiveDataIntegrityResult {
    const { symbol, price, timestamp, source, receivedAt, volume } = input;

    // 1. Missing or empty symbol
    if (!symbol || typeof symbol !== "string" || symbol.trim().length === 0) {
      return { valid: false, reason: "MISSING_SYMBOL", ageMs: 0 };
    }

    // 2. Price validity check (must be finite positive number)
    if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
      return { valid: false, reason: "INVALID_PRICE", ageMs: 0 };
    }

    // 3. Source check (must be from known live feed sources, not mock/synthetic)
    if (!source || !ALLOWED_LIVE_FEED_SOURCES.has(source)) {
      return { valid: false, reason: "NON_REAL_DATA_SOURCE", ageMs: 0 };
    }

    // 4. Timestamp validity check
    if (typeof timestamp !== "number" || !Number.isFinite(timestamp) || timestamp <= 0) {
      return { valid: false, reason: "INVALID_TIMESTAMP", ageMs: 0 };
    }

    if (typeof receivedAt !== "number" || !Number.isFinite(receivedAt) || receivedAt <= 0) {
      return { valid: false, reason: "INVALID_RECEIVED_TIMESTAMP", ageMs: 0 };
    }

    // 5. Future timestamp guard (exchange timestamp cannot be far ahead in future, allow 5s clock skew)
    if (timestamp > receivedAt + 5000) {
      return {
        valid: false,
        reason: "FUTURE_TIMESTAMP",
        ageMs: 0,
        exchangeTimestamp: timestamp,
        receivedTimestamp: receivedAt,
        latencyMs: receivedAt - timestamp
      };
    }

    // 6. Stale data check (ageMs = receivedAt - timestamp)
    const ageMs = Math.max(0, receivedAt - timestamp);
    const latencyMs = receivedAt - timestamp;

    if (ageMs > maxAgeMs) {
      return {
        valid: false,
        reason: `STALE_MARKET_DATA: Data age ${ageMs}ms exceeds max allowed ${maxAgeMs}ms`,
        ageMs,
        exchangeTimestamp: timestamp,
        receivedTimestamp: receivedAt,
        latencyMs
      };
    }

    // 7. Sequence & duplicate/out-of-order check per symbol
    const lastSeen = this.lastSeenTimestamps.get(symbol);
    if (lastSeen !== undefined && timestamp <= lastSeen) {
      return {
        valid: false,
        reason: "DUPLICATE_OR_OUT_OF_ORDER_TICK",
        ageMs,
        exchangeTimestamp: timestamp,
        receivedTimestamp: receivedAt,
        latencyMs
      };
    }

    // 8. Volume check if provided
    if (volume !== undefined && (typeof volume !== "number" || !Number.isFinite(volume) || volume < 0)) {
      return { valid: false, reason: "INVALID_VOLUME", ageMs, exchangeTimestamp: timestamp, receivedTimestamp: receivedAt, latencyMs };
    }

    // Record last seen timestamp for this symbol
    this.lastSeenTimestamps.set(symbol, timestamp);

    return {
      valid: true,
      ageMs,
      exchangeTimestamp: timestamp,
      receivedTimestamp: receivedAt,
      latencyMs
    };
  }

  /**
   * Reset timestamp tracking sequence (e.g., on market open or reconnect)
   */
  public resetSequence(symbol?: string): void {
    if (symbol) {
      this.lastSeenTimestamps.delete(symbol);
    } else {
      this.lastSeenTimestamps.clear();
    }
  }
}

// Global instance for convenience
export const globalLiveDataIntegrityGate = new LiveDataIntegrityGate();

export function validateLiveMarketData(
  input: LiveDataIntegrityInput,
  maxAgeMs = 5000
): LiveDataIntegrityResult {
  return globalLiveDataIntegrityGate.validate(input, maxAgeMs);
}
