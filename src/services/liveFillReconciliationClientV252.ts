/**
 * liveFillReconciliationClientV252.ts
 *
 * Client service that polls pending LIVE orders and reconciles fills with the broker via server credentials.
 * Only confirmed FILLED orders update the local portfolio and trigger balance re-sync.
 */

export interface PendingOrderRef {
  orderId: string;
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  status: "ACKNOWLEDGED" | "PENDING" | "FILLED" | "CANCELLED" | "REJECTED";
  submittedAt: number;
}

export class LiveFillReconciliationClientV252 {
  private pendingOrders: Map<string, PendingOrderRef> = new Map();
  private pollIntervalId: number | null = null;
  private onOrderFilledCallback?: (order: PendingOrderRef) => void;

  public registerPendingOrder(order: PendingOrderRef): void {
    this.pendingOrders.set(order.orderId, order);
    this.startPolling();
  }

  public setOnOrderFilledCallback(callback: (order: PendingOrderRef) => void): void {
    this.onOrderFilledCallback = callback;
  }

  public startPolling(intervalMs: number = 3000): void {
    if (this.pollIntervalId !== null) return;

    this.pollIntervalId = window.setInterval(async () => {
      if (this.pendingOrders.size === 0) {
        this.stopPolling();
        return;
      }

      for (const [orderId, order] of Array.from(this.pendingOrders.entries())) {
        try {
          // Verify fill via server API route (credentials handled server-side)
          const response = await fetch(`/api/trade/verify-order?orderId=${encodeURIComponent(orderId)}`);
          if (!response.ok) continue;

          const data = await response.json();
          if (data.status === "FILLED") {
            const filledOrder = { ...order, status: "FILLED" as const };
            this.pendingOrders.delete(orderId);

            if (this.onOrderFilledCallback) {
              this.onOrderFilledCallback(filledOrder);
            }
          } else if (data.status === "CANCELLED" || data.status === "REJECTED") {
            this.pendingOrders.delete(orderId);
          }
        } catch (error) {
          console.warn("[LiveFillReconciliation] Error checking order status:", error);
        }
      }
    }, intervalMs);
  }

  public stopPolling(): void {
    if (this.pollIntervalId !== null) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
  }
}

export const liveFillReconciliationClient = new LiveFillReconciliationClientV252();
