import test from "node:test";
import assert from "node:assert/strict";
import os from "os";
import path from "path";
import fs from "fs";
import { PersistentOrderJournalV20 } from "../src/execution/PersistentOrderJournalV20";
import { brokerExecutionRuntimeBridgeV20 } from "../server/v20/BrokerExecutionRuntimeBridgeV20";
import { LivePositionRuntimeService } from "../src/trading/LivePositionRuntimeService";
import { reconcileRuntimeWithBrokerV20 } from "../server/v20/RuntimePositionReconciliationV20";
import { DailyPnLMonitorV20 } from "../server/v20/DailyPnLMonitorV20";

function tempJournal(): { journal: PersistentOrderJournalV20; file: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aistock-v98-"));
  const file = path.join(dir, "orders.json");
  return { journal: new PersistentOrderJournalV20(file), file };
}

function addPosition(runtime: LivePositionRuntimeService, options: { positionId: string; symbol: string; qty: number; entryPrice: number }) {
  runtime.registerPosition({
    positionId: options.positionId,
    symbol: options.symbol,
    strategyId: "TEST_SETUP",
    state: "HOLD",
    entryPrice: options.entryPrice,
    highestPriceSinceBuy: options.entryPrice,
    lowestPriceSinceBuy: options.entryPrice,
    trailingFloor: null,
    initialStopPrice: null,
    defenseSellPrice: null,
    expectedSellLow: null,
    expectedSellMid: null,
    expectedSellHigh: null,
    continuationScore: null,
    quantities: {
      requestedBuyQty: options.qty,
      buyFilledQty: options.qty,
      currentPositionQty: options.qty,
      requestedSellQty: 0,
      sellFilledQty: 0,
      remainingPositionQty: options.qty,
    },
    lastExitEvidence: null,
    updatedAt: Date.now(),
  });
}

test("restart recovery restores only durable non-terminal order mappings", () => {
  const { journal } = tempJournal();
  const now = Date.now();
  journal.recordOrder({
    idempotencyKey: "BUY:POS-R98:1",
    orderId: "ODNO-R98-OPEN",
    positionId: "POS-R98",
    symbol: "005930",
    market: "KR",
    side: "BUY",
    quantity: 2,
    price: 70000,
    status: "PARTIAL",
    filledQuantity: 1,
    averageFillPrice: 70000,
    createdAt: now,
    updatedAt: now,
  });
  journal.recordOrder({
    idempotencyKey: "BUY:POS-R98:2",
    orderId: "ODNO-R98-DONE",
    positionId: "POS-R98",
    symbol: "005930",
    market: "KR",
    side: "BUY",
    quantity: 1,
    price: 70000,
    status: "FILLED",
    filledQuantity: 1,
    averageFillPrice: 70000,
    createdAt: now,
    updatedAt: now,
  });

  const restored = brokerExecutionRuntimeBridgeV20.restoreMappingsFromJournal(journal);
  assert.equal(restored, 1);
  assert.equal(brokerExecutionRuntimeBridgeV20.getMappedPositionId("ODNO-R98-OPEN"), "POS-R98");
  assert.equal(brokerExecutionRuntimeBridgeV20.getMappedPositionId("ODNO-R98-DONE"), undefined);
  journal.clear();
});

test("stale broker holdings are blocked without mutating runtime quantity", () => {
  const runtime = new LivePositionRuntimeService();
  addPosition(runtime, { positionId: "POS-STALE", symbol: "005930", qty: 3, entryPrice: 70000 });
  const now = Date.now();

  const result = reconcileRuntimeWithBrokerV20({
    verified: true,
    dataStatus: "REALTIME_VERIFIED",
    asOf: now - 60_000,
    positions: [{ symbol: "005930", qty: 1, avgPrice: 70000 }],
  }, { nowMs: now, maxAgeMs: 30_000, runtime });

  assert.equal(result.blocked, true);
  assert.equal(result.reason, "BROKER_HOLDINGS_STALE");
  assert.equal(runtime.getPosition("POS-STALE")?.quantities.currentPositionQty, 3);
});

test("verified broker holdings adjust quantity and close zero broker positions", () => {
  const runtime = new LivePositionRuntimeService();
  addPosition(runtime, { positionId: "POS-ADJUST", symbol: "005930", qty: 3, entryPrice: 70000 });
  addPosition(runtime, { positionId: "POS-CLOSE", symbol: "000660", qty: 2, entryPrice: 150000 });
  const now = Date.now();

  const result = reconcileRuntimeWithBrokerV20({
    verified: true,
    dataStatus: "REALTIME_VERIFIED",
    asOf: now,
    positions: [{ symbol: "005930", qty: 2, avgPrice: 70000 }],
  }, { nowMs: now, runtime });

  assert.equal(result.applied, true);
  assert.equal(runtime.getPosition("POS-ADJUST")?.quantities.currentPositionQty, 2);
  assert.equal(runtime.getPosition("POS-CLOSE")?.state, "CLOSED");
  assert.equal(runtime.getPosition("POS-CLOSE")?.quantities.currentPositionQty, 0);
});

test("ambiguous same-symbol local positions fail closed before any mutation", () => {
  const runtime = new LivePositionRuntimeService();
  addPosition(runtime, { positionId: "POS-A1", symbol: "005930", qty: 1, entryPrice: 70000 });
  addPosition(runtime, { positionId: "POS-A2", symbol: "005930", qty: 2, entryPrice: 71000 });
  const now = Date.now();

  const result = reconcileRuntimeWithBrokerV20({
    verified: true,
    dataStatus: "REALTIME_VERIFIED",
    asOf: now,
    positions: [{ symbol: "005930", qty: 1, avgPrice: 70000 }],
  }, { nowMs: now, runtime });

  assert.equal(result.blocked, true);
  assert.equal(result.reason, "AMBIGUOUS_LOCAL_POSITIONS");
  assert.equal(runtime.getPosition("POS-A1")?.quantities.currentPositionQty, 1);
  assert.equal(runtime.getPosition("POS-A2")?.quantities.currentPositionQty, 2);
});

test("daily pnl combines broker-filled realized pnl with verified unrealized pnl", () => {
  const { journal } = tempJournal();
  const runtime = new LivePositionRuntimeService();
  const now = Date.now();
  addPosition(runtime, { positionId: "POS-OPEN", symbol: "005930", qty: 2, entryPrice: 70000 });

  journal.recordOrder({
    idempotencyKey: "BUY:POS-CLOSED",
    orderId: "BUY-CLOSED",
    positionId: "POS-CLOSED",
    symbol: "000660",
    market: "KR",
    side: "BUY",
    quantity: 2,
    price: 100000,
    status: "FILLED",
    filledQuantity: 2,
    averageFillPrice: 100000,
    createdAt: now - 1000,
    updatedAt: now - 1000,
  });
  journal.recordOrder({
    idempotencyKey: "SELL:POS-CLOSED",
    orderId: "SELL-CLOSED",
    positionId: "POS-CLOSED",
    symbol: "000660",
    market: "KR",
    side: "SELL",
    quantity: 2,
    price: 110000,
    status: "FILLED",
    filledQuantity: 2,
    averageFillPrice: 110000,
    createdAt: now - 500,
    updatedAt: now - 500,
  });

  const monitor = new DailyPnLMonitorV20(journal, runtime);
  const snapshot = monitor.snapshot([
    { symbol: "005930", price: 71000, verified: true, asOf: now },
  ], { nowMs: now });

  assert.equal(snapshot.realizedPnL, 20000);
  assert.equal(snapshot.unrealizedPnL, 2000);
  assert.equal(snapshot.totalPnL, 22000);
  assert.equal(snapshot.winningPositions, 1);
  assert.equal(snapshot.losingPositions, 0);
  journal.clear();
});

test("unverified or stale quotes never enter unrealized pnl", () => {
  const { journal } = tempJournal();
  const runtime = new LivePositionRuntimeService();
  const now = Date.now();
  addPosition(runtime, { positionId: "POS-NOQUOTE", symbol: "005930", qty: 2, entryPrice: 70000 });

  const monitor = new DailyPnLMonitorV20(journal, runtime);
  const snapshot = monitor.snapshot([
    { symbol: "005930", price: 90000, verified: false, asOf: now },
  ], { nowMs: now });

  assert.equal(snapshot.unrealizedPnL, 0);
  assert.deepEqual(snapshot.missingQuotes, ["005930"]);
  journal.clear();
});
