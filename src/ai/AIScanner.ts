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
  retestConfirmed?: boolean;
  orderflowDeltaPositive?: boolean;
  cvdPositive?: boolean;
  marketLeader?: boolean;
  sectorLeader?: boolean;
}

export class AIScanner {
  private static readonly BUY_THRESHOLD = 78;
  private static readonly MAX_CHASE_RISK = 0.05;

  public static evaluateMarket(input: MarketScanInput): AIScanDecision {
    const reasons: string[] = [];

    if (input.dataStatus !== "REALTIME_VERIFIED") {
      reasons.push(`Data status is ${input.dataStatus}; BUY_CANDIDATE is blocked until realtime data is verified.`);
      return this.rejectedDecision(input, reasons);
    }

    if (!Number.isFinite(input.currentPrice) || input.currentPrice <= 0) {
      reasons.push("Invalid current price; BUY_CANDIDATE blocked.");
      return this.rejectedDecision(input, reasons);
    }

    const hasVwap = Number.isFinite(input.vwap) && (input.vwap ?? 0) > 0;
    const hasRvol = Number.isFinite(input.rvol) && (input.rvol ?? 0) >= 0;
    const hasRelativeStrength = Number.isFinite(input.relativeStrength);

    const aboveVwap = hasVwap ? input.currentPrice >= (input.vwap as number) : false;
    const rvolExpansion = hasRvol ? (input.rvol as number) >= 1.5 : false;
    const rsPositive = hasRelativeStrength ? (input.relativeStrength as number) >= 60 : false;
    const trendAligned = input.currentPrice > input.openPrice && input.currentPrice >= input.lowPrice;
    const breakoutConfirmed = input.patternConfirmed === true;
    const retestConfirmed = input.retestConfirmed === true;
    const orderflowPositive = input.orderflowDeltaPositive ?? null;
    const cvdPositive = input.cvdPositive ?? null;
    const marketLeader = input.marketLeader ?? rsPositive;
    const sectorLeader = input.sectorLeader ?? rsPositive;

    let score = 0;
    if (trendAligned) score += 18;
    if (aboveVwap) score += 15;
    if (rvolExpansion) score += 15;
    if (rsPositive) score += 15;
    if (breakoutConfirmed) score += 18;
    if (retestConfirmed) score += 7;
    if (orderflowPositive === true) score += 5;
    if (cvdPositive === true) score += 3;
    if (marketLeader) score += 2;
    if (sectorLeader) score += 2;
    score = Math.min(100, score);

    const chaseRisk = Math.max(0, (input.currentPrice - input.openPrice) / Math.max(input.openPrice, 0.000001));
    const exhaustionRisk = !rvolExpansion && chaseRisk > 0.03 ? 0.7 : chaseRisk > 0.05 ? 0.6 : 0.2;
    const falseBreakoutRisk = breakoutConfirmed ? (retestConfirmed ? 0.1 : 0.25) : 0.8;
    const slippageRisk = hasRvol && (input.rvol as number) >= 2 ? 0.1 : 0.25;

    const criticalEvidencePresent = hasVwap && hasRvol && hasRelativeStrength;
    const blockingRisk = chaseRisk > this.MAX_CHASE_RISK;
    const confirmationCount = [
      aboveVwap,
      rvolExpansion,
      rsPositive,
      trendAligned,
      breakoutConfirmed,
      retestConfirmed,
      orderflowPositive === true,
      cvdPositive === true,
    ].filter(Boolean).length;

    const isBuyCandidate =
      criticalEvidencePresent &&
      score >= this.BUY_THRESHOLD &&
      breakoutConfirmed &&
      aboveVwap &&
      rvolExpansion &&
      rsPositive &&
      trendAligned &&
      confirmationCount >= 5 &&
      !blockingRisk;

    const action = isBuyCandidate ? "BUY_CANDIDATE" : score >= 60 ? "WATCH" : "REJECT";

    if (!criticalEvidencePresent) {
      reasons.push("Critical evidence missing: VWAP, RVOL and relative strength are required for BUY_CANDIDATE.");
    }
    if (!aboveVwap) reasons.push("Price is not confirmed above VWAP.");
    if (!rvolExpansion) reasons.push("RVOL is below 1.5x expansion threshold.");
    if (!rsPositive) reasons.push("Relative strength is below 60.");
    if (!trendAligned) reasons.push("Short-term price structure is not aligned upward.");
    if (!breakoutConfirmed) reasons.push("Breakout/pattern confirmation is missing.");
    if (blockingRisk) reasons.push(`Chase risk ${(chaseRisk * 100).toFixed(2)}% exceeds 5% limit.`);

    if (isBuyCandidate) {
      reasons.push(`Verified BUY candidate: setup score ${score}/100 with ${confirmationCount} confirmations.`);
    } else {
      reasons.push(`Setup score ${score}/100; BUY requires >=${this.BUY_THRESHOLD}, verified critical evidence and no blocking risk.`);
    }

    const invalidationPrice = input.lowPrice > 0 ? input.lowPrice : input.currentPrice * 0.98;

    return {
      symbol: input.symbol,
      market: input.market,
      action,
      setupScore: score,
      pattern: input.patternName ?? null,
      patternStatus: breakoutConfirmed ? "CONFIRMED" : input.patternName ? "CANDIDATE" : null,
      evidence: {
        relativeStrength: rsPositive,
        rvolExpansion,
        aboveVwap,
        trendAligned,
        breakoutConfirmed,
        retestConfirmed,
        orderflowPositive,
        cvdPositive,
        marketLeader,
        sectorLeader
      },
      risks: {
        chaseRisk,
        exhaustionRisk,
        falseBreakoutRisk,
        slippageRisk
      },
      invalidationPrice,
      dataStatus: "REALTIME_VERIFIED",
      reasons
    };
  }

  public static evaluateUniverse(inputs: MarketScanInput[]): AIScanDecision[] {
    return inputs.map(input => this.evaluateMarket(input));
  }

  private static rejectedDecision(input: MarketScanInput, reasons: string[]): AIScanDecision {
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
        chaseRisk: 1,
        exhaustionRisk: 1,
        falseBreakoutRisk: 1,
        slippageRisk: 1
      },
      invalidationPrice: null,
      dataStatus: input.dataStatus,
      reasons
    };
  }
}
