import { DailyLossGuard } from "./DailyLossGuard";
import { DrawdownGuard } from "./DrawdownGuard";
import { ExposureGuard } from "./ExposureGuard";
import { AutonomousRiskPolicy } from "./AutonomousRiskPolicy";

export interface PortfolioStateInput {
  currentPositionsCount: number;
  newPositionWeightPct: number;
  dailyPnlPct: number;
  portfolioDrawdownPct: number;
}

export class PortfolioRiskEngine {
  public static evaluate(state: PortfolioStateInput, policy: AutonomousRiskPolicy): { pass: boolean; reason?: string } {
    const dailyCheck = DailyLossGuard.evaluate(state.dailyPnlPct, policy.maxDailyLossPct);
    if (!dailyCheck.pass) return dailyCheck;

    const ddCheck = DrawdownGuard.evaluate(state.portfolioDrawdownPct, policy.maxPortfolioDrawdownPct);
    if (!ddCheck.pass) return ddCheck;

    const exposureCheck = ExposureGuard.evaluate(
      state.currentPositionsCount,
      state.newPositionWeightPct,
      policy.maxConcurrentPositions,
      policy.maxPositionWeightPct
    );
    if (!exposureCheck.pass) return exposureCheck;

    return { pass: true };
  }
}
