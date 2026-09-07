import { OrderExecutionRecordV133, BrokerQueryResultV133 } from "./typesV133";
import { brokerExecutionStateMachineV133 } from "./BrokerExecutionStateMachineV133";

export interface PersistentOrderStoreV133 {
  getActiveOrders(): Promise<OrderExecutionRecordV133[]>;
  saveOrder(record: OrderExecutionRecordV133): Promise<void>;
}

export interface KisBrokerClientV133 {
  queryOrderStatus(symbol: string, odno?: string): Promise<BrokerQueryResultV133>;
}

export class OrderRecoveryCoordinatorV133 {
  /**
   * Scans all non-terminal orders (SUBMITTING, PENDING, PARTIAL, UNKNOWN), queries broker, and recovers order state upon server start.
   */
  public async recoverActiveOrders(
    store: PersistentOrderStoreV133,
    brokerClient: KisBrokerClientV133
  ): Promise<{
    recoveredCount: number;
    filledPositionsCreated: number;
    updatedRecords: OrderExecutionRecordV133[];
  }> {
    const activeOrders = await store.getActiveOrders();
    const nonTerminalStates = ["SUBMITTING", "PENDING", "PARTIAL", "UNKNOWN"];
    const pendingOrders = activeOrders.filter(o => nonTerminalStates.includes(o.state));

    let recoveredCount = 0;
    let filledPositionsCreated = 0;
    const updatedRecords: OrderExecutionRecordV133[] = [];

    for (const record of pendingOrders) {
      try {
        const brokerStatus = await brokerClient.queryOrderStatus(record.orderIntent.symbol, record.odno);

        let nextState = record.state;
        if (brokerStatus.status === "FILLED") {
          nextState = "FILLED";
        } else if (brokerStatus.status === "PARTIAL") {
          nextState = "PARTIAL";
        } else if (brokerStatus.status === "CANCELLED") {
          nextState = "CANCELLED";
        } else if (brokerStatus.status === "REJECTED" || brokerStatus.status === "NOT_FOUND") {
          nextState = "REJECTED";
        } else if (brokerStatus.status === "PENDING") {
          nextState = "PENDING";
        }

        const updated = brokerExecutionStateMachineV133.transitionState(record, nextState, {
          odno: brokerStatus.odno ?? record.odno,
          newFilledQty: brokerStatus.filledQty,
          avgFillPrice: brokerStatus.avgPrice
        });

        await store.saveOrder(updated);
        updatedRecords.push(updated);
        recoveredCount++;

        if (updated.state === "FILLED") {
          filledPositionsCreated++;
        }
      } catch (err: any) {
        // If query fails, transition to UNKNOWN for subsequent recovery cycles
        const updated = brokerExecutionStateMachineV133.transitionState(record, "UNKNOWN", {
          rejectionReason: `RECOVERY_QUERY_FAILED: ${err.message}`
        });
        await store.saveOrder(updated);
        updatedRecords.push(updated);
      }
    }

    return {
      recoveredCount,
      filledPositionsCreated,
      updatedRecords
    };
  }
}

export const orderRecoveryCoordinatorV133 = new OrderRecoveryCoordinatorV133();
