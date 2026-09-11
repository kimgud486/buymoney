import type { LiveTick, FeedQuality } from "./types";
import { realtimeMarketFeedService } from "../services/realtimeMarketFeedService";
import { LiveDataIntegrityGate } from "./LiveDataIntegrityGate";

type TickListener = (tick: LiveTick) => void;

type RegisteredMarket = "KOSPI" | "KOSDAQ" | "UPBIT" | "US";

const normalizeSymbol = (symbol: string): string => String(symbol || "").trim().toUpperCase();

const determineMarket = (symbol: string): RegisteredMarket => {
  const normalized = normalizeSymbol(symbol);
  if (normalized.startsWith("KRW-")) return "UPBIT";
  if (["BTC", "ETH", "SOL", "XRP", "DOGE"].includes(normalized)) return "UPBIT";
  if (/^\d{6}$/.test(normalized)) return "KOSPI";
  return "US";
};

const normalizeFeedSource = (
  source: string | null | undefined,
): "KIS_REALTIME_WS" | "US_BROKER_WS" | "NAVER_POLLING" => {
  if (source === "KIS_REALTIME_WS") return "KIS_REALTIME_WS";
  if (source === "US_BROKER_WS") return "US_BROKER_WS";

  // The current LiveTick union predates Upbit/API_STOCKS source labels.
  // Keep those authentic but non-websocket feeds in the delayed bucket.
  return "NAVER_POLLING";
};

const isStrictRealtimeSource = (source: string | null | undefined): boolean =>
  source === "KIS_REALTIME_WS" || source === "US_BROKER_WS" || source === "UPBIT_WS" || source === "SERVER_STREAM";

export class RealTimeMarketFeedManager {
  private static instance: RealTimeMarketFeedManager;

  private listeners = new Map<string, Set<TickListener>>();
  private lastPrices = new Map<string, number>();
  private lastAccumulatedVolume = new Map<string, number>();
  private integrityGate = new LiveDataIntegrityGate();

  private constructor() {
    this.initFeedBridge();
  }

  public static getInstance(): RealTimeMarketFeedManager {
    if (!this.instance) {
      this.instance = new RealTimeMarketFeedManager();
    }

    return this.instance;
  }

  private initFeedBridge() {
    realtimeMarketFeedService.subscribe((quotesMap) => {
      quotesMap.forEach((quote, rawSymbol) => {
        const symbol = normalizeSymbol(rawSymbol);
        const symbolListeners = this.listeners.get(symbol);

        if (!symbolListeners?.size) return;
        if (quote.price == null || !Number.isFinite(quote.price) || quote.price <= 0) return;

        const now = Date.now();
        const tickTs = quote.providerTimestamp || quote.receivedAt || now;
        const originalSource = quote.source;
        const source = normalizeFeedSource(originalSource);
        const strictRealtime = isStrictRealtimeSource(originalSource);
        const quality: FeedQuality = strictRealtime ? "BROKER_REALTIME" : "POLLING_DELAYED";

        if (strictRealtime) {
          // Strict broker/exchange streams must pass the execution-grade integrity gate.
          const validation = this.integrityGate.validate(
            {
              symbol,
              price: quote.price,
              timestamp: tickTs,
              source: originalSource || source,
              receivedAt: now,
            },
            5000,
          );

          if (!validation.valid) {
            console.warn(`[LiveDataIntegrityGate] Rejected realtime tick for ${symbol}: ${validation.reason}`);
            return;
          }
        } else {
          // Verified polling/public API data is still useful for chart display and analysis.
          // Do not run it through the strict websocket-only gate, otherwise every NAVER,
          // UPBIT public ticker and API_STOCKS update is rejected as NON_REAL_DATA_SOURCE.
          // It remains explicitly POLLING_DELAYED so downstream execution gates stay locked.
          const receivedAt = quote.receivedAt || now;
          const ageMs = Math.max(0, now - receivedAt);
          if (quote.isVerified !== true || ageMs > 15_000) {
            return;
          }
        }

        const accumulatedVolume = quote.volume || 0;
        const previousAccumulatedVolume = this.lastAccumulatedVolume.get(symbol);
        const incrementalVolume =
          previousAccumulatedVolume === undefined
            ? 0
            : Math.max(0, accumulatedVolume - previousAccumulatedVolume);

        this.lastPrices.set(symbol, quote.price);

        if (accumulatedVolume > 0) {
          this.lastAccumulatedVolume.set(symbol, accumulatedVolume);
        }

        const tick: LiveTick = {
          symbol,
          timestamp: tickTs,
          exchangeTimestamp: tickTs,
          receivedTimestamp: now,
          price: quote.price,
          volume: incrementalVolume,
          source,
          quality,
          isRealtime: quality === "BROKER_REALTIME",
          isDelayed: quality === "POLLING_DELAYED",
        };

        symbolListeners.forEach((listener) => listener(tick));
      });
    });
  }

  public subscribe(symbol: string, listener: TickListener): () => void {
    const normalized = normalizeSymbol(symbol);
    if (!normalized) return () => {};

    if (!this.listeners.has(normalized)) {
      this.listeners.set(normalized, new Set());
    }

    this.listeners.get(normalized)!.add(listener);

    // Important: KRW-BTC style symbols were previously auto-detected as KOSPI,
    // which meant the Upbit ticker was never registered and charts stayed NO_DATA.
    realtimeMarketFeedService.registerSymbol(normalized, determineMarket(normalized));

    return () => {
      const listeners = this.listeners.get(normalized);
      if (!listeners) return;

      listeners.delete(listener);
      if (listeners.size === 0) {
        this.listeners.delete(normalized);
      }
    };
  }

  public emitCustomTick(tick: LiveTick) {
    const symbol = normalizeSymbol(tick.symbol);
    this.listeners.get(symbol)?.forEach((listener) => listener({ ...tick, symbol }));
  }
}

export const realTimeMarketFeedManager = RealTimeMarketFeedManager.getInstance();
