// AISTOCK v13.1 Pending Order Coordinator
// Prevents duplicate order placement and coordinates order lifecycle & recovery.

import { PendingOrderV131, PendingOrderSideV131 } from "./typesV131";
import { PendingOrderStoreV131, globalPendingOrderStore } from "./PendingOrderStoreV131";
import { PartialFillAccountingV131 } from "./PartialFillAccountingV131";

export class PendingOrderCoordinatorV131 {
  private store: PendingOrderStoreV131;

  constructor(store: PendingOrderStoreV131 = globalPendingOrderStore) {
    this.store = store;
  }

  /**
   * Duplicate Order Guard:
   * Rejects submission if an active order with identical market:symbol:side exists.
   */
  public assertNoDuplicate(
    market: "KOREA" | "US",
    symbol: string,
    side: PendingOrderSideV131
  ): { allowed: boolean; rejectionReason?: string } {
    const isDuplicate = this.store.hasActivePendingOrder(market, symbol, side);
    if (isDuplicate) {
      const orderKey = PendingOrderStoreV131.generateOrderKey(market, symbol, side);
      return {
        allowed: false,
        rejectionReason: `⛔ [DUPLICATE_ORDER_BLOCK] 동일 종목 및 방향(${orderKey})의 미체결/부분체결 주문이 이미 존재합니다.`
      };
    }
    return { allowed: true };
  }

  /**
   * Register newly accepted order with ODNO from KIS Broker API
   */
  public registerAcceptedOrder(params: {
    odno: string;
    symbol: string;
    name: string;
    market: "KOREA" | "US";
    exchange: string;
    side: PendingOrderSideV131;
    orderQty: number;
    orderPrice: number;
  }): PendingOrderV131 {
    const orderKey = PendingOrderStoreV131.generateOrderKey(params.market, params.symbol, params.side);
    const now = Date.now();

    const newOrder: PendingOrderV131 = {
      orderKey,
      odno: params.odno,
      symbol: params.symbol,
      name: params.name,
      market: params.market,
      exchange: params.exchange,
      side: params.side,
      orderQty: params.orderQty,
      filledQty: 0,
      remainingQty: params.orderQty,
      orderPrice: params.orderPrice,
      avgFilledPrice: 0,
      status: "PENDING",
      createdAt: now,
      updatedAt: now,
      rawFills: []
    };

    this.store.saveOrder(newOrder);
    return newOrder;
  }

  /**
   * Process incoming fill report (incremental or cumulative)
   */
  public applyCumulativeFill(
    market: "KOREA" | "US",
    symbol: string,
    side: PendingOrderSideV131,
    cumFilledQty: number,
    cumAvgPrice: number
  ): { order?: PendingOrderV131; canCreatePosition: boolean } {
    const orderKey = PendingOrderStoreV131.generateOrderKey(market, symbol, side);
    const existing = this.store.getOrder(orderKey);

    if (!existing) {
      return { canCreatePosition: false };
    }

    const updated = PartialFillAccountingV131.applyCumulativeSnapshot(
      existing,
      cumFilledQty,
      cumAvgPrice
    );

    this.store.saveOrder(updated);

    const canCreate = PartialFillAccountingV131.canCreatePosition(updated);
    return { order: updated, canCreatePosition: canCreate };
  }
}

export const globalPendingOrderCoordinator = new PendingOrderCoordinatorV131();
