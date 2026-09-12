import {
  ServerGlobalRealtimeScannerV20,
  type ScanCandidateInput,
  type ScanCandidateResult,
} from "./ServerGlobalRealtimeScannerV20";

function validNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function positive(value: unknown): value is number {
  return validNumber(value) && value > 0;
}

/**
 * Validation-only reconstruction of the V20.9 scanner decision.
 *
 * It deliberately reuses the current scanner for truth normalization, hard
 * rejects, True-MTF and executable-pattern gates, then recomputes only the
 * V20.9 score section that V20.10 changed (spread/depth/flow treatment).
 * No synthetic market evidence is introduced.
 */
export function evaluateV209BaselineForShadow(input: ScanCandidateInput): ScanCandidateResult {
  const base = ServerGlobalRealtimeScannerV20.evaluateCandidate({
    ...input,
    microstructure: undefined,
  });

  // Hard rejects are identical between V20.9 and V20.10 when the live
  // microstructure gate is removed, so preserve them exactly.
  if (base.grade === "REJECT") return base;

  const rsValues = [base.rs5m, base.rs15m, base.rs1h, base.rs1d].filter(validNumber);
  let score = 35;

  if (base.rvol >= 3) score += 22;
  else if (base.rvol >= 2) score += 17;
  else if (base.rvol >= 1.5) score += 11;
  else if (base.rvol >= 1.2) score += 5;
  else score -= 15;

  if (rsValues.length) {
    const rsAvg = rsValues.reduce((sum, value) => sum + value, 0) / rsValues.length;
    if (rsAvg >= 80) score += 17;
    else if (rsAvg >= 70) score += 12;
    else if (rsAvg >= 60) score += 7;
    else if (rsAvg < 45) score -= 10;
  }

  if (positive(base.vwap)) score += base.price > base.vwap ? 9 : -8;
  if (positive(base.ema9) && positive(base.ema20)) score += base.ema9 > base.ema20 ? 7 : -5;
  if (positive(base.ema20) && positive(base.ema50) && base.ema20 > base.ema50) score += 5;
  if (base.structureTrend === "BULLISH") score += 10;
  else if (base.structureTrend === "BEARISH") score -= 15;
  if (base.isBreakout) score += 7;
  if (base.isRetest) score += 6;

  // Exact V20.9 microstructure-related score behavior.
  if (validNumber(base.spreadBps)) {
    if (base.spreadBps > 80) score -= 20;
    else if (base.spreadBps > 50) score -= 12;
    else if (base.spreadBps <= 20) score += 3;
  }
  if (validNumber(base.orderbookImbalance)) {
    if (base.orderbookImbalance > 0.2) score += 4;
    else if (base.orderbookImbalance < -0.2) score -= 6;
  }
  if (validNumber(base.signedFlow)) {
    score += base.signedFlow > 0 ? 3 : base.signedFlow < 0 ? -3 : 0;
  }
  if (base.patternGate.passed) {
    score += Math.min(6, base.patternGate.executableMatches.length * 2);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const buyEvidenceComplete = base.dataStatus === "REALTIME_VERIFIED"
    && base.dataCoveragePct >= 60
    && rsValues.length > 0
    && positive(base.vwap)
    && positive(base.ema20)
    && positive(base.rvol)
    && base.patternGate.passed
    && base.trueMtfGate.passed;

  let grade: ScanCandidateResult["grade"];
  let recommendation: ScanCandidateResult["recommendation"];
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

  if (base.dataStatus === "REALTIME_DERIVED" && recommendation === "BUY_CANDIDATE") {
    recommendation = "WATCH";
  }
  if (recommendation === "BUY_CANDIDATE" && !buyEvidenceComplete) {
    recommendation = "WATCH";
  }

  return {
    ...base,
    setupScore: score,
    grade,
    recommendation,
  };
}
