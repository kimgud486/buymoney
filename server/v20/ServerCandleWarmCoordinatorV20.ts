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
  lastWarmAt: number | null;
}

const WARM_TTL_MS = 5 * 60_000;
const MAX_CONCURRENCY = 3;
const INTRADAY_COUNT = 180;
const ANALYSIS_COUNT = 70;

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
    .filter((c) => Number.isFinite(c.timestamp) && c.timestamp > 0 && Number.isFinite(c.open) && c.open > 0 && Number.isFinite(c.high) && c.high > 0 && Number.isFinite(c.low) && c.low > 0 && Number.isFinite(c.close) && c.close > 0 && Number.isFinite(c.volume) && c.volume >= 0);
}

class ServerCandleWarmCoordinatorV20 {
  private readonly lastWarm = new Map<string, number>();
  private stats: CandleWarmStatsV20 = { requested: 0, warmed: 0, failed: 0, lastWarmAt: null };

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
      unique.set(key, { symbol, market: request.market });
    }

    const pending = Array.from(unique.values()).slice(0, Math.max(0, maxSymbols));
    this.stats.requested += pending.length;

    for (let offset = 0; offset < pending.length; offset += MAX_CONCURRENCY) {
      const chunk = pending.slice(offset, offset + MAX_CONCURRENCY);
      await Promise.all(chunk.map(async (request) => {
        try {
          const ok = await this.warmOne(request);
          if (ok) {
            this.stats.warmed++;
            this.stats.lastWarmAt = Date.now();
            this.lastWarm.set(`${request.market}:${request.symbol}`, Date.now());
          } else {
            this.stats.failed++;
          }
        } catch {
          this.stats.failed++;
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

    if (!oneMinuteResponse.ok || !fifteenMinuteResponse.ok) return false;
    const [oneMinutePayload, fifteenMinutePayload] = await Promise.all([
      oneMinuteResponse.json() as Promise<any>,
      fifteenMinuteResponse.json() as Promise<any>,
    ]);
    const oneMinute = cleanCandles(oneMinutePayload?.candles);
    const fifteenMinute = cleanCandles(fifteenMinutePayload?.candles);
    if (oneMinute.length < 55 || fifteenMinute.length < 35) return false;

    const provider = String(fifteenMinutePayload?.provider || oneMinutePayload?.provider || "SERVER_REALTIME");
    const trust = fifteenMinutePayload?.trust === "EXECUTION_GRADE" || oneMinutePayload?.trust === "EXECUTION_GRADE"
      ? "EXECUTION_GRADE" as const
      : "ANALYSIS_ONLY" as const;

    realCandleStore.setCandles(request.symbol, "1m", oneMinute, provider, trust);
    realCandleStore.setCandles(request.symbol, "15m", fifteenMinute, provider, trust);
    serverRealtimeMarketHubV20.setCandles(request.symbol, oneMinute);
    return true;
  }
}

export const serverCandleWarmCoordinatorV20 = new ServerCandleWarmCoordinatorV20();
