import test from "node:test";
import assert from "node:assert/strict";

import {
  ServerGlobalRealtimeScannerV20,
  ScanCandidateInput
} from "../server/v20/ServerGlobalRealtimeScannerV20";
import {
  TrueMTFEvidenceV20,
  TrueMTFSnapshotV20,
  TrueMTFTimeframeV20
} from "../server/v20/TrueMTFSignalGateV20";

const INTERVALS: Record<TrueMTFTimeframeV20, number> = {
  "1m": 60_000,
  "3m": 180_000,
  "5m": 300_000,
  D: 86_400_000
};

function makeFrame(
  timeframe: TrueMTFTimeframeV20,
  overrides: Partial<TrueMTFSnapshotV20> = {}
): TrueMTFSnapshotV20 {
  const isDaily = timeframe === "D";
  return {
    timeframe,
    dataStatus: timeframe === "D" ? "REALTIME_DERIVED" : "REALTIME_VERIFIED",
    source: "TEST_VERIFIED_FEED",
    lastBarTimestamp: 1_800_000_000_000,
    barIntervalMs: INTERVALS[timeframe],
    close: isDaily ? 112 : 105,
    high: isDaily ? 113 : 106,
    ema9: isDaily ? 108 : 103,
    ema20: isDaily ? 104 : 101,
    ema50: isDaily ? 98 : 97,
    rsi14: 62,
    macdHist: 1.2,
    rvol: isDaily ? 1.4 : 1.8,
    vwap: isDaily ? undefined : 102,
    previousHigh20: isDaily ? undefined : 104,
    ...overrides
  };
}

function makeBullishMtf(): TrueMTFEvidenceV20 {
  return {
    "1m": makeFrame("1m", { close: 105, high: 106, previousHigh20: 104 }),
    "3m": makeFrame("3m"),
    "5m": makeFrame("5m"),
    D: makeFrame("D")
  };
}

function makeStrongCandidate(
  overrides: Partial<ScanCandidateInput> = {}
): ScanCandidateInput {
  return {
    symbol: "005930",
    name: "삼성전자",
    market: "KR",
    exchange: "KOSPI",
    price: 105,
    openPrice: 101,
    highPrice: 106,
    lowPrice: 100,
    changePct: 4.0,
    volume: 2_000_000,
    tradeValue: 210_000_000,
    rvol: 3.2,
    rs5m: 86,
    rs15m: 84,
    rs1h: 82,
    rs1d: 80,
    vwap: 102,
    ema9: 103,
    ema20: 101,
    ema50: 97,
    atr14: 2.1,
    rsi14: 64,
    spreadBps: 12,
    orderbookImbalance: 0.35,
    signedFlow: 1,
    patterns: ["BULLISH_ENGULFING"],
    structureTrend: "BULLISH",
    isBreakout: true,
    isRetest: true,
    chaseRisk: false,
    exhaustionRisk: false,
    trueMtf: makeBullishMtf(),
    dataStatus: "REALTIME_VERIFIED",
    ...overrides
  };
}

test("V20 True MTF: verified 1m/3m/5m/D can promote a strong candidate to BUY", () => {
  const result = ServerGlobalRealtimeScannerV20.evaluateCandidate(
    makeStrongCandidate()
  );

  assert.equal(result.trueMtfGate.passed, true);
  assert.equal(result.trueMtfGate.hardReject, false);
  assert.equal(result.recommendation, "BUY_CANDIDATE");
  assert.ok(result.setupScore >= 76);
});

test("V20 True MTF: missing Daily evidence blocks BUY even when V20 score is high", () => {
  const mtf = makeBullishMtf();
  delete mtf.D;

  const result = ServerGlobalRealtimeScannerV20.evaluateCandidate(
    makeStrongCandidate({ trueMtf: mtf })
  );

  assert.equal(result.trueMtfGate.passed, false);
  assert.deepEqual(result.trueMtfGate.missingTimeframes, ["D"]);
  assert.equal(result.recommendation, "WATCH");
  assert.ok(result.missingFields.includes("trueMTF:1m+3m+5m+D"));
});

test("V20 True MTF: bearish Daily structure blocks BUY", () => {
  const mtf = makeBullishMtf();
  mtf.D = makeFrame("D", {
    close: 96,
    ema9: 98,
    ema20: 100,
    ema50: 102
  });

  const result = ServerGlobalRealtimeScannerV20.evaluateCandidate(
    makeStrongCandidate({ trueMtf: mtf })
  );

  assert.equal(result.trueMtfGate.passed, false);
  assert.ok(result.trueMtfGate.blockers.includes("D:TREND_NOT_BULLISH"));
  assert.equal(result.recommendation, "WATCH");
});

test("V20 True MTF: 1m wick-only breakout is hard rejected as fake breakout", () => {
  const mtf = makeBullishMtf();
  mtf["1m"] = makeFrame("1m", {
    close: 103.5,
    high: 105.5,
    previousHigh20: 104
  });

  const result = ServerGlobalRealtimeScannerV20.evaluateCandidate(
    makeStrongCandidate({ trueMtf: mtf })
  );

  assert.equal(result.trueMtfGate.hardReject, true);
  assert.equal(result.recommendation, "REJECT");
  assert.match(result.rejectionReason || "", /FAKE_BREAKOUT_CLOSE_REJECT/);
});

test("V20 True MTF: intraday RSI overheat is hard rejected", () => {
  const mtf = makeBullishMtf();
  mtf["3m"] = makeFrame("3m", { rsi14: 84 });

  const result = ServerGlobalRealtimeScannerV20.evaluateCandidate(
    makeStrongCandidate({ trueMtf: mtf })
  );

  assert.equal(result.trueMtfGate.hardReject, true);
  assert.equal(result.recommendation, "REJECT");
  assert.match(result.rejectionReason || "", /RSI_OVERHEAT/);
});

test("V20 True MTF: wrong source interval cannot masquerade as another timeframe", () => {
  const mtf = makeBullishMtf();
  mtf["3m"] = makeFrame("3m", { barIntervalMs: 300_000 });

  const result = ServerGlobalRealtimeScannerV20.evaluateCandidate(
    makeStrongCandidate({ trueMtf: mtf })
  );

  assert.equal(result.trueMtfGate.passed, false);
  assert.ok(
    result.trueMtfGate.blockers.some((reason) =>
      reason.startsWith("3m:INVALID_BAR_INTERVAL")
    )
  );
  assert.equal(result.recommendation, "WATCH");
});

test("V20 YES-only TOP5 never fills missing ranks with WATCH candidates", () => {
  const oneYes = makeStrongCandidate({ symbol: "YES1", name: "YES 1" });
  const missingMtf = makeStrongCandidate({
    symbol: "WATCH1",
    name: "WATCH 1",
    trueMtf: undefined
  });

  const results = ServerGlobalRealtimeScannerV20.scanBuyCandidates(
    [oneYes, missingMtf],
    5
  );

  assert.equal(results.length, 1);
  assert.equal(results[0].symbol, "YES1");
  assert.equal(results[0].recommendation, "BUY_CANDIDATE");
});
