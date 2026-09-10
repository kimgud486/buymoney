import { serverRealtimeMarketHubV20 } from "./ServerRealtimeMarketHubV20";

export interface RealtimeTruthTelemetryV20 {
  symbol: string;
  source: string | null;
  dataGrade: string | null;
  lastTickAt: number | null;
  latencyMs: number | null;
  candleCount: number;
  latestCandleAt: number | null;
  fresh: boolean;
}

function candleTimestamp(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Read-only truth telemetry for UI/audit surfaces.
 * It never creates quotes, candles or synthetic freshness values.
 */
export function buildRealtimeTruthTelemetryV20(symbol: string): RealtimeTruthTelemetryV20 {
  const normalized = String(symbol || "").trim().toUpperCase();
  const quote = normalized ? serverRealtimeMarketHubV20.getQuote(normalized) : null;
  const candles = normalized ? serverRealtimeMarketHubV20.getCandles(normalized) : [];
  const lastTickAt = quote?.updatedAt ?? null;
  const latencyMs = lastTickAt == null ? null : Math.max(0, Date.now() - lastTickAt);
  const latest = candles.length > 0 ? candles[candles.length - 1] : null;

  return {
    symbol: normalized,
    source: quote?.source ?? null,
    dataGrade: quote?.grade ?? null,
    lastTickAt,
    latencyMs,
    candleCount: candles.length,
    latestCandleAt: latest ? candleTimestamp(latest.timestamp) : null,
    fresh: Boolean(quote && quote.grade !== "DISPLAY_ONLY" && latencyMs != null && latencyMs <= 15_000)
  };
}
