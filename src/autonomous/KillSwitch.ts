export type KillSwitchReason =
  | "MANUAL"
  | "DAILY_LOSS_LIMIT"
  | "PORTFOLIO_DRAWDOWN"
  | "BROKER_DISCONNECTED"
  | "MARKET_DATA_STALE"
  | "SEQUENCE_ERROR"
  | "ORDER_RECONCILIATION_FAILED"
  | "ABNORMAL_ORDER_RATE"
  | "SYSTEM_ERROR";

export interface KillSwitchRecord {
  active: boolean;
  reason: KillSwitchReason | null;
  message: string | null;
  triggeredAt: number | null;
}

export class KillSwitch {
  private state: KillSwitchRecord = {
    active: false,
    reason: null,
    message: null,
    triggeredAt: null
  };

  private history: KillSwitchRecord[] = [];

  public active(): boolean {
    return this.state.active;
  }

  public getState(): KillSwitchRecord {
    return { ...this.state };
  }

  public getHistory(): KillSwitchRecord[] {
    return [...this.history];
  }

  public trigger(reason: KillSwitchReason, message: string): void {
    this.state = {
      active: true,
      reason,
      message,
      triggeredAt: Date.now()
    };
    this.history.push({ ...this.state });
  }

  public reset(validationCode: string): boolean {
    if (validationCode === "SYSTEM_RECOVERY_VALIDATED") {
      this.state = {
        active: false,
        reason: null,
        message: null,
        triggeredAt: null
      };
      return true;
    }
    return false;
  }
}
