import type { ScannerCandle } from "./verifiedSignalEngine";

export type IntradayPatternId =
  | "ORB_BREAKOUT"
  | "OPENING_DRIVE"
  | "VWAP_RETEST_HOLD"
  | "FIRST_PULLBACK_HOLD_INTRADAY";

export interface VerifiedIntradayPatternHit {
  id: IntradayPatternId;
  direction: "BULLISH";
  confidence: "STRONG" | "NORMAL";
  reason: string;
}

export interface VerifiedIntradayPatternResult {
  timeframeMinutes: 1 | 5;
  sessionDate: string;
  completedBars: number;
  hits: VerifiedIntradayPatternHit[];
  blocked: boolean;
  blockReason?: string;
  metrics: {
    vwap: number;
    rvol: number;
    openingRangeHigh: number;
    openingRangeLow: number;
  };
}

const EPS = 1e-9;

function toMs(value: string | number | undefined): number {
  if (typeof value === "number") return value < 10_000_000_000 ? value * 1000 : value;
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function avg(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function sessionVwap(candles: ScannerCandle[]): number {
  let pv = 0;
  let vol = 0;
  for (const c of candles) {
    const v = Math.max(0, c.volume);
    pv += ((c.high + c.low + c.close) / 3) * v;
    vol += v;
  }
  return vol > 0 ? pv / vol : candles[candles.length - 1]?.close ?? 0;
}

function rvol(candles: ScannerCandle[], lookback = 20): number {
  if (candles.length < lookback + 1) return 0;
  const current = Math.max(0, candles[candles.length - 1].volume);
  const base = avg(candles.slice(-(lookback + 1), -1).map((c) => Math.max(0, c.volume)));
  return base > 0 ? current / base : 0;
}

function sameSession(a: ScannerCandle, b: ScannerCandle): boolean {
  const ta = new Date(toMs(a.time ?? a.timestamp));
  const tb = new Date(toMs(b.time ?? b.timestamp));
  return ta.getUTCFullYear() === tb.getUTCFullYear()
    && ta.getUTCMonth() === tb.getUTCMonth()
    && ta.getUTCDate() === tb.getUTCDate();
}

export function evaluateVerifiedIntradayPatterns(
  input: ScannerCandle[],
  timeframeMinutes: 1 | 5,
): VerifiedIntradayPatternResult | null {
  const candles = input
    .filter((c) => c.open > 0 && c.high >= c.low && c.close > 0)
    .slice()
    .sort((a, b) => toMs(a.time ?? a.timestamp) - toMs(b.time ?? b.timestamp));

  if (candles.length < 8) return null;
  const last = candles[candles.length - 1];
  const session = candles.filter((c) => sameSession(c, last));
  if (session.length < 4) return null;

  const nowBucket = Math.floor(Date.now() / (timeframeMinutes * 60_000));
  const lastBucket = Math.floor(toMs(last.time ?? last.timestamp) / (timeframeMinutes * 60_000));
  const completed = lastBucket < nowBucket ? session : session.slice(0, -1);
  if (completed.length < 3) {
    return {
      timeframeMinutes,
      sessionDate: new Date(toMs(last.time ?? last.timestamp)).toISOString().slice(0, 10),
      completedBars: completed.length,
      hits: [],
      blocked: true,
      blockReason: "완료된 장중 봉이 부족함",
      metrics: { vwap: 0, rvol: 0, openingRangeHigh: 0, openingRangeLow: 0 },
    };
  }

  const latest = completed[completed.length - 1];
  const previous = completed[completed.length - 2];
  const openingBars = timeframeMinutes === 1 ? completed.slice(0, 5) : completed.slice(0, 3);
  const openingRangeHigh = Math.max(...openingBars.map((c) => c.high));
  const openingRangeLow = Math.min(...openingBars.map((c) => c.low));
  const currentVwap = sessionVwap(completed);
  const previousVwap = sessionVwap(completed.slice(0, -1));
  const currentRvol = rvol(completed, Math.min(20, completed.length - 1));
  const hits: VerifiedIntradayPatternHit[] = [];

  const push = (hit: VerifiedIntradayPatternHit) => {
    if (!hits.some((item) => item.id === hit.id)) hits.push(hit);
  };

  if (completed.length > openingBars.length && latest.close > openingRangeHigh && currentRvol >= 1.5) {
    push({
      id: "ORB_BREAKOUT",
      direction: "BULLISH",
      confidence: currentRvol >= 2 ? "STRONG" : "NORMAL",
      reason: `완료봉 종가가 Opening Range High 돌파 + RVOL ${currentRvol.toFixed(2)}x`,
    });
  }

  const first = completed[0];
  const openingRange = Math.max(EPS, first.high - first.low);
  const firstBody = first.close - first.open;
  if (firstBody > 0 && firstBody / openingRange >= 0.65 && completed.slice(0, Math.min(3, completed.length)).every((c) => c.close >= c.open)) {
    push({
      id: "OPENING_DRIVE",
      direction: "BULLISH",
      confidence: currentRvol >= 1.8 ? "STRONG" : "NORMAL",
      reason: "장 초반 연속 양봉 + 첫 봉 몸통 지배력이 강함",
    });
  }

  if (previous.close >= previousVwap && latest.low <= currentVwap * 1.003 && latest.close > currentVwap && latest.close > latest.open) {
    push({
      id: "VWAP_RETEST_HOLD",
      direction: "BULLISH",
      confidence: currentRvol >= 1.5 ? "STRONG" : "NORMAL",
      reason: "VWAP 재시험 후 완료봉이 VWAP 위에서 양봉 마감",
    });
  }

  const breakoutIndex = completed.findIndex((c, i) => i >= openingBars.length && c.close > openingRangeHigh);
  if (breakoutIndex >= 0 && breakoutIndex < completed.length - 1) {
    const pullback = completed.slice(breakoutIndex + 1);
    const breakout = completed[breakoutIndex];
    const held = Math.min(...pullback.map((c) => c.low)) >= openingRangeHigh * 0.992;
    const avgPullbackVolume = avg(pullback.map((c) => c.volume));
    if (held && avgPullbackVolume < breakout.volume && latest.close > previous.close) {
      push({
        id: "FIRST_PULLBACK_HOLD_INTRADAY",
        direction: "BULLISH",
        confidence: latest.close > openingRangeHigh ? "STRONG" : "NORMAL",
        reason: "첫 돌파 후 저거래량 눌림이 Opening Range 위에서 지지됨",
      });
    }
  }

  return {
    timeframeMinutes,
    sessionDate: new Date(toMs(latest.time ?? latest.timestamp)).toISOString().slice(0, 10),
    completedBars: completed.length,
    hits,
    blocked: false,
    metrics: {
      vwap: currentVwap,
      rvol: currentRvol,
      openingRangeHigh,
      openingRangeLow,
    },
  };
}
