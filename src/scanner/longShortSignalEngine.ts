import {
  evaluateVerifiedSignal,
  type ScannerCandle,
  type VerifiedSignalResult,
} from "./verifiedSignalEngine";

export type LongShortDirection = "LONG" | "SHORT" | "WAIT";

export interface LongShortSignal {
  direction: LongShortDirection;
  longStrength: number;
  shortStrength: number;
  edge: number;
  confidenceLabel: "STRONG" | "MODERATE" | "WEAK";
  registeredPatterns: number;
  evaluatedPatterns: number;
  matchedPatterns: number;
  bullishPatterns: number;
  bearishPatterns: number;
  currentPrice: number;
  reasons: string[];
  warnings: string[];
  source: VerifiedSignalResult;
}

const EPS = 1e-9;

function finite(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeCandles(input: unknown[]): ScannerCandle[] {
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
    .filter((c) => c.open > 0 && c.high > 0 && c.low > 0 && c.close > 0 && c.high >= c.low);
}

function detectLowerHighLowerLow(candles: ScannerCandle[]): boolean {
  if (candles.length < 9) return false;
  const completed = candles.slice(0, -1);
  const a = completed.slice(-8, -4);
  const b = completed.slice(-4);
  if (a.length < 4 || b.length < 4) return false;
  return Math.max(...b.map((c) => c.high)) < Math.max(...a.map((c) => c.high))
    && Math.min(...b.map((c) => c.low)) < Math.min(...a.map((c) => c.low));
}

function fiveBarMomentum(candles: ScannerCandle[]): number {
  const completed = candles.slice(0, -1);
  if (completed.length < 6) return 0;
  const start = completed[completed.length - 6].close;
  const end = completed[completed.length - 1].close;
  return start > 0 ? (end / start - 1) * 100 : 0;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Converts the repository's executable pattern registry + technical state into
 * a two-sided dominance score. The percentages are signal-strength shares,
 * not a promised win probability or guaranteed return.
 */
export function evaluateLongShortSignal(inputCandles: unknown[]): LongShortSignal | null {
  const source = evaluateVerifiedSignal(inputCandles);
  if (!source) return null;

  const candles = normalizeCandles(inputCandles);
  if (candles.length < 56) return null;

  const m = source.metrics;
  let longRaw = 12;
  let shortRaw = 12;
  const longReasons: string[] = [];
  const shortReasons: string[] = [];
  const warnings: string[] = [];

  const fullLongTrend = m.close > m.ema9 && m.ema9 > m.ema20 && m.ema20 > m.ema50;
  const baseLongTrend = m.close > m.ema20 && m.ema20 > m.ema50;
  const fullShortTrend = m.close < m.ema9 && m.ema9 < m.ema20 && m.ema20 < m.ema50;
  const baseShortTrend = m.close < m.ema20 && m.ema20 < m.ema50;

  if (fullLongTrend) {
    longRaw += 24;
    longReasons.push("EMA9 > EMA20 > EMA50 정배열");
  } else if (baseLongTrend) {
    longRaw += 17;
    longReasons.push("가격 > EMA20 > EMA50 상승 구조");
  }
  if (fullShortTrend) {
    shortRaw += 24;
    shortReasons.push("EMA9 < EMA20 < EMA50 역배열");
  } else if (baseShortTrend) {
    shortRaw += 17;
    shortReasons.push("가격 < EMA20 < EMA50 하락 구조");
  }

  if (m.close >= m.vwap) {
    longRaw += 12;
    longReasons.push("가격이 VWAP 위");
  } else {
    shortRaw += 12;
    shortReasons.push("가격이 VWAP 아래");
  }

  if (m.macdHist > 0 && m.macd > m.macdSignal) {
    longRaw += 13;
    longReasons.push("MACD 상승 모멘텀");
  } else if (m.macdHist < 0 && m.macd < m.macdSignal) {
    shortRaw += 13;
    shortReasons.push("MACD 하락 모멘텀");
  }

  if (m.rsi >= 52 && m.rsi <= 74) {
    longRaw += 9;
    longReasons.push(`RSI ${m.rsi.toFixed(1)} 롱 모멘텀 구간`);
  } else if (m.rsi >= 26 && m.rsi <= 48) {
    shortRaw += 9;
    shortReasons.push(`RSI ${m.rsi.toFixed(1)} 쇼트 모멘텀 구간`);
  } else if (m.rsi > 78) {
    shortRaw += 4;
    warnings.push(`RSI ${m.rsi.toFixed(1)} 과열, 롱 추격 위험`);
  } else if (m.rsi < 22) {
    longRaw += 4;
    warnings.push(`RSI ${m.rsi.toFixed(1)} 과매도, 쇼트 추격 위험`);
  }

  const momentum = fiveBarMomentum(candles);
  if (momentum >= 1) {
    longRaw += Math.min(10, 4 + momentum);
    longReasons.push(`최근 5봉 +${momentum.toFixed(2)}% 모멘텀`);
  } else if (momentum <= -1) {
    shortRaw += Math.min(10, 4 + Math.abs(momentum));
    shortReasons.push(`최근 5봉 ${momentum.toFixed(2)}% 모멘텀`);
  }

  if (m.hhhl) {
    longRaw += 11;
    longReasons.push("Higher High / Higher Low 구조");
  }
  if (detectLowerHighLowerLow(candles)) {
    shortRaw += 11;
    shortReasons.push("Lower High / Lower Low 구조");
  }

  const bullishWeight = source.patternHits
    .filter((hit) => hit.direction === "BULLISH")
    .reduce((sum, hit) => sum + hit.weight * (hit.confidence === "STRONG" ? 1.25 : 1), 0);
  const bearishWeight = source.patternHits
    .filter((hit) => hit.direction === "BEARISH")
    .reduce((sum, hit) => sum + hit.weight * (hit.confidence === "STRONG" ? 1.25 : 1), 0);

  const bullishPatternPoints = Math.min(24, bullishWeight * 1.4);
  const bearishPatternPoints = Math.min(24, bearishWeight * 1.4);
  longRaw += bullishPatternPoints;
  shortRaw += bearishPatternPoints;

  if (source.patternRegistry.bullishMatched > 0) {
    longReasons.push(`상승 패턴 ${source.patternRegistry.bullishMatched}개 동시 포착`);
  }
  if (source.patternRegistry.bearishMatched > 0) {
    shortReasons.push(`하락 패턴 ${source.patternRegistry.bearishMatched}개 동시 포착`);
  }

  // RVOL is conviction, not direction. Give the currently leading side the boost.
  const volumeBoost = m.rvol >= 2 ? 9 : m.rvol >= 1.5 ? 6 : m.rvol >= 1.2 ? 3 : 0;
  if (volumeBoost > 0) {
    if (longRaw >= shortRaw) {
      longRaw += volumeBoost;
      longReasons.push(`RVOL ${m.rvol.toFixed(2)}x 방향 확인`);
    } else {
      shortRaw += volumeBoost;
      shortReasons.push(`RVOL ${m.rvol.toFixed(2)}x 방향 확인`);
    }
  } else {
    warnings.push(`RVOL ${m.rvol.toFixed(2)}x, 거래량 확신 부족`);
  }

  const total = Math.max(EPS, longRaw + shortRaw);
  const longStrength = clamp((longRaw / total) * 100);
  const shortStrength = clamp(100 - longStrength);
  const edge = Math.abs(longStrength - shortStrength);
  const leader = Math.max(longStrength, shortStrength);

  let direction: LongShortDirection = "WAIT";
  if (leader >= 60 && edge >= 14) {
    direction = longStrength > shortStrength ? "LONG" : "SHORT";
  }

  const matchedPatterns = source.patternRegistry.matched;
  if (matchedPatterns === 0) {
    warnings.push("등록 패턴 중 현재 일치 패턴 없음");
  }
  if (source.patternRegistry.evaluated < source.patternRegistry.registered) {
    warnings.push(
      `패턴 ${source.patternRegistry.registered}개 중 ${source.patternRegistry.evaluated}개만 현재 봉수로 평가 가능`,
    );
  }

  const confidenceLabel: LongShortSignal["confidenceLabel"] = direction === "WAIT"
    ? "WEAK"
    : leader >= 70 && edge >= 30 && matchedPatterns > 0
      ? "STRONG"
      : "MODERATE";

  const reasons = direction === "SHORT"
    ? shortReasons.slice(0, 7)
    : direction === "LONG"
      ? longReasons.slice(0, 7)
      : [
          ...longReasons.slice(0, 2).map((x) => `LONG: ${x}`),
          ...shortReasons.slice(0, 2).map((x) => `SHORT: ${x}`),
        ];

  return {
    direction,
    longStrength: Number(longStrength.toFixed(1)),
    shortStrength: Number(shortStrength.toFixed(1)),
    edge: Number(edge.toFixed(1)),
    confidenceLabel,
    registeredPatterns: source.patternRegistry.registered,
    evaluatedPatterns: source.patternRegistry.evaluated,
    matchedPatterns,
    bullishPatterns: source.patternRegistry.bullishMatched,
    bearishPatterns: source.patternRegistry.bearishMatched,
    currentPrice: m.close,
    reasons,
    warnings: warnings.slice(0, 5),
    source,
  };
}
