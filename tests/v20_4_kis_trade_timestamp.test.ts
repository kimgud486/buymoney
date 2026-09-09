import test from "node:test";
import assert from "node:assert/strict";

import {
  KISDomesticTradeParserV20,
  parseKisDomesticTradeTimestamp,
} from "../server/v20/KISDomesticTradeParserV20";

test("V20.4 KIS STCK_CNTG_HOUR is converted from KST instead of Date.now", () => {
  const receivedAt = Date.UTC(2026, 8, 10, 1, 0, 5); // 10:00:05 KST
  const ts = parseKisDomesticTradeTimestamp("095959", receivedAt);
  assert.equal(ts, Date.UTC(2026, 8, 10, 0, 59, 59));
  assert.equal(receivedAt - ts, 6_000);
});

test("V20.4 KIS trade timestamp rejects malformed HHMMSS by falling back to receive time", () => {
  const receivedAt = Date.UTC(2026, 8, 10, 1, 0, 5);
  assert.equal(parseKisDomesticTradeTimestamp("99ABCD", receivedAt), receivedAt);
  assert.equal(parseKisDomesticTradeTimestamp("256199", receivedAt), receivedAt);
});

test("V20.4 H0STCNT0 parser retains provider trade clock and execution volume", () => {
  const fields = new Array(20).fill("");
  fields[0] = "005930";
  fields[1] = "101530";
  fields[2] = "78500";
  fields[4] = "1200";
  fields[5] = "1.55";
  fields[10] = "78500";
  fields[11] = "78400";
  fields[12] = "25";
  fields[13] = "1500000";
  fields[14] = "117000000000";
  fields[18] = "123.5";

  const parsed = KISDomesticTradeParserV20.parseH0STCNT0(fields.join("^"));
  assert.ok(parsed);
  assert.equal(parsed?.symbol, "005930");
  assert.equal(parsed?.tradeTime, "101530");
  assert.equal(parsed?.executedVolume, 25);
  assert.equal(parsed?.totalVolume, 1_500_000);
  assert.equal(parsed?.tradeStrength, 123.5);
  assert.ok((parsed?.timestamp || 0) > 0);
});
