import {
  OrderIntentV133,
  OrderExecutionRecordV133,
  BrokerQueryResultV133
} from "./typesV133";
import { idempotencyKeyGeneratorV133 } from "./IdempotencyKeyV133";
import { brokerExecutionStateMachineV133 } from "./BrokerExecutionStateMachineV133";
import { globalKillSwitchV133 } from "./GlobalKillSwitchV133";
import { PersistentOrderStoreV133, KisBrokerClientV133 } from "./OrderRecoveryCoordinatorV133";

export class InMemoryOrderStoreV133 implements PersistentOrderStoreV133 {
  private orders = new Map<string, OrderExecutionRecordV133>();

  public async getOrder(idempotencyKey: string): Promise<OrderExecutionRecordV133 | undefined> {
    return this.orders.get(idempotencyKey);
  }

  public async getActiveOrders(): Promise<OrderExecutionRecordV133[]> {
    return Array.from(this.orders.values());
  }

  public async saveOrder(record: OrderExecutionRecordV133): Promise<void> {
    this.orders.set(record.idempotencyKey, record);
  }
}

export interface KisBrokerSubmitResultV133 {
  success: boolean;
  odno?: string;
  errorMessage?: string;
}

export interface KisBrokerSubmitClientV133 extends KisBrokerClientV133 {
  submitOrder(intent: OrderIntentV133): Promise<KisBrokerSubmitResultV133>;
}

export class BrokerExecutionOrchestratorV133 {
  /**
   * Submits an order intent with Idempotency Key protection, Global Kill Switch checks, and State Machine management.
   */
  public async submitOrderIntent(
    intent: OrderIntentV133,
    store: PersistentOrderStoreV133,
    brokerClient: KisBrokerSubmitClientV133
  ): Promise<OrderExecutionRecordV133> {
    // 1. Check Global Kill Switch
    if (globalKillSwitchV133.isKillSwitchActive()) {
      const status = globalKillSwitchV133.getKillSwitchStatus();
      const idempotencyKey = intent.idempotencyKey || idempotencyKeyGeneratorV133.generateKey(intent);
      const rejectedRecord: OrderExecutionRecordV133 = {
        idempotencyKey,
        orderIntent: intent,
        state: "REJECTED",
        filledQty: 0,
        avgFillPrice: 0,
        remainingQty: intent.orderQty,
        lastUpdatedMs: Date.now(),
        rejectionReason: `GLOBAL_KILL_SWITCH_ACTIVE: ${status.reason || "EMERGENCY_STOP"}`
      };
      await store.saveOrder(rejectedRecord);
      return rejectedRecord;
    }

    // 2. Compute Idempotency Key
    const idempotencyKey = intent.idempotencyKey || idempotencyKeyGeneratorV133.generateKey(intent);
    const intentWithKey: OrderIntentV133 = { ...intent, idempotencyKey };

    // 3. Idempotency Check: Return existing record if already submitted
    const activeOrders = await store.getActiveOrders();
    const existing = activeOrders.find(o => o.idempotencyKey === idempotencyKey);
    if (existing) {
      return existing; // Duplicate request prevented
    }

    // 4. Create initial INTENT record
    let record: OrderExecutionRecordV133 = {
      idempotencyKey,
      orderIntent: intentWithKey,
      state: "INTENT",
      filledQty: 0,
      avgFillPrice: 0,
      remainingQty: intent.orderQty,
      lastUpdatedMs: Date.now()
    };
    await store.saveOrder(record);

    // 5. Transition to SUBMITTING
    record = brokerExecutionStateMachineV133.transitionState(record, "SUBMITTING", {});
    await store.saveOrder(record);

    // 6. Submit Order to Broker (KIS)
    try {
      const result = await brokerClient.submitOrder(intentWithKey);

      if (result.success && result.odno) {
        // Transition to PENDING with ODNO
        record = brokerExecutionStateMachineV133.transitionState(record, "PENDING", {
          odno: result.odno
        });
        await store.saveOrder(record);
      } else {
        // Transition to REJECTED
        record = brokerExecutionStateMachineV133.transitionState(record, "REJECTED", {
          rejectionReason: result.errorMessage || "BROKER_SUBMISSION_FAILED"
        });
        await store.saveOrder(record);
      }
    } catch (err: any) {
      // Network/System Error: Transition to UNKNOWN for recovery coordinator
      record = brokerExecutionStateMachineV133.transitionState(record, "UNKNOWN", {
        rejectionReason: `SUBMIT_EXCEPTION: ${err.message}`
      });
      await store.saveOrder(record);
    }

    return record;
  }

  /**
   * Updates fill execution for an order (e.g., from websocket fill feed or polling).
   */
  public async processOrderFillUpdate(
    idempotencyKey: string,
    filledQty: number,
    avgFillPrice: number,
    store: PersistentOrderStoreV133
  ): Promise<OrderExecutionRecordV133 | undefined> {
    const activeOrders = await store.getActiveOrders();
    const record = activeOrders.find(o => o.idempotencyKey === idempotencyKey);
    if (!record) return undefined;

    const nextState = filledQty >= record.orderIntent.orderQty ? "FILLED" : "PARTIAL";

    const updated = brokerExecutionStateMachineV133.transitionState(record, nextState, {
      newFilledQty: filledQty,
      avgFillPrice
    });

    await store.saveOrder(updated);
    return updated;
  }
}

export const brokerExecutionOrchestratorV133 = new BrokerExecutionOrchestratorV133();
