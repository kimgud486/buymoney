import type { LiveTick, FeedQuality } from "./types";
import { realtimeMarketFeedService } from "../services/realtimeMarketFeedService";
import { LiveDataIntegrityGate } from "./LiveDataIntegrityGate";

type TickListener = (tick: LiveTick) => void;

function parseKoreanVolume(value?: string): number {
  if (!value) return 0;

  const text = value.replace(/,/g, "").trim();

  const eok = text.match(/([\d.]+)\s*억/);
  if (eok) {
    return Math.round(Number(eok[1]) * 100_000_000);
  }

  const man = text.match(/([\d.]+)\s*만/);
  if (man) {
    return Math.round(Number(man[1]) * 10_000);
  }

  const raw = text.match(/[\d.]+/);
  return raw ? Math.round(Number(raw[0])) : 0;
}

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
      quotesMap.forEach((quote, symbol) => {
        const symbolListeners = this.listeners.get(symbol);

        if (!symbolListeners?.size) return;

        if (quote.price == null || quote.price <= 0) return;

        const now = Date.now();
        const tickTs = quote.providerTimestamp || quote.receivedAt || now;

        const source = (quote.source || "KIS_REALTIME_WS") as "KIS_REALTIME_WS" | "US_BROKER_WS" | "NAVER_POLLING";
        const quality: FeedQuality = source === "KIS_REALTIME_WS" || source === "US_BROKER_WS" ? "BROKER_REALTIME" : "POLLING_DELAYED";

        // Pass through LiveDataIntegrityGate
        const validation = this.integrityGate.validate(
          {
            symbol,
            price: quote.price,
            timestamp: tickTs,
            source,
            receivedAt: now
          },
          5000
        );

        if (!validation.valid) {
          console.warn(`[LiveDataIntegrityGate] Rejected tick for ${symbol}: ${validation.reason}`);
          return;
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
          isDelayed: quality === "POLLING_DELAYED"
        };

        symbolListeners.forEach((listener) => listener(tick));
      });
    });
  }

  public subscribe(symbol: string, listener: TickListener): () => void {
    if (!this.listeners.has(symbol)) {
      this.listeners.set(symbol, new Set());
    }

    this.listeners.get(symbol)!.add(listener);

    realtimeMarketFeedService.registerSymbol(symbol);

    return () => {
      const listeners = this.listeners.get(symbol);

      if (!listeners) return;

      listeners.delete(listener);

      if (listeners.size === 0) {
        this.listeners.delete(symbol);
      }
    };
  }

  public emitCustomTick(tick: LiveTick) {
    this.listeners.get(tick.symbol)?.forEach((listener) => listener(tick));
  }
}

export const realTimeMarketFeedManager = RealTimeMarketFeedManager.getInstance();

