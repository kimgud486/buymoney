import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getCachedKISDomesticFundamentals,
  inferKoreaMarketSession,
  probeKISDomesticRuntime,
} from "../../server/broker/KISRuntimeProbeV213";

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

    const fundamentals = getCachedKISDomesticFundamentals(
      "005930",
      Date.parse("2026-09-10T01:00:00.000Z"),
    );
    assert.equal(fundamentals.dataStatus, "NO_DATA");
    assert.equal(fundamentals.per, null);
    assert.equal(fundamentals.pbr, null);
    assert.equal(fundamentals.eps, null);
    assert.equal(fundamentals.bps, null);
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

  it("captures PER PBR EPS BPS only from the verified KIS quote payload", async () => {
    const nowMs = Date.parse("2026-09-10T01:10:00.000Z");
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

    await probeKISDomesticRuntime({
      symbol: "000660",
      token: "token",
      appKey: "key",
      appSecret: "secret",
      accountNo: "12345678",
      nowMs,
      fetchImpl: fetchImpl as typeof fetch,
    });

    const fundamentals = getCachedKISDomesticFundamentals("000660", nowMs);
    assert.equal(fundamentals.dataStatus, "REALTIME_VERIFIED");
    assert.equal(fundamentals.source, "KIS_INQUIRE_PRICE");
    assert.equal(fundamentals.symbol, "000660");
    assert.equal(fundamentals.asOf, "2026-09-10T01:10:00.000Z");
    assert.equal(fundamentals.per, 14.37);
    assert.equal(fundamentals.pbr, 1.28);
    assert.equal(fundamentals.eps, 5276);
    assert.equal(fundamentals.bps, 59218);
  });

  it("keeps missing or zero placeholder fundamentals as NO_DATA", async () => {
    const nowMs = Date.parse("2026-09-10T01:20:00.000Z");
    let call = 0;
    const fetchImpl = async () => {
      call += 1;
      if (call === 1) {
        return new Response(JSON.stringify({
          rt_cd: "0",
          output: { stck_prpr: "215000", per: "0", pbr: "", eps: "0", bps: null },
        }), { status: 200 });
      }
      return new Response(JSON.stringify({
        rt_cd: "0",
        output: { ord_psbl_cash: "10000000", max_buy_qty: "46" },
      }), { status: 200 });
    };

    await probeKISDomesticRuntime({
      symbol: "035420",
      token: "token",
      appKey: "key",
      appSecret: "secret",
      accountNo: "12345678",
      nowMs,
      fetchImpl: fetchImpl as typeof fetch,
    });

    const fundamentals = getCachedKISDomesticFundamentals("035420", nowMs);
    assert.equal(fundamentals.dataStatus, "NO_DATA");
    assert.equal(fundamentals.per, null);
    assert.equal(fundamentals.pbr, null);
    assert.equal(fundamentals.eps, null);
    assert.equal(fundamentals.bps, null);
  });

  it("expires cached fundamentals after the freshness window", async () => {
    const nowMs = Date.parse("2026-09-10T01:30:00.000Z");
    let call = 0;
    const fetchImpl = async () => {
      call += 1;
      if (call === 1) {
        return new Response(JSON.stringify({
          rt_cd: "0",
          output: { stck_prpr: "101000", per: "9.8", pbr: "0.91", eps: "10306", bps: "110989" },
        }), { status: 200 });
      }
      return new Response(JSON.stringify({
        rt_cd: "0",
        output: { ord_psbl_cash: "10000000", max_buy_qty: "99" },
      }), { status: 200 });
    };

    await probeKISDomesticRuntime({
      symbol: "005380",
      token: "token",
      appKey: "key",
      appSecret: "secret",
      accountNo: "12345678",
      nowMs,
      fetchImpl: fetchImpl as typeof fetch,
    });

    assert.equal(getCachedKISDomesticFundamentals("005380", nowMs).dataStatus, "REALTIME_VERIFIED");
    const stale = getCachedKISDomesticFundamentals("005380", nowMs + 60_001);
    assert.equal(stale.dataStatus, "NO_DATA");
    assert.equal(stale.asOf, null);
    assert.equal(stale.per, null);
  });
});
