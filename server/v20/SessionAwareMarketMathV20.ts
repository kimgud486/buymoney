// ----------------------------------------------------------------------
// BUYMONEY SESSION-AWARE MARKET MATH V20
// Prevents prior-session candles from contaminating intraday VWAP/open data.
// KOREA uses Asia/Seoul day, US uses America/New_York day,
// UPBIT uses UTC day (Upbit daily-candle boundary is 00:00 UTC / 09:00 KST).
// ----------------------------------------------------------------------

export type SessionMarketV20 = "KOREA" | "US" | "UPBIT";

export interface SessionCandleV20 {
  timestamp: number | string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const MARKET_TIMEZONE: Record<SessionMarketV20, string> = {
  KOREA: "Asia/Seoul",
  US: "America/New_York",
  UPBIT: "UTC",
};

function timestampToMillis(value: number | string): number | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    // Support both Unix seconds and Unix milliseconds.
    return Math.abs(value) < 100_000_000_000 ? value * 1000 : value;
  }

  const text = String(value || "").trim();
  if (!text) return null;
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? parsed : null;
}

export function sessionKeyV20(
  timestamp: number | string,
  market: SessionMarketV20,
): string | null {
  const ms = timestampToMillis(timestamp);
  if (ms === null) return null;

  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: MARKET_TIMEZONE[market],
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(ms));
    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;
    return year && month && day ? `${year}-${month}-${day}` : null;
  } catch {
    return null;
  }
}

export function latestSessionCandlesV20<T extends SessionCandleV20>(
  candles: T[],
  market: SessionMarketV20,
): T[] {
  if (!Array.isArray(candles) || candles.length === 0) return [];

  const latestKey = sessionKeyV20(candles[candles.length - 1].timestamp, market);
  // If timestamps are not parseable, preserve the previous behavior rather than
  // fabricating a session boundary.
  if (!latestKey) return candles.slice();

  let start = candles.length - 1;
  while (start > 0) {
    const previousKey = sessionKeyV20(candles[start - 1].timestamp, market);
    if (previousKey !== latestKey) break;
    start -= 1;
  }
  return candles.slice(start);
}

export function sessionVwapV20(
  candles: SessionCandleV20[],
  market: SessionMarketV20,
): number | undefined {
  const session = latestSessionCandlesV20(candles, market);
  let priceVolume = 0;
  let volume = 0;

  for (const candle of session) {
    const v = Number(candle.volume);
    const typical = (Number(candle.high) + Number(candle.low) + Number(candle.close)) / 3;
    if (!Number.isFinite(v) || v <= 0 || !Number.isFinite(typical)) continue;
    priceVolume += typical * v;
    volume += v;
  }

  return volume > 0 ? priceVolume / volume : undefined;
}
