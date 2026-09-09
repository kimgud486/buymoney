import { AutonomousOrderJournal, AutonomousOrderJournalRecord } from "./AutonomousOrderJournal";

export interface RecoveryOrderStatus {
  brokerOrderId: string;
  status: "PENDING" | "PARTIALLY_FILLED" | "FILLED" | "REJECTED" | "CANCELLED" | "UNKNOWN";
  filledQty: number;
}

export interface RecoveryBrokerAdapter {
  getOrderStatus(input: {
    brokerOrderId: string;
    symbol: string;
    market: string;
  }): Promise<RecoveryOrderStatus>;
}

export interface RecoverySummary {
  checked: number;
  resolved: number;
  stillOpen: number;
  unknown: number;
  failures: Array<{ clientOrderKey: string; reason: string }>;
}

/**
 * Reconciles unresolved autonomous orders after process restart.
 * AUTO_LIVE should remain locked until this method completes without UNKNOWN/failures.
 */
export class AutonomousRecoveryReconciler {
  constructor(
    private readonly journal: AutonomousOrderJournal,
    private readonly broker: RecoveryBrokerAdapter,
  ) {}

  async reconcile(): Promise<RecoverySummary> {
    const unresolved = this.journal.getUnresolved();
    const summary: RecoverySummary = {
      checked: unresolved.length,
      resolved: 0,
      stillOpen: 0,
      unknown: 0,
      failures: [],
    };

    for (const record of unresolved) {
      await this.reconcileOne(record, summary);
    }

    return summary;
  }

  private async reconcileOne(record: AutonomousOrderJournalRecord, summary: RecoverySummary): Promise<void> {
    if (!record.brokerOrderId) {
      summary.unknown += 1;
      summary.failures.push({
        clientOrderKey: record.clientOrderKey,
        reason: "MISSING_BROKER_ORDER_ID",
      });
      this.journal.update(record.clientOrderKey, {
        state: "UNKNOWN",
        note: "Restart reconciliation: broker order id missing",
      });
      return;
    }

    try {
      const status = await this.broker.getOrderStatus({
        brokerOrderId: record.brokerOrderId,
        symbol: record.symbol,
        market: record.market,
      });

      if (status.status === "FILLED") {
        this.journal.update(record.clientOrderKey, {
          state: "FILLED",
          filledQty: status.filledQty,
          note: "Recovered from broker truth",
        });
        summary.resolved += 1;
        return;
      }

      if (status.status === "REJECTED" || status.status === "CANCELLED") {
        this.journal.update(record.clientOrderKey, {
          state: status.status,
          filledQty: status.filledQty,
          note: "Recovered terminal broker state",
        });
        summary.resolved += 1;
        return;
      }

      if (status.status === "PARTIALLY_FILLED") {
        this.journal.update(record.clientOrderKey, {
          state: "PARTIALLY_FILLED",
          filledQty: status.filledQty,
          note: "Recovered partial fill",
        });
        summary.stillOpen += 1;
        return;
      }

      if (status.status === "PENDING") {
        this.journal.update(record.clientOrderKey, {
          state: "SUBMITTED",
          filledQty: status.filledQty,
          note: "Recovered pending broker order",
        });
        summary.stillOpen += 1;
        return;
      }

      this.journal.update(record.clientOrderKey, {
        state: "UNKNOWN",
        filledQty: status.filledQty,
        note: "Broker returned UNKNOWN during restart reconciliation",
      });
      summary.unknown += 1;
    } catch (error) {
      summary.failures.push({
        clientOrderKey: record.clientOrderKey,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
