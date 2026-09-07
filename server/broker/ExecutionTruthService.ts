// AISTOCK v13.8 EXECUTION TRUTH SERVICE & DUAL FILL VERIFICATION
// Strictly separates ORDER_ACCEPTED from FILLED.
// Requires verified fills from KIS WS execution events or KIS REST fill inquiry.
// Flags FILL_CONFLICT on channel mismatches and blocks unverified trade logging.

export type OrderExecutionState =
  | "SIGNAL_CREATED"
  | "ORDER_REQUESTED"
  | "ORDER_ACCEPTED"
  | "PARTIAL_FILL"
  | "FILLED"
  | "REJECTED"
  | "CANCELLED"
  | "EXPIRED"
  | "FILL_CONFLICT"
  | "UNKNOWN";

export interface VerificationRecord {
  orderNo: string;
  symbol: string;
  side: "BUY" | "SELL";
  requestedQty: number;
  filledQty: number;
  filledAvgPrice: number;
  brokerTimestamp: number;
  verifiedAt: number;
  verificationSources: Array<"KIS_WS_EXECUTION_EVENT" | "KIS_REST_FILL_INQUIRY">;
  state: OrderExecutionState;
}

export interface OrderEventLog {
  eventId: string;
  orderNo: string;
  symbol: string;
  state: OrderExecutionState;
  timestamp: number;
  details?: string;
}

export interface VerifiedTradeLog {
  tradeId: string;
  orderNo: string;
  symbol: string;
  side: "BUY" | "SELL";
  filledQty: number;
  filledAvgPrice: number;
  state: "PARTIAL_FILL" | "FILLED";
  verifiedAt: number;
  sources: string[];
}

export class ExecutionTruthService {
  private orderStates: Map<string, OrderExecutionState> = new Map();
  private orderEvents: OrderEventLog[] = [];
  private tradeLogs: VerifiedTradeLog[] = [];
  private verifications: Map<string, VerificationRecord> = new Map();
  private channelARecords: Map<string, Partial<VerificationRecord>> = new Map(); // KIS WS
  private channelBRecords: Map<string, Partial<VerificationRecord>> = new Map(); // KIS REST
  private blockedSymbols: Set<string> = new Set();

  public createSignalOrder(orderNo: string, symbol: string, side: "BUY" | "SELL", requestedQty: number): void {
    this.orderStates.set(orderNo, "SIGNAL_CREATED");
    this.recordOrderEvent(orderNo, symbol, "SIGNAL_CREATED", `Signal created for ${side} ${requestedQty} shares`);
  }

  public recordOrderRequested(orderNo: string, symbol: string): void {
    this.orderStates.set(orderNo, "ORDER_REQUESTED");
    this.recordOrderEvent(orderNo, symbol, "ORDER_REQUESTED", "Order sent to KIS API");
  }

  // When ODNO is returned from KIS API, transition to ORDER_ACCEPTED (CRITICAL: NOT FILLED)
  public recordOrderAccepted(orderNo: string, symbol: string, details?: string): void {
    this.orderStates.set(orderNo, "ORDER_ACCEPTED");
    this.recordOrderEvent(orderNo, symbol, "ORDER_ACCEPTED", details || `Order assigned ODNO ${orderNo}`);
  }

  // Submit fill notice from Channel A (KIS WS Execution Event)
  public recordChannelAFill(record: {
    orderNo: string;
    symbol: string;
    side: "BUY" | "SELL";
    requestedQty: number;
    filledQty: number;
    filledAvgPrice: number;
    brokerTimestamp: number;
  }): VerificationRecord {
    this.channelARecords.set(record.orderNo, { ...record, verificationSources: ["KIS_WS_EXECUTION_EVENT"] });
    return this.reconcileAndVerify(record.orderNo);
  }

  // Submit fill notice from Channel B (KIS REST Fill Inquiry)
  public recordChannelBFill(record: {
    orderNo: string;
    symbol: string;
    side: "BUY" | "SELL";
    requestedQty: number;
    filledQty: number;
    filledAvgPrice: number;
    brokerTimestamp: number;
  }): VerificationRecord {
    this.channelBRecords.set(record.orderNo, { ...record, verificationSources: ["KIS_REST_FILL_INQUIRY"] });
    return this.reconcileAndVerify(record.orderNo);
  }

  // Dual Fill Reconciliation
  private reconcileAndVerify(orderNo: string): VerificationRecord {
    const recA = this.channelARecords.get(orderNo);
    const recB = this.channelBRecords.get(orderNo);

    const base = recA || recB;
    if (!base || !base.symbol || !base.side || base.requestedQty == null || base.filledQty == null || base.filledAvgPrice == null) {
      throw new Error(`EXECUTION_TRUTH_ERROR: Missing base record for ${orderNo}`);
    }

    const sources: Array<"KIS_WS_EXECUTION_EVENT" | "KIS_REST_FILL_INQUIRY"> = [];
    if (recA) sources.push("KIS_WS_EXECUTION_EVENT");
    if (recB) sources.push("KIS_REST_FILL_INQUIRY");

    // Check for conflict if both channels have reported
    let isConflict = false;
    if (recA && recB) {
      if (
        recA.filledQty !== recB.filledQty ||
        Math.abs(recA.filledAvgPrice! - recB.filledAvgPrice!) > 0.001 ||
        recA.side !== recB.side
      ) {
        isConflict = true;
      }
    }

    if (isConflict) {
      this.orderStates.set(orderNo, "FILL_CONFLICT");
      this.blockedSymbols.add(base.symbol);
      this.recordOrderEvent(orderNo, base.symbol, "FILL_CONFLICT", "DISCREPANCY DETECTED BETWEEN WS AND REST FILL SOURCES");

      const record: VerificationRecord = {
        orderNo,
        symbol: base.symbol,
        side: base.side,
        requestedQty: base.requestedQty,
        filledQty: Math.min(recA?.filledQty || 0, recB?.filledQty || 0),
        filledAvgPrice: base.filledAvgPrice,
        brokerTimestamp: base.brokerTimestamp || Date.now(),
        verifiedAt: Date.now(),
        verificationSources: sources,
        state: "FILL_CONFLICT",
      };
      this.verifications.set(orderNo, record);
      return record;
    }

    // Determine state based on filledQty vs requestedQty
    let nextState: OrderExecutionState = "ORDER_ACCEPTED";
    if (base.filledQty === 0) {
      nextState = "ORDER_ACCEPTED";
    } else if (base.filledQty < base.requestedQty) {
      nextState = "PARTIAL_FILL";
    } else if (base.filledQty >= base.requestedQty) {
      nextState = "FILLED";
    }

    this.orderStates.set(orderNo, nextState);
    this.recordOrderEvent(orderNo, base.symbol, nextState, `Verified fill: ${base.filledQty}/${base.requestedQty} @ ${base.filledAvgPrice}`);

    const verifiedRecord: VerificationRecord = {
      orderNo,
      symbol: base.symbol,
      side: base.side,
      requestedQty: base.requestedQty,
      filledQty: base.filledQty,
      filledAvgPrice: base.filledAvgPrice,
      brokerTimestamp: base.brokerTimestamp || Date.now(),
      verifiedAt: Date.now(),
      verificationSources: sources,
      state: nextState,
    };

    this.verifications.set(orderNo, verifiedRecord);

    // Write to tradeLogs ONLY when actual fill occurred (PARTIAL_FILL or FILLED)
    if (nextState === "PARTIAL_FILL" || nextState === "FILLED") {
      this.tradeLogs.push({
        tradeId: `TRADE_${orderNo}_${Date.now()}`,
        orderNo,
        symbol: base.symbol,
        side: base.side,
        filledQty: base.filledQty,
        filledAvgPrice: base.filledAvgPrice,
        state: nextState,
        verifiedAt: Date.now(),
        sources,
      });
    }

    return verifiedRecord;
  }

  public isSymbolBlocked(symbol: string): boolean {
    return this.blockedSymbols.has(symbol);
  }

  public getOrderState(orderNo: string): OrderExecutionState {
    return this.orderStates.get(orderNo) || "UNKNOWN";
  }

  public getOrderEvents(): OrderEventLog[] {
    return [...this.orderEvents];
  }

  public getTradeLogs(): VerifiedTradeLog[] {
    return [...this.tradeLogs];
  }

  public getVerification(orderNo: string): VerificationRecord | null {
    return this.verifications.get(orderNo) || null;
  }

  public getDisplayStatusText(orderNo: string): string {
    const state = this.getOrderState(orderNo);
    switch (state) {
      case "ORDER_ACCEPTED":
        return "주문 접수 완료 (체결 대기)";
      case "PARTIAL_FILL":
        return "부분 체결 완료";
      case "FILLED":
        return "체결 완료"; // Strictly displayed ONLY when state === "FILLED"
      case "REJECTED":
        return "주문 거부";
      case "CANCELLED":
        return "주문 취소";
      case "FILL_CONFLICT":
        return "체결 불일치 (검증 실패)";
      default:
        return "주문 처리 중";
    }
  }

  private recordOrderEvent(orderNo: string, symbol: string, state: OrderExecutionState, details?: string) {
    this.orderEvents.push({
      eventId: `EVT_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      orderNo,
      symbol,
      state,
      timestamp: Date.now(),
      details,
    });
  }
}

export const globalExecutionTruthService = new ExecutionTruthService();
