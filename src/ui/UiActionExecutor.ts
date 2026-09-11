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

function isManualAction(actionId: string): boolean {
  return Object.prototype.hasOwnProperty.call(MANUAL_CONFIRM_MESSAGES, actionId);
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

    const manualAction = isManualAction(actionId);
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

      // Manual BUY/SELL must never become a verified success from a UI callback alone.
      // FILLED requires broker order id + filled quantity + filled price. Legacy wrappers
      // that merely return { status: "FILLED" } are downgraded to unverified ACK.
      if (manualAction && result.status === "FILLED" && !hasBrokerFillProof(result.data)) {
        return {
          ...result,
          ok: false,
          status: "ACKNOWLEDGED",
          code: "BROKER_FILL_PROOF_REQUIRED",
          message: result.message || "주문 콜백은 끝났지만 증권사 주문번호·체결수량·체결가격 증거가 없어 체결 완료로 인정하지 않습니다."
        };
      }

      // The generic SUCCESS label is also too strong for a manual order unless the
      // broker proof is attached. Keep the result truthful and fail closed.
      if (manualAction && result.status === "SUCCESS" && !hasBrokerFillProof(result.data)) {
        return {
          ...result,
          ok: false,
          status: "ACKNOWLEDGED",
          code: "BROKER_SUCCESS_PROOF_REQUIRED",
          message: result.message || "수동 주문 결과의 증권사 체결 증거를 확인하기 전에는 SUCCESS로 표시하지 않습니다."
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
