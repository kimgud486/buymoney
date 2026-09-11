// ----------------------------------------------------------------------
// SERVER GLOBAL REALTIME SCANNER V20.8
// TRUTH-FIRST / NO FABRICATED FALLBACKS
// KR + US + UPBIT
// BUY requires Truth Bridge + verified 1m/3m/5m/D + executable pattern + ensemble review.
// Score/grade are capped by actual evidence coverage so incomplete data cannot look A/S grade.
// ----------------------------------------------------------------------

import { TrueMTFEvidenceV20, TrueMTFGateResultV20, TrueMTFSignalGateV20 } from "./TrueMTFSignalGateV20";
import { ExecutablePatternGateResultV20, ExecutablePatternGateV20 } from "./ExecutablePatternGateV20";
import { ScannerCandidateTruthBridgeV20 } from "./ScannerCandidateTruthBridgeV20";
import { OpenSourceSignalEnsemble, ScannerEvidenceEvaluation } from "../../src/autonomous/OpenSourceSignalEnsemble";

export type MarketType = "KR" | "US" | "CRYPTO";
export type ExchangeType = "KOSPI" | "KOSDAQ" | "NASDAQ" | "NYSE" | "AMEX" | "UPBIT" | "UNKNOWN";
export type DataTruthStatus = "REALTIME_VERIFIED" | "REALTIME_DERIVED" | "STALE" | "NO_DATA" | "INVALID" | "CLOSED";

export interface ScanCandidateInput {
  symbol: string; name: string; market: MarketType; exchange: ExchangeType;
  price: number; openPrice?: number; highPrice?: number; lowPrice?: number;
  changePct: number; gapPct?: number;
  volume: number; tradeValue: number; rvol: number; liquiditySource?: string;
  rs5m?: number; rs15m?: number; rs1h?: number; rs1d?: number;
  vwap?: number; ema9?: number; ema20?: number; ema50?: number; atr14?: number; rsi14?: number;
  spreadBps?: number; orderbookImbalance?: number; signedFlow?: number;
  patterns?: string[]; structureTrend?: "BULLISH" | "BEARISH" | "SIDEWAYS";
  isBreakout?: boolean; isRetest?: boolean; chaseRisk?: boolean; exhaustionRisk?: boolean;
  trueMtf?: TrueMTFEvidenceV20; dataStatus: DataTruthStatus;
}

export interface ScanCandidateResult extends ScanCandidateInput {
  setupScore: number; grade: "S" | "A" | "B" | "C" | "REJECT";
  recommendation: "BUY_CANDIDATE" | "WATCH" | "REJECT"; rejectionReason?: string;
  missingFields: string[]; dataCoveragePct: number;
  trueMtfGate: TrueMTFGateResultV20; patternGate: ExecutablePatternGateResultV20;
  ensembleValidation: ScannerEvidenceEvaluation;
  timestamp: number;
}

function validNumber(v: unknown): v is number { return typeof v === "number" && Number.isFinite(v); }
function positive(v: unknown): v is number { return validNumber(v) && v > 0; }
function approximatelyEqual(a: number, b: number, relativeTolerance = 1e-9): boolean {
  const scale = Math.max(1, Math.abs(a), Math.abs(b)); return Math.abs(a - b) <= scale * relativeTolerance;
}
function hasSuspectDerivedLiquidityShape(input: ScanCandidateInput): boolean {
  if (!positive(input.price) || !positive(input.volume) || !positive(input.rvol) || !validNumber(input.tradeValue)) return false;
  return input.volume <= 20 && approximatelyEqual(input.volume, input.rvol, 1e-7) && approximatelyEqual(input.tradeValue, input.price * input.volume, 1e-7);
}

/**
 * Prevent an evidence-poor candidate from receiving an A/S-looking score.
 *  - <60% coverage: cannot exceed REJECT/C boundary (61)
 *  - 60-74%: cannot exceed B/WATCH boundary (75)
 *  - 75-89%: cannot exceed A boundary (87), but BUY still requires the hard evidence gate
 *  - >=90%: raw score is retained
 */
export function capScannerScoreByEvidence(rawScore: number, dataCoveragePct: number): number {
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));
  const coverage = Math.max(0, Math.min(100, Math.round(dataCoveragePct)));
  if (coverage < 60) return Math.min(score, 61);
  if (coverage < 75) return Math.min(score, 75);
  if (coverage < 90) return Math.min(score, 87);
  return score;
}

function emptyEnsembleValidation(reason: string): ScannerEvidenceEvaluation {
  return {
    decision: "NO",
    ensembleScore: 0,
    approvalRequired: true,
    liveAutoOrderEnabled: false,
    riskReasons: [reason],
    bullishReasons: [],
  };
}

export class ServerGlobalRealtimeScannerV20 {
  public static evaluateCandidate(input: ScanCandidateInput): ScanCandidateResult {
    const truthBridge = ScannerCandidateTruthBridgeV20.normalize(input);
    input = truthBridge.candidate;
    const timestamp = Date.now();
    const trueMtfGate = TrueMTFSignalGateV20.evaluate(input.trueMtf);
    const patternGate = ExecutablePatternGateV20.evaluate(input.patterns);
    const reject = (reason: string, missingFields: string[] = []): ScanCandidateResult => ({
      ...input, setupScore: 0, grade: "REJECT", recommendation: "REJECT", rejectionReason: reason,
      missingFields, dataCoveragePct: 0, trueMtfGate, patternGate,
      ensembleValidation: emptyEnsembleValidation(reason), timestamp
    });

    if (truthBridge.rejectionReason) return reject(truthBridge.rejectionReason, ["volume", "tradeValue"]);
    if (input.dataStatus !== "REALTIME_VERIFIED" && input.dataStatus !== "REALTIME_DERIVED") return reject(`DATA_TRUTH_REJECT:${input.dataStatus}`);
    if (!positive(input.price)) return reject("INVALID_PRICE");
    if (!positive(input.volume)) return reject("INVALID_OR_MISSING_VOLUME");
    if (!positive(input.tradeValue)) return reject("INVALID_OR_MISSING_TRADE_VALUE");
    if (!positive(input.rvol)) return reject("INVALID_OR_MISSING_RVOL");
    if (hasSuspectDerivedLiquidityShape(input)) return reject("SUSPECT_DERIVED_LIQUIDITY_FIELDS", ["authoritativeVolume", "authoritativeTradeValue"]);
    if (input.chaseRisk) return reject("CHASE_RISK_EXCEEDED");
    if (input.exhaustionRisk) return reject("EXHAUSTION_RISK_EXCEEDED");
    if (trueMtfGate.hardReject) return reject(`TRUE_MTF_HARD_REJECT:${trueMtfGate.blockers.join("|")}`);

    const missingFields: string[] = [];
    const rsValues = [input.rs5m, input.rs15m, input.rs1h, input.rs1d].filter(validNumber);
    if (rsValues.length === 0) missingFields.push("relativeStrength");
    if (!positive(input.vwap)) missingFields.push("vwap");
    if (!positive(input.ema20)) missingFields.push("ema20");
    if (!positive(input.atr14)) missingFields.push("atr14");
    if (!input.structureTrend) missingFields.push("structureTrend");
    if (!trueMtfGate.passed) missingFields.push("trueMTF:1m+3m+5m+D");
    if (!patternGate.passed) missingFields.push("executablePattern");

    const coverageChecks = [rsValues.length > 0, positive(input.vwap), positive(input.ema9), positive(input.ema20), positive(input.ema50), positive(input.atr14), validNumber(input.rsi14), validNumber(input.spreadBps), Boolean(input.structureTrend), patternGate.passed, trueMtfGate.passed];
    const dataCoveragePct = Math.round((coverageChecks.filter(Boolean).length / coverageChecks.length) * 100);

    let score = 35;
    if (input.rvol >= 3) score += 22; else if (input.rvol >= 2) score += 17; else if (input.rvol >= 1.5) score += 11; else if (input.rvol >= 1.2) score += 5; else score -= 15;
    if (rsValues.length) { const rsAvg = rsValues.reduce((a,b)=>a+b,0)/rsValues.length; if (rsAvg >= 80) score += 17; else if (rsAvg >= 70) score += 12; else if (rsAvg >= 60) score += 7; else if (rsAvg < 45) score -= 10; }
    if (positive(input.vwap)) score += input.price > input.vwap ? 9 : -8;
    if (positive(input.ema9) && positive(input.ema20)) score += input.ema9 > input.ema20 ? 7 : -5;
    if (positive(input.ema20) && positive(input.ema50) && input.ema20 > input.ema50) score += 5;
    if (input.structureTrend === "BULLISH") score += 10; else if (input.structureTrend === "BEARISH") score -= 15;
    if (input.isBreakout) score += 7; if (input.isRetest) score += 6;
    if (validNumber(input.spreadBps)) { if (input.spreadBps > 80) score -= 20; else if (input.spreadBps > 50) score -= 12; else if (input.spreadBps <= 20) score += 3; }
    if (validNumber(input.orderbookImbalance)) { if (input.orderbookImbalance > .2) score += 4; else if (input.orderbookImbalance < -.2) score -= 6; }
    if (validNumber(input.signedFlow)) score += input.signedFlow > 0 ? 3 : input.signedFlow < 0 ? -3 : 0;
    if (patternGate.passed) score += Math.min(6, patternGate.executableMatches.length * 2);
    score = capScannerScoreByEvidence(score, dataCoveragePct);

    const buyEvidenceComplete = input.dataStatus === "REALTIME_VERIFIED" && dataCoveragePct >= 60 && rsValues.length > 0 && positive(input.vwap) && positive(input.ema20) && positive(input.rvol) && patternGate.passed && trueMtfGate.passed;
    let grade: ScanCandidateResult["grade"]; let recommendation: ScanCandidateResult["recommendation"];
    if (score >= 88) { grade="S"; recommendation="BUY_CANDIDATE"; } else if (score >= 76) { grade="A"; recommendation="BUY_CANDIDATE"; } else if (score >= 62) { grade="B"; recommendation="WATCH"; } else { grade="C"; recommendation="REJECT"; }

    if (input.dataStatus === "REALTIME_DERIVED" && recommendation === "BUY_CANDIDATE") {
      recommendation = "WATCH";
      grade = "B";
      score = Math.min(score, 75);
    }
    if (recommendation === "BUY_CANDIDATE" && !buyEvidenceComplete) {
      recommendation = "WATCH";
      grade = "B";
      score = Math.min(score, 75);
    }

    const atrPct = positive(input.atr14) && positive(input.price) ? (input.atr14 / input.price) * 100 : null;
    const ensembleValidation = OpenSourceSignalEnsemble.evaluateScannerEvidence({
      symbol: input.symbol,
      name: input.name,
      market: input.market,
      sourceScore: score,
      dataCoveragePct,
      dataStatus: input.dataStatus,
      rvol: input.rvol,
      rsi: input.rsi14,
      atrPct,
      hasRelativeStrength: rsValues.length > 0,
      hasVwap: positive(input.vwap),
      hasEma20: positive(input.ema20),
      hasPattern: patternGate.passed,
      trueMtfPassed: trueMtfGate.passed,
      sourceRecommendation: recommendation,
    });

    // A BUY label must survive the independent ensemble review too. The ensemble never submits orders.
    if (recommendation === "BUY_CANDIDATE" && ensembleValidation.decision !== "REVIEW_READY") {
      recommendation = "WATCH";
      grade = "B";
      score = Math.min(score, 75);
      if (!missingFields.includes("ensembleReview")) missingFields.push("ensembleReview");
    }

    return { ...input, setupScore: score, grade, recommendation, missingFields, dataCoveragePct, trueMtfGate, patternGate, ensembleValidation, timestamp };
  }

  public static scanCandidates(candidates: ScanCandidateInput[]): ScanCandidateResult[] {
    if (!Array.isArray(candidates)) return [];
    return candidates.map(c=>this.evaluateCandidate(c)).filter(r=>r.recommendation!=="REJECT").sort((a,b)=>b.setupScore!==a.setupScore?b.setupScore-a.setupScore:b.dataCoveragePct-a.dataCoveragePct);
  }
  public static scanBuyCandidates(candidates: ScanCandidateInput[], topN=5): ScanCandidateResult[] {
    const limit=Math.max(0,Math.floor(topN)); if (!limit || !Array.isArray(candidates)) return [];
    return this.scanCandidates(candidates).filter(r=>r.recommendation==="BUY_CANDIDATE").slice(0,limit);
  }
}
