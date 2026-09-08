import test from "node:test";
import assert from "node:assert/strict";

import {
  LivePositionRuntimeService,
  LivePosition
} from "../src/trading/LivePositionRuntimeService";

function makePosition(): LivePosition {
  return {
    positionId: "POS_TRUTH_1",
    symbol: "005930",
    strategyId: "ORB_RETEST",

    state: "HOLD",

    entryPrice: 70000,

    highestPriceSinceBuy: 71000,
    lowestPriceSinceBuy: 69500,

    trailingFloor: 69000,
    initialStopPrice: 68000,

    defenseSellPrice: 69000,

    expectedSellLow: null,
    expectedSellMid: null,
    expectedSellHigh: null,

    continuationScore: null,

    quantities: {
      requestedBuyQty: 10,
      buyFilledQty: 10,
      currentPositionQty: 10,

      requestedSellQty: 10,
      sellFilledQty: 0,
      remainingPositionQty: 10
    },

    lastExitEvidence: null,

    updatedAt: Date.now()
  };
}

test(
  "Execution notice is idempotent",
  () => {
    const runtime =
      new LivePositionRuntimeService();

    runtime.registerPosition(
      makePosition()
    );

    const notice = {
      noticeId: "EXEC_001",
      symbol: "005930",
      side: "SELL" as const,

      execQty: 5,
      execPrice: 70500,

      remainingQty: 5,

      timestamp: Date.now()
    };

    runtime.onBrokerExecutionNotice(
      "POS_TRUTH_1",
      notice
    );

    runtime.onBrokerExecutionNotice(
      "POS_TRUTH_1",
      notice
    );

    const position =
      runtime.getPosition(
        "POS_TRUTH_1"
      )!;

    assert.equal(
      position.quantities.sellFilledQty,
      5
    );

    assert.equal(
      position.quantities.currentPositionQty,
      5
    );

    assert.equal(
      position.quantities.remainingPositionQty,
      5
    );
  }
);

test(
  "Symbol mismatch cannot mutate position",
  () => {
    const runtime =
      new LivePositionRuntimeService();

    runtime.registerPosition(
      makePosition()
    );

    runtime.onBrokerExecutionNotice(
      "POS_TRUTH_1",
      {
        noticeId: "EXEC_BAD_SYMBOL",

        symbol: "000660",

        side: "SELL",

        execQty: 10,
        execPrice: 70500,

        remainingQty: 0,

        timestamp: Date.now()
      }
    );

    const position =
      runtime.getPosition(
        "POS_TRUTH_1"
      )!;

    assert.equal(
      position.quantities.currentPositionQty,
      10
    );

    assert.equal(
      position.state,
      "HOLD"
    );
  }
);

test(
  "Full real sell closes position",
  () => {
    const runtime =
      new LivePositionRuntimeService();

    runtime.registerPosition(
      makePosition()
    );

    runtime.onBrokerExecutionNotice(
      "POS_TRUTH_1",
      {
        noticeId: "EXEC_FULL",

        symbol: "005930",

        side: "SELL",

        execQty: 10,
        execPrice: 70500,

        remainingQty: 0,

        timestamp: Date.now()
      }
    );

    const position =
      runtime.getPosition(
        "POS_TRUTH_1"
      )!;

    assert.equal(
      position.quantities.currentPositionQty,
      0
    );

    assert.equal(
      position.quantities.remainingPositionQty,
      0
    );

    assert.equal(
      position.state,
      "CLOSED"
    );
  }
);
