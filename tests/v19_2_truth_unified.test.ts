// ----------------------------------------------------------------------
// AISTOCK V19.2 TRUTH UNIFIED INTEGRATION TEST SUITE
// ----------------------------------------------------------------------

import test from "node:test";
import assert from "node:assert/strict";

import { PatternTruthEngineV192 } from "../src/services/PatternTruthEngineV192";
import { scanGlobalRealtimeHotListV192, GlobalRealtimeScannerV192 } from "../src/services/GlobalRealtimeScannerV192";
import { Candle } from "../src/services/StructureBrain";

test("V19.2 PatternTruthEngineV192: Bullish Engulfing Detection with Evidence and Source Indexes", () => {
  const candles: Candle[] = [
    { timestamp: 500, open: 101, high: 102, low: 100, close: 101, volume: 1000 },
    { timestamp: 600, open: 101, high: 102, low: 100, close: 100.5, volume: 1000 },
    { timestamp: 700, open: 100.5, high: 101, low: 99.5, close: 100, volume: 1000 },
    { timestamp: 1000, open: 100, high: 102, low: 98, close: 99, volume: 1000 },
    { timestamp: 2000, open: 98.5, high: 104, low: 98, close: 103, volume: 2500 }, // Engulfing
  ];

  const results = PatternTruthEngineV192.evaluatePatterns(candles);
  assert.ok(results.length > 0);

  const engulfing = results.find(p => p.patternId === "BULLISH_ENGULFING");
  assert.ok(engulfing);
  assert.equal(engulfing.direction, "BULLISH");
  assert.ok(engulfing.confidence >= 70);
  assert.deepEqual(engulfing.sourceIndexes, [3, 4]);
  assert.ok(engulfing.evidence.length > 0);
});

test("V19.2 PatternTruthEngineV192: VWAP Reclaim Detection", () => {
  const candles: Candle[] = [];
  // Build 35 candles below 100, then last candle reclaims above 100
  for (let i = 0; i < 34; i++) {
    candles.push({ timestamp: 1000 * i, open: 90, high: 92, low: 88, close: 91, volume: 1000 });
  }
  candles.push({ timestamp: 35000, open: 91, high: 105, low: 90, close: 102, volume: 5000 });

  const results = PatternTruthEngineV192.evaluatePatterns(candles);
  const vwapReclaim = results.find(p => p.patternId === "VWAP_RECLAIM");
  assert.ok(vwapReclaim);
  assert.equal(vwapReclaim.direction, "BULLISH");
  assert.ok(vwapReclaim.confidence >= 80);
});

test("V19.2 GlobalRealtimeScannerV192: Normalize Market Input (BTC -> UPBIT)", () => {
  assert.equal(GlobalRealtimeScannerV192.normalizeMarketInput("BTC"), "UPBIT");
  assert.equal(GlobalRealtimeScannerV192.normalizeMarketInput("CRYPTO"), "UPBIT");
  assert.equal(GlobalRealtimeScannerV192.normalizeMarketInput("upbit"), "UPBIT");
  assert.equal(GlobalRealtimeScannerV192.normalizeMarketInput("US"), "US");
  assert.equal(GlobalRealtimeScannerV192.normalizeMarketInput("KOREA"), "KOREA");
  assert.equal(GlobalRealtimeScannerV192.normalizeMarketInput("ALL"), "ALL");
});

test("V19.2 GlobalRealtimeScannerV192: Real Total Scanned Count and No Hardcoded 3420", async () => {
  const result = await scanGlobalRealtimeHotListV192({ marketFilter: "ALL" });
  assert.equal(typeof result.scannedTotal, "number");
  assert.notEqual(result.scannedTotal, 3420); // Must NOT be fixed 3420
  assert.ok(result.scannedTotal >= 0);
  assert.equal(typeof result.marketCounts.KOREA, "number");
  assert.equal(typeof result.marketCounts.US, "number");
  assert.equal(typeof result.marketCounts.UPBIT, "number");
});
