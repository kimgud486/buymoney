import type { KISLiveAccountTruth } from "../broker/KISLiveAccountTruthV212";
import type { LiveExecutionAuthorization, SafeLiveExecutionResult } from "../broker/SafeLiveExecutionCoordinatorV20";
import { safeLiveExecutionCoordinatorV20 } from "../broker/SafeLiveExecutionCoordinatorV20";
import type { VerifiedExecutionTick } from "../../src/realtime/VerifiedExecutionTick";
import type { VerifiedMarketSnapshot, RuntimeEvaluationResult } from "../../src/trading/LivePositionRuntimeService";
import { LivePositionRuntimeService, livePositionRuntimeService } from "../../src/trading/LivePositionRuntimeService";

export interface LiveExitExecutionContextV20 {
  market: "KOREA" | "US";
  dataStatus: "REALTIME_VERIFIED" | "STALE" | "NO_DATA";
  lastPrice: number;
  accountTruth: KISLiveAccountTruth | null;
  authorization: LiveExecutionAuthorization;
  orderType?: "MARKET" | "LIMIT";
  limitPrice?: number;
}

export interface LiveExitExecutionCycleResultV20 {
  evaluation: RuntimeEvaluationResult;
  execution: SafeLiveExecutionResult | null;
  submitted: boolean;
  reason: string;
}

interface SafeCoordinatorLikeV20 {
  submit(request: {
    positionId: string;
    idempotencyKey: string;
    intent: {
      symbol: string;
      market: "KOREA" | "US";
      side: "SELL";
      orderType: "MARKET" | "LIMIT";
      qty: number;
      price?: number;
    };
    dataStatus: "REALTIME_VERIFIED" | "STALE" | "NO_DATA";
    lastPrice: number;
    accountTruth: KISLiveAccountTruth | null;
    authorization: LiveExecutionAuthorization;
  }): Promise<SafeLiveExecutionResult>;
}

export class LiveExitExecutionBridgeV20 {
  constructor(
    private readonly runtime: LivePositionRuntimeService = livePositionRuntimeService,
    private readonly coordinator: SafeCoordinatorLikeV20 = safeLiveExecutionCoordinatorV20,
  ) {}

  public async onCompletedBar(
    positionId: string,
    snapshot: VerifiedMarketSnapshot,
    context: LiveExitExecutionContextV20,
  ): Promise<LiveExitExecutionCycleResultV20> {
    const evaluation = this.runtime.onCompletedBar(positionId, snapshot);
    return this.submitIfRequired(evaluation, context);
  }

  public async onVerifiedTick(
    positionId: string,
    tick: VerifiedExecutionTick,
    context: LiveExitExecutionContextV20,
  ): Promise<LiveExitExecutionCycleResultV20> {
    const evaluation = this.runtime.onVerifiedTick(positionId, tick);
    return this.submitIfRequired(evaluation, context);
  }

  public async submitIfRequired(
    evaluation: RuntimeEvaluationResult,
    context: LiveExitExecutionContextV20,
  ): Promise<LiveExitExecutionCycleResultV20> {
    if (evaluation.actionRequired !== "SUBMIT_SELL_ORDER") {
      return { evaluation, execution: null, submitted: false, reason: "NO_SELL_ACTION_REQUIRED" };
    }

    const position = this.runtime.getPosition(evaluation.positionId);
    if (!position) {
      return { evaluation, execution: null, submitted: false, reason: "POSITION_NOT_FOUND" };
    }

    if (position.state !== "SELL_PENDING") {
      return { evaluation, execution: null, submitted: false, reason: `POSITION_NOT_SELL_PENDING:${position.state}` };
    }

    const qty = Number(position.quantities.currentPositionQty);
    if (!Number.isInteger(qty) || qty <= 0) {
      return { evaluation, execution: null, submitted: false, reason: "NO_SELLABLE_POSITION_QTY" };
    }

    const orderType = context.orderType ?? "MARKET";
    const limitPrice = Number(context.limitPrice);
    if (orderType === "LIMIT" && (!Number.isFinite(limitPrice) || limitPrice <= 0)) {
      return { evaluation, execution: null, submitted: false, reason: "INVALID_LIMIT_PRICE" };
    }

    // Stable across retries for the same exit episode. The persistent journal in
    // SafeLiveExecutionCoordinatorV20 rejects duplicates after process restart too.
    const idempotencyKey = [
      "SELL",
      position.positionId,
      position.quantities.sellFilledQty,
      qty,
    ].join(":");

    const execution = await this.coordinator.submit({
      positionId: position.positionId,
      idempotencyKey,
      intent: {
        symbol: position.symbol,
        market: context.market,
        side: "SELL",
        orderType,
        qty,
        ...(orderType === "LIMIT" ? { price: limitPrice } : {}),
      },
      dataStatus: context.dataStatus,
      lastPrice: context.lastPrice,
      accountTruth: context.accountTruth,
      authorization: context.authorization,
    });

    if (execution.accepted) {
      position.quantities.requestedSellQty = qty;
      position.state = "SELL_ACKNOWLEDGED";
      position.updatedAt = Date.now();
    }

    return {
      evaluation,
      execution,
      submitted: execution.accepted,
      reason: execution.accepted ? "SELL_ORDER_ACCEPTED" : execution.reason,
    };
  }
}

export const liveExitExecutionBridgeV20 = new LiveExitExecutionBridgeV20();
