import {
  ServerGlobalRealtimeScannerV20,
  type ScanCandidateInput,
  type ScanCandidateResult,
} from "./ServerGlobalRealtimeScannerV20";

/**
 * V20.9 Shadow baseline.
 *
 * V20.10 evidence is removed and the production scanner intentionally keeps
 * exact V20.9 spread/depth/flow scoring whenever that evidence is absent.
 * This avoids maintaining a second scanner implementation just for validation.
 */
export function evaluateV209BaselineForShadow(input: ScanCandidateInput): ScanCandidateResult {
  return ServerGlobalRealtimeScannerV20.evaluateCandidate({
    ...input,
    microstructure: undefined,
  });
}
