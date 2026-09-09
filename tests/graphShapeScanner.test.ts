import assert from "node:assert/strict";
import test from "node:test";

import {
  GraphShapeScanner,
  type CandleData,
} from "../src/scanner/GraphShapeScanner";

const scanner = new GraphShapeScanner();

function generateSampleCandles(
  count = 50,
  trend: "UP" | "DOWN" | "SQUEEZE" = "UP",
): CandleData[] {
  const result: CandleData[] = [];
  let price = 10_000;

  for (let i = 0; i < count; i += 1) {
    if (trend === "UP") {
      price += 100 + Math.sin(i) * 20;
    } else if (trend === "DOWN") {
      price -= 100 - Math.sin(i) * 20;
    } else {
      price += Math.sin(i) * 10;
    }

    const open = price - 50;
    const low = price - 60;
    const close = price + 30;
    const high = price + 40;
    const volume = i >= count - 5 ? 100_000 : 20_000;

    result.push({
      open,
      high,
      low,
      close,
      volume,
      timestamp: Date.now() - (count - i) * 60_000,
    });
  }

  return result;
}

test("GraphShapeScanner assigns a strong graph score to a clean uptrend", () => {
  const candles = generateSampleCandles(60, "UP");
  const result = scanner.scan(candles, "005930");

  assert.ok(result.graphScore > 60);
  assert.equal(result.details.emaAligned, true);
});

test("GraphShapeScanner detects fake breakout and rejects it", () => {
  const candles = generateSampleCandles(50, "UP");
  const maxPrevHigh = Math.max(...candles.slice(29, 49).map((candle) => candle.high));

  candles[49] = {
    open: maxPrevHigh - 100,
    high: maxPrevHigh + 500,
    close: maxPrevHigh - 200,
    low: maxPrevHigh - 300,
    volume: 100,
  };

  const result = scanner.scan(candles, "005930");

  assert.equal(result.details.fakeBreakout, true);
  assert.ok(result.blockers.some((blocker) => blocker.includes("FAKE_BREAKOUT")));
  assert.equal(result.verdict, "NO");
});

test("GraphShapeScanner can detect a W-bottom breakout", () => {
  const candles: CandleData[] = [];
  let base = 50_000;

  for (let i = 0; i < 40; i += 1) {
    if (i < 10) base -= 500;
    else if (i < 20) base += 400;
    else if (i < 30) base -= 400;
    else base += 600;

    candles.push({
      open: base - 100,
      high: base + 200,
      low: base - 200,
      close: base + 100,
      volume: 20_000 + i * 1_000,
    });
  }

  const result = scanner.scan(candles, "005930");

  assert.equal(result.details.wBottom, true);
  assert.equal(result.patterns.includes("W_BOTTOM_BREAKOUT"), true);
});
