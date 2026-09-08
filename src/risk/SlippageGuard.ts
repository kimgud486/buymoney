export class SlippageGuard {
  public static evaluate(
    spreadBps: number | null,
    estimatedSlippageBps: number | null,
    maxSpreadBps: number,
    maxSlippageBps: number
  ): { pass: boolean; reason?: string } {
    if (spreadBps == null) {
      return { pass: false, reason: "SPREAD_REJECT: Spread bps missing or unverified" };
    }
    if (spreadBps > maxSpreadBps) {
      return { pass: false, reason: `SPREAD_REJECT: Spread ${spreadBps}bps exceeds limit ${maxSpreadBps}bps` };
    }
    if (estimatedSlippageBps == null) {
      return { pass: false, reason: "SLIPPAGE_REJECT: Estimated slippage missing or unverified" };
    }
    if (estimatedSlippageBps > maxSlippageBps) {
      return { pass: false, reason: `SLIPPAGE_REJECT: Estimated slippage ${estimatedSlippageBps}bps exceeds limit ${maxSlippageBps}bps` };
    }
    return { pass: true };
  }
}
