import { RealtimeHubCandidateBuilderV20, type RealtimeScanTelemetryV20 } from "./RealtimeHubCandidateBuilderV20";
import type { ScanCandidateResult } from "./ServerGlobalRealtimeScannerV20";

export type FinalBuyHoldDecision = "STRONG_BUY" | "BUY" | "WATCH" | "NO_SIGNAL";

export interface FinalBuyHoldItemV20 {
  symbol: string;
  name: string;
  market: string;
  decision: FinalBuyHoldDecision;
  setupScore: number;
  grade: ScanCandidateResult["grade"];
  price: number;
  changePct: number;
  rvol: number;
  vwap?: number;
  ema9?: number;
  ema20?: number;
  atr14?: number;
  rsi14?: number;
  structureTrend?: ScanCandidateResult["structureTrend"];
  isBreakout?: boolean;
  isRetest?: boolean;
  dataStatus: ScanCandidateResult["dataStatus"];
  timestamp: number;
}

export interface FinalBuyHoldCompatResponseV20 {
  mode: "SIGNAL_ONLY";
  humanApprovalRequired: true;
  generatedAt: number;
  requestedSymbols: string[];
  reviewed: number;
  candidates: FinalBuyHoldItemV20[];
  telemetry: RealtimeScanTelemetryV20[];
  noSignalReason?: string;
}

function normalizeSymbols(symbols: string[]): string[] {
  return Array.from(new Set((symbols || [])
    .map((s) => String(s || "").trim().toUpperCase())
    .filter(Boolean)))
    .slice(0, 100);
}

function toDecision(candidate: ScanCandidateResult): FinalBuyHoldDecision {
  if (candidate.recommendation === "BUY_CANDIDATE" && candidate.setupScore >= 90 && candidate.grade === "S") {
    return "STRONG_BUY";
  }
  if (candidate.recommendation === "BUY_CANDIDATE") return "BUY";
  if (candidate.recommendation === "WATCH") return "WATCH";
  return "NO_SIGNAL";
}

/**
 * Compatibility migration of the earlier jusik2 final engine.
 *
 * This is NOT the production HTTP authority. buymoney's production route remains
 * /api/v20/final-buy-hold -> FinalBuyHoldHttpHandlerV20 -> FinalBuyHoldDecisionServiceV20.
 * This class preserves the earlier realtime-hub bulk scan behavior without
 * weakening the stronger buymoney final-authority pipeline.
 */
export class FinalBuyHoldEngineV20 {
  public static evaluate(symbols: string[], limit = 5): FinalBuyHoldCompatResponseV20 {
    const requestedSymbols = normalizeSymbols(symbols);
    const generatedAt = Date.now();

    if (!requestedSymbols.length) {
      return {
        mode: "SIGNAL_ONLY",
        humanApprovalRequired: true,
        generatedAt,
        requestedSymbols,
        reviewed: 0,
        candidates: [],
        telemetry: [],
        noSignalReason: "NO_SYMBOLS_REQUESTED",
      };
    }

    const scan = RealtimeHubCandidateBuilderV20.scan(requestedSymbols);
    const maxItems = Math.min(Math.max(Math.trunc(limit) || 5, 1), 20);
    const candidates = scan.candidates
      .map((candidate): FinalBuyHoldItemV20 => ({
        symbol: candidate.symbol,
        name: candidate.name,
        market: candidate.market,
        decision: toDecision(candidate),
        setupScore: candidate.setupScore,
        grade: candidate.grade,
        price: candidate.price,
        changePct: candidate.changePct,
        rvol: candidate.rvol,
        vwap: candidate.vwap,
        ema9: candidate.ema9,
        ema20: candidate.ema20,
        atr14: candidate.atr14,
        rsi14: candidate.rsi14,
        structureTrend: candidate.structureTrend,
        isBreakout: candidate.isBreakout,
        isRetest: candidate.isRetest,
        dataStatus: candidate.dataStatus,
        timestamp: candidate.timestamp,
      }))
      .filter((item) => item.decision !== "NO_SIGNAL")
      .sort((a, b) => b.setupScore - a.setupScore)
      .slice(0, maxItems);

    return {
      mode: "SIGNAL_ONLY",
      humanApprovalRequired: true,
      generatedAt,
      requestedSymbols,
      reviewed: requestedSymbols.length,
      candidates,
      telemetry: scan.telemetry,
      ...(candidates.length === 0 ? { noSignalReason: "NO_REALTIME_QUALIFIED_CANDIDATES" } : {}),
    };
  }
}
