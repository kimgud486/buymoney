// AISTOCK v12.3 Pending Fill Reconciler (REAL FILL ENGINE)
// Manages pending order registry (ODNO), checks fill execution status periodically,
// and ensures positions are created ONLY after FILLED status is confirmed.

export interface PendingOrderInfo {
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

export class PendingFillReconcilerV123 {
  private registry: Map<string, PendingOrderInfo> = new Map();

  /**
   * Register a new pending order into the tracking registry
   */
  public addPendingOrder(order: PendingOrderInfo): void {
    if (!order.orderId) return;
    this.registry.set(order.orderId, { ...order });
  }

  /**
   * Remove order from tracking registry
   */
  public removePendingOrder(orderId: string): void {
    this.registry.delete(orderId);
  }

  /**
   * Get list of currently pending or partially filled orders
   */
  public getPendingOrders(): PendingOrderInfo[] {
    return Array.from(this.registry.values());
  }

  /**
   * Clear all tracked orders
   */
  public clearRegistry(): void {
    this.registry.clear();
  }

  /**
   * Check fill execution status for a single pending order via server gateway
   */
  public async checkSingleOrder(order: PendingOrderInfo): Promise<{
    status: "PENDING" | "PARTIAL" | "FILLED" | "CANCELLED";
    isFilled: boolean;
    filledQty: number;
    filledAvgPrice: number;
    message: string;
  }> {
    try {
      const url = `/api/broker/v12/fill-status?orderNo=${encodeURIComponent(order.orderId)}&symbol=${encodeURIComponent(order.symbol)}&market=${encodeURIComponent(order.market)}&isPaper=${order.isPaper ? "true" : "false"}`;
      const res = await fetch(url);
      if (!res.ok) {
        return {
          status: "PENDING",
          isFilled: false,
          filledQty: order.filledQty,
          filledAvgPrice: order.filledAvgPrice,
          message: `⚠️ 체결조회 통신 오류 (HTTP ${res.status})`
        };
      }

      const data = await res.json();
      return {
        status: data.status || (data.isFilled ? "FILLED" : "PENDING"),
        isFilled: Boolean(data.isFilled),
        filledQty: Number(data.filledQty || 0),
        filledAvgPrice: Number(data.filledAvgPrice || 0),
        message: data.message || "체결 상태 확인 완료"
      };
    } catch (err: any) {
      return {
        status: "PENDING",
        isFilled: false,
        filledQty: order.filledQty,
        filledAvgPrice: order.filledAvgPrice,
        message: `🚨 체결조회 네트워크 오류: ${err?.message || err}`
      };
    }
  }

  /**
   * Poll and reconcile all pending orders in the registry.
   * Invokes callbacks on FILLED, PARTIAL, or CANCELLED events.
   */
  public async reconcileAll(callbacks?: {
    onFilled?: (order: PendingOrderInfo) => void;
    onPartial?: (order: PendingOrderInfo) => void;
    onCancelled?: (order: PendingOrderInfo) => void;
  }): Promise<{
    reconciledCount: number;
    filledOrders: PendingOrderInfo[];
    partialOrders: PendingOrderInfo[];
  }> {
    const filledOrders: PendingOrderInfo[] = [];
    const partialOrders: PendingOrderInfo[] = [];
    const pendingList = this.getPendingOrders();

    for (const order of pendingList) {
      const fillRes = await this.checkSingleOrder(order);

      if (fillRes.status === "FILLED" || fillRes.isFilled) {
        const updatedOrder: PendingOrderInfo = {
          ...order,
          status: "FILLED",
          filledQty: fillRes.filledQty || order.qty,
          filledAvgPrice: fillRes.filledAvgPrice || order.price
        };
        filledOrders.push(updatedOrder);
        this.registry.delete(order.orderId);
        callbacks?.onFilled?.(updatedOrder);
      } else if (fillRes.status === "PARTIAL") {
        const updatedOrder: PendingOrderInfo = {
          ...order,
          status: "PARTIAL",
          filledQty: fillRes.filledQty,
          filledAvgPrice: fillRes.filledAvgPrice
        };
        this.registry.set(order.orderId, updatedOrder);
        partialOrders.push(updatedOrder);
        callbacks?.onPartial?.(updatedOrder);
      } else if (fillRes.status === "CANCELLED") {
        this.registry.delete(order.orderId);
        callbacks?.onCancelled?.(order);
      }
    }

    return {
      reconciledCount: pendingList.length,
      filledOrders,
      partialOrders
    };
  }
}
