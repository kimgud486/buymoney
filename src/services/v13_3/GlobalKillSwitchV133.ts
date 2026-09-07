export class GlobalKillSwitchV133 {
  private static instance: GlobalKillSwitchV133;
  private isActive: boolean = false;
  private triggerReason: string | null = null;
  private triggeredAtMs: number | null = null;

  private constructor() {}

  public static getInstance(): GlobalKillSwitchV133 {
    if (!this.instance) {
      this.instance = new GlobalKillSwitchV133();
    }
    return this.instance;
  }

  public triggerKillSwitch(reason: string): void {
    this.isActive = true;
    this.triggerReason = reason;
    this.triggeredAtMs = Date.now();
  }

  public resetKillSwitch(): void {
    this.isActive = false;
    this.triggerReason = null;
    this.triggeredAtMs = null;
  }

  public isKillSwitchActive(): boolean {
    return this.isActive;
  }

  public getKillSwitchStatus() {
    return {
      isActive: this.isActive,
      reason: this.triggerReason,
      triggeredAtMs: this.triggeredAtMs
    };
  }
}

export const globalKillSwitchV133 = GlobalKillSwitchV133.getInstance();
