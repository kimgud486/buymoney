import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { probeKISDomesticRuntime } from "../../server/broker/KISRuntimeProbeV213";
import { buildKISRuntimePanel } from "../../server/broker/KISRuntimePanelV213";

describe("KIS verified fundamentals runtime bridge", () => {
  it("exposes only the exact fundamentals captured from a live KIS quote response", async () => {
    const nowMs = Date.parse("2026-09-10T02:30:00.000Z");
    let call = 0;
    const fetchImpl = async () => {
      call += 1;
      if (call === 1) {
        return new Response(JSON.stringify({
          rt_cd: "0",
          output: {
            stck_prpr: "75800",
            per: "14.37",
            pbr: "1.28",
            eps: "5276",
            bps: "59218",
          },
        }), { status: 200 });
      }
      return new Response(JSON.stringify({
        rt_cd: "0",
        output: { ord_psbl_cash: "10000000", max_buy_qty: "131" },
      }), { status: 200 });
    };

    const probe = await probeKISDomesticRuntime({
      symbol: "000660",
      token: "token",
      appKey: "key",
      appSecret: "secret",
      accountNo: "12345678",
      nowMs,
      fetchImpl: fetchImpl as typeof fetch,
    });

    const panel = buildKISRuntimePanel({
      brokerConfigured: true,
      oauthAuthenticated: true,
      accountSuccess: true,
      accountAsOf: new Date(nowMs).toISOString(),
      depositKRW: 10_000_000,
      totalEvalAmt: 12_000_000,
      holdings: [],
      quoteSuccess: probe.quoteSuccess,
      quoteAsOf: probe.quoteAsOf,
      lastPrice: probe.lastPrice,
      marketSession: probe.marketSession,
      orderableCash: probe.orderableCash,
      orderableQty: probe.orderableQty,
      symbol: "000660",
      nowMs,
    });

    assert.deepEqual(panel.fundamentals, {
      dataStatus: "REALTIME_VERIFIED",
      source: "KIS_INQUIRE_PRICE",
      symbol: "000660",
      asOf: "2026-09-10T02:30:00.000Z",
      per: 14.37,
      pbr: 1.28,
      eps: 5276,
      bps: 59218,
    });
    assert.equal(panel.canSubmitOrder, false);
  });

  it("returns NO_DATA instead of financial defaults when no verified KIS metrics exist", () => {
    const nowMs = Date.parse("2026-09-10T02:40:00.000Z");
    const panel = buildKISRuntimePanel({
      brokerConfigured: false,
      oauthAuthenticated: false,
      accountSuccess: false,
      quoteSuccess: false,
      marketSession: "UNKNOWN",
      symbol: "012345",
      nowMs,
    });

    assert.equal(panel.fundamentals.dataStatus, "NO_DATA");
    assert.equal(panel.fundamentals.source, "KIS_INQUIRE_PRICE");
    assert.equal(panel.fundamentals.symbol, "012345");
    assert.equal(panel.fundamentals.asOf, null);
    assert.equal(panel.fundamentals.per, null);
    assert.equal(panel.fundamentals.pbr, null);
    assert.equal(panel.fundamentals.eps, null);
    assert.equal(panel.fundamentals.bps, null);
    assert.equal(panel.canSubmitOrder, false);
  });
});
