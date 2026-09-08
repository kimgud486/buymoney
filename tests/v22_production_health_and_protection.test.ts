import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluateProductionHealth, ProductionHealthInput } from "../src/realtime/ProductionSystemHealth.js";
import { ProtectionManager, monotonicTrailingFloor } from "../src/realtime/ProtectionManager.js";

describe("ProductionSystemHealth Evaluator", () => {
  it("returns OPERATIONAL and executionReady=true when all inputs are healthy", () => {
    const input: ProductionHealthInput = {
      feedRealtime: true,
      feedFresh: true,
      candlesReady: true,
      indicatorsReady: true,
      brokerConnected: true,
      executionEnabled: true,
      aiModeEnabled: true,
      accountSynced: true,
      killSwitchActive: false
    };

    const health = evaluateProductionHealth(input);
    assert.equal(health.status, "OPERATIONAL");
    assert.equal(health.executionReady, true);
    assert.deepEqual(health.failures, []);
  });

  it("returns BLOCKED when critical components fail (BROKER_DISCONNECTED / FEED_STALE)", () => {
    const input: ProductionHealthInput = {
      feedRealtime: true,
      feedFresh: false,
      candlesReady: true,
      indicatorsReady: true,
      brokerConnected: false,
      executionEnabled: true,
      aiModeEnabled: true,
      accountSynced: true,
      killSwitchActive: false
    };

    const health = evaluateProductionHealth(input);
    assert.equal(health.status, "BLOCKED");
    assert.equal(health.executionReady, false);
    assert.ok(health.failures.includes("FEED_STALE"));
    assert.ok(health.failures.includes("BROKER_DISCONNECTED"));
  });

  it("returns DEGRADED for non-critical failures (AI_MODE_OFF)", () => {
    const input: ProductionHealthInput = {
      feedRealtime: true,
      feedFresh: true,
      candlesReady: true,
      indicatorsReady: true,
      brokerConnected: true,
      executionEnabled: true,
      aiModeEnabled: false,
      accountSynced: true,
      killSwitchActive: false
    };

    const health = evaluateProductionHealth(input);
    assert.equal(health.status, "DEGRADED");
    assert.equal(health.executionReady, false);
    assert.ok(health.failures.includes("AI_MODE_OFF"));
  });
});

describe("ProtectionManager & Trailing Floor Invariant", () => {
  it("blocks trade when consecutive losses reach limit", () => {
    const res = ProtectionManager.evaluate({
      symbol: "005930",
      consecutiveLosses: 3,
      maxConsecutiveLossAllowed: 3,
      currentDrawdownPct: 1.0,
      maxDrawdownLimitPct: 5.0
    });

    assert.equal(res.allowed, false);
    assert.ok(res.blockedBy.some(b => b.includes("LossStreakGuard")));
  });

  it("blocks trade when drawdown exceeds limit", () => {
    const res = ProtectionManager.evaluate({
      symbol: "005930",
      consecutiveLosses: 0,
      maxConsecutiveLossAllowed: 3,
      currentDrawdownPct: 6.0,
      maxDrawdownLimitPct: 5.0
    });

    assert.equal(res.allowed, false);
    assert.ok(res.blockedBy.some(b => b.includes("MaxDrawdownGuard")));
  });

  it("enforces monotonicTrailingFloor (never decreases)", () => {
    assert.equal(monotonicTrailingFloor(100, 105), 105);
    assert.equal(monotonicTrailingFloor(105, 102), 105);
    assert.equal(monotonicTrailingFloor(105, 0), 105);
    assert.equal(monotonicTrailingFloor(105, NaN), 105);
  });
});
