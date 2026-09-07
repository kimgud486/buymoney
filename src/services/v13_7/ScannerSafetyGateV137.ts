import type { CandidateStockInput } from "./typesV137";

export interface SafetyGateResult {
  passSafetyGate: boolean;
  chaseRiskBlocked: boolean;
  liquidityBlocked: boolean;
  rvolBlocked: boolean;
  relativeStrengthBlocked: boolean;
  vwapAlignmentBlocked: boolean;
  staleDataBlocked: boolean;
  netEdgeBlocked: boolean;
  finalScoreMultiplier: number; // 0 if blocked, else 1.0
  rejectionReason?: string;
}

export class ScannerSafetyGateV137 {
  /**
   * Evaluates candidate stock against v13.7 safety rules.
   * If chaseRisk is true or liquidity fails, score is zeroed out immediately.
   */
  public static evaluate(candidate: CandidateStockInput): SafetyGateResult {
    const chaseRiskBlocked = candidate.chaseRisk === true;
    const liquidityBlocked = candidate.liquidityPass === false;
    const effectiveRvol = candidate.todRvol ?? candidate.rvol;
    const rvolBlocked = effectiveRvol < 1.2;
    const relativeStrengthBlocked = candidate.relativeStrength < 55;
    const vwapAlignmentBlocked = candidate.vwapAligned === false;
    const staleDataBlocked = candidate.isStaleData === true;
    const netEdgeBlocked = candidate.expectedNetEdgePct !== undefined && candidate.expectedNetEdgePct <= 0;

    const passSafetyGate =
      !chaseRiskBlocked &&
      !liquidityBlocked &&
      !rvolBlocked &&
      !relativeStrengthBlocked &&
      !vwapAlignmentBlocked &&
      !staleDataBlocked &&
      !netEdgeBlocked;

    const reasons: string[] = [];
    if (chaseRiskBlocked) reasons.push("CHASE_RISK_HIGH");
    if (liquidityBlocked) reasons.push("LIQUIDITY_FAILED");
    if (rvolBlocked) reasons.push(`RVOL_TOO_LOW:${effectiveRvol.toFixed(2)}<1.2`);
    if (relativeStrengthBlocked) reasons.push(`RS_TOO_LOW:${candidate.relativeStrength}<55`);
    if (vwapAlignmentBlocked) reasons.push("VWAP_ALIGNMENT_FAILED");
    if (staleDataBlocked) reasons.push("STALE_DATA_REJECTED");
    if (netEdgeBlocked) reasons.push("NEGATIVE_EXPECTED_NET_EDGE");

    return {
      passSafetyGate,
      chaseRiskBlocked,
      liquidityBlocked,
      rvolBlocked,
      relativeStrengthBlocked,
      vwapAlignmentBlocked,
      staleDataBlocked,
      netEdgeBlocked,
      finalScoreMultiplier: passSafetyGate ? 1.0 : 0.0,
      rejectionReason: reasons.length > 0 ? reasons.join(" | ") : undefined
    };
  }
}
