import assert from "node:assert/strict";
import test from "node:test";

import { UiActionExecutor } from "../src/ui/UiActionExecutor";

const originalWindow = (globalThis as any).window;

test.afterEach(() => {
  if (originalWindow === undefined) delete (globalThis as any).window;
  else (globalThis as any).window = originalWindow;
});

test("manual buy is blocked when user cancels confirmation", async () => {
  let actionCalled = false;
  (globalThis as any).window = { confirm: () => false };

  const executor = new UiActionExecutor();
  const result = await executor.execute(
    "manual-buy",
    () => null,
    async () => {
      actionCalled = true;
      return { ok: true, status: "SUCCESS" as const, code: "SUCCESS" };
    }
  );

  assert.equal(result.ok, false);
  assert.equal(result.code, "USER_CANCELLED");
  assert.equal(actionCalled, false);
});

test("manual sell executes only after explicit confirmation", async () => {
  let confirmCalled = false;
  let actionCalled = false;
  (globalThis as any).window = {
    confirm: () => {
      confirmCalled = true;
      return true;
    }
  };

  const executor = new UiActionExecutor();
  const result = await executor.execute(
    "manual-sell",
    () => null,
    async () => {
      actionCalled = true;
      return { ok: true, status: "SUCCESS" as const, code: "SUCCESS" };
    }
  );

  assert.equal(confirmCalled, true);
  assert.equal(actionCalled, true);
  assert.equal(result.ok, true);
});

test("autonomous action ids are not interrupted by manual confirmation guard", async () => {
  let confirmCalled = false;
  (globalThis as any).window = {
    confirm: () => {
      confirmCalled = true;
      return false;
    }
  };

  const executor = new UiActionExecutor();
  const result = await executor.execute(
    "autonomous-risk-approved-order",
    () => null,
    async () => ({ ok: true, status: "SUCCESS" as const, code: "SUCCESS" })
  );

  assert.equal(confirmCalled, false);
  assert.equal(result.ok, true);
});
