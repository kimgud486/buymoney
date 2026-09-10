import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateLiveOrderReadiness } from "../../server/broker/KISLiveOrderReadiness";
import { evaluateKISLiveAccountTruth } from "../../server/broker/KISLiveAccountTruthV212";

const NOW = Date.parse("2026-09-10T02:00:00.000Z");

function verifiedAccount(overrides: Record<string, unknown> = {}) {
  return evaluateKISLiveAccountTruth({
    dataStatus: "REALTIME_VERIFIED",
    provider: "KIS",
    brokerConfigured: true,
    authStatus: "AUTHENTICATED",
    marketSession: "OPEN",
    quoteAsOf: "2026-09-10T01:59:55.000Z",
    accountAsOf: "2026-09-10T01:59:55.000Z",
    orderableCash: 1_000_000,
    orderableQty: 10,
    ...overrides,
  }, { nowMs: NOW });
}

describe("KIS live order readiness", () => {
  it("fails closed when realtime data is not verified", () => {
    const result = validateLiveOrderReadiness({
      intent: { symbol: "005930", market: "KOREA", side: "BUY", orderType: "LIMIT", qty: 1, price: 100000 },
      dataStatus: "NO_DATA",
      brokerConfigured: true,
      lastPrice: 100000,
      accountTruth: verifiedAccount(),
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
      accountTruth: verifiedAccount(),
    });
    assert.equal(result.ready, false);
    assert.ok(result.blockers.some((x) => x.includes("KIS")));
  });

  it("fails closed when account truth is absent", () => {
    const result = validateLiveOrderReadiness({
      intent: { symbol: "005930", market: "KOREA", side: "BUY", orderType: "MARKET", qty: 1 },
      dataStatus: "REALTIME_VERIFIED",
      brokerConfigured: true,
      lastPrice: 100000,
    });
    assert.equal(result.ready, false);
    assert.ok(result.blockers.some((x) => x.includes("계좌")));
  });

  it("rejects quantity above real KIS orderable quantity", () => {
    const result = validateLiveOrderReadiness({
      intent: { symbol: "005930", market: "KOREA", side: "SELL", orderType: "MARKET", qty: 11 },
      dataStatus: "REALTIME_VERIFIED",
      brokerConfigured: true,
      lastPrice: 100000,
      accountTruth: verifiedAccount(),
    });
    assert.equal(result.ready, false);
    assert.ok(result.blockers.some((x) => x.includes("주문가능수량")));
  });

  it("rejects buy cost above real KIS orderable cash", () => {
    const result = validateLiveOrderReadiness({
      intent: { symbol: "005930", market: "KOREA", side: "BUY", orderType: "LIMIT", qty: 10, price: 120000 },
      dataStatus: "REALTIME_VERIFIED",
      brokerConfigured: true,
      lastPrice: 100000,
      accountTruth: verifiedAccount(),
    });
    assert.equal(result.ready, false);
    assert.ok(result.blockers.some((x) => x.includes("주문가능금액")));
  });

  it("accepts only a structurally valid verified live-ready intent", () => {
    const result = validateLiveOrderReadiness({
      intent: { symbol: "005930", market: "KOREA", side: "BUY", orderType: "LIMIT", qty: 2, price: 100500 },
      dataStatus: "REALTIME_VERIFIED",
      brokerConfigured: true,
      lastPrice: 100000,
      accountTruth: verifiedAccount(),
    });
    assert.equal(result.ready, true);
    assert.equal(result.accountVerified, true);
    assert.equal(result.blockers.length, 0);
  });
});
