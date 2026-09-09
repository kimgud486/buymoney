import type { ScannerCandle } from "./verifiedSignalEngine";
import type { VerifiedPatternHit } from "./verifiedPatternEngine";

export const INTRADAY_PATTERN_REGISTRY = Object.freeze([
  { id: "ORB_BREAKOUT", direction: "BULLISH" as const, minBars: 4, timeframeMinutes: 5, openingRangeMinutes: 15 },
]);

const EPS = 1e-9;

function finite(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toEpochMs(candle: ScannerCandle): number {
  const raw = candle.timestamp ?? candle.time;
  if (typeof raw === "number") return raw < 1e12 ? raw * 1000 : raw;
  if (typeof raw === "string") {
    const numeric = Number(raw);
    if (Number.isFinite(numeric) && numeric > 0) return numeric < 1e12 ? numeric * 1000 : numeric;
    const parsed = Date.parse(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function kstParts(epochMs: number) {
  const shifted = new Date(epochMs + 9 * 60 * 60 * 1000);
  return {
    dateKey: `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}`,
    minuteOfDay: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

function normalize(input: unknown[]): ScannerCandle[] {
  return input
    .map((raw: any) => ({
      time: raw?.time ?? raw?.timestamp,
      timestamp: raw?.timestamp ?? raw?.time,
      open: finite(raw?.open),
      high: finite(raw?.high),
      low: finite(raw?.low),
      close: finite(raw?.close),
      volume: finite(raw?.volume),
    }))
    .filter((c) => toEpochMs(c) > 0 && c.open > 0 && c.high >= c.low && c.low > 0 && c.close > 0)
    .sort((a, b) => toEpochMs(a) - toEpochMs(b));
}

export type IntradayOrbEvaluation = {
  evaluated: boolean;
  matched: boolean;
  reason: string;
  openingRangeHigh: number;
  openingRangeLow: number;
  breakoutClose: number;
  rvol: number;
  hit: VerifiedPatternHit | null;
};

export function detectIntradayOrbBreakout(inputCandles: unknown[]): IntradayOrbEvaluation {
  const candles = normalize(inputCandles);
  if (candles.length < 4) {
    return { evaluated: false, matched: false, reason: "5분 완료봉이 4개 미만입니다.", openingRangeHigh: 0, openingRangeLow: 0, breakoutClose: 0, rvol: 0, hit: null };
  }

  const latest = candles[candles.length - 1];
  const latestParts = kstParts(toEpochMs(latest));
  const session = candles.filter((c) => kstParts(toEpochMs(c)).dateKey === latestParts.dateKey);
  const openMinute = 9 * 60;
  const openingEnd = openMinute + 15;
  const openingBars = session.filter((c) => {
    const minute = kstParts(toEpochMs(c)).minuteOfDay;
    return minute >= openMinute && minute < openingEnd;
  });
  const afterOpening = session.filter((c) => kstParts(toEpochMs(c)).minuteOfDay >= openingEnd);

  if (openingBars.length < 3 || afterOpening.length < 1) {
    return { evaluated: false, matched: false, reason: "09:00~09:15 개장범위 완료봉 또는 이후 완료봉이 부족합니다.", openingRangeHigh: 0, openingRangeLow: 0, breakoutClose: latest.close, rvol: 0, hit: null };
  }

  const openingRangeHigh = Math.max(...openingBars.map((c) => c.high));
  const openingRangeLow = Math.min(...openingBars.map((c) => c.low));
  const breakout = afterOpening[afterOpening.length - 1];
  const baselineVolumes = [...openingBars, ...afterOpening.slice(0, -1)].slice(-12).map((c) => Math.max(0, c.volume));
  const avgVolume = baselineVolumes.reduce((sum, value) => sum + value, 0) / Math.max(1, baselineVolumes.length);
  const rvol = avgVolume > EPS ? breakout.volume / avgVolume : 0;
  const rangeSize = Math.max(EPS, openingRangeHigh - openingRangeLow);
  const cleanBreak = breakout.close > openingRangeHigh && breakout.close >= breakout.low + Math.max(rangeSize * 0.15, (breakout.high - breakout.low) * 0.55);
  const volumeConfirmed = rvol >= 1.5;
  const matched = cleanBreak && volumeConfirmed;

  const hit: VerifiedPatternHit | null = matched
    ? {
        id: "ORB_BREAKOUT",
        name: "Opening Range Breakout",
        direction: "BULLISH",
        weight: 9,
        minBars: 4,
        confidence: rvol >= 2 ? "STRONG" : "NORMAL",
      }
    : null;

  return {
    evaluated: true,
    matched,
    reason: matched
      ? `15분 개장범위 상단 ${openingRangeHigh.toFixed(2)} 돌파 + 5분 RVOL ${rvol.toFixed(2)}x`
      : !cleanBreak
        ? `종가가 15분 개장범위 상단 ${openingRangeHigh.toFixed(2)}을 확정 돌파하지 못했습니다.`
        : `돌파 거래량이 부족합니다. 5분 RVOL ${rvol.toFixed(2)}x < 1.50x`,
    openingRangeHigh,
    openingRangeLow,
    breakoutClose: breakout.close,
    rvol,
    hit,
  };
}
