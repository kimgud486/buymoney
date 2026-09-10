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
    assert.equal(panel.liveEnvironmentProof.status, "PROOF_NOT_ESTABLISHED");
    assert.equal(panel.liveEnvironmentProof.evidence.exactOrderabilityVerified, false);
    assert.equal(panel.canSubmitOrder, false);
    assert.ok(panel.blockers.some((x) => x.includes("주문가능금액")));
    assert.ok(panel.blockers.some((x) => x.includes("주문가능수량")));
  });

  it("establishes read-only live environment proof only when all KIS evidence verifies", () => {
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
    assert.equal(panel.liveEnvironmentProof.status, "ESTABLISHED");
    assert.equal(panel.liveEnvironmentProof.checkedAt, "2026-09-10T02:30:00.000Z");
    assert.deepEqual(panel.liveEnvironmentProof.blockers, []);
    assert.equal(panel.liveEnvironmentProof.evidence.oauthAuthenticated, true);
    assert.equal(panel.liveEnvironmentProof.evidence.accountQuerySucceeded, true);
    assert.equal(panel.liveEnvironmentProof.evidence.quoteQuerySucceeded, true);
    assert.equal(panel.liveEnvironmentProof.evidence.marketOpen, true);
    assert.equal(panel.liveEnvironmentProof.evidence.realtimeQuoteVerified, true);
    assert.equal(panel.liveEnvironmentProof.evidence.accountFresh, true);
    assert.equal(panel.liveEnvironmentProof.evidence.exactOrderabilityVerified, true);
    assert.equal(panel.orderReadiness?.ready, true);
    assert.equal(panel.requiresUserConfirmation, true);
    assert.equal(panel.canSubmitOrder, false);
    assert.deepEqual(panel.blockers, []);
  });

  it("rejects stale account and closed market states from live environment proof", () => {
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
    assert.equal(panel.liveEnvironmentProof.status, "PROOF_NOT_ESTABLISHED");
    assert.equal(panel.liveEnvironmentProof.evidence.marketOpen, false);
    assert.equal(panel.liveEnvironmentProof.evidence.accountFresh, false);
    assert.equal(panel.requiresUserConfirmation, false);
    assert.ok(panel.blockers.some((x) => x.includes("CLOSED")));
    assert.ok(panel.blockers.some((x) => x.includes("계좌정보")));
  });

  it("does not establish proof when OAuth or quote evidence is missing", () => {
    const panel = buildKISRuntimePanel({
      brokerConfigured: true,
      oauthAuthenticated: false,
      accountSuccess: false,
      quoteSuccess: false,
      marketSession: "UNKNOWN",
      orderableCash: null,
      orderableQty: null,
      symbol: "005930",
      nowMs: NOW,
    });

    assert.equal(panel.liveEnvironmentProof.status, "PROOF_NOT_ESTABLISHED");
    assert.equal(panel.liveEnvironmentProof.evidence.oauthAuthenticated, false);
    assert.equal(panel.liveEnvironmentProof.evidence.accountQuerySucceeded, false);
    assert.equal(panel.liveEnvironmentProof.evidence.quoteQuerySucceeded, false);
    assert.ok(panel.liveEnvironmentProof.blockers.length > 0);
    assert.equal(panel.canSubmitOrder, false);
  });
});
