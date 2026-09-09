import type {
  TrueMTFEvidenceV20,
  TrueMTFSnapshotV20,
  TrueMTFTimeframeV20
} from "./TrueMTFSignalGateV20";

type RawCandle = {
  timestamp?: number | string;
  time?: number | string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type NormalizedCandle = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type CandlePayload = {
  candles?: RawCandle[];
  dataStatus?: string;
  provider?: string;
  source?: string;
};

export interface ServerTrueMTFBuildInputV20 {
  symbol: string;
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

const INTERVAL: Record<TrueMTFTimeframeV20, number> = {
  "1m": 60_000,
  "3m": 180_000,
  "5m": 300_000,
  D: 86_400_000
};

function finite(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function normalizeTimestamp(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value > 1e12) return value;
    if (value > 1e9) return value * 1000;
  }
  if (typeof value === "string" && value.trim()) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      if (numeric > 1e12) return numeric;
      if (numeric > 1e9) return numeric * 1000;
    }
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function normalizeVerifiedCandlesV20(raw: RawCandle[] | undefined): NormalizedCandle[] {
  if (!Array.isArray(raw)) return [];
  const normalized: NormalizedCandle[] = [];
  for (const c of raw) {
    const timestamp = normalizeTimestamp(c?.timestamp ?? c?.time);
    if (
      timestamp == null ||
      !finite(c?.open) || !finite(c?.high) || !finite(c?.low) || !finite(c?.close) || !finite(c?.volume) ||
      c.open <= 0 || c.high <= 0 || c.low <= 0 || c.close <= 0 || c.volume <= 0 ||
      c.high < Math.max(c.open, c.close) || c.low > Math.min(c.open, c.close)
    ) continue;
    normalized.push({ timestamp, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume });
  }
  normalized.sort((a, b) => a.timestamp - b.timestamp);
  return normalized;
}

export function aggregateOneMinuteToThreeMinuteV20(candles: NormalizedCandle[]): NormalizedCandle[] {
  const buckets = new Map<number, NormalizedCandle[]>();
  for (const candle of candles) {
    const bucket = Math.floor(candle.timestamp / INTERVAL["3m"]) * INTERVAL["3m"];
    const rows = buckets.get(bucket) || [];
    rows.push(candle);
    buckets.set(bucket, rows);
  }

  const result: NormalizedCandle[] = [];
  for (const [timestamp, rows] of [...buckets.entries()].sort((a, b) => a[0] - b[0])) {
    rows.sort((a, b) => a.timestamp - b.timestamp);
    // A derived 3m candle is valid only if all three independent 1m source bars exist.
    if (rows.length !== 3) continue;
    const expected = [timestamp, timestamp + 60_000, timestamp + 120_000];
    if (!expected.every((ts, index) => Math.abs(rows[index].timestamp - ts) < 15_000)) continue;
    result.push({
      timestamp,
      open: rows[0].open,
      high: Math.max(...rows.map(r => r.high)),
      low: Math.min(...rows.map(r => r.low)),
      close: rows[2].close,
      volume: rows.reduce((sum, r) => sum + r.volume, 0)
    });
  }
  return result;
}

function ema(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let result = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i++) result = values[i] * k + result * (1 - k);
  return result;
}

function emaSeries(values: number[], period: number): number[] {
  if (values.length < period) return [];
  const out: number[] = [];
  let current = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out.push(current);
  const k = 2 / (period + 1);
  for (let i = period; i < values.length; i++) {
    current = values[i] * k + current * (1 - k);
    out.push(current);
  }
  return out;
}

function rsi(values: number[], period = 14): number | null {
  if (values.length <= period) return null;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function macdHistogram(values: number[]): number | null {
  const fast = emaSeries(values, 12);
  const slow = emaSeries(values, 26);
  if (fast.length === 0 || slow.length < 9) return null;
  // Align the EMA12 series to the EMA26 series by closing timestamp index.
  const offset = 26 - 12;
  const macd: number[] = [];
  for (let i = 0; i < slow.length; i++) {
    const fastIndex = i + offset;
    if (fastIndex >= 0 && fastIndex < fast.length) macd.push(fast[fastIndex] - slow[i]);
  }
  if (macd.length < 9) return null;
  const signal = ema(macd, 9);
  if (signal == null) return null;
  return macd[macd.length - 1] - signal;
}

function rvol(candles: NormalizedCandle[], lookback = 20): number | null {
  if (candles.length < lookback + 1) return null;
  const current = candles[candles.length - 1].volume;
  const history = candles.slice(-(lookback + 1), -1).map(c => c.volume);
  const average = history.reduce((a, b) => a + b, 0) / history.length;
  return average > 0 ? current / average : null;
}

function vwap(candles: NormalizedCandle[], lookback = 20): number | null {
  const rows = candles.slice(-lookback);
  if (!rows.length) return null;
  let pv = 0;
  let vol = 0;
  for (const c of rows) {
    const typical = (c.high + c.low + c.close) / 3;
    pv += typical * c.volume;
    vol += c.volume;
  }
  return vol > 0 ? pv / vol : null;
}

function buildSnapshot(
  timeframe: TrueMTFTimeframeV20,
  candles: NormalizedCandle[],
  source: string,
  derived = false
): TrueMTFSnapshotV20 | null {
  if (candles.length < 55) return null;
  const closes = candles.map(c => c.close);
  const e9 = ema(closes, 9);
  const e20 = ema(closes, 20);
  const e50 = ema(closes, 50);
  const r14 = rsi(closes, 14);
  const macd = macdHistogram(closes);
  const relativeVolume = rvol(candles);
  if ([e9, e20, e50, r14, macd, relativeVolume].some(v => v == null || !Number.isFinite(v))) return null;
  const last = candles[candles.length - 1];
  const previousHigh20 = candles.slice(-21, -1).length === 20
    ? Math.max(...candles.slice(-21, -1).map(c => c.high))
    : undefined;

  return {
    timeframe,
    dataStatus: derived ? "REALTIME_DERIVED" : "REALTIME_VERIFIED",
    source,
    lastBarTimestamp: last.timestamp,
    barIntervalMs: INTERVAL[timeframe],
    close: last.close,
    high: last.high,
    ema9: e9!,
    ema20: e20!,
    ema50: e50!,
    rsi14: r14!,
    macdHist: macd!,
    rvol: relativeVolume!,
    vwap: vwap(candles) ?? undefined,
    previousHigh20
  };
}

async function fetchFrame(
  input: ServerTrueMTFBuildInputV20,
  timeframe: "1m" | "5m" | "D",
  count: number
): Promise<{ candles: NormalizedCandle[]; source: string } | null> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const base = input.baseUrl.replace(/\/$/, "");
  const url = `${base}/api/market/realtime-candles?symbol=${encodeURIComponent(input.symbol)}&timeframe=${encodeURIComponent(timeframe)}&count=${count}`;
  try {
    const response = await fetchImpl(url, { headers: { "x-buymoney-internal-v20": "true" } });
    if (!response.ok) return null;
    const payload = await response.json() as CandlePayload;
    if (payload.dataStatus && payload.dataStatus !== "REALTIME_VERIFIED" && payload.dataStatus !== "REALTIME_DERIVED") return null;
    const candles = normalizeVerifiedCandlesV20(payload.candles);
    if (candles.length < 55) return null;
    const source = [payload.provider, payload.source].filter(Boolean).join(":") || "SERVER_REALTIME_CANDLES";
    return { candles, source };
  } catch {
    return null;
  }
}

export class ServerTrueMTFEvidenceProviderV20 {
  public static async build(input: ServerTrueMTFBuildInputV20): Promise<TrueMTFEvidenceV20> {
    if (!input.symbol?.trim() || !input.baseUrl?.trim()) return {};
    const [m1, m5, daily] = await Promise.all([
      fetchFrame(input, "1m", 210),
      fetchFrame(input, "5m", 90),
      fetchFrame(input, "D", 90)
    ]);

    const evidence: TrueMTFEvidenceV20 = {};
    if (m1) {
      const m1Snapshot = buildSnapshot("1m", m1.candles, m1.source);
      if (m1Snapshot) evidence["1m"] = m1Snapshot;
      const derived3 = aggregateOneMinuteToThreeMinuteV20(m1.candles);
      const m3Snapshot = buildSnapshot("3m", derived3, `${m1.source}:DERIVED_3M`, true);
      if (m3Snapshot) evidence["3m"] = m3Snapshot;
    }
    if (m5) {
      const snapshot = buildSnapshot("5m", m5.candles, m5.source);
      if (snapshot) evidence["5m"] = snapshot;
    }
    if (daily) {
      const snapshot = buildSnapshot("D", daily.candles, daily.source);
      if (snapshot) evidence.D = snapshot;
    }
    return evidence;
  }
}
