// JUSIK2 V21 COMPLETE TEST SUITE

import test from "node:test";
import assert from "node:assert/strict";
import { getKRXTickSize, roundToKRXTick } from "../src/services/v21/priceRules";
import { LiveTickBarBuilderV21 } from "../src/services/v21/LiveTickBarBuilderV21";
import { IndicatorEngineV21 } from "../src/services/v21/IndicatorEngineV21";
import { MarketStructureEngineV21 } from "../src/services/v21/MarketStructureEngineV21";
import { SetupScorerV21 } from "../src/services/v21/SetupScorerV21";
import { TradePlanEngineV21 } from "../src/services/v21/TradePlanEngineV21";
import { SignalLifecycleEngineV21 } from "../src/services/v21/SignalLifecycleEngineV21";
import { PerformanceEngineV21 } from "../src/services/v21/PerformanceEngineV21";
import { LiveSignalControllerV21 } from "../src/services/v21/LiveSignalControllerV21";
import { KisRealtimeAdapterV21 } from "../src/adapters/KisRealtimeAdapterV21";

test("JUSIK2 V21 Complete Test Suite", async (t) => {
  await t.test("1. KRX Official Tick Rules Test", () => {
    assert.equal(getKRXTickSize(1500), 1);
    assert.equal(getKRXTickSize(3500), 5);
    assert.equal(getKRXTickSize(15000), 10);
    assert.equal(getKRXTickSize(35000), 50);
    assert.equal(getKRXTickSize(75000), 100);
    assert.equal(getKRXTickSize(300000), 500);
    assert.equal(getKRXTickSize(700000), 1000);

    // Rounding
    assert.equal(roundToKRXTick(74830, "floor"), 74800);
    assert.equal(roundToKRXTick(74830, "ceil"), 74900);
    assert.equal(roundToKRXTick(74830, "nearest"), 74800);
  });

  await t.test("2. LiveTickBarBuilderV21 Test - Zero synthetic bars", () => {
    const builder = new LiveTickBarBuilderV21("005930", "1m");
    const t0 = 1700000000000;

    const tick1 = KisRealtimeAdapterV21.normalize({
      mksc_shrn_iscd: "005930",
      stck_prpr: 70000,
      cntg_vol: 100,
      receivedAt: t0,
    });

    const { updatedBar: bar1, completedBar: comp1 } = builder.processTick(tick1);
    assert.equal(comp1, null);
    assert.equal(bar1.open, 70000);
    assert.equal(bar1.close, 70000);

    const tick2 = KisRealtimeAdapterV21.normalize({
      mksc_shrn_iscd: "005930",
      stck_prpr: 70500,
      cntg_vol: 200,
      receivedAt: t0 + 65000,
    });

    const { completedBar: comp2 } = builder.processTick(tick2);
    assert.notEqual(comp2, null);
    assert.equal(comp2?.close, 70000);
    assert.equal(comp2?.isClosed, true);
  });

  await t.test("3. IndicatorEngineV21 & MarketStructureEngineV21 Test", () => {
    const engine = new IndicatorEngineV21();
    const bars = [];
    const baseTime = 1700000000;

    for (let i = 0; i < 30; i++) {
      const price = 50000 + i * 200;
      const bar = {
        symbol: "005930",
        market: "KOREA" as const,
        timeframe: "1m",
        time: baseTime + i * 60,
        open: price - 50,
        high: price + 100,
        low: price - 100,
        close: price,
        volume: 1000 + i * 50,
        startedAt: (baseTime + i * 60) * 1000,
        endedAt: (baseTime + (i + 1) * 60) * 1000 - 1,
        isClosed: true,
        tickCount: 20,
      };
      bars.push(bar);
      engine.ingestBar(bar);
    }

    const snapshot = engine.calculate();
    assert.ok(snapshot.ema9! > 0);
    assert.ok(snapshot.ema20! > 0);

    const structure = MarketStructureEngineV21.evaluate(bars, snapshot);
    assert.equal(structure.trend, "BULLISH");
  });

  await t.test("4. SetupScorerV21 Test - S/A/B Grade and Stale Feed Blocker", () => {
    const verifiedResult = SetupScorerV21.evaluate(
      "005930",
      70000,
      {
        vwap: 68000,
        ema9: 69000,
        ema20: 67000,
        ema50: 65000,
        rsi14: 60,
        macdHist: 10,
        rvol: 2.0,
        atr14: 1000,
        macdLine: 50,
        macdSignal: 40,
        lastSwingLow: 66000,
        lastSwingHigh: 72000,
      },
      {
        trend: "BULLISH",
        isHigherHighHigherLow: true,
        isLowerHighLowerLow: false,
        isBreakout: true,
        isBreakdown: false,
        isVwapReclaim: true,
        isVwapLoss: false,
      },
      "REALTIME_VERIFIED"
    );

    assert.equal(verifiedResult.score, 90);
    assert.equal(verifiedResult.grade, "S");
    assert.equal(verifiedResult.isQualified, true);

    const staleResult = SetupScorerV21.evaluate(
      "005930",
      70000,
      {
        vwap: 68000,
        ema9: 69000,
        ema20: 67000,
        ema50: 65000,
        rsi14: 60,
        macdHist: 10,
        rvol: 2.0,
        atr14: 1000,
        macdLine: 50,
        macdSignal: 40,
        lastSwingLow: 66000,
        lastSwingHigh: 72000,
      },
      {
        trend: "BULLISH",
        isHigherHighHigherLow: true,
        isLowerHighLowerLow: false,
        isBreakout: true,
        isBreakdown: false,
        isVwapReclaim: true,
        isVwapLoss: false,
      },
      "STALE"
    );

    assert.equal(staleResult.isQualified, false); // Rejected due to STALE feed
  });

  await t.test("5. TradePlanEngineV21 & SignalLifecycleEngineV21 Test", () => {
    const plan = TradePlanEngineV21.createTradePlan("005930", "KOREA", 70000, {
      atr14: 1000,
      vwap: 69000,
      ema20: 68500,
      ema9: null,
      ema50: null,
      rsi14: null,
      macdLine: null,
      macdSignal: null,
      macdHist: null,
      rvol: null,
      lastSwingLow: 68000,
      lastSwingHigh: null,
    });

    assert.equal(plan.symbol, "005930");
    assert.ok(plan.stopLossPrice < plan.entryPrice);
    assert.ok(plan.tp1 > plan.entryPrice);
    assert.ok(plan.tp2 > plan.tp1);
    assert.ok(plan.tp3 > plan.tp2);

    const lifecycle = new SignalLifecycleEngineV21();
    const active = lifecycle.registerSignal(plan);
    assert.equal(active.currentTrailingFloor, plan.stopLossPrice);

    // Price hits TP1
    lifecycle.processTick({
      symbol: "005930",
      market: "KOREA",
      price: plan.tp1,
      volume: 100,
      timestamp: Date.now(),
      status: "REALTIME_VERIFIED",
    });

    const activeSignal = lifecycle.getActiveSignal("005930");
    assert.equal(activeSignal?.tp1Hit, true);
    assert.equal(activeSignal?.currentTrailingFloor, plan.entryPrice); // Ratcheted to breakeven

    // Price hits TP3
    lifecycle.processTick({
      symbol: "005930",
      market: "KOREA",
      price: plan.tp3 + 100,
      volume: 100,
      timestamp: Date.now(),
      status: "REALTIME_VERIFIED",
    });

    const completed = lifecycle.getCompletedSignals("005930");
    assert.equal(completed.length, 1);
    assert.equal(completed[0].outcome, "TP3_HIT");

    // Performance Stats
    const stats = PerformanceEngineV21.calculateStats(completed);
    assert.equal(stats.totalSignals, 1);
    assert.equal(stats.tp1FirstTouchRatePct, 100);
    assert.ok(stats.expectancyR > 0);
  });

  await t.test("6. LiveSignalControllerV21 End-to-End Execution Test", () => {
    const controller = new LiveSignalControllerV21("005930", "1m");
    const t0 = 1700000000000;

    // Ingest ticks
    for (let i = 0; i < 20; i++) {
      const price = 70000 + i * 200;
      const tick = KisRealtimeAdapterV21.normalize({
        mksc_shrn_iscd: "005930",
        stck_prpr: price,
        cntg_vol: 500,
        receivedAt: t0 + i * 3000,
      });

      const output = controller.processTick(tick);
      assert.equal(output.currentPrice, price);
      assert.ok(output.setupScore.score >= 0);
    }
  });
});
