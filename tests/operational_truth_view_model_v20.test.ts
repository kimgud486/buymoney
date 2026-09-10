import test from "node:test";
import assert from "node:assert/strict";
import { buildOperationalTruthViewModelV20 } from "../src/monitoring/OperationalTruthViewModelV20";

const base = {
  engineRunning: true,
  mode: "LIVE" as const,
  liveTradingEnabled: true,
  killSwitchActive: false,
  executionState: "LONG",
  dailyRealizedPnLKRW: 120000,
  activeUnrealizedPnLKRW: 0,
  brokerConnected: true,
  brokerDataStatus: "REALTIME_VERIFIED" as const,
  brokerProofStatus: "ESTABLISHED" as const,
  brokerBlockers: [] as string[],
  brokerHoldingsUnrealizedPnLKRW: -20000,
};

test("LIVE operational truth is READY only when engine, broker proof and safety gates are all verified", () => {
  const view = buildOperationalTruthViewModelV20(base);
  assert.equal(view.gateState, "READY");
  assert.equal(view.riskGateLabel, "PASS");
  assert.equal(view.executionLabel, "보유 중");
  assert.equal(view.todayCombinedPnLKRW, 100000);
  assert.deepEqual(view.blockers, []);
});

test("kill switch forces fail-closed BLOCKED state", () => {
  const view = buildOperationalTruthViewModelV20({ ...base, killSwitchActive: true });
  assert.equal(view.gateState, "BLOCKED");
  assert.equal(view.riskGateLabel, "KILL SWITCH");
  assert.ok(view.blockers.includes("KILL_SWITCH_ACTIVE"));
});

test("LIVE mode without dual lock or verified broker truth cannot show READY", () => {
  const view = buildOperationalTruthViewModelV20({
    ...base,
    liveTradingEnabled: false,
    brokerConnected: false,
    brokerDataStatus: "NO_DATA",
    brokerProofStatus: "PROOF_NOT_ESTABLISHED",
  });
  assert.equal(view.gateState, "NO_DATA");
  assert.ok(view.blockers.includes("LIVE_DUAL_LOCKED"));
  assert.ok(view.blockers.includes("BROKER_NOT_CONNECTED"));
  assert.ok(view.blockers.includes("LIVE_ENVIRONMENT_NOT_PROVEN"));
});

test("DRY_RUN is explicitly TEST_ONLY and never presented as real-money READY", () => {
  const view = buildOperationalTruthViewModelV20({
    ...base,
    mode: "DRY_RUN",
    brokerConnected: false,
    brokerDataStatus: "NO_DATA",
    brokerProofStatus: "PROOF_NOT_ESTABLISHED",
  });
  assert.equal(view.gateState, "TEST_ONLY");
  assert.equal(view.gateLabel, "시세+테스트 모드");
});
