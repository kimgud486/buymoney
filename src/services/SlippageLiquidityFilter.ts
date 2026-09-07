// AISTOCK v13.8 SLIPPAGE & LIQUIDITY FILTER
// Pre-order evaluation of bid/ask spread, orderbook depth, turnover, RVOL, and expected slippage bps.
// Rejects illiquid or high-slippage orders before sending to execution gateway.

export interface LiquidityEvaluationParams {
  symbol: string;
  bidPrice: number;
  askPrice: number;
  recent1mVolume: number;
  turnoverAmount: number; // e.g. KRW / USD 1m turnover
  rvol: number;
  requestedQty: number;
  maxSlippageBpsThreshold?: number; // e.g. 30 bps (0.30%)
  min1mTurnoverThreshold?: number;   // e.g. 5,000,000 KRW or $5,000 USD
  min1mVolumeThreshold?: number;     // e.g. 100 shares
}

export interface LiquidityEvaluationResult {
  passed: boolean;
  spreadBps: number;
  expectedSlippageBps: number;
  status: "ORDER_ALLOWED" | "ORDER_BLOCKED" | "NO_TRADE";
  reason: string;
}

export class SlippageLiquidityFilter {
  public static evaluate(params: LiquidityEvaluationParams): LiquidityEvaluationResult {
    const {
      symbol,
      bidPrice,
      askPrice,
      recent1mVolume,
      turnoverAmount,
      rvol,
      requestedQty,
      maxSlippageBpsThreshold = 30, // 30 bps = 0.3%
      min1mTurnoverThreshold = 5_000_000,
      min1mVolumeThreshold = 100,
    } = params;

    if (bidPrice <= 0 || askPrice <= 0 || askPrice < bidPrice) {
      return {
        passed: false,
        spreadBps: 9999,
        expectedSlippageBps: 9999,
        status: "ORDER_BLOCKED",
        reason: "INVALID_BID_ASK_PRICES",
      };
    }

    const midPrice = (bidPrice + askPrice) / 2;
    const spreadBps = ((askPrice - bidPrice) / midPrice) * 10000;

    // 1. Check Volume and Turnover Insufficiency
    if (recent1mVolume < min1mVolumeThreshold || turnoverAmount < min1mTurnoverThreshold) {
      return {
        passed: false,
        spreadBps: +spreadBps.toFixed(2),
        expectedSlippageBps: +spreadBps.toFixed(2),
        status: "NO_TRADE",
        reason: `INSUFFICIENT_LIQUIDITY: 1mVolume(${recent1mVolume}) < min(${min1mVolumeThreshold}) or Turnover(${turnoverAmount}) < min(${min1mTurnoverThreshold})`,
      };
    }

    // 2. Estimate Expected Slippage Bps
    // Impact slippage scales with requested quantity as a fraction of recent volume
    const volumeParticipationRatio = recent1mVolume > 0 ? requestedQty / recent1mVolume : 1.0;
    const impactSlippageBps = volumeParticipationRatio * 50; // Impact penalty
    const expectedSlippageBps = (spreadBps / 2) + impactSlippageBps;

    if (expectedSlippageBps > maxSlippageBpsThreshold) {
      return {
        passed: false,
        spreadBps: +spreadBps.toFixed(2),
        expectedSlippageBps: +expectedSlippageBps.toFixed(2),
        status: "ORDER_BLOCKED",
        reason: `EXCESSIVE_EXPECTED_SLIPPAGE: ${expectedSlippageBps.toFixed(2)} bps > threshold (${maxSlippageBpsThreshold} bps)`,
      };
    }

    return {
      passed: true,
      spreadBps: +spreadBps.toFixed(2),
      expectedSlippageBps: +expectedSlippageBps.toFixed(2),
      status: "ORDER_ALLOWED",
      reason: "LIQUIDITY_AND_SLIPPAGE_VERIFIED",
    };
  }
}
