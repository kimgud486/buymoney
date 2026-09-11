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

export type ManualOrderLifecycleStage =
  | "CONFIRM_REQUIRED"
  | "CONFIRMED"
  | "SUBMITTING"
  | "ACKNOWLEDGED"
  | "PARTIAL"
  | "FILLED"
  | "BLOCKED"
  | "FAILED";

export interface ManualOrderLifecycleDetail {
  actionId: string;
  side: "BUY" | "SELL";
  stage: ManualOrderLifecycleStage;
  status?: UiActionStatus;
  code?: string;
  message?: string;
  orderId?: string | null;
  filledQty?: number | null;
  filledPrice?: number | null;
  occurredAt: number;
}

export const MANUAL_ORDER_LIFECYCLE_EVENT = "aistock-manual-order-lifecycle";

const MANUAL_CONFIRM_MESSAGES: Record<string, string> = {
  "manual-buy": "매수 진입하시겠습니까?\n확인을 누르면 실제 주문 실행 단계로 진행합니다.",
  "manual-sell": "매도(청산) 주문을 실행하시겠습니까?\n확인을 누르면 실제 주문 실행 단계로 진행합니다."
};

type BrokerEvidence = {
  orderId: string | null;
  filledQty: number | null;
  filledPrice: number | null;
};

function getManualSide(actionId: string): "BUY" | "SELL" | null {
  if (actionId === "manual-buy") return "BUY";
  if (actionId === "manual-sell") return "SELL";
  return null;
}

function extractBrokerEvidence(data: unknown): BrokerEvidence {
  if (!data || typeof data !== "object") {
    return { orderId: null, filledQty: null, filledPrice: null };
  }

  const record = data as Record<string, unknown>;
  const orderIdRaw = record.orderNo || record.odno || record.orderId || record.id;
  const qtyRaw = record.filledQty ?? record.quantity ?? record.qty;
  const priceRaw = record.filledPrice ?? record.filledAvgPrice ?? record.price;

  const orderId = String(orderIdRaw || "").trim() || null;
  const qty = Number(qtyRaw);
  const price = Number(priceRaw);

  return {
    orderId,
    filledQty: Number.isFinite(qty) && qty > 0 ? qty : null,
    filledPrice: Number.isFinite(price) && price > 0 ? price : null,
  };
}

function hasBrokerFillProof(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const record = data as Record<string, unknown>;
  const status = String(record.status || "").toUpperCase();
  const filled = record.filled === true || status === "FILLED";
  const evidence = extractBrokerEvidence(data);
  return Boolean(
    filled &&
      evidence.orderId &&
      evidence.filledQty &&
      evidence.filledPrice,
  );
}

function hasBrokerPartialProof(data: unknown): boolean {
  const evidence = extractBrokerEvidence(data);
  return Boolean(evidence.orderId && evidence.filledQty && evidence.filledPrice);
}

function isManualAction(actionId: string): boolean {
  return getManualSide(actionId) !== null;
}

function dispatchManualLifecycle(
  actionId: string,
  stage: ManualOrderLifecycleStage,
  result?: UiActionResult,
): void {
  const side = getManualSide(actionId);
  if (!side || typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;

  const EventCtor = (window as any).CustomEvent || (globalThis as any).CustomEvent;
  if (typeof EventCtor !== "function") return;

  const evidence = extractBrokerEvidence(result?.data);
  const detail: ManualOrderLifecycleDetail = {
    actionId,
    side,
    stage,
    status: result?.status,
    code: result?.code,
    message: result?.message,
    orderId: evidence.orderId,
    filledQty: evidence.filledQty,
    filledPrice: evidence.filledPrice,
    occurredAt: Date.now(),
  };

  window.dispatchEvent(new EventCtor(MANUAL_ORDER_LIFECYCLE_EVENT, { detail }));
}

function normalizeManualResult<T>(result: UiActionResult<T>): UiActionResult<T> {
  if (result.status === "PARTIAL" && !hasBrokerPartialProof(result.data)) {
    return {
      ...result,
      ok: false,
      status: "ACKNOWLEDGED",
      code: "BROKER_PARTIAL_PROOF_REQUIRED",
      message:
        result.message ||
        "부분체결 표시는 증권사 주문번호·체결수량·체결가격 증거가 확인된 뒤에만 가능합니다.",
    };
  }

  if (result.status === "FILLED" && !hasBrokerFillProof(result.data)) {
    return {
      ...result,
      ok: false,
      status: "ACKNOWLEDGED",
      code: "BROKER_FILL_PROOF_REQUIRED",
      message:
        result.message ||
        "주문 콜백은 끝났지만 증권사 주문번호·체결수량·체결가격 증거가 없어 체결 완료로 인정하지 않습니다.",
    };
  }

  if (result.status === "SUCCESS") {
    if (!hasBrokerFillProof(result.data)) {
      return {
        ...result,
        ok: false,
        status: "ACKNOWLEDGED",
        code: "BROKER_SUCCESS_PROOF_REQUIRED",
        message:
          result.message ||
          "수동 주문 결과의 증권사 체결 증거를 확인하기 전에는 SUCCESS로 표시하지 않습니다.",
      };
    }

    return {
      ...result,
      ok: true,
      status: "FILLED",
      code: "BROKER_FILL_VERIFIED",
      message: result.message || "증권사 체결 증거가 확인되었습니다.",
    };
  }

  return result;
}

function stageFromResult(result: UiActionResult): ManualOrderLifecycleStage {
  if (result.status === "FILLED") return "FILLED";
  if (result.status === "PARTIAL") return "PARTIAL";
  if (result.status === "FAILED") return "FAILED";
  if (result.status === "BLOCKED") return "BLOCKED";
  return "ACKNOWLEDGED";
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
    const manualAction = isManualAction(actionId);

    if (this.inFlight.has(actionId)) {
      const blocked: UiActionResult<T> = {
        ok: false,
        status: "BLOCKED",
        code: "ACTION_ALREADY_RUNNING",
        message: "Action is currently executing. Double click prevented."
      };
      if (manualAction) dispatchManualLifecycle(actionId, "BLOCKED", blocked);
      return blocked;
    }

    const validation = validate();
    if (validation) {
      if (manualAction) dispatchManualLifecycle(actionId, "BLOCKED", validation);
      return validation as UiActionResult<T>;
    }

    const confirmationMessage = MANUAL_CONFIRM_MESSAGES[actionId];
    if (confirmationMessage && typeof window !== "undefined") {
      dispatchManualLifecycle(actionId, "CONFIRM_REQUIRED");
      const confirmed = window.confirm(confirmationMessage);
      if (!confirmed) {
        const cancelled: UiActionResult<T> = {
          ok: false,
          status: "BLOCKED",
          code: "USER_CANCELLED",
          message: "User cancelled the manual order confirmation."
        };
        dispatchManualLifecycle(actionId, "BLOCKED", cancelled);
        return cancelled;
      }
      dispatchManualLifecycle(actionId, "CONFIRMED");
    }

    this.inFlight.add(actionId);
    if (manualAction) dispatchManualLifecycle(actionId, "SUBMITTING", {
      ok: true,
      status: "SUBMITTING",
      code: "SUBMITTING",
      message: "사용자 확인 완료. 브로커 주문 요청을 처리 중입니다.",
    });

    try {
      const rawResult = await action();
      const result = manualAction ? normalizeManualResult(rawResult) : rawResult;
      if (manualAction) dispatchManualLifecycle(actionId, stageFromResult(result), result);
      return result;
    } catch (error) {
      const failed: UiActionResult<T> = {
        ok: false,
        status: "FAILED",
        code: "ACTION_EXCEPTION",
        message: error instanceof Error ? error.message : String(error)
      };
      if (manualAction) dispatchManualLifecycle(actionId, "FAILED", failed);
      return failed;
    } finally {
      this.inFlight.delete(actionId);
    }
  }
}

export const uiActionExecutor = new UiActionExecutor();
