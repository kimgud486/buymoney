import { AIScanDecision } from "./ScanDecisionSchema";

export class CandidateRanker {
  public static rank(candidates: AIScanDecision[]): AIScanDecision[] {
    return candidates
      .filter(c => c.dataStatus === "REALTIME_VERIFIED" && c.action === "BUY_CANDIDATE")
      .sort((a, b) => {
        const scoreA = a.setupScore ?? 0;
        const scoreB = b.setupScore ?? 0;
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        // Secondary sort by risk ratio (lower chaseRisk preferred)
        const chaseA = a.risks.chaseRisk ?? 1;
        const chaseB = b.risks.chaseRisk ?? 1;
        return chaseA - chaseB;
      });
  }
}
