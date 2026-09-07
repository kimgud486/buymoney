// AISTOCK v12.4 Enhanced Pending Fill Reconciler
// Integrates RealAccountReconcilerV124 persistence, duplicate order locks,
// and cumulative partial fill calculation into real-time order polling.

import { RealAccountReconcilerV124, PendingOrderRecoveryRecord } from "./RealAccountReconcilerV124";

export interface PendingOrderInfoV124 extends PendingOrderRecoveryRecord {}

export class PendingFillReconcilerV124 {
  private registry: Map<string, PendingOrderInfoV124> = new Map();
  public reconcilerEngine: RealAccountReconcilerV124;

  constructor() {
    this.reconcilerEngine = new RealAccountReconcilerV124();
    this.restoreState();
  }

  private restoreState(): void {
    const restored = this.reconcilerEngine.restorePendingOrdersFromStorage();
    for (const order of restored) {
      if (order.orderId) {
        this.registry.set(order.orderId, order);
      }
    }
  }

  private persistState(): void {
    this.reconcilerEngine.persistPendingOrdersToStorage(Array.from(this.registry.values()));
  }

  /**
   * Register new pending order with lock check
   */
  public addPendingOrder(order: PendingOrderInfoV124): boolean {
    if (!order.orderId) return false;
    if (this.reconcilerEngine.isOrderLocked(order.symbol)) {
      console.warn(`[v12.4 Order Lock] Symbol ${order.symbol} order submission locked to prevent duplication.`);
      return false;
    }

    this.reconcilerEngine.lockOrder(order.symbol);
    this.registry.set(order.orderId, { ...order });
    this.persistState();
    return true;
  }

  /**
   * Remove order from tracking registry and release lock
   */
  public removePendingOrder(orderId: string): void {
    const order = this.registry.get(orderId);
    if (order) {
      this.reconcilerEngine.unlockOrder(order.symbol);
    }
    this.registry.delete(orderId);
    this.persistState();
  }

  /**
   * Get list of currently pending or partially filled orders
   */
  public getPendingOrders(): PendingOrderInfoV124[] {
    return Array.from(this.registry.values());
  }

  /**
   * Check fill execution status for a single pending order
   */
  public async checkSingleOrder(order: PendingOrderInfoV124): Promise<{
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
   * Reconcile all pending orders in the registry with cumulative partial fill updates
   */
  public async reconcileAll(callbacks?: {
    onFilled?: (order: PendingOrderInfoV124) => void;
    onPartial?: (order: PendingOrderInfoV124) => void;
    onCancelled?: (order: PendingOrderInfoV124) => void;
  }): Promise<{
    reconciledCount: number;
    filledOrders: PendingOrderInfoV124[];
    partialOrders: PendingOrderInfoV124[];
  }> {
    const filledOrders: PendingOrderInfoV124[] = [];
    const partialOrders: PendingOrderInfoV124[] = [];
    const pendingList = this.getPendingOrders();

    for (const order of pendingList) {
      const fillRes = await this.checkSingleOrder(order);

      if (fillRes.status === "FILLED" || fillRes.isFilled) {
        const updatedOrder: PendingOrderInfoV124 = {
          ...order,
          status: "FILLED",
          filledQty: fillRes.filledQty || order.qty,
          filledAvgPrice: fillRes.filledAvgPrice || order.price
        };
        filledOrders.push(updatedOrder);
        this.removePendingOrder(order.orderId);
        callbacks?.onFilled?.(updatedOrder);
      } else if (fillRes.status === "PARTIAL") {
        const cumulative = this.reconcilerEngine.accumulatePartialFill(
          order.orderId,
          fillRes.filledQty,
          fillRes.filledAvgPrice
        );
        const updatedOrder: PendingOrderInfoV124 = {
          ...order,
          status: "PARTIAL",
          filledQty: cumulative.totalFilledQty,
          filledAvgPrice: cumulative.weightedAvgPrice
        };
        this.registry.set(order.orderId, updatedOrder);
        this.persistState();
        partialOrders.push(updatedOrder);
        callbacks?.onPartial?.(updatedOrder);
      } else if (fillRes.status === "CANCELLED") {
        this.removePendingOrder(order.orderId);
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
