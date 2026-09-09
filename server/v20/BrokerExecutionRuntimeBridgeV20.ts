// ----------------------------------------------------------------------
// BROKER EXECUTION RUNTIME BRIDGE V20 (AISTOCK FINAL RC)
// Connects BrokerExecutionTruthBusV20 to LivePositionRuntimeService
// and records verified closed-trade performance.
// ----------------------------------------------------------------------

import { brokerExecutionTruthBusV20 } from "./BrokerExecutionTruthBusV20";
import { ParsedExecutionNotice } from "./KISExecutionNoticeParserV20";
import { brokerFillPerformanceRecorderV20 } from "./BrokerFillPerformanceRecorderV20";
import { livePositionRuntimeService, BrokerExecutionNotice } from "../../src/trading/LivePositionRuntimeService";

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
    this.orderToPositionMap.set(orderId, positionId);
  }

  public startBridge(): void {
    if (this.unsubscribe) return;

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

    let positionId = this.orderToPositionMap.get(parsed.orderId);

    if (!positionId) {
      const allPositions = livePositionRuntimeService.getAllPositions();
      const match = allPositions.find((p) => p.symbol === parsed.symbol && p.state !== "CLOSED");
      if (match) positionId = match.positionId;
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
    const runtimePositionQtyBeforeFill = positionBefore.quantities.currentPositionQty;
    const setup = positionBefore.strategyId;
    const symbol = positionBefore.symbol;

    const newState = livePositionRuntimeService.onBrokerExecutionNotice(positionId, runtimeNotice);

    brokerFillPerformanceRecorderV20.onVerifiedFill(parsed, {
      positionId,
      symbol,
      setup,
      runtimeEntryPrice,
      runtimePositionQtyBeforeFill,
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
