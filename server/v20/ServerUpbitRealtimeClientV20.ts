// ----------------------------------------------------------------------
// AISTOCK V20 UPBIT REALTIME WEBSOCKET CLIENT & TICKER HUB
// Full KRW market subscription + staged candle warming
// ----------------------------------------------------------------------

import { WebSocket } from "ws";
import { realtimeSubscriptionRegistryV20 } from "./RealtimeSubscriptionRegistryV20";
import { serverRealtimeMarketHubV20 } from "./ServerRealtimeMarketHubV20";
import { serverCandleWarmCoordinatorV20 } from "./ServerCandleWarmCoordinatorV20";

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

const UPBIT_MARKET_ALL_URL = "https://api.upbit.com/v1/market/all?is_details=false";
const WARM_ROTATION_MS = 30_000;
const WARM_BATCH_SIZE = 8;

export class ServerUpbitRealtimeClientV20 {
  private ws: WebSocket | null = null;
  private subscribedMarkets: Set<string> = new Set(["KRW-BTC", "KRW-ETH", "KRW-XRP", "KRW-SOL"]);
  private listeners: Set<UpbitTickCallbackV20> = new Set();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private warmTimer: NodeJS.Timeout | null = null;
  private warmCursor = 0;
  private isClosedIntentionally = false;

  constructor() {
    for (const market of this.subscribedMarkets) {
      realtimeSubscriptionRegistryV20.register({ symbol: market, market: "CRYPTO" });
    }
  }

  public connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) return;

    this.isClosedIntentionally = false;
    try {
      this.ws = new WebSocket("wss://api.upbit.com/websocket/v1");

      this.ws.on("open", () => {
        this.sendSubscription();
        void this.hydrateAllKrwMarkets();
        this.startWarmRotation();
      });

      this.ws.on("message", (data: Buffer | string) => {
        try {
          const parsed = JSON.parse(data.toString("utf8"));
          if (parsed && parsed.code && parsed.trade_price) {
            const providerMarket = String(parsed.code).toUpperCase();
            const cleanSymbol = providerMarket.replace("KRW-", "");
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

            if (tick.price > 0) {
              serverRealtimeMarketHubV20.updateQuote(
                providerMarket,
                `${cleanSymbol} (Upbit)`,
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

            for (const callback of this.listeners) callback(tick);
          }
        } catch {
          // Ignore malformed packet.
        }
      });

      this.ws.on("error", () => {
        // close/reconnect handles recovery.
      });

      this.ws.on("close", () => {
        this.ws = null;
        this.stopWarmRotation();
        if (!this.isClosedIntentionally) this.scheduleReconnect();
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
      if (this.ws && this.ws.readyState === WebSocket.OPEN) this.sendSubscription();
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
    return () => this.listeners.delete(callback);
  }

  private async hydrateAllKrwMarkets(): Promise<void> {
    try {
      const response = await fetch(UPBIT_MARKET_ALL_URL, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
      if (!response.ok) return;
      const rows = await response.json() as any[];
      let changed = false;
      for (const row of Array.isArray(rows) ? rows : []) {
        const market = String(row?.market || "").toUpperCase();
        if (!market.startsWith("KRW-")) continue;
        realtimeSubscriptionRegistryV20.register({ symbol: market, market: "CRYPTO" });
        if (!this.subscribedMarkets.has(market)) {
          this.subscribedMarkets.add(market);
          changed = true;
        }
      }
      if (changed && this.ws?.readyState === WebSocket.OPEN) this.sendSubscription();
    } catch {
      // Keep existing verified subscription set on provider failure.
    }
  }

  private startWarmRotation(): void {
    if (this.warmTimer) return;
    const run = () => void this.warmNextBatch();
    run();
    this.warmTimer = setInterval(run, WARM_ROTATION_MS);
  }

  private stopWarmRotation(): void {
    if (this.warmTimer) clearInterval(this.warmTimer);
    this.warmTimer = null;
  }

  private async warmNextBatch(): Promise<void> {
    const markets = Array.from(this.subscribedMarkets.values());
    if (!markets.length) return;
    const batch: string[] = [];
    for (let i = 0; i < Math.min(WARM_BATCH_SIZE, markets.length); i++) {
      batch.push(markets[(this.warmCursor + i) % markets.length]);
    }
    this.warmCursor = (this.warmCursor + batch.length) % markets.length;
    await serverCandleWarmCoordinatorV20.warmBatch(batch.map((symbol) => ({ symbol, market: "UPBIT" as const })), WARM_BATCH_SIZE);
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
    this.reconnectTimer = setTimeout(() => this.connect(), 5000);
  }

  public close(): void {
    this.isClosedIntentionally = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.stopWarmRotation();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const serverUpbitRealtimeClientV20 = new ServerUpbitRealtimeClientV20();
