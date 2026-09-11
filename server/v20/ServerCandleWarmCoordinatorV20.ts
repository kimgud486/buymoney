import { realCandleStore } from "../../src/services/RealCandleStore";
import { serverRealtimeMarketHubV20 } from "./ServerRealtimeMarketHubV20";
import type { Candle } from "../../src/services/StructureBrain";

export type WarmMarketV20 = "KOREA" | "US" | "UPBIT";

export interface CandleWarmRequestV20 {
  symbol: string;
  market: WarmMarketV20;
}

export interface CandleWarmStatsV20 {
  requested: number;
  warmed: number;
  failed: number;
  derived15m: number;
  lastWarmAt: number | null;
}

const WARM_TTL_MS = 5 * 60_000;
const FAILED_WARM_COOLDOWN_MS = 5 * 60_000;
const MAX_CONCURRENCY = 3;
const INTRADAY_COUNT = 600;
const ANALYSIS_COUNT = 70;
const MIN_1M_WARM = 55;
const MIN_15M_ANALYSIS = 35;

function cleanCandles(raw: unknown): Candle[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((c: any) => ({
      timestamp: Number(c?.timestamp ?? c?.time),
      open: Number(c?.open),
      high: Number(c?.high),
      low: Number(c?.low),
      close: Number(c?.close),
      volume: Number(c?.volume),
    }))
    .filter((c) => Number.isFinite(c.timestamp) && Number(c.timestamp) > 0 && Number.isFinite(c.open) && c.open > 0 && Number.isFinite(c.high) && c.high > 0 && Number.isFinite(c.low) && c.low > 0 && Number.isFinite(c.close) && c.close > 0 && Number.isFinite(c.volume) && c.volume >= 0)
    .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
}

function toMilliseconds(timestamp: number | string): number {
  const value = Number(timestamp);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value < 1_000_000_000_000 ? value * 1000 : value;
}

/**
 * Derive analysis-only 15m candles from verified 1m OHLCV.
 * This is standard OHLC aggregation, not synthetic price generation:
 * open=first, high=max, low=min, close=last, volume=sum.
 * Incomplete current buckets are excluded so pattern/indicator engines only see closed bars.
 */
function aggregateOneMinuteToFifteenMinute(oneMinute: Candle[], nowMs = Date.now()): Candle[] {
  const bucketMs = 15 * 60_000;
  const buckets = new Map<number, Candle[]>();

  for (const candle of oneMinute) {
    const tsMs = toMilliseconds(candle.timestamp);
    if (!tsMs) continue;
    const bucketStart = Math.floor(tsMs / bucketMs) * bucketMs;
    const bucket = buckets.get(bucketStart) || [];
    bucket.push(candle);
    buckets.set(bucketStart, bucket);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .flatMap(([bucketStart, candles]) => {
      if (bucketStart + bucketMs > nowMs) return [];
      if (candles.length < 10) return [];
      const ordered = candles.slice().sort((a, b) => toMilliseconds(a.timestamp) - toMilliseconds(b.timestamp));
      return [{
        timestamp: bucketStart,
        open: ordered[0].open,
        high: Math.max(...ordered.map((c) => c.high)),
        low: Math.min(...ordered.map((c) => c.low)),
        close: ordered[ordered.length - 1].close,
        volume: ordered.reduce((sum, c) => sum + Math.max(0, Number(c.volume) || 0), 0),
      }];
    });
}

class ServerCandleWarmCoordinatorV20 {
  private readonly lastWarm = new Map<string, number>();
  private readonly failedWarmUntil = new Map<string, number>();
  private stats: CandleWarmStatsV20 = { requested: 0, warmed: 0, failed: 0, derived15m: 0, lastWarmAt: null };

  public getStats(): CandleWarmStatsV20 {
    return { ...this.stats };
  }

  public async warmBatch(requests: CandleWarmRequestV20[], maxSymbols = 8): Promise<CandleWarmStatsV20> {
    const now = Date.now();
    const unique = new Map<string, CandleWarmRequestV20>();
    for (const request of requests) {
      const symbol = String(request?.symbol || "").trim().toUpperCase();
      if (!symbol) continue;
      const key = `${request.market}:${symbol}`;
      if (now - (this.lastWarm.get(key) || 0) < WARM_TTL_MS) continue;
      if ((this.failedWarmUntil.get(key) || 0) > now) continue;
      unique.set(key, { symbol, market: request.market });
    }

    const pending = Array.from(unique.values()).slice(0, Math.max(0, maxSymbols));
    this.stats.requested += pending.length;

    for (let offset = 0; offset < pending.length; offset += MAX_CONCURRENCY) {
      const chunk = pending.slice(offset, offset + MAX_CONCURRENCY);
      await Promise.all(chunk.map(async (request) => {
        const key = `${request.market}:${request.symbol}`;
        try {
          const ok = await this.warmOne(request);
          if (ok) {
            this.stats.warmed++;
            this.stats.lastWarmAt = Date.now();
            this.lastWarm.set(key, Date.now());
            this.failedWarmUntil.delete(key);
          } else {
            this.stats.failed++;
            this.failedWarmUntil.set(key, Date.now() + FAILED_WARM_COOLDOWN_MS);
          }
        } catch {
          this.stats.failed++;
          this.failedWarmUntil.set(key, Date.now() + FAILED_WARM_COOLDOWN_MS);
        }
      }));
    }

    return this.getStats();
  }

  private async warmOne(request: CandleWarmRequestV20): Promise<boolean> {
    const port = Number(process.env.PORT || 3000);
    const base = `http://127.0.0.1:${port}`;
    const symbol = encodeURIComponent(request.symbol);

    const [oneMinuteResponse, fifteenMinuteResponse] = await Promise.all([
      fetch(`${base}/api/market/realtime-candles?symbol=${symbol}&timeframe=1m&count=${INTRADAY_COUNT}`, { signal: AbortSignal.timeout(12000) }),
      fetch(`${base}/api/market/realtime-candles?symbol=${symbol}&timeframe=15m&count=${ANALYSIS_COUNT}`, { signal: AbortSignal.timeout(12000) }),
    ]);

    if (!oneMinuteResponse.ok) return false;

    const oneMinutePayload = await oneMinuteResponse.json() as any;
    const fifteenMinutePayload = fifteenMinuteResponse.ok
      ? await fifteenMinuteResponse.json() as any
      : null;

    const oneMinute = cleanCandles(oneMinutePayload?.candles);
    const directFifteenMinute = cleanCandles(fifteenMinutePayload?.candles);
    if (oneMinute.length < MIN_1M_WARM) return false;

    let fifteenMinute = directFifteenMinute;
    let derived = false;
    if (fifteenMinute.length < MIN_15M_ANALYSIS) {
      const derivedCandles = aggregateOneMinuteToFifteenMinute(oneMinute);
      if (derivedCandles.length >= MIN_15M_ANALYSIS) {
        fifteenMinute = derivedCandles;
        derived = true;
      }
    }

    if (fifteenMinute.length < MIN_15M_ANALYSIS) return false;

    const provider = String(fifteenMinutePayload?.provider || oneMinutePayload?.provider || "SERVER_REALTIME");
    const directExecutionGrade = fifteenMinutePayload?.trust === "EXECUTION_GRADE" || oneMinutePayload?.trust === "EXECUTION_GRADE";
    const trust = derived
      ? "ANALYSIS_ONLY" as const
      : directExecutionGrade
        ? "EXECUTION_GRADE" as const
        : "ANALYSIS_ONLY" as const;

    realCandleStore.setCandles(request.symbol, "1m", oneMinute, provider, directExecutionGrade ? "EXECUTION_GRADE" : "ANALYSIS_ONLY");
    realCandleStore.setCandles(request.symbol, "15m", fifteenMinute, derived ? `${provider}_1M_AGGREGATED` : provider, trust);
    serverRealtimeMarketHubV20.setCandles(request.symbol, oneMinute);
    if (derived) this.stats.derived15m++;
    return true;
  }
}

export const serverCandleWarmCoordinatorV20 = new ServerCandleWarmCoordinatorV20();
