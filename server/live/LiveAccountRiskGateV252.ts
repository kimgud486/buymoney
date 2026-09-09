/**
 * LiveAccountRiskGateV252.ts
 *
 * V25.2 LIVE Account Risk Gate
 * Enforces server-owned verification of real broker cash, equity, and position holdings.
 * Blocks browser request spoofing of balance or loss parameters.
 */

export interface LiveAccountRiskParams {
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  estimatedPrice: number;
  market: "KOREA" | "US" | "UPBIT";
  
  // Verified broker balances resolved from server environment/API
  verifiedCash: number;
  verifiedPortfolioValue: number;
  verifiedCurrentHoldingQty: number;
  
  maxPositionWeightPct?: number; // e.g. 20
}

export interface LiveAccountRiskValidationResult {
  passed: boolean;
  rejectReason?: string;
  projectedPositionWeightPct?: number;
}

export class LiveAccountRiskGateV252 {
  public static validateOrder(params: LiveAccountRiskParams): LiveAccountRiskValidationResult {
    const {
      symbol,
      side,
      quantity,
      estimatedPrice,
      market,
      verifiedCash,
      verifiedPortfolioValue,
      verifiedCurrentHoldingQty,
      maxPositionWeightPct = 20,
    } = params;

    // 1. Block US LIVE fail-closed until native USD adapter is ready
    if (market === "US") {
      return {
        passed: false,
        rejectReason: "US_LIVE_RISK_ADAPTER_NOT_READY_V252: US market requires native USD cash/equity risk adapter.",
      };
    }

    const orderAmount = quantity * estimatedPrice;

    // 2. SELL Validation
    if (side === "SELL") {
      if (quantity > verifiedCurrentHoldingQty) {
        return {
          passed: false,
          rejectReason: `INSUFFICIENT_HOLDING_QTY: Sell quantity (${quantity}) exceeds broker verified holding (${verifiedCurrentHoldingQty}).`,
        };
      }
      return { passed: true };
    }

    // 3. BUY Validation: Cash adequacy
    if (orderAmount > verifiedCash) {
      return {
        passed: false,
        rejectReason: `INSUFFICIENT_VERIFIED_CASH: Order amount (${orderAmount.toLocaleString()}) exceeds verified broker cash (${verifiedCash.toLocaleString()}).`,
      };
    }

    // 4. BUY Validation: Maximum position weight constraint
    const currentHoldingValue = verifiedCurrentHoldingQty * estimatedPrice;
    const projectedHoldingValue = currentHoldingValue + orderAmount;
    const totalEquity = Math.max(verifiedPortfolioValue, verifiedCash);
    
    if (totalEquity <= 0) {
      return {
        passed: false,
        rejectReason: "INVALID_PORTFOLIO_EQUITY: Verified portfolio equity is zero or invalid.",
      };
    }

    const projectedPositionWeightPct = (projectedHoldingValue / totalEquity) * 100;

    if (projectedPositionWeightPct > maxPositionWeightPct) {
      return {
        passed: false,
        rejectReason: `EXCEEDS_MAX_POSITION_WEIGHT: Projected position weight (${projectedPositionWeightPct.toFixed(1)}%) exceeds limit (${maxPositionWeightPct}%).`,
        projectedPositionWeightPct,
      };
    }

    return {
      passed: true,
      projectedPositionWeightPct,
    };
  }
}
