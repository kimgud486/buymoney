import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { LiveAccountRiskGateV252 } from "../server/live/LiveAccountRiskGateV252";

describe("LiveAccountRiskGateV252 Unit Tests", () => {
  it("rejects US LIVE with US_LIVE_RISK_ADAPTER_NOT_READY_V252 fail-closed", () => {
    const res = LiveAccountRiskGateV252.validateOrder({
      symbol: "AAPL",
      side: "BUY",
      quantity: 10,
      estimatedPrice: 220,
      market: "US",
      verifiedCash: 10000,
      verifiedPortfolioValue: 10000,
      verifiedCurrentHoldingQty: 0,
    });

    assert.equal(res.passed, false);
    assert.ok(res.rejectReason?.includes("US_LIVE_RISK_ADAPTER_NOT_READY_V252"));
  });

  it("passes valid KOREA BUY within cash and position weight limits", () => {
    const res = LiveAccountRiskGateV252.validateOrder({
      symbol: "005930",
      side: "BUY",
      quantity: 10,
      estimatedPrice: 70000,
      market: "KOREA",
      verifiedCash: 10000000,
      verifiedPortfolioValue: 10000000,
      verifiedCurrentHoldingQty: 0,
      maxPositionWeightPct: 20,
    });

    assert.equal(res.passed, true);
    assert.ok(Math.abs((res.projectedPositionWeightPct ?? 0) - 7.0) < 0.0001);
  });

  it("rejects KOREA BUY when order exceeds verified cash", () => {
    const res = LiveAccountRiskGateV252.validateOrder({
      symbol: "005930",
      side: "BUY",
      quantity: 100,
      estimatedPrice: 70000,
      market: "KOREA",
      verifiedCash: 1000000,
      verifiedPortfolioValue: 10000000,
      verifiedCurrentHoldingQty: 0,
    });

    assert.equal(res.passed, false);
    assert.ok(res.rejectReason?.includes("INSUFFICIENT_VERIFIED_CASH"));
  });

  it("rejects BUY when projected position weight exceeds max weight limit", () => {
    const res = LiveAccountRiskGateV252.validateOrder({
      symbol: "005930",
      side: "BUY",
      quantity: 50,
      estimatedPrice: 70000,
      market: "KOREA",
      verifiedCash: 5000000,
      verifiedPortfolioValue: 10000000,
      verifiedCurrentHoldingQty: 0,
      maxPositionWeightPct: 20,
    });

    assert.equal(res.passed, false);
    assert.ok(res.rejectReason?.includes("EXCEEDS_MAX_POSITION_WEIGHT"));
  });

  it("allows valid SELL up to verified broker holding qty", () => {
    const res = LiveAccountRiskGateV252.validateOrder({
      symbol: "005930",
      side: "SELL",
      quantity: 20,
      estimatedPrice: 74000,
      market: "KOREA",
      verifiedCash: 2000000,
      verifiedPortfolioValue: 10000000,
      verifiedCurrentHoldingQty: 20,
    });

    assert.equal(res.passed, true);
  });

  it("rejects SELL when quantity exceeds verified holding qty", () => {
    const res = LiveAccountRiskGateV252.validateOrder({
      symbol: "005930",
      side: "SELL",
      quantity: 50,
      estimatedPrice: 74000,
      market: "KOREA",
      verifiedCash: 2000000,
      verifiedPortfolioValue: 10000000,
      verifiedCurrentHoldingQty: 20,
    });

    assert.equal(res.passed, false);
    assert.ok(res.rejectReason?.includes("INSUFFICIENT_HOLDING_QTY"));
  });
});
