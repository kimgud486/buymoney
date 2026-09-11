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

function hasBrokerFillProof(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const record = data as Record<string, unknown>;
  const status = String(record.status || "").toUpperCase();
  const filled = record.filled === true || status === "FILLED";
  const orderId = String(record.orderNo || record.odno || record.orderId || record.id || "").trim();
  const qty = Number(record.filledQty ?? record.quantity ?? record.qty);
  const price = Number(record.filledPrice ?? record.filledAvgPrice ?? record.price);
  return filled && orderId.length > 0 && Number.isFinite(qty) && qty > 0 && Number.isFinite(price) && price > 0;
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
      const result = await action();

      // A UI callback is not allowed to claim FILLED by itself. Manual BUY/SELL
      // can be shown as FILLED only when a broker fill id + qty + price are present.
      // This prevents legacy button wrappers from turning a request into a fake fill.
      if (confirmationMessage && result.status === "FILLED" && !hasBrokerFillProof(result.data)) {
        return {
          ...result,
          status: "ACKNOWLEDGED",
          code: "BROKER_FILL_PROOF_REQUIRED",
          message: result.message || "주문 요청은 처리됐지만 증권사 체결 증거가 없어 FILLED로 표시하지 않습니다."
        };
      }

      return result;
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
