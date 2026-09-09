import test from "node:test";
import assert from "node:assert/strict";

import {
  TrueMTFEvidenceV20,
  TrueMTFSnapshotV20,
  TrueMTFSignalGateV20,
  TrueMTFTimeframeV20,
} from "../server/v20/TrueMTFSignalGateV20";
import {
  ServerRealtimeMarketHubV20,
  ServerMarketCandleV204,
} from "../server/v20/ServerRealtimeMarketHubV20";

function makeSnapshot(
  timeframe: TrueMTFTimeframeV20,
  nowMs: number,
  overrides: Partial<TrueMTFSnapshotV20> = {},
): TrueMTFSnapshotV20 {
  const intervalMs = timeframe === "1m"
    ? 60_000
    : timeframe === "3m"
      ? 180_000
      : timeframe === "5m"
        ? 300_000
        : 86_400_000;

  return {
    timeframe,
    dataStatus: "REALTIME_VERIFIED",
    source: timeframe === "D" ? "KIS_REST_DAILY" : "KIS_WS_AGGREGATED",
    lastBarTimestamp: timeframe === "D" ? nowMs - 86_400_000 : nowMs - intervalMs,
    lastTradeTimestamp: timeframe === "D" ? undefined : nowMs - 5_000,
    barIntervalMs: intervalMs,
    close: 110,
    high: 112,
    ema9: 108,
    ema20: 105,
    ema50: 100,
    rsi14: 60,
    macdHist: 1.2,
    rvol: 2.0,
    vwap: 104,
    previousHigh20: 109,
    ...overrides,
  };
}

function makeEvidence(nowMs: number): TrueMTFEvidenceV20 {
  return {
    "1m": makeSnapshot("1m", nowMs),
    "3m": makeSnapshot("3m", nowMs),
    "5m": makeSnapshot("5m", nowMs, {
      // Simulate a 5m candle that started four minutes ago but received a
      // verified real trade five seconds ago.
      lastBarTimestamp: nowMs - 4 * 60_000,
      lastTradeTimestamp: nowMs - 5_000,
    }),
    D: makeSnapshot("D", nowMs),
  };
}

test("V20.4 progressing 5m candle is fresh by lastTradeTimestamp", () => {
  const nowMs = Date.UTC(2026, 8, 10, 1, 0, 0);
  const result = TrueMTFSignalGateV20.evaluate(makeEvidence(nowMs), { nowMs });

  assert.equal(result.passed, true, result.blockers.join(" | "));
  assert.equal(result.blockers.some((x) => x.includes("STALE_LAST_TRADE")), false);
  assert.equal(result.confirmations.some((x) => x.startsWith("5m:LAST_TRADE_FRESH")), true);
});

test("V20.4 truly stale intraday feed cannot pass BUY gate", () => {
  const nowMs = Date.UTC(2026, 8, 10, 1, 0, 0);
  const evidence = makeEvidence(nowMs);
  evidence["5m"] = makeSnapshot("5m", nowMs, {
    lastTradeTimestamp: nowMs - 180_000,
  });

  const result = TrueMTFSignalGateV20.evaluate(evidence, {
    nowMs,
    maxIntradayTradeAgeMs: 120_000,
  });

  assert.equal(result.passed, false);
  assert.equal(result.blockers.some((x) => x.startsWith("5m:STALE_LAST_TRADE")), true);
});

test("V20.4 missing last real trade timestamp cannot pass BUY gate", () => {
  const nowMs = Date.UTC(2026, 8, 10, 1, 0, 0);
  const evidence = makeEvidence(nowMs);
  evidence["3m"] = makeSnapshot("3m", nowMs, { lastTradeTimestamp: undefined });

  const result = TrueMTFSignalGateV20.evaluate(evidence, { nowMs });

  assert.equal(result.passed, false);
  assert.equal(result.blockers.includes("3m:MISSING_LAST_TRADE_TIMESTAMP"), true);
});

test("V20.4 1m to 5m aggregation preserves exact OHLCV and latest trade time", () => {
  const hub = ServerRealtimeMarketHubV20.getInstance();
  const base = Date.UTC(2026, 8, 10, 0, 0, 0);
  const source: ServerMarketCandleV204[] = [
    { timestamp: base, open: 100, high: 102, low: 99, close: 101, volume: 10, lastTradeTimestamp: base + 10_000, source: "KIS_REST" },
    { timestamp: base + 60_000, open: 101, high: 104, low: 100, close: 103, volume: 20, lastTradeTimestamp: base + 70_000, source: "KIS_REST" },
    { timestamp: base + 120_000, open: 103, high: 105, low: 102, close: 104, volume: 30, lastTradeTimestamp: base + 130_000, source: "KIS_REST" },
    { timestamp: base + 180_000, open: 104, high: 106, low: 101, close: 102, volume: 40, lastTradeTimestamp: base + 190_000, source: "KIS_REST" },
    { timestamp: base + 240_000, open: 102, high: 107, low: 101, close: 106, volume: 50, lastTradeTimestamp: base + 250_000, source: "KIS_REST" },
  ];

  const aggregated = hub.aggregateCandles(source, 5);
  assert.equal(aggregated.length, 1);
  assert.deepEqual(
    {
      open: aggregated[0].open,
      high: aggregated[0].high,
      low: aggregated[0].low,
      close: aggregated[0].close,
      volume: aggregated[0].volume,
      lastTradeTimestamp: aggregated[0].lastTradeTimestamp,
    },
    {
      open: 100,
      high: 107,
      low: 99,
      close: 106,
      volume: 150,
      lastTradeTimestamp: base + 250_000,
    },
  );
});

test("V20.4 1m to 3m aggregation creates independent 3m buckets", () => {
  const hub = ServerRealtimeMarketHubV20.getInstance();
  const base = Date.UTC(2026, 8, 10, 0, 0, 0);
  const source: ServerMarketCandleV204[] = Array.from({ length: 6 }, (_, i) => ({
    timestamp: base + i * 60_000,
    open: 100 + i,
    high: 101 + i,
    low: 99 + i,
    close: 100.5 + i,
    volume: 10 + i,
    lastTradeTimestamp: base + i * 60_000 + 30_000,
    source: "KIS_REST" as const,
  }));

  const aggregated = hub.aggregateCandles(source, 3);
  assert.equal(aggregated.length, 2);
  assert.equal(aggregated[0].open, 100);
  assert.equal(aggregated[0].close, 102.5);
  assert.equal(aggregated[1].open, 103);
  assert.equal(aggregated[1].close, 105.5);
  assert.equal(aggregated[1].lastTradeTimestamp, base + 5 * 60_000 + 30_000);
});
