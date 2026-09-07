// ----------------------------------------------------------------------
// SERVER GLOBAL REALTIME SCANNER V20 (AISTOCK FINAL RC)
// Unified Multi-Market Scanner Pipeline for KR, US, and Upbit
// ----------------------------------------------------------------------

export type MarketType = "KR" | "US" | "CRYPTO";
export type ExchangeType = "KOSPI" | "KOSDAQ" | "NASDAQ" | "NYSE" | "AMEX" | "UPBIT" | "UNKNOWN";
export type DataTruthStatus = "REALTIME_VERIFIED" | "REALTIME_DERIVED" | "STALE" | "NO_DATA" | "INVALID" | "CLOSED";

export interface ScanCandidateInput {
  symbol: string;
  name: string;
  market: MarketType;
  exchange: ExchangeType;
  price: number;
  openPrice?: number;
  highPrice?: number;
  lowPrice?: number;
  changePct: number;
  gapPct?: number;
  volume: number;
  tradeValue: number;
  rvol: number;
  rs5m?: number;
  rs15m?: number;
  rs1h?: number;
  rs1d?: number;
  vwap?: number;
  ema9?: number;
  ema20?: number;
  ema50?: number;
  atr14?: number;
  rsi14?: number;
  spreadBps?: number;
  orderbookImbalance?: number;
  signedFlow?: number;
  patterns?: string[];
  structureTrend?: "BULLISH" | "BEARISH" | "SIDEWAYS";
  isBreakout?: boolean;
  isRetest?: boolean;
  chaseRisk?: boolean;
  exhaustionRisk?: boolean;
  dataStatus: DataTruthStatus;
}

export interface ScanCandidateResult extends ScanCandidateInput {
  setupScore: number;
  grade: "S" | "A" | "B" | "C" | "REJECT";
  recommendation: "BUY_CANDIDATE" | "WATCH" | "REJECT";
  rejectionReason?: string;
  timestamp: number;
}

export class ServerGlobalRealtimeScannerV20 {
  /**
   * Evaluate single candidate through strict V20 pipeline
   */
  public static evaluateCandidate(input: ScanCandidateInput): ScanCandidateResult {
    const timestamp = Date.now();

    // Data Truth Gate: STALE, NO_DATA, INVALID, or CLOSED must immediately REJECT
    if (input.dataStatus !== "REALTIME_VERIFIED" && input.dataStatus !== "REALTIME_DERIVED") {
      return {
        ...input,
        setupScore: 0,
        grade: "REJECT",
        recommendation: "REJECT",
        rejectionReason: `DATA_TRUTH_REJECT: Data status is ${input.dataStatus}`,
        timestamp
      };
    }

    if (!input.price || input.price <= 0) {
      return {
        ...input,
        setupScore: 0,
        grade: "REJECT",
        recommendation: "REJECT",
        rejectionReason: "INVALID_PRICE: Price <= 0",
        timestamp
      };
    }

    // Chase / Exhaustion Risk Filter
    if (input.chaseRisk || input.exhaustionRisk) {
      return {
        ...input,
        setupScore: 0,
        grade: "REJECT",
        recommendation: "REJECT",
        rejectionReason: input.chaseRisk ? "CHASE_RISK_EXCEEDED" : "EXHAUSTION_RISK_EXCEEDED",
        timestamp
      };
    }

    // Compute Base Setup Score
    let score = 50;

    // RVOL Boost (1.2+ minimum for strong setups)
    if (input.rvol >= 2.5) score += 20;
    else if (input.rvol >= 1.5) score += 12;
    else if (input.rvol < 1.0) score -= 15;

    // Relative Strength Boost (only average valid present timeframe values - no neutral 50 fillers)
    const validRsValues = [input.rs5m, input.rs15m, input.rs1h, input.rs1d].filter(
      (v): v is number => typeof v === "number" && !isNaN(v)
    );
    if (validRsValues.length > 0) {
      const rsAvg = validRsValues.reduce((sum, val) => sum + val, 0) / validRsValues.length;
      if (rsAvg >= 75) score += 15;
      else if (rsAvg >= 60) score += 8;
      else if (rsAvg < 45) score -= 10;
    }

    // VWAP & EMA Alignment
    if (input.vwap && input.price > input.vwap) score += 8;
    if (input.ema9 && input.ema20 && input.ema9 > input.ema20) score += 7;

    // Structure & Pattern Boost
    if (input.structureTrend === "BULLISH") score += 10;
    if (input.isBreakout) score += 8;
    if (input.isRetest) score += 5;

    // Spread Penalty (Spread > 50 bps)
    if (input.spreadBps && input.spreadBps > 50) score -= 15;

    const finalScore = Math.max(0, Math.min(100, Math.round(score)));

    let grade: ScanCandidateResult["grade"] = "REJECT";
    let recommendation: ScanCandidateResult["recommendation"] = "REJECT";

    if (finalScore >= 85) {
      grade = "S";
      recommendation = "BUY_CANDIDATE";
    } else if (finalScore >= 72) {
      grade = "A";
      recommendation = "BUY_CANDIDATE";
    } else if (finalScore >= 60) {
      grade = "B";
      recommendation = "WATCH";
    } else {
      grade = "C";
      recommendation = "REJECT";
    }

    // Data Truth Restriction: ONLY REALTIME_VERIFIED data can generate a BUY_CANDIDATE signal.
    // REALTIME_DERIVED is capped at WATCH at maximum.
    if (input.dataStatus !== "REALTIME_VERIFIED" && recommendation === "BUY_CANDIDATE") {
      recommendation = "WATCH";
      if (grade === "S" || grade === "A") {
        grade = "B";
      }
    }

    return {
      ...input,
      setupScore: finalScore,
      grade,
      recommendation,
      timestamp
    };
  }

  /**
   * Scan list of candidates and return top ranked candidates
   */
  public static scanCandidates(candidates: ScanCandidateInput[]): ScanCandidateResult[] {
    if (!candidates || candidates.length === 0) return [];

    return candidates
      .map((c) => this.evaluateCandidate(c))
      .filter((r) => r.recommendation !== "REJECT")
      .sort((a, b) => b.setupScore - a.setupScore);
  }
}
