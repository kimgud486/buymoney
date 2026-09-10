// ----------------------------------------------------------------------
// FINAL RC TRUTH TEST SUITE (AISTOCK FINAL RC)
// ----------------------------------------------------------------------

import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { KISExecutionNoticeParserV20 } from "../server/v20/KISExecutionNoticeParserV20";
import { brokerExecutionTruthBusV20 } from "../server/v20/BrokerExecutionTruthBusV20";
import { brokerExecutionRuntimeBridgeV20 } from "../server/v20/BrokerExecutionRuntimeBridgeV20";
import { livePositionRuntimeService, LivePosition } from "../src/trading/LivePositionRuntimeService";
import { PositionStateMachine } from "../src/trading/PositionStateMachine";
import { ServerGlobalRealtimeScannerV20 } from "../server/v20/ServerGlobalRealtimeScannerV20";
import { H0STCNI0, H0GSCNI0 } from "../src/services/KISRealtimeFieldSchema";

beforeEach(() => {
  brokerExecutionTruthBusV20.clearHistory();
});

test("01. KISExecutionNoticeParserV20 - Correctly parses H0STCNI0 with updated schema", () => {
  const fields = new Array(20).fill("");
  fields[H0STCNI0.ACCOUNT_NO] = "50123456";
  fields[H0STCNI0.ORDER_ID] = "ORD12345";
  fields[H0STCNI0.SIDE_CODE] = "02"; // BUY
  fields[H0STCNI0.SYMBOL] = "005930";
  fields[H0STCNI0.EXEC_QTY] = "10";
  fields[H0STCNI0.EXEC_PRICE] = "78500";
  fields[H0STCNI0.EXEC_TIME] = "093015";
  fields[H0STCNI0.EXEC_FLAG] = "1";
  fields[H0STCNI0.ORDER_QTY] = "10";

  const rawMsg = fields.join("^");
  const parsed = KISExecutionNoticeParserV20.parse("H0STCNI0", rawMsg);

  assert.ok(parsed !== null);
  assert.equal(parsed?.symbol, "005930");
  assert.equal(parsed?.side, "BUY");
  assert.equal(parsed?.execQty, 10);
  assert.equal(parsed?.execPrice, 78500);
  assert.equal(parsed?.isExecuted, true);
});

test("02. KISExecutionNoticeParserV20 - Correctly parses H0GSCNI0 overseas execution", () => {
  const fields = new Array(20).fill("");
  fields[H0GSCNI0.ACCOUNT_NO] = "50123456";
  fields[H0GSCNI0.ORDER_ID] = "ORD_US_99";
  fields[H0GSCNI0.SIDE_CODE] = "02";
  fields[H0GSCNI0.SYMBOL] = "AAPL";
  fields[H0GSCNI0.EXEC_QTY] = "5";
  fields[H0GSCNI0.EXEC_PRICE] = "225.50";
  fields[H0GSCNI0.EXEC_TIME] = "213015";
  fields[H0GSCNI0.EXEC_FLAG] = "1";
  fields[H0GSCNI0.ORDER_QTY] = "5";

  const rawMsg = fields.join("^");
  const parsed = KISExecutionNoticeParserV20.parse("H0GSCNI0", rawMsg);

  assert.ok(parsed !== null);
  assert.equal(parsed?.symbol, "AAPL");
  assert.equal(parsed?.side, "BUY");
  assert.equal(parsed?.execQty, 5);
  assert.equal(parsed?.execPrice, 225.50);
});

test("03. BrokerExecutionTruthBusV20 - Deduplicates fills", () => {
  let receivedCount = 0;
  const unsub = brokerExecutionTruthBusV20.subscribe(() => {
    receivedCount++;
  });

  const notice = {
    rawTrId: "H0STCNI0",
    noticeId: "n1",
    accountNo: "50123456",
    orderId: "O100",
    originalOrderId: "",
    symbol: "005930",
    side: "BUY" as const,
    execQty: 10,
    execPrice: 78000,
    orderQty: 10,
    remainingQty: 0,
    isExecuted: true,
    execTime: "100000",
    timestamp: Date.now(),
    rawFields: []
  };

  const firstPub = brokerExecutionTruthBusV20.publish(notice);
  const secondPub = brokerExecutionTruthBusV20.publish(notice);

  assert.equal(firstPub, true);
  assert.equal(secondPub, false); // Deduplicated
  assert.equal(receivedCount, 1);

  unsub();
});

test("04. BrokerExecutionRuntimeBridgeV20 - Routes fill to LivePositionRuntimeService", () => {
  const testPos: LivePosition = {
    positionId: "pos_test_100",
    symbol: "005930",
    strategyId: "strat_1",
    state: "BUY_PENDING",
    entryPrice: 78000,
    highestPriceSinceBuy: 78000,
    lowestPriceSinceBuy: 78000,
    trailingFloor: null,
    initialStopPrice: 75000,
    defenseSellPrice: null,
    expectedSellLow: null,
    expectedSellMid: null,
    expectedSellHigh: null,
    continuationScore: null,
    quantities: {
      requestedBuyQty: 10,
      buyFilledQty: 0,
      requestedSellQty: 0,
      sellFilledQty: 0,
      currentPositionQty: 0,
      remainingPositionQty: 0
    },
    lastExitEvidence: null,
    updatedAt: Date.now()
  };

  livePositionRuntimeService.registerPosition(testPos);
  brokerExecutionRuntimeBridgeV20.registerOrderToPosition("ORD_TEST_100", "pos_test_100");
  brokerExecutionRuntimeBridgeV20.startBridge();

  const notice = {
    rawTrId: "H0STCNI0",
    noticeId: "n_test_100",
    accountNo: "50123456",
    orderId: "ORD_TEST_100",
    originalOrderId: "",
    symbol: "005930",
    side: "BUY" as const,
    execQty: 10,
    execPrice: 78000,
    orderQty: 10,
    remainingQty: 0,
    isExecuted: true,
    execTime: "100100",
    timestamp: Date.now(),
    rawFields: []
  };

  brokerExecutionTruthBusV20.publish(notice);

  const updatedPos = livePositionRuntimeService.getPosition("pos_test_100");
  assert.equal(updatedPos?.quantities.buyFilledQty, 10);
  assert.equal(updatedPos?.state, "HOLD");
});

test("05. ServerGlobalRealtimeScannerV20 - Rejects STALE / NO_DATA", () => {
  const res = ServerGlobalRealtimeScannerV20.evaluateCandidate({
    symbol: "005930",
    name: "삼성전자",
    market: "KR",
    exchange: "KOSPI",
    price: 78500,
    changePct: 2.5,
    volume: 1000000,
    tradeValue: 78500000000,
    rvol: 2.1,
    dataStatus: "STALE"
  });

  assert.equal(res.recommendation, "REJECT");
  assert.ok(res.rejectionReason?.includes("DATA_TRUTH_REJECT"));
});

test("06. ServerGlobalRealtimeScannerV20 - Evaluates S-grade candidate with True MTF confirmation and executable pattern", () => {
  const now = Date.now();
  const res = ServerGlobalRealtimeScannerV20.evaluateCandidate({
    symbol: "005930",
    name: "삼성전자",
    market: "KR",
    exchange: "KOSPI",
    price: 78500,
    changePct: 3.5,
    volume: 5000000,
    tradeValue: 392500000000,
    rvol: 3.2,
    rs5m: 85,
    rs15m: 82,
    rs1h: 80,
    rs1d: 88,
    vwap: 77500,
    ema9: 78000,
    ema20: 77200,
    ema50: 76000,
    atr14: 1200,
    rsi14: 68,
    spreadBps: 10,
    patterns: ["DOUBLE_BOTTOM"],
    structureTrend: "BULLISH",
    isBreakout: true,
    trueMtf: {
      "1m": {
        timeframe: "1m",
        dataStatus: "REALTIME_VERIFIED",
        source: "KIS_REALTIME_WS",
        lastBarTimestamp: now,
        barIntervalMs: 60000,
        close: 78500,
        high: 78600,
        ema9: 78100,
        ema20: 77800,
        ema50: 77000,
        rsi14: 66,
        macdHist: 120,
        rvol: 2.1,
        vwap: 77900,
        previousHigh20: 78300
      },
      "3m": {
        timeframe: "3m",
        dataStatus: "REALTIME_DERIVED",
        source: "KIS_REALTIME_WS_1M_AGGREGATED_3M",
        lastBarTimestamp: now,
        barIntervalMs: 180000,
        close: 78400,
        high: 78600,
        ema9: 78050,
        ema20: 77700,
        ema50: 76900,
        rsi14: 64,
        macdHist: 105,
        rvol: 1.9,
        vwap: 77800
      },
      "5m": {
        timeframe: "5m",
        dataStatus: "REALTIME_VERIFIED",
        source: "KIS_REALTIME_5M",
        lastBarTimestamp: now,
        barIntervalMs: 300000,
        close: 78300,
        high: 78600,
        ema9: 77950,
        ema20: 77600,
        ema50: 76800,
        rsi14: 63,
        macdHist: 95,
        rvol: 1.8,
        vwap: 77700
      },
      D: {
        timeframe: "D",
        dataStatus: "REALTIME_DERIVED",
        source: "KIS_DAILY_CANDLE",
        lastBarTimestamp: now,
        barIntervalMs: 86400000,
        close: 78500,
        high: 79000,
        ema9: 77000,
        ema20: 76000,
        ema50: 74000,
        rsi14: 62,
        macdHist: 350,
        rvol: 1.4
      }
    },
    dataStatus: "REALTIME_VERIFIED"
  });

  assert.equal(res.trueMtfGate.passed, true);
  assert.equal(res.patternGate.passed, true);
  assert.ok(res.patternGate.executableMatches.includes("DOUBLE_BOTTOM"));
  assert.equal(res.recommendation, "BUY_CANDIDATE");
  assert.ok(res.setupScore >= 85);
  assert.equal(res.grade, "S");
});