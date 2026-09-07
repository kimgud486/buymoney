// AISTOCK v13.6 Strategy Performance & Self-Evaluation Test Suite

import { describe, test } from "node:test";
import assert from "node:assert";
import { StrategyStatsEngineV136 } from "../../src/services/v13_6/StrategyStatsEngineV136";
import { StrategySelfEvaluatorV136 } from "../../src/services/v13_6/StrategySelfEvaluatorV136";
import { TradeRecordV136 } from "../../src/services/v13_6/typesV136";

describe("AISTOCK v13.6 Strategy Performance & Self-Evaluation Test Suite", () => {
  const statsEngine = new StrategyStatsEngineV136();
  const evaluator = new StrategySelfEvaluatorV136();

  test("1. StrategyStatsEngine: Calculates accurate win rate, profit factor, and expectancy R", () => {
    const trades: TradeRecordV136[] = [
      {
        tradeId: "t1",
        strategyId: "ORB_BREAKOUT",
        symbol: "005930",
        market: "KOREA",
        regime: "TREND",
        timeWindow: "OPEN",
        entryPrice: 70000,
        exitPrice: 72000,
        qty: 10,
        pnl: 20000,
        returnPct: 2.85,
        riskAmount: 10000,
        realizedR: 2.0,
        slippageBp: 5,
        holdTimeMinutes: 15,
        entryTimestamp: Date.now() - 3600000,
        exitTimestamp: Date.now() - 2700000
      },
      {
        tradeId: "t2",
        strategyId: "ORB_BREAKOUT",
        symbol: "005930",
        market: "KOREA",
        regime: "TREND",
        timeWindow: "OPEN",
        entryPrice: 72000,
        exitPrice: 71000,
        qty: 10,
        pnl: -10000,
        returnPct: -1.38,
        riskAmount: 10000,
        realizedR: -1.0,
        slippageBp: 8,
        holdTimeMinutes: 10,
        entryTimestamp: Date.now() - 2600000,
        exitTimestamp: Date.now() - 2000000
      }
    ];

    const metrics = statsEngine.calculateMetrics("ORB_BREAKOUT", trades);
    assert.strictEqual(metrics.totalTrades, 2);
    assert.strictEqual(metrics.winningTrades, 1);
    assert.strictEqual(metrics.losingTrades, 1);
    assert.strictEqual(metrics.winRatePct, 50.0);
    assert.strictEqual(metrics.profitFactor, 2.0); // 20000 / 10000 = 2.0
    assert.strictEqual(metrics.expectancyR, 0.5); // (0.5 * 2.0) - (0.5 * 1.0) = 0.5
  });

  test("2. StrategySelfEvaluator: Evaluates PROMOTE for outstanding strategy metrics", () => {
    const trades: TradeRecordV136[] = Array.from({ length: 20 }, (_, i) => ({
      tradeId: `t-${i}`,
      strategyId: "VWAP_PULLBACK",
      symbol: "NVDA",
      market: "US",
      regime: "TREND",
      timeWindow: "OPEN",
      entryPrice: 100,
      exitPrice: i % 4 === 0 ? 98 : 105, // 75% win rate
      qty: 10,
      pnl: i % 4 === 0 ? -200 : 500,
      returnPct: i % 4 === 0 ? -2.0 : 5.0,
      riskAmount: 200,
      realizedR: i % 4 === 0 ? -1.0 : 2.5,
      slippageBp: 4,
      holdTimeMinutes: 20,
      entryTimestamp: Date.now() - i * 10000,
      exitTimestamp: Date.now() - i * 10000 + 5000
    }));

    const result = evaluator.evaluate("VWAP_PULLBACK", trades);
    assert.strictEqual(result.grade, "PROMOTE");
    assert.strictEqual(result.suggestedSizeMultiplier, 1.25);
    assert.ok(result.recommendationReason.includes("Exceptional performance"));
  });

  test("3. StrategySelfEvaluator: Evaluates DISABLE for negative expectancy or excessive drawdown", () => {
    const trades: TradeRecordV136[] = Array.from({ length: 10 }, (_, i) => ({
      tradeId: `t-${i}`,
      strategyId: "FAILED_STRATEGY",
      symbol: "000660",
      market: "KOREA",
      regime: "RANGE",
      timeWindow: "MID",
      entryPrice: 100,
      exitPrice: 90, // Loss on every trade
      qty: 10,
      pnl: -1000,
      returnPct: -10.0,
      riskAmount: 500,
      realizedR: -2.0,
      slippageBp: 15,
      holdTimeMinutes: 30,
      entryTimestamp: Date.now() - i * 10000,
      exitTimestamp: Date.now() - i * 10000 + 5000
    }));

    const result = evaluator.evaluate("FAILED_STRATEGY", trades);
    assert.strictEqual(result.grade, "DISABLE");
    assert.strictEqual(result.suggestedSizeMultiplier, 0.0);
    assert.ok(result.recommendationReason.includes("disabled for live execution"));
  });
});
