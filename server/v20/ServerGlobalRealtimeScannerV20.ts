// ----------------------------------------------------------------------
// SERVER GLOBAL REALTIME SCANNER V20.5
// TRUTH-FIRST / NO FABRICATED FALLBACKS
// KR + US + UPBIT
// BUY promotion requires verified 1m -> 3m -> 5m -> Daily evidence
// and at least one audited executable chart-pattern rule.
// ----------------------------------------------------------------------

import {
  TrueMTFEvidenceV20,
  TrueMTFGateResultV20,
  TrueMTFSignalGateV20
} from "./TrueMTFSignalGateV20";
import {
  ExecutablePatternGateResultV20,
  ExecutablePatternGateV20
} from "./ExecutablePatternGateV20";

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

  /**
   * Independent timeframe evidence. The final V20 BUY gate will not promote
   * a candidate to BUY_CANDIDATE unless 1m, 3m, 5m and Daily all pass.
   */
  trueMtf?: TrueMTFEvidenceV20;

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

  trueMtfGate: TrueMTFGateResultV20;
  patternGate: ExecutablePatternGateResultV20;

  timestamp: number;
}

function validNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function positive(v: unknown): v is number {
  return validNumber(v) && v > 0;
}

function approximatelyEqual(a: number, b: number, relativeTolerance = 1e-9): boolean {
  const scale = Math.max(1, Math.abs(a), Math.abs(b));
  return Math.abs(a - b) <= scale * relativeTolerance;
}

/**
 * Detects the known legacy hot-list fallback shape where an RVOL ratio was
 * copied into `volume`, and `tradeValue` was then manufactured as price*RVOL.
 * A ratio such as 1.8x is evidence about relative volume, not authoritative
 * traded shares/contracts. V20 must fail closed instead of treating it as
 * verified liquidity.
 */
function hasSuspectDerivedLiquidityShape(input: ScanCandidateInput): boolean {
  if (!positive(input.price) || !positive(input.volume) || !positive(input.rvol)) {
    return false;
  }

  if (!validNumber(input.tradeValue)) return false;

  const implausiblySmallAbsoluteVolume = input.volume <= 20;
  const volumeMirrorsRvol = approximatelyEqual(input.volume, input.rvol, 1e-7);
  const tradeValueMirrorsPriceTimesVolume = approximatelyEqual(
    input.tradeValue,
    input.price * input.volume,
    1e-7
  );

  return (
    implausiblySmallAbsoluteVolume &&
    volumeMirrorsRvol &&
    tradeValueMirrorsPriceTimesVolume
  );
}

export class ServerGlobalRealtimeScannerV20 {
  public static evaluateCandidate(
    input: ScanCandidateInput
  ): ScanCandidateResult {
    const timestamp = Date.now();
    const trueMtfGate = TrueMTFSignalGateV20.evaluate(input.trueMtf);
    const patternGate = ExecutablePatternGateV20.evaluate(input.patterns);

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
      trueMtfGate,
      patternGate,
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

    // Legacy compatibility paths must never be allowed to convert an RVOL
    // ratio into fake absolute volume/trade value and call it verified data.
    if (hasSuspectDerivedLiquidityShape(input)) {
      return reject("SUSPECT_DERIVED_LIQUIDITY_FIELDS", [
        "authoritativeVolume",
        "authoritativeTradeValue"
      ]);
    }

    if (input.chaseRisk) {
      return reject("CHASE_RISK_EXCEEDED");
    }

    if (input.exhaustionRisk) {
      return reject("EXHAUSTION_RISK_EXCEEDED");
    }

    if (trueMtfGate.hardReject) {
      return reject(
        `TRUE_MTF_HARD_REJECT:${trueMtfGate.blockers.join("|")}`
      );
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

    if (!trueMtfGate.passed) {
      missingFields.push("trueMTF:1m+3m+5m+D");
    }

    if (!patternGate.passed) {
      missingFields.push("executablePattern");
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
      patternGate.passed,
      trueMtfGate.passed
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

    if (input.rvol >= 3.0) score += 22;
    else if (input.rvol >= 2.0) score += 17;
    else if (input.rvol >= 1.5) score += 11;
    else if (input.rvol >= 1.2) score += 5;
    else score -= 15;

    if (rsValues.length > 0) {
      const rsAvg =
        rsValues.reduce((a, b) => a + b, 0) /
        rsValues.length;

      if (rsAvg >= 80) score += 17;
      else if (rsAvg >= 70) score += 12;
      else if (rsAvg >= 60) score += 7;
      else if (rsAvg < 45) score -= 10;
    }

    if (positive(input.vwap)) {
      if (input.price > input.vwap) {
        score += 9;
      } else {
        score -= 8;
      }
    }

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
      positive(input.ema50) &&
      input.ema20 > input.ema50
    ) {
      score += 5;
    }

    if (input.structureTrend === "BULLISH") {
      score += 10;
    } else if (input.structureTrend === "BEARISH") {
      score -= 15;
    }

    if (input.isBreakout) score += 7;
    if (input.isRetest) score += 6;

    if (validNumber(input.spreadBps)) {
      if (input.spreadBps > 80) score -= 20;
      else if (input.spreadBps > 50) score -= 12;
      else if (input.spreadBps <= 20) score += 3;
    }

    if (validNumber(input.orderbookImbalance)) {
      if (input.orderbookImbalance > 0.20) {
        score += 4;
      } else if (input.orderbookImbalance < -0.20) {
        score -= 6;
      }
    }

    if (validNumber(input.signedFlow)) {
      if (input.signedFlow > 0) score += 3;
      if (input.signedFlow < 0) score -= 3;
    }

    if (patternGate.passed) {
      score += Math.min(6, patternGate.executableMatches.length * 2);
    }

    score = Math.max(
      0,
      Math.min(100, Math.round(score))
    );

    // ------------------------------------------------------------
    // 4. QUALITY + TRUE MTF + EXECUTABLE PATTERN FINAL BUY GATE
    // ------------------------------------------------------------

    const buyEvidenceComplete =
      input.dataStatus === "REALTIME_VERIFIED" &&
      dataCoveragePct >= 60 &&
      rsValues.length > 0 &&
      positive(input.vwap) &&
      positive(input.ema20) &&
      positive(input.rvol) &&
      patternGate.passed &&
      trueMtfGate.passed;

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

    if (
      input.dataStatus === "REALTIME_DERIVED" &&
      recommendation === "BUY_CANDIDATE"
    ) {
      recommendation = "WATCH";
    }

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
      trueMtfGate,
      patternGate,
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

  public static scanBuyCandidates(
    candidates: ScanCandidateInput[],
    topN: number = 5
  ): ScanCandidateResult[] {
    const limit = Math.max(0, Math.floor(topN));
    if (limit === 0 || !Array.isArray(candidates)) return [];

    return this.scanCandidates(candidates)
      .filter((result) => result.recommendation === "BUY_CANDIDATE")
      .slice(0, limit);
  }
}
