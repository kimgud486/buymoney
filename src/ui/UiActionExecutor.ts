export type UiActionStatus =
  | "IDLE"
  | "VALIDATING"
  | "SUBMITTING"
  | "ACKNOWLEDGED"
  | "PARTIAL"
  | "FILLED"
  | "SUCCESS"
  | "BLOCKED"
  | "FAILED";

export interface UiActionResult<T = unknown> {
  ok: boolean;
  status: UiActionStatus;
  code: string;
  message?: string;
  data?: T;
}

export interface UiActionContext {
  isRealTrade: boolean;
  autoTradingEnabled: boolean;
  brokerConnected: boolean;
  brokerHealthy: boolean;
  accountSynced: boolean;
  feedVerified: boolean;
  feedFresh: boolean;
  killSwitchActive: boolean;
}

export class UiActionExecutor {
  private inFlight = new Set<string>();

  public isRunning(actionId: string): boolean {
    return this.inFlight.has(actionId);
  }

  public async execute<T>(
    actionId: string,
    validate: () => UiActionResult | null,
    action: () => Promise<UiActionResult<T>>
  ): Promise<UiActionResult<T>> {
    if (this.inFlight.has(actionId)) {
      return {
        ok: false,
        status: "BLOCKED",
        code: "ACTION_ALREADY_RUNNING",
        message: "Action is currently executing. Double click prevented."
      };
    }

    const validation = validate();
    if (validation) {
      return validation as UiActionResult<T>;
    }

    this.inFlight.add(actionId);

    try {
      return await action();
    } catch (error) {
      return {
        ok: false,
        status: "FAILED",
        code: "ACTION_EXCEPTION",
        message: error instanceof Error ? error.message : String(error)
      };
    } finally {
      this.inFlight.delete(actionId);
    }
  }
}

export const uiActionExecutor = new UiActionExecutor();
