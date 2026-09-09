/**
 * LiveAccountRiskGateV252.ts
 *
 * V25.2+ LIVE Account Risk Gate
 * Enforces server-owned verification of real broker cash, equity, and holdings.
 * US LIVE remains fail-closed unless a native USD account snapshot is explicitly
 * marked verified by the server-side broker adapter.
 */

export type LiveSettlementCurrency = "KRW" | "USD" | "USDT";

export interface LiveAccountRiskParams {
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  estimatedPrice: number;
  market: "KOREA" | "US" | "UPBIT";

  // Verified broker balances resolved from server environment/API.
  verifiedCash: number;
  verifiedPortfolioValue: number;
  verifiedCurrentHoldingQty: number;

  /** Currency of every monetary value above. Required for US LIVE. */
  settlementCurrency?: LiveSettlementCurrency;

  /**
   * Must only be set by the server-native broker adapter after it verifies
   * account/currency/position ownership. Browser/client input must never set it.
   */
  nativeAccountSnapshotVerified?: boolean;

  maxPositionWeightPct?: number; // e.g. 20
}

export interface LiveAccountRiskValidationResult {
  passed: boolean;
  rejectReason?: string;
  projectedPositionWeightPct?: number;
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function nonNegative(value: unknown): value is number {
  return finite(value) && value >= 0;
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
      settlementCurrency,
      nativeAccountSnapshotVerified = false,
      maxPositionWeightPct = 20,
    } = params;

    // 1. Input truth gate.
    if (!symbol || !finite(quantity) || quantity <= 0) {
      return { passed: false, rejectReason: "INVALID_ORDER_QUANTITY" };
    }

    if (!finite(estimatedPrice) || estimatedPrice <= 0) {
      return { passed: false, rejectReason: "INVALID_ESTIMATED_PRICE" };
    }

    if (
      !nonNegative(verifiedCash) ||
      !nonNegative(verifiedPortfolioValue) ||
      !nonNegative(verifiedCurrentHoldingQty)
    ) {
      return { passed: false, rejectReason: "INVALID_VERIFIED_ACCOUNT_SNAPSHOT" };
    }

    if (!finite(maxPositionWeightPct) || maxPositionWeightPct <= 0 || maxPositionWeightPct > 100) {
      return { passed: false, rejectReason: "INVALID_MAX_POSITION_WEIGHT" };
    }

    // 2. US LIVE is allowed only after the server adapter verifies a native USD snapshot.
    // Existing callers without these fields continue to fail closed.
    if (market === "US") {
      if (nativeAccountSnapshotVerified !== true) {
        return {
          passed: false,
          rejectReason:
            "US_LIVE_RISK_ADAPTER_NOT_READY_V252: native server account snapshot is not verified.",
        };
      }

      if (settlementCurrency !== "USD") {
        return {
          passed: false,
          rejectReason:
            "US_LIVE_CURRENCY_MISMATCH_V204: verified US cash/equity must be supplied in USD.",
        };
      }
    }

    // Optional explicit currency validation for other markets.
    if (market === "KOREA" && settlementCurrency && settlementCurrency !== "KRW") {
      return {
        passed: false,
        rejectReason: "KOREA_LIVE_CURRENCY_MISMATCH: expected KRW account snapshot.",
      };
    }

    if (market === "UPBIT" && settlementCurrency && settlementCurrency !== "KRW" && settlementCurrency !== "USDT") {
      return {
        passed: false,
        rejectReason: "UPBIT_LIVE_CURRENCY_MISMATCH",
      };
    }

    const orderAmount = quantity * estimatedPrice;

    // 3. SELL Validation.
    if (side === "SELL") {
      if (quantity > verifiedCurrentHoldingQty) {
        return {
          passed: false,
          rejectReason: `INSUFFICIENT_HOLDING_QTY: Sell quantity (${quantity}) exceeds broker verified holding (${verifiedCurrentHoldingQty}).`,
        };
      }
      return { passed: true };
    }

    // 4. BUY Validation: cash adequacy in the market's native settlement currency.
    if (orderAmount > verifiedCash) {
      return {
        passed: false,
        rejectReason: `INSUFFICIENT_VERIFIED_CASH: Order amount (${orderAmount.toLocaleString()}) exceeds verified broker cash (${verifiedCash.toLocaleString()}).`,
      };
    }

    // 5. BUY Validation: maximum position weight constraint.
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
