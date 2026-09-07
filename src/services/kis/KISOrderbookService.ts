// KIS Orderbook Service
// Subscribes and provides real-time bid/ask orderbook depth

export interface OrderbookDepth {
  symbol: string;
  bids: Array<{ price: number; volume: number }>;
  asks: Array<{ price: number; volume: number }>;
  timestamp: number;
}

export class KISOrderbookService {
  private static instance: KISOrderbookService;
  private orderbooks: Map<string, OrderbookDepth> = new Map();

  public static getInstance(): KISOrderbookService {
    if (!KISOrderbookService.instance) {
      KISOrderbookService.instance = new KISOrderbookService();
    }
    return KISOrderbookService.instance;
  }

  public updateOrderbook(depth: OrderbookDepth): void {
    this.orderbooks.set(depth.symbol, depth);
  }

  public getOrderbook(symbol: string): OrderbookDepth | null {
    return this.orderbooks.get(symbol) || null;
  }
}

export const kisOrderbookService = KISOrderbookService.getInstance();
