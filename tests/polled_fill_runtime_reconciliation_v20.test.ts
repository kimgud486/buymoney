import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SafeLiveExecutionCoordinatorV20 } from "../server/broker/SafeLiveExecutionCoordinatorV20";
import { PersistentOrderJournalV20 } from "../src/execution/PersistentOrderJournalV20";
import { livePositionRuntimeService } from "../src/trading/LivePositionRuntimeService";
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
  orderableQty: 10,
  blockers: [],
};

test("fill polling recovers a missed websocket SELL fill and closes runtime position exactly once", async () => {
  const oldEnabled = process.env.KIS_LIVE_EXECUTION_ENABLED;
  const oldKill = process.env.KIS_LIVE_KILL_SWITCH;
  process.env.KIS_LIVE_EXECUTION_ENABLED = "true";
  process.env.KIS_LIVE_KILL_SWITCH = "OFF";

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buymoney-fill-reconcile-"));
  const journal = new PersistentOrderJournalV20(path.join(dir, "orders.json"));
  let fillChecks = 0;
  const gateway = {
    isConfigured: () => true,
    executeOrder: async (req: any) => ({
      success: true,
      orderNo: "SELL-POLL-1",
      symbol: req.symbol,
      side: req.side,
      status: "PENDING",
      filledQty: 0,
      filledAvgPrice: 0,
      message: "accepted",
      trId: "TEST",
      timestamp: new Date().toISOString(),
    }),
    checkFillStatus: async () => {
      fillChecks += 1;
      return {
        isFilled: true,
        filledQty: 2,
        filledAvgPrice: 70500,
        status: "FILLED",
        message: "filled",
      };
    },
  } as any;

  const positionId = `POS-POLL-${Date.now()}`;
  livePositionRuntimeService.registerPosition({
    positionId,
    symbol: "005930",
    strategyId: "BREAKOUT_RETEST",
    state: "SELL_PENDING",
    entryPrice: 70000,
    highestPriceSinceBuy: 72000,
    lowestPriceSinceBuy: 69000,
    trailingFloor: 69500,
    initialStopPrice: 68000,
    defenseSellPrice: 69500,
    expectedSellLow: 71000,
    expectedSellMid: 72000,
    expectedSellHigh: 73000,
    continuationScore: 30,
    quantities: {
      requestedBuyQty: 2,
      buyFilledQty: 2,
      currentPositionQty: 2,
      requestedSellQty: 2,
      sellFilledQty: 0,
      remainingPositionQty: 2,
    },
    lastExitEvidence: null,
    updatedAt: Date.now(),
  });

  const coordinator = new SafeLiveExecutionCoordinatorV20({ gateway, journal });
  const submitted = await coordinator.submit({
    positionId,
    idempotencyKey: `SELL:${positionId}:0:2`,
    intent: { symbol: "005930", market: "KOREA", side: "SELL", orderType: "MARKET", qty: 2 },
    dataStatus: "REALTIME_VERIFIED",
    lastPrice: 70500,
    accountTruth: truth,
    authorization: { approved: true, source: "SYSTEM_POLICY" },
  });
  assert.equal(submitted.accepted, true);

  const firstRefresh = await coordinator.refreshFill("SELL-POLL-1");
  assert.equal(firstRefresh.status, "FILLED");
  assert.equal(livePositionRuntimeService.getPosition(positionId)?.state, "CLOSED");
  assert.equal(livePositionRuntimeService.getPosition(positionId)?.quantities.currentPositionQty, 0);
  assert.equal(livePositionRuntimeService.getPosition(positionId)?.quantities.sellFilledQty, 2);

  // A repeated cumulative fill poll has zero positive delta and must not double count.
  const secondRefresh = await coordinator.refreshFill("SELL-POLL-1");
  assert.equal(secondRefresh.status, "FILLED");
  assert.equal(livePositionRuntimeService.getPosition(positionId)?.quantities.sellFilledQty, 2);
  assert.equal(fillChecks, 2);

  fs.rmSync(dir, { recursive: true, force: true });
  if (oldEnabled === undefined) delete process.env.KIS_LIVE_EXECUTION_ENABLED;
  else process.env.KIS_LIVE_EXECUTION_ENABLED = oldEnabled;
  if (oldKill === undefined) delete process.env.KIS_LIVE_KILL_SWITCH;
  else process.env.KIS_LIVE_KILL_SWITCH = oldKill;
});
