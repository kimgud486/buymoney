// AISTOCK 24 v11 Execution State Machine
// Manages position lifecycle: IDLE -> BUY_PENDING -> LONG -> SELL_PENDING -> COOLDOWN -> IDLE / LOCKED

export type OrderState = "IDLE" | "BUY_PENDING" | "LONG" | "SELL_PENDING" | "COOLDOWN" | "LOCKED";
export type TradingMode = "PAPER" | "DRY_RUN" | "LIVE";
export type SignalType = "BUY" | "SELL" | "HOLD";

export interface OrderSignal {
  id: string;
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  signalType: SignalType;
  price: number;
  convictionScore: number;
  timestamp: number; // Epoch ms
  scannerScore: number;
  unifiedShape: string;
  reason: string;
}

export interface PositionContext {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  buyPrice: number;
  currentPrice: number;
  qty: number;
  buyTimestamp: number;
  unrealizedPnLAmt: number;
  unrealizedPnLPct: number;
  highPriceSinceBuy: number;
  trailingExitPrice: number;
  orderId?: string;
}

export interface StateMachineStatus {
  currentState: OrderState;
  activePosition: PositionContext | null;
  lastSignal: OrderSignal | null;
  mode: TradingMode;
  liveTradingEnabled: boolean;
  cooldownEndsAt: number | null;
  lockReason: string | null;
  lastUpdated: string;
}

export class ExecutionStateMachine {
  private currentState: OrderState = "IDLE";
  private activePosition: PositionContext | null = null;
  private lastSignal: OrderSignal | null = null;
  private mode: TradingMode = "PAPER";
  private liveTradingEnabled: boolean = false; // Dual-lock requirement for LIVE
  private cooldownEndsAt: number | null = null;
  private lockReason: string | null = null;
  private listeners: Array<(status: StateMachineStatus) => void> = [];

  constructor(initialMode: TradingMode = "PAPER") {
    this.mode = initialMode;
  }

  public getStatus(): StateMachineStatus {
    return {
      currentState: this.currentState,
      activePosition: this.activePosition ? { ...this.activePosition } : null,
      lastSignal: this.lastSignal ? { ...this.lastSignal } : null,
      mode: this.mode,
      liveTradingEnabled: this.liveTradingEnabled,
      cooldownEndsAt: this.cooldownEndsAt,
      lockReason: this.lockReason,
      lastUpdated: new Date().toLocaleTimeString("ko-KR")
    };
  }

  public subscribe(listener: (status: StateMachineStatus) => void): () => void {
    this.listeners.push(listener);
    listener(this.getStatus());
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    const status = this.getStatus();
    this.listeners.forEach(listener => listener(status));
  }

  // Dual-lock setup for LIVE trading
  public setTradingMode(mode: TradingMode, enableLiveDualLock: boolean = false) {
    this.mode = mode;
    this.liveTradingEnabled = enableLiveDualLock;
    if (mode === "LIVE" && !enableLiveDualLock) {
      console.warn("[v11 StateMachine] LIVE mode selected but liveTradingEnabled is false. Live trading remains locked.");
    }
    this.notify();
  }

  public isLiveExecutionPermitted(): boolean {
    return this.mode === "LIVE" && this.liveTradingEnabled;
  }

  // 1. Transition IDLE -> BUY_PENDING
  public transitionToBuyPending(signal: OrderSignal): { success: boolean; reason: string } {
    if (this.currentState !== "IDLE") {
      return { success: false, reason: `현재 상태가 IDLE이 아닙니다 (현재: ${this.currentState})` };
    }

    // Check Signal Stale (max 10 seconds age)
    const ageSeconds = (Date.now() - signal.timestamp) / 1000;
    if (ageSeconds > 10) {
      return { success: false, reason: `시그널 지연 발생 (경과시간: ${ageSeconds.toFixed(1)}초 > 10초 초과)` };
    }

    this.currentState = "BUY_PENDING";
    this.lastSignal = signal;
    this.notify();
    return { success: true, reason: "BUY_PENDING 상태로 승인되었습니다." };
  }

  // 2. Transition BUY_PENDING -> LONG (Fill Confirmed)
  public confirmBuyFill(position: PositionContext): { success: boolean; reason: string } {
    if (this.currentState !== "BUY_PENDING") {
      return { success: false, reason: `현재 상태가 BUY_PENDING이 아닙니다 (현재: ${this.currentState})` };
    }

    this.currentState = "LONG";
    this.activePosition = position;
    this.notify();
    return { success: true, reason: "BUY 체결 확인 완료. LONG 포지션 진입." };
  }

  // 3. Reject BUY_PENDING -> IDLE
  public rejectBuyPending(reason: string) {
    if (this.currentState === "BUY_PENDING") {
      this.currentState = "IDLE";
      this.notify();
    }
  }

  // 4. Transition LONG -> SELL_PENDING
  public transitionToSellPending(signal: OrderSignal): { success: boolean; reason: string } {
    if (this.currentState !== "LONG") {
      return { success: false, reason: `현재 상태가 LONG이 아닙니다 (현재: ${this.currentState})` };
    }

    const ageSeconds = (Date.now() - signal.timestamp) / 1000;
    if (ageSeconds > 10) {
      return { success: false, reason: `SELL 시그널 지연 발생 (경과시간: ${ageSeconds.toFixed(1)}초 > 10초 초과)` };
    }

    this.currentState = "SELL_PENDING";
    this.lastSignal = signal;
    this.notify();
    return { success: true, reason: "SELL_PENDING 상태로 승인되었습니다." };
  }

  // 5. Transition SELL_PENDING -> COOLDOWN (Fill Confirmed)
  public confirmSellFill(cooldownMs: number = 30000): { success: boolean; reason: string } {
    if (this.currentState !== "SELL_PENDING") {
      return { success: false, reason: `현재 상태가 SELL_PENDING이 아닙니다 (현재: ${this.currentState})` };
    }

    this.currentState = "COOLDOWN";
    this.activePosition = null;
    this.cooldownEndsAt = Date.now() + cooldownMs;
    this.notify();

    // Auto clear cooldown
    setTimeout(() => {
      if (this.currentState === "COOLDOWN") {
        this.currentState = "IDLE";
        this.cooldownEndsAt = null;
        this.notify();
      }
    }, cooldownMs);

    return { success: true, reason: "SELL 체결 확인 완료. COOLDOWN 진입." };
  }

  // 6. Reject SELL_PENDING -> LONG
  public rejectSellPending(reason: string) {
    if (this.currentState === "SELL_PENDING") {
      this.currentState = "LONG";
      this.notify();
    }
  }

  // 7. Lock state (Emergency / Risk Limit Breach)
  public triggerLock(reason: string) {
    this.currentState = "LOCKED";
    this.lockReason = reason;
    this.notify();
  }

  // 8. Unlock state manually / reset to IDLE
  public unlockAdmin() {
    this.currentState = "IDLE";
    this.lockReason = null;
    this.notify();
  }

  public resetToIdle() {
    this.currentState = "IDLE";
    this.cooldownEndsAt = null;
    this.notify();
  }

  // Update position price tick in real-time
  public updatePositionPrice(currentPrice: number) {
    if (this.currentState === "LONG" && this.activePosition) {
      const pos = this.activePosition;
      pos.currentPrice = currentPrice;
      if (currentPrice > pos.highPriceSinceBuy) {
        pos.highPriceSinceBuy = currentPrice;
        pos.trailingExitPrice = Math.round(currentPrice * 0.985 * 100) / 100; // 1.5% trailing stop
      }
      pos.unrealizedPnLAmt = (currentPrice - pos.buyPrice) * pos.qty;
      pos.unrealizedPnLPct = Math.round(((currentPrice - pos.buyPrice) / pos.buyPrice) * 1000) / 10;
      this.notify();
    }
  }
}

export const globalExecutionStateMachine = new ExecutionStateMachine();

