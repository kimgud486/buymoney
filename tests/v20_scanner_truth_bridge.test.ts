import test from "node:test";
import assert from "node:assert/strict";

import {
  ServerGlobalRealtimeScannerV20,
  type ScanCandidateInput,
} from "../server/v20/ServerGlobalRealtimeScannerV20";
import {
  hasLegacyProjectedLiquidityV20,
  ScannerCandidateTruthBridgeV20,
} from "../server/v20/ScannerCandidateTruthBridgeV20";
import { serverRealtimeMarketHubV20 } from "../server/v20/ServerRealtimeMarketHubV20";
import type { Candle } from "../src/services/StructureBrain";

function projectedLegacyCandidate(
  symbol: string,
  overrides: Partial<ScanCandidateInput> = {},
): ScanCandidateInput {
  const price = 100;
  const rvol = 2.3;
  return {
    symbol,
    name: symbol,
    market: "US",
    exchange: "NASDAQ",
    price,
    changePct: 4,
    volume: rvol,
    tradeValue: price * rvol,
    rvol,
    rs15m: 82,
    vwap: 98,
    ema9: 99,
    ema20: 97,
    ema50: 95,
    atr14: 2,
    rsi14: 62,
    structureTrend: "BULLISH",
    patterns: ["VWAP_RECLAIM"],
    dataStatus: "REALTIME_VERIFIED",
    ...overrides,
  };
}

test("V20 truth bridge detects the legacy RVOL-as-volume projection", () => {
  const candidate = projectedLegacyCandidate("LEGACY_SIG_ONLY");
  assert.equal(hasLegacyProjectedLiquidityV20(candidate), true);
});

test("V20 rejects projected liquidity when no verified realtime source can repair it", () => {
  const result = ServerGlobalRealtimeScannerV20.evaluateCandidate(
    projectedLegacyCandidate("NO_VERIFIED_LIQUIDITY_SOURCE_9201"),
  );

  assert.equal(result.recommendation, "REJECT");
  assert.equal(result.grade, "REJECT");
  assert.equal(result.rejectionReason, "LIQUIDITY_TRUTH_UNVERIFIED");
  assert.deepEqual(result.missingFields, ["volume", "tradeValue"]);
});

test("V20 repairs only from fresh EXECUTION_GRADE hub liquidity and normalizes KOREA to KR", () => {
  serverRealtimeMarketHubV20.updateQuote(
    "BRIDGE_KR_9202",
    "Bridge Korea",
    "KOREA",
    101,
    2,
    2.02,
    120_000,
    12_120_000,
    "KIS_H0STCNT0",
    "EXECUTION_GRADE",
    101.1,
    100.9,
    50,
  );

  const candidate = projectedLegacyCandidate("BRIDGE_KR_9202", {
    market: "KOREA" as unknown as ScanCandidateInput["market"],
    exchange: "KOSPI",
  });

  const bridged = ScannerCandidateTruthBridgeV20.normalize(candidate);
  assert.equal(bridged.repairedLiquidity, true);
  assert.equal(bridged.rejectionReason, undefined);
  assert.equal(bridged.source, "KIS_H0STCNT0");
  assert.equal(bridged.candidate.market, "KR");
  assert.equal(bridged.candidate.exchange, "KOSPI");
  assert.equal(bridged.candidate.price, 101);
  assert.equal(bridged.candidate.volume, 120_000);
  assert.equal(bridged.candidate.tradeValue, 12_120_000);
  assert.equal(bridged.candidate.liquiditySource, "KIS_H0STCNT0");
  assert.ok((bridged.candidate.spreadBps ?? 0) > 0);

  const evaluated = ServerGlobalRealtimeScannerV20.evaluateCandidate(candidate);
  assert.notEqual(evaluated.rejectionReason, "LIQUIDITY_TRUTH_UNVERIFIED");
  assert.equal(evaluated.volume, 120_000);
  assert.equal(evaluated.tradeValue, 12_120_000);
  // Missing independent True-MTF evidence may remain WATCH, but never becomes
  // BUY merely because the liquidity projection was repaired.
  assert.notEqual(evaluated.recommendation, "BUY_CANDIDATE");
});

test("V20 hub builds a true 3m candle by deterministic aggregation of 1m candles", () => {
  const candles: Candle[] = [
    { timestamp: 180_000, open: 100, high: 102, low: 99, close: 101, volume: 10 },
    { timestamp: 240_000, open: 101, high: 103, low: 100, close: 102, volume: 20 },
    { timestamp: 300_000, open: 102, high: 104, low: 101, close: 103, volume: 30 },
    { timestamp: 360_000, open: 103, high: 105, low: 102, close: 104, volume: 40 },
    { timestamp: 420_000, open: 104, high: 106, low: 103, close: 105, volume: 50 },
    { timestamp: 480_000, open: 105, high: 107, low: 104, close: 106, volume: 60 },
  ];

  serverRealtimeMarketHubV20.setCandles("MTF3_9203", candles);
  const bars3m = serverRealtimeMarketHubV20.getIntradayCandles("MTF3_9203", 3, false);

  assert.equal(bars3m.length, 2);
  assert.deepEqual(bars3m[0], {
    timestamp: 180_000,
    open: 100,
    high: 104,
    low: 99,
    close: 103,
    volume: 60,
  });
  assert.deepEqual(bars3m[1], {
    timestamp: 360_000,
    open: 103,
    high: 107,
    low: 102,
    close: 106,
    volume: 150,
  });
});
