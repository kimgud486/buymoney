import assert from "node:assert/strict";
import test from "node:test";
import {
  buildElementaryScanExplanation,
  calculatePatternHistory,
} from "../src/scanner/elementaryScanExplanation";

function candles(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const base = 100 + i * 0.2;
    return {
      time: i,
      open: base,
      high: base + 1.2,
      low: base - 0.8,
      close: base + 0.5,
      volume: 1000 + i * 10,
    };
  });
}

test("pattern history never invents a percentage when there is no detected pattern", () => {
  const stats = calculatePatternHistory(candles(120), "NONE", "NEUTRAL");
  assert.equal(stats.sampleCount, 0);
  assert.equal(stats.hitRate, null);
  assert.equal(stats.recentHitRate, null);
  assert.equal(stats.sufficient, false);
});

test("easy explanation fails closed when completed real candles are insufficient", () => {
  assert.equal(buildElementaryScanExplanation(candles(30), "KOREA"), null);
});

test("pattern history reports insufficient data instead of a fake confidence number", () => {
  const stats = calculatePatternHistory(candles(75), "BULLISH_ENGULFING", "BULLISH", 8, 5);
  assert.equal(stats.sufficient, false);
  assert.equal(stats.hitRate, null);
  assert.match(stats.message, /과거 캔들이 더 모이면|자료가 적어요/);
});
