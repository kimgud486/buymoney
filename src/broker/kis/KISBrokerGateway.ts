import { BrokerGateway, OrderRequest, BrokerOrderResult, BrokerExecutionEvent } from "../../execution/BrokerGateway";

export class KISBrokerGateway implements BrokerGateway {
  private orders: BrokerExecutionEvent[] = [];
  private positions: Map<string, { symbol: string; quantity: number; avgPrice: number }> = new Map();
  private healthy = true;

  public setHealthy(healthy: boolean): void {
    this.healthy = healthy;
  }

  public isHealthy(): boolean {
    return this.healthy;
  }

  public async submitBuy(request: OrderRequest): Promise<BrokerOrderResult> {
    if (!this.healthy) {
      return {
        success: false,
        orderId: "",
        message: "KIS Broker gateway disconnected or unhealthy"
      };
    }

    const orderId = `KIS_ORD_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const event: BrokerExecutionEvent = {
      orderId,
      symbol: request.symbol,
      side: "BUY",
      status: "ACKNOWLEDGED",
      filledQuantity: 0,
      remainingQuantity: request.quantity,
      averageFillPrice: null,
      timestamp: Date.now()
    };

    this.orders.push(event);

    return {
      success: true,
      orderId,
      message: "KIS BUY Order Acknowledged",
      executionEvent: event
    };
  }

  public async submitSell(request: OrderRequest): Promise<BrokerOrderResult> {
    if (!this.healthy) {
      return {
        success: false,
        orderId: "",
        message: "KIS Broker gateway disconnected or unhealthy"
      };
    }

    const orderId = `KIS_ORD_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const event: BrokerExecutionEvent = {
      orderId,
      symbol: request.symbol,
      side: "SELL",
      status: "ACKNOWLEDGED",
      filledQuantity: 0,
      remainingQuantity: request.quantity,
      averageFillPrice: null,
      timestamp: Date.now()
    };

    this.orders.push(event);

    return {
      success: true,
      orderId,
      message: "KIS SELL Order Acknowledged",
      executionEvent: event
    };
  }

  public async getPositions(): Promise<Array<{ symbol: string; quantity: number; avgPrice: number }>> {
    return Array.from(this.positions.values());
  }

  public async getOrders(): Promise<BrokerExecutionEvent[]> {
    return [...this.orders];
  }

  public simulateFill(orderId: string, fillPrice: number, partialQty?: number): BrokerExecutionEvent | null {
    const idx = this.orders.findIndex(o => o.orderId === orderId);
    if (idx === -1) return null;

    const ord = this.orders[idx];
    const fillQty = partialQty ?? ord.remainingQuantity;
    const isFull = fillQty >= ord.remainingQuantity;

    const updated: BrokerExecutionEvent = {
      ...ord,
      status: isFull ? "FILLED" : "PARTIAL",
      filledQuantity: ord.filledQuantity + fillQty,
      remainingQuantity: Math.max(0, ord.remainingQuantity - fillQty),
      averageFillPrice: fillPrice,
      timestamp: Date.now()
    };

    this.orders[idx] = updated;

    if (updated.side === "BUY") {
      const existing = this.positions.get(updated.symbol);
      const totalQty = (existing?.quantity ?? 0) + fillQty;
      const avgPrice = existing
        ? (existing.quantity * existing.avgPrice + fillQty * fillPrice) / totalQty
        : fillPrice;
      this.positions.set(updated.symbol, { symbol: updated.symbol, quantity: totalQty, avgPrice });
    } else if (updated.side === "SELL") {
      const existing = this.positions.get(updated.symbol);
      if (existing) {
        const remainingQty = existing.quantity - fillQty;
        if (remainingQty <= 0) {
          this.positions.delete(updated.symbol);
        } else {
          this.positions.set(updated.symbol, { ...existing, quantity: remainingQty });
        }
      }
    }

    return updated;
  }
}
