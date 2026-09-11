import assert from "node:assert/strict";
import test from "node:test";

import {
  MANUAL_ORDER_LIFECYCLE_EVENT,
  UiActionExecutor,
  type ManualOrderLifecycleDetail,
} from "../src/ui/UiActionExecutor";

const originalWindow = (globalThis as any).window;

class FakeCustomEvent<T> {
  public readonly type: string;
  public readonly detail: T;

  constructor(type: string, init: { detail: T }) {
    this.type = type;
    this.detail = init.detail;
  }
}

function installWindow(confirmResult = true) {
  const events: ManualOrderLifecycleDetail[] = [];
  (globalThis as any).window = {
    confirm: () => confirmResult,
    CustomEvent: FakeCustomEvent,
    dispatchEvent: (event: FakeCustomEvent<ManualOrderLifecycleDetail>) => {
      if (event.type === MANUAL_ORDER_LIFECYCLE_EVENT) events.push(event.detail);
      return true;
    },
  };
  return events;
}

test.afterEach(() => {
  if (originalWindow === undefined) delete (globalThis as any).window;
  else (globalThis as any).window = originalWindow;
});

test("manual order emits confirmation, submitting and acknowledgement lifecycle", async () => {
  const events = installWindow(true);
  const executor = new UiActionExecutor();

  const result = await executor.execute(
    "manual-buy",
    () => null,
    async () => ({
      ok: true,
      status: "ACKNOWLEDGED" as const,
      code: "ORDER_ACCEPTED",
      data: { orderNo: "ORD-100" },
    }),
  );

  assert.equal(result.status, "ACKNOWLEDGED");
  assert.deepEqual(events.map((event) => event.stage), [
    "CONFIRM_REQUIRED",
    "CONFIRMED",
    "SUBMITTING",
    "ACKNOWLEDGED",
  ]);
  assert.equal(events.at(-1)?.side, "BUY");
  assert.equal(events.at(-1)?.orderId, "ORD-100");
});

test("partial fill label fails closed when broker fill evidence is incomplete", async () => {
  const events = installWindow(true);
  const executor = new UiActionExecutor();

  const result = await executor.execute(
    "manual-sell",
    () => null,
    async () => ({
      ok: true,
      status: "PARTIAL" as const,
      code: "PARTIAL",
      data: { orderNo: "ORD-200" },
    }),
  );

  assert.equal(result.ok, false);
  assert.equal(result.status, "ACKNOWLEDGED");
  assert.equal(result.code, "BROKER_PARTIAL_PROOF_REQUIRED");
  assert.equal(events.at(-1)?.stage, "ACKNOWLEDGED");
});

test("partial fill stage is exposed only with order id, fill quantity and fill price", async () => {
  const events = installWindow(true);
  const executor = new UiActionExecutor();

  const result = await executor.execute(
    "manual-sell",
    () => null,
    async () => ({
      ok: true,
      status: "PARTIAL" as const,
      code: "PARTIAL",
      data: {
        orderNo: "ORD-300",
        filledQty: 2,
        filledPrice: 78100,
      },
    }),
  );

  assert.equal(result.ok, true);
  assert.equal(result.status, "PARTIAL");
  assert.equal(events.at(-1)?.stage, "PARTIAL");
  assert.equal(events.at(-1)?.filledQty, 2);
  assert.equal(events.at(-1)?.filledPrice, 78100);
});

test("generic manual SUCCESS becomes FILLED only with verified broker fill proof", async () => {
  const events = installWindow(true);
  const executor = new UiActionExecutor();

  const result = await executor.execute(
    "manual-buy",
    () => null,
    async () => ({
      ok: true,
      status: "SUCCESS" as const,
      code: "SUCCESS",
      data: {
        status: "FILLED",
        orderNo: "ORD-400",
        filledQty: 5,
        filledPrice: 78200,
      },
    }),
  );

  assert.equal(result.ok, true);
  assert.equal(result.status, "FILLED");
  assert.equal(result.code, "BROKER_FILL_VERIFIED");
  assert.equal(events.at(-1)?.stage, "FILLED");
  assert.equal(events.at(-1)?.orderId, "ORD-400");
});

test("user cancellation ends lifecycle at BLOCKED before broker submission", async () => {
  const events = installWindow(false);
  let actionCalled = false;
  const executor = new UiActionExecutor();

  const result = await executor.execute(
    "manual-buy",
    () => null,
    async () => {
      actionCalled = true;
      return { ok: true, status: "ACKNOWLEDGED" as const, code: "ORDER_ACCEPTED" };
    },
  );

  assert.equal(actionCalled, false);
  assert.equal(result.code, "USER_CANCELLED");
  assert.deepEqual(events.map((event) => event.stage), ["CONFIRM_REQUIRED", "BLOCKED"]);
});
