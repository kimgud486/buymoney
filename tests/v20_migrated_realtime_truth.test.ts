import test from "node:test";
import assert from "node:assert/strict";
import { serverRealtimeMarketHubV20 } from "../server/v20/ServerRealtimeMarketHubV20";
import { RealtimeHubCandidateBuilderV20 } from "../server/v20/RealtimeHubCandidateBuilderV20";
import { FinalBuyHoldEngineV20 } from "../server/v20/FinalBuyHoldEngineV20";
import { KISDomesticParserV20 } from "../server/v20/KISDomesticParserV20";

test("migrated V20 builder refuses missing realtime hub data", () => {
  const built = RealtimeHubCandidateBuilderV20.build("NO-SUCH-MIGRATED-SYMBOL");
  assert.equal(built.candidate, null);
  assert.equal(built.telemetry.dataStatus, "NO_DATA");
  assert.equal(built.telemetry.reason, "REALTIME_QUOTE_UNAVAILABLE");
});

test("market hub never converts cumulative quote volume into candle tick volume", () => {
  const symbol = "MIGVOL";
  serverRealtimeMarketHubV20.setCandles(symbol, []);

  serverRealtimeMarketHubV20.updateQuote(
    symbol,
    "Migration Volume Test",
    "US",
    100,
    0,
    0,
    999_999,
    99_999_900,
    "TEST",
    "EXECUTION_GRADE",
    100.01,
    99.99,
  );

  assert.equal(serverRealtimeMarketHubV20.getCandles(symbol).length, 0);

  serverRealtimeMarketHubV20.updateQuote(
    symbol,
    "Migration Volume Test",
    "US",
    100.1,
    0.1,
    0.1,
    1_000_010,
    100_101_001,
    "TEST",
    "EXECUTION_GRADE",
    100.11,
    100.09,
    11,
  );

  const candles = serverRealtimeMarketHubV20.getCandles(symbol);
  assert.equal(candles.length, 1);
  assert.equal(candles[0].volume, 11);
});

test("domestic parser compatibility name resolves to buymoney truth parser", () => {
  const fields = Array.from({ length: 20 }, () => "0");
  fields[0] = "005930";
  fields[1] = "101500";
  fields[2] = "75000";
  fields[4] = "500";
  fields[5] = "0.67";
  fields[10] = "75100";
  fields[11] = "75000";
  fields[12] = "7";
  fields[13] = "123456";
  fields[14] = "9259200000";
  const tick = KISDomesticParserV20.parseH0STCNT0(fields.join("^"));
  assert.ok(tick);
  assert.equal(tick?.symbol, "005930");
  assert.equal(tick?.executedVolume, 7);
  assert.equal(tick?.grade, "EXECUTION_GRADE");
});

test("compat final engine remains signal-only and creates no fallback candidates", () => {
  const empty = FinalBuyHoldEngineV20.evaluate([]);
  assert.equal(empty.mode, "SIGNAL_ONLY");
  assert.equal(empty.humanApprovalRequired, true);
  assert.equal(empty.candidates.length, 0);
  assert.equal(empty.noSignalReason, "NO_SYMBOLS_REQUESTED");

  const missing = FinalBuyHoldEngineV20.evaluate(["NO-SUCH-MIGRATED-SYMBOL"]);
  assert.equal(missing.candidates.length, 0);
  assert.equal(missing.noSignalReason, "NO_REALTIME_QUALIFIED_CANDIDATES");
});
