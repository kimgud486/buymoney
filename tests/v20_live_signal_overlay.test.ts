// AISTOCK V20 LIVE SIGNAL OVERLAY TEST SUITE

import test from "node:test";
import assert from "node:assert/strict";
import { LiveTickBarBuilderV20, V20Tick } from "../src/services/v20/LiveTickBarBuilderV20";
import { V20SetupScorer } from "../src/services/v20/V20SetupScorer";
import { AdaptiveTradePlanEngineV20 } from "../src/services/v20/AdaptiveTradePlanEngineV20";
import { LiveTradeSignalTrackerV20 } from "../src/services/v20/LiveTradeSignalTrackerV20";

test("AISTOCK V20 Live Signal Overlay Test Suite", async (t) => {
  await t.test("1. LiveTickBarBuilderV20 - Aggregates real ticks without synthetic gap bars", () => {
    const builder = new LiveTickBarBuilderV20("005930", "1m");
    const t0 = 1700000000000;

    // Tick 1
    const { updatedBar: bar1, completedBar: comp1 } = builder.processTick({
      symbol: "005930",
      price: 70000,
      volume: 100,
      timestamp: t0,
    });

    assert.equal(comp1, null);
    assert.equal(bar1.open, 70000);
    assert.equal(bar1.high, 70000);
    assert.equal(bar1.low, 70000);
    assert.equal(bar1.close, 70000);
    assert.equal(bar1.volume, 100);

    // Tick 2 (Same 1m slot)
    const { updatedBar: bar2 } = builder.processTick({
      symbol: "005930",
      price: 70500,
      volume: 200,
      timestamp: t0 + 10000,
    });

    assert.equal(bar2.open, 70000);
    assert.equal(bar2.high, 70500);
    assert.equal(bar2.low, 70000);
    assert.equal(bar2.close, 70500);
    assert.equal(bar2.volume, 300);

    // Tick 3 (Next 1m slot -> completes previous bar)
    const { updatedBar: bar3, completedBar: comp3 } = builder.processTick({
      symbol: "005930",
      price: 71000,
      volume: 150,
      timestamp: t0 + 65000,
    });

    assert.notEqual(comp3, null);
    assert.equal(comp3?.close, 70500);
    assert.equal(comp3?.isClosed, true);
    assert.equal(bar3.open, 71000);
  });

  await t.test("2. V20SetupScorer - Calculates transparent setup score and checks verification", () => {
    const resultQualified = V20SetupScorer.evaluate({
      price: 71000,
      vwap: 70000,
      ema9: 70500,
      ema20: 69500,
      macdHist: 15,
      rsi14: 62,
      isHigherHighHigherLow: true,
      isBreakoutConfirmed: true,
      rvol: 2.1,
      dataStatus: "REALTIME_VERIFIED",
    });

    assert.equal(resultQualified.score, 100);
    assert.equal(resultQualified.isQualified, true);

    const resultUnverified = V20SetupScorer.evaluate({
      price: 71000,
      vwap: 70000,
      ema9: 70500,
      ema20: 69500,
      macdHist: 15,
      rsi14: 62,
      isHigherHighHigherLow: true,
      isBreakoutConfirmed: true,
      rvol: 2.1,
      dataStatus: "STALE",
    });

    assert.equal(resultUnverified.score, 100);
    assert.equal(resultUnverified.isQualified, false); // Rejected because STALE
  });

  await t.test("3. AdaptiveTradePlanEngineV20 - Generates plan with KRX tick size rounding", () => {
    const plan = AdaptiveTradePlanEngineV20.createTradePlan({
      symbol: "005930",
      market: "KOREA",
      entryPrice: 70000,
      atr14: 1000,
      vwap: 69500,
      ema20: 69200,
      lastSwingLow: 69000,
    });

    assert.equal(plan.symbol, "005930");
    assert.equal(plan.entryPrice, 70000);
    assert.ok(plan.stopLossPrice < plan.entryPrice);
    assert.ok(plan.tp1 > plan.entryPrice);
    assert.ok(plan.tp2 > plan.tp1);
    assert.ok(plan.tp3 > plan.tp2);

    // Verify KRX tick size (for 70,000 KRW, tick size is 100 KRW)
    assert.equal(plan.stopLossPrice % 100, 0);
    assert.equal(plan.tp1 % 100, 0);
    assert.equal(plan.tp2 % 100, 0);
    assert.equal(plan.tp3 % 100, 0);
  });

  await t.test("4. LiveTradeSignalTrackerV20 - Monotonic trailing stop, hit tracking, and ambiguous handling", () => {
    const tracker = new LiveTradeSignalTrackerV20();
    const plan = AdaptiveTradePlanEngineV20.createTradePlan({
      symbol: "005930",
      market: "KOREA",
      entryPrice: 70000,
      atr14: 1000,
    });

    const signal = tracker.registerSignal(plan);
    assert.equal(signal.currentTrailingFloor, plan.stopLossPrice);

    // Price moves to TP1 -> Trailing stop ratchets to entryPrice (breakeven)
    tracker.processTick({
      symbol: "005930",
      price: plan.tp1,
      volume: 100,
      timestamp: Date.now(),
    });

    const activeList = tracker.getActiveSignals("005930");
    assert.equal(activeList.length, 1);
    assert.equal(activeList[0].tp1Hit, true);
    assert.equal(activeList[0].currentTrailingFloor, plan.entryPrice); // Ratcheted to breakeven

    // Price pulls back -> Trailing floor MUST NOT decrease
    tracker.processTick({
      symbol: "005930",
      price: plan.entryPrice + 100,
      volume: 50,
      timestamp: Date.now(),
    });

    assert.equal(activeList[0].currentTrailingFloor, plan.entryPrice); // Retains breakeven floor

    // Price reaches TP3 -> Trade completes
    tracker.processTick({
      symbol: "005930",
      price: plan.tp3 + 100,
      volume: 200,
      timestamp: Date.now(),
    });

    const completed = tracker.getCompletedSignals("005930");
    assert.equal(completed.length, 1);
    assert.equal(completed[0].tp3Hit, true);
    assert.equal(completed[0].outcome, "TP3_HIT");

    // Test Ambiguous Jump (Price hits SL and TP in single tick)
    const plan2 = AdaptiveTradePlanEngineV20.createTradePlan({
      symbol: "000660",
      market: "KOREA",
      entryPrice: 100000,
    });
    tracker.registerSignal(plan2);

    // Single tick violating both SL and TP1
    tracker.processTick({
      symbol: "000660",
      price: plan2.stopLossPrice - 500,
      volume: 100,
      timestamp: Date.now(),
    });

    const stats = tracker.getStats("000660");
    assert.equal(stats.totalSignals, 1);
  });
});
