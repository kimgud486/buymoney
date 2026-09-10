import { describe, expect, it } from "vitest";
import { AIScanner, MarketScanInput } from "./AIScanner";
import { CandidateRanker } from "./CandidateRanker";

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
    expect(decision.action).toBe("BUY_CANDIDATE");
    expect(decision.dataStatus).toBe("REALTIME_VERIFIED");
    expect(decision.setupScore).toBeGreaterThanOrEqual(78);
    expect(CandidateRanker.isExecutableBuyCandidate(decision)).toBe(true);
  });

  it("blocks BUY when realtime data is not verified", () => {
    const decision = AIScanner.evaluateMarket({
      ...strongInput,
      dataStatus: "REALTIME_DERIVED",
    });
    expect(decision.action).toBe("REJECT");
    expect(CandidateRanker.isExecutableBuyCandidate(decision)).toBe(false);
  });

  it("blocks BUY when critical VWAP evidence is missing", () => {
    const { vwap: _vwap, ...withoutVwap } = strongInput;
    const decision = AIScanner.evaluateMarket(withoutVwap);
    expect(decision.action).not.toBe("BUY_CANDIDATE");
    expect(CandidateRanker.isExecutableBuyCandidate(decision)).toBe(false);
  });

  it("blocks chase entries above the 5 percent limit", () => {
    const decision = AIScanner.evaluateMarket({
      ...strongInput,
      currentPrice: 76000,
      openPrice: 71000,
      vwap: 73000,
    });
    expect(decision.action).not.toBe("BUY_CANDIDATE");
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
    expect(top).toHaveLength(1);
    expect(top[0].symbol).toBe("005930");
    expect(top[0].action).toBe("BUY_CANDIDATE");
  });
});
