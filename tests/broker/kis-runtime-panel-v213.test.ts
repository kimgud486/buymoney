import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildKISRuntimePanel } from "../../server/broker/KISRuntimePanelV213";

const NOW = Date.parse("2026-09-10T02:30:00.000Z");
const FRESH = "2026-09-10T02:29:50.000Z";

describe("KISRuntimePanelV213", () => {
  it("fails closed when exact orderable values are unavailable", () => {
    const panel = buildKISRuntimePanel({
      brokerConfigured: true,
      oauthAuthenticated: true,
      accountSuccess: true,
      accountAsOf: FRESH,
      depositKRW: 10_000_000,
      totalEvalAmt: 12_000_000,
      holdings: [],
      quoteSuccess: true,
      quoteAsOf: FRESH,
      lastPrice: 75_000,
      marketSession: "OPEN",
      symbol: "005930",
      nowMs: NOW,
    });

    assert.equal(panel.connected, true);
    assert.equal(panel.accountTruth.verified, false);
    assert.equal(panel.canSubmitOrder, false);
    assert.ok(panel.blockers.some((x) => x.includes("주문가능금액")));
    assert.ok(panel.blockers.some((x) => x.includes("주문가능수량")));
  });

  it("becomes confirmation-ready only when all live truth fields verify", () => {
    const panel = buildKISRuntimePanel({
      brokerConfigured: true,
      oauthAuthenticated: true,
      accountSuccess: true,
      accountAsOf: FRESH,
      depositKRW: 10_000_000,
      totalEvalAmt: 12_000_000,
      holdings: [],
      quoteSuccess: true,
      quoteAsOf: FRESH,
      lastPrice: 75_000,
      marketSession: "OPEN",
      orderableCash: 10_000_000,
      orderableQty: 100,
      symbol: "005930",
      intent: { symbol: "005930", market: "KOREA", side: "BUY", orderType: "LIMIT", qty: 10, price: 75_000 },
      nowMs: NOW,
    });

    assert.equal(panel.accountTruth.verified, true);
    assert.equal(panel.orderReadiness?.ready, true);
    assert.equal(panel.requiresUserConfirmation, true);
    assert.equal(panel.canSubmitOrder, false);
    assert.deepEqual(panel.blockers, []);
  });

  it("rejects stale account and closed market states", () => {
    const panel = buildKISRuntimePanel({
      brokerConfigured: true,
      oauthAuthenticated: true,
      accountSuccess: true,
      accountAsOf: "2026-09-10T02:20:00.000Z",
      depositKRW: 10_000_000,
      quoteSuccess: true,
      quoteAsOf: FRESH,
      lastPrice: 75_000,
      marketSession: "CLOSED",
      orderableCash: 10_000_000,
      orderableQty: 100,
      nowMs: NOW,
    });

    assert.equal(panel.accountTruth.verified, false);
    assert.equal(panel.requiresUserConfirmation, false);
    assert.ok(panel.blockers.some((x) => x.includes("CLOSED")));
    assert.ok(panel.blockers.some((x) => x.includes("계좌정보")));
  });
});
