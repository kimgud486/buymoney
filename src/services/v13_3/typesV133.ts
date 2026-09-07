// AISTOCK v13.3 Broker Execution & Recovery Engine - Type Definitions

export type OrderExecutionStateV133 =
  | "INTENT"
  | "SUBMITTING"
  | "PENDING"
  | "PARTIAL"
  | "FILLED"
  | "REJECTED"
  | "CANCELLED"
  | "UNKNOWN"
  | "LOCKED";

export interface OrderIntentV133 {
  idempotencyKey?: string;
  logicalSignalId: string;
  strategyName: string;
  market: "KOREA" | "US" | "BTC";
  symbol: string;
  side: "BUY" | "SELL";
  orderQty: number;
  limitPrice?: number;
  timestamp: number;
}

export interface OrderExecutionRecordV133 {
  idempotencyKey: string;
  orderIntent: OrderIntentV133;
  state: OrderExecutionStateV133;
  odno?: string; // Broker order execution number (주문번호)
  filledQty: number;
  avgFillPrice: number;
  remainingQty: number;
  lastUpdatedMs: number;
  rejectionReason?: string;
  lockReason?: string;
}

export interface BrokerQueryResultV133 {
  symbol: string;
  odno?: string;
  status: "PENDING" | "PARTIAL" | "FILLED" | "CANCELLED" | "REJECTED" | "NOT_FOUND";
  filledQty: number;
  avgPrice: number;
  errorMessage?: string;
}
