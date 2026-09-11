import type { FeedQuality, FeedSource, LiveTick } from "./types";
import { realtimeMarketFeedService } from "../services/realtimeMarketFeedService";
import { LiveDataIntegrityGate } from "./LiveDataIntegrityGate";

type TickListener = (tick: LiveTick) => void;
type RegisteredMarket = "KOSPI" | "KOSDAQ" | "UPBIT" | "US";

const normalizeSymbol = (symbol: string): string => String(symbol || "").trim().toUpperCase();

const determineMarket = (symbol: string): RegisteredMarket => {
  const normalized = normalizeSymbol(symbol);
  if (normalized.startsWith("KRW-")) return "UPBIT";
  if (["BTC", "ETH", "SOL", "XRP", "DOGE", "ADA", "AVAX", "LINK", "DOT", "KAT"].includes(normalized)) return "UPBIT";
  if (/^\d{6}$/.test(normalized)) return "KOSPI";
  return "US";
};

const normalizeFeedSource = (source: string | null | undefined): FeedSource => {
  switch (source) {
    case "KIS_REALTIME_WS":
    case "US_BROKER_WS":
    case "UPBIT_WS":
    case "SERVER_STREAM":
    case "NAVER_POLLING":
    case "UPBIT_PUBLIC_TICKER":
    case "API_STOCKS":
      return source;
    case "NAVER_BATCH_POLLING":
      return "NAVER_POLLING";
    default:
      return "SERVER_STREAM";
  }
};

const qualityForSource = (source: FeedSource): FeedQuality => {
  if (source === "KIS_REALTIME_WS" || source === "US_BROKER_WS") return "BROKER_REALTIME";
  if (source === "UPBIT_WS") return "EXCHANGE_REALTIME";
  return "POLLING_DELAYED";
};

export class RealTimeMarketFeedManager {
  private static instance: RealTimeMarketFeedManager;
  private listeners = new Map<string, Set<TickListener>>();
  private lastAccumulatedVolume = new Map<string, number>();
  private integrityGate = new LiveDataIntegrityGate();

  private constructor() {
    this.initFeedBridge();
  }

  public static getInstance(): RealTimeMarketFeedManager {
    if (!this.instance) this.instance = new RealTimeMarketFeedManager();
    return this.instance;
  }

  private initFeedBridge() {
    realtimeMarketFeedService.subscribe((quotesMap) => {
      quotesMap.forEach((quote, rawMapSymbol) => {
        const mapSymbol = normalizeSymbol(rawMapSymbol);
        const quoteSymbol = normalizeSymbol(quote.symbol);
        const keys = new Set<string>([mapSymbol, quoteSymbol]);
        if (quote.market === "UPBIT") keys.add(`KRW-${quoteSymbol}`);

        const listenerSets = Array.from(keys)
          .map((key) => this.listeners.get(key))
          .filter((set): set is Set<TickListener> => Boolean(set?.size));
        if (listenerSets.length === 0) return;
        if (quote.price == null || !Number.isFinite(quote.price) || quote.price <= 0) return;

        const now = Date.now();
        const source = normalizeFeedSource(quote.source);
        const quality = qualityForSource(source);
        const providerTimestamp = quote.providerTimestamp || quote.receivedAt || now;
        const receivedAt = quote.receivedAt || now;

        if (quality === "BROKER_REALTIME" || quality === "EXCHANGE_REALTIME") {
          const validation = this.integrityGate.validate(
            {
              symbol: quoteSymbol,
              price: quote.price,
              timestamp: providerTimestamp,
              source,
              receivedAt,
              volume: quote.volume ?? undefined
            },
            5000
          );
          if (!validation.valid) {
            console.warn(`[LiveDataIntegrityGate] Rejected realtime tick for ${quoteSymbol}: ${validation.reason}`);
            return;
          }
        } else {
          const ageMs = Math.max(0, now - receivedAt);
          if (quote.isVerified !== true || ageMs > 15_000) return;
        }

        const volumeKey = quote.market === "UPBIT" ? `KRW-${quoteSymbol}` : quoteSymbol;
        const accumulatedVolume = quote.volume || 0;
        const previousAccumulatedVolume = this.lastAccumulatedVolume.get(volumeKey);
        const incrementalVolume = previousAccumulatedVolume === undefined
          ? 0
          : Math.max(0, accumulatedVolume - previousAccumulatedVolume);
        if (accumulatedVolume > 0) this.lastAccumulatedVolume.set(volumeKey, accumulatedVolume);

        const tickSymbol = quote.market === "UPBIT" && mapSymbol.startsWith("KRW-") ? mapSymbol : quoteSymbol;
        const tick: LiveTick = {
          symbol: tickSymbol,
          market: quote.market === "UPBIT" ? "UPBIT" : quote.market === "US" ? "US" : "KOREA",
          timestamp: providerTimestamp,
          exchangeTimestamp: providerTimestamp,
          providerTimestamp,
          receivedTimestamp: receivedAt,
          receivedAt,
          price: quote.price,
          volume: incrementalVolume,
          accumulatedVolume,
          source,
          quality,
          feedQuality: quality,
          isRealtime: quality === "BROKER_REALTIME" || quality === "EXCHANGE_REALTIME",
          isDelayed: quality === "POLLING_DELAYED"
        };

        const delivered = new Set<TickListener>();
        listenerSets.forEach((set) => set.forEach((listener) => {
          if (delivered.has(listener)) return;
          delivered.add(listener);
          listener(tick);
        }));
      });
    });
  }

  public subscribe(symbol: string, listener: TickListener): () => void {
    const normalized = normalizeSymbol(symbol);
    if (!normalized) return () => {};
    if (!this.listeners.has(normalized)) this.listeners.set(normalized, new Set());
    this.listeners.get(normalized)!.add(listener);

    realtimeMarketFeedService.registerSymbol(normalized, determineMarket(normalized));

    return () => {
      const listeners = this.listeners.get(normalized);
      if (!listeners) return;
      listeners.delete(listener);
      if (listeners.size === 0) this.listeners.delete(normalized);
    };
  }

  public emitCustomTick(tick: LiveTick) {
    const symbol = normalizeSymbol(tick.symbol);
    this.listeners.get(symbol)?.forEach((listener) => listener({ ...tick, symbol }));
  }
}

export const realTimeMarketFeedManager = RealTimeMarketFeedManager.getInstance();
