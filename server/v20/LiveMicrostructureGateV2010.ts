// ----------------------------------------------------------------------
// AISTOCK V20.10 LIVE MICROSTRUCTURE BUY GATE
// Truth-first: only real quote fields are accepted. Missing/stale data never
// becomes a fabricated neutral order-flow value.
// ----------------------------------------------------------------------

export type MicrostructureMarketV2010 = "KR" | "US" | "CRYPTO";
export type MarketPhaseV2010 = "OPENING" | "REGULAR" | "CLOSING" | "CONTINUOUS" | "CLOSED";
export type MicrostructureGateStatusV2010 =
  | "PASSED"
  | "MARKET_CLOSED"
  | "MICROSTRUCTURE_MISSING"
  | "MICROSTRUCTURE_STALE"
  | "SPREAD_TOO_WIDE"
  | "RVOL_TOO_LOW"
  | "VOLATILITY_TOO_LOW";

export interface MicrostructureThresholdsV2010 {
  maxQuoteAgeMs: number;
  maxSpreadBps: number;
  minRvol: number;
  minAtrPct: number;
}

export interface LiveMicrostructureEvidenceV2010 {
  required: true;
  passed: boolean;
  status: MicrostructureGateStatusV2010;
  phase: MarketPhaseV2010;
  quoteAgeMs: number | null;
  spreadBps: number | null;
  atrPct: number | null;
  rvol: number | null;
  missingFields: string[];
  thresholds: MicrostructureThresholdsV2010;
}

export interface LiveMicrostructureGateInputV2010 {
  market: MicrostructureMarketV2010;
  price: number;
  bidPrice?: number;
  askPrice?: number;
  quoteUpdatedAt?: number;
  rvol?: number;
  atr14?: number;
  nowMs?: number;
}

const DEFAULT_MAX_QUOTE_AGE_MS = 10_000;

const THRESHOLDS: Record<MicrostructureMarketV2010, Record<Exclude<MarketPhaseV2010, "CLOSED">, MicrostructureThresholdsV2010>> = {
  KR: {
    OPENING: { maxQuoteAgeMs: DEFAULT_MAX_QUOTE_AGE_MS, maxSpreadBps: 35, minRvol: 1.30, minAtrPct: 0.0020 },
    REGULAR: { maxQuoteAgeMs: DEFAULT_MAX_QUOTE_AGE_MS, maxSpreadBps: 30, minRvol: 1.15, minAtrPct: 0.0015 },
    CLOSING: { maxQuoteAgeMs: DEFAULT_MAX_QUOTE_AGE_MS, maxSpreadBps: 35, minRvol: 1.20, minAtrPct: 0.0015 },
    CONTINUOUS: { maxQuoteAgeMs: DEFAULT_MAX_QUOTE_AGE_MS, maxSpreadBps: 35, minRvol: 1.20, minAtrPct: 0.0015 },
  },
  US: {
    OPENING: { maxQuoteAgeMs: DEFAULT_MAX_QUOTE_AGE_MS, maxSpreadBps: 40, minRvol: 1.40, minAtrPct: 0.0030 },
    REGULAR: { maxQuoteAgeMs: DEFAULT_MAX_QUOTE_AGE_MS, maxSpreadBps: 35, minRvol: 1.20, minAtrPct: 0.0020 },
    CLOSING: { maxQuoteAgeMs: DEFAULT_MAX_QUOTE_AGE_MS, maxSpreadBps: 40, minRvol: 1.25, minAtrPct: 0.0020 },
    CONTINUOUS: { maxQuoteAgeMs: DEFAULT_MAX_QUOTE_AGE_MS, maxSpreadBps: 40, minRvol: 1.25, minAtrPct: 0.0020 },
  },
  CRYPTO: {
    OPENING: { maxQuoteAgeMs: DEFAULT_MAX_QUOTE_AGE_MS, maxSpreadBps: 50, minRvol: 1.15, minAtrPct: 0.0020 },
    REGULAR: { maxQuoteAgeMs: DEFAULT_MAX_QUOTE_AGE_MS, maxSpreadBps: 50, minRvol: 1.15, minAtrPct: 0.0020 },
    CLOSING: { maxQuoteAgeMs: DEFAULT_MAX_QUOTE_AGE_MS, maxSpreadBps: 50, minRvol: 1.15, minAtrPct: 0.0020 },
    CONTINUOUS: { maxQuoteAgeMs: DEFAULT_MAX_QUOTE_AGE_MS, maxSpreadBps: 50, minRvol: 1.15, minAtrPct: 0.0020 },
  },
};

function finite(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function positive(v: unknown): v is number {
  return finite(v) && v > 0;
}

function localParts(nowMs: number, timeZone: string): { weekday: string; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(nowMs));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value || "";
  return { weekday: get("weekday"), hour: Number(get("hour")), minute: Number(get("minute")) };
}

function minuteOfDay(hour: number, minute: number): number {
  return hour * 60 + minute;
}

export function marketPhaseV2010(market: MicrostructureMarketV2010, nowMs = Date.now()): MarketPhaseV2010 {
  if (market === "CRYPTO") return "CONTINUOUS";
  const zone = market === "KR" ? "Asia/Seoul" : "America/New_York";
  const local = localParts(nowMs, zone);
  if (local.weekday === "Sat" || local.weekday === "Sun") return "CLOSED";
  const minute = minuteOfDay(local.hour, local.minute);

  if (market === "KR") {
    if (minute < 9 * 60 || minute >= 15 * 60 + 30) return "CLOSED";
    if (minute < 9 * 60 + 30) return "OPENING";
    if (minute >= 15 * 60 + 10) return "CLOSING";
    return "REGULAR";
  }

  if (minute < 9 * 60 + 30 || minute >= 16 * 60) return "CLOSED";
  if (minute < 10 * 60) return "OPENING";
  if (minute >= 15 * 60 + 30) return "CLOSING";
  return "REGULAR";
}

export function spreadBpsFromQuoteV2010(price: number, bidPrice?: number, askPrice?: number): number | null {
  if (!positive(price) || !positive(bidPrice) || !positive(askPrice) || askPrice < bidPrice) return null;
  const midpoint = (askPrice + bidPrice) / 2;
  if (!positive(midpoint)) return null;
  const spread = ((askPrice - bidPrice) / midpoint) * 10_000;
  return finite(spread) && spread >= 0 ? spread : null;
}

export function evaluateLiveMicrostructureV2010(input: LiveMicrostructureGateInputV2010): LiveMicrostructureEvidenceV2010 {
  const nowMs = finite(input.nowMs) ? input.nowMs : Date.now();
  const phase = marketPhaseV2010(input.market, nowMs);
  const thresholdPhase = phase === "CLOSED" ? "REGULAR" : phase;
  const thresholds = THRESHOLDS[input.market][thresholdPhase];
  const quoteAgeMs = finite(input.quoteUpdatedAt) ? Math.max(0, nowMs - input.quoteUpdatedAt) : null;
  const spreadBps = spreadBpsFromQuoteV2010(input.price, input.bidPrice, input.askPrice);
  const atrPct = positive(input.price) && positive(input.atr14) ? input.atr14 / input.price : null;
  const rvol = positive(input.rvol) ? input.rvol : null;
  const missingFields: string[] = [];
  if (!positive(input.bidPrice)) missingFields.push("bidPrice");
  if (!positive(input.askPrice)) missingFields.push("askPrice");
  if (!finite(input.quoteUpdatedAt)) missingFields.push("quoteUpdatedAt");
  if (rvol === null) missingFields.push("rvol");
  if (atrPct === null) missingFields.push("atr14");

  const base = { required: true as const, phase, quoteAgeMs, spreadBps, atrPct, rvol, missingFields, thresholds };
  if (phase === "CLOSED") return { ...base, passed: false, status: "MARKET_CLOSED" };
  if (missingFields.length > 0 || spreadBps === null) return { ...base, passed: false, status: "MICROSTRUCTURE_MISSING" };
  if (quoteAgeMs !== null && quoteAgeMs > thresholds.maxQuoteAgeMs) return { ...base, passed: false, status: "MICROSTRUCTURE_STALE" };
  if (spreadBps > thresholds.maxSpreadBps) return { ...base, passed: false, status: "SPREAD_TOO_WIDE" };
  if (rvol !== null && rvol < thresholds.minRvol) return { ...base, passed: false, status: "RVOL_TOO_LOW" };
  if (atrPct !== null && atrPct < thresholds.minAtrPct) return { ...base, passed: false, status: "VOLATILITY_TOO_LOW" };
  return { ...base, passed: true, status: "PASSED" };
}
