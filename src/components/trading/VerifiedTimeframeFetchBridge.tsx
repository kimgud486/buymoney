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
  timeframe?: string;
  sourceTimeframe?: string;
  intervalIntegrity?: string;
  candles?: RawCandle[];
  [key: string]: unknown;
};

type CacheEntry = {
  expiresAt: number;
  payload: RealtimeCandlePayload;
};

type LoadedFrame = {
  response: Response;
  payload: RealtimeCandlePayload;
  timeframe: string;
};

const BRIDGE_FLAG = "__AISTOCK_VERIFIED_TIMEFRAME_FETCH_BRIDGE__";
const SOURCE_CACHE_MS = 1200;
const MIN_SIGNAL_BARS = 56;
const MAX_ROUTE_COUNT = 240;

const DERIVE_RULES: Record<string, { source: string; sourceMinutes: number; targetMinutes: number; ratio: number }> = {
  "3m": { source: "1m", sourceMinutes: 1, targetMinutes: 3, ratio: 3 },
  "15m": { source: "5m", sourceMinutes: 5, targetMinutes: 15, ratio: 3 },
  "30m": { source: "15m", sourceMinutes: 15, targetMinutes: 30, ratio: 2 },
  "1h": { source: "30m", sourceMinutes: 30, targetMinutes: 60, ratio: 2 },
};

function toMillis(candle: RawCandle): number | null {
  const raw = candle.timestamp ?? candle.time;
  let value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(value)) value = Date.parse(String(raw || ""));
  if (!Number.isFinite(value) || value <= 0) return null;
  if (value < 10_000_000_000) value *= 1000;
  return value;
}

function normalizeFrame(value: string): string {
  const text = String(value || "").trim().toLowerCase();
  if (text === "60m" || text === "1hr" || text === "1hour") return "1h";
  return text;
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
    if (![open, high, low, close].every(Number.isFinite) || open <= 0 || high <= 0 || low <= 0 || close <= 0) continue;

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

  return aggregated;
}

function completedOnly(candles: RawCandle[], minutes: number): RawCandle[] {
  if (candles.length === 0) return candles;
  const bucketMs = minutes * 60_000;
  const currentBucket = Math.floor(Date.now() / bucketMs) * bucketMs;
  const lastTs = toMillis(candles[candles.length - 1]);
  if (lastTs === currentBucket) return candles.slice(0, -1);
  return candles;
}

function jsonResponse(payload: unknown, source: Response | null, sourceLabel: string, status = 200): Response {
  const headers = new Headers(source?.headers || undefined);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("x-aistock-timeframe-source", sourceLabel);
  return new Response(JSON.stringify(payload), {
    status: source?.status && source.status >= 200 && source.status < 600 ? source.status : status,
    statusText: source?.statusText || "OK",
    headers,
  });
}

function candleCount(payload: RealtimeCandlePayload | null | undefined): number {
  return Array.isArray(payload?.candles) ? payload!.candles!.length : 0;
}

/**
 * Timeframe integrity bridge.
 *
 * - 3m is always built from provider-backed 1m OHLCV because the legacy server
 *   route has no truthful native 3m mapping for every market.
 * - 15m / 30m / 1H keep native provider candles when enough bars arrive.
 * - If a slow frame is missing or too short for EMA50/pattern verification, it
 *   is rebuilt only from a smaller verified provider frame (5m -> 15m -> 30m -> 1H).
 * - No synthetic prices are generated. When neither native nor source evidence
 *   exists, the request fails closed with NO_DATA.
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
    const cache = new Map<string, CacheEntry>();

    const loadNative = async (
      templateUrl: URL,
      timeframe: string,
      count: number,
      init?: RequestInit,
    ): Promise<LoadedFrame> => {
      const symbol = String(templateUrl.searchParams.get("symbol") || "").toUpperCase();
      const normalized = normalizeFrame(timeframe);
      const safeCount = Math.min(MAX_ROUTE_COUNT, Math.max(15, Math.ceil(count)));
      const cacheKey = `${symbol}:${normalized}:${safeCount}`;
      const cached = cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return {
          response: jsonResponse(cached.payload, null, `cache-${normalized}`),
          payload: cached.payload,
          timeframe: normalized,
        };
      }

      const sourceUrl = new URL(templateUrl.toString());
      sourceUrl.searchParams.set("timeframe", normalized === "1h" ? "1H" : normalized);
      sourceUrl.searchParams.set("count", String(safeCount));

      const response = await originalFetch(sourceUrl.toString(), { ...init, cache: "no-store" });
      let payload: RealtimeCandlePayload = { candles: [] };
      try {
        payload = (await response.clone().json()) as RealtimeCandlePayload;
      } catch {
        payload = { dataStatus: "NO_DATA", candles: [] };
      }

      if (response.ok && candleCount(payload) > 0) {
        cache.set(cacheKey, { expiresAt: Date.now() + SOURCE_CACHE_MS, payload });
      }
      return { response, payload, timeframe: normalized };
    };

    const loadVerifiedFrame = async (
      templateUrl: URL,
      timeframe: string,
      requestedCount: number,
      init?: RequestInit,
      depth = 0,
    ): Promise<LoadedFrame> => {
      const normalized = normalizeFrame(timeframe);
      const rule = DERIVE_RULES[normalized];

      // 3m is intentionally not queried natively because the legacy server can
      // relabel another interval as 3m. Other frames get native provider priority.
      const native = normalized === "3m"
        ? null
        : await loadNative(templateUrl, normalized, requestedCount, init);

      if (native && candleCount(native.payload) >= MIN_SIGNAL_BARS) return native;
      if (!rule || depth > 4) {
        return native || loadNative(templateUrl, normalized, requestedCount, init);
      }

      const sourceCount = Math.min(
        MAX_ROUTE_COUNT,
        Math.max(MIN_SIGNAL_BARS * rule.ratio + 6, Math.ceil(requestedCount * rule.ratio) + 6),
      );
      const source = await loadVerifiedFrame(templateUrl, rule.source, sourceCount, init, depth + 1);
      const sourceCandles = Array.isArray(source.payload?.candles) ? source.payload.candles : [];
      const derived = completedOnly(
        aggregateMinutes(sourceCandles, rule.targetMinutes),
        rule.targetMinutes,
      ).slice(-Math.min(MAX_ROUTE_COUNT, Math.max(15, requestedCount)));

      // If derivation does not improve evidence, keep any real native bars rather
      // than hiding usable chart data. Scanner verification itself will still
      // fail closed when fewer than 56 bars are available.
      if (derived.length === 0 || (native && candleCount(native.payload) >= derived.length)) {
        if (native && candleCount(native.payload) > 0) return native;
        return {
          response: source.response,
          timeframe: normalized,
          payload: {
            ...source.payload,
            dataStatus: "NO_DATA",
            reason: `VERIFIED_${normalized.toUpperCase()}_SOURCE_UNAVAILABLE`,
            timeframe: normalized === "1h" ? "1H" : normalized,
            sourceTimeframe: rule.source,
            candles: [],
          },
        };
      }

      return {
        response: source.response,
        timeframe: normalized,
        payload: {
          ...source.payload,
          dataStatus: "VERIFIED_DERIVED",
          timeframe: normalized === "1h" ? "1H" : normalized,
          sourceTimeframe: rule.source === "1h" ? "1H" : rule.source,
          intervalIntegrity: `VERIFIED_${rule.source.toUpperCase()}_AGGREGATION`,
          candles: derived,
        },
      };
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
      const timeframe = normalizeFrame(String(url.searchParams.get("timeframe") || ""));
      const shouldVerify = timeframe === "3m" || timeframe === "15m" || timeframe === "30m" || timeframe === "1h";
      if (!isSameOrigin || !isCandleRoute || !shouldVerify) {
        return originalFetch(input, init);
      }

      try {
        const requestedCount = Math.min(
          MAX_ROUTE_COUNT,
          Math.max(15, Number(url.searchParams.get("count")) || 70),
        );
        const loaded = await loadVerifiedFrame(url, timeframe, requestedCount, init);
        const bars = candleCount(loaded.payload);
        const sourceLabel = loaded.payload.intervalIntegrity
          ? String(loaded.payload.intervalIntegrity).toLowerCase()
          : `native-${timeframe}`;

        if (!loaded.response.ok && bars === 0) return loaded.response;
        return jsonResponse(loaded.payload, loaded.response, sourceLabel);
      } catch (error) {
        console.warn(`[VerifiedTimeframeFetchBridge] ${timeframe} verification unavailable`, error);
        return jsonResponse({
          dataStatus: "NO_DATA",
          reason: `VERIFIED_${timeframe.toUpperCase()}_SOURCE_UNAVAILABLE`,
          timeframe: timeframe === "1h" ? "1H" : timeframe,
          candles: [],
        }, null, `no-data-${timeframe}`);
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
