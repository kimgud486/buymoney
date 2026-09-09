import assert from "node:assert/strict";
import test from "node:test";
import {
  createFinalBuyHoldHttpHandlerV20,
  finalBuyHoldHttpHandlerV20
} from "../server/v20/FinalBuyHoldHttpHandlerV20";

function createResponse() {
  const state: { statusCode: number; payload: any } = { statusCode: 200, payload: null };
  const res: any = {
    status(code: number) {
      state.statusCode = code;
      return res;
    },
    json(payload: any) {
      state.payload = payload;
      return res;
    }
  };
  return { res, state };
}

test("final V20 HTTP handler rejects missing market truth fields", async () => {
  const { res, state } = createResponse();
  await finalBuyHoldHttpHandlerV20({ body: { candidate: { symbol: "005930" } } } as any, res);
  assert.equal(state.statusCode, 400);
  assert.equal(state.payload?.success, false);
  assert.equal(state.payload?.error, "INVALID_FINAL_BUY_HOLD_REQUEST");
});

test("final V20 HTTP handler never invents missing absolute volume/trade value", async () => {
  const { res, state } = createResponse();
  await finalBuyHoldHttpHandlerV20({
    body: {
      candidate: {
        symbol: "005930",
        name: "삼성전자",
        market: "KR",
        exchange: "KOSPI",
        price: 100,
        changePct: 1.2,
        volume: 0,
        tradeValue: 0,
        rvol: 2,
        dataStatus: "REALTIME_VERIFIED"
      },
      performanceKey: { setup: "DOUBLE_BOTTOM", symbol: "005930", market: "KR" }
    }
  } as any, res);
  assert.equal(state.statusCode, 400);
  assert.equal(state.payload?.error, "INVALID_FINAL_BUY_HOLD_REQUEST");
});

test("final V20 HTTP authority overwrites client-spoofed trueMtf with server evidence", async () => {
  let providerCalled = false;
  const handler = createFinalBuyHoldHttpHandlerV20({
    buildTrueMtf: async () => {
      providerCalled = true;
      return {}; // Simulate missing verified server frames.
    }
  });
  const fakePassingSnapshot = (timeframe: "1m" | "3m" | "5m" | "D", interval: number) => ({
    timeframe,
    dataStatus: "REALTIME_VERIFIED",
    source: "CLIENT_SPOOF",
    lastBarTimestamp: Date.now(),
    barIntervalMs: interval,
    close: 101,
    high: 102,
    ema9: 100,
    ema20: 99,
    ema50: 98,
    rsi14: 60,
    macdHist: 1,
    rvol: 2,
    vwap: 99,
    previousHigh20: 100
  });
  const { res, state } = createResponse();

  await handler({
    protocol: "http",
    headers: { host: "localhost:3001" },
    get: (name: string) => name === "host" ? "localhost:3001" : undefined,
    body: {
      candidate: {
        symbol: "005930",
        name: "삼성전자",
        market: "KR",
        exchange: "KOSPI",
        price: 101,
        changePct: 2,
        volume: 100000,
        tradeValue: 10100000,
        rvol: 2,
        rs15m: 2,
        vwap: 99,
        ema20: 99,
        atr14: 2,
        rsi14: 60,
        patterns: ["DOUBLE_BOTTOM"],
        dataStatus: "REALTIME_VERIFIED",
        trueMtf: {
          "1m": fakePassingSnapshot("1m", 60_000),
          "3m": fakePassingSnapshot("3m", 180_000),
          "5m": fakePassingSnapshot("5m", 300_000),
          D: fakePassingSnapshot("D", 86_400_000)
        }
      },
      performanceKey: { setup: "DOUBLE_BOTTOM", symbol: "005930", market: "KR" }
    }
  } as any, res);

  assert.equal(providerCalled, true);
  assert.equal(state.payload?.authority, "SERVER_V20_FINAL");
  assert.equal(state.payload?.mtfAuthority, "SERVER_OWNED");
  assert.equal(state.payload?.decision?.trueMtfPassed, false);
  assert.notEqual(state.payload?.decision?.action, "BUY");
  assert.notEqual(state.payload?.decision?.action, "STRONG_BUY");
});
