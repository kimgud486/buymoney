// AISTOCK v13.1 Pending Order Store
// In-memory active pending order cache with order key format 'MARKET:SYMBOL:SIDE'

import { PendingOrderV131, PendingOrderSideV131 } from "./typesV131";

export class PendingOrderStoreV131 {
  private orders: Map<string, PendingOrderV131> = new Map();

  public static generateOrderKey(market: string, symbol: string, side: PendingOrderSideV131): string {
    return `${market.toUpperCase()}:${symbol.toUpperCase()}:${side.toUpperCase()}`;
  }

  public getOrder(orderKey: string): PendingOrderV131 | undefined {
    return this.orders.get(orderKey);
  }

  public hasActivePendingOrder(market: string, symbol: string, side: PendingOrderSideV131): boolean {
    const key = PendingOrderStoreV131.generateOrderKey(market, symbol, side);
    const existing = this.orders.get(key);
    if (!existing) return false;
    return existing.status === "PENDING" || existing.status === "PARTIAL";
  }

  public saveOrder(order: PendingOrderV131): void {
    this.orders.set(order.orderKey, { ...order, updatedAt: Date.now() });
  }

  public removeOrder(orderKey: string): void {
    this.orders.delete(orderKey);
  }

  public getAllActiveOrders(): PendingOrderV131[] {
    return Array.from(this.orders.values()).filter(
      o => o.status === "PENDING" || o.status === "PARTIAL"
    );
  }

  public clear(): void {
    this.orders.clear();
  }
}

export const globalPendingOrderStore = new PendingOrderStoreV131();
