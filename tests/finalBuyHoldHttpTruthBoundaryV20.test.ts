import assert from "node:assert/strict";
import test from "node:test";
import { createFinalBuyHoldHttpHandlerV20 } from "../server/v20/FinalBuyHoldHttpHandlerV20";

function baseRequest() {
  return {
    body: {
      candidate: {
        symbol: "005930",
        name: "CLIENT_FAKE_NAME",
        market: "KR",
        exchange: "KOSPI",
        price: 999999,
        changePct: 99,
        volume: 999999999,
        tradeValue: 999999999999,
        rvol: 9.9,
        vwap: 1,
        ema20: 1,
        atr14: 999,
        rsi14: 99,
        patterns: ["CLIENT_FAKE_PATTERN"],
        dataStatus: "REALTIME_VERIFIED",
        trueMtf: {
          m1: { verified: true },
          m3: { verified: true },
          m5: { verified: true },
          d1: { verified: true }
        }
      },
      performanceKey: { setup: "TEST" },
      currentPrice: 999999
    },
    protocol: "http",
    headers: { host: "localhost:3000" },
    get(name: string) {
      return name.toLowerCase() === "host" ? "localhost:3000" : undefined;
    }
  } as any;
}

function responseRecorder() {
  const state = { statusCode: 200, payload: undefined as any };
  const res = {
    status(code: number) {
      state.statusCode = code;
      return res;
    },
    json(payload: any) {
      state.payload = payload;
      return payload;
    }
  } as any;
  return { res, state };
}

function serverQuote(overrides: Record<string, unknown> = {}) {
  return {
    symbol: "005930",
    name: "삼성전자",
    market: "KOREA",
    price: 72000,
    changeAmount: 800,
    changePct: 1.12,
    volume: 12_000_000,
    tradeValue: 864_000_000_000,
    source: "KIS_WS",
    grade: "EXECUTION_GRADE",
    updatedAt: Date.now(),
    sequence: 10,
    ...overrides
  } as any;
}

function readySignal() {
  return {
    symbol: "005930",
    name: "삼성전자",
    market: "KOREA",
    signal: "BUY_WATCH",
    score: 80,
    grade: "A",
    pattern: "BULLISH_ENGULFING",
    price: 72000,
    entryLow: 71500,
    entryHigh: 72000,
    stop: 70000,
    target1: 75000,
    target2: 77000,
    indicators: {
      ema9: 71800,
      ema20: 71000,
      ema50: 70000,
      rsi14: 61,
      macdHistogram: 12,
      atr14: 900,
      atrPct: 1.25,
      vwap: 71200,
      vwapDistancePct: 1.12,
      rvol20: 2.1
    },
    reasons: [],
    risks: [],
    candleCount: 80,
    dataStatus: "READY",
    updatedAt: Date.now()
  } as any;
}

test("final V20 decision fails closed when server realtime quote is missing", async () => {
  let mtfCalls = 0;
  const handler = createFinalBuyHoldHttpHandlerV20({
    buildTrueMtf: async () => { mtfCalls++; return {}; },
    getQuote: () => null,
    getLatestSignal: () => readySignal()
  });
  const { res, state } = responseRecorder();

  await handler(baseRequest(), res);

  assert.equal(state.statusCode, 503);
  assert.equal(state.payload.error, "SERVER_REALTIME_QUOTE_REQUIRED");
  assert.equal(state.payload.dataStatus, "NO_DATA");
  assert.equal(mtfCalls, 0);
});

test("final V20 decision fails closed when server OHLCV indicators are not ready", async () => {
  const handler = createFinalBuyHoldHttpHandlerV20({
    buildTrueMtf: async () => ({}),
    getQuote: () => serverQuote(),
    getLatestSignal: () => null
  });
  const { res, state } = responseRecorder();

  await handler(baseRequest(), res);

  assert.equal(state.statusCode, 503);
  assert.equal(state.payload.error, "SERVER_INDICATOR_EVIDENCE_REQUIRED");
  assert.equal(state.payload.dataStatus, "NO_DATA");
});

test("client-spoofed quote and indicator values are replaced by server-owned evidence", async () => {
  const handler = createFinalBuyHoldHttpHandlerV20({
    buildTrueMtf: async () => ({}),
    getQuote: () => serverQuote(),
    getLatestSignal: () => readySignal()
  });
  const { res, state } = responseRecorder();

  await handler(baseRequest(), res);

  assert.equal(state.statusCode, 200);
  assert.equal(state.payload.success, true);
  assert.equal(state.payload.quoteAuthority, "SERVER_MARKET_HUB");
  assert.equal(state.payload.indicatorAuthority, "SERVER_UNIFIED_OHLCV_ENGINE");
  assert.equal(state.payload.serverEvidence.price, 72000);
  assert.equal(state.payload.serverEvidence.volume, 12_000_000);
  assert.equal(state.payload.serverEvidence.tradeValue, 864_000_000_000);
  assert.equal(state.payload.serverEvidence.rvol, 2.1);
  assert.equal(state.payload.serverEvidence.rsi14, 61);
  assert.equal(state.payload.serverEvidence.pattern, "BULLISH_ENGULFING");
  assert.notEqual(state.payload.serverEvidence.price, baseRequest().body.candidate.price);
});
