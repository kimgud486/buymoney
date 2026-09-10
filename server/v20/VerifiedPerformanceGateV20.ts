export interface ClosedTradeV20 {
  pnlPct: number;
}

export interface VerifiedPerformanceConfigV20 {
  minSamples: number;
  strongWinRatePct: number;
  minProfitFactor: number;
  minExpectancyPct: number;
}

export interface VerifiedPerformanceResultV20 {
  sampleSize: number;
  wins: number;
  losses: number;
  winRatePct: number | null;
  profitFactor: number | null;
  expectancyPct: number | null;
  verified80Plus: boolean;
  blockers: string[];
}

const DEFAULT_CONFIG: VerifiedPerformanceConfigV20 = {
  minSamples: 30,
  strongWinRatePct: 80,
  minProfitFactor: 1.5,
  minExpectancyPct: 0
};

function finite(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

export class VerifiedPerformanceGateV20 {
  public static evaluate(
    trades: ClosedTradeV20[] | undefined,
    config?: Partial<VerifiedPerformanceConfigV20>
  ): VerifiedPerformanceResultV20 {
    const cfg = { ...DEFAULT_CONFIG, ...(config || {}) };
    const clean = (trades || []).filter((t) => finite(t.pnlPct));
    const blockers: string[] = [];
    const sampleSize = clean.length;

    if (sampleSize === 0) {
      return {
        sampleSize: 0,
        wins: 0,
        losses: 0,
        winRatePct: null,
        profitFactor: null,
        expectancyPct: null,
        verified80Plus: false,
        blockers: ["NO_VERIFIED_CLOSED_TRADES"]
      };
    }

    const wins = clean.filter((t) => t.pnlPct > 0);
    const losses = clean.filter((t) => t.pnlPct <= 0);
    const grossProfit = wins.reduce((sum, t) => sum + t.pnlPct, 0);
    const grossLossAbs = Math.abs(losses.reduce((sum, t) => sum + t.pnlPct, 0));
    const winRatePct = (wins.length / sampleSize) * 100;
    const profitFactor = grossLossAbs > 0 ? grossProfit / grossLossAbs : (grossProfit > 0 ? Infinity : 0);
    const expectancyPct = clean.reduce((sum, t) => sum + t.pnlPct, 0) / sampleSize;

    if (sampleSize < cfg.minSamples) blockers.push(`INSUFFICIENT_SAMPLE:${sampleSize}/${cfg.minSamples}`);
    if (winRatePct < cfg.strongWinRatePct) blockers.push(`WIN_RATE_BELOW_TARGET:${winRatePct.toFixed(1)}%`);
    if (profitFactor < cfg.minProfitFactor) blockers.push(`PROFIT_FACTOR_TOO_LOW:${profitFactor.toFixed(2)}`);
    if (expectancyPct <= cfg.minExpectancyPct) blockers.push(`EXPECTANCY_NOT_POSITIVE:${expectancyPct.toFixed(3)}%`);

    return {
      sampleSize,
      wins: wins.length,
      losses: losses.length,
      winRatePct,
      profitFactor,
      expectancyPct,
      verified80Plus: blockers.length === 0,
      blockers
    };
  }
}
