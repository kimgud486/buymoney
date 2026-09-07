import { OrderExecutionStateV133, OrderExecutionRecordV133 } from "./typesV133";

export class BrokerExecutionStateMachineV133 {
  private static readonly VALID_TRANSITIONS: Record<OrderExecutionStateV133, OrderExecutionStateV133[]> = {
    INTENT: ["SUBMITTING", "REJECTED", "LOCKED"],
    SUBMITTING: ["PENDING", "PARTIAL", "FILLED", "REJECTED", "UNKNOWN", "LOCKED"],
    PENDING: ["PARTIAL", "FILLED", "CANCELLED", "REJECTED", "UNKNOWN", "LOCKED"],
    PARTIAL: ["PARTIAL", "FILLED", "CANCELLED", "UNKNOWN", "LOCKED"],
    FILLED: ["LOCKED"],
    REJECTED: [],
    CANCELLED: [],
    UNKNOWN: ["PENDING", "PARTIAL", "FILLED", "CANCELLED", "REJECTED", "LOCKED"],
    LOCKED: []
  };

  /**
   * Validates state transition and checks for cumulative fill anomaly (CUMULATIVE_FILL_WENT_BACKWARDS).
   */
  public transitionState(
    currentRecord: OrderExecutionRecordV133,
    nextState: OrderExecutionStateV133,
    updates: {
      odno?: string;
      newFilledQty?: number;
      avgFillPrice?: number;
      rejectionReason?: string;
      lockReason?: string;
    }
  ): OrderExecutionRecordV133 {
    // If currently locked, cannot transition out
    if (currentRecord.state === "LOCKED") {
      return currentRecord;
    }

    // 1. Check cumulative fill anomaly (CUMULATIVE_FILL_WENT_BACKWARDS)
    if (updates.newFilledQty !== undefined && updates.newFilledQty < currentRecord.filledQty) {
      return {
        ...currentRecord,
        state: "LOCKED",
        lockReason: "CUMULATIVE_FILL_WENT_BACKWARDS",
        lastUpdatedMs: Date.now()
      };
    }

    // 2. Validate state transition
    const allowed = BrokerExecutionStateMachineV133.VALID_TRANSITIONS[currentRecord.state];
    if (!allowed || !allowed.includes(nextState)) {
      return {
        ...currentRecord,
        state: "LOCKED",
        lockReason: `INVALID_STATE_TRANSITION (${currentRecord.state} -> ${nextState})`,
        lastUpdatedMs: Date.now()
      };
    }

    const filledQty = updates.newFilledQty !== undefined ? updates.newFilledQty : currentRecord.filledQty;
    const orderQty = currentRecord.orderIntent.orderQty;
    const remainingQty = Math.max(0, orderQty - filledQty);

    return {
      ...currentRecord,
      state: nextState,
      odno: updates.odno ?? currentRecord.odno,
      filledQty,
      avgFillPrice: updates.avgFillPrice !== undefined ? updates.avgFillPrice : currentRecord.avgFillPrice,
      remainingQty,
      rejectionReason: updates.rejectionReason ?? currentRecord.rejectionReason,
      lockReason: updates.lockReason ?? currentRecord.lockReason,
      lastUpdatedMs: Date.now()
    };
  }
}

export const brokerExecutionStateMachineV133 = new BrokerExecutionStateMachineV133();
