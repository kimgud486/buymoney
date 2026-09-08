import { IdempotencyStore } from "./IdempotencyStore";
import { BrokerExecutionEvent, OrderRequest, BrokerOrderResult, BrokerGateway } from "./BrokerGateway";

export class OrderManager {
  private activeOrders = new Map<string, BrokerExecutionEvent>();

  public async submitOrder(
    request: OrderRequest,
    gateway: BrokerGateway,
    side: "BUY" | "SELL"
  ): Promise<BrokerOrderResult> {
    if (IdempotencyStore.has(request.idempotencyKey)) {
      return {
        success: false,
        orderId: "",
        message: `DUPLICATE_ORDER_REJECTED: Idempotency key ${request.idempotencyKey} already used`
      };
    }

    IdempotencyStore.add(request.idempotencyKey);

    const res = side === "BUY" ? await gateway.submitBuy(request) : await gateway.submitSell(request);

    if (res.success && res.executionEvent) {
      this.activeOrders.set(res.orderId, res.executionEvent);
    }

    return res;
  }

  public handleExecutionEvent(event: BrokerExecutionEvent): BrokerExecutionEvent {
    this.activeOrders.set(event.orderId, event);
    return event;
  }

  public getOrder(orderId: string): BrokerExecutionEvent | undefined {
    return this.activeOrders.get(orderId);
  }

  public getPendingOrders(): BrokerExecutionEvent[] {
    return Array.from(this.activeOrders.values()).filter(
      o => o.status === "ACKNOWLEDGED" || o.status === "PARTIAL"
    );
  }

  public clear(): void {
    this.activeOrders.clear();
  }
}
