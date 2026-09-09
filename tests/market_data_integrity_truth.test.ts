import test from "node:test";
import assert from "node:assert/strict";

import { MarketDataIntegrityGate } from "../src/services/MarketDataIntegrityGate";

const now = Date.now();

function baseQuote() {
  return {
    symbol: "005930",
    price: 70000,
    volume: 1000,
    market: "KOSPI",
    providerTimestamp: now,
    provider: "KIS",
    source: "KIS_REALTIME_WEBSOCKET",
  };
}

test("quote symbol mismatch is rejected", () => {
  const result = MarketDataIntegrityGate.verifyQuote(baseQuote(), "000660");
  assert.equal(result.isVerified, false);
  assert.match(result.metadata.verificationReason, /SYMBOL_MISMATCH/);
});

test("missing provider timestamp cannot be promoted to now", () => {
  const quote = { ...baseQuote(), providerTimestamp: null };
  const result = MarketDataIntegrityGate.verifyQuote(quote, "005930");
  assert.equal(result.isVerified, false);
  assert.equal(result.metadata.verificationReason, "MISSING_PROVIDER_TIMESTAMP");
  assert.equal(result.metadata.providerTimestamp, "");
});

test("missing source is rejected", () => {
  const quote = { ...baseQuote(), source: null };
  const result = MarketDataIntegrityGate.verifyQuote(quote, "005930");
  assert.equal(result.isVerified, false);
  assert.equal(result.metadata.verificationReason, "MISSING_SOURCE");
});

test("unsupported provider is rejected", () => {
  const quote = { ...baseQuote(), provider: "FAKE_PROVIDER" };
  const result = MarketDataIntegrityGate.verifyQuote(quote, "005930");
  assert.equal(result.isVerified, false);
  assert.equal(result.metadata.verificationReason, "MISSING_OR_UNSUPPORTED_PROVIDER");
});

test("invalid candle timestamp is rejected", () => {
  const result = MarketDataIntegrityGate.verifyCandles([
    {
      timestamp: 0,
      open: 100,
      high: 110,
      low: 95,
      close: 105,
      volume: 1000,
    },
  ]);

  assert.equal(result.isVerified, false);
  assert.match(result.errorReason || "", /INVALID_CANDLE_TIMESTAMP/);
});
