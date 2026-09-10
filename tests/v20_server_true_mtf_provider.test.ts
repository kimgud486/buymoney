import assert from "node:assert/strict";
import test from "node:test";
import {
  aggregateOneMinuteToThreeMinuteV20,
  normalizeVerifiedCandlesV20,
  ServerTrueMTFEvidenceProviderV20
} from "../server/v20/ServerTrueMTFEvidenceProviderV20";

function makeCandles(count: number, intervalMs: number, start = 1_800_000_000_000) {
  return Array.from({ length: count }, (_, i) => {
    const base = 100 + i * 0.1;
    return {
      timestamp: start + i * intervalMs,
      open: base,
      high: base + 1,
      low: base - 1,
      close: base + 0.3,
      volume: 1000 + i * 10
    };
  });
}

test("1m bars are aggregated into real 3m OHLCV only in complete groups", () => {
  const start = 1_800_000_000_000 - (1_800_000_000_000 % 180_000);
  const oneMinute = normalizeVerifiedCandlesV20(makeCandles(6, 60_000, start));
  const threeMinute = aggregateOneMinuteToThreeMinuteV20(oneMinute);
  assert.equal(threeMinute.length, 2);
  assert.equal(threeMinute[0].timestamp, start);
  assert.equal(threeMinute[0].open, oneMinute[0].open);
  assert.equal(threeMinute[0].close, oneMinute[2].close);
  assert.equal(threeMinute[0].high, Math.max(...oneMinute.slice(0, 3).map(c => c.high)));
  assert.equal(threeMinute[0].low, Math.min(...oneMinute.slice(0, 3).map(c => c.low)));
  assert.equal(threeMinute[0].volume, oneMinute.slice(0, 3).reduce((s, c) => s + c.volume, 0));
});

test("server provider builds 1m/derived 3m/5m/D evidence from verified candle payloads", async () => {
  const start = 1_800_000_000_000 - (1_800_000_000_000 % 180_000);
  const fakeFetch: typeof fetch = (async (input: any) => {
    const url = new URL(String(input));
    const tf = url.searchParams.get("timeframe");
    const candles = tf === "1m"
      ? makeCandles(210, 60_000, start)
      : tf === "5m"
        ? makeCandles(90, 300_000, start)
        : makeCandles(90, 86_400_000, start);
    return new Response(JSON.stringify({
      dataStatus: "REALTIME_VERIFIED",
      provider: "TEST_VERIFIED_PROVIDER",
      source: "TEST_OHLCV",
      candles
    }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;

  const evidence = await ServerTrueMTFEvidenceProviderV20.build({
    symbol: "005930",
    baseUrl: "http://localhost:3001",
    fetchImpl: fakeFetch
  });

  assert.ok(evidence["1m"]);
  assert.ok(evidence["3m"]);
  assert.ok(evidence["5m"]);
  assert.ok(evidence.D);
  assert.equal(evidence["3m"]?.dataStatus, "REALTIME_DERIVED");
  assert.equal(evidence["3m"]?.barIntervalMs, 180_000);
  assert.match(evidence["3m"]?.source || "", /DERIVED_3M/);
  assert.equal(evidence["1m"]?.dataStatus, "REALTIME_VERIFIED");
});

test("provider omits frames when verified OHLCV history is insufficient", async () => {
  const fakeFetch: typeof fetch = (async () => new Response(JSON.stringify({
    dataStatus: "REALTIME_VERIFIED",
    candles: makeCandles(10, 60_000)
  }), { status: 200, headers: { "content-type": "application/json" } })) as typeof fetch;

  const evidence = await ServerTrueMTFEvidenceProviderV20.build({
    symbol: "005930",
    baseUrl: "http://localhost:3001",
    fetchImpl: fakeFetch
  });
  assert.deepEqual(evidence, {});
});
