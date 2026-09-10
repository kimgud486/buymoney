import test from "node:test";
import assert from "node:assert/strict";
import { evaluateLongShortSignal } from "../src/scanner/longShortSignalEngine";

function candles(direction: "up" | "down" | "flat", count = 90) {
  const rows: Array<{ open: number; high: number; low: number; close: number; volume: number; time: number }> = [];
  let price = 100;
  for (let i = 0; i < count; i += 1) {
    const cycle = Math.sin(i / 5) * 0.0015;
    const drift = direction === "up" ? 0.006 : direction === "down" ? -0.006 : cycle;
    const open = price;
    const close = Math.max(1, price * (1 + drift + cycle));
    const high = Math.max(open, close) * 1.002;
    const low = Math.min(open, close) * 0.998;
    const volume = i === count - 2 ? 420_000 : 150_000 + (i % 7) * 5_000;
    rows.push({ open, high, low, close, volume, time: i });
    price = close;
  }
  return rows;
}

test("rising series favors LONG strength", () => {
  const result = evaluateLongShortSignal(candles("up"));
  assert.ok(result);
  assert.ok(result.longStrength > result.shortStrength);
  assert.ok(result.longStrength + result.shortStrength >= 99.9);
  assert.equal(result.direction, "LONG");
});

test("falling series favors SHORT strength", () => {
  const result = evaluateLongShortSignal(candles("down"));
  assert.ok(result);
  assert.ok(result.shortStrength > result.longStrength);
  assert.ok(result.shortStrength + result.longStrength >= 99.9);
  assert.equal(result.direction, "SHORT");
});

test("strength values are evidence shares, always bounded", () => {
  for (const direction of ["up", "down", "flat"] as const) {
    const result = evaluateLongShortSignal(candles(direction));
    assert.ok(result);
    assert.ok(result.longStrength >= 0 && result.longStrength <= 100);
    assert.ok(result.shortStrength >= 0 && result.shortStrength <= 100);
    assert.ok(result.edge >= 0 && result.edge <= 100);
    assert.ok(result.registeredPatterns >= result.evaluatedPatterns);
  }
});

test("insufficient history fails closed", () => {
  assert.equal(evaluateLongShortSignal(candles("up", 30)), null);
});
