import { describe, it } from "node:test";
import assert from "node:assert";
import { AdaptiveTrailingExitEngineV137 } from "../../src/services/v13_7/AdaptiveTrailingExitEngineV137";

describe("AISTOCK v13.7 Adaptive Dynamic Trailing Exit Engine Tests", () => {
  it("1. Monotonic Ratchet Principle: Trailing floor NEVER moves downward when price pulls back", () => {
    // Initial evaluation at entry = 70,000, current = 72,000
    const eval1 = AdaptiveTrailingExitEngineV137.evaluate({
      symbol: "005930",
      entryPrice: 70000,
      currentPrice: 72000,
      highestPriceSinceBuy: 72000,
      previousTrailingFloor: 0,
      atr14: 1000,
      sessionVwap: 71000,
      ema20: 70800,
      structure: "HH_HL",
      rsi14: 65,
      macdHist: 120
    });

    const floor1 = eval1.trailingFloor;
    assert.strictEqual(floor1 > 0, true, "Initial trailing floor should be > 0");

    // Price expands further to 75,000 (New Peak)
    const eval2 = AdaptiveTrailingExitEngineV137.evaluate({
      symbol: "005930",
      entryPrice: 70000,
      currentPrice: 75000,
      highestPriceSinceBuy: 75000,
      previousTrailingFloor: floor1,
      atr14: 1000,
      sessionVwap: 72500,
      ema20: 72000,
      structure: "HH_HL",
      rsi14: 72,
      macdHist: 250
    });

    const floor2 = eval2.trailingFloor;
    assert.strictEqual(floor2 >= floor1, true, "Trailing floor must ratchet UP when price reaches new peak");

    // Price pulls back to 73,000 (Pullback)
    const eval3 = AdaptiveTrailingExitEngineV137.evaluate({
      symbol: "005930",
      entryPrice: 70000,
      currentPrice: 73000,
      highestPriceSinceBuy: 75000, // Peak preserved!
      previousTrailingFloor: floor2,
      atr14: 1200, // Volatility increased
      sessionVwap: 72800,
      ema20: 72200,
      structure: "SIDEWAYS",
      rsi14: 52,
      macdHist: 30
    });

    const floor3 = eval3.trailingFloor;
    assert.strictEqual(floor3 >= floor2, true, "Monotonic Ratchet: Trailing floor must NOT decrease during pullback!");
  });

  it("2. Stop Breach Detection: Triggers SELL state immediately if previous stop floor is breached", () => {
    const previousFloor = 71500;

    const res = AdaptiveTrailingExitEngineV137.evaluate({
      symbol: "005930",
      entryPrice: 70000,
      currentPrice: 71000, // Breached! (71,000 <= 71,500)
      highestPriceSinceBuy: 74000,
      previousTrailingFloor: previousFloor,
      atr14: 1000,
      sessionVwap: 72000,
      ema20: 71800,
      structure: "LH_LL",
      rsi14: 38,
      macdHist: -50
    });

    assert.strictEqual(res.state, "SELL");
    assert.strictEqual(res.reasons.includes("PREVIOUS_TRAILING_STOP_BREACHED"), true);
  });

  it("3. Volatility Regime Adaptation: Higher ATR % expands ATR multiplier", () => {
    // Normal Volatility (< 1.8% ATR)
    const normal = AdaptiveTrailingExitEngineV137.evaluate({
      symbol: "005930",
      entryPrice: 70000,
      currentPrice: 70000,
      highestPriceSinceBuy: 70000,
      previousTrailingFloor: 0,
      atr14: 700, // 1% ATR
      sessionVwap: 70000,
      ema20: 70000,
      structure: "SIDEWAYS",
      rsi14: 50,
      macdHist: 0
    });

    // Extreme Volatility (>= 3.0% ATR)
    const extreme = AdaptiveTrailingExitEngineV137.evaluate({
      symbol: "005930",
      entryPrice: 70000,
      currentPrice: 70000,
      highestPriceSinceBuy: 70000,
      previousTrailingFloor: 0,
      atr14: 2500, // ~3.57% ATR
      sessionVwap: 70000,
      ema20: 70000,
      structure: "SIDEWAYS",
      rsi14: 50,
      macdHist: 0
    });

    assert.strictEqual(normal.volatilityRegime, "NORMAL");
    assert.strictEqual(extreme.volatilityRegime, "EXTREME");
    assert.strictEqual(extreme.atrMultiplier > normal.atrMultiplier, true);
  });
});
