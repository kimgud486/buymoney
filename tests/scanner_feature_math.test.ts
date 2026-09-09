import test from "node:test";
import assert from "node:assert/strict";

import {
  computeRollingRvol,
  computeSeededEma,
  computeSeededMacd,
  computeSessionVwap,
  computeWilderRsi,
  computeRecursiveRsi,
} from "../src/scanner/ScannerFeatureMath";
import {
  computeEma,
  computeRsi,
} from "../src/scanner/ExplainableOpportunityScannerEngine";

test("shared scanner EMA preserves ExplainableOpportunity public computeEma output", () => {
  const values = [100, 102, 101, 105, 107, 106, 110];
  assert.deepEqual(computeEma(values, 4), computeSeededEma(values, 4));
});

test("shared scanner recursive RSI preserves ExplainableOpportunity public computeRsi output", () => {
  const close = Array.from({ length: 40 }, (_, i) => 100 + i * 0.8 + Math.sin(i) * 2);
  assert.deepEqual(computeRsi(close, 14), computeRecursiveRsi(close, 14));
});

test("Graph and Explainable RSI seed modes remain explicitly distinct", () => {
  const close = Array.from({ length: 40 }, (_, i) => 100 + i * 0.6 + Math.sin(i * 0.7) * 3);
  const graphRsi = computeWilderRsi(close, 14);
  const explainableRsi = computeRecursiveRsi(close, 14);

  assert.equal(graphRsi.length, close.length);
  assert.equal(explainableRsi.length, close.length - 1);
  assert.ok(Number.isFinite(graphRsi[graphRsi.length - 1]));
  assert.ok(Number.isFinite(explainableRsi[explainableRsi.length - 1]));
  assert.notEqual(graphRsi[14], explainableRsi[14]);
});

test("VWAP zero-volume policies preserve each scanner's historical semantics", () => {
  const candles = [
    { open: 10, high: 11, low: 9, close: 10, volume: 0 },
    { open: 10, high: 12, low: 9, close: 11, volume: 0 },
  ];

  assert.deepEqual(computeSessionVwap(candles, "USE_CLOSE"), [10, 11]);
  assert.deepEqual(computeSessionVwap(candles, "EPSILON_DENOMINATOR"), [0, 0]);
});

test("RVOL zero-mean policies preserve GraphShape and Explainable behavior", () => {
  const volume = new Array(20).fill(0);
  const graph = computeRollingRvol(volume, 20, "ONE");
  const explainable = computeRollingRvol(volume, 20, "EPSILON_DENOMINATOR");

  assert.equal(graph[19], 1);
  assert.equal(explainable[19], 0);
});

test("shared seeded MACD is deterministic and internally aligned", () => {
  const close = Array.from({ length: 50 }, (_, i) => 100 + i * 0.5);
  const a = computeSeededMacd(close, 12, 26, 9);
  const b = computeSeededMacd(close, 12, 26, 9);

  assert.deepEqual(a, b);
  assert.equal(a.macd.length, close.length);
  assert.equal(a.signal.length, close.length);
  assert.equal(a.hist.length, close.length);
});
