// ----------------------------------------------------------------------
// REAL CANDLE STORE V3 (TRUTH-FIRST SNAPSHOT STORE)
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
  private static readonly MAX_INTRADAY_CANDLE_AGE_MS = 5 * 60 * 1000;

  private normalizeSymbol(symbol: unknown): string {
    return String(symbol ?? "").trim().toUpperCase();
  }

  public async fetchRealCandles(
    symbol: string,
    timeframe: string = "15m",
    count: number = 60
  ): Promise<Candle[]> {
    const cleanSymbol = this.normalizeSymbol(symbol);
    if (!cleanSymbol) return [];

    const cacheKey = `${cleanSymbol}_${timeframe}`;
    if (this.fetchPromises.has(cacheKey)) {
      return this.fetchPromises.get(cacheKey)!;
    }

    const fetchPromise = (async () => {
      try {
        const res = await fetch(
          `/api/market/realtime-candles?symbol=${encodeURIComponent(cleanSymbol)}&timeframe=${encodeURIComponent(timeframe)}&count=${count}`
        );

        if (!res.ok) {
          return this.getFreshVerifiedCandles(cleanSymbol, timeframe);
        }

        const data = await res.json();
        const responseSymbol = this.normalizeSymbol(data?.symbol);
        const provider = typeof data?.provider === "string" ? data.provider.trim() : "";
        const source = typeof data?.source === "string" ? data.source.trim() : "";
        const trust: CandleTrust = data?.trust;

        if (responseSymbol !== cleanSymbol) {
          console.error(
            `[RealCandleStore] SYMBOL_MISMATCH requested=${cleanSymbol} response=${responseSymbol || "MISSING"}`
          );
          return this.getFreshVerifiedCandles(cleanSymbol, timeframe);
        }

        if (!provider || !source || !["EXECUTION_GRADE", "ANALYSIS_ONLY", "DISPLAY_ONLY", "UNVERIFIED"].includes(trust)) {
          console.error(
            `[RealCandleStore] Missing/invalid provenance for ${cleanSymbol}: provider=${provider || "MISSING"}, source=${source || "MISSING"}, trust=${String(trust)}`
          );
          return this.getFreshVerifiedCandles(cleanSymbol, timeframe);
        }

        if (!Array.isArray(data?.candles) || data.candles.length === 0) {
          return this.getFreshVerifiedCandles(cleanSymbol, timeframe);
        }

        const verification = MarketDataIntegrityGate.verifyCandles(data.candles);
        if (!verification.isVerified) {
          console.error(
            `[RealCandleStore] Candle verification failed for ${cleanSymbol}: ${verification.errorReason || "UNKNOWN"}`
          );
          return this.getFreshVerifiedCandles(cleanSymbol, timeframe);
        }

        const verifiedCandles = verification.verifiedCandles.map((c) => ({
          timestamp: c.timestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume,
        }));

        const receivedAt = Date.now();
        const latestCandleTs = Number(verifiedCandles[verifiedCandles.length - 1].timestamp);
        const ageMs = Number.isFinite(latestCandleTs)
          ? Math.max(0, receivedAt - latestCandleTs)
          : Number.POSITIVE_INFINITY;
        const stale = ageMs > RealCandleStoreService.MAX_INTRADAY_CANDLE_AGE_MS;

        const snapshot: CandleSnapshot = {
          symbol: cleanSymbol,
          timeframe,
          candles: verifiedCandles,
          provider,
          source,
          providerTimestamp: Number.isFinite(latestCandleTs) ? latestCandleTs : null,
          receivedAt,
          ageMs,
          verified: true,
          stale,
          trust,
        };

        this.candleCache.set(cacheKey, snapshot);
        return stale ? [] : verifiedCandles;
      } catch (err) {
        console.warn(`[RealCandleStore] Failed to fetch candles for ${cleanSymbol}:`, err);
        return this.getFreshVerifiedCandles(cleanSymbol, timeframe);
      } finally {
        this.fetchPromises.delete(cacheKey);
      }
    })();

    this.fetchPromises.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  public getSnapshot(symbol: string, timeframe: string = "15m"): CandleSnapshot | null {
    const cleanSymbol = this.normalizeSymbol(symbol);
    if (!cleanSymbol) return null;

    const cacheKey = `${cleanSymbol}_${timeframe}`;
    const snapshot = this.candleCache.get(cacheKey);
    if (!snapshot) return null;

    const latestCandleTs = snapshot.providerTimestamp;
    const ageMs = latestCandleTs == null
      ? Number.POSITIVE_INFINITY
      : Math.max(0, Date.now() - latestCandleTs);
    const stale = ageMs > RealCandleStoreService.MAX_INTRADAY_CANDLE_AGE_MS;

    return { ...snapshot, ageMs, stale };
  }

  public getCachedCandles(symbol: string, timeframe: string = "15m"): Candle[] {
    const snapshot = this.getSnapshot(symbol, timeframe);
    if (!snapshot || !snapshot.verified || snapshot.stale || snapshot.trust === "UNVERIFIED") {
      return [];
    }
    return snapshot.candles;
  }

  private getFreshVerifiedCandles(symbol: string, timeframe: string): Candle[] {
    const snapshot = this.getSnapshot(symbol, timeframe);
    if (!snapshot || !snapshot.verified || snapshot.stale || snapshot.trust === "UNVERIFIED") {
      return [];
    }
    return snapshot.candles;
  }

  public isExecutionReady(snapshot?: CandleSnapshot | null): boolean {
    if (!snapshot) return false;
    if (!snapshot.verified) return false;
    if (snapshot.stale) return false;
    if (snapshot.trust !== "EXECUTION_GRADE") return false;
    if (!snapshot.provider || !snapshot.source || snapshot.providerTimestamp == null) return false;
    if (!snapshot.candles || snapshot.candles.length < 20) return false;
    return true;
  }

  public setCandles(
    symbol: string,
    timeframe: string,
    candles: Candle[],
    provider: string,
    trust: CandleTrust = "UNVERIFIED",
    source: string = ""
  ) {
    const cleanSymbol = this.normalizeSymbol(symbol);
    if (!cleanSymbol || !provider || !source) return;

    const cacheKey = `${cleanSymbol}_${timeframe}`;
    const verification = MarketDataIntegrityGate.verifyCandles(candles);
    if (!verification.isVerified) return;

    const verifiedCandles = verification.verifiedCandles.map((c) => ({
      timestamp: c.timestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    }));

    const receivedAt = Date.now();
    const latestCandleTs = Number(verifiedCandles[verifiedCandles.length - 1].timestamp);
    const ageMs = Number.isFinite(latestCandleTs)
      ? Math.max(0, receivedAt - latestCandleTs)
      : Number.POSITIVE_INFINITY;
    const stale = ageMs > RealCandleStoreService.MAX_INTRADAY_CANDLE_AGE_MS;

    const snapshot: CandleSnapshot = {
      symbol: cleanSymbol,
      timeframe,
      candles: verifiedCandles,
      provider,
      source,
      providerTimestamp: Number.isFinite(latestCandleTs) ? latestCandleTs : null,
      receivedAt,
      ageMs,
      verified: !stale,
      stale,
      trust,
    };

    this.candleCache.set(cacheKey, snapshot);
  }
}

export const realCandleStore = new RealCandleStoreService();
