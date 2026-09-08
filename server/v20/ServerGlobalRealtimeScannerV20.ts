// ----------------------------------------------------------------------
// SERVER GLOBAL REALTIME SCANNER V20.2
// TRUTH-FIRST / NO FABRICATED FALLBACKS
// KR + US + UPBIT
// ----------------------------------------------------------------------

export type MarketType = "KR" | "US" | "CRYPTO";

export type ExchangeType =
  | "KOSPI"
  | "KOSDAQ"
  | "NASDAQ"
  | "NYSE"
  | "AMEX"
  | "UPBIT"
  | "UNKNOWN";

export type DataTruthStatus =
  | "REALTIME_VERIFIED"
  | "REALTIME_DERIVED"
  | "STALE"
  | "NO_DATA"
  | "INVALID"
  | "CLOSED";

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

  recommendation:
    | "BUY_CANDIDATE"
    | "WATCH"
    | "REJECT";

  rejectionReason?: string;

  missingFields: string[];
  dataCoveragePct: number;

  timestamp: number;
}

function validNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function positive(v: unknown): v is number {
  return validNumber(v) && v > 0;
}

export class ServerGlobalRealtimeScannerV20 {
  public static evaluateCandidate(
    input: ScanCandidateInput
  ): ScanCandidateResult {
    const timestamp = Date.now();

    const reject = (
      reason: string,
      missingFields: string[] = []
    ): ScanCandidateResult => ({
      ...input,
      setupScore: 0,
      grade: "REJECT",
      recommendation: "REJECT",
      rejectionReason: reason,
      missingFields,
      dataCoveragePct: 0,
      timestamp
    });

    // ------------------------------------------------------------
    // 1. DATA TRUTH HARD GATE
    // ------------------------------------------------------------

    if (
      input.dataStatus !== "REALTIME_VERIFIED" &&
      input.dataStatus !== "REALTIME_DERIVED"
    ) {
      return reject(
        `DATA_TRUTH_REJECT:${input.dataStatus}`
      );
    }

    if (!positive(input.price)) {
      return reject("INVALID_PRICE");
    }

    if (!positive(input.volume)) {
      return reject("INVALID_OR_MISSING_VOLUME");
    }

    if (!positive(input.tradeValue)) {
      return reject("INVALID_OR_MISSING_TRADE_VALUE");
    }

    if (!positive(input.rvol)) {
      return reject("INVALID_OR_MISSING_RVOL");
    }

    if (input.chaseRisk) {
      return reject("CHASE_RISK_EXCEEDED");
    }

    if (input.exhaustionRisk) {
      return reject("EXHAUSTION_RISK_EXCEEDED");
    }

    // ------------------------------------------------------------
    // 2. DATA COVERAGE
    // Never replace unavailable fields with fake neutral values.
    // ------------------------------------------------------------

    const missingFields: string[] = [];

    const rsValues = [
      input.rs5m,
      input.rs15m,
      input.rs1h,
      input.rs1d
    ].filter(validNumber);

    if (rsValues.length === 0) {
      missingFields.push("relativeStrength");
    }

    if (!positive(input.vwap)) {
      missingFields.push("vwap");
    }

    if (!positive(input.ema20)) {
      missingFields.push("ema20");
    }

    if (!positive(input.atr14)) {
      missingFields.push("atr14");
    }

    if (!input.structureTrend) {
      missingFields.push("structureTrend");
    }

    const coverageChecks = [
      rsValues.length > 0,
      positive(input.vwap),
      positive(input.ema9),
      positive(input.ema20),
      positive(input.ema50),
      positive(input.atr14),
      validNumber(input.rsi14),
      validNumber(input.spreadBps),
      Boolean(input.structureTrend),
      Array.isArray(input.patterns)
    ];

    const availableCount =
      coverageChecks.filter(Boolean).length;

    const dataCoveragePct = Math.round(
      (availableCount / coverageChecks.length) * 100
    );

    // ------------------------------------------------------------
    // 3. SCORE ONLY REAL EVIDENCE
    // ------------------------------------------------------------

    let score = 35;

    // RVOL
    if (input.rvol >= 3.0) score += 22;
    else if (input.rvol >= 2.0) score += 17;
    else if (input.rvol >= 1.5) score += 11;
    else if (input.rvol >= 1.2) score += 5;
    else score -= 15;

    // Relative Strength
    if (rsValues.length > 0) {
      const rsAvg =
        rsValues.reduce((a, b) => a + b, 0) /
        rsValues.length;

      if (rsAvg >= 80) score += 17;
      else if (rsAvg >= 70) score += 12;
      else if (rsAvg >= 60) score += 7;
      else if (rsAvg < 45) score -= 10;
    }

    // VWAP
    if (positive(input.vwap)) {
      if (input.price > input.vwap) {
        score += 9;
      } else {
        score -= 8;
      }
    }

    // EMA alignment
    if (
      positive(input.ema9) &&
      positive(input.ema20)
    ) {
      if (input.ema9 > input.ema20) {
        score += 7;
      } else {
        score -= 5;
      }
    }

    if (
      positive(input.ema20) &&
      positive(input.ema50)
    ) {
      if (input.ema20 > input.ema50) {
        score += 5;
      }
    }

    // Structure
    if (input.structureTrend === "BULLISH") {
      score += 10;
    } else if (input.structureTrend === "BEARISH") {
      score -= 15;
    }

    // Breakout / Retest
    if (input.isBreakout) score += 7;
    if (input.isRetest) score += 6;

    // Spread
    if (validNumber(input.spreadBps)) {
      if (input.spreadBps > 80) score -= 20;
      else if (input.spreadBps > 50) score -= 12;
      else if (input.spreadBps <= 20) score += 3;
    }

    // Orderbook
    if (validNumber(input.orderbookImbalance)) {
      if (input.orderbookImbalance > 0.20) {
        score += 4;
      } else if (input.orderbookImbalance < -0.20) {
        score -= 6;
      }
    }

    // Signed Flow
    if (validNumber(input.signedFlow)) {
      if (input.signedFlow > 0) score += 3;
      if (input.signedFlow < 0) score -= 3;
    }

    score = Math.max(
      0,
      Math.min(100, Math.round(score))
    );

    // ------------------------------------------------------------
    // 4. QUALITY GATE
    // ------------------------------------------------------------

    const buyEvidenceComplete =
      input.dataStatus === "REALTIME_VERIFIED" &&
      dataCoveragePct >= 60 &&
      rsValues.length > 0 &&
      positive(input.vwap) &&
      positive(input.ema20) &&
      positive(input.rvol);

    let grade: ScanCandidateResult["grade"];
    let recommendation:
      ScanCandidateResult["recommendation"];

    if (score >= 88) {
      grade = "S";
      recommendation = "BUY_CANDIDATE";
    } else if (score >= 76) {
      grade = "A";
      recommendation = "BUY_CANDIDATE";
    } else if (score >= 62) {
      grade = "B";
      recommendation = "WATCH";
    } else {
      grade = "C";
      recommendation = "REJECT";
    }

    // REALTIME_DERIVED never becomes executable BUY.
    if (
      input.dataStatus === "REALTIME_DERIVED" &&
      recommendation === "BUY_CANDIDATE"
    ) {
      recommendation = "WATCH";
    }

    // Missing critical evidence never becomes BUY.
    if (
      recommendation === "BUY_CANDIDATE" &&
      !buyEvidenceComplete
    ) {
      recommendation = "WATCH";
    }

    return {
      ...input,
      setupScore: score,
      grade,
      recommendation,
      missingFields,
      dataCoveragePct,
      timestamp
    };
  }

  public static scanCandidates(
    candidates: ScanCandidateInput[]
  ): ScanCandidateResult[] {
    if (!Array.isArray(candidates)) return [];

    return candidates
      .map((candidate) =>
        this.evaluateCandidate(candidate)
      )
      .filter(
        (result) =>
          result.recommendation !== "REJECT"
      )
      .sort((a, b) => {
        if (b.setupScore !== a.setupScore) {
          return b.setupScore - a.setupScore;
        }

        return (
          b.dataCoveragePct -
          a.dataCoveragePct
        );
      });
  }
}
