import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  BrokerExecutionOrchestratorV133,
  InMemoryOrderStoreV133,
  KisBrokerSubmitClientV133
} from "../../src/services/v13_3/BrokerExecutionOrchestratorV133";
import { idempotencyKeyGeneratorV133 } from "../../src/services/v13_3/IdempotencyKeyV133";
import { brokerExecutionStateMachineV133 } from "../../src/services/v13_3/BrokerExecutionStateMachineV133";
import { globalKillSwitchV133 } from "../../src/services/v13_3/GlobalKillSwitchV133";
import { orderRecoveryCoordinatorV133 } from "../../src/services/v13_3/OrderRecoveryCoordinatorV133";
import { OrderIntentV133, OrderExecutionRecordV133, BrokerQueryResultV133 } from "../../src/services/v13_3/typesV133";

describe("AISTOCK v13.3 Broker Execution & Recovery Engine Test Suite", () => {
  let store: InMemoryOrderStoreV133;
  let orchestrator: BrokerExecutionOrchestratorV133;

  beforeEach(() => {
    store = new InMemoryOrderStoreV133();
    orchestrator = new BrokerExecutionOrchestratorV133();
    globalKillSwitchV133.resetKillSwitch();
  });

  test("1. Idempotency Key: Prevents duplicate order placement when identical signal is resubmitted", async () => {
    const mockBroker: KisBrokerSubmitClientV133 = {
      submitOrder: async () => ({ success: true, odno: "ODNO_10001" }),
      queryOrderStatus: async () => ({ symbol: "005930", status: "PENDING", filledQty: 0, avgPrice: 0 })
    };

    const intent: OrderIntentV133 = {
      logicalSignalId: "SIG_20260905_001",
      strategyName: "ALPHA_SCALPER_V13",
      market: "KOREA",
      symbol: "005930",
      side: "BUY",
      orderQty: 10,
      limitPrice: 70000,
      timestamp: Date.now()
    };

    const key1 = idempotencyKeyGeneratorV133.generateKey(intent);
    const order1 = await orchestrator.submitOrderIntent(intent, store, mockBroker);

    assert.strictEqual(order1.idempotencyKey, key1);
    assert.strictEqual(order1.state, "PENDING");
    assert.strictEqual(order1.odno, "ODNO_10001");

    // Resubmit identical intent
    const order2 = await orchestrator.submitOrderIntent(intent, store, mockBroker);

    // Should return existing record, NOT submit a second order
    assert.strictEqual(order2.idempotencyKey, key1);
    assert.strictEqual(order2.odno, "ODNO_10001");
    const activeOrders = await store.getActiveOrders();
    assert.strictEqual(activeOrders.length, 1);
  });

  test("2. State Machine & Backward Fill Prevention: Locks order if cumulative fill decreases", () => {
    const intent: OrderIntentV133 = {
      logicalSignalId: "SIG_002",
      strategyName: "QUANT_V13",
      market: "KOREA",
      symbol: "000660",
      side: "BUY",
      orderQty: 10,
      timestamp: Date.now()
    };

    let record: OrderExecutionRecordV133 = {
      idempotencyKey: "KEY_BACKWARD_TEST",
      orderIntent: intent,
      state: "PARTIAL",
      odno: "ODNO_20002",
      filledQty: 7, // Currently 7 shares filled
      avgFillPrice: 150000,
      remainingQty: 3,
      lastUpdatedMs: Date.now()
    };

    // Anomaly: Broker reports 3 shares filled (went backwards from 7)
    const updated = brokerExecutionStateMachineV133.transitionState(record, "PARTIAL", {
      newFilledQty: 3
    });

    assert.strictEqual(updated.state, "LOCKED");
    assert.strictEqual(updated.lockReason, "CUMULATIVE_FILL_WENT_BACKWARDS");
  });

  test("3. Order Recovery Coordinator: Recovers non-terminal orders upon server restart", async () => {
    const intent: OrderIntentV133 = {
      logicalSignalId: "SIG_RECOVER_01",
      strategyName: "RECOVERY_TEST",
      market: "KOREA",
      symbol: "005930",
      side: "BUY",
      orderQty: 20,
      timestamp: Date.now()
    };

    // Simulate pre-existing order stored before crash
    const unrecoveredOrder: OrderExecutionRecordV133 = {
      idempotencyKey: "KEY_RECOVERY_01",
      orderIntent: intent,
      state: "PENDING",
      odno: "ODNO_RECOVER_99",
      filledQty: 0,
      avgFillPrice: 0,
      remainingQty: 20,
      lastUpdatedMs: Date.now() - 60000
    };
    await store.saveOrder(unrecoveredOrder);

    const mockBrokerQuery: KisBrokerSubmitClientV133 = {
      submitOrder: async () => ({ success: true }),
      queryOrderStatus: async (symbol, odno) => {
        if (odno === "ODNO_RECOVER_99") {
          return { symbol, odno, status: "FILLED", filledQty: 20, avgPrice: 70500 };
        }
        return { symbol, status: "NOT_FOUND", filledQty: 0, avgPrice: 0 };
      }
    };

    const recoveryResult = await orderRecoveryCoordinatorV133.recoverActiveOrders(store, mockBrokerQuery);

    assert.strictEqual(recoveryResult.recoveredCount, 1);
    assert.strictEqual(recoveryResult.filledPositionsCreated, 1);

    const recovered = (await store.getActiveOrders())[0];
    assert.strictEqual(recovered.state, "FILLED");
    assert.strictEqual(recovered.filledQty, 20);
    assert.strictEqual(recovered.avgFillPrice, 70500);
  });

  test("4. Global Kill Switch: Blocks all new orders when emergency kill switch is active", async () => {
    globalKillSwitchV133.triggerKillSwitch("MANUAL_EMERGENCY_HALT");

    const mockBroker: KisBrokerSubmitClientV133 = {
      submitOrder: async () => ({ success: true, odno: "ODNO_NEVER" }),
      queryOrderStatus: async () => ({ symbol: "005930", status: "PENDING", filledQty: 0, avgPrice: 0 })
    };

    const intent: OrderIntentV133 = {
      logicalSignalId: "SIG_KILL_01",
      strategyName: "HALT_TEST",
      market: "KOREA",
      symbol: "005930",
      side: "BUY",
      orderQty: 5,
      timestamp: Date.now()
    };

    const result = await orchestrator.submitOrderIntent(intent, store, mockBroker);

    assert.strictEqual(result.state, "REJECTED");
    assert.ok(result.rejectionReason?.includes("GLOBAL_KILL_SWITCH_ACTIVE"));
    assert.ok(result.rejectionReason?.includes("MANUAL_EMERGENCY_HALT"));
  });
});
