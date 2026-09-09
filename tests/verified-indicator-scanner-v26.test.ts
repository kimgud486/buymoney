import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildVerifiedSignalCandidateV26,
  computeAdxWilderV26,
  computeAtrWilderV26,
  computeRsiWilderV26,
  computeRvolV26,
  verifyCandleBatchV26,
  VerifiedCandleBatchV26,
  VerifiedCandleV26,
} from "../server/scanner/VerifiedIndicatorEngineV26";
import { VerifiedYesOnlyScannerServiceV26 } from "../server/scanner/VerifiedYesOnlyScannerServiceV26";

function makeVerifiedCandles(now: number): VerifiedCandleV26[] {
  const candles: VerifiedCandleV26[] = [];
  let close = 100;
  const start = now - 60 * 60_000;

  for (let i = 0; i < 60; i += 1) {
    const open = close;
    const delta = 0.2 + 1.6 * Math.sin(i * 0.7);
    close = open + delta;
    const high = Math.max(open, close) + 0.4 + 0.3 * Math.abs(Math.sin(i * 0.37));
    const low = Math.min(open, close) - 0.4 - 0.3 * Math.abs(Math.cos(i * 0.41));
    candles.push({ timestamp: start + i * 60_000, open, high, low, close, volume: 1_000 });
  }

  const open = close;
  close = open + 1.2;
  candles.push({
    timestamp: now,
    open,
    high: close + 0.5,
    low: open - 0.5,
    close,
    volume: 2_500,
  });
  return candles;
}

function makeBatch(now = Date.now()): VerifiedCandleBatchV26 {
  return {
    symbol: "005930",
    name: "삼성전자",
    market: "KOREA",
    source: "KIS_VERIFIED_TEST_FEED",
    receivedAt: now,
    candles: makeVerifiedCandles(now),
  };
}

test("valid provider candle batch passes structural and freshness checks", () => {
  const now = Date.now();
  const result = verifyCandleBatchV26(makeBatch(now), { now, maxLastBarAgeMs: 5_000 });
  assert.equal(result.verified, true);
  assert.deepEqual(result.reasons, []);
});

test("stale or malformed candles are blocked", () => {
  const now = Date.now();
  const stale = makeBatch(now - 60_000);
  const staleResult = verifyCandleBatchV26(stale, { now, maxLastBarAgeMs: 5_000 });
  assert.equal(staleResult.verified, false);
  assert.ok(staleResult.reasons.includes("LAST_BAR_STALE"));

  const malformed = makeBatch(now);
  malformed.candles[10] = { ...malformed.candles[10], high: malformed.candles[10].low - 1 };
  const malformedResult = verifyCandleBatchV26(malformed, { now });
  assert.equal(malformedResult.verified, false);
  assert.ok(malformedResult.reasons.includes("INVALID_HIGH_10"));
});

test("Wilder RSI ATR ADX and RVOL are calculated from candle data", () => {
  const candles = makeVerifiedCandles(Date.now());
  const rsi = computeRsiWilderV26(candles);
  const atr = computeAtrWilderV26(candles);
  const adx = computeAdxWilderV26(candles);
  const rvol = computeRvolV26(candles);

  assert.ok(rsi > 45 && rsi < 70);
  assert.ok(atr > 0);
  assert.ok(adx >= 20 && adx <= 100);
  assert.equal(Number(rvol.toFixed(2)), 2.5);
});

test("verified candle batch receives provenance stamp and no synthetic defaults", () => {
  const candidate = buildVerifiedSignalCandidateV26(makeBatch());
  assert.equal(candidate.marketDataVerified, true);
  assert.equal(candidate.indicatorDataVerified, true);
  assert.equal(candidate.dataSource, "KIS_VERIFIED_TEST_FEED");
  assert.ok((candidate.rsi ?? 0) > 0);
  assert.ok((candidate.adx ?? 0) > 0);
  assert.ok((candidate.rvol ?? 0) > 0);
});

test("YES-only service returns only verified ensemble YES candidates", async () => {
  const now = Date.now();
  const service = new VerifiedYesOnlyScannerServiceV26({
    async fetchCandles(item) {
      return { ...makeBatch(now), symbol: item.symbol, name: item.name, market: item.market };
    },
  });

  const result = await service.scan([
    { symbol: "005930", name: "삼성전자", market: "KOREA" },
  ], { maxLastBarAgeMs: 5_000 });

  assert.equal(result.verifiedCount, 1);
  assert.equal(result.yesCount, 1);
  assert.equal(result.topIdeas.length, 1);
  assert.equal(result.topIdeas[0].decision, "YES");
  assert.equal(result.topIdeas[0].marketDataVerified, true);
});

test("market-data adapter failure produces rejection and never fabricates a candidate", async () => {
  const service = new VerifiedYesOnlyScannerServiceV26({
    async fetchCandles() {
      throw new Error("REAL_FEED_UNAVAILABLE");
    },
  });

  const result = await service.scan([
    { symbol: "005930", name: "삼성전자", market: "KOREA" },
  ]);

  assert.equal(result.verifiedCount, 0);
  assert.equal(result.yesCount, 0);
  assert.equal(result.topIdeas.length, 0);
  assert.ok(result.rejected[0].reasons.includes("REAL_FEED_UNAVAILABLE"));
});
