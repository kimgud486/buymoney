// ----------------------------------------------------------------------
// BROKER EXECUTION TRUTH BUS V20 (AISTOCK FINAL RC)
// Event Bus for Verified Broker Execution Fills with Deduplication
// ----------------------------------------------------------------------

import { ParsedExecutionNotice } from "./KISExecutionNoticeParserV20";

export type ExecutionListener = (notice: ParsedExecutionNotice) => void;

export class BrokerExecutionTruthBusV20 {
  private static instance: BrokerExecutionTruthBusV20;
  private listeners: Set<ExecutionListener> = new Set();
  private processedNotices: Set<string> = new Set();
  private maxHistory: number = 1000;

  private constructor() {}

  public static getInstance(): BrokerExecutionTruthBusV20 {
    if (!BrokerExecutionTruthBusV20.instance) {
      BrokerExecutionTruthBusV20.instance = new BrokerExecutionTruthBusV20();
    }
    return BrokerExecutionTruthBusV20.instance;
  }

  public subscribe(listener: ExecutionListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public publish(notice: ParsedExecutionNotice): boolean {
    if (!notice || !notice.symbol || notice.execQty <= 0) {
      return false;
    }

    // Deduplication Key
    const dedupKey = `${notice.symbol}_${notice.orderId}_${notice.side}_${notice.execQty}_${notice.execPrice}_${notice.execTime}`;
    if (this.processedNotices.has(dedupKey)) {
      console.warn(`[BrokerExecutionTruthBusV20] Duplicate notice ignored: ${dedupKey}`);
      return false;
    }

    this.processedNotices.add(dedupKey);
    if (this.processedNotices.size > this.maxHistory) {
      const oldest = Array.from(this.processedNotices).slice(0, 200);
      oldest.forEach((k) => this.processedNotices.delete(k));
    }

    console.log(`[BrokerExecutionTruthBusV20] PUBLISH VERIFIED EXECUTION FILL:`, {
      symbol: notice.symbol,
      side: notice.side,
      execQty: notice.execQty,
      execPrice: notice.execPrice,
      orderId: notice.orderId
    });

    for (const listener of this.listeners) {
      try {
        listener(notice);
      } catch (err) {
        console.error(`[BrokerExecutionTruthBusV20] Listener error:`, err);
      }
    }

    return true;
  }

  public clearHistory(): void {
    this.processedNotices.clear();
  }
}

export const brokerExecutionTruthBusV20 = BrokerExecutionTruthBusV20.getInstance();
