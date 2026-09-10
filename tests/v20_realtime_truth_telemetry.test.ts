import test from "node:test";
import assert from "node:assert/strict";
import { serverRealtimeMarketHubV20 } from "../server/v20/ServerRealtimeMarketHubV20";
import { buildRealtimeTruthTelemetryV20 } from "../server/v20/RealtimeTruthTelemetryV20";

test("V20 telemetry reports missing symbols without fabricated source or timestamps", () => {
  const telemetry = buildRealtimeTruthTelemetryV20("NO-SUCH-V20-SYMBOL");
  assert.equal(telemetry.source, null);
  assert.equal(telemetry.dataGrade, null);
  assert.equal(telemetry.lastTickAt, null);
  assert.equal(telemetry.latencyMs, null);
  assert.equal(telemetry.candleCount, 0);
  assert.equal(telemetry.latestCandleAt, null);
  assert.equal(telemetry.fresh, false);
});

test("V20 telemetry exposes server hub source, tick age and candle count", () => {
  const symbol = "TELEMETRYV20";
  const now = Date.now();
  serverRealtimeMarketHubV20.setCandles(symbol, [
    { timestamp: now - 60_000, open: 100, high: 102, low: 99, close: 101, volume: 10 },
    { timestamp: now, open: 101, high: 103, low: 100, close: 102, volume: 12 }
  ] as any);

  serverRealtimeMarketHubV20.updateQuote(
    symbol,
    "Telemetry Test",
    "US",
    102,
    1,
    0.99,
    1_000,
    102_000,
    "TEST_REALTIME_SOURCE",
    "EXECUTION_GRADE",
    102.01,
    101.99,
    3
  );

  const telemetry = buildRealtimeTruthTelemetryV20(symbol);
  assert.equal(telemetry.source, "TEST_REALTIME_SOURCE");
  assert.equal(telemetry.dataGrade, "EXECUTION_GRADE");
  assert.ok(telemetry.lastTickAt !== null);
  assert.ok(telemetry.latencyMs !== null && telemetry.latencyMs >= 0);
  assert.ok(telemetry.candleCount >= 2);
  assert.ok(telemetry.latestCandleAt !== null);
  assert.equal(telemetry.fresh, true);
});
