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

const MANUAL_CONFIRM_MESSAGES: Record<string, string> = {
  "manual-buy": "매수 진입하시겠습니까?\n확인을 누르면 실제 주문 실행 단계로 진행합니다.",
  "manual-sell": "매도(청산) 주문을 실행하시겠습니까?\n확인을 누르면 실제 주문 실행 단계로 진행합니다."
};

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

    // Manual order buttons must always require an explicit user confirmation.
    // Autonomous engine actions use different action IDs and are not affected here.
    const confirmationMessage = MANUAL_CONFIRM_MESSAGES[actionId];
    if (confirmationMessage && typeof window !== "undefined") {
      const confirmed = window.confirm(confirmationMessage);
      if (!confirmed) {
        return {
          ok: false,
          status: "BLOCKED",
          code: "USER_CANCELLED",
          message: "User cancelled the manual order confirmation."
        };
      }
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
