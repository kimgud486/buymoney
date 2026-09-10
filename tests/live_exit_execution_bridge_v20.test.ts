import test from "node:test";
import assert from "node:assert/strict";
import { LiveExitExecutionBridgeV20 } from "../server/v20/LiveExitExecutionBridgeV20";
import { LivePositionRuntimeService, type RuntimeEvaluationResult } from "../src/trading/LivePositionRuntimeService";

function registerSellPending(runtime: LivePositionRuntimeService, positionId = "POS-EXIT-1") {
  runtime.registerPosition({
    positionId,
    symbol: "005930",
    strategyId: "BREAKOUT_RETEST",
    state: "SELL_PENDING",
    entryPrice: 70000,
    highestPriceSinceBuy: 72000,
    lowestPriceSinceBuy: 69000,
    trailingFloor: 69500,
    initialStopPrice: 68000,
    defenseSellPrice: 69500,
    expectedSellLow: 71000,
    expectedSellMid: 72000,
    expectedSellHigh: 73000,
    continuationScore: 35,
    quantities: {
      requestedBuyQty: 3,
      buyFilledQty: 3,
      currentPositionQty: 3,
      requestedSellQty: 0,
      sellFilledQty: 0,
      remainingPositionQty: 3,
    },
    lastExitEvidence: null,
    updatedAt: Date.now(),
  });
}

function sellEvaluation(positionId = "POS-EXIT-1"): RuntimeEvaluationResult {
  return {
    positionId,
    symbol: "005930",
    previousState: "HOLD",
    nextState: "SELL_PENDING",
    actionRequired: "SUBMIT_SELL_ORDER",
    lifecycleOutput: null,
    reason: "verified defense breach",
  };
}

const context = {
  market: "KOREA" as const,
  dataStatus: "REALTIME_VERIFIED" as const,
  lastPrice: 69500,
  accountTruth: null,
  authorization: { approved: true, source: "SYSTEM_POLICY" as const },
};

test("verified SELL_PENDING action is converted to a full-position SELL intent", async () => {
  const runtime = new LivePositionRuntimeService();
  registerSellPending(runtime);
  const calls: any[] = [];
  const coordinator = {
    submit: async (request: any) => {
      calls.push(request);
      return { accepted: true, blocked: false, orderId: "SELL-1", status: "PENDING", reason: "accepted", blockers: [] };
    },
  };
  const bridge = new LiveExitExecutionBridgeV20(runtime, coordinator);

  const result = await bridge.submitIfRequired(sellEvaluation(), context);

  assert.equal(result.submitted, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].intent.side, "SELL");
  assert.equal(calls[0].intent.qty, 3);
  assert.equal(calls[0].intent.symbol, "005930");
  assert.equal(calls[0].intent.orderType, "MARKET");
  assert.equal(calls[0].idempotencyKey, "SELL:POS-EXIT-1:0:3");
  assert.equal(runtime.getPosition("POS-EXIT-1")?.state, "SELL_ACKNOWLEDGED");
  assert.equal(runtime.getPosition("POS-EXIT-1")?.quantities.requestedSellQty, 3);
});

test("blocked safe coordinator leaves the position SELL_PENDING for explicit recovery", async () => {
  const runtime = new LivePositionRuntimeService();
  registerSellPending(runtime, "POS-EXIT-2");
  const coordinator = {
    submit: async () => ({
      accepted: false,
      blocked: true,
      orderId: "",
      status: "BLOCKED",
      reason: "KILL_SWITCH_ACTIVE",
      blockers: ["KILL_SWITCH_ACTIVE"],
    }),
  };
  const bridge = new LiveExitExecutionBridgeV20(runtime, coordinator);

  const result = await bridge.submitIfRequired(sellEvaluation("POS-EXIT-2"), context);

  assert.equal(result.submitted, false);
  assert.equal(result.reason, "KILL_SWITCH_ACTIVE");
  assert.equal(runtime.getPosition("POS-EXIT-2")?.state, "SELL_PENDING");
  assert.equal(runtime.getPosition("POS-EXIT-2")?.quantities.requestedSellQty, 0);
});

test("non-sell runtime decisions never call the broker coordinator", async () => {
  const runtime = new LivePositionRuntimeService();
  registerSellPending(runtime, "POS-EXIT-3");
  let calls = 0;
  const coordinator = {
    submit: async () => {
      calls += 1;
      throw new Error("should not be called");
    },
  };
  const bridge = new LiveExitExecutionBridgeV20(runtime, coordinator);
  const evaluation: RuntimeEvaluationResult = {
    ...sellEvaluation("POS-EXIT-3"),
    nextState: "HOLD",
    actionRequired: "NONE",
  };

  const result = await bridge.submitIfRequired(evaluation, context);

  assert.equal(result.submitted, false);
  assert.equal(result.reason, "NO_SELL_ACTION_REQUIRED");
  assert.equal(calls, 0);
});
