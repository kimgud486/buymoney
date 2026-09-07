// ----------------------------------------------------------------------
// REAL-TIME STATE SYNCHRONIZATION SERVICE FOR KIS / UPBIT APIS
// ----------------------------------------------------------------------

import { CRYPTO_MAP } from "../lib/stockDictionary";

export type BrokerageSource = "KIS" | "UPBIT";

export interface StockSyncEvent {
  symbol: string;
  name: string;
  source: BrokerageSource;
  market: "KOREA" | "US" | "BTC";
  price: number;
  changePercent: number;
  volume?: string;
  rvol?: number;
  theme?: string;
  autoAddToWatchlist?: boolean;
  timestamp?: string;
}

type SyncCallback = (event: StockSyncEvent) => void;

class StockSyncService {
  private subscribers: Set<SyncCallback> = new Set();
  private lastEvent: StockSyncEvent | null = null;

  /**
   * Subscribe to real-time stock selection/search events.
   * Returns an unsubscribe function.
   */
  public subscribe(callback: SyncCallback): () => void {
    this.subscribers.add(callback);
    // If there is a last event, immediately inform subscriber
    if (this.lastEvent) {
      try {
        callback(this.lastEvent);
      } catch (e) {
        console.warn("StockSyncService subscriber error:", e);
      }
    }
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Dispatch a stock search or selection event from Korean/Upbit/Toss APIs
   * to instantly update global watchlist and focused analysis views.
   */
  public dispatch(event: StockSyncEvent): void {
    const enrichedEvent: StockSyncEvent = {
      ...event,
      timestamp: event.timestamp || new Date().toISOString()
    };
    this.lastEvent = enrichedEvent;

    // Notify internal subscribers
    this.subscribers.forEach((cb) => {
      try {
        cb(enrichedEvent);
      } catch (err) {
        console.error("Error in StockSyncService listener:", err);
      }
    });

    // Also dispatch custom DOM window event for global decoupling
    if (typeof window !== "undefined") {
      const windowEvent = new CustomEvent<StockSyncEvent>("stock-sync-event", {
        detail: enrichedEvent
      });
      window.dispatchEvent(windowEvent);
    }
  }

  /**
   * Alias for dispatch with partial parameter autofill
   */
  public emit(event: Partial<StockSyncEvent> & { symbol: string; name?: string; price?: number }): void {
    const sym = event.symbol.toUpperCase();
    const cleanSym = sym.replace("KRW-", "");
    const isKr = /^\d{6}$/.test(sym);
    const isCrypto = event.market === "BTC" || event.source === "UPBIT" || sym.startsWith("KRW-") || Boolean(CRYPTO_MAP[cleanSym]) || Boolean(CRYPTO_MAP[sym]);
    const mkt = event.market || (isKr ? "KOREA" : isCrypto ? "BTC" : "US");
    const src = event.source || (isKr ? "KIS" : isCrypto ? "UPBIT" : "KIS");
    
    this.dispatch({
      symbol: sym,
      name: event.name || sym,
      source: src,
      market: mkt,
      price: event.price || 0,
      changePercent: event.changePercent || 0,
      volume: event.volume,
      rvol: event.rvol,
      theme: event.theme,
      autoAddToWatchlist: event.autoAddToWatchlist,
      timestamp: event.timestamp || new Date().toISOString()
    });
  }

  /**
   * Get the most recently focused stock event.
   */
  public getLastEvent(): StockSyncEvent | null {
    return this.lastEvent;
  }
}

export const stockSyncService = new StockSyncService();
