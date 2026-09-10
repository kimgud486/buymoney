import { KISBrokerGatewayV121 } from "./KISBrokerGatewayV121";
import { validateLiveOrderReadiness, type LiveOrderIntent } from "./KISLiveOrderReadiness";
import type { KISLiveAccountTruth } from "./KISLiveAccountTruthV212";
import { PersistentOrderJournalV20 } from "../../src/execution/PersistentOrderJournalV20";
import { livePositionRuntimeService } from "../../src/trading/LivePositionRuntimeService";
import { brokerExecutionRuntimeBridgeV20 } from "../v20/BrokerExecutionRuntimeBridgeV20";

export interface LiveExecutionAuthorization {
  approved: boolean;
  source: "USER_CONFIRMATION" | "SYSTEM_POLICY";
}

export interface SafeLiveExecutionRequest {
  positionId: string;
  idempotencyKey: string;
  intent: LiveOrderIntent;
  dataStatus: "REALTIME_VERIFIED" | "STALE" | "NO_DATA";
  lastPrice: number;
  accountTruth: KISLiveAccountTruth | null;
  authorization: LiveExecutionAuthorization;
}

export interface SafeLiveExecutionResult {
  accepted: boolean;
  blocked: boolean;
  orderId: string;
  status: string;
  reason: string;
  blockers: string[];
}

export interface LiveOrderRecoveryReportV20 {
  scanned: number;
  mappingsRestored: number;
  fillsRefreshed: number;
  failed: number;
}

export class SafeLiveExecutionCoordinatorV20 {
  private gateway: KISBrokerGatewayV121;
  private journal: PersistentOrderJournalV20;
  private inflightKeys = new Set<string>();
  private emergencyStop = false;

  constructor(options: { gateway?: KISBrokerGatewayV121; journal?: PersistentOrderJournalV20 } = {}) {
    this.gateway = options.gateway ?? new KISBrokerGatewayV121();
    this.journal = options.journal ?? new PersistentOrderJournalV20();
  }

  public setEmergencyStop(enabled: boolean): void {
    this.emergencyStop = enabled;
  }

  public isEmergencyStopped(): boolean {
    return this.emergencyStop || String(process.env.KIS_LIVE_KILL_SWITCH || "").toUpperCase() === "ON";
  }

  public isExecutionEnabled(): boolean {
    return String(process.env.KIS_LIVE_EXECUTION_ENABLED || "").toLowerCase() === "true";
  }

  public async submit(request: SafeLiveExecutionRequest): Promise<SafeLiveExecutionResult> {
    const blockers: string[] = [];
    const key = String(request.idempotencyKey || "").trim();
    const positionId = String(request.positionId || "").trim();

    if (!this.isExecutionEnabled()) blockers.push("LIVE_EXECUTION_DISABLED");
    if (this.isEmergencyStopped()) blockers.push("KILL_SWITCH_ACTIVE");
    if (!request.authorization?.approved) blockers.push("EXECUTION_NOT_AUTHORIZED");
    if (!positionId) blockers.push("POSITION_ID_REQUIRED");
    if (!key) blockers.push("IDEMPOTENCY_KEY_REQUIRED");
    if (key && (this.inflightKeys.has(key) || this.journal.hasIdempotencyKey(key))) blockers.push("DUPLICATE_ORDER_REJECTED");

    const readiness = validateLiveOrderReadiness({
      intent: request.intent,
      dataStatus: request.dataStatus,
      brokerConfigured: this.gateway.isConfigured(),
      lastPrice: request.lastPrice,
      accountTruth: request.accountTruth
    });
    blockers.push(...readiness.blockers);

    if (blockers.length > 0) {
      return {
        accepted: false,
        blocked: true,
        orderId: "",
        status: "BLOCKED",
        reason: blockers[0],
        blockers: Array.from(new Set(blockers))
      };
    }

    this.inflightKeys.add(key);
    try {
      const response = await this.gateway.executeOrder({
        symbol: request.intent.symbol,
        name: request.intent.symbol,
        market: request.intent.market,
        side: request.intent.side,
        price: request.intent.orderType === "LIMIT" ? Number(request.intent.price) : Number(request.lastPrice),
        qty: request.intent.qty,
        orderType: request.intent.orderType,
        isPaperTrading: false
      });

      if (!response.success || !response.orderNo) {
        return {
          accepted: false,
          blocked: false,
          orderId: "",
          status: response.status,
          reason: response.message,
          blockers: []
        };
      }

      const now = Date.now();
      this.journal.recordOrder({
        idempotencyKey: key,
        orderId: response.orderNo,
        positionId,
        symbol: request.intent.symbol,
        market: request.intent.market === "KOREA" ? "KR" : "US",
        side: request.intent.side,
        quantity: request.intent.qty,
        price: request.intent.orderType === "LIMIT" ? Number(request.intent.price) : Number(request.lastPrice),
        status: "PENDING",
        filledQuantity: 0,
        averageFillPrice: null,
        createdAt: now,
        updatedAt: now
      });

      brokerExecutionRuntimeBridgeV20.registerOrderToPosition(response.orderNo, positionId);

      return {
        accepted: true,
        blocked: false,
        orderId: response.orderNo,
        status: response.status,
        reason: response.message,
        blockers: []
      };
    } finally {
      this.inflightKeys.delete(key);
    }
  }

  /**
   * Restart recovery is read/reconcile-only. It never submits a new order.
   * Restores durable order->position mappings first, then optionally refreshes
   * broker fill truth so missed websocket fills can catch the runtime up.
   */
  public async recoverOpenOrders(options: { refreshFills?: boolean } = {}): Promise<LiveOrderRecoveryReportV20> {
    const recoverable = this.journal.getRecoverableOrders();
    const report: LiveOrderRecoveryReportV20 = {
      scanned: recoverable.length,
      mappingsRestored: 0,
      fillsRefreshed: 0,
      failed: 0
    };

    for (const entry of recoverable) {
      try {
        const positionId = String(entry.positionId || "").trim();
        if (!positionId) {
          report.failed++;
          continue;
        }
        brokerExecutionRuntimeBridgeV20.registerOrderToPosition(entry.orderId, positionId);
        report.mappingsRestored++;

        if (options.refreshFills) {
          await this.refreshFill(entry.orderId);
          report.fillsRefreshed++;
        }
      } catch (error) {
        report.failed++;
        console.error(`[SafeLiveExecutionCoordinatorV20] Recovery failed for ${entry.orderId}`, error);
      }
    }
    return report;
  }

  public async refreshFill(orderId: string): Promise<SafeLiveExecutionResult> {
    const entry = this.journal.getOrder(orderId);
    if (!entry) {
      return { accepted: false, blocked: true, orderId, status: "UNKNOWN", reason: "ORDER_NOT_IN_JOURNAL", blockers: ["ORDER_NOT_IN_JOURNAL"] };
    }

    const market = entry.market === "KR" ? "KOREA" : entry.market === "US" ? "US" : "BTC";
    const fill = await this.gateway.checkFillStatus(orderId, entry.symbol, market, false);
    const previousFilledQuantity = Math.max(0, Number(entry.filledQuantity) || 0);
    const nextFilledQuantity = Math.max(previousFilledQuantity, Number(fill.filledQty) || 0);

    this.journal.updateOrder(orderId, {
      status: fill.status,
      filledQuantity: nextFilledQuantity,
      averageFillPrice: fill.filledAvgPrice > 0 ? fill.filledAvgPrice : entry.averageFillPrice,
      updatedAt: Date.now()
    });

    const fillDelta = nextFilledQuantity - previousFilledQuantity;
    if (fillDelta > 0 && fill.filledAvgPrice > 0) {
      const positionId = brokerExecutionRuntimeBridgeV20.getMappedPositionId(orderId) || entry.positionId;
      if (positionId) {
        brokerExecutionRuntimeBridgeV20.registerOrderToPosition(orderId, positionId);
        livePositionRuntimeService.onBrokerExecutionNotice(positionId, {
          noticeId: `POLL:${orderId}:${nextFilledQuantity}`,
          symbol: entry.symbol,
          side: entry.side,
          execQty: fillDelta,
          execPrice: fill.filledAvgPrice,
          remainingQty: Math.max(0, entry.quantity - nextFilledQuantity),
          timestamp: Date.now()
        });
      }
    }

    return {
      accepted: fill.status === "FILLED" || fill.status === "PARTIAL" || fill.status === "PENDING",
      blocked: false,
      orderId,
      status: fill.status,
      reason: fill.message,
      blockers: []
    };
  }
}

export const safeLiveExecutionCoordinatorV20 = new SafeLiveExecutionCoordinatorV20();
