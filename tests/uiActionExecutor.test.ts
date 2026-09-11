import test from "node:test";
import assert from "node:assert/strict";
import { UiActionExecutor } from "../src/ui/UiActionExecutor";

test("manual FILLED result without broker proof is downgraded", async () => {
  const executor = new UiActionExecutor();
  const result = await executor.execute(
    "manual-buy",
    () => null,
    async () => ({ ok: true, status: "FILLED" as const, code: "SUCCESS" }),
  );

  assert.equal(result.ok, false);
  assert.equal(result.status, "ACKNOWLEDGED");
  assert.equal(result.code, "BROKER_FILL_PROOF_REQUIRED");
});

test("manual FILLED result with broker order id, fill qty and fill price is preserved", async () => {
  const executor = new UiActionExecutor();
  const result = await executor.execute(
    "manual-sell",
    () => null,
    async () => ({
      ok: true,
      status: "FILLED" as const,
      code: "BROKER_FILLED",
      data: {
        status: "FILLED",
        orderNo: "1234567890",
        filledQty: 3,
        filledPrice: 259500,
      },
    }),
  );

  assert.equal(result.ok, true);
  assert.equal(result.status, "FILLED");
  assert.equal(result.code, "BROKER_FILLED");
});

test("manual generic SUCCESS without broker fill proof is not treated as verified success", async () => {
  const executor = new UiActionExecutor();
  const result = await executor.execute(
    "manual-buy",
    () => null,
    async () => ({ ok: true, status: "SUCCESS" as const, code: "SUCCESS" }),
  );

  assert.equal(result.ok, false);
  assert.equal(result.status, "ACKNOWLEDGED");
  assert.equal(result.code, "BROKER_SUCCESS_PROOF_REQUIRED");
});

test("non-manual actions keep their original result semantics", async () => {
  const executor = new UiActionExecutor();
  const result = await executor.execute(
    "scanner-refresh",
    () => null,
    async () => ({ ok: true, status: "SUCCESS" as const, code: "REFRESHED" }),
  );

  assert.equal(result.ok, true);
  assert.equal(result.status, "SUCCESS");
  assert.equal(result.code, "REFRESHED");
});
