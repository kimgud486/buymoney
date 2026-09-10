export type RealtimeSubscriptionMarketV20 = "KR" | "US" | "CRYPTO";

export interface RealtimeSubscriptionRequestV20 {
  symbol: string;
  market: RealtimeSubscriptionMarketV20;
}

export interface RealtimeSubscriptionSnapshotV20 extends RealtimeSubscriptionRequestV20 {
  providerSymbol: string;
  subscribedAt: number;
}

function normalizeSymbol(symbol: string): string {
  return String(symbol || "").trim().toUpperCase();
}

function providerSymbol(symbol: string, market: RealtimeSubscriptionMarketV20): string {
  const clean = normalizeSymbol(symbol);
  if (market === "CRYPTO") return clean.startsWith("KRW-") ? clean : `KRW-${clean}`;
  return clean;
}

/**
 * Process-local registry of requested realtime subscriptions.
 * It stores only explicit subscription intent and never invents quote/candle data.
 */
export class RealtimeSubscriptionRegistryV20 {
  private readonly subscriptions = new Map<string, RealtimeSubscriptionSnapshotV20>();

  public register(input: RealtimeSubscriptionRequestV20): RealtimeSubscriptionSnapshotV20 | null {
    const symbol = normalizeSymbol(input.symbol);
    if (!symbol) return null;
    const key = `${input.market}:${symbol}`;
    const existing = this.subscriptions.get(key);
    if (existing) return existing;

    const snapshot: RealtimeSubscriptionSnapshotV20 = {
      symbol,
      market: input.market,
      providerSymbol: providerSymbol(symbol, input.market),
      subscribedAt: Date.now()
    };
    this.subscriptions.set(key, snapshot);
    return snapshot;
  }

  public list(): RealtimeSubscriptionSnapshotV20[] {
    return Array.from(this.subscriptions.values());
  }
}

export const realtimeSubscriptionRegistryV20 = new RealtimeSubscriptionRegistryV20();
