import { test } from "node:test";
import assert from "node:assert/strict";
import { AutonomousLiveExecutionGateV26 } from "../server/live/AutonomousLiveExecutionGateV26";

const healthyKoreaBuy = () => ({
  requestedMode: "AUTO_LIVE" as const,
  market: "KOREA" as const,
  side: "BUY" as const,
  serverLiveTradingEnabled: true,
  brokerConfigured: true,
  brokerHealthy: true,
  accountSynchronized: true,
  marketDataVerified: true,
  marketDataAgeMs: 500,
  signalDecision: "YES" as const,
  signalScore: 91,
  riskApproved: true,
  duplicateOrderDetected: false,
  pendingOrderExists: false,
  koreaLiveAdapterReady: true,
});

test("ANALYSIS mode never authorizes orders", () => {
  const result = AutonomousLiveExecutionGateV26.evaluate({
    ...healthyKoreaBuy(),
    requestedMode: "ANALYSIS",
  });
  assert.equal(result.allowed, false);
  assert.equal(result.state, "ANALYSIS_ONLY");
});

test("ASSISTED mode requires approval instead of auto execution", () => {
  const result = AutonomousLiveExecutionGateV26.evaluate({
    ...healthyKoreaBuy(),
    requestedMode: "ASSISTED",
  });
  assert.equal(result.allowed, false);
  assert.equal(result.state, "APPROVAL_REQUIRED");
});

test("healthy Korea AUTO_LIVE BUY with YES signal is authorized", () => {
  const result = AutonomousLiveExecutionGateV26.evaluate(healthyKoreaBuy());
  assert.equal(result.allowed, true);
  assert.equal(result.state, "READY");
  assert.deepEqual(result.reasons, []);
});

test("REVIEW_READY cannot autonomously buy", () => {
  const result = AutonomousLiveExecutionGateV26.evaluate({
    ...healthyKoreaBuy(),
    signalDecision: "REVIEW_READY",
  });
  assert.equal(result.allowed, false);
  assert.ok(result.reasons.includes("BUY_SIGNAL_NOT_YES"));
});

test("stale market data blocks live execution", () => {
  const result = AutonomousLiveExecutionGateV26.evaluate({
    ...healthyKoreaBuy(),
    marketDataAgeMs: 30_000,
  });
  assert.equal(result.allowed, false);
  assert.ok(result.reasons.includes("MARKET_DATA_STALE"));
});

test("duplicate or pending orders block execution", () => {
  const duplicate = AutonomousLiveExecutionGateV26.evaluate({
    ...healthyKoreaBuy(),
    duplicateOrderDetected: true,
  });
  assert.equal(duplicate.allowed, false);
  assert.ok(duplicate.reasons.includes("DUPLICATE_ORDER_DETECTED"));

  const pending = AutonomousLiveExecutionGateV26.evaluate({
    ...healthyKoreaBuy(),
    pendingOrderExists: true,
  });
  assert.equal(pending.allowed, false);
  assert.ok(pending.reasons.includes("PENDING_ORDER_ALREADY_EXISTS"));
});

test("US and UPBIT remain locked until their production adapters are explicitly ready", () => {
  const us = AutonomousLiveExecutionGateV26.evaluate({
    ...healthyKoreaBuy(),
    market: "US",
    koreaLiveAdapterReady: undefined,
    usLiveRiskAdapterReady: false,
  });
  assert.equal(us.allowed, false);
  assert.ok(us.reasons.includes("US_LIVE_RISK_ADAPTER_NOT_READY"));

  const upbit = AutonomousLiveExecutionGateV26.evaluate({
    ...healthyKoreaBuy(),
    market: "UPBIT",
    koreaLiveAdapterReady: undefined,
    upbitLiveAdapterReady: false,
  });
  assert.equal(upbit.allowed, false);
  assert.ok(upbit.reasons.includes("UPBIT_LIVE_ADAPTER_NOT_READY"));
});

test("SELL requires a verified exit trigger but not an entry score", () => {
  const blocked = AutonomousLiveExecutionGateV26.evaluate({
    ...healthyKoreaBuy(),
    side: "SELL",
    signalDecision: undefined,
    signalScore: undefined,
    exitTriggerVerified: false,
  });
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.reasons.includes("SELL_EXIT_TRIGGER_NOT_VERIFIED"));

  const allowed = AutonomousLiveExecutionGateV26.evaluate({
    ...healthyKoreaBuy(),
    side: "SELL",
    signalDecision: undefined,
    signalScore: undefined,
    exitTriggerVerified: true,
  });
  assert.equal(allowed.allowed, true);
});
