// JUSIK2 V21 SETUP SCORER
// Evaluates transparent technical evidence to compute 0-100 score and S/A/B/WATCH grade.

import { FeedStatusV21, IndicatorSnapshotV21, MarketStructureV21, SetupGradeV21, SetupScoreV21 } from "./types";

export class SetupScorerV21 {
  public static evaluate(
    symbol: string,
    price: number,
    indicators: IndicatorSnapshotV21,
    structure: MarketStructureV21,
    status: FeedStatusV21,
    minScore = 70
  ): SetupScoreV21 {
    let score = 0;
    const reasons: string[] = [];
    const blockers: string[] = [];

    // 1. Data Feed Provenance Check
    if (status !== "REALTIME_VERIFIED") {
      blockers.push(`Feed status is ${status} (Requires REALTIME_VERIFIED)`);
    }

    // 2. Technical Evidence Scoring
    // VWAP Alignment (+20)
    if (indicators.vwap && price > indicators.vwap) {
      score += 20;
      reasons.push("Price above VWAP (+20)");
    } else {
      reasons.push("Price below VWAP (0)");
    }

    // EMA Trend Alignment (+15)
    if (indicators.ema9 && indicators.ema20 && indicators.ema9 > indicators.ema20) {
      score += 15;
      reasons.push("EMA9 > EMA20 Alignment (+15)");
    }

    if (indicators.ema20 && indicators.ema50 && indicators.ema20 > indicators.ema50) {
      score += 10;
      reasons.push("EMA20 > EMA50 Alignment (+10)");
    }

    // RSI Bullish Sweet Spot (+15)
    if (indicators.rsi14 != null && indicators.rsi14 >= 50 && indicators.rsi14 <= 72) {
      score += 15;
      reasons.push(`RSI14 Bullish Zone (${indicators.rsi14}) (+15)`);
    } else if (indicators.rsi14 != null && indicators.rsi14 > 72) {
      blockers.push(`RSI14 Overbought Warning (${indicators.rsi14})`);
    }

    // MACD Histogram (+10)
    if (indicators.macdHist != null && indicators.macdHist > 0) {
      score += 10;
      reasons.push("MACD Histogram Positive (+10)");
    }

    // Market Structure HH/HL (+10)
    if (structure.isHigherHighHigherLow) {
      score += 10;
      reasons.push("Higher Highs & Higher Lows Confirmed (+10)");
    }

    // Breakout / VWAP Reclaim (+10)
    if (structure.isBreakout || structure.isVwapReclaim) {
      score += 10;
      reasons.push(`Breakout / Reclaim Confirmed (+10)`);
    }

    // Volume Expansion / RVOL Check
    if (indicators.rvol != null && indicators.rvol < 1.0) {
      blockers.push(`Low RVOL Warning (${indicators.rvol}x < 1.0x)`);
    }

    // Chase Risk Filter: Price > 3.5% above VWAP
    if (indicators.vwap && (price - indicators.vwap) / indicators.vwap > 0.035) {
      blockers.push("Chase Risk Filter: Extended >3.5% above VWAP");
    }

    // Determine Grade
    let grade: SetupGradeV21 = "NO_SETUP";
    if (score >= 90) grade = "S";
    else if (score >= 80) grade = "A";
    else if (score >= 70) grade = "B";
    else if (score >= 55) grade = "WATCH";

    const isQualified = score >= minScore && grade !== "WATCH" && grade !== "NO_SETUP" && blockers.length === 0;

    return {
      symbol,
      score,
      grade,
      reasons,
      blockers,
      isQualified,
    };
  }
}
