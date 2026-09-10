// ----------------------------------------------------------------------
// AISTOCK V20 UPBIT REALTIME WEBSOCKET CLIENT & TICKER HUB
// Connects to wss://api.upbit.com/websocket/v1 for 24/7 execution-grade crypto stream
// ----------------------------------------------------------------------

import { WebSocket } from "ws";
import { realtimeSubscriptionRegistryV20 } from "./RealtimeSubscriptionRegistryV20";
import { serverRealtimeMarketHubV20 } from "./ServerRealtimeMarketHubV20";

export interface UpbitRealtimeTickV20 {
  type: "ticker" | "trade" | "orderbook";
  symbol: string;
  price: number;
  signedChangePrice: number;
  signedChangeRate: number;
  accTradeVolume24h: number;
  accTradePrice24h: number;
  highest52WeekPrice: number;
  lowest52WeekPrice: number;
  tradeVolume: number;
  askBid: "ASK" | "BID";
  timestamp: number;
  grade: "EXECUTION_GRADE";
}

export type UpbitTickCallbackV20 = (tick: UpbitRealtimeTickV20) => void;

export class ServerUpbitRealtimeClientV20 {
  private ws: WebSocket | null = null;
  private subscribedMarkets: Set<string> = new Set(["KRW-BTC", "KRW-ETH", "KRW-XRP", "KRW-SOL"]);
  private listeners: Set<UpbitTickCallbackV20> = new Set();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isClosedIntentionally = false;

  constructor() {
    for (const market of this.subscribedMarkets) {
      realtimeSubscriptionRegistryV20.register({ symbol: market, market: "CRYPTO" });
    }
  }

  public connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isClosedIntentionally = false;
    try {
      this.ws = new WebSocket("wss://api.upbit.com/websocket/v1");

      this.ws.on("open", () => {
        this.sendSubscription();
      });

      this.ws.on("message", (data: Buffer | string) => {
        try {
          const str = data.toString("utf8");
          const parsed = JSON.parse(str);
          if (parsed && parsed.code && parsed.trade_price) {
            const cleanSymbol = String(parsed.code).replace("KRW-", "").toUpperCase();
            const tick: UpbitRealtimeTickV20 = {
              type: "ticker",
              symbol: cleanSymbol,
              price: Number(parsed.trade_price) || 0,
              signedChangePrice: Number(parsed.signed_change_price) || 0,
              signedChangeRate: (Number(parsed.signed_change_rate) || 0) * 100,
              accTradeVolume24h: Number(parsed.acc_trade_volume_24h) || 0,
              accTradePrice24h: Number(parsed.acc_trade_price_24h) || 0,
              highest52WeekPrice: Number(parsed.highest_52_week_price) || Number(parsed.trade_price) || 0,
              lowest52WeekPrice: Number(parsed.lowest_52_week_price) || Number(parsed.trade_price) || 0,
              tradeVolume: Number(parsed.trade_volume) || 0,
              askBid: parsed.ask_bid === "ASK" ? "ASK" : "BID",
              timestamp: Number(parsed.timestamp) || Date.now(),
              grade: "EXECUTION_GRADE"
            };

            // Unified truth path: Upbit now enters the same realtime market hub
            // used by KIS domestic and overseas quotes. The hub creates 1m OHLCV
            // candles from actual execution volume and runs the common pattern engine.
            if (tick.price > 0) {
              serverRealtimeMarketHubV20.updateQuote(
                tick.symbol,
                `${tick.symbol} (Upbit)`,
                "UPBIT",
                tick.price,
                tick.signedChangePrice,
                tick.signedChangeRate,
                tick.accTradeVolume24h,
                tick.accTradePrice24h,
                "UPBIT_WEBSOCKET_V1",
                "EXECUTION_GRADE",
                undefined,
                undefined,
                tick.tradeVolume,
              );
            }

            for (const callback of this.listeners) {
              callback(tick);
            }
          }
        } catch {
          // Ignore malformed packet
        }
      });

      this.ws.on("error", () => {
        // Socket error handling is delegated to close/reconnect.
      });

      this.ws.on("close", () => {
        this.ws = null;
        if (!this.isClosedIntentionally) {
          this.scheduleReconnect();
        }
      });
    } catch {
      this.scheduleReconnect();
    }
  }

  public subscribeMarket(symbol: string): void {
    const clean = String(symbol || "").trim().toUpperCase();
    if (!clean) return;
    const item = realtimeSubscriptionRegistryV20.register({ symbol: clean, market: "CRYPTO" });
    if (!item) return;
    const market = item.providerSymbol;
    if (!this.subscribedMarkets.has(market)) {
      this.subscribedMarkets.add(market);
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendSubscription();
      }
    }
  }

  public getSubscriptionSnapshot(): string[] {
    return Array.from(this.subscribedMarkets.values());
  }

  public isSocketConnected(): boolean {
    return Boolean(this.ws && this.ws.readyState === WebSocket.OPEN);
  }

  public onTick(callback: UpbitTickCallbackV20): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private sendSubscription(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const payload = [
      { ticket: "AISTOCK_V20_SERVER_HUB" },
      { type: "ticker", codes: Array.from(this.subscribedMarkets) },
      { format: "DEFAULT" }
    ];
    this.ws.send(JSON.stringify(payload));
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, 5000);
  }

  public close(): void {
    this.isClosedIntentionally = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const serverUpbitRealtimeClientV20 = new ServerUpbitRealtimeClientV20();