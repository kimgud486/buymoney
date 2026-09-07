// AISTOCK v13.5 Observability & Live Readiness Test Suite

import { describe, test } from "node:test";
import assert from "node:assert";
import { LiveDataIntegrityGate, validateLiveMarketData } from "../../src/realtime/LiveDataIntegrityGate";
import { PredictionAccuracyTracker } from "../../src/prediction/PredictionAccuracyTracker";
import { runPredictionPipeline } from "../../src/prediction/index";
import { KISBrokerGatewayV123 } from "../../server/broker/KISBrokerGatewayV123";

describe("AISTOCK v13.5 Observability & Live Readiness Test Suite", () => {
  test("1. LiveDataIntegrityGate: Validates valid real-time tick from KIS_REALTIME_WS", () => {
    const gate = new LiveDataIntegrityGate();
    const now = Date.now();
    const result = gate.validate({
      symbol: "005930",
      price: 75000,
      timestamp: now - 100,
      source: "KIS_REALTIME_WS",
      receivedAt: now,
      volume: 1500
    });

    assert.strictEqual(result.valid, true);
    assert.ok(result.ageMs <= 100);
    assert.ok((result.latencyMs ?? 0) >= 0);
  });

  test("2. LiveDataIntegrityGate: Rejects ticks with missing or invalid symbols", () => {
    const gate = new LiveDataIntegrityGate();
    const now = Date.now();
    const result = gate.validate({
      symbol: "",
      price: 75000,
      timestamp: now,
      source: "KIS_REALTIME_WS",
      receivedAt: now
    });

    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.reason, "MISSING_SYMBOL");
  });

  test("3. LiveDataIntegrityGate: Rejects invalid prices (zero, negative, NaN)", () => {
    const gate = new LiveDataIntegrityGate();
    const now = Date.now();

    assert.strictEqual(gate.validate({
      symbol: "005930",
      price: 0,
      timestamp: now,
      source: "KIS_REALTIME_WS",
      receivedAt: now
    }).reason, "INVALID_PRICE");

    assert.strictEqual(gate.validate({
      symbol: "005930",
      price: -500,
      timestamp: now,
      source: "KIS_REALTIME_WS",
      receivedAt: now
    }).reason, "INVALID_PRICE");

    assert.strictEqual(gate.validate({
      symbol: "005930",
      price: NaN,
      timestamp: now,
      source: "KIS_REALTIME_WS",
      receivedAt: now
    }).reason, "INVALID_PRICE");
  });

  test("4. LiveDataIntegrityGate: Rejects non-real feed sources", () => {
    const gate = new LiveDataIntegrityGate();
    const now = Date.now();
    const result = gate.validate({
      symbol: "005930",
      price: 75000,
      timestamp: now,
      source: "MOCK_SYNTHETIC_GENERATOR",
      receivedAt: now
    });

    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.reason, "NON_REAL_DATA_SOURCE");
  });

  test("5. LiveDataIntegrityGate: Rejects stale market data older than maxAgeMs", () => {
    const gate = new LiveDataIntegrityGate();
    const now = Date.now();
    const result = gate.validate({
      symbol: "005930",
      price: 75000,
      timestamp: now - 10000, // 10s ago
      source: "KIS_REALTIME_WS",
      receivedAt: now
    }, 5000);

    assert.strictEqual(result.valid, false);
    assert.ok(result.reason?.includes("STALE_MARKET_DATA"));
  });

  test("6. LiveDataIntegrityGate: Rejects duplicate or out-of-order timestamps for same symbol", () => {
    const gate = new LiveDataIntegrityGate();
    const now = Date.now();

    const res1 = gate.validate({
      symbol: "005930",
      price: 75000,
      timestamp: now - 2000,
      source: "KIS_REALTIME_WS",
      receivedAt: now - 1000
    });
    assert.strictEqual(res1.valid, true);

    const res2 = gate.validate({
      symbol: "005930",
      price: 75100,
      timestamp: now - 2000,
      source: "KIS_REALTIME_WS",
      receivedAt: now
    });
    assert.strictEqual(res2.valid, false);
    assert.strictEqual(res2.reason, "DUPLICATE_OR_OUT_OF_ORDER_TICK");
  });

  test("7. KISBrokerGatewayV123: Rejects isPaperTrading === true orders immediately", async () => {
    const broker = new KISBrokerGatewayV123();
    const res = await broker.executeOrder({
      symbol: "005930",
      name: "삼성전자",
      market: "KOREA",
      side: "BUY",
      price: 75000,
      qty: 10,
      orderType: "LIMIT",
      isPaperTrading: true
    });

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.status, "REJECTED");
    assert.ok(res.message.includes("LIVE-ONLY"));
  });

  test("8. KISBrokerGatewayV123: Disables PAPER OAuth token and returns REJECTED_PAPER_TR", async () => {
    const broker = new KISBrokerGatewayV123();
    const token = await broker.getOAuthToken(true);
    assert.strictEqual(token, null);

    const trId = broker.getTRID("KOREA", "BUY", true);
    assert.strictEqual(trId, "REJECTED_PAPER_TR");
  });

  test("9. PredictionAccuracyTracker: Registers, resolves, and tracks forecast performance", () => {
    const tracker = new PredictionAccuracyTracker();
    tracker.register({
      id: "pred-1",
      symbol: "005930",
      market: "KOREA",
      timeframe: "15m",
      predictionTime: Date.now() - 900000,
      targetTime: Date.now(),
      sourcePrice: 100,
      predictedPrice: 105,
      predictedDirection: "UP",
      rawProbability: 0.8,
      calibratedProbability: 0.8
    });

    tracker.register({
      id: "pred-2",
      symbol: "NVDA",
      market: "US",
      timeframe: "15m",
      predictionTime: Date.now() - 900000,
      targetTime: Date.now(),
      sourcePrice: 200,
      predictedPrice: 190,
      predictedDirection: "DOWN",
      rawProbability: 0.75,
      calibratedProbability: 0.72
    });

    tracker.resolve("pred-1", 106);
    tracker.resolve("pred-2", 188);

    const scoreboard = tracker.getScoreboard();
    assert.strictEqual(scoreboard.total, 2);
    assert.strictEqual(scoreboard.resolvedCount, 2);
    assert.strictEqual(scoreboard.directionAccuracyPct, 100);
    assert.strictEqual(scoreboard.mae, 1.5);
  });

  test("10. Real Market Data Enforcement: Throws REAL_MARKET_DATA_REQUIRED when candles < 30 in LIVE mode", () => {
    assert.throws(() => {
      runPredictionPipeline({
        symbol: "005930",
        market: "KOREA",
        candles: [],
        requireRealData: true
      });
    }, (err: any) => {
      return String(err.message).includes("REAL_MARKET_DATA_REQUIRED");
    });
  });

  test("11. Real Market Data Enforcement: Executes pipeline with >= 30 real candles", () => {
    const now = Date.now();
    const candles = Array.from({ length: 40 }, (_, i) => ({
      symbol: "005930",
      market: "KOREA" as const,
      timeframe: "15m" as const,
      open: 70000 + i * 100,
      high: 70500 + i * 100,
      low: 69800 + i * 100,
      close: 70200 + i * 100,
      volume: 10000 + i * 500,
      startedAt: now - (40 - i) * 900000,
      endedAt: now - (40 - i - 1) * 900000,
      source: "KIS_REALTIME_WS" as const,
      receivedAt: now,
      verified: true as const
    }));

    const result = runPredictionPipeline({
      symbol: "005930",
      market: "KOREA",
      candles,
      requireRealData: true
    });

    assert.strictEqual(result.symbol, "005930");
    assert.strictEqual(result.calibratedOutput, null);
    assert.ok(result.metaDecision);
  });
});
