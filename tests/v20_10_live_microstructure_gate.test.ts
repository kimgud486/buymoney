import test from "node:test";
import assert from "node:assert/strict";

import {
  evaluateLiveMicrostructureV2010,
  marketPhaseV2010,
  spreadBpsFromQuoteV2010,
} from "../server/v20/LiveMicrostructureGateV2010";

test("V20.10 market phase: Korea opening/regular/closing/closed use Asia/Seoul", () => {
  assert.equal(marketPhaseV2010("KR", Date.parse("2026-09-11T00:05:00Z")), "OPENING");
  assert.equal(marketPhaseV2010("KR", Date.parse("2026-09-11T01:00:00Z")), "REGULAR");
  assert.equal(marketPhaseV2010("KR", Date.parse("2026-09-11T06:15:00Z")), "CLOSING");
  assert.equal(marketPhaseV2010("KR", Date.parse("2026-09-11T06:31:00Z")), "CLOSED");
});

test("V20.10 market phase: US uses America/New_York including DST", () => {
  assert.equal(marketPhaseV2010("US", Date.parse("2026-09-11T13:35:00Z")), "OPENING");
  assert.equal(marketPhaseV2010("US", Date.parse("2026-09-11T14:30:00Z")), "REGULAR");
  assert.equal(marketPhaseV2010("US", Date.parse("2026-09-11T19:40:00Z")), "CLOSING");
  assert.equal(marketPhaseV2010("US", Date.parse("2026-09-11T20:01:00Z")), "CLOSED");
});

test("V20.10 market phase: Upbit crypto is continuous", () => {
  assert.equal(marketPhaseV2010("CRYPTO", Date.parse("2026-09-12T04:00:00Z")), "CONTINUOUS");
});

test("V20.10 spread: missing or inverted bid/ask never becomes a neutral synthetic value", () => {
  assert.equal(spreadBpsFromQuoteV2010(100), null);
  assert.equal(spreadBpsFromQuoteV2010(100, 101, 100), null);
  assert.ok((spreadBpsFromQuoteV2010(100, 99.9, 100.1) ?? 0) > 0);
});

test("V20.10 gate: missing live bid/ask fails closed", () => {
  const nowMs = Date.parse("2026-09-11T02:00:00Z");
  const result = evaluateLiveMicrostructureV2010({
    market: "KR",
    price: 100,
    quoteUpdatedAt: nowMs,
    rvol: 2,
    atr14: 1,
    nowMs,
  });
  assert.equal(result.passed, false);
  assert.equal(result.status, "MICROSTRUCTURE_MISSING");
  assert.equal(result.spreadBps, null);
  assert.ok(result.missingFields.includes("bidPrice"));
  assert.ok(result.missingFields.includes("askPrice"));
});

test("V20.10 gate: stale quote blocks promotion even when price fields look good", () => {
  const nowMs = Date.parse("2026-09-11T02:00:00Z");
  const result = evaluateLiveMicrostructureV2010({
    market: "CRYPTO",
    price: 100,
    bidPrice: 99.95,
    askPrice: 100.05,
    quoteUpdatedAt: nowMs - 10_001,
    rvol: 2,
    atr14: 1,
    nowMs,
  });
  assert.equal(result.passed, false);
  assert.equal(result.status, "MICROSTRUCTURE_STALE");
});

test("V20.10 gate: fresh real quote passes only when spread/RVOL/ATR meet market threshold", () => {
  const nowMs = Date.parse("2026-09-11T02:00:00Z");
  const good = evaluateLiveMicrostructureV2010({
    market: "KR",
    price: 100,
    bidPrice: 99.9,
    askPrice: 100.1,
    quoteUpdatedAt: nowMs - 500,
    rvol: 1.5,
    atr14: 0.5,
    nowMs,
  });
  assert.equal(good.passed, true);
  assert.equal(good.status, "PASSED");

  const wide = evaluateLiveMicrostructureV2010({
    market: "KR",
    price: 100,
    bidPrice: 99,
    askPrice: 101,
    quoteUpdatedAt: nowMs,
    rvol: 2,
    atr14: 1,
    nowMs,
  });
  assert.equal(wide.passed, false);
  assert.equal(wide.status, "SPREAD_TOO_WIDE");
});
