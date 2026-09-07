// AISTOCK v13.8 RISK POSITION SIZER
// Replaces static hardcoded position amounts with dynamic, risk-managed position sizing.
// Formula: min(qtyByRisk, qtyByCash, qtyByPositionLimit, qtyByLiquidity)

export interface PositionSizerInputs {
  accountEquity: number;        // Total account equity (e.g. 10,000,000 KRW or $50,000 USD)
  availableCash: number;        // Liquid cash available in broker account
  currentPrice: number;         // Current market price
  atr: number;                  // Average True Range (14)
  stopDistance?: number;        // Distance to stop floor in price currency
  maxRiskPct?: number;          // Max risk per trade as fraction of equity (default: 0.01 = 1%)
  maxPositionPct?: number;      // Max capital per position as fraction of equity (default: 0.20 = 20%)
  slippageEstimateBps?: number; // Estimated slippage in basis points (default: 10 bps = 0.001)
  liquidityCap?: number;        // Max shares based on recent 1m volume (e.g. 5% of 1m volume)
}

export interface PositionSizerResult {
  finalQty: number;
  qtyByRisk: number;
  qtyByCash: number;
  qtyByPositionLimit: number;
  qtyByLiquidity: number;
  riskBudgetAmount: number;
  positionValue: number;
  effectiveStopDistance: number;
  reason?: string;
}

export class RiskPositionSizer {
  public static calculatePositionSize(inputs: PositionSizerInputs): PositionSizerResult {
    const {
      accountEquity,
      availableCash,
      currentPrice,
      atr,
      maxRiskPct = 0.01,
      maxPositionPct = 0.20,
      slippageEstimateBps = 10,
      liquidityCap = Infinity,
    } = inputs;

    if (accountEquity <= 0 || availableCash <= 0 || currentPrice <= 0) {
      return {
        finalQty: 0,
        qtyByRisk: 0,
        qtyByCash: 0,
        qtyByPositionLimit: 0,
        qtyByLiquidity: 0,
        riskBudgetAmount: 0,
        positionValue: 0,
        effectiveStopDistance: 0,
        reason: "INSUFFICIENT_FUNDS_OR_INVALID_PRICE",
      };
    }

    const slippageMultiplier = 1 + (slippageEstimateBps / 10000);
    const effectivePrice = currentPrice * slippageMultiplier;

    // 1. Effective Stop Distance (use explicitly passed stopDistance or default 2.0 * ATR or min 1% of price)
    const minStopDistance = currentPrice * 0.005; // 0.5% floor
    const effectiveStopDistance = Math.max(
      inputs.stopDistance || (atr > 0 ? atr * 2.0 : currentPrice * 0.02),
      minStopDistance
    );

    // 2. Risk Budget Limit
    const riskBudgetAmount = accountEquity * maxRiskPct; // e.g. 10M * 0.01 = 100,000 KRW
    const qtyByRisk = Math.floor(riskBudgetAmount / effectiveStopDistance);

    // 3. Available Cash Limit
    const qtyByCash = Math.floor(availableCash / effectivePrice);

    // 4. Max Single Position Capital Limit
    const maxPositionValue = accountEquity * maxPositionPct; // e.g. 10M * 0.20 = 2,000,000 KRW
    const qtyByPositionLimit = Math.floor(maxPositionValue / effectivePrice);

    // 5. Liquidity Cap Limit
    const qtyByLiquidity = Math.floor(liquidityCap);

    // Final Quantity = Minimum of all risk caps
    const rawQty = Math.min(qtyByRisk, qtyByCash, qtyByPositionLimit, qtyByLiquidity);
    const finalQty = Math.max(0, rawQty);
    const positionValue = +(finalQty * currentPrice).toFixed(2);

    let reason = "SIZED_SUCCESSFULLY";
    if (finalQty === 0) {
      if (qtyByRisk === 0) reason = "RISK_BUDGET_TOO_SMALL";
      else if (qtyByCash === 0) reason = "INSUFFICIENT_CASH";
      else if (qtyByLiquidity === 0) reason = "LIQUIDITY_CAP_EXCEEDED";
    }

    return {
      finalQty,
      qtyByRisk,
      qtyByCash,
      qtyByPositionLimit,
      qtyByLiquidity,
      riskBudgetAmount: +riskBudgetAmount.toFixed(2),
      positionValue,
      effectiveStopDistance: +effectiveStopDistance.toFixed(2),
      reason,
    };
  }
}
