import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AutonomousBrokerDispatchRequestV26,
  AutonomousTradeExecutionCoordinatorV26,
} from "../server/live/AutonomousTradeExecutionCoordinatorV26";

class RecordingDispatcher {
  calls: AutonomousBrokerDispatchRequestV26[] = [];
  async submit(request: AutonomousBrokerDispatchRequestV26) {
    this.calls.push(request);
    return {
      accepted: true,
      orderNo: "REAL-ORDER-1",
      status: "PENDING",
      message: "accepted",
    };
  }
}

const account = {
  accountKey: "KIS:DOMESTIC",
  cash: 10_000_000,
  portfolioValue: 50_000_000,
  currentHoldingQty: 0,
  synchronized: true,
  capturedAt: new Date().toISOString(),
};

const broker = {
  configured: true,
  healthy: true,
  pendingOrderExists: false,
};

const command = {
  mode: "AUTO_LIVE" as const,
  market: "KOREA" as const,
  symbol: "005930",
  name: "삼성전자",
  side: "BUY" as const,
  quantity: 10,
  estimatedPrice: 100_000,
  orderType: "MARKET" as const,
  strategyId: "YES_ONLY_V26",
  decisionId: "decision-1",
  marketDataVerified: true,
  marketDataAgeMs: 500,
  signalDecision: "YES" as const,
  signalScore: 91,
  maxPositionWeightPct: 20,
};

const createCoordinator = (dispatcher: RecordingDispatcher) =>
  new AutonomousTradeExecutionCoordinatorV26({
    dispatcher,
    serverLiveTradingEnabled: true,
    koreaLiveAdapterReady: true,
    usLiveRiskAdapterReady: false,
    upbitLiveAdapterReady: false,
  });

test("valid Korea YES order reaches broker exactly once", async () => {
  const dispatcher = new RecordingDispatcher();
  const coordinator = createCoordinator(dispatcher);

  const result = await coordinator.execute(command, account, broker);
  assert.equal(result.state, "SUBMITTED");
  assert.equal(result.allowed, true);
  assert.equal(dispatcher.calls.length, 1);

  const duplicate = await coordinator.execute(command, account, broker);
  assert.equal(duplicate.state, "BLOCKED");
  assert.equal(dispatcher.calls.length, 1);
});

test("insufficient verified cash never reaches broker", async () => {
  const dispatcher = new RecordingDispatcher();
  const coordinator = createCoordinator(dispatcher);

  const result = await coordinator.execute(command, { ...account, cash: 1000 }, broker);
  assert.equal(result.state, "BLOCKED");
  assert.equal(dispatcher.calls.length, 0);
  assert.ok(result.reasons.some((reason) => reason.includes("INSUFFICIENT_VERIFIED_CASH")));
});

test("stale market data never reaches broker", async () => {
  const dispatcher = new RecordingDispatcher();
  const coordinator = createCoordinator(dispatcher);

  const result = await coordinator.execute({ ...command, marketDataAgeMs: 60_000 }, account, broker);
  assert.equal(result.state, "BLOCKED");
  assert.equal(dispatcher.calls.length, 0);
  assert.ok(result.reasons.includes("MARKET_DATA_STALE"));
});

test("US and UPBIT remain blocked until dedicated live adapters are ready", async () => {
  const dispatcher = new RecordingDispatcher();
  const coordinator = createCoordinator(dispatcher);

  const us = await coordinator.execute({ ...command, market: "US" }, account, broker);
  assert.equal(us.state, "BLOCKED");

  const upbit = await coordinator.execute({ ...command, market: "UPBIT" }, account, broker);
  assert.equal(upbit.state, "BLOCKED");
  assert.equal(dispatcher.calls.length, 0);
});
