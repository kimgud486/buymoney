import {
  ServerGlobalRealtimeScannerV20,
  type ScanCandidateInput,
  type ScanCandidateResult,
} from "./ServerGlobalRealtimeScannerV20";
import { evaluateV209BaselineForShadow } from "./V209ShadowBaselineEvaluator";
import {
  V2010ShadowComparisonRecorder,
  v2010ShadowComparisonRecorder,
} from "./V2010ShadowComparisonRecorder";

export interface V2010ShadowDecisionPolicyOptions {
  enforce?: boolean;
  observedAt?: number;
  record?: boolean;
  recorder?: V2010ShadowComparisonRecorder;
  /** Optional result from a direct server authority call. */
  v2010Result?: ScanCandidateResult;
}

export interface V2010ShadowDecisionResult {
  production: ScanCandidateResult;
  baseline: ScanCandidateResult;
  v2010: ScanCandidateResult;
  enforced: boolean;
}

export function v2010EnforcementEnabled(envValue = process.env.AISTOCK_V20_10_ENFORCE): boolean {
  return envValue === "1";
}

/**
 * Runs V20.9 and V20.10 on the same server-owned candidate.
 *
 * Default production behavior is intentionally V20.9. V20.10 is Shadow-only
 * until AISTOCK_V20_10_ENFORCE=1 is explicitly enabled after evidence review.
 * This lets real observations accumulate without changing BUY decisions first.
 *
 * Final server authority may pass a precomputed direct scanner result so the
 * existing authority chain remains explicit and auditable.
 */
export function evaluateCandidateWithV2010ShadowPolicy(
  input: ScanCandidateInput,
  options: V2010ShadowDecisionPolicyOptions = {},
): V2010ShadowDecisionResult {
  const observedAt = Number.isFinite(options.observedAt) ? options.observedAt! : Date.now();
  const baseline = evaluateV209BaselineForShadow(input);
  const v2010 = options.v2010Result ?? ServerGlobalRealtimeScannerV20.evaluateCandidate(input);
  const enforced = options.enforce ?? v2010EnforcementEnabled();

  if (options.record !== false) {
    const recorder = options.recorder ?? v2010ShadowComparisonRecorder;
    recorder.observeQuote(input.symbol, input.price, observedAt);
    recorder.recordComparison(baseline, v2010, observedAt);
  }

  return {
    production: enforced ? v2010 : baseline,
    baseline,
    v2010,
    enforced,
  };
}
