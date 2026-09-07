// ----------------------------------------------------------------------
// AISTOCK V20 UNIFIED TRUTH ENGINE INTEGRATION TEST SUITE
// ----------------------------------------------------------------------

import test from "node:test";
import assert from "node:assert/strict";

import { PatternTruthEngineV20 } from "../src/services/PatternTruthEngineV20";
import { NetExpectancyEngineV20, TradeRecordV20 } from "../server/v20/NetExpectancyEngineV20";
import { KISOverseasParserV20 } from "../server/v20/KISOverseasParserV20";
import { ServerRealtimeMarketHubV20 } from "../server/v20/ServerRealtimeMarketHubV20";
import { Candle } from "../src/services/StructureBrain";

test("V20 PatternTruthEngineV20: Detects Bullish & Bearish Patterns with Provenance", () => {
  const candles: Candle[] = [];
  for (let i = 0; i < 25; i++) {
    candles.push({ timestamp: 1000 * i, open: 100, high: 102, low: 98, close: 99, volume: 1000 });
  }
  // Bullish Engulfing at current candle
  candles.push({ timestamp: 25000, open: 98, high: 105, low: 97, close: 104, volume: 3000 });

  const patterns = PatternTruthEngineV20.evaluatePatterns(candles);
  assert.ok(patterns.length > 0);

  const engulfing = patterns.find(p => p.patternId === "BULLISH_ENGULFING");
  assert.ok(engulfing);
  assert.equal(engulfing.direction, "BULLISH");
  assert.equal(engulfing.stage, "CONFIRMED");
  assert.ok(engulfing.confidence >= 80);
});

test("V20 NetExpectancyEngineV20: Calculates Net Expectancy with Fees, Taxes, and Slippage", () => {
  const trades: TradeRecordV20[] = [
    {
      id: "t1",
      symbol: "NVDA",
      market: "US",
      setup: "ORB",
      pattern: "BULL_FLAG",
      timeframe: "5m",
      entryPrice: 100,
      exitPrice: 105,
      qty: 10,
      grossPnLAmt: 50,
      grossPnLPct: 5.0,
      feeAmt: 0.5,
      taxAmt: 0,
      slippageAmt: 0.5,
      netPnLAmt: 49,
      netPnLPct: 4.9,
      maePct: 0.2,
      mfePct: 5.2,
      holdingDurationMs: 600000,
      entryTimestamp: 1000,
      exitTimestamp: 601000,
      exitReason: "TP1_REACHED"
    },
    {
      id: "t2",
      symbol: "AAPL",
      market: "US",
      setup: "VWAP_RECLAIM",
      pattern: "HAMMER",
      timeframe: "5m",
      entryPrice: 150,
      exitPrice: 147,
      qty: 10,
      grossPnLAmt: -30,
      grossPnLPct: -2.0,
      feeAmt: 0.5,
      taxAmt: 0,
      slippageAmt: 0.5,
      netPnLAmt: -31,
      netPnLPct: -2.07,
      maePct: 2.1,
      mfePct: 0.5,
      holdingDurationMs: 300000,
      entryTimestamp: 1000,
      exitTimestamp: 301000,
      exitReason: "TRAILING_STOP"
    }
  ];

  const metrics = NetExpectancyEngineV20.calculateNetExpectancy(trades);

  assert.equal(metrics.sampleCount, 2);
  assert.equal(metrics.winCount, 1);
  assert.equal(metrics.lossCount, 1);
  assert.equal(metrics.winRatePct, 50);
  assert.ok(metrics.totalNetPnLAmt > 0);
  assert.ok(metrics.netExpectancyPctPerTrade > 0);
});

test("V20 KISOverseasParserV20: Parses HDFSCNT0 Packet with Entitlement Check", () => {
  const samplePacket = "HDFSCNT0^NVDA^0^20260907^20260907^143000^130.50^2^1.50^1.16^130.45^130.55^500^125000^16312500";

  // Case A: Unentitled (default delayed) -> ANALYSIS_ONLY
  const unentitledTick = KISOverseasParserV20.parseHDFSCNT0(samplePacket, false);
  assert.ok(unentitledTick);
  assert.equal(unentitledTick.symbol, "NVDA");
  assert.equal(unentitledTick.lastPrice, 130.5);
  assert.equal(unentitledTick.grade, "ANALYSIS_ONLY");

  // Case B: Realtime Entitled -> EXECUTION_GRADE
  const entitledTick = KISOverseasParserV20.parseHDFSCNT0(samplePacket, true);
  assert.ok(entitledTick);
  assert.equal(entitledTick.grade, "EXECUTION_GRADE");
});

test("V20 ServerRealtimeMarketHubV20: Quote Registration & Sequence Generation", () => {
  const hub = ServerRealtimeMarketHubV20.getInstance();

  const q = hub.updateQuote(
    "005930",
    "삼성전자",
    "KOREA",
    75000,
    1000,
    1.35,
    50000,
    3750000000,
    "KIS_WS",
    "EXECUTION_GRADE"
  );

  assert.equal(q.symbol, "005930");
  assert.equal(q.price, 75000);
  assert.equal(q.grade, "EXECUTION_GRADE");
  assert.ok(q.sequence > 0);

  const retrieved = hub.getQuote("005930");
  assert.ok(retrieved);
  assert.equal(retrieved.price, 75000);
});
