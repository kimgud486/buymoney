import assert from "node:assert/strict";
import test from "node:test";

import {
  TrueMTFSignalGateV20,
  type TrueMTFEvidenceV20,
  type TrueMTFSnapshotV20,
  type TrueMTFTimeframeV20,
} from "../server/v20/TrueMTFSignalGateV20";
import { ServerTrueMTFEvidenceProviderV20 } from "../server/v20/ServerTrueMTFEvidenceProviderV20";

const INTERVALS: Record<TrueMTFTimeframeV20, number> = {
  "1m": 60_000,
  "3m": 180_000,
  "5m": 300_000,
  D: 86_400_000,
};

function frame(
  timeframe: TrueMTFTimeframeV20,
  timestamp: number,
  overrides: Partial<TrueMTFSnapshotV20> = {},
): TrueMTFSnapshotV20 {
  const daily = timeframe === "D";
  return {
    timeframe,
    dataStatus: timeframe === "3m" ? "REALTIME_DERIVED" : "REALTIME_VERIFIED",
    source: "V20_9_TEST_FEED",
    lastBarTimestamp: timestamp,
    barIntervalMs: INTERVALS[timeframe],
    close: daily ? 112 : 105,
    high: daily ? 113 : 106,
    ema9: daily ? 108 : 103,
    ema20: daily ? 104 : 101,
    ema50: daily ? 98 : 97,
    rsi14: 62,
    macdHist: 1.2,
    rvol: daily ? 1.4 : 1.8,
    vwap: daily ? undefined : 102,
    previousHigh20: daily ? undefined : 104,
    ...overrides,
  };
}

function bullishEvidence(asOf: number): TrueMTFEvidenceV20 {
  return {
    asOfTimestamp: asOf,
    "1m": frame("1m", asOf - 60_000),
    "3m": frame("3m", asOf - 180_000),
    "5m": frame("5m", asOf - 300_000),
    D: frame("D", asOf - 86_400_000),
  };
}

test("V20.9 True MTF accepts fresh synchronized evidence", () => {
  const asOf = 2_000_000_000_000;
  const result = TrueMTFSignalGateV20.evaluate(bullishEvidence(asOf));

  assert.equal(result.passed, true);
  assert.equal(result.hardReject, false);
  assert.ok(result.confirmations.includes("MTF_FRESH"));
  assert.ok(result.confirmations.some((x) => x.startsWith("MTF_SYNCED:")));
});

test("V20.9 True MTF hard rejects stale 1m evidence", () => {
  const asOf = 2_000_000_000_000;
  const evidence = bullishEvidence(asOf);
  evidence["1m"] = frame("1m", asOf - 4 * 60_000);
  evidence["3m"] = frame("3m", asOf - 3 * 60_000);
  evidence["5m"] = frame("5m", asOf - 5 * 60_000);

  const result = TrueMTFSignalGateV20.evaluate(evidence);

  assert.equal(result.passed, false);
  assert.equal(result.hardReject, true);
  assert.ok(result.blockers.some((x) => x.startsWith("1m:STALE_BAR:")));
});

test("V20.9 True MTF hard rejects desynchronized intraday frames", () => {
  const asOf = 2_000_000_000_000;
  const evidence = bullishEvidence(asOf);
  evidence["5m"] = frame("5m", asOf - 12 * 60_000);

  const result = TrueMTFSignalGateV20.evaluate(evidence);

  assert.equal(result.passed, false);
  assert.equal(result.hardReject, true);
  assert.ok(result.blockers.some((x) => x.startsWith("MTF_DESYNC:")));
});

function candle(timestamp: number, price: number, volume = 1_000) {
  return {
    timestamp,
    open: price,
    high: price,
    low: price,
    close: price,
    volume,
  };
}

test("V20.9 provider uses only the latest Korea session for intraday VWAP", async () => {
  const oneMinuteStart = Date.parse("2026-09-10T12:30:00.000Z"); // 21:30 KST
  const oneMinute = Array.from({ length: 210 }, (_, i) =>
    candle(oneMinuteStart + i * 60_000, i < 150 ? 100 : 200)
  );

  const fiveMinuteStart = Date.parse("2026-09-10T15:00:00.000Z"); // 00:00 KST
  const fiveMinute = Array.from({ length: 90 }, (_, i) =>
    candle(fiveMinuteStart + i * 300_000, 200)
  );

  const dailyStart = Date.parse("2026-06-14T00:00:00.000Z");
  const daily = Array.from({ length: 90 }, (_, i) =>
    candle(dailyStart + i * 86_400_000, 100 + i * 0.1)
  );

  const fakeFetch: typeof fetch = (async (input: any) => {
    const url = new URL(String(input));
    const timeframe = url.searchParams.get("timeframe");
    const candles = timeframe === "1m"
      ? oneMinute
      : timeframe === "5m"
        ? fiveMinute
        : daily;

    return new Response(JSON.stringify({
      dataStatus: "REALTIME_VERIFIED",
      provider: "V20_9_TEST",
      source: "VERIFIED_OHLCV",
      candles,
    }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;

  const evidence = await ServerTrueMTFEvidenceProviderV20.build({
    symbol: "005930",
    market: "KOREA",
    baseUrl: "http://localhost:3001",
    fetchImpl: fakeFetch,
  });

  assert.ok(evidence["1m"]);
  assert.ok(evidence["3m"]);
  assert.equal(evidence["1m"]?.vwap, 200);
  assert.equal(evidence["3m"]?.vwap, 200);
  assert.ok(typeof evidence.asOfTimestamp === "number" && evidence.asOfTimestamp > 0);
});
