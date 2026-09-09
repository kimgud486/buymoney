import test from "node:test";
import assert from "node:assert/strict";
import {
  FakeDataDetector,
  processRealtimeTick,
  validateBeforeOrder,
  getDataVerificationBadge,
  MarketTick,
} from "../src/market-data/FakeDataDetector";

const makeDetector = () => new FakeDataDetector({
  maxAgeMs: 5000,
  minimumTrustScore: 80,
  requireSource: false,
});

test("FakeDataDetector verifies valid high-trust tick", () => {
  const detector = makeDetector();
  const now = Date.now();
  const tick: MarketTick = {
    symbol: "005930", price: 74200, open: 74000, high: 74500, low: 73800,
    timestamp: now - 500, source: "KIS_REALTIME",
  };
  const res = detector.inspect(tick, now);
  assert.equal(res.status, "VERIFIED");
  assert.equal(res.trusted, true);
  assert.equal(res.liveTradingAllowed, true);
  assert.equal(res.trustScore, 100);
});

test("FakeDataDetector blocks stale market data", () => {
  const detector = makeDetector();
  const now = Date.now();
  const res = detector.inspect({ symbol: "005930", price: 74200, timestamp: now - 10000 }, now);
  assert.equal(res.status, "STALE");
  assert.equal(res.liveTradingAllowed, false);
  assert.ok(res.reasons.some((r) => r.code === "STALE_DATA"));
});

test("FakeDataDetector rejects invalid negative price", () => {
  const detector = makeDetector();
  const now = Date.now();
  const res = detector.inspect({ symbol: "005930", price: -500, timestamp: now }, now);
  assert.equal(res.status, "INVALID");
  assert.equal(res.liveTradingAllowed, false);
});

test("FakeDataDetector detects crossed orderbook", () => {
  const detector = makeDetector();
  const now = Date.now();
  const res = detector.inspect({
    symbol: "005930", price: 74200, bid: 75000, ask: 74000, timestamp: now,
  }, now);
  assert.ok(res.reasons.some((r) => r.code === "CROSSED_ORDERBOOK"));
  assert.ok(res.trustScore < 80);
  assert.equal(res.liveTradingAllowed, false);
});

test("FakeDataDetector detects frozen feed", () => {
  const detector = makeDetector();
  const now = Date.now();
  const tick: MarketTick = {
    symbol: "005930", price: 74200, cumulativeVolume: 100000, timestamp: now,
  };
  for (let i = 0; i < 20; i++) detector.inspect(tick, now + i * 100);
  const frozenRes = detector.inspect(tick, now + 2100);
  assert.equal(frozenRes.status, "FROZEN");
  assert.ok(frozenRes.reasons.some((r) => r.code === "FROZEN_FEED"));
  assert.equal(frozenRes.liveTradingAllowed, false);
});

test("processRealtimeTick blocks untrusted ticks", () => {
  const detector = makeDetector();
  const processRes = processRealtimeTick({ symbol: "005930", price: 0, timestamp: Date.now() }, detector);
  assert.equal(processRes.accepted, false);
  assert.equal(processRes.orderAllowed, false);
});

test("validateBeforeOrder throws when market tick is stale", () => {
  const detector = makeDetector();
  const now = Date.now();
  assert.throws(() => validateBeforeOrder(
    { symbol: "005930", side: "BUY", price: 74200, quantity: 10 },
    { symbol: "005930", price: 74200, timestamp: now - 20000 },
    detector,
  ), /ORDER BLOCKED/);
});

test("getDataVerificationBadge returns SAFE badge for VERIFIED status", () => {
  const badge = getDataVerificationBadge({
    symbol: "005930",
    status: "VERIFIED",
    trusted: true,
    liveTradingAllowed: true,
    trustScore: 95,
    reasons: [],
    checkedAt: Date.now(),
  });
  assert.equal(badge.level, "SAFE");
  assert.match(badge.label, /95/);
});
