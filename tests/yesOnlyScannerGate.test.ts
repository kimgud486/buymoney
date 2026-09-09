import test from "node:test";
import assert from "node:assert/strict";
import {
  assessCandleDataQuality,
  filterYesOnlyCandidates,
  type CandleRecord,
  type ExplainableTradeIdea,
} from "../src/scanner/ExplainableOpportunityScannerEngine";

function makeCandles(timestampBase: number, syntheticOffset = false): CandleRecord[] {
  const base = syntheticOffset ? timestampBase : Math.floor(timestampBase / 60000) * 60000;
  return Array.from({ length: 30 }, (_, i) => {
    const price = 10000 + i * 50;
    return {
      open: price,
      high: price + 80,
      low: price - 40,
      close: price + 50,
      volume: 10000 + i * 100,
      timestamp: base + i * 60000,
    };
  });
}

function makeIdea(overrides: Partial<ExplainableTradeIdea> = {}): ExplainableTradeIdea {
  return {
    id: "005930-test",
    symbol: "005930",
    name: "삼성전자",
    market: "KOREA",
    score: 90,
    graphScore: 90,
    flowScore: 85,
    riskScore: 10,
    finalScore: 90,
    grade: "S",
    decision: "STRONG_BUY_CANDIDATE",
    price: 10000,
    changePct: 2.1,
    entryLow: 9950,
    entryHigh: 10000,
    stop: 9700,
    target1: 10600,
    target2: 10900,
    rsi: 58,
    rvol: 2.1,
    adx: 30,
    atrPct: 2.5,
    rrRatio: 2,
    pattern: "BULLISH_ENGULFING",
    bullishReasons: ["trend", "volume", "pattern"],
    riskReasons: [],
    thesis: "test",
    invalidation: "stop",
    wouldBuy: true,
    scannedAt: "12:00:00",
    dataQuality: "VALID",
    dataQualityReasons: [],
    graphShapeResult: {
      verdict: "YES",
      blockers: [],
      graphScore: 90,
      flowScore: 85,
      riskScore: 10,
      finalScore: 90,
      reasons: ["trend"],
      patterns: ["BREAKOUT"],
    } as any,
    ...overrides,
  };
}

test("Date.now()-style unaligned synthetic minute candles are rejected", () => {
  const nowWithOffset = Math.floor(Date.now() / 60000) * 60000 + 17321;
  const result = assessCandleDataQuality(makeCandles(nowWithOffset, true));
  assert.equal(result.status, "SYNTHETIC_SUSPECT");
  assert.ok(result.reasons.some((reason) => reason.includes("인공 1분봉")));
});

test("minute-boundary candles with valid OHLC pass integrity checks", () => {
  const result = assessCandleDataQuality(makeCandles(Date.now(), false));
  assert.equal(result.status, "VALID");
});

test("YES ONLY accepts only candidates that pass every hard gate", () => {
  const approved = makeIdea();
  const lowRR = makeIdea({ id: "low-rr", symbol: "000660", rrRatio: 1.2 });
  const fakeData = makeIdea({
    id: "fake-data",
    symbol: "035420",
    dataQuality: "SYNTHETIC_SUSPECT",
    dataQualityReasons: ["synthetic"],
  });
  const graphBlocked = makeIdea({
    id: "graph-blocked",
    symbol: "035720",
    graphShapeResult: {
      verdict: "NO",
      blockers: ["FAKE_BREAKOUT"],
      graphScore: 60,
      reasons: [],
      patterns: [],
    } as any,
  });

  const result = filterYesOnlyCandidates([lowRR, fakeData, graphBlocked, approved], 5, 82);
  assert.equal(result.length, 1);
  assert.equal(result[0].symbol, "005930");
});

test("YES ONLY never pads output to five when fewer than five qualify", () => {
  const result = filterYesOnlyCandidates([makeIdea()], 5, 82);
  assert.equal(result.length, 1);
});
