import test from "node:test";
import assert from "node:assert/strict";
import { ProductionAutonomyGate } from "../src/autonomous/ProductionAutonomyGate";

const healthy = {
  mode: "AUTO_LIVE" as const,
  explicitLiveEnabled: true,
  confirmationText: "ENABLE AUTO LIVE",
  brokerConfigured: true,
  brokerHealthy: true,
  accountVerified: true,
  accountSynced: true,
  realtimeDataVerified: true,
  marketOpen: true,
  supportedMarket: true,
  dailyLossGuardPassed: true,
  drawdownGuardPassed: true,
  exposureGuardPassed: true,
  slippageGuardPassed: true,
  duplicateOrderFree: true,
  staleData: false,
};

test("AUTO_LIVE remains blocked until explicit confirmation is correct", () => {
  const result = ProductionAutonomyGate.evaluate({
    ...healthy,
    confirmationText: "",
  });
  assert.equal(result.canSubmitLiveOrder, false);
  assert.equal(result.state, "BLOCKED");
  assert.ok(result.blockers.includes("LIVE_CONFIRMATION_MISMATCH"));
});

test("AUTO_LIVE fails closed when broker or market data is unhealthy", () => {
  const result = ProductionAutonomyGate.evaluate({
    ...healthy,
    brokerHealthy: false,
    staleData: true,
  });
  assert.equal(result.canSubmitLiveOrder, false);
  assert.ok(result.blockers.includes("BROKER_UNHEALTHY"));
  assert.ok(result.blockers.includes("STALE_MARKET_DATA"));
});

test("AUTO_LIVE becomes active only when every hard gate passes", () => {
  const result = ProductionAutonomyGate.evaluate(healthy);
  assert.equal(result.state, "ACTIVE");
  assert.equal(result.canSubmitLiveOrder, true);
  assert.deepEqual(result.blockers, []);
});
