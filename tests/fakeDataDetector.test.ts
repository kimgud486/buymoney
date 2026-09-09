import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  FakeDataDetector,
  processRealtimeTick,
  validateBeforeOrder,
  getDataVerificationBadge,
  MarketTick,
} from "../src/market-data/FakeDataDetector";

describe("FakeDataDetector Unit Tests", () => {
  let detector: FakeDataDetector;

  beforeEach(() => {
    detector = new FakeDataDetector({
      maxAgeMs: 5000,
      minimumTrustScore: 80,
      requireSource: false,
    });
  });

  it("verifies a valid market tick with high trust score", () => {
    const now = Date.now();
    const tick: MarketTick = {
      symbol: "005930",
      price: 74200,
      open: 74000,
      high: 74500,
      low: 73800,
      timestamp: now - 500,
      source: "KIS_REALTIME",
    };

    const res = detector.inspect(tick, now);
    assert.equal(res.status, "VERIFIED");
    assert.equal(res.trusted, true);
    assert.equal(res.liveTradingAllowed, true);
    assert.equal(res.trustScore, 100);
  });

  it("detects stale market data and blocks live trading", () => {
    const now = Date.now();
    const tick: MarketTick = {
      symbol: "005930",
      price: 74200,
      timestamp: now - 10000,
    };

    const res = detector.inspect(tick, now);
    assert.equal(res.status, "STALE");
    assert.equal(res.liveTradingAllowed, false);
    assert.equal(res.reasons.some((r) => r.code === "STALE_DATA"), true);
  });

  it("detects invalid price out of range and returns INVALID status", () => {
    const now = Date.now();
    const tick: MarketTick = {
      symbol: "005930",
      price: -500,
      timestamp: now,
    };

    const res = detector.inspect(tick, now);
    assert.equal(res.status, "INVALID");
    assert.equal(res.liveTradingAllowed, false);
  });

  it("detects crossed orderbook and abnormal spread", () => {
    const now = Date.now();
    const tick: MarketTick = {
      symbol: "005930",
      price: 74200,
      bid: 75000,
      ask: 74000,
      timestamp: now,
    };

    const res = detector.inspect(tick, now);
    assert.equal(res.reasons.some((r) => r.code === "CROSSED_ORDERBOOK"), true);
    assert.ok(res.trustScore < 80);
    assert.equal(res.liveTradingAllowed, false);
  });

  it("detects frozen feed when same price and volume repeat beyond limit", () => {
    const now = Date.now();
    const tick: MarketTick = {
      symbol: "005930",
      price: 74200,
      cumulativeVolume: 100000,
      timestamp: now,
    };

    for (let i = 0; i < 20; i++) {
      detector.inspect(tick, now + i * 100);
    }

    const frozenRes = detector.inspect(tick, now + 2100);
    assert.equal(frozenRes.status, "FROZEN");
    assert.equal(frozenRes.reasons.some((r) => r.code === "FROZEN_FEED"), true);
    assert.equal(frozenRes.liveTradingAllowed, false);
  });

  it("processRealtimeTick blocks untrusted ticks", () => {
    const now = Date.now();
    const tick: MarketTick = {
      symbol: "005930",
      price: 0,
      timestamp: now,
    };

    const processRes = processRealtimeTick(tick, detector);
    assert.equal(processRes.accepted, false);
    assert.equal(processRes.orderAllowed, false);
  });

  it("validateBeforeOrder throws error when tick is invalid", () => {
    const now = Date.now();
    const tick: MarketTick = {
      symbol: "005930",
      price: 74200,
      timestamp: now - 20000,
    };

    assert.throws(
      () => validateBeforeOrder(
        { symbol: "005930", side: "BUY", price: 74200, quantity: 10 },
        tick,
        detector,
      ),
      /ORDER BLOCKED/,
    );
  });

  it("getDataVerificationBadge returns SAFE badge for VERIFIED status", () => {
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
    assert.ok(badge.label.includes("95"));
  });
});
