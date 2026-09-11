import assert from "node:assert/strict";
import test from "node:test";
import { MarketDataIntegrityGate } from "../src/services/MarketDataIntegrityGate";

const candle = (timestamp: number | string, price = 100) => ({
  timestamp,
  open: price,
  high: price + 2,
  low: price - 2,
  close: price + 1,
  volume: 1_000,
});

test("accepts ISO candle timestamps and normalizes them to epoch milliseconds", () => {
  const start = Date.now() - 60 * 60 * 1000;
  const candles = Array.from({ length: 10 }, (_, index) =>
    candle(new Date(start + index * 60_000).toISOString(), 100 + index),
  );

  const result = MarketDataIntegrityGate.verifyCandles(candles);
  assert.equal(result.isVerified, true);
  assert.equal(result.verifiedCandles.length, 10);
  assert.ok(Number.isFinite(result.verifiedCandles[0].timestamp));
  assert.equal(result.verifiedCandles[1].timestamp - result.verifiedCandles[0].timestamp, 60_000);
});

test("normalizes epoch-second candle timestamps to milliseconds", () => {
  const startSeconds = Math.floor((Date.now() - 60 * 60 * 1000) / 1000);
  const candles = Array.from({ length: 10 }, (_, index) =>
    candle(startSeconds + index * 60, 100 + index),
  );

  const result = MarketDataIntegrityGate.verifyCandles(candles);
  assert.equal(result.isVerified, true);
  assert.ok(result.verifiedCandles[0].timestamp > 1_000_000_000_000);
});

test("rejects invalid and duplicate candle timestamps", () => {
  const bad = MarketDataIntegrityGate.verifyCandles([
    candle("not-a-date"),
    candle(Date.now()),
  ]);
  assert.equal(bad.isVerified, false);
  assert.match(bad.errorReason || "", /INVALID_TIMESTAMP/);

  const ts = Date.now() - 60_000;
  const duplicate = MarketDataIntegrityGate.verifyCandles([
    candle(ts),
    candle(ts),
  ]);
  assert.equal(duplicate.isVerified, false);
  assert.match(duplicate.errorReason || "", /OUT_OF_ORDER_OR_DUPLICATE/);
});

test("rejects stale and future quote timestamps explicitly", () => {
  const stale = MarketDataIntegrityGate.verifyQuote({
    symbol: "005930",
    price: 100,
    market: "KOSPI",
    provider: "KIS",
    source: "KIS_REALTIME",
    providerTimestamp: Date.now() - 120_000,
  });
  assert.equal(stale.isVerified, false);
  assert.equal(stale.metadata.verificationReason, "STALE_PROVIDER_TIMESTAMP");

  const future = MarketDataIntegrityGate.verifyQuote({
    symbol: "005930",
    price: 100,
    market: "KOSPI",
    provider: "KIS",
    source: "KIS_REALTIME",
    providerTimestamp: Date.now() + 30_000,
  });
  assert.equal(future.isVerified, false);
  assert.equal(future.metadata.verificationReason, "FUTURE_PROVIDER_TIMESTAMP");
});

test("rejects severely irregular candle cadence using d3 median baseline", () => {
  const start = Date.now() - 4 * 60 * 60 * 1000;
  const timestamps = [
    start,
    start + 60_000,
    start + 120_000,
    start + 180_000,
    start + 240_000,
    start + 300_000,
    start + 10_000_000,
    start + 20_000_000,
    start + 30_000_000,
    start + 40_000_000,
  ];
  const result = MarketDataIntegrityGate.verifyCandles(
    timestamps.map((ts, index) => candle(ts, 100 + index)),
  );
  assert.equal(result.isVerified, false);
  assert.equal(result.errorReason, "IRREGULAR_CANDLE_CADENCE");
});
