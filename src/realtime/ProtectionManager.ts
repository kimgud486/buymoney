export interface ProtectionCheckInput {
  symbol: string;
  consecutiveLosses: number;
  maxConsecutiveLossAllowed: number;
  currentDrawdownPct: number;
  maxDrawdownLimitPct: number;
  lastTradeTimestamp?: number;
  cooldownPeriodMs?: number;
  setupWinRatePct?: number;
  minSetupWinRatePct?: number;
  priceDistanceUpperBandPct?: number;
  maxChaseDistancePct?: number;
}

export interface ProtectionResult {
  allowed: boolean;
  blockedBy: string[];
}

export class ProtectionManager {
  public static evaluate(input: ProtectionCheckInput): ProtectionResult {
    const blockedBy: string[] = [];

    // 1. LossStreakGuard
    if (input.consecutiveLosses >= input.maxConsecutiveLossAllowed) {
      blockedBy.push("LossStreakGuard: Max consecutive losses reached");
    }

    // 2. MaxDrawdownGuard
    if (input.currentDrawdownPct >= input.maxDrawdownLimitPct) {
      blockedBy.push("MaxDrawdownGuard: Max drawdown limit breached");
    }

    // 3. SymbolCooldownGuard
    if (input.lastTradeTimestamp && input.cooldownPeriodMs) {
      if (Date.now() - input.lastTradeTimestamp < input.cooldownPeriodMs) {
        blockedBy.push("SymbolCooldownGuard: Symbol is in cooldown period");
      }
    }

    // 4. SetupUnderperformanceGuard
    if (
      input.setupWinRatePct !== undefined &&
      input.minSetupWinRatePct !== undefined &&
      input.setupWinRatePct < input.minSetupWinRatePct
    ) {
      blockedBy.push("SetupUnderperformanceGuard: Setup win rate below threshold");
    }

    // 5. ChaseRiskGuard
    if (
      input.priceDistanceUpperBandPct !== undefined &&
      input.maxChaseDistancePct !== undefined &&
      input.priceDistanceUpperBandPct > input.maxChaseDistancePct
    ) {
      blockedBy.push("ChaseRiskGuard: Price chased too far above support/MA");
    }

    return {
      allowed: blockedBy.length === 0,
      blockedBy
    };
  }
}

export function monotonicTrailingFloor(previous: number, proposed: number): number {
  if (!Number.isFinite(proposed) || proposed <= 0) {
    return previous;
  }
  return Math.max(previous, proposed);
}
