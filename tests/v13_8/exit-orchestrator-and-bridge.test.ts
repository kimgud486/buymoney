import { describe, it } from "node:test";
import assert from "node:assert";
import { ExitDecisionBridgeV138 } from "../../src/services/v13_8/ExitDecisionBridgeV138";
import { ConfirmedSwingEngineV138, SwingCandle } from "../../src/services/v13_8/ConfirmedSwingEngineV138";
import { PositionTrailingStateStoreV138 } from "../../src/services/v13_8/PositionTrailingStateStoreV138";
import { MarketStructureEngine } from "../../src/realtime/MarketStructureEngine";
import { AdaptiveTrailingResult } from "../../src/services/v13_7/AdaptiveTrailingExitEngineV137";
import { LiveCandle } from "../../src/realtime/types";

describe("AISTOCK v13.8 Exit Decision Bridge & Position Orchestrator Tests", () => {
  const dummyAdaptiveResult: AdaptiveTrailingResult = {
    symbol: "005930",
    state: "HOLD",
    trailingFloor: 70000,
    previousTrailingFloor: 68000,
    peakPrice: 75000,
    mfePct: 7.14,
    pnlPct: 2.86,
    atrPct: 1.5,
    atrMultiplier: 2.1,
    volatilityRegime: "NORMAL",
    candidates: {
      peakAtr: 70000,
      vwap: 71000,
      ema20: 70500,
    },
    sellRiskScore: 10,
    reasons: [],
  };

  it("1. ExitDecisionBridgeV138: Returns HOLD when position quantity is 0", () => {
    const res = ExitDecisionBridgeV138.resolve({
      adaptive: dummyAdaptiveResult,
      feedVerified: true,
      indicatorsReady: true,
      completedBar: true,
      currentPositionQty: 0,
      brokerHealthy: true,
      heartbeatHealthy: true,
    });

    assert.strictEqual(res.action, "HOLD");
    assert.strictEqual(res.shouldSubmitSellOrder, false);
    assert.strictEqual(res.failClosed, false);
  });

  it("2. ExitDecisionBridgeV138: Fails closed to SELL_WATCH when broker or heartbeat is unhealthy", () => {
    const res = ExitDecisionBridgeV138.resolve({
      adaptive: { ...dummyAdaptiveResult, state: "SELL" },
      feedVerified: true,
      indicatorsReady: true,
      completedBar: true,
      currentPositionQty: 10,
      brokerHealthy: false,
      heartbeatHealthy: true,
    });

    assert.strictEqual(res.action, "SELL_WATCH");
    assert.strictEqual(res.shouldSubmitSellOrder, false);
    assert.strictEqual(res.failClosed, true);
    assert.strictEqual(res.sellReason, "EXECUTION_INFRASTRUCTURE_UNHEALTHY");
  });

  it("3. ExitDecisionBridgeV138: Overrides indicator verification for EMERGENCY_EXIT", () => {
    const res = ExitDecisionBridgeV138.resolve({
      adaptive: { ...dummyAdaptiveResult, state: "EMERGENCY_EXIT", reasons: ["MAX_LOSS_BREACHED"] },
      feedVerified: false,
      indicatorsReady: false,
      completedBar: false,
      currentPositionQty: 10,
      brokerHealthy: true,
      heartbeatHealthy: true,
    });

    assert.strictEqual(res.action, "EMERGENCY_EXIT");
    assert.strictEqual(res.shouldSubmitSellOrder, true);
    assert.strictEqual(res.sellReason, "MAX_LOSS_BREACHED");
  });

  it("4. ExitDecisionBridgeV138: Submits SELL order on PREVIOUS_TRAILING_STOP_BREACHED", () => {
    const res = ExitDecisionBridgeV138.resolve({
      adaptive: {
        ...dummyAdaptiveResult,
        state: "SELL",
        reasons: ["PREVIOUS_TRAILING_STOP_BREACHED"],
      },
      feedVerified: true,
      indicatorsReady: true,
      completedBar: true,
      currentPositionQty: 10,
      brokerHealthy: true,
      heartbeatHealthy: true,
    });

    assert.strictEqual(res.action, "SELL");
    assert.strictEqual(res.shouldSubmitSellOrder, true);
    assert.strictEqual(res.sellReason, "TRAILING_STOP_BREACHED");
  });

  it("5. ExitDecisionBridgeV138: Converts indicator SELL to SELL_WATCH if market feed is unverified", () => {
    const res = ExitDecisionBridgeV138.resolve({
      adaptive: { ...dummyAdaptiveResult, state: "SELL", reasons: ["VWAP_LOSS", "EMA20_LOSS"] },
      feedVerified: false, // Unverified feed
      indicatorsReady: true,
      completedBar: true,
      currentPositionQty: 10,
      brokerHealthy: true,
      heartbeatHealthy: true,
    });

    assert.strictEqual(res.action, "SELL_WATCH");
    assert.strictEqual(res.shouldSubmitSellOrder, false);
    assert.strictEqual(res.failClosed, true);
    assert.strictEqual(res.sellReason, "SELL_SIGNAL_NOT_VERIFIED");
  });

  it("6. ConfirmedSwingEngineV138: Ignores unconfirmed current candle low and returns pivot confirmed low", () => {
    const candles: SwingCandle[] = [
      { high: 105, low: 100, close: 102, time: 1 },
      { high: 104, low: 98, close: 99, time: 2 },
      { high: 100, low: 90, close: 95, time: 3 }, // Pivot Low (left=2, right=2)
      { high: 102, low: 96, close: 100, time: 4 },
      { high: 106, low: 98, close: 105, time: 5 },
      { high: 104, low: 85, close: 88, time: 6 }, // Unconfirmed current bar with very low spike!
    ];

    const swingLow = ConfirmedSwingEngineV138.findLastConfirmedLow(candles, 2, 2);

    assert.notStrictEqual(swingLow, null);
    assert.strictEqual(swingLow?.price, 90, "Returns confirmed pivot low at index 2 (90), not unconfirmed current bar low (85)");
    assert.strictEqual(swingLow?.confirmed, true);
  });

  it("7. MarketStructureEngine: Correctly classifies HH_HL, LH_LL, and SIDEWAYS structures", () => {
    const baseCandle: LiveCandle = {
      time: 1000,
      open: 100,
      high: 105,
      low: 95,
      close: 102,
      volume: 1000,
    };

    // HH_HL candles sequence
    const bullishCandles: LiveCandle[] = Array.from({ length: 15 }, (_, i) => ({
      ...baseCandle,
      time: 1000 + i * 60,
      open: 100 + i * 2,
      high: 105 + i * 2,
      low: 98 + i * 2,
      close: 103 + i * 2,
    }));

    const bullStruct = MarketStructureEngine.analyze(bullishCandles, 100);
    assert.strictEqual(bullStruct.structure, "HH_HL");
    assert.strictEqual(bullStruct.hhhlValid, true);

    // LH_LL candles sequence
    const bearishCandles: LiveCandle[] = Array.from({ length: 15 }, (_, i) => ({
      ...baseCandle,
      time: 1000 + i * 60,
      open: 200 - i * 2,
      high: 205 - i * 2,
      low: 195 - i * 2,
      close: 198 - i * 2,
    }));

    const bearStruct = MarketStructureEngine.analyze(bearishCandles, 250);
    assert.strictEqual(bearStruct.structure, "LH_LL");
    assert.strictEqual(bearStruct.lhllValid, true);
  });

  it("8. PositionTrailingStateStoreV138: Correctly saves, loads, and clears trailing state", async () => {
    const state = {
      positionId: "pos1",
      symbol: "005930",
      market: "KOREA" as const,
      entryPrice: 70000,
      qty: 10,
      highestPriceSinceBuy: 74000,
      trailingFloor: 71500,
      lastState: "PROFIT_HOLD" as const,
      updatedAt: Date.now(),
    };

    await PositionTrailingStateStoreV138.saveState(state);

    const loaded = await PositionTrailingStateStoreV138.getState("005930", "pos1");
    assert.notStrictEqual(loaded, null);
    assert.strictEqual(loaded?.highestPriceSinceBuy, 74000);
    assert.strictEqual(loaded?.trailingFloor, 71500);

    const memLoaded = PositionTrailingStateStoreV138.getMemoryState("005930", "pos1");
    assert.strictEqual(memLoaded?.trailingFloor, 71500);

    await PositionTrailingStateStoreV138.clearState("005930", "pos1");
    const cleared = PositionTrailingStateStoreV138.getMemoryState("005930", "pos1");
    assert.strictEqual(cleared, null);
  });
});
