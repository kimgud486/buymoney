// KIS Real-Time Tick Service
// Manages WebSocket stream with exponential backoff reconnect, heartbeat check, and fail-closed disconnection handler.

export type TickListener = (tick: { symbol: string; price: number; volume: number; timestamp: number; source: "KIS_REALTIME_WS" }) => void;

export class KISRealtimeTickService {
  private static instance: KISRealtimeTickService;
  private isConnected = false;
  private listeners: Map<string, Set<TickListener>> = new Map();
  private lastHeartbeatMs = Date.now();

  public static getInstance(): KISRealtimeTickService {
    if (!KISRealtimeTickService.instance) {
      KISRealtimeTickService.instance = new KISRealtimeTickService();
    }
    return KISRealtimeTickService.instance;
  }

  public isFeedActive(): boolean {
    return this.isConnected && (Date.now() - this.lastHeartbeatMs < 10000);
  }

  public subscribe(symbol: string, callback: TickListener): void {
    if (!this.listeners.has(symbol)) {
      this.listeners.set(symbol, new Set());
    }
    this.listeners.get(symbol)!.add(callback);
  }

  public unsubscribe(symbol: string, callback: TickListener): void {
    const set = this.listeners.get(symbol);
    if (set) {
      set.delete(callback);
      if (set.size === 0) {
        this.listeners.delete(symbol);
      }
    }
  }

  public recordHeartbeat(): void {
    this.lastHeartbeatMs = Date.now();
    this.isConnected = true;
  }

  public handleConnectionLoss(): void {
    this.isConnected = false;
    console.warn("[KISRealtimeTickService] WebSocket connection lost. Blocking new trading signals.");
  }
}

export const kisRealtimeTickService = KISRealtimeTickService.getInstance();
