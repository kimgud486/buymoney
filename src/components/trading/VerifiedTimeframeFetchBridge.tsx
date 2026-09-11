import { useEffect } from "react";

type RawCandle = {
  time?: string | number;
  timestamp?: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  isUp?: boolean;
};

type RealtimeCandlePayload = {
  symbol?: string;
  name?: string;
  market?: string;
  currentPrice?: number;
  dataStatus?: string;
  candles?: RawCandle[];
  [key: string]: unknown;
};

type CacheEntry = {
  expiresAt: number;
  payload: RealtimeCandlePayload;
};

const BRIDGE_FLAG = "__AISTOCK_VERIFIED_TIMEFRAME_FETCH_BRIDGE__";
const SOURCE_CACHE_MS = 900;

function toMillis(candle: RawCandle): number | null {
  const raw = candle.timestamp ?? candle.time;
  let value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(value)) value = Date.parse(String(raw || ""));
  if (!Number.isFinite(value) || value <= 0) return null;
  if (value < 10_000_000_000) value *= 1000;
  return value;
}

function aggregateMinutes(candles: RawCandle[], minutes: number): RawCandle[] {
  const bucketMs = minutes * 60_000;
  const sorted = candles
    .map((candle) => ({ candle, timestamp: toMillis(candle) }))
    .filter((item): item is { candle: RawCandle; timestamp: number } => item.timestamp !== null)
    .sort((a, b) => a.timestamp - b.timestamp);

  const aggregated: RawCandle[] = [];
  let activeBucket = -1;

  for (const { candle, timestamp } of sorted) {
    const open = Number(candle.open);
    const high = Number(candle.high);
    const low = Number(candle.low);
    const close = Number(candle.close);
    const volume = Math.max(0, Number(candle.volume) || 0);
    if (![open, high, low, close].every(Number.isFinite) || close <= 0) continue;

    const bucket = Math.floor(timestamp / bucketMs) * bucketMs;
    const last = aggregated[aggregated.length - 1];

    if (!last || bucket !== activeBucket) {
      const date = new Date(bucket);
      aggregated.push({
        timestamp: bucket,
        time: date.toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Asia/Seoul",
        }),
        open,
        high,
        low,
        close,
        volume,
        isUp: close >= open,
      });
      activeBucket = bucket;
      continue;
    }

    last.high = Math.max(Number(last.high), high);
    last.low = Math.min(Number(last.low), low);
    last.close = close;
    last.volume = Math.max(0, Number(last.volume) || 0) + volume;
    last.isUp = Number(last.close) >= Number(last.open);
  }

  if (aggregated.length > 0) {
    const currentBucket = Math.floor(Date.now() / bucketMs) * bucketMs;
    const lastTs = Number(aggregated[aggregated.length - 1].timestamp) || 0;
    // Scanner signals use completed 3m bars. Keep historical/closed-market last bars,
    // but never certify the currently forming 3m bucket as a completed pattern.
    if (lastTs === currentBucket) aggregated.pop();
  }

  return aggregated;
}

function jsonResponse(payload: unknown, source: Response | null, status = 200): Response {
  const headers = new Headers(source?.headers || undefined);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("x-aistock-timeframe-source", "verified-1m-aggregation");
  return new Response(JSON.stringify(payload), {
    status: source?.status && source.status >= 200 && source.status < 600 ? source.status : status,
    statusText: source?.statusText || "OK",
    headers,
  });
}

/**
 * Corrects the legacy /realtime-candles 3m gap without fabricating market data.
 *
 * The backend has native 1m candles but legacy provider mappings do not expose a
 * truthful 3m interval for every market. This bridge therefore derives 3m bars
 * only from provider-backed 1m OHLCV. If verified 1m evidence is unavailable,
 * it returns NO_DATA instead of relabelling 5m/daily candles as 3m.
 */
export default function VerifiedTimeframeFetchBridge() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.fetch !== "function") return;

    const state = window as Window & typeof globalThis & {
      [BRIDGE_FLAG]?: { refCount: number; originalFetch: typeof window.fetch };
    };

    if (state[BRIDGE_FLAG]) {
      state[BRIDGE_FLAG]!.refCount += 1;
      return () => {
        const active = state[BRIDGE_FLAG];
        if (active) active.refCount = Math.max(0, active.refCount - 1);
      };
    }

    const originalFetch = window.fetch.bind(window);
    const oneMinuteCache = new Map<string, CacheEntry>();

    const loadOneMinute = async (url: URL, init?: RequestInit): Promise<{ response: Response; payload: RealtimeCandlePayload }> => {
      const symbol = String(url.searchParams.get("symbol") || "").toUpperCase();
      const requestedCount = Math.min(240, Math.max(45, (Number(url.searchParams.get("count")) || 70) * 3 + 6));
      const cacheKey = `${symbol}:${requestedCount}`;
      const cached = oneMinuteCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return { response: jsonResponse(cached.payload, null), payload: cached.payload };
      }

      const oneMinuteUrl = new URL(url.toString());
      oneMinuteUrl.searchParams.set("timeframe", "1m");
      oneMinuteUrl.searchParams.set("count", String(requestedCount));

      const response = await originalFetch(oneMinuteUrl.toString(), { ...init, cache: "no-store" });
      const payload = (await response.clone().json()) as RealtimeCandlePayload;
      if (response.ok && Array.isArray(payload?.candles) && payload.candles.length > 0) {
        oneMinuteCache.set(cacheKey, { expiresAt: Date.now() + SOURCE_CACHE_MS, payload });
      }
      return { response, payload };
    };

    const verifiedFetch: typeof window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      let url: URL;
      try {
        const raw = input instanceof Request ? input.url : String(input);
        url = new URL(raw, window.location.origin);
      } catch {
        return originalFetch(input, init);
      }

      const isSameOrigin = url.origin === window.location.origin;
      const isCandleRoute = url.pathname === "/api/market/realtime-candles";
      const timeframe = String(url.searchParams.get("timeframe") || "").toLowerCase();
      if (!isSameOrigin || !isCandleRoute || timeframe !== "3m") {
        return originalFetch(input, init);
      }

      try {
        const { response: oneMinuteResponse, payload } = await loadOneMinute(url, init);
        const sourceCandles = Array.isArray(payload?.candles) ? payload.candles : [];
        const requestedCount = Math.max(15, Number(url.searchParams.get("count")) || 70);
        const candles3m = aggregateMinutes(sourceCandles, 3).slice(-requestedCount);

        if (!oneMinuteResponse.ok || candles3m.length < 15) {
          return jsonResponse({
            ...payload,
            dataStatus: "NO_DATA",
            reason: "VERIFIED_3M_SOURCE_UNAVAILABLE",
            timeframe: "3m",
            sourceTimeframe: "1m",
            candles: [],
          }, oneMinuteResponse);
        }

        return jsonResponse({
          ...payload,
          dataStatus: payload.dataStatus || "REALTIME_DERIVED",
          timeframe: "3m",
          sourceTimeframe: "1m",
          intervalIntegrity: "VERIFIED_1M_AGGREGATION",
          candles: candles3m,
        }, oneMinuteResponse);
      } catch (error) {
        console.warn("[VerifiedTimeframeFetchBridge] 3m aggregation unavailable", error);
        return jsonResponse({
          dataStatus: "NO_DATA",
          reason: "VERIFIED_3M_SOURCE_UNAVAILABLE",
          timeframe: "3m",
          sourceTimeframe: "1m",
          candles: [],
        }, null);
      }
    };

    state[BRIDGE_FLAG] = { refCount: 1, originalFetch };
    window.fetch = verifiedFetch;

    return () => {
      const active = state[BRIDGE_FLAG];
      if (!active) return;
      active.refCount -= 1;
      if (active.refCount <= 0 && window.fetch === verifiedFetch) {
        window.fetch = active.originalFetch;
        delete state[BRIDGE_FLAG];
      }
    };
  }, []);

  return null;
}
