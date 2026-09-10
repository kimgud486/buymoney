import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateLiveOrderReadiness } from "../../server/broker/KISLiveOrderReadiness";

describe("KIS live order readiness", () => {
  it("fails closed when realtime data is not verified", () => {
    const result = validateLiveOrderReadiness({
      intent: { symbol: "005930", market: "KOREA", side: "BUY", orderType: "LIMIT", qty: 1, price: 100000 },
      dataStatus: "NO_DATA",
      brokerConfigured: true,
      lastPrice: 100000,
    });
    assert.equal(result.ready, false);
    assert.ok(result.blockers.some((x) => x.includes("NO_DATA")));
  });

  it("fails closed when KIS live credentials are missing", () => {
    const result = validateLiveOrderReadiness({
      intent: { symbol: "005930", market: "KOREA", side: "BUY", orderType: "MARKET", qty: 1 },
      dataStatus: "REALTIME_VERIFIED",
      brokerConfigured: false,
      lastPrice: 100000,
    });
    assert.equal(result.ready, false);
    assert.ok(result.blockers.some((x) => x.includes("KIS")));
  });

  it("accepts only a structurally valid live-ready intent", () => {
    const result = validateLiveOrderReadiness({
      intent: { symbol: "005930", market: "KOREA", side: "BUY", orderType: "LIMIT", qty: 2, price: 100500 },
      dataStatus: "REALTIME_VERIFIED",
      brokerConfigured: true,
      lastPrice: 100000,
    });
    assert.equal(result.ready, true);
    assert.equal(result.blockers.length, 0);
  });
});
