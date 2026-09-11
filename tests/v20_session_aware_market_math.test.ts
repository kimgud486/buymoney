import test from "node:test";
import assert from "node:assert/strict";

import {
  latestSessionCandlesV20,
  sessionKeyV20,
  sessionVwapV20,
} from "../server/v20/SessionAwareMarketMathV20";
import { UnifiedPatternSignalEngineV20 } from "../server/v20/UnifiedPatternSignalEngineV20";
import type { Candle } from "../src/services/StructureBrain";

function candle(timestamp: number | string, price: number, volume = 100): Candle {
  return {
    timestamp,
    open: price,
    high: price,
    low: price,
    close: price,
    volume,
  };
}

test("V20 session math: Korea session resets on Asia/Seoul calendar day", () => {
  const candles = [
    candle("2026-09-10T14:59:00Z", 10, 10_000), // 23:59 KST, prior day
    candle("2026-09-10T15:00:00Z", 100, 100),   // 00:00 KST, current day
    candle("2026-09-10T15:01:00Z", 110, 300),
  ];

  assert.equal(sessionKeyV20(candles[0].timestamp, "KOREA"), "2026-09-10");
  assert.equal(sessionKeyV20(candles[1].timestamp, "KOREA"), "2026-09-11");

  const latest = latestSessionCandlesV20(candles, "KOREA");
  assert.equal(latest.length, 2);
  assert.equal(latest[0].open, 100);
  assert.equal(sessionVwapV20(candles, "KOREA"), 107.5);
});

test("V20 session math: US uses America/New_York day instead of raw UTC day", () => {
  const sameNyDay = [
    candle("2026-09-11T00:30:00Z", 100, 100), // Sep 10 20:30 New York
    candle("2026-09-11T03:30:00Z", 110, 100), // Sep 10 23:30 New York
  ];

  const latest = latestSessionCandlesV20(sameNyDay, "US");
  assert.equal(latest.length, 2);
  assert.equal(sessionKeyV20(sameNyDay[0].timestamp, "US"), "2026-09-10");
  assert.equal(sessionKeyV20(sameNyDay[1].timestamp, "US"), "2026-09-10");
});

test("V20 session math: Upbit day boundary is 00:00 UTC / 09:00 KST", () => {
  const candles = [
    candle("2026-09-10T23:59:00Z", 50, 5_000),
    candle("2026-09-11T00:00:00Z", 100, 100),
    candle("2026-09-11T00:01:00Z", 120, 100),
  ];

  const latest = latestSessionCandlesV20(candles, "UPBIT");
  assert.equal(latest.length, 2);
  assert.equal(sessionVwapV20(candles, "UPBIT"), 110);
});

test("V20 unified signal engine: prior session cannot contaminate current-session VWAP", () => {
  const candles: Candle[] = [];

  for (let i = 0; i < 55; i++) {
    candles.push(candle(Date.parse("2026-09-10T04:00:00Z") + i * 60_000, 1000, 10_000));
  }
  for (let i = 0; i < 5; i++) {
    candles.push(candle(Date.parse("2026-09-10T15:00:00Z") + i * 60_000, 100, 100));
  }

  const result = UnifiedPatternSignalEngineV20.analyze({
    symbol: "005930",
    name: "session-test",
    market: "KOREA",
    candles,
    lastPrice: 100,
  });

  assert.equal(result.dataStatus, "READY");
  assert.ok(result.indicators);
  assert.equal(result.indicators?.vwap, 100);
});
