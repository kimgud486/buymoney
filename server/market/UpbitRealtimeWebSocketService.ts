// AISTOCK realtime crypto market feed
// Upbit public quotation WebSocket + REST fallback for KRW crypto markets.

import WebSocket from "ws";

export type UpbitMarketCode = `KRW-${string}`;

export interface CryptoNormalizedTick {
  symbol: string;
  market: "CRYPTO";
  pair: UpbitMarketCode;
  price: number;
  tradeVolume: number;
  cumulativeVolume?: number;
  cumulativeTradePrice?: number;
  changeRate?: number;
  changePrice?: number;
  providerTimestamp: number;
  receivedAt: number;
  source: "UPBIT_WS" | "UPBIT_REST_FALLBACK";
  stale: false;
}

export interface UpbitRealtimeConfig {
  pairs?: UpbitMarketCode[];
  staleThresholdMs?: number;
  reconnectBaseDelayMs?: number;
  reconnectMaxDelayMs?: number;
  restFallbackIntervalMs?: number;
  websocketUrl?: string;
  restBaseUrl?: string;
}

type TickCallback = (tick: CryptoNormalizedTick) => void;
type StatusCallback = (status: UpbitRealtimeStatus) => void;

export interface UpbitRealtimeStatus {
  connected: boolean;
  reconnectCount: number;
  lastMessageAt: number | null;
  activeSource: "UPBIT_WS" | "UPBIT_REST_FALLBACK" | "NONE";
  pairs: UpbitMarketCode[];
  error?: string;
}

type UpbitTickerMessage = {
  type?: string;
  code?: string;
  trade_price?: number;
  trade_volume?: number;
  acc_trade_volume?: number;
  acc_trade_price?: number;
  signed_change_rate?: number;
  signed_change_price?: number;
  timestamp?: number;
  trade_timestamp?: number;
};

export class UpbitRealtimeWebSocketService {
  private readonly pairs: UpbitMarketCode[];
  private readonly staleThresholdMs: number;
  private readonly reconnectBaseDelayMs: number;
  private readonly reconnectMaxDelayMs: number;
  private readonly restFallbackIntervalMs: number;
  private readonly websocketUrl: string;
  private readonly restBaseUrl: string;

  private ws: WebSocket | null = null;
  private stopped = true;
  private connected = false;
  private reconnectCount = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private healthTimer: NodeJS.Timeout | null = null;
  private fallbackTimer: NodeJS.Timeout | null = null;
  private lastMessageAt: number | null = null;
  private activeSource: UpbitRealtimeStatus["activeSource"] = "NONE";
  private lastTickByPair = new Map<string, CryptoNormalizedTick>();
  private lastFingerprintByPair = new Map<string, string>();
  private tickSubscribers = new Set<TickCallback>();
  private statusSubscribers = new Set<StatusCallback>();

  constructor(config: UpbitRealtimeConfig = {}) {
    this.pairs = Array.from(new Set(config.pairs?.length ? config.pairs : ["KRW-BTC"]));
    this.staleThresholdMs = config.staleThresholdMs ?? 10_000;
    this.reconnectBaseDelayMs = config.reconnectBaseDelayMs ?? 1_000;
    this.reconnectMaxDelayMs = config.reconnectMaxDelayMs ?? 30_000;
    this.restFallbackIntervalMs = config.restFallbackIntervalMs ?? 3_000;
    this.websocketUrl = config.websocketUrl ?? "wss://api.upbit.com/websocket/v1";
    this.restBaseUrl = config.restBaseUrl ?? "https://api.upbit.com";
  }

  public subscribeTicks(callback: TickCallback): () => void {
    this.tickSubscribers.add(callback);
    return () => this.tickSubscribers.delete(callback);
  }

  public subscribeStatus(callback: StatusCallback): () => void {
    this.statusSubscribers.add(callback);
    callback(this.getStatus());
    return () => this.statusSubscribers.delete(callback);
  }

  public start(): void {
    if (!this.stopped) return;
    this.stopped = false;
    this.connect();
    this.healthTimer = setInterval(() => this.checkHealth(), 1_000);
  }

  public stop(): void {
    this.stopped = true;
    this.connected = false;
    this.activeSource = "NONE";
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.healthTimer) clearInterval(this.healthTimer);
    if (this.fallbackTimer) clearInterval(this.fallbackTimer);
    this.reconnectTimer = null;
    this.healthTimer = null;
    this.fallbackTimer = null;
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
    this.notifyStatus();
  }

  public getStatus(): UpbitRealtimeStatus {
    return {
      connected: this.connected,
      reconnectCount: this.reconnectCount,
      lastMessageAt: this.lastMessageAt,
      activeSource: this.activeSource,
      pairs: [...this.pairs],
    };
  }

  public getLastTick(pair: UpbitMarketCode = "KRW-BTC"): CryptoNormalizedTick | null {
    return this.lastTickByPair.get(pair) ?? null;
  }

  public isPairStale(pair: UpbitMarketCode = "KRW-BTC"): boolean {
    const tick = this.lastTickByPair.get(pair);
    return !tick || Date.now() - tick.receivedAt > this.staleThresholdMs;
  }

  public getQuoteAgeMs(pair: UpbitMarketCode = "KRW-BTC"): number | null {
    const tick = this.lastTickByPair.get(pair);
    return tick ? Date.now() - tick.receivedAt : null;
  }

  private connect(): void {
    if (this.stopped) return;

    const ws = new WebSocket(this.websocketUrl, {
      handshakeTimeout: 10_000,
      perMessageDeflate: false,
    });
    this.ws = ws;

    ws.on("open", () => {
      if (this.ws !== ws || this.stopped) return;
      this.connected = true;
      this.reconnectCount = 0;
      this.activeSource = "UPBIT_WS";
      this.stopRestFallback();
      ws.send(JSON.stringify([
        { ticket: `aistock-${Date.now()}` },
        { type: "ticker", codes: this.pairs, is_only_realtime: true },
        { format: "DEFAULT" },
      ]));
      this.notifyStatus();
    });

    ws.on("message", (buffer) => {
      if (this.ws !== ws || this.stopped) return;
      try {
        const raw = JSON.parse(buffer.toString()) as UpbitTickerMessage;
        this.lastMessageAt = Date.now();
        const tick = this.normalize(raw, "UPBIT_WS");
        if (tick) this.publish(tick);
      } catch (error) {
        this.notifyStatus(error instanceof Error ? error.message : "UPBIT_WS_PARSE_ERROR");
      }
    });

    ws.on("ping", (data) => {
      try { ws.pong(data); } catch { /* socket may already be closing */ }
    });

    ws.on("error", (error) => {
      this.notifyStatus(error.message);
    });

    ws.on("close", () => {
      if (this.ws !== ws) return;
      this.connected = false;
      this.ws = null;
      if (!this.stopped) {
        this.startRestFallback();
        this.scheduleReconnect();
      }
      this.notifyStatus();
    });
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.reconnectTimer) return;
    this.reconnectCount += 1;
    const delay = Math.min(
      this.reconnectBaseDelayMs * Math.pow(2, Math.max(0, this.reconnectCount - 1)),
      this.reconnectMaxDelayMs,
    );
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private checkHealth(): void {
    if (this.stopped) return;
    if (this.connected && this.lastMessageAt && Date.now() - this.lastMessageAt > this.staleThresholdMs) {
      this.connected = false;
      this.activeSource = "UPBIT_REST_FALLBACK";
      this.startRestFallback();
      try { this.ws?.terminate(); } catch { /* no-op */ }
      this.notifyStatus("UPBIT_WS_STALE");
    }
  }

  private startRestFallback(): void {
    if (this.stopped || this.fallbackTimer) return;
    this.activeSource = "UPBIT_REST_FALLBACK";
    void this.fetchRestFallback();
    this.fallbackTimer = setInterval(() => void this.fetchRestFallback(), this.restFallbackIntervalMs);
  }

  private stopRestFallback(): void {
    if (this.fallbackTimer) clearInterval(this.fallbackTimer);
    this.fallbackTimer = null;
  }

  private async fetchRestFallback(): Promise<void> {
    if (this.stopped || this.connected) return;
    try {
      const url = `${this.restBaseUrl}/v1/ticker?markets=${encodeURIComponent(this.pairs.join(","))}`;
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) throw new Error(`UPBIT_REST_${response.status}`);
      const items = await response.json() as UpbitTickerMessage[];
      for (const raw of items) {
        const tick = this.normalize(raw, "UPBIT_REST_FALLBACK");
        if (tick) this.publish(tick);
      }
    } catch (error) {
      this.notifyStatus(error instanceof Error ? error.message : "UPBIT_REST_ERROR");
    }
  }

  private normalize(
    raw: UpbitTickerMessage,
    source: CryptoNormalizedTick["source"],
  ): CryptoNormalizedTick | null {
    const pair = raw.code as UpbitMarketCode | undefined;
    const price = raw.trade_price;
    const providerTimestamp = raw.trade_timestamp ?? raw.timestamp;

    if (!pair || !this.pairs.includes(pair)) return null;
    if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) return null;
    if (typeof providerTimestamp !== "number" || !Number.isFinite(providerTimestamp) || providerTimestamp <= 0) return null;

    const now = Date.now();
    if (providerTimestamp > now + 60_000) return null;
    if (now - providerTimestamp > Math.max(this.staleThresholdMs * 3, 60_000)) return null;

    const tradeVolume = typeof raw.trade_volume === "number" && raw.trade_volume >= 0 ? raw.trade_volume : 0;
    const fingerprint = `${providerTimestamp}_${price}_${tradeVolume}_${source}`;
    if (this.lastFingerprintByPair.get(pair) === fingerprint) return null;
    this.lastFingerprintByPair.set(pair, fingerprint);

    return {
      symbol: pair.replace(/^KRW-/, ""),
      market: "CRYPTO",
      pair,
      price,
      tradeVolume,
      cumulativeVolume: raw.acc_trade_volume,
      cumulativeTradePrice: raw.acc_trade_price,
      changeRate: raw.signed_change_rate,
      changePrice: raw.signed_change_price,
      providerTimestamp,
      receivedAt: now,
      source,
      stale: false,
    };
  }

  private publish(tick: CryptoNormalizedTick): void {
    this.lastTickByPair.set(tick.pair, tick);
    this.tickSubscribers.forEach((callback) => {
      try { callback(tick); } catch (error) { console.error("[UPBIT] subscriber error", error); }
    });
  }

  private notifyStatus(error?: string): void {
    const status = { ...this.getStatus(), ...(error ? { error } : {}) };
    this.statusSubscribers.forEach((callback) => {
      try { callback(status); } catch (callbackError) { console.error("[UPBIT] status subscriber error", callbackError); }
    });
  }
}
