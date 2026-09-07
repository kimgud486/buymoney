// AISTOCK v12.4 Real Account Reconciliation & Recovery Engine
// Implements Risk-Based Position Sizing, Duplicate-Order Prevention Locks,
// Reconnection/Rehydration State Recovery, and Cumulative Partial Fill Accumulation.

export interface RiskSizingParams {
  accountCapitalKRW: number;
  entryPrice: number;
  atrValue?: number;
  maxRiskPctPerTrade?: number; // e.g. 0.02 (2%)
  maxCapitalPctPerTrade?: number; // e.g. 0.20 (20%)
  market: "KOREA" | "US" | "BTC";
}

export interface PendingOrderRecoveryRecord {
  orderId: string;
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  side: "BUY" | "SELL";
  price: number;
  qty: number;
  filledQty: number;
  filledAvgPrice: number;
  status: "PENDING" | "PARTIAL" | "FILLED" | "CANCELLED";
  timestamp: string;
  isPaper: boolean;
}

export class RealAccountReconcilerV124 {
  private activeLocks: Map<string, number> = new Map(); // symbol -> timestamp
  private partialFillMap: Map<string, { filledQty: number; filledAvgPrice: number }> = new Map();

  /**
   * 1. Risk-Based Position Sizing Algorithm
   * Qty = min( (Capital * MaxCapitalPct) / Price, (Capital * MaxRiskPct) / (Price * ATR_Pct) )
   */
  public calculateRiskBasedQty(params: RiskSizingParams): number {
    const {
      accountCapitalKRW = 10000000,
      entryPrice,
      atrValue,
      maxRiskPctPerTrade = 0.015, // 1.5% max portfolio risk
      maxCapitalPctPerTrade = 0.15, // 15% max allocation per stock
      market
    } = params;

    if (!entryPrice || entryPrice <= 0) {
      return market === "US" ? 10 : 50;
    }

    // Convert US dollar price to estimated KRW if needed for sizing limits
    const priceInKRW = market === "US" ? entryPrice * 1380 : entryPrice;

    // Capital limit allocation
    const maxCapitalAllocation = accountCapitalKRW * maxCapitalPctPerTrade;
    const qtyByCapital = Math.floor(maxCapitalAllocation / priceInKRW);

    // Volatility risk limit allocation
    let qtyByRisk = qtyByCapital;
    if (atrValue && atrValue > 0) {
      const stopLossDist = Math.max(atrValue * 1.5, priceInKRW * 0.02);
      const maxLossAmount = accountCapitalKRW * maxRiskPctPerTrade;
      qtyByRisk = Math.floor(maxLossAmount / stopLossDist);
    }

    const calculatedQty = Math.min(qtyByCapital, qtyByRisk);

    // Apply market constraints (min 1 share, max sane upper bound)
    if (calculatedQty <= 0) return 1;
    return Math.min(calculatedQty, market === "US" ? 500 : 5000);
  }

  /**
   * 2. Duplicate Order Prevention Lock
   * Locks order submission for 15 seconds per symbol to prevent double-clicks or rapid signal loops.
   */
  public isOrderLocked(symbol: string): boolean {
    const lockTime = this.activeLocks.get(symbol);
    if (!lockTime) return false;
    if (Date.now() - lockTime > 15000) {
      this.activeLocks.delete(symbol);
      return false;
    }
    return true;
  }

  public lockOrder(symbol: string): void {
    this.activeLocks.set(symbol, Date.now());
  }

  public unlockOrder(symbol: string): void {
    this.activeLocks.delete(symbol);
  }

  /**
   * 3. Cumulative Partial Fill Accumulator
   * Accumulates new partial fills onto existing partial fill records and computes new weighted average price.
   */
  public accumulatePartialFill(
    orderId: string,
    newCcldQty: number,
    newCcldPrice: number
  ): { totalFilledQty: number; weightedAvgPrice: number } {
    const existing = this.partialFillMap.get(orderId) || { filledQty: 0, filledAvgPrice: 0 };

    if (newCcldQty <= existing.filledQty) {
      return { totalFilledQty: existing.filledQty, weightedAvgPrice: existing.filledAvgPrice };
    }

    const addedQty = newCcldQty - existing.filledQty;
    const totalCost = (existing.filledQty * existing.filledAvgPrice) + (addedQty * (newCcldPrice || existing.filledAvgPrice));
    const weightedAvgPrice = newCcldQty > 0 ? totalCost / newCcldQty : newCcldPrice;

    const updated = { filledQty: newCcldQty, filledAvgPrice: weightedAvgPrice };
    this.partialFillMap.set(orderId, updated);

    return { totalFilledQty: newCcldQty, weightedAvgPrice };
  }

  /**
   * 4. Reconnection & Rehydration State Recovery
   * Saves and restores pending order state across browser reloads or network drops.
   */
  public persistPendingOrdersToStorage(pendingOrders: PendingOrderRecoveryRecord[]): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem("AISTOCK_PENDING_ORDERS_V124", JSON.stringify(pendingOrders));
      }
    } catch (e) {
      console.error("[v12.4 Persist Error]", e);
    }
  }

  public restorePendingOrdersFromStorage(): PendingOrderRecoveryRecord[] {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const raw = window.localStorage.getItem("AISTOCK_PENDING_ORDERS_V124");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            return parsed.filter(o => o.status === "PENDING" || o.status === "PARTIAL");
          }
        }
      }
    } catch (e) {
      console.error("[v12.4 Restore Error]", e);
    }
    return [];
  }
}
