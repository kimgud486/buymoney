import test from "node:test";
import assert from "node:assert/strict";

import {
  ServerGlobalRealtimeScannerV20,
  ScanCandidateInput,
} from "../server/v20/ServerGlobalRealtimeScannerV20";
import {
  TrueMTFEvidenceV20,
  TrueMTFSnapshotV20,
  TrueMTFTimeframeV20,
} from "../server/v20/TrueMTFSignalGateV20";
import {
  CandidateExecutionPortV204,
  SignalDispatchContextV204,
  YesOnlySignalDispatchV204,
} from "../server/v20/YesOnlySignalDispatchV204";
import { DEFAULT_AUTONOMOUS_RISK_POLICY } from "../src/risk/AutonomousRiskPolicy";

const INTERVALS: Record<TrueMTFTimeframeV20, number> = {
  "1m": 60_000,
  "3m": 180_000,
  "5m": 300_000,
  D: 86_400_000,
};

function frame(timeframe: TrueMTFTimeframeV20): TrueMTFSnapshotV20 {
  const now = Date.now();
  const daily = timeframe === "D";
  return {
    timeframe,
    dataStatus: daily ? "REALTIME_DERIVED" : "REALTIME_VERIFIED",
    source: daily ? "KIS_REST_DAILY" : "KIS_WS_AGGREGATED",
    lastBarTimestamp: now - INTERVALS[timeframe],
    lastTradeTimestamp: daily ? undefined : now - 2_000,
    barIntervalMs: INTERVALS[timeframe],
    close: daily ? 112 : 105,
    high: daily ? 113 : 106,
    ema9: daily ? 108 : 103,
    ema20: daily ? 104 : 101,
    ema50: daily ? 98 : 97,
    rsi14: 62,
    macdHist: 1.2,
    rvol: daily ? 1.4 : 2.1,
    vwap: daily ? undefined : 102,
    previousHigh20: daily ? undefined : 104,
  };
}

function mtf(): TrueMTFEvidenceV20 {
  return {
    "1m": frame("1m"),
    "3m": frame("3m"),
    "5m": frame("5m"),
    D: frame("D"),
  };
}

function yesCandidate(spreadBps = 10) {
  const input: ScanCandidateInput = {
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
    spreadBps,
    orderbookImbalance: 0.35,
    signedFlow: 1,
    patterns: ["BULLISH_ENGULFING"],
    structureTrend: "BULLISH",
    isBreakout: true,
    isRetest: true,
    chaseRisk: false,
    exhaustionRisk: false,
    trueMtf: mtf(),
    dataStatus: "REALTIME_VERIFIED",
  };

  const result = ServerGlobalRealtimeScannerV20.evaluateCandidate(input);
  assert.equal(result.recommendation, "BUY_CANDIDATE");
  assert.equal(result.trueMtfGate.passed, true);
  return result;
}

function context(overrides: Partial<SignalDispatchContextV204> = {}): SignalDispatchContextV204 {
  return {
    historyStatus: "HISTORY_VERIFIED",
    currentPositions: 0,
    positionWeightPct: 10,
    dailyPnlPct: 0,
    portfolioDrawdownPct: 0,
    estimatedSlippageBps: 5,
    marketOpen: true,
    killSwitchActive: false,
    ...overrides,
  };
}

class CountingExecutor implements CandidateExecutionPortV204 {
  calls = 0;

  async evaluateCandidateAndTrade() {
    this.calls += 1;
    return { executed: true, reason: "TEST_LIVE_EXECUTED" };
  }
}

test("V20.4 SIGNAL_ONLY approves signal without touching executor/broker path", async () => {
  const executor = new CountingExecutor();
  const dispatch = new YesOnlySignalDispatchV204(executor, {
    ...DEFAULT_AUTONOMOUS_RISK_POLICY,
    mode: "SIGNAL_ONLY",
  });

  const result = await dispatch.dispatch(yesCandidate(), context());

  assert.equal(result.verdict, "SIGNAL_APPROVED");
  assert.equal(result.executed, false);
  assert.equal(result.dispatched, false);
  assert.equal(executor.calls, 0);
  assert.match(result.reason, /BROKER_NOT_CALLED/);
});

test("V20.4 HISTORY_UNVERIFIED blocks candidate before executor", async () => {
  const executor = new CountingExecutor();
  const dispatch = new YesOnlySignalDispatchV204(executor);

  const result = await dispatch.dispatch(
    yesCandidate(),
    context({ historyStatus: "HISTORY_UNVERIFIED" }),
  );

  assert.equal(result.verdict, "REJECTED");
  assert.equal(result.reason, "HISTORY_UNVERIFIED");
  assert.equal(executor.calls, 0);
});

test("V20.4 pre-trade spread rejection cannot reach executor", async () => {
  const executor = new CountingExecutor();
  const dispatch = new YesOnlySignalDispatchV204(executor, {
    ...DEFAULT_AUTONOMOUS_RISK_POLICY,
    mode: "LIVE_RESTRICTED",
    maxSpreadBps: 20,
  });

  const result = await dispatch.dispatch(yesCandidate(21), context());

  assert.equal(result.verdict, "REJECTED");
  assert.equal(executor.calls, 0);
});

test("V20.4 LIVE_RESTRICTED reaches executor only after every prefilter passes", async () => {
  const executor = new CountingExecutor();
  const dispatch = new YesOnlySignalDispatchV204(executor, {
    ...DEFAULT_AUTONOMOUS_RISK_POLICY,
    mode: "LIVE_RESTRICTED",
  });

  const result = await dispatch.dispatch(yesCandidate(), context());

  assert.equal(result.verdict, "LIVE_DISPATCHED");
  assert.equal(result.executed, true);
  assert.equal(executor.calls, 1);
});
