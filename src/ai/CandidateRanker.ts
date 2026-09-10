import { AIScanDecision } from "./ScanDecisionSchema";

export class CandidateRanker {
  public static rank(candidates: AIScanDecision[]): AIScanDecision[] {
    return candidates
      .filter(c => this.isExecutableBuyCandidate(c))
      .sort((a, b) => {
        const scoreA = a.setupScore ?? 0;
        const scoreB = b.setupScore ?? 0;
        if (scoreB !== scoreA) return scoreB - scoreA;

        const confirmationA = this.confirmationCount(a);
        const confirmationB = this.confirmationCount(b);
        if (confirmationB !== confirmationA) return confirmationB - confirmationA;

        const chaseA = a.risks.chaseRisk ?? 1;
        const chaseB = b.risks.chaseRisk ?? 1;
        if (chaseA !== chaseB) return chaseA - chaseB;

        const falseBreakoutA = a.risks.falseBreakoutRisk ?? 1;
        const falseBreakoutB = b.risks.falseBreakoutRisk ?? 1;
        return falseBreakoutA - falseBreakoutB;
      });
  }

  public static top(candidates: AIScanDecision[], topN = 5): AIScanDecision[] {
    if (!Number.isFinite(topN) || topN <= 0) return [];
    return this.rank(candidates).slice(0, Math.floor(topN));
  }

  public static isExecutableBuyCandidate(candidate: AIScanDecision): boolean {
    const score = candidate.setupScore ?? 0;
    const chaseRisk = candidate.risks.chaseRisk ?? 1;

    return (
      candidate.dataStatus === "REALTIME_VERIFIED" &&
      candidate.action === "BUY_CANDIDATE" &&
      candidate.patternStatus === "CONFIRMED" &&
      score >= 78 &&
      candidate.evidence.aboveVwap === true &&
      candidate.evidence.rvolExpansion === true &&
      candidate.evidence.relativeStrength === true &&
      candidate.evidence.trendAligned === true &&
      candidate.evidence.breakoutConfirmed === true &&
      chaseRisk <= 0.05
    );
  }

  private static confirmationCount(candidate: AIScanDecision): number {
    return Object.values(candidate.evidence).filter(value => value === true).length;
  }
}
