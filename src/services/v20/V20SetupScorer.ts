// AISTOCK V20 SETUP SCORER
// Evaluates transparent, auditable technical evidence to compute a 0-100 Setup Score.

export interface V20SetupInput {
  price: number;
  vwap?: number | null;
  ema9?: number | null;
  ema20?: number | null;
  macdHist?: number | null;
  rsi14?: number | null;
  isHigherHighHigherLow?: boolean;
  isBreakoutConfirmed?: boolean;
  rvol?: number | null;
  volumeExpansion?: boolean;
  dataStatus?: "REALTIME_VERIFIED" | "REALTIME_DERIVED" | "STALE" | "NO_DATA";
}

export interface V20SetupScoreResult {
  score: number; // 0 to 100
  isQualified: boolean; // >= minScore AND REALTIME_VERIFIED
  breakdown: {
    vwapPoints: number;
    emaPoints: number;
    macdPoints: number;
    rsiPoints: number;
    structurePoints: number;
    breakoutPoints: number;
    volumePoints: number;
  };
  reasons: string[];
}

export class V20SetupScorer {
  public static evaluate(
    input: V20SetupInput,
    minScoreThreshold = 70
  ): V20SetupScoreResult {
    let score = 0;
    const reasons: string[] = [];

    let vwapPoints = 0;
    let emaPoints = 0;
    let macdPoints = 0;
    let rsiPoints = 0;
    let structurePoints = 0;
    let breakoutPoints = 0;
    let volumePoints = 0;

    // 1. VWAP Check (+20)
    if (input.vwap != null && input.vwap > 0 && input.price > input.vwap) {
      vwapPoints = 20;
      score += 20;
      reasons.push("Price above VWAP (+20)");
    }

    // 2. EMA Alignment (+15)
    if (
      input.ema9 != null &&
      input.ema20 != null &&
      input.ema9 > input.ema20
    ) {
      emaPoints = 15;
      score += 15;
      reasons.push("EMA9 > EMA20 Alignment (+15)");
    }

    // 3. MACD Histogram (+15)
    if (input.macdHist != null && input.macdHist > 0) {
      macdPoints = 15;
      score += 15;
      reasons.push("Positive MACD Histogram (+15)");
    }

    // 4. RSI Sweet Spot (+10)
    if (input.rsi14 != null && input.rsi14 >= 50 && input.rsi14 <= 72) {
      rsiPoints = 10;
      score += 10;
      reasons.push(`RSI14 in Bullish Zone (${input.rsi14.toFixed(1)}) (+10)`);
    }

    // 5. Structure HH/HL (+15)
    if (input.isHigherHighHigherLow) {
      structurePoints = 15;
      score += 15;
      reasons.push("Higher Highs & Higher Lows Confirmed (+15)");
    }

    // 6. Breakout (+15)
    if (input.isBreakoutConfirmed) {
      breakoutPoints = 15;
      score += 15;
      reasons.push("Technical Breakout Confirmed (+15)");
    }

    // 7. Volume Expansion / RVOL (+10)
    if (input.volumeExpansion || (input.rvol != null && input.rvol >= 1.5)) {
      volumePoints = 10;
      score += 10;
      reasons.push(`Volume Expansion (RVOL: ${input.rvol?.toFixed(2) ?? "1.5+"}) (+10)`);
    }

    const isVerified = input.dataStatus === "REALTIME_VERIFIED";
    const isQualified = score >= minScoreThreshold && isVerified;

    if (!isVerified) {
      reasons.push("REJECT: Data feed is not REALTIME_VERIFIED");
    }

    return {
      score,
      isQualified,
      breakdown: {
        vwapPoints,
        emaPoints,
        macdPoints,
        rsiPoints,
        structurePoints,
        breakoutPoints,
        volumePoints,
      },
      reasons,
    };
  }
}
