import { describe, it } from "node:test";
import assert from "node:assert";
import { AIScanner, MarketScanInput } from "../src/ai/AIScanner";
import { CandidateRanker } from "../src/ai/CandidateRanker";

const strongInput: MarketScanInput = {
  symbol: "005930",
  market: "KR",
  currentPrice: 73000,
  openPrice: 71000,
  highPrice: 73500,
  lowPrice: 70800,
  volume: 1_000_000,
  vwap: 71800,
  rvol: 2.1,
  relativeStrength: 72,
  dataStatus: "REALTIME_VERIFIED",
  patternName: "BREAKOUT_RETEST",
  patternConfirmed: true,
  retestConfirmed: true,
  orderflowDeltaPositive: true,
  cvdPositive: true,
  marketLeader: true,
  sectorLeader: true,
};

describe("AIScanner BUY candidate truth gate", () => {
  it("promotes a fully verified setup to BUY_CANDIDATE", () => {
    const decision = AIScanner.evaluateMarket(strongInput);
    assert.strictEqual(decision.action, "BUY_CANDIDATE");
    assert.strictEqual(decision.dataStatus, "REALTIME_VERIFIED");
    assert.ok(decision.setupScore >= 78);
    assert.strictEqual(CandidateRanker.isExecutableBuyCandidate(decision), true);
  });

  it("blocks BUY when realtime data is not verified", () => {
    const decision = AIScanner.evaluateMarket({
      ...strongInput,
      dataStatus: "REALTIME_DERIVED",
    });
    assert.strictEqual(decision.action, "REJECT");
    assert.strictEqual(CandidateRanker.isExecutableBuyCandidate(decision), false);
  });

  it("blocks BUY when critical VWAP evidence is missing", () => {
    const { vwap: _vwap, ...withoutVwap } = strongInput;
    const decision = AIScanner.evaluateMarket(withoutVwap);
    assert.notStrictEqual(decision.action, "BUY_CANDIDATE");
    assert.strictEqual(CandidateRanker.isExecutableBuyCandidate(decision), false);
  });

  it("blocks chase entries above the 5 percent limit", () => {
    const decision = AIScanner.evaluateMarket({
      ...strongInput,
      currentPrice: 76000,
      openPrice: 71000,
      vwap: 73000,
    });
    assert.notStrictEqual(decision.action, "BUY_CANDIDATE");
  });

  it("returns only verified BUY candidates in TOP results", () => {
    const buy = AIScanner.evaluateMarket(strongInput);
    const watch = AIScanner.evaluateMarket({
      ...strongInput,
      symbol: "000660",
      patternConfirmed: false,
    });
    const rejected = AIScanner.evaluateMarket({
      ...strongInput,
      symbol: "035420",
      dataStatus: "STALE",
    });

    const top = CandidateRanker.top([watch, rejected, buy], 5);
    assert.strictEqual(top.length, 1);
    assert.strictEqual(top[0].symbol, "005930");
    assert.strictEqual(top[0].action, "BUY_CANDIDATE");
  });
});
