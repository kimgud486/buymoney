import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PersistentOrderJournalV20 } from "../src/execution/PersistentOrderJournalV20";
import { SafeLiveExecutionCoordinatorV20 } from "../server/broker/SafeLiveExecutionCoordinatorV20";
import type { KISLiveAccountTruth } from "../server/broker/KISLiveAccountTruthV212";

const truth: KISLiveAccountTruth = {
  verified: true,
  dataStatus: "REALTIME_VERIFIED",
  provider: "KIS",
  brokerConfigured: true,
  authStatus: "AUTHENTICATED",
  marketSession: "OPEN",
  quoteAsOf: new Date().toISOString(),
  quoteAgeMs: 0,
  accountAsOf: new Date().toISOString(),
  accountAgeMs: 0,
  orderableCash: 10_000_000,
  orderableQty: 100,
  blockers: []
};

function makeCoordinator() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buymoney-live-exec-"));
  const journal = new PersistentOrderJournalV20(path.join(dir, "orders.json"));
  const calls: any[] = [];
  const gateway = {
    isConfigured: () => true,
    executeOrder: async (req: any) => {
      calls.push(req);
      return {
        success: true,
        orderNo: "ODNO-1",
        symbol: req.symbol,
        side: req.side,
        status: "PENDING",
        filledQty: 0,
        filledAvgPrice: 0,
        message: "accepted",
        trId: "TEST",
        timestamp: new Date().toISOString()
      };
    },
    checkFillStatus: async () => ({
      isFilled: true,
      filledQty: 1,
      filledAvgPrice: 70000,
      status: "FILLED",
      message: "filled"
    })
  } as any;

  return { coordinator: new SafeLiveExecutionCoordinatorV20({ gateway, journal }), journal, calls, dir };
}

function baseRequest() {
  return {
    positionId: "POS-1",
    idempotencyKey: "BUY:005930:1",
    intent: { symbol: "005930", market: "KOREA" as const, side: "BUY" as const, orderType: "MARKET" as const, qty: 1 },
    dataStatus: "REALTIME_VERIFIED" as const,
    lastPrice: 70000,
    accountTruth: truth,
    authorization: { approved: true, source: "USER_CONFIRMATION" as const }
  };
}

test("fails closed when live execution is disabled", async () => {
  const old = process.env.KIS_LIVE_EXECUTION_ENABLED;
  delete process.env.KIS_LIVE_EXECUTION_ENABLED;
  const { coordinator, calls, dir } = makeCoordinator();
  const result = await coordinator.submit(baseRequest());
  assert.equal(result.blocked, true);
  assert.ok(result.blockers.includes("LIVE_EXECUTION_DISABLED"));
  assert.equal(calls.length, 0);
  fs.rmSync(dir, { recursive: true, force: true });
  if (old === undefined) delete process.env.KIS_LIVE_EXECUTION_ENABLED; else process.env.KIS_LIVE_EXECUTION_ENABLED = old;
});

test("kill switch blocks broker submission", async () => {
  const oldEnabled = process.env.KIS_LIVE_EXECUTION_ENABLED;
  const oldKill = process.env.KIS_LIVE_KILL_SWITCH;
  process.env.KIS_LIVE_EXECUTION_ENABLED = "true";
  process.env.KIS_LIVE_KILL_SWITCH = "ON";
  const { coordinator, calls, dir } = makeCoordinator();
  const result = await coordinator.submit(baseRequest());
  assert.equal(result.blocked, true);
  assert.ok(result.blockers.includes("KILL_SWITCH_ACTIVE"));
  assert.equal(calls.length, 0);
  fs.rmSync(dir, { recursive: true, force: true });
  if (oldEnabled === undefined) delete process.env.KIS_LIVE_EXECUTION_ENABLED; else process.env.KIS_LIVE_EXECUTION_ENABLED = oldEnabled;
  if (oldKill === undefined) delete process.env.KIS_LIVE_KILL_SWITCH; else process.env.KIS_LIVE_KILL_SWITCH = oldKill;
});

test("accepted order is persisted and duplicate key is rejected", async () => {
  const oldEnabled = process.env.KIS_LIVE_EXECUTION_ENABLED;
  const oldKill = process.env.KIS_LIVE_KILL_SWITCH;
  process.env.KIS_LIVE_EXECUTION_ENABLED = "true";
  process.env.KIS_LIVE_KILL_SWITCH = "OFF";
  const { coordinator, journal, calls, dir } = makeCoordinator();
  const first = await coordinator.submit(baseRequest());
  assert.equal(first.accepted, true);
  assert.equal(first.orderId, "ODNO-1");
  assert.equal(calls.length, 1);
  assert.equal(journal.getOrder("ODNO-1")?.status, "PENDING");

  const second = await coordinator.submit(baseRequest());
  assert.equal(second.blocked, true);
  assert.ok(second.blockers.includes("DUPLICATE_ORDER_REJECTED"));
  assert.equal(calls.length, 1);

  const fill = await coordinator.refreshFill("ODNO-1");
  assert.equal(fill.status, "FILLED");
  assert.equal(journal.getOrder("ODNO-1")?.filledQuantity, 1);

  fs.rmSync(dir, { recursive: true, force: true });
  if (oldEnabled === undefined) delete process.env.KIS_LIVE_EXECUTION_ENABLED; else process.env.KIS_LIVE_EXECUTION_ENABLED = oldEnabled;
  if (oldKill === undefined) delete process.env.KIS_LIVE_KILL_SWITCH; else process.env.KIS_LIVE_KILL_SWITCH = oldKill;
});
