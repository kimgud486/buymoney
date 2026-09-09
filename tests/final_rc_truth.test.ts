import test from "node:test";
import assert from "node:assert/strict";
import { KISExecutionNoticeParserV20 } from "../server/v20/KISExecutionNoticeParserV20";
import { brokerExecutionTruthBusV20 } from "../server/v20/BrokerExecutionTruthBusV20";
import { brokerExecutionRuntimeBridgeV20 } from "../server/v20/BrokerExecutionRuntimeBridgeV20";
import { ServerGlobalRealtimeScannerV20 } from "../server/v20/ServerGlobalRealtimeScannerV20";
import { livePositionRuntimeService } from "../src/services/v19/LivePositionRuntimeService";

function createBasePosition(positionId: string, symbol: string) {
  const now = Date.now();
  return {
    positionId,
    symbol,
    market: "KR" as const,
    side: "LONG" as const,
    entryPrice: 78000,
    entryTime: now,
    quantities: {
      requestedBuyQty: 10,
      buyFilledQty: 0,
      remainingQty: 0,
      partialSellQty: 0,
      sellFilledQty: 0
    },
    prices: {
      currentPrice: 78000,
      highestPrice: 78000,
      lowestPrice: 78000
    },
    exits: {
      stopLoss: 76000,
      tp1: 80000,
      tp2: 82000,
      tp3: 85000
    },
    state: "BUY_PENDING" as const,
    profitHold: false,
    sellWatchLevel: 0 as 0 | 1 | 2 | 3,
    lastIndicatorSnapshot: null,
    lastEvaluationTime: now,
    dataStatus: "REALTIME_VERIFIED" as const,
    provider: "KIS" as const,
    source: "KIS_REALTIME_WS",
    sourceTimestamp: now,
    receivedAt: now,
    freshnessMs: 0,
    trust: "EXECUTION_GRADE" as const
  };
}

test("01. KISExecutionNoticeParserV20 - Correctly parses H0STCNI0 with updated schema", () => {
  const parser = new KISExecutionNoticeParserV20();
  const fields = Array(40).fill("");
  fields[0] = "12345678";
  fields[1] = "1234567890";
  fields[2] = "ORD001";
  fields[3] = "ORIG001";
  fields[4] = "02";
  fields[5] = "00";
  fields[6] = "02";
  fields[7] = "005930";
  fields[8] = "10";
  fields[9] = "78000";
  fields[10] = "100001";
  fields[11] = "N";
  fields[13] = "10";
  fields[14] = "78000";
  fields[15] = "ORD001";
  fields[16] = "100001";
  fields[37] = "0";

  const notice = parser.parseDomestic(fields.join("^"));
  assert.equal(notice.symbol, "005930");
  assert.equal(notice.side, "BUY");
  assert.equal(notice.execQty, 10);
  assert.equal(notice.execPrice, 78000);
  assert.equal(notice.remainingQty, 0);
  assert.equal(notice.isExecuted, true);
});

test("02. KISExecutionNoticeParserV20 - Correctly parses H0GSCNI0 overseas execution", () => {
  const parser = new KISExecutionNoticeParserV20();
  const fields = Array(30).fill("");
  fields[0] = "12345678";
  fields[1] = "1234567890";
  fields[2] = "USORD1";
  fields[3] = "USORG1";
  fields[4] = "02";
  fields[5] = "00";
  fields[6] = "02";
  fields[7] = "NASD";
  fields[8] = "NVDA";
  fields[9] = "5";
  fields[10] = "120.5";
  fields[11] = "100002";
  fields[12] = "N";
  fields[14] = "5";
  fields[15] = "120.5";
  fields[16] = "USORD1";
  fields[17] = "100002";
  fields[27] = "0";

  const notice = parser.parseOverseas(fields.join("^"));
  assert.equal(notice.symbol, "NVDA");
  assert.equal(notice.side, "BUY");
  assert.equal(notice.execQty, 5);
  assert.equal(notice.execPrice, 120.5);
  assert.equal(notice.remainingQty, 0);
  assert.equal(notice.isExecuted, true);
});

test("03. BrokerExecutionTruthBusV20 - Deduplicates fills", () => {
  let received = 0;
  const unsubscribe = brokerExecutionTruthBusV20.subscribe(() => {
    received++;
  });

  const notice = {
    trId: "H0STCNI0" as const,
    accountNo: "12345678",
    accountProductCode: "01",
    orderId: "O100",
    originalOrderId: "",
    symbol: "005930",
    side: "BUY" as const,
    orderType: "00",
    execQty: 10,
    execPrice: 78000,
    orderQty: 10,
    remainingQty: 0,
    isExecuted: true,
    execTime: "100000",
    timestamp: 100000,
    rawFields: []
  };

  brokerExecutionTruthBusV20.publish(notice);
  brokerExecutionTruthBusV20.publish(notice);

  unsubscribe();
  assert.equal(received, 1);
});

test("04. BrokerExecutionRuntimeBridgeV20 - Routes fill to LivePositionRuntimeService", () => {
  const positionId = "pos_test_100";
  livePositionRuntimeService.registerPosition(createBasePosition(positionId, "005930"));
  brokerExecutionRuntimeBridgeV20.start();

  const notice = {
    trId: "H0STCNI0" as const,
    accountNo: "12345678",
    accountProductCode: "01",
    orderId: "ORD_TEST_100",
    originalOrderId: "",
    symbol: "005930",
    side: "BUY" as const,
    orderType: "00",
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

test("06. ServerGlobalRealtimeScannerV20 - Evaluates S-grade candidate only after True MTF confirmation", () => {
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
    structureTrend: "BULLISH",
    isBreakout: true,
    trueMtf: {
      "1m": {
        timeframe: "1m",
        dataStatus: "REALTIME_VERIFIED",
        source: "KIS_REALTIME_WS",
        lastBarTimestamp: now,
        barIntervalMs: 60_000,
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
        barIntervalMs: 180_000,
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
        barIntervalMs: 300_000,
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
        barIntervalMs: 86_400_000,
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
  assert.equal(res.recommendation, "BUY_CANDIDATE");
  assert.ok(res.setupScore >= 85);
  assert.equal(res.grade, "S");
});
