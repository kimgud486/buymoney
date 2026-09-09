import { describe, it, expect, beforeEach } from "vitest";
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
    expect(res.status).toBe("VERIFIED");
    expect(res.trusted).toBe(true);
    expect(res.liveTradingAllowed).toBe(true);
    expect(res.trustScore).toBe(100);
  });

  it("detects stale market data and blocks live trading", () => {
    const now = Date.now();
    const tick: MarketTick = {
      symbol: "005930",
      price: 74200,
      timestamp: now - 10000, // 10s old (maxAge 5s)
    };

    const res = detector.inspect(tick, now);
    expect(res.status).toBe("STALE");
    expect(res.liveTradingAllowed).toBe(false);
    expect(res.reasons.some((r) => r.code === "STALE_DATA")).toBe(true);
  });

  it("detects invalid price out of range and returns INVALID status", () => {
    const now = Date.now();
    const tick: MarketTick = {
      symbol: "005930",
      price: -500, // Negative invalid price
      timestamp: now,
    };

    const res = detector.inspect(tick, now);
    expect(res.status).toBe("INVALID");
    expect(res.liveTradingAllowed).toBe(false);
  });

  it("detects crossed orderbook and abnormal spread", () => {
    const now = Date.now();
    const tick: MarketTick = {
      symbol: "005930",
      price: 74200,
      bid: 75000, // Bid > Ask
      ask: 74000,
      timestamp: now,
    };

    const res = detector.inspect(tick, now);
    expect(res.reasons.some((r) => r.code === "CROSSED_ORDERBOOK")).toBe(true);
    expect(res.trustScore).toBeLessThan(80);
    expect(res.liveTradingAllowed).toBe(false);
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
    expect(frozenRes.status).toBe("FROZEN");
    expect(frozenRes.reasons.some((r) => r.code === "FROZEN_FEED")).toBe(true);
    expect(frozenRes.liveTradingAllowed).toBe(false);
  });

  it("processRealtimeTick blocks untrusted ticks", () => {
    const now = Date.now();
    const tick: MarketTick = {
      symbol: "005930",
      price: 0, // Invalid
      timestamp: now,
    };

    const processRes = processRealtimeTick(tick, detector);
    expect(processRes.accepted).toBe(false);
    expect(processRes.orderAllowed).toBe(false);
  });

  it("validateBeforeOrder throws error when tick is invalid", () => {
    const now = Date.now();
    const tick: MarketTick = {
      symbol: "005930",
      price: 74200,
      timestamp: now - 20000, // Stale
    };

    expect(() =>
      validateBeforeOrder(
        { symbol: "005930", side: "BUY", price: 74200, quantity: 10 },
        tick,
        detector
      )
    ).toThrowError(/ORDER BLOCKED/);
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

    expect(badge.level).toBe("SAFE");
    expect(badge.label).toContain("95");
  });
});
