export type SupervisorStateV134 = "HEALTHY" | "DEGRADED" | "UNHEALTHY";

export interface ComponentHeartbeatV134 {
  name: string; // e.g. "MARKET_DATA", "KIS_REST", "KIS_WS", "PERSISTENCE"
  isAlive: boolean;
  lastHeartbeatTime: number; // timestamp in ms
  latencyMs?: number;
  errorCount: number;
  message?: string;
}

export interface CircuitBreakerStatusV134 {
  isTripped: boolean;
  tripReason?: string;
  consecutiveFailures: number;
  lastTripTime?: number;
}

export type FillVerificationStatusV134 = "MATCHED" | "MISMATCH" | "PENDING";

export interface DualChannelFillRecordV134 {
  orderId: string;
  symbol: string;
  requestedQty: number;
  wsFilledQty?: number;
  restFilledQty?: number;
  status: FillVerificationStatusV134;
  verifiedAt?: string;
}

export interface ProductionSupervisorStatusV134 {
  state: SupervisorStateV134;
  allowNewBuyOrders: boolean;
  allowPositionManagement: boolean; // Allow exit/sell/risk reduction
  allowRecovery: boolean;
  heartbeats: Record<string, ComponentHeartbeatV134>;
  circuitBreaker: CircuitBreakerStatusV134;
  rejectionReasons: string[];
  timestamp: string;
}
