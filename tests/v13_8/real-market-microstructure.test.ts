import { describe, it } from "node:test";
import assert from "node:assert";
import { VerifiedTradeTick, validateTradeTick } from "../../src/realtime/VerifiedTradeTick";
import { RealBarBuilder } from "../../src/realtime/RealBarBuilder";
import { VerifiedOrderbookSnapshot, calculateOrderflowMetrics } from "../../src/realtime/VerifiedOrderbookSnapshot";
import { calculateSameTimeRvol } from "../../src/realtime/RvolCalculator";
import { ProfitGateV138, SetupStats } from "../../src/services/v13_8/ProfitGateV138";

describe("AISTOCK v13.8 Real Market Microstructure & Profit Core Tests", () => {
  it("1. VerifiedTradeTick Validation: Accepts authentic KIS ticks and rejects invalid ticks", () => {
    const validTick: VerifiedTradeTick = {
      symbol: "005930",
      market: "KOREA",
      price: 72000,
      size: 150,
      exchangeTimestamp: Date.now() - 500,
      receivedAt: Date.now(),
      source: "KIS_REALTIME_WS",
      trId: "H0STCNT0",
      verified: true
    };

    assert.doesNotThrow(() => validateTradeTick(validTick));

    // Stale tick rejection
    const staleTick: VerifiedTradeTick = {
      ...validTick,
      exchangeTimestamp: Date.now() - 600000 // 600s old (> 300s limit)
    };
    assert.throws(() => validateTradeTick(staleTick), /STALE_OR_FUTURE_TRADE_TICK/);

    // Invalid source rejection
    const invalidSourceTick: any = {
      ...validTick,
      source: "MOCK_WS"
    };
    assert.throws(() => validateTradeTick(invalidSourceTick), /INVALID_TICK_SOURCE/);
  });

  it("2. RealBarBuilder: Builds VerifiedCandle from ticks without creating synthetic empty bars", () => {
    const builder = new RealBarBuilder(60000, "1m");
    const now = Date.now();
    // Previous minute bucket timestamp
    const prevBucket = Math.floor((now - 10000) / 60000) * 60000 - 60000;

    const tick1: VerifiedTradeTick = {
      symbol: "005930",
      market: "KOREA",
      price: 70000,
      size: 100,
      exchangeTimestamp: prevBucket + 10000, // 50s ago (valid <= 60s)
      receivedAt: Date.now(),
      source: "KIS_REALTIME_WS",
      trId: "H0STCNT0",
      verified: true
    };

    const tick2: VerifiedTradeTick = {
      symbol: "005930",
      market: "KOREA",
      price: 70500,
      size: 200,
      exchangeTimestamp: prevBucket + 20000, // 40s ago (valid <= 60s)
      receivedAt: Date.now(),
      source: "KIS_REALTIME_WS",
      trId: "H0STCNT0",
      verified: true
    };

    // First tick in bucket
    const res1 = builder.push(tick1);
    assert.strictEqual(res1, null, "First tick in bar returns null working bar");

    // Second tick in same bucket
    const res2 = builder.push(tick2);
    assert.strictEqual(res2, null, "Same bucket tick updates working bar and returns null");

    // Tick in NEXT bucket completes previous bar
    const tickNextBucket: VerifiedTradeTick = {
      symbol: "005930",
      market: "KOREA",
      price: 70800,
      size: 150,
      exchangeTimestamp: prevBucket + 60000, // start of current minute (0-10s ago)
      receivedAt: Date.now(),
      source: "KIS_REALTIME_WS",
      trId: "H0STCNT0",
      verified: true
    };

    const completedCandle = builder.push(tickNextBucket);
    assert.notStrictEqual(completedCandle, null);
    if (completedCandle) {
      assert.strictEqual(completedCandle.open, 70000);
      assert.strictEqual(completedCandle.high, 70500);
      assert.strictEqual(completedCandle.low, 70000);
      assert.strictEqual(completedCandle.close, 70500);
      assert.strictEqual(completedCandle.volume, 300);
      assert.strictEqual(completedCandle.verified, true);
    }
  });

  it("3. Orderbook Metrics: Computes accurate depth imbalance and spread bps", () => {
    const obSnapshot: VerifiedOrderbookSnapshot = {
      symbol: "005930",
      market: "KOREA",
      timestamp: Date.now(),
      bidPrices: [70000, 69900, 69800],
      bidSizes: [10000, 8000, 5000],
      askPrices: [70100, 70200, 70300],
      askSizes: [2000, 3000, 4000],
      bestBid: 70000,
      bestAsk: 70100,
      spread: 100,
      spreadBps: 14.26, // (100 / 70050) * 10000
      totalBidSize: 23000,
      totalAskSize: 9000,
      source: "KIS_REALTIME_WS",
      trId: "H0STASP0",
      verified: true
    };

    const metrics = calculateOrderflowMetrics(obSnapshot);
    assert.strictEqual(metrics.topBookImbalance > 0, true, "Top book imbalance should be positive when bid > ask");
    assert.strictEqual(metrics.depthImbalance > 0, true, "Depth imbalance should be positive when total bid > total ask");
    assert.strictEqual(metrics.spreadBps, 14.26);
  });

  it("4. RvolCalculator: Computes same-time volume median ratio correctly", () => {
    const currentVol = 150000;
    const histVols = [100000, 95000, 105000, 100000, 98000, 102000, 100000, 99000, 101000, 100000]; // median = 100,000

    const rvol = calculateSameTimeRvol(currentVol, histVols);
    assert.strictEqual(rvol, 1.5, "150,000 / 100,000 median = 1.5 RVOL");
  });

  it("5. ProfitGateV138: Strict Gate Enforcements", () => {
    // Insufficient samples (< 50) -> WAIT
    const smallSampleStats: SetupStats = {
      sampleSize: 30,
      winRate: 0.60,
      avgWinPct: 3.0,
      avgLossPct: 1.5,
      profitFactor: 1.8,
      oosExpectancyPct: 1.2,
      walkForwardExpectancyPct: 1.0,
      expectedCostPct: 0.25
    };
    const res1 = ProfitGateV138.evaluateProfitGate(smallSampleStats);
    assert.strictEqual(res1.decision, "WAIT");
    assert.strictEqual(res1.reason, "INSUFFICIENT_SAMPLE");

    // Negative Net Expectancy -> NO_TRADE
    const negativeNetStats: SetupStats = {
      sampleSize: 100,
      winRate: 0.40,
      avgWinPct: 1.5,
      avgLossPct: 2.0,
      profitFactor: 0.8,
      oosExpectancyPct: -0.5,
      walkForwardExpectancyPct: -0.2,
      expectedCostPct: 0.25
    };
    const res2 = ProfitGateV138.evaluateProfitGate(negativeNetStats);
    assert.strictEqual(res2.decision, "NO_TRADE");
    assert.strictEqual(res2.reason, "NEGATIVE_NET_EXPECTANCY");

    // Outstanding Strategy -> TRADE_CANDIDATE
    const passedStats: SetupStats = {
      sampleSize: 120,
      winRate: 0.65,
      avgWinPct: 2.5,
      avgLossPct: 1.0,
      profitFactor: 2.1,
      oosExpectancyPct: 1.1,
      walkForwardExpectancyPct: 0.95,
      expectedCostPct: 0.25
    };
    const res3 = ProfitGateV138.evaluateProfitGate(passedStats);
    assert.strictEqual(res3.decision, "TRADE_CANDIDATE");
    assert.strictEqual(res3.reason, "PROFIT_GATE_PASSED");
    assert.strictEqual(typeof res3.netExpectancyPct, "number");
    assert.strictEqual((res3.netExpectancyPct ?? 0) > 0, true);
  });
});
