import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { LivePositionRuntimeService, LivePosition, BrokerExecutionNotice } from "../src/trading/LivePositionRuntimeService.js";
import { livePositionRuntime } from "../src/trading/livePositionRuntime.js";
import { toPositionRuntimeSnapshot } from "../src/trading/PositionRuntimeSnapshot.js";
import { reconcilePositions, BrokerPositionTruth, LocalPositionTruth } from "../src/trading/AccountReconciliationService.js";
import { PositionExecutionBridge, BrokerOrderAdapter } from "../src/trading/PositionExecutionBridge.js";

describe("AISTOCK v24 Runtime to Execution Bridge & Reconciliation Tests", () => {

  it("1. toPositionRuntimeSnapshot maps LivePosition cleanly without defaults", () => {
    const livePos: LivePosition = {
      positionId: "pos_1",
      symbol: "005930",
      strategyId: "strat_1",
      state: "PROFIT_HOLD",
      entryPrice: 70000,
      highestPriceSinceBuy: 75000,
      lowestPriceSinceBuy: 69500,
      trailingFloor: 73000,
      initialStopPrice: 68000,
      defenseSellPrice: 71000,
      expectedSellLow: 74000,
      expectedSellMid: 76000,
      expectedSellHigh: 78000,
      continuationScore: 82,
      quantities: {
        initialQty: 100,
        currentPositionQty: 100,
        pendingSellQty: 0,
        filledSellQty: 0
      },
      lastExitEvidence: {
        exitRiskScore: 12,
        profitHoldStrength: 85,
        sellWatchLevel: 5,
        recommendedAction: "HOLD",
        summary: "EMA20 / VWAP 상회 유지",
        triggerCount: 0
      },
      updatedAt: 1700000000000
    };

    const snap = toPositionRuntimeSnapshot(livePos);

    assert.equal(snap.positionId, "pos_1");
    assert.equal(snap.symbol, "005930");
    assert.equal(snap.state, "PROFIT_HOLD");
    assert.equal(snap.entryPrice, 70000);
    assert.equal(snap.currentPositionQty, 100);
    assert.equal(snap.trailingFloor, 73000);
    assert.equal(snap.initialStopPrice, 68000);
    assert.equal(snap.expectedSellMid, 76000);
    assert.equal(snap.exitRiskScore, 12);
    assert.equal(snap.recommendedAction, "HOLD");
  });

  it("2. Missing stop / target / state returns null / UNKNOWN rather than -5% / +15%", () => {
    const sparsePos: LivePosition = {
      positionId: "pos_2",
      symbol: "012450",
      strategyId: "strat_2",
      state: "HOLD",
      entryPrice: 200000,
      highestPriceSinceBuy: 200000,
      lowestPriceSinceBuy: 200000,
      trailingFloor: null,
      initialStopPrice: null,
      defenseSellPrice: null,
      expectedSellLow: null,
      expectedSellMid: null,
      expectedSellHigh: null,
      continuationScore: null,
      quantities: {
        initialQty: 10,
        currentPositionQty: 10,
        pendingSellQty: 0,
        filledSellQty: 0
      },
      lastExitEvidence: null,
      updatedAt: 1700000000000
    };

    const snap = toPositionRuntimeSnapshot(sparsePos);

    assert.equal(snap.initialStopPrice, null);
    assert.equal(snap.expectedSellMid, null);
    assert.equal(snap.exitRiskScore, null);
    assert.equal(snap.recommendedAction, null);
  });

  it("3. AccountReconciliationService identifies SYNCED, MISMATCH, and BROKER_NO_DATA", () => {
    const brokerPositions: BrokerPositionTruth[] = [
      { symbol: "005930", qty: 100, avgPrice: 70000 },
      { symbol: "012450", qty: 50, avgPrice: 200000 }
    ];

    const localPositionsSynced: LocalPositionTruth[] = [
      { symbol: "005930", qty: 100, avgPrice: 70000 },
      { symbol: "012450", qty: 50, avgPrice: 200000 }
    ];

    const resultSynced = reconcilePositions(brokerPositions, localPositionsSynced);
    assert.equal(resultSynced.ok, true);
    assert.equal(resultSynced.status, "SYNCED");
    assert.equal(resultSynced.mismatches.length, 0);

    const localPositionsMismatch: LocalPositionTruth[] = [
      { symbol: "005930", qty: 80, avgPrice: 70000 }, // mismatch
      { symbol: "012450", qty: 50, avgPrice: 200000 }
    ];

    const resultMismatch = reconcilePositions(brokerPositions, localPositionsMismatch);
    assert.equal(resultMismatch.ok, false);
    assert.equal(resultMismatch.status, "MISMATCH");
    assert.equal(resultMismatch.mismatches.length, 1);
    assert.equal(resultMismatch.mismatches[0].symbol, "005930");
    assert.equal(resultMismatch.mismatches[0].brokerQty, 100);
    assert.equal(resultMismatch.mismatches[0].localQty, 80);

    const resultNoData = reconcilePositions(null as any, localPositionsSynced);
    assert.equal(resultNoData.ok, false);
    assert.equal(resultNoData.status, "BROKER_NO_DATA");
  });

  it("4. PositionExecutionBridge submits SELL order only when state === SELL_PENDING", async () => {
    let orderSubmitted = false;
    let submittedSymbol = "";
    let submittedQty = 0;

    const mockBroker: BrokerOrderAdapter = {
      async submitMarketSell(symbol: string, qty: number) {
        orderSubmitted = true;
        submittedSymbol = symbol;
        submittedQty = qty;
        return { accepted: true, orderId: "ORD_123" };
      }
    };

    const bridge = new PositionExecutionBridge(mockBroker);

    const livePos: LivePosition = {
      positionId: "pos_sell_1",
      symbol: "NVDA",
      strategyId: "us_momentum",
      state: "SELL_PENDING",
      entryPrice: 120,
      highestPriceSinceBuy: 130,
      lowestPriceSinceBuy: 118,
      trailingFloor: 122,
      initialStopPrice: 115,
      defenseSellPrice: 120,
      expectedSellLow: 125,
      expectedSellMid: 130,
      expectedSellHigh: 135,
      continuationScore: 30,
      quantities: {
        initialQty: 50,
        currentPositionQty: 50,
        pendingSellQty: 50,
        filledSellQty: 0
      },
      lastExitEvidence: null,
      updatedAt: Date.now()
    };

    livePositionRuntime.registerPosition(livePos);

    // Call bridge
    const res = await bridge.handleRuntimeResult("pos_sell_1", "SUBMIT_SELL_ORDER");

    assert.equal(orderSubmitted, true);
    assert.equal(submittedSymbol, "NVDA");
    assert.equal(submittedQty, 50);
    assert.equal(res?.accepted, true);
  });

  it("5. PositionExecutionBridge throws if state is not SELL_PENDING", async () => {
    const mockBroker: BrokerOrderAdapter = {
      async submitMarketSell() {
        return { accepted: true };
      }
    };

    const bridge = new PositionExecutionBridge(mockBroker);

    const livePosHold: LivePosition = {
      positionId: "pos_hold_1",
      symbol: "AAPL",
      strategyId: "us_momentum",
      state: "HOLD",
      entryPrice: 150,
      highestPriceSinceBuy: 155,
      lowestPriceSinceBuy: 148,
      trailingFloor: null,
      initialStopPrice: null,
      defenseSellPrice: null,
      expectedSellLow: null,
      expectedSellMid: null,
      expectedSellHigh: null,
      continuationScore: null,
      quantities: {
        initialQty: 10,
        currentPositionQty: 10,
        pendingSellQty: 0,
        filledSellQty: 0
      },
      lastExitEvidence: null,
      updatedAt: Date.now()
    };

    livePositionRuntime.registerPosition(livePosHold);

    await assert.rejects(
      async () => bridge.handleRuntimeResult("pos_hold_1", "SUBMIT_SELL_ORDER"),
      /INVALID_SELL_STATE/
    );
  });

  it("6. Broker execution fill notice updates quantity & state (SELL_PARTIAL vs CLOSED), ignoring duplicate notice", () => {
    const runtime = new LivePositionRuntimeService();

    const livePos: LivePosition = {
      positionId: "pos_fill_1",
      symbol: "005930",
      strategyId: "strat_1",
      state: "SELL_PENDING",
      entryPrice: 70000,
      highestPriceSinceBuy: 75000,
      lowestPriceSinceBuy: 69500,
      trailingFloor: 73000,
      initialStopPrice: 68000,
      defenseSellPrice: 71000,
      expectedSellLow: 74000,
      expectedSellMid: 76000,
      expectedSellHigh: 78000,
      continuationScore: 82,
      quantities: {
        initialQty: 100,
        currentPositionQty: 100,
        pendingSellQty: 100,
        filledSellQty: 0
      },
      lastExitEvidence: null,
      updatedAt: Date.now()
    };

    runtime.registerPosition(livePos);

    // Partial fill notice 1 (40 shares)
    const notice1: BrokerExecutionNotice = {
      noticeId: "NOTICE_001",
      symbol: "005930",
      side: "SELL",
      execQty: 40,
      execPrice: 74000,
      remainingQty: 60,
      timestamp: Date.now()
    };

    const res1 = runtime.onBrokerExecutionNotice("pos_fill_1", notice1);
    assert.equal(res1, "SELL_PARTIAL");

    const updatedPos1 = runtime.getPosition("pos_fill_1");
    assert.equal(updatedPos1?.quantities.currentPositionQty, 60);

    // Duplicate notice 1 (ignored, state remains SELL_PARTIAL)
    const resDup = runtime.onBrokerExecutionNotice("pos_fill_1", notice1);
    assert.equal(resDup, "SELL_PARTIAL");

    // Full remaining fill notice 2 (60 shares)
    const notice2: BrokerExecutionNotice = {
      noticeId: "NOTICE_002",
      symbol: "005930",
      side: "SELL",
      execQty: 60,
      execPrice: 73800,
      remainingQty: 0,
      timestamp: Date.now()
    };

    const res2 = runtime.onBrokerExecutionNotice("pos_fill_1", notice2);
    assert.equal(res2, "CLOSED");

    const updatedPos2 = runtime.getPosition("pos_fill_1");
    assert.equal(updatedPos2?.quantities.currentPositionQty, 0);
    assert.equal(updatedPos2?.state, "CLOSED");
  });

});
