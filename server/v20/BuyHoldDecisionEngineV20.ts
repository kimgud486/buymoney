import type { ScanCandidateResult } from "./ServerGlobalRealtimeScannerV20";
import type { VerifiedPerformanceResultV20 } from "./VerifiedPerformanceGateV20";

export type BuyHoldActionV20 =
  | "STRONG_BUY"
  | "BUY"
  | "WATCH"
  | "NO"
  | "KEEP_HOLD"
  | "REDUCE"
  | "EXIT";

export interface PositionStateV20 {
  quantity: number;
  averagePrice: number;
  stopPrice: number;
  highestPriceSinceEntry: number;
  partialProfitTaken?: boolean;
}

export interface BuyHoldDecisionInputV20 {
  scan: ScanCandidateResult;
  performance: VerifiedPerformanceResultV20;
  position?: PositionStateV20;
  currentPrice: number;
  trailingStopPct?: number;
  partialTakeProfitPct?: number;
}

export interface BuyHoldDecisionResultV20 {
  action: BuyHoldActionV20;
  holdScore: number;
  reasons: string[];
  verifiedWinRatePct: number | null;
  performanceSampleSize: number;
  trailingStopPrice?: number;
}

function clampScore(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

export class BuyHoldDecisionEngineV20 {
  public static evaluate(input: BuyHoldDecisionInputV20): BuyHoldDecisionResultV20 {
    const reasons: string[] = [];
    const { scan, performance, position, currentPrice } = input;
    const trailingStopPct = input.trailingStopPct ?? 7;
    const partialTakeProfitPct = input.partialTakeProfitPct ?? 12;

    if (!position || position.quantity <= 0) {
      if (scan.recommendation === "REJECT" || scan.trueMtfGate.hardReject) {
        return {
          action: "NO",
          holdScore: 0,
          reasons: [scan.rejectionReason || "SCAN_REJECTED"],
          verifiedWinRatePct: performance.winRatePct,
          performanceSampleSize: performance.sampleSize
        };
      }

      if (scan.recommendation !== "BUY_CANDIDATE") {
        return {
          action: "WATCH",
          holdScore: clampScore(scan.setupScore),
          reasons: ["NOT_FINAL_BUY_CANDIDATE", ...scan.trueMtfGate.blockers],
          verifiedWinRatePct: performance.winRatePct,
          performanceSampleSize: performance.sampleSize
        };
      }

      if (performance.verified80Plus && scan.setupScore >= 90) {
        reasons.push("VERIFIED_80_PLUS_SETUP", "V20_BUY_GATE_PASS", "TRUE_MTF_PASS");
        return {
          action: "STRONG_BUY",
          holdScore: clampScore(scan.setupScore),
          reasons,
          verifiedWinRatePct: performance.winRatePct,
          performanceSampleSize: performance.sampleSize
        };
      }

      reasons.push("V20_BUY_GATE_PASS");
      if (!performance.verified80Plus) reasons.push(...performance.blockers);
      return {
        action: "BUY",
        holdScore: clampScore(scan.setupScore),
        reasons,
        verifiedWinRatePct: performance.winRatePct,
        performanceSampleSize: performance.sampleSize
      };
    }

    if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
      return {
        action: "EXIT",
        holdScore: 0,
        reasons: ["INVALID_CURRENT_PRICE_FAIL_CLOSED"],
        verifiedWinRatePct: performance.winRatePct,
        performanceSampleSize: performance.sampleSize
      };
    }

    if (currentPrice <= position.stopPrice) {
      return {
        action: "EXIT",
        holdScore: 0,
        reasons: ["HARD_STOP_BREACHED"],
        verifiedWinRatePct: performance.winRatePct,
        performanceSampleSize: performance.sampleSize
      };
    }

    if (scan.trueMtfGate.hardReject || scan.recommendation === "REJECT") {
      return {
        action: "EXIT",
        holdScore: 10,
        reasons: [scan.rejectionReason || "RISK_GATE_REJECTED"],
        verifiedWinRatePct: performance.winRatePct,
        performanceSampleSize: performance.sampleSize
      };
    }

    const highWaterMark = Math.max(position.highestPriceSinceEntry, currentPrice);
    const trailingStopPrice = highWaterMark * (1 - trailingStopPct / 100);
    if (currentPrice <= trailingStopPrice && highWaterMark > position.averagePrice) {
      return {
        action: "EXIT",
        holdScore: 20,
        reasons: ["TRAILING_STOP_BREACHED"],
        verifiedWinRatePct: performance.winRatePct,
        performanceSampleSize: performance.sampleSize,
        trailingStopPrice
      };
    }

    const pnlPct = ((currentPrice - position.averagePrice) / position.averagePrice) * 100;
    const trendHealthy = scan.structureTrend === "BULLISH" && scan.trueMtfGate.passed;
    const volumeHealthy = scan.rvol >= 1.2;
    const rsValues = [scan.rs5m, scan.rs15m, scan.rs1h, scan.rs1d].filter(
      (v): v is number => typeof v === "number" && Number.isFinite(v)
    );
    const rsHealthy = rsValues.length > 0 && rsValues.reduce((a, b) => a + b, 0) / rsValues.length >= 60;

    let holdScore = scan.setupScore;
    if (trendHealthy) holdScore += 8;
    else holdScore -= 20;
    if (volumeHealthy) holdScore += 5;
    else holdScore -= 8;
    if (rsHealthy) holdScore += 5;
    else holdScore -= 8;
    holdScore = clampScore(holdScore);

    if (!trendHealthy && holdScore < 55) {
      return {
        action: "EXIT",
        holdScore,
        reasons: ["HOLD_STRUCTURE_BROKEN"],
        verifiedWinRatePct: performance.winRatePct,
        performanceSampleSize: performance.sampleSize,
        trailingStopPrice
      };
    }

    if (!position.partialProfitTaken && pnlPct >= partialTakeProfitPct) {
      return {
        action: "REDUCE",
        holdScore,
        reasons: ["PARTIAL_PROFIT_ZONE", `UNREALIZED_PNL:${pnlPct.toFixed(2)}%`],
        verifiedWinRatePct: performance.winRatePct,
        performanceSampleSize: performance.sampleSize,
        trailingStopPrice
      };
    }

    return {
      action: "KEEP_HOLD",
      holdScore,
      reasons: ["TREND_STILL_VALID", "RISK_GATES_CLEAR"],
      verifiedWinRatePct: performance.winRatePct,
      performanceSampleSize: performance.sampleSize,
      trailingStopPrice
    };
  }
}
