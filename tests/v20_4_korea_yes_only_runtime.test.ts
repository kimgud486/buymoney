import test from "node:test";
import assert from "node:assert/strict";

import type { HotListItemV192 } from "../src/services/GlobalRealtimeScannerV192";
import {
  HistoricalSeedResultV204,
  KISHistoricalDataProviderV204,
  VerifiedHistoricalCandleV204,
} from "../server/v20/KISHistoricalDataProviderV204";
import { ServerRealtimeMarketHubV20 } from "../server/v20/ServerRealtimeMarketHubV20";
import { KoreaYesOnlyHotListRuntimeV204 } from "../server/v20/KoreaYesOnlyHotListRuntimeV204";

function discoveryItem(symbol: string): HotListItemV192 {
  return {
    symbol,
    name: `TEST-${symbol}`,
    market: "KOREA",
    exchange: "KOSPI",
    currentPrice: 999_999, // deliberately untrusted discovery price
    priceChange24hPct: 19.9,
    volatilityScore: 80,
    aiMatchScore: 95,
    expectedReturnPct: null,
    planningObjectiveNote: "DISCOVERY_ONLY",
    patternType: "DISCOVERY_ONLY",
    patternName: "KIS 심층검증 대기",
    targetPrice: null,
    stopLoss: null,
    holdingPeriod: "미확정",
    riskRewardRatio: "N/A",
    volumeIncreaseRatio: null,
    rsiIndicator: null,
    reasoning: "DISPLAY_ONLY",
    grade: "S",
    setupScore: 95,
    dataStatus: "NO_DATA",
    evidenceCount: 0,
    evidenceList: ["DISPLAY_ONLY_NOT_FINAL_EVIDENCE"],
    metrics: {
      rvol: null,
      vwap: null,
      ema9: null,
      ema20: null,
      ema50: null,
      rsi14: null,
      atr14: null,
      rs15m: null,
      breakoutConfirmed: null,
      chaseRisk: null,
      exhaustionRisk: null,
      evidenceCoveragePct: 0,
    },
  };
}

function makeIntraday(
  now = Date.now(),
  staleByMs = 0,
): VerifiedHistoricalCandleV204[] {
  const count = 180;
  const base = now - staleByMs - (count - 1) * 60_000;

  return Array.from({ length: count }, (_, i) => {
    let close = 100 + i * 0.03 + 0.25 * Math.sin(i * 0.5 + 1.5);
    if (i === count - 1) close += 0.30; // confirmed close above recent highs
    const timestamp = base + i * 60_000;
    return {
      timestamp,
      lastTradeTimestamp: timestamp,
      open: close - 0.05,
      high: close + 0.12,
      low: close - 0.12,
      close,
      volume: i === count - 1 ? 3_000 : 1_000 + (i % 4) * 10,
      source: "KIS_REST" as const,
      timeframe: "1m" as const,
    };
  });
}

function makeDaily(now = Date.now()): VerifiedHistoricalCandleV204[] {
  const count = 50;
  const base = now - (count - 1) * 86_400_000;
  return Array.from({ length: count }, (_, i) => {
    const close = 103 + i * 0.05 + 0.8 * Math.sin(i * 0.4 + 2.0);
    const timestamp = base + i * 86_400_000;
    return {
      timestamp,
      lastTradeTimestamp: timestamp,
      open: close - 0.15,
      high: close + 0.35,
      low: close - 0.35,
      close,
      volume: i === count - 1 ? 2_000_000 : 1_000_000 + (i % 5) * 10_000,
      source: "KIS_REST" as const,
      timeframe: "D" as const,
    };
  });
}

function result(
  symbol: string,
  timeframe: "1m" | "D",
  candles: VerifiedHistoricalCandleV204[],
  requiredBars: number,
  verified = true,
): HistoricalSeedResultV204 {
  return {
    symbol,
    timeframe,
    status: verified ? "HISTORY_VERIFIED" : "HISTORY_UNVERIFIED",
    requiredBars,
    candles,
    reason: verified ? `TEST_${timeframe}_OK` : `TEST_${timeframe}_UNVERIFIED`,
  };
}

function fakeProvider(options?: { verified?: boolean; staleByMs?: number }): KISHistoricalDataProviderV204 {
  const verified = options?.verified !== false;
  const staleByMs = options?.staleByMs ?? 0;

  return {
    fetchIntraday1m: async (symbol: string, requiredBars = 180) =>
      result(symbol, "1m", verified ? makeIntraday(Date.now(), staleByMs) : [], requiredBars, verified),
    fetchDaily: async (symbol: string, requiredBars = 50) =>
      result(symbol, "D", verified ? makeDaily() : [], requiredBars, verified),
  } as unknown as KISHistoricalDataProviderV204;
}

test("V20.4 discovery price can never become final YES price without KIS revalidation", async () => {
  const symbol = "990001";
  const runtime = new KoreaYesOnlyHotListRuntimeV204(
    fakeProvider(),
    ServerRealtimeMarketHubV20.getInstance(),
    { maxSeedCandidates: 5, topN: 5, historyTtlMs: 0 },
  );

  const out = await runtime.filterYesOnly([discoveryItem(symbol)]);

  assert.equal(out.approved.length, 1, JSON.stringify(out.audit));
  assert.equal(out.approved[0].symbol, symbol);
  assert.equal(out.approved[0].dataStatus, "REALTIME_VERIFIED");
  assert.equal(out.approved[0].patternType, "V20_4_TRUE_MTF");
  assert.notEqual(out.approved[0].currentPrice, 999_999);
  assert.ok(out.approved[0].currentPrice > 100 && out.approved[0].currentPrice < 120);
  assert.ok(out.approved[0].setupScore >= 76);
  assert.match(out.approved[0].reasoning, /V20\.4 YES/);
});

test("V20.4 HISTORY_UNVERIFIED publishes zero YES candidates", async () => {
  const symbol = "990002";
  const runtime = new KoreaYesOnlyHotListRuntimeV204(
    fakeProvider({ verified: false }),
    ServerRealtimeMarketHubV20.getInstance(),
    { maxSeedCandidates: 5, topN: 5, historyTtlMs: 0 },
  );

  const out = await runtime.filterYesOnly([discoveryItem(symbol)]);
  assert.equal(out.approved.length, 0);
  assert.equal(out.audit.length, 1);
  assert.equal(out.audit[0].historyStatus, "HISTORY_UNVERIFIED");
  assert.equal(out.audit[0].verdict, "REJECT");
});

test("V20.4 stale KIS intraday history cannot publish a YES candidate", async () => {
  const symbol = "990003";
  const runtime = new KoreaYesOnlyHotListRuntimeV204(
    fakeProvider({ staleByMs: 5 * 60_000 }),
    ServerRealtimeMarketHubV20.getInstance(),
    { maxSeedCandidates: 5, topN: 5, historyTtlMs: 0 },
  );

  const out = await runtime.filterYesOnly([discoveryItem(symbol)]);
  assert.equal(out.approved.length, 0);
  assert.equal(out.audit[0].verdict, "REJECT");
  assert.ok(
    (out.audit[0].blockers || []).some((reason) => reason.includes("STALE_LAST_TRADE")),
    JSON.stringify(out.audit),
  );
});
