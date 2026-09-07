import { test } from "node:test";
import assert from "node:assert/strict";
import { LivePositionRuntimeService, LivePosition, VerifiedMarketSnapshot } from "../src/trading/LivePositionRuntimeService";
import { Candle } from "../src/services/StructureBrain";

function createMockCandles(basePrice: number = 100, count: number = 20, trend: "UP" | "DOWN" = "UP"): Candle[] {
  const candles: Candle[] = [];
  let price = basePrice;
  const now = Date.now() - count * 60000;

  for (let i = 0; i < count; i++) {
    const step = trend === "UP" ? 0.5 : -0.5;
    const open = price;
    const close = price + step;
    const high = Math.max(open, close) + 0.3;
    const low = Math.min(open, close) - 0.3;
    const volume = 1000 + i * 10;

    candles.push({
      timestamp: now + i * 60000,
      open,
      high,
      low,
      close,
      volume
    });

    price = close;
  }

  return candles;
}

test("LivePositionRuntimeService - Bar Evaluation & Profit Hold Transition", () => {
  const runtime = new LivePositionRuntimeService();

  const initialPosition: LivePosition = {
    positionId: "POS_001",
    symbol: "005930",
    strategyId: "ORB_RETEST",
    state: "HOLD",
    entryPrice: 100,
    highestPriceSinceBuy: 100,
    trailingFloor: null,
    initialStopPrice: null,
    quantities: {
      requestedBuyQty: 10,
      buyFilledQty: 10,
      currentPositionQty: 10,
      requestedSellQty: 0,
      sellFilledQty: 0,
      remainingPositionQty: 10
    },
    lastExitEvidence: null,
    updatedAt: Date.now()
  };

  runtime.registerPosition(initialPosition);

  const candles = createMockCandles(100, 20, "UP"); // Price rises from 100 to 110
  const snapshot: VerifiedMarketSnapshot = {
    symbol: "005930",
    market: "KR",
    price: 110,
    candles,
    isVerified: true
  };

  const res = runtime.onCompletedBar("POS_001", snapshot);

  assert.equal(res.previousState, "HOLD");
  assert.equal(res.nextState, "PROFIT_HOLD");
  assert.ok(res.lifecycleOutput != null);

  const updatedPos = runtime.getPosition("POS_001")!;
  assert.equal(updatedPos.highestPriceSinceBuy, 110);
  assert.ok(updatedPos.trailingFloor != null);
  assert.ok(updatedPos.trailingFloor >= 95);
});

test("LivePositionRuntimeService - SELL_WATCH Recovery Test", () => {
  const runtime = new LivePositionRuntimeService();

  const watchPosition: LivePosition = {
    positionId: "POS_002",
    symbol: "AAPL",
    strategyId: "GAP_AND_GO",
    state: "SELL_WATCH",
    entryPrice: 150,
    highestPriceSinceBuy: 160,
    trailingFloor: 145,
    initialStopPrice: 140,
    quantities: {
      requestedBuyQty: 10,
      buyFilledQty: 10,
      currentPositionQty: 10,
      requestedSellQty: 0,
      sellFilledQty: 0,
      remainingPositionQty: 10
    },
    lastExitEvidence: null,
    updatedAt: Date.now()
  };

  runtime.registerPosition(watchPosition);

  // Recovering price with strong upward momentum
  const candles = createMockCandles(155, 20, "UP");
  const snapshot: VerifiedMarketSnapshot = {
    symbol: "AAPL",
    market: "US",
    price: 165,
    candles,
    isVerified: true
  };

  const res = runtime.onCompletedBar("POS_002", snapshot);

  // Should recover from SELL_WATCH -> PROFIT_HOLD
  assert.equal(res.previousState, "SELL_WATCH");
  assert.equal(res.nextState, "PROFIT_HOLD");
});

test("LivePositionRuntimeService - Monotonic Trailing Stop Floor Ratchet", () => {
  const runtime = new LivePositionRuntimeService();

  const pos: LivePosition = {
    positionId: "POS_003",
    symbol: "NVDA",
    strategyId: "BREAKOUT",
    state: "HOLD",
    entryPrice: 100,
    highestPriceSinceBuy: 120,
    trailingFloor: 115, // Established high floor
    initialStopPrice: 95,
    quantities: {
      requestedBuyQty: 10,
      buyFilledQty: 10,
      currentPositionQty: 10,
      requestedSellQty: 0,
      sellFilledQty: 0,
      remainingPositionQty: 10
    },
    lastExitEvidence: null,
    updatedAt: Date.now()
  };

  runtime.registerPosition(pos);

  // Temporary minor pullback candle (close 118)
  const candles = createMockCandles(115, 15, "UP");
  const snapshot: VerifiedMarketSnapshot = {
    symbol: "NVDA",
    market: "US",
    price: 118,
    candles,
    isVerified: true
  };

  runtime.onCompletedBar("POS_003", snapshot);

  const updatedPos = runtime.getPosition("POS_003")!;
  // Trailing floor must NOT drop below 115!
  assert.ok(updatedPos.trailingFloor! >= 115);
});

test("LivePositionRuntimeService - Fast-Path Tick Emergency Breach", () => {
  const runtime = new LivePositionRuntimeService();

  const pos: LivePosition = {
    positionId: "POS_004",
    symbol: "BTC",
    strategyId: "MOMENTUM",
    state: "PROFIT_HOLD",
    entryPrice: 100,
    highestPriceSinceBuy: 120,
    trailingFloor: 110,
    initialStopPrice: 90,
    quantities: {
      requestedBuyQty: 1,
      buyFilledQty: 1,
      currentPositionQty: 1,
      requestedSellQty: 0,
      sellFilledQty: 0,
      remainingPositionQty: 1
    },
    lastExitEvidence: null,
    updatedAt: Date.now()
  };

  runtime.registerPosition(pos);

  // Tick price drops below trailing floor (108 <= 110)
  const validTick = {
    symbol: "BTC",
    market: "CRYPTO" as const,
    price: 108,
    sourceTimestamp: Date.now(),
    receivedAt: Date.now(),
    ageMs: 10,
    sequence: 1,
    dataStatus: "REALTIME_VERIFIED" as const,
    sessionStatus: "OPEN",
    brokerHealth: "HEALTHY" as const
  };

  const tickRes = runtime.onVerifiedTick("POS_004", validTick);

  assert.equal(tickRes.nextState, "SELL_PENDING");
  assert.equal(tickRes.actionRequired, "SUBMIT_SELL_ORDER");
});

test("LivePositionRuntimeService - Broker Execution Sync & CLOSED State Lock", () => {
  const runtime = new LivePositionRuntimeService();

  const pos: LivePosition = {
    positionId: "POS_005",
    symbol: "005930",
    strategyId: "VWAP_RECLAIM",
    state: "SELL_PENDING",
    entryPrice: 70000,
    highestPriceSinceBuy: 75000,
    trailingFloor: 73000,
    initialStopPrice: 68000,
    quantities: {
      requestedBuyQty: 100,
      buyFilledQty: 100,
      currentPositionQty: 100,
      requestedSellQty: 100,
      sellFilledQty: 0,
      remainingPositionQty: 100
    },
    lastExitEvidence: null,
    updatedAt: Date.now()
  };

  runtime.registerPosition(pos);

  // 1. Partial Sell Fill (50 shares filled)
  const partialNotice = {
    noticeId: "NOT_01",
    symbol: "005930",
    side: "SELL" as const,
    execQty: 50,
    execPrice: 73500,
    remainingQty: 50,
    timestamp: Date.now()
  };

  const stateAfterPartial = runtime.onBrokerExecutionNotice("POS_005", partialNotice);
  assert.equal(stateAfterPartial, "SELL_PARTIAL");

  const posPartial = runtime.getPosition("POS_005")!;
  assert.equal(posPartial.quantities.sellFilledQty, 50);
  assert.equal(posPartial.quantities.remainingPositionQty, 50);

  // 2. Full Remaining Sell Fill (final 50 shares filled)
  const finalNotice = {
    noticeId: "NOT_02",
    symbol: "005930",
    side: "SELL" as const,
    execQty: 50,
    execPrice: 73500,
    remainingQty: 0,
    timestamp: Date.now()
  };

  const finalState = runtime.onBrokerExecutionNotice("POS_005", finalNotice);
  assert.equal(finalState, "CLOSED");

  const posClosed = runtime.getPosition("POS_005")!;
  assert.equal(posClosed.quantities.remainingPositionQty, 0);
  assert.equal(posClosed.quantities.sellFilledQty, 100);
});
