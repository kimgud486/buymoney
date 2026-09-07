import { describe, test } from "node:test";
import assert from "node:assert";
import { ProductionSupervisorV134 } from "../../src/services/v13_4/ProductionSupervisorV134";
import { HeartbeatMonitorV134 } from "../../src/services/v13_4/HeartbeatMonitorV134";
import { CircuitBreakerV134 } from "../../src/services/v13_4/CircuitBreakerV134";
import { DualChannelFillVerifierV134 } from "../../src/services/v13_4/DualChannelFillVerifierV134";
import { promotionGateHardeningV134 } from "../../src/services/v13_4/PromotionGateHardeningV134";

describe("AISTOCK v13.4 Production Trading Supervisor Test Suite", () => {
  test("1. Health Status & Allow BUY in HEALTHY state", () => {
    const hb = new HeartbeatMonitorV134(15000);
    const cb = new CircuitBreakerV134();
    const verifier = new DualChannelFillVerifierV134();
    const supervisor = new ProductionSupervisorV134(hb, cb, verifier);

    const status = supervisor.evaluateStatus();
    assert.strictEqual(status.state, "HEALTHY");
    assert.strictEqual(status.allowNewBuyOrders, true);
    assert.strictEqual(status.allowPositionManagement, true);
    assert.strictEqual(status.rejectionReasons.length, 0);
  });

  test("2. Degraded state on Heartbeat Failure blocks new BUY but allows Position Management", () => {
    const hb = new HeartbeatMonitorV134(1000); // 1s stale limit
    const cb = new CircuitBreakerV134();
    const verifier = new DualChannelFillVerifierV134();
    const supervisor = new ProductionSupervisorV134(hb, cb, verifier);

    // Record dead KIS_WS heartbeat
    hb.recordHeartbeat("KIS_WS", false, undefined, "WebSocket Disconnected");

    const status = supervisor.evaluateStatus();
    assert.strictEqual(status.state, "DEGRADED");
    assert.strictEqual(status.allowNewBuyOrders, false); // Block new BUY
    assert.strictEqual(status.allowPositionManagement, true); // Keep exit routes open
    assert.ok(status.rejectionReasons.some(r => r.includes("HEARTBEAT_FAILURE")));
  });

  test("3. Circuit Breaker trip triggers UNHEALTHY lock state", () => {
    const hb = new HeartbeatMonitorV134();
    const cb = new CircuitBreakerV134(3); // 3 failures
    const verifier = new DualChannelFillVerifierV134();
    const supervisor = new ProductionSupervisorV134(hb, cb, verifier);

    cb.recordFailure("REST Error 1");
    cb.recordFailure("REST Error 2");
    cb.recordFailure("REST Error 3");

    const status = supervisor.evaluateStatus();
    assert.strictEqual(status.state, "UNHEALTHY");
    assert.strictEqual(status.allowNewBuyOrders, false);
    assert.strictEqual(status.allowPositionManagement, true);
    assert.ok(status.rejectionReasons.some(r => r.includes("CIRCUIT_BREAKER_TRIPPED")));
  });

  test("4. Dual Channel Fill Mismatch locks new BUY", () => {
    const hb = new HeartbeatMonitorV134();
    const cb = new CircuitBreakerV134();
    const verifier = new DualChannelFillVerifierV134();
    const supervisor = new ProductionSupervisorV134(hb, cb, verifier);

    verifier.registerOrder("ORD_1001", "005930", 10);
    verifier.recordWsFill("ORD_1001", 10);
    verifier.recordRestFill("ORD_1001", 5); // MISMATCH!

    const status = supervisor.evaluateStatus();
    assert.strictEqual(status.state, "UNHEALTHY");
    assert.strictEqual(status.allowNewBuyOrders, false);
    assert.ok(status.rejectionReasons.includes("DUAL_CHANNEL_FILL_MISMATCH_LOCK"));
  });

  test("5. Hardened Promotion Gate rejects undefined or false accountVerified", () => {
    // Case A: accountVerified is undefined -> REJECT
    const evalUndefined = promotionGateHardeningV134.evaluateLivePromotion("PAPER", {
      totalTradesCount: 30,
      winningTradesCount: 20,
      maxDrawdownPct: 1.2,
      accountVerified: undefined
    });
    assert.strictEqual(evalUndefined.allowLiveTrading, false);
    assert.ok(evalUndefined.rejectionReasons.includes("KIS_REAL_ACCOUNT_NOT_VERIFIED_STRICT_BLOCK"));

    // Case B: accountVerified is true -> PASS
    const evalTrue = promotionGateHardeningV134.evaluateLivePromotion("DRY_RUN", {
      totalTradesCount: 30,
      winningTradesCount: 20,
      maxDrawdownPct: 1.2,
      accountVerified: true
    });
    assert.strictEqual(evalTrue.allowLiveTrading, true);
    assert.strictEqual(evalTrue.accountVerified, true);
  });
});
