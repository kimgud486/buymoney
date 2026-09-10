import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateKISLiveAccountTruth } from "../../server/broker/KISLiveAccountTruthV212";

const NOW = Date.parse("2026-09-10T02:00:00.000Z");

function baseSnapshot() {
  return {
    dataStatus: "REALTIME_VERIFIED" as const,
    provider: "KIS" as const,
    brokerConfigured: true,
    authStatus: "AUTHENTICATED" as const,
    marketSession: "OPEN" as const,
    quoteAsOf: "2026-09-10T01:59:55.000Z",
    accountAsOf: "2026-09-10T01:59:55.000Z",
    orderableCash: 1_000_000,
    orderableQty: 10,
  };
}

describe("KIS live account truth V21.2", () => {
  it("accepts a fresh authenticated KIS live snapshot", () => {
    const result = evaluateKISLiveAccountTruth(baseSnapshot(), { nowMs: NOW });
    assert.equal(result.verified, true);
    assert.equal(result.blockers.length, 0);
  });

  it("rejects stale quote timestamps", () => {
    const result = evaluateKISLiveAccountTruth({
      ...baseSnapshot(),
      quoteAsOf: "2026-09-10T01:58:00.000Z",
    }, { nowMs: NOW, maxQuoteAgeMs: 30_000 });
    assert.equal(result.verified, false);
    assert.ok(result.blockers.some((x) => x.includes("시세가")));
  });

  it("rejects stale account timestamps", () => {
    const result = evaluateKISLiveAccountTruth({
      ...baseSnapshot(),
      accountAsOf: "2026-09-10T01:58:00.000Z",
    }, { nowMs: NOW, maxAccountAgeMs: 30_000 });
    assert.equal(result.verified, false);
    assert.ok(result.blockers.some((x) => x.includes("계좌정보")));
  });

  it("rejects a closed market session", () => {
    const result = evaluateKISLiveAccountTruth({
      ...baseSnapshot(),
      marketSession: "CLOSED",
    }, { nowMs: NOW });
    assert.equal(result.verified, false);
    assert.ok(result.blockers.some((x) => x.includes("CLOSED")));
  });

  it("rejects unverified broker authentication", () => {
    const result = evaluateKISLiveAccountTruth({
      ...baseSnapshot(),
      authStatus: "AUTH_FAILED",
    }, { nowMs: NOW });
    assert.equal(result.verified, false);
    assert.ok(result.blockers.some((x) => x.includes("AUTH_FAILED")));
  });
});
