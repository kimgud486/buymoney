import {
  HistoricalSeedResultV204,
  KISHistoricalDataProviderV204,
  VerifiedHistoricalCandleV204,
} from "./KISHistoricalDataProviderV204";
import {
  ServerMarketCandleV204,
  ServerRealtimeMarketHubV20,
} from "./ServerRealtimeMarketHubV20";

export interface VerifiedHistoryStateV204 {
  symbol: string;
  status: "HISTORY_VERIFIED" | "HISTORY_UNVERIFIED";
  intraday1m: HistoricalSeedResultV204;
  daily: HistoricalSeedResultV204;
  seededAt: number;
}

function asServerCandle(candle: VerifiedHistoricalCandleV204): ServerMarketCandleV204 {
  return {
    timestamp: candle.timestamp,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
    lastTradeTimestamp: candle.lastTradeTimestamp,
    source: candle.source,
  };
}

/**
 * Fail-closed bootstrap for BUY-path market history.
 *
 * Rules:
 *  - Requires real KIS 1m and daily history.
 *  - Requires at least requiredBars in both frames.
 *  - Never creates neutral, repeated, interpolated, or synthetic candles.
 *  - Only verified 1m candles are seeded into the live market hub.
 */
export class VerifiedHistorySeedServiceV204 {
  private states = new Map<string, VerifiedHistoryStateV204>();

  constructor(
    private provider: KISHistoricalDataProviderV204 = new KISHistoricalDataProviderV204(),
    private hub: ServerRealtimeMarketHubV20 = ServerRealtimeMarketHubV20.getInstance(),
    private requiredBars = 50,
  ) {}

  public async seed(symbol: string): Promise<VerifiedHistoryStateV204> {
    const normalized = symbol.trim().toUpperCase();
    const result = await this.provider.verifySeed(normalized, this.requiredBars);

    const state: VerifiedHistoryStateV204 = {
      symbol: normalized,
      status: result.status,
      intraday1m: result.intraday,
      daily: result.daily,
      seededAt: Date.now(),
    };

    this.states.set(normalized, state);

    if (state.status !== "HISTORY_VERIFIED") {
      return state;
    }

    // Only real KIS candles enter the runtime store. There is deliberately no
    // padding when a minute is absent.
    this.hub.setCandles(
      normalized,
      state.intraday1m.candles.map(asServerCandle),
    );

    return state;
  }

  public getState(symbol: string): VerifiedHistoryStateV204 | null {
    return this.states.get(symbol.trim().toUpperCase()) ?? null;
  }

  public isVerified(symbol: string): boolean {
    return this.getState(symbol)?.status === "HISTORY_VERIFIED";
  }

  public getDailyCandles(symbol: string): VerifiedHistoricalCandleV204[] {
    const state = this.getState(symbol);
    return state?.status === "HISTORY_VERIFIED" ? [...state.daily.candles] : [];
  }

  public getIntradayFrames(symbol: string): {
    "1m": ServerMarketCandleV204[];
    "3m": ServerMarketCandleV204[];
    "5m": ServerMarketCandleV204[];
  } | null {
    if (!this.isVerified(symbol)) return null;

    return {
      "1m": this.hub.getIntradayCandles(symbol, 1, false),
      "3m": this.hub.getIntradayCandles(symbol, 3, false),
      "5m": this.hub.getIntradayCandles(symbol, 5, false),
    };
  }
}

export const verifiedHistorySeedServiceV204 = new VerifiedHistorySeedServiceV204();
