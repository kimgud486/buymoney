// AISTOCK v13.1 Partial Fill Accounting Engine
// Manages cumulative filled quantities and weighted average prices idempotently.
// Enforces: Position CANNOT be created until order status reaches FILLED.

import { PendingOrderV131, PendingOrderStatusV131, FillRecordV131 } from "./typesV131";

export class PartialFillAccountingV131 {
  /**
   * Apply incremental fill to order
   */
  public static applyFill(
    order: PendingOrderV131,
    incFillQty: number,
    incFillPrice: number,
    timestamp: number = Date.now()
  ): PendingOrderV131 {
    if (incFillQty <= 0) return order;

    const prevQty = order.filledQty || 0;
    const prevAvg = order.avgFilledPrice || 0;

    const newFilledQty = Math.min(order.orderQty, prevQty + incFillQty);
    const actualIncQty = newFilledQty - prevQty;

    if (actualIncQty <= 0) return order;

    // Calculate weighted average fill price
    const newAvgPrice = ((prevQty * prevAvg) + (actualIncQty * incFillPrice)) / newFilledQty;

    const remainingQty = Math.max(0, order.orderQty - newFilledQty);
    let newStatus: PendingOrderStatusV131 = order.status;

    if (newFilledQty >= order.orderQty) {
      newStatus = "FILLED";
    } else if (newFilledQty > 0) {
      newStatus = "PARTIAL";
    }

    const rawFills: FillRecordV131[] = [...(order.rawFills || [])];
    rawFills.push({ fillQty: actualIncQty, fillPrice: incFillPrice, timestamp });

    return {
      ...order,
      filledQty: newFilledQty,
      remainingQty,
      avgFilledPrice: Number(newAvgPrice.toFixed(2)),
      status: newStatus,
      updatedAt: timestamp,
      rawFills
    };
  }

  /**
   * Apply cumulative fill snapshot directly from KIS Broker API
   * Idempotent: Ignore if cumulative filled quantity is less than currently stored quantity.
   */
  public static applyCumulativeSnapshot(
    order: PendingOrderV131,
    cumFilledQty: number,
    cumAvgPrice: number,
    timestamp: number = Date.now()
  ): PendingOrderV131 {
    // Idempotence check: Do not roll back filled quantity
    if (cumFilledQty <= order.filledQty) {
      if (cumFilledQty === order.filledQty && order.filledQty >= order.orderQty && order.status !== "FILLED") {
        return { ...order, status: "FILLED", updatedAt: timestamp };
      }
      return order;
    }

    const safeFilledQty = Math.min(order.orderQty, cumFilledQty);
    const remainingQty = Math.max(0, order.orderQty - safeFilledQty);

    let newStatus: PendingOrderStatusV131 = order.status;
    if (safeFilledQty >= order.orderQty) {
      newStatus = "FILLED";
    } else if (safeFilledQty > 0) {
      newStatus = "PARTIAL";
    }

    return {
      ...order,
      filledQty: safeFilledQty,
      remainingQty,
      avgFilledPrice: cumAvgPrice > 0 ? Number(cumAvgPrice.toFixed(2)) : order.avgFilledPrice,
      status: newStatus,
      updatedAt: timestamp
    };
  }

  /**
   * Position creation guard: Position is ONLY allowed when order status is FILLED!
   */
  public static canCreatePosition(order: PendingOrderV131): boolean {
    return order.status === "FILLED" && order.filledQty > 0;
  }
}
