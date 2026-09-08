import { AIScanDecision, DataTruthStatus } from "./ScanDecisionSchema";

export interface MarketScanInput {
  symbol: string;
  market: "KR" | "US" | "CRYPTO";
  currentPrice: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  vwap?: number;
  rvol?: number;
  relativeStrength?: number;
  dataStatus: DataTruthStatus;
  patternName?: string;
  patternConfirmed?: boolean;
  orderflowDeltaPositive?: boolean;
  cvdPositive?: boolean;
}

export class AIScanner {
  public static evaluateMarket(input: MarketScanInput): AIScanDecision {
    const reasons: string[] = [];

    if (input.dataStatus !== "REALTIME_VERIFIED") {
      reasons.push(`Data status is ${input.dataStatus}, strictly blocking BUY_CANDIDATE`);
      return {
        symbol: input.symbol,
        market: input.market,
        action: "REJECT",
        setupScore: null,
        pattern: input.patternName ?? null,
        patternStatus: null,
        evidence: {
          relativeStrength: false,
          rvolExpansion: false,
          aboveVwap: false,
          trendAligned: false,
          breakoutConfirmed: false,
          retestConfirmed: false,
          orderflowPositive: false,
          cvdPositive: false,
          marketLeader: false,
          sectorLeader: false
        },
        risks: {
          chaseRisk: 1.0,
          exhaustionRisk: 1.0,
          falseBreakoutRisk: 1.0,
          slippageRisk: 1.0
        },
        invalidationPrice: null,
        dataStatus: input.dataStatus,
        reasons
      };
    }

    const aboveVwap = input.vwap ? input.currentPrice >= input.vwap : true;
    const rvolExpansion = input.rvol ? input.rvol >= 1.5 : false;
    const rsPositive = input.relativeStrength ? input.relativeStrength >= 60 : false;
    const trendAligned = input.currentPrice > input.openPrice;
    const breakoutConfirmed = input.patternConfirmed ?? false;

    let score = 50;
    if (aboveVwap) score += 10;
    if (rvolExpansion) score += 15;
    if (rsPositive) score += 15;
    if (trendAligned) score += 10;
    if (breakoutConfirmed) score += 10;

    const isBuyCandidate = score >= 75 && breakoutConfirmed;
    const action = isBuyCandidate ? "BUY_CANDIDATE" : score >= 60 ? "WATCH" : "REJECT";

    if (isBuyCandidate) {
      reasons.push("Realtime data verified and setup score meets threshold (>=75)");
    } else {
      reasons.push(`Score ${score} did not meet criteria for BUY_CANDIDATE`);
    }

    const invalidationPrice = input.lowPrice > 0 ? input.lowPrice : input.currentPrice * 0.98;

    return {
      symbol: input.symbol,
      market: input.market,
      action,
      setupScore: score,
      pattern: input.patternName ?? "ORB_Breakout",
      patternStatus: breakoutConfirmed ? "CONFIRMED" : "CANDIDATE",
      evidence: {
        relativeStrength: rsPositive,
        rvolExpansion,
        aboveVwap,
        trendAligned,
        breakoutConfirmed,
        retestConfirmed: false,
        orderflowPositive: input.orderflowDeltaPositive ?? null,
        cvdPositive: input.cvdPositive ?? null,
        marketLeader: rsPositive,
        sectorLeader: rsPositive
      },
      risks: {
        chaseRisk: (input.currentPrice - input.openPrice) / input.openPrice,
        exhaustionRisk: 0.1,
        falseBreakoutRisk: 0.15,
        slippageRisk: 0.05
      },
      invalidationPrice,
      dataStatus: "REALTIME_VERIFIED",
      reasons
    };
  }
}
