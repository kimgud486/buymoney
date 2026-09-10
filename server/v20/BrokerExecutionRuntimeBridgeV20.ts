// ----------------------------------------------------------------------
// BROKER EXECUTION RUNTIME BRIDGE V20 (AISTOCK FINAL RC)
// Connects BrokerExecutionTruthBusV20 to LivePositionRuntimeService
// and records verified closed-trade performance.
// ----------------------------------------------------------------------

import { brokerExecutionTruthBusV20 } from "./BrokerExecutionTruthBusV20";
import { ParsedExecutionNotice } from "./KISExecutionNoticeParserV20";
import { brokerFillPerformanceRecorderV20 } from "./BrokerFillPerformanceRecorderV20";
import { livePositionRuntimeService, BrokerExecutionNotice } from "../../src/trading/LivePositionRuntimeService";
import { PersistentOrderJournalV20 } from "../../src/execution/PersistentOrderJournalV20";

export class BrokerExecutionRuntimeBridgeV20 {
  private static instance: BrokerExecutionRuntimeBridgeV20;
  private unsubscribe: (() => void) | null = null;
  private orderToPositionMap: Map<string, string> = new Map();

  private constructor() {}

  public static getInstance(): BrokerExecutionRuntimeBridgeV20 {
    if (!BrokerExecutionRuntimeBridgeV20.instance) {
      BrokerExecutionRuntimeBridgeV20.instance = new BrokerExecutionRuntimeBridgeV20();
    }
    return BrokerExecutionRuntimeBridgeV20.instance;
  }

  public registerOrderToPosition(orderId: string, positionId: string): void {
    const normalizedOrderId = String(orderId || "").trim();
    const normalizedPositionId = String(positionId || "").trim();
    if (!normalizedOrderId || !normalizedPositionId) {
      throw new Error("INVALID_ORDER_POSITION_MAPPING");
    }
    this.orderToPositionMap.set(normalizedOrderId, normalizedPositionId);
  }

  public getMappedPositionId(orderId: string): string | undefined {
    return this.orderToPositionMap.get(String(orderId || "").trim());
  }

  /** Restore only non-terminal durable mappings. No order submission occurs here. */
  public restoreMappingsFromJournal(journal: PersistentOrderJournalV20 = new PersistentOrderJournalV20()): number {
    let restored = 0;
    for (const entry of journal.getRecoverableOrders()) {
      const positionId = String(entry.positionId || "").trim();
      if (!positionId) continue;
      this.registerOrderToPosition(entry.orderId, positionId);
      restored++;
    }
    return restored;
  }

  public startBridge(): void {
    if (this.unsubscribe) return;

    // The server already starts this bridge during bootstrap. Rehydrate durable
    // mappings before subscribing so the first post-restart fill cannot be lost.
    try {
      const restored = this.restoreMappingsFromJournal();
      if (restored > 0) {
        console.log(`[BrokerExecutionRuntimeBridgeV20] Restored ${restored} durable order mappings.`);
      }
    } catch (error) {
      // Journal corruption is fail-closed in PersistentOrderJournalV20.
      console.error("[BrokerExecutionRuntimeBridgeV20] Failed to restore durable mappings.", error);
    }

    this.unsubscribe = brokerExecutionTruthBusV20.subscribe((notice: ParsedExecutionNotice) => {
      this.routeNoticeToRuntime(notice);
    });

    console.log("[BrokerExecutionRuntimeBridgeV20] Started bridge listening for broker fills.");
  }

  public stopBridge(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  public routeNoticeToRuntime(parsed: ParsedExecutionNotice): boolean {
    if (!parsed || parsed.execQty <= 0 || !parsed.isExecuted) return false;

    let positionId = this.orderToPositionMap.get(String(parsed.orderId || "").trim());

    if (!positionId) {
      const normalizedSymbol = String(parsed.symbol || "").trim().toUpperCase();
      const candidates = livePositionRuntimeService.getAllPositions().filter(
        (p) => String(p.symbol || "").trim().toUpperCase() === normalizedSymbol && p.state !== "CLOSED"
      );

      if (candidates.length === 1) {
        positionId = candidates[0].positionId;
      } else if (candidates.length > 1) {
        console.error(`[BrokerExecutionRuntimeBridgeV20] Ambiguous fill routing for ${parsed.symbol}; ${candidates.length} live positions exist.`);
        return false;
      }
    }

    if (!positionId) {
      console.warn(`[BrokerExecutionRuntimeBridgeV20] No active position found for symbol ${parsed.symbol}`);
      return false;
    }

    const positionBefore = livePositionRuntimeService.getPosition(positionId);
    if (!positionBefore) {
      console.warn(`[BrokerExecutionRuntimeBridgeV20] Position ${positionId} disappeared before fill routing`);
      return false;
    }

    const runtimeNotice: BrokerExecutionNotice = {
      noticeId: parsed.noticeId,
      symbol: parsed.symbol,
      side: parsed.side,
      execQty: parsed.execQty,
      execPrice: parsed.execPrice,
      remainingQty: parsed.remainingQty,
      timestamp: parsed.timestamp
    };

    const runtimeEntryPrice = positionBefore.entryPrice;
    const setup = positionBefore.strategyId;
    const symbol = positionBefore.symbol;

    const newState = livePositionRuntimeService.onBrokerExecutionNotice(positionId, runtimeNotice);

    brokerFillPerformanceRecorderV20.onVerifiedFill(parsed, {
      positionId,
      symbol,
      setup,
      runtimeEntryPrice,
      nextState: newState
    });

    if (newState === "CLOSED") {
      for (const [orderId, mappedPositionId] of this.orderToPositionMap.entries()) {
        if (mappedPositionId === positionId) this.orderToPositionMap.delete(orderId);
      }
    }

    console.log(`[BrokerExecutionRuntimeBridgeV20] Routed execution fill to position ${positionId}. Next state: ${newState}`);
    return true;
  }
}

export const brokerExecutionRuntimeBridgeV20 = BrokerExecutionRuntimeBridgeV20.getInstance();
