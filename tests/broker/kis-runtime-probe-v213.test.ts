import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { inferKoreaMarketSession, probeKISDomesticRuntime } from "../../server/broker/KISRuntimeProbeV213";

describe("KISRuntimeProbeV213", () => {
  it("identifies Korea regular session from Seoul clock", () => {
    assert.equal(inferKoreaMarketSession(Date.parse("2026-09-10T01:00:00.000Z")), "OPEN");
    assert.equal(inferKoreaMarketSession(Date.parse("2026-09-10T07:00:00.000Z")), "CLOSED");
  });

  it("preserves fail-closed output when quote lookup fails", async () => {
    const fetchImpl = async () => new Response("bad", { status: 500 });
    const result = await probeKISDomesticRuntime({
      symbol: "005930",
      token: "token",
      appKey: "key",
      appSecret: "secret",
      accountNo: "12345678",
      nowMs: Date.parse("2026-09-10T01:00:00.000Z"),
      fetchImpl: fetchImpl as typeof fetch,
    });
    assert.equal(result.quoteSuccess, false);
    assert.equal(result.orderableSuccess, false);
    assert.equal(result.lastPrice, null);
    assert.equal(result.orderableCash, null);
  });

  it("returns verified quote and exact orderable fields from KIS responses", async () => {
    let call = 0;
    const fetchImpl = async () => {
      call += 1;
      if (call === 1) {
        return new Response(JSON.stringify({ rt_cd: "0", output: { stck_prpr: "75000" } }), { status: 200 });
      }
      return new Response(JSON.stringify({ rt_cd: "0", output: { ord_psbl_cash: "10000000", max_buy_qty: "133" } }), { status: 200 });
    };
    const result = await probeKISDomesticRuntime({
      symbol: "005930",
      token: "token",
      appKey: "key",
      appSecret: "secret",
      accountNo: "12345678",
      nowMs: Date.parse("2026-09-10T01:00:00.000Z"),
      fetchImpl: fetchImpl as typeof fetch,
    });
    assert.equal(result.quoteSuccess, true);
    assert.equal(result.lastPrice, 75000);
    assert.equal(result.orderableSuccess, true);
    assert.equal(result.orderableCash, 10000000);
    assert.equal(result.orderableQty, 133);
  });
});
