export class ExposureGuard {
  public static evaluate(
    currentPositionsCount: number,
    positionWeightPct: number,
    maxConcurrentPositions: number,
    maxPositionWeightPct: number
  ): { pass: boolean; reason?: string } {
    if (currentPositionsCount >= maxConcurrentPositions) {
      return { pass: false, reason: `POSITION_LIMIT: Active positions (${currentPositionsCount}) reached limit (${maxConcurrentPositions})` };
    }
    if (positionWeightPct > maxPositionWeightPct) {
      return { pass: false, reason: `POSITION_SIZE_LIMIT: Position weight ${positionWeightPct}% exceeds max limit (${maxPositionWeightPct}%)` };
    }
    return { pass: true };
  }
}
