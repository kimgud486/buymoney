import test from "node:test";
import assert from "node:assert/strict";
import { LiveAccountRiskGateV252 } from "../server/live/LiveAccountRiskGateV252";

test("LiveAccountRiskGate rejects US LIVE until native adapter is ready", () => {
  const res = LiveAccountRiskGateV252.validateOrder({
    symbol: "AAPL", side: "BUY", quantity: 10, estimatedPrice: 220, market: "US",
    verifiedCash: 10000, verifiedPortfolioValue: 10000, verifiedCurrentHoldingQty: 0,
  });
  assert.equal(res.passed, false);
  assert.match(res.rejectReason || "", /US_LIVE_RISK_ADAPTER_NOT_READY_V252/);
});

test("LiveAccountRiskGate passes valid KOREA BUY", () => {
  const res = LiveAccountRiskGateV252.validateOrder({
    symbol: "005930", side: "BUY", quantity: 10, estimatedPrice: 70000, market: "KOREA",
    verifiedCash: 10000000, verifiedPortfolioValue: 10000000, verifiedCurrentHoldingQty: 0,
    maxPositionWeightPct: 20,
  });
  assert.equal(res.passed, true);
  assert.ok(Math.abs(res.projectedPositionWeightPct - 7) < 0.001);
});

test("LiveAccountRiskGate rejects BUY exceeding verified cash", () => {
  const res = LiveAccountRiskGateV252.validateOrder({
    symbol: "005930", side: "BUY", quantity: 100, estimatedPrice: 70000, market: "KOREA",
    verifiedCash: 1000000, verifiedPortfolioValue: 10000000, verifiedCurrentHoldingQty: 0,
  });
  assert.equal(res.passed, false);
  assert.match(res.rejectReason || "", /INSUFFICIENT_VERIFIED_CASH/);
});

test("LiveAccountRiskGate rejects projected position over max weight", () => {
  const res = LiveAccountRiskGateV252.validateOrder({
    symbol: "005930", side: "BUY", quantity: 50, estimatedPrice: 70000, market: "KOREA",
    verifiedCash: 5000000, verifiedPortfolioValue: 10000000, verifiedCurrentHoldingQty: 0,
    maxPositionWeightPct: 20,
  });
  assert.equal(res.passed, false);
  assert.match(res.rejectReason || "", /EXCEEDS_MAX_POSITION_WEIGHT/);
});

test("LiveAccountRiskGate allows SELL up to verified holdings", () => {
  const res = LiveAccountRiskGateV252.validateOrder({
    symbol: "005930", side: "SELL", quantity: 20, estimatedPrice: 74000, market: "KOREA",
    verifiedCash: 2000000, verifiedPortfolioValue: 10000000, verifiedCurrentHoldingQty: 20,
  });
  assert.equal(res.passed, true);
});

test("LiveAccountRiskGate rejects SELL above verified holdings", () => {
  const res = LiveAccountRiskGateV252.validateOrder({
    symbol: "005930", side: "SELL", quantity: 50, estimatedPrice: 74000, market: "KOREA",
    verifiedCash: 2000000, verifiedPortfolioValue: 10000000, verifiedCurrentHoldingQty: 20,
  });
  assert.equal(res.passed, false);
  assert.match(res.rejectReason || "", /INSUFFICIENT_HOLDING_QTY/);
});
