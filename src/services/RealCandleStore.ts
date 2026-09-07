// ----------------------------------------------------------------------
// REAL CANDLE STORE V2 (AISTOCK V16.1 EXECUTION GRADE SNAPSHOT STORE)
// Centralized Store for Verified Real OHLCV Candle Snapshots & Freshness Gates
// ----------------------------------------------------------------------

import { Candle } from "./StructureBrain";
import { MarketDataIntegrityGate } from "./MarketDataIntegrityGate";

export type CandleTrust =
  | "EXECUTION_GRADE"
  | "ANALYSIS_ONLY"
  | "DISPLAY_ONLY"
  | "UNVERIFIED";

export interface CandleSnapshot {
  symbol: string;
  timeframe: string;
  candles: Candle[];
  provider: string | null;
  source: string | null;
  providerTimestamp: number | null;
  receivedAt: number;
  ageMs: number | null;
  verified: boolean;
  stale: boolean;
  trust: CandleTrust;
}

class RealCandleStoreService {
  private candleCache: Map<string, CandleSnapshot> = new Map();
  private fetchPromises: Map<string, Promise<Candle[]>> = new Map();

  public async fetchRealCandles(
    symbol: string,
    timeframe: string = "15m",
    count: number = 60
  ): Promise<Candle[]> {
    if (!symbol) return [];

    const cleanSymbol = symbol.toUpperCase();
    const cacheKey = `${cleanSymbol}_${timeframe}`;

    // Return in-flight fetch promise if duplicate request
    if (this.fetchPromises.has(cacheKey)) {
      return this.fetchPromises.get(cacheKey)!;
    }

    const fetchPromise = (async () => {
      try {
        const res = await fetch(
          `/api/market/realtime-candles?symbol=${encodeURIComponent(
            symbol
          )}&timeframe=${timeframe}&count=${count}`
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.candles) && data.candles.length > 0) {
            const verification = MarketDataIntegrityGate.verifyCandles(data.candles);
            if (verification.isVerified) {
              const verifiedCandles = verification.verifiedCandles.map((c) => ({
                timestamp: c.timestamp,
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
                volume: c.volume
              }));

              const provider = data.provider || "KIS";
              const trust: CandleTrust = data.trust || (provider === "KIS" ? "EXECUTION_GRADE" : "ANALYSIS_ONLY");
              const receivedAt = Date.now();
              const latestCandleTs = Number(verifiedCandles[verifiedCandles.length - 1].timestamp) || receivedAt;
              const ageMs = Math.max(0, receivedAt - latestCandleTs);
              const stale = ageMs > 300000; // Stale if older than 5 minutes for intraday

              const snapshot: CandleSnapshot = {
                symbol: cleanSymbol,
                timeframe,
                candles: verifiedCandles,
                provider,
                source: data.source || "API_REALTIME",
                providerTimestamp: latestCandleTs,
                receivedAt,
                ageMs,
                verified: true,
                stale,
                trust
              };

              this.candleCache.set(cacheKey, snapshot);
              return verifiedCandles;
            }
          }
        }
      } catch (err) {
        console.warn(`[RealCandleStore] Failed to fetch candles for ${symbol}:`, err);
      } finally {
        this.fetchPromises.delete(cacheKey);
      }

      const cached = this.candleCache.get(cacheKey);
      return cached?.candles || [];
    })();

    this.fetchPromises.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  public getSnapshot(symbol: string, timeframe: string = "15m"): CandleSnapshot | null {
    if (!symbol) return null;
    const cacheKey = `${symbol.toUpperCase()}_${timeframe}`;
    const snapshot = this.candleCache.get(cacheKey);
    if (!snapshot) return null;

    // Dynamically re-evaluate staleness
    const ageMs = Date.now() - snapshot.receivedAt;
    const stale = ageMs > 300000;
    return { ...snapshot, ageMs, stale };
  }

  public getCachedCandles(symbol: string, timeframe: string = "15m"): Candle[] {
    const snapshot = this.getSnapshot(symbol, timeframe);
    return snapshot?.candles || [];
  }

  public isExecutionReady(snapshot?: CandleSnapshot | null): boolean {
    if (!snapshot) return false;
    if (!snapshot.verified) return false;
    if (snapshot.stale) return false;
    if (snapshot.trust !== "EXECUTION_GRADE") return false;
    if (!snapshot.candles || snapshot.candles.length < 20) return false;
    return true;
  }

  public setCandles(symbol: string, timeframe: string, candles: Candle[], provider = "KIS", trust: CandleTrust = "EXECUTION_GRADE") {
    if (!symbol) return;
    const cleanSymbol = symbol.toUpperCase();
    const cacheKey = `${cleanSymbol}_${timeframe}`;
    const verification = MarketDataIntegrityGate.verifyCandles(candles);
    if (verification.isVerified) {
      const verifiedCandles = verification.verifiedCandles.map((c) => ({
        timestamp: c.timestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume
      }));

      const receivedAt = Date.now();
      const latestCandleTs = Number(verifiedCandles[verifiedCandles.length - 1].timestamp) || receivedAt;

      const snapshot: CandleSnapshot = {
        symbol: cleanSymbol,
        timeframe,
        candles: verifiedCandles,
        provider,
        source: "DIRECT_PUSH",
        providerTimestamp: latestCandleTs,
        receivedAt,
        ageMs: 0,
        verified: true,
        stale: false,
        trust
      };

      this.candleCache.set(cacheKey, snapshot);
    }
  }
}

export const realCandleStore = new RealCandleStoreService();
