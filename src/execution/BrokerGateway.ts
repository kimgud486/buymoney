export interface OrderRequest {
  symbol: string;
  market: "KR" | "US" | "CRYPTO";
  quantity: number;
  price?: number;
  idempotencyKey: string;
}

export interface BrokerExecutionEvent {
  orderId: string;
  symbol: string;
  side: "BUY" | "SELL";
  status: "ACKNOWLEDGED" | "PARTIAL" | "FILLED" | "CANCELLED" | "REJECTED";
  filledQuantity: number;
  remainingQuantity: number;
  averageFillPrice: number | null;
  timestamp: number;
  rejectionReason?: string;
}

export interface BrokerOrderResult {
  success: boolean;
  orderId: string;
  message: string;
  executionEvent?: BrokerExecutionEvent;
}

export interface BrokerGateway {
  submitBuy(request: OrderRequest): Promise<BrokerOrderResult>;
  submitSell(request: OrderRequest): Promise<BrokerOrderResult>;
  getPositions(): Promise<Array<{ symbol: string; quantity: number; avgPrice: number }>>;
  getOrders(): Promise<BrokerExecutionEvent[]>;
  isHealthy(): boolean;
}
