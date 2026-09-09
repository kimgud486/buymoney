import {
  TrueMTFEvidenceV20,
  TrueMTFSnapshotV20,
  TrueMTFTimeframeV20,
} from "./TrueMTFSignalGateV20";

export type RuntimeMarketV204 = "KR" | "US";

export interface RuntimeTradeTickV204 {
  symbol: string;
  market: RuntimeMarketV204;
  timestamp: number;
  price: number;
  /** Per-trade volume when the upstream feed exposes it. */
  volume?: number;
  /** Exchange cumulative session volume. Used only to derive deltas. */
  cumulativeVolume?: number;
  /** Must be true only when the tick came from the verified live broker/feed path. */
  sourceVerified: boolean;
  source: string;
}

export interface RuntimeBarV204 {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface InternalBarV204 extends RuntimeBarV204 {
  bucketKey: string;
}

interface FrameStateV204 {
  closed: InternalBarV204[];
  current?: InternalBarV204;
}

interface SymbolStateV204 {
  market: RuntimeMarketV204;
  source: string;
  sourceVerified: boolean;
  lastTickTimestamp: number;
  sessionKey: string | null;
  previousCumulativeVolume: number | null;
  frames: Record<TrueMTFTimeframeV20, FrameStateV204>;
}

export interface TrueMTFRuntimeReadinessV204 {
  ready: boolean;
  fresh: boolean;
  missingTimeframes: TrueMTFTimeframeV20[];
  staleTimeframes: TrueMTFTimeframeV20[];
  reasons: string[];
}

const FRAME_INTERVAL_MS: Record<TrueMTFTimeframeV20, number> = {
  "1m": 60_000,
  "3m": 180_000,
  "5m": 300_000,
  D: 86_400_000,
};

const FRESHNESS_MS: Record<TrueMTFTimeframeV20, number> = {
  "1m": 95_000,
  "3m": 245_000,
  "5m": 425_000,
  // Previous trading-day evidence remains usable across weekends.
  D: 96 * 60 * 60 * 1000,
};

const MAX_HISTORY = 400;
const MIN_INDICATOR_BARS = 50;

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function positive(value: unknown): value is number {
  return finite(value) && value > 0;
}

function frameState(): FrameStateV204 {
  return { closed: [] };
}

function createState(market: RuntimeMarketV204): SymbolStateV204 {
  return {
    market,
    source: "",
    sourceVerified: false,
    lastTickTimestamp: 0,
    sessionKey: null,
    previousCumulativeVolume: null,
    frames: {
      "1m": frameState(),
      "3m": frameState(),
      "5m": frameState(),
      D: frameState(),
    },
  };
}

function timezoneForMarket(market: RuntimeMarketV204): string {
  return market === "KR" ? "Asia/Seoul" : "America/New_York";
}

function localSessionKey(timestamp: number, market: RuntimeMarketV204): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezoneForMarket(market),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date(timestamp));
}

function ema(values: number[], period: number): number {
  if (values.length === 0) return Number.NaN;
  const alpha = 2 / (period + 1);
  let current = values[0];
  for (let i = 1; i < values.length; i += 1) {
    current = alpha * values[i] + (1 - alpha) * current;
  }
  return current;
}

function rsi(values: number[], period = 14): number {
  if (values.length < period + 1) return Number.NaN;

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i += 1) {
    const change = values[i] - values[i - 1];
    avgGain += Math.max(change, 0);
    avgLoss += Math.max(-change, 0);
  }
  avgGain /= period;
  avgLoss /= period;

  for (let i = period + 1; i < values.length; i += 1) {
    const change = values[i] - values[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(change, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-change, 0)) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function macdHistogram(values: number[]): number {
  if (values.length < 35) return Number.NaN;
  const macdSeries: number[] = [];
  const fastSeries: number[] = [];
  const slowSeries: number[] = [];

  const fastAlpha = 2 / 13;
  const slowAlpha = 2 / 27;
  let fast = values[0];
  let slow = values[0];

  for (const value of values) {
    fast = fastAlpha * value + (1 - fastAlpha) * fast;
    slow = slowAlpha * value + (1 - slowAlpha) * slow;
    fastSeries.push(fast);
    slowSeries.push(slow);
    macdSeries.push(fast - slow);
  }

  const signal = ema(macdSeries, 9);
  return macdSeries[macdSeries.length - 1] - signal;
}

function relativeVolume(bars: RuntimeBarV204[]): number {
  if (bars.length < 21) return Number.NaN;
  const latest = bars[bars.length - 1].volume;
  const previous = bars.slice(-21, -1);
  const avg = previous.reduce((sum, bar) => sum + bar.volume, 0) / previous.length;
  return avg > 0 ? latest / avg : Number.NaN;
}

function sessionVwap(
  bars: InternalBarV204[],
  market: RuntimeMarketV204,
): number | undefined {
  if (bars.length === 0) return undefined;
  const latestSession = localSessionKey(bars[bars.length - 1].timestamp, market);
  const sessionBars = bars.filter(
    (bar) => localSessionKey(bar.timestamp, market) === latestSession,
  );

  let value = 0;
  let volume = 0;
  for (const bar of sessionBars) {
    const typical = (bar.high + bar.low + bar.close) / 3;
    value += typical * bar.volume;
    volume += bar.volume;
  }
  return volume > 0 ? value / volume : undefined;
}

function previousHigh20(bars: RuntimeBarV204[]): number | undefined {
  if (bars.length < 21) return undefined;
  return Math.max(...bars.slice(-21, -1).map((bar) => bar.high));
}

/**
 * Converts verified trade ticks into real 1m/3m/5m bars and combines them with
 * seeded broker history to create V20 True-MTF evidence.
 *
 * Important truth rules:
 * - no synthetic/fallback bars are fabricated;
 * - cumulative volume is converted to positive deltas only;
 * - intraday state resets by exchange-local trading date;
 * - only CLOSED bars are used for BUY evidence;
 * - fewer than 50 real bars means that timeframe stays missing;
 * - stale evidence is marked STALE before it reaches TrueMTFSignalGateV20.
 */
export class TrueMTFRuntimeBuilderV204 {
  private states = new Map<string, SymbolStateV204>();

  private key(symbol: string, market: RuntimeMarketV204): string {
    return `${market}:${symbol}`;
  }

  private getOrCreate(symbol: string, market: RuntimeMarketV204): SymbolStateV204 {
    const key = this.key(symbol, market);
    const existing = this.states.get(key);
    if (existing) return existing;
    const created = createState(market);
    this.states.set(key, created);
    return created;
  }

  public seedHistory(
    symbol: string,
    market: RuntimeMarketV204,
    timeframe: TrueMTFTimeframeV20,
    bars: RuntimeBarV204[],
  ): void {
    const state = this.getOrCreate(symbol, market);
    const valid = bars
      .filter(
        (bar) =>
          positive(bar.timestamp) &&
          positive(bar.open) &&
          positive(bar.high) &&
          positive(bar.low) &&
          positive(bar.close) &&
          finite(bar.volume) &&
          bar.volume >= 0,
      )
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-MAX_HISTORY)
      .map((bar) => ({
        ...bar,
        bucketKey:
          timeframe === "D"
            ? localSessionKey(bar.timestamp, market)
            : String(Math.floor(bar.timestamp / FRAME_INTERVAL_MS[timeframe])),
      }));

    state.frames[timeframe].closed = valid;
    state.frames[timeframe].current = undefined;
  }

  public ingestTick(tick: RuntimeTradeTickV204): void {
    if (!tick.symbol || !positive(tick.timestamp) || !positive(tick.price)) return;
    if (!tick.source || tick.source.trim().length === 0) return;

    const state = this.getOrCreate(tick.symbol, tick.market);
    if (state.lastTickTimestamp > 0 && tick.timestamp < state.lastTickTimestamp) {
      // Out-of-order ticks must not rewrite already-confirmed bars.
      return;
    }

    const nextSessionKey = localSessionKey(tick.timestamp, tick.market);
    if (state.sessionKey !== null && state.sessionKey !== nextSessionKey) {
      state.previousCumulativeVolume = null;
    }
    state.sessionKey = nextSessionKey;
    state.market = tick.market;
    state.source = tick.source;
    state.sourceVerified = tick.sourceVerified;
    state.lastTickTimestamp = tick.timestamp;

    let volumeDelta = 0;
    if (finite(tick.volume) && tick.volume > 0) {
      volumeDelta = tick.volume;
    } else if (finite(tick.cumulativeVolume) && tick.cumulativeVolume >= 0) {
      if (
        state.previousCumulativeVolume !== null &&
        tick.cumulativeVolume >= state.previousCumulativeVolume
      ) {
        volumeDelta = tick.cumulativeVolume - state.previousCumulativeVolume;
      }
      state.previousCumulativeVolume = tick.cumulativeVolume;
    }

    this.updateFrame(state, "1m", tick, volumeDelta, nextSessionKey);
    this.updateFrame(state, "3m", tick, volumeDelta, nextSessionKey);
    this.updateFrame(state, "5m", tick, volumeDelta, nextSessionKey);
    this.updateFrame(state, "D", tick, volumeDelta, nextSessionKey);
  }

  private updateFrame(
    state: SymbolStateV204,
    timeframe: TrueMTFTimeframeV20,
    tick: RuntimeTradeTickV204,
    volumeDelta: number,
    sessionKey: string,
  ): void {
    const frame = state.frames[timeframe];
    const bucketKey =
      timeframe === "D"
        ? sessionKey
        : String(Math.floor(tick.timestamp / FRAME_INTERVAL_MS[timeframe]));

    if (!frame.current || frame.current.bucketKey !== bucketKey) {
      if (frame.current) {
        frame.closed.push(frame.current);
        if (frame.closed.length > MAX_HISTORY) {
          frame.closed.splice(0, frame.closed.length - MAX_HISTORY);
        }
      }

      frame.current = {
        bucketKey,
        timestamp: tick.timestamp,
        open: tick.price,
        high: tick.price,
        low: tick.price,
        close: tick.price,
        volume: volumeDelta,
      };
      return;
    }

    frame.current.high = Math.max(frame.current.high, tick.price);
    frame.current.low = Math.min(frame.current.low, tick.price);
    frame.current.close = tick.price;
    frame.current.volume += volumeDelta;
  }

  public getClosedBars(
    symbol: string,
    market: RuntimeMarketV204,
    timeframe: TrueMTFTimeframeV20,
  ): RuntimeBarV204[] {
    const state = this.states.get(this.key(symbol, market));
    if (!state) return [];
    return state.frames[timeframe].closed.map(({ bucketKey: _bucketKey, ...bar }) => bar);
  }

  public getEvidence(
    symbol: string,
    market: RuntimeMarketV204,
    now: number = Date.now(),
  ): TrueMTFEvidenceV20 {
    const state = this.states.get(this.key(symbol, market));
    if (!state) return {};

    const evidence: TrueMTFEvidenceV20 = {};
    const frames: TrueMTFTimeframeV20[] = ["1m", "3m", "5m", "D"];

    for (const timeframe of frames) {
      const snapshot = this.buildSnapshot(state, timeframe, now);
      if (snapshot) evidence[timeframe] = snapshot;
    }

    return evidence;
  }

  public getReadiness(
    symbol: string,
    market: RuntimeMarketV204,
    now: number = Date.now(),
  ): TrueMTFRuntimeReadinessV204 {
    const evidence = this.getEvidence(symbol, market, now);
    const frames: TrueMTFTimeframeV20[] = ["1m", "3m", "5m", "D"];
    const missingTimeframes = frames.filter((frame) => !evidence[frame]);
    const staleTimeframes = frames.filter(
      (frame) => evidence[frame]?.dataStatus === "STALE",
    );
    const reasons: string[] = [];

    for (const frame of missingTimeframes) reasons.push(`${frame}:MISSING_RUNTIME_HISTORY`);
    for (const frame of staleTimeframes) reasons.push(`${frame}:STALE_RUNTIME_EVIDENCE`);

    const ready = missingTimeframes.length === 0;
    const fresh = ready && staleTimeframes.length === 0;

    return { ready, fresh, missingTimeframes, staleTimeframes, reasons };
  }

  private buildSnapshot(
    state: SymbolStateV204,
    timeframe: TrueMTFTimeframeV20,
    now: number,
  ): TrueMTFSnapshotV20 | undefined {
    const bars = state.frames[timeframe].closed;
    if (bars.length < MIN_INDICATOR_BARS) return undefined;

    const latest = bars[bars.length - 1];
    const closes = bars.map((bar) => bar.close);
    const ema9Value = ema(closes, 9);
    const ema20Value = ema(closes, 20);
    const ema50Value = ema(closes, 50);
    const rsi14Value = rsi(closes, 14);
    const macdHistValue = macdHistogram(closes);
    const rvolValue = relativeVolume(bars);

    if (
      !positive(latest.close) ||
      !positive(ema9Value) ||
      !positive(ema20Value) ||
      !positive(ema50Value) ||
      !finite(rsi14Value) ||
      !finite(macdHistValue) ||
      !finite(rvolValue)
    ) {
      return undefined;
    }

    const age = Math.max(0, now - latest.timestamp);
    const dataStatus =
      age > FRESHNESS_MS[timeframe]
        ? "STALE"
        : state.sourceVerified
          ? "REALTIME_VERIFIED"
          : "REALTIME_DERIVED";

    const snapshot: TrueMTFSnapshotV20 = {
      timeframe,
      dataStatus,
      source: state.source || "SEEDED_BROKER_HISTORY",
      lastBarTimestamp: latest.timestamp,
      barIntervalMs: FRAME_INTERVAL_MS[timeframe],
      close: latest.close,
      high: latest.high,
      ema9: ema9Value,
      ema20: ema20Value,
      ema50: ema50Value,
      rsi14: rsi14Value,
      macdHist: macdHistValue,
      rvol: rvolValue,
      previousHigh20: previousHigh20(bars),
    };

    if (timeframe !== "D") {
      snapshot.vwap = sessionVwap(bars, state.market);
    }

    return snapshot;
  }
}
