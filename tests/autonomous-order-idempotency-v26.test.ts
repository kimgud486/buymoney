import { test } from "node:test";
import assert from "node:assert/strict";
import { AutonomousOrderIdempotencyGuardV26 } from "../server/live/AutonomousOrderIdempotencyGuardV26";

test("same autonomous decision cannot be claimed twice inside TTL", () => {
  const guard = new AutonomousOrderIdempotencyGuardV26(60_000);
  const key = AutonomousOrderIdempotencyGuardV26.makeKey({
    accountKey: "KIS:1234",
    symbol: "005930",
    side: "BUY",
    strategyId: "YES_ONLY_V26",
    decisionId: "decision-001",
  });

  assert.equal(guard.claim(key, 1_000), true);
  assert.equal(guard.claim(key, 2_000), false);
  assert.equal(guard.hasActiveClaim(key, 2_000), true);
});

test("claim can be retried after TTL or explicit release", () => {
  const guard = new AutonomousOrderIdempotencyGuardV26(5_000);
  const key = "order-key";

  assert.equal(guard.claim(key, 1_000), true);
  assert.equal(guard.claim(key, 7_000), true);
  guard.release(key);
  assert.equal(guard.claim(key, 7_100), true);
});
