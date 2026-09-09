import {
  ScanCandidateInput,
  ScanCandidateResult,
  ServerGlobalRealtimeScannerV20,
} from "./ServerGlobalRealtimeScannerV20";
import {
  TrueMTFEvidenceV20,
  TrueMTFTimeframeV20,
} from "./TrueMTFSignalGateV20";
import {
  RuntimeBarV204,
  RuntimeHistorySourceV204,
  RuntimeMarketV204,
  RuntimeTradeTickV204,
  TrueMTFRuntimeBuilderV204,
  TrueMTFRuntimeReadinessV204,
} from "./TrueMTFRuntimeBuilderV204";

export interface RuntimeScanResultV204 {
  scan: ScanCandidateResult;
  runtimeReadiness: TrueMTFRuntimeReadinessV204;
}

const REQUIRED_FRAMES: TrueMTFTimeframeV20[] = ["1m", "3m", "5m", "D"];

function allFramesExecutionVerified(evidence: TrueMTFEvidenceV20): boolean {
  return REQUIRED_FRAMES.every(
    (timeframe) => evidence[timeframe]?.dataStatus === "REALTIME_VERIFIED",
  );
}

/**
 * Runtime bridge for the production scanner.
 *
 * Flow:
 * verified broker historical bars -> seedHistory()
 * verified live ticks             -> ingestTick()
 * candidate features              -> evaluateCandidate()
 *                                  -> TrueMTF evidence injected automatically
 *                                  -> missing/stale/derived frames can never BUY
 */
export class ServerScannerRuntimeV204 {
  public constructor(
    private readonly mtfBuilder = new TrueMTFRuntimeBuilderV204(),
  ) {}

  public seedHistory(
    symbol: string,
    market: RuntimeMarketV204,
    timeframe: TrueMTFTimeframeV20,
    bars: RuntimeBarV204[],
    historySource: RuntimeHistorySourceV204,
  ): void {
    this.mtfBuilder.seedHistory(
      symbol,
      market,
      timeframe,
      bars,
      historySource,
    );
  }

  public ingestTick(tick: RuntimeTradeTickV204): void {
    this.mtfBuilder.ingestTick(tick);
  }

  public getRuntimeReadiness(
    symbol: string,
    market: RuntimeMarketV204,
    now: number = Date.now(),
  ): TrueMTFRuntimeReadinessV204 {
    return this.mtfBuilder.getReadiness(symbol, market, now);
  }

  public evaluateCandidate(
    candidate: ScanCandidateInput,
    now: number = Date.now(),
  ): RuntimeScanResultV204 {
    if (candidate.market !== "KR" && candidate.market !== "US") {
      const scan = ServerGlobalRealtimeScannerV20.evaluateCandidate(candidate);
      return {
        scan,
        runtimeReadiness: {
          ready: false,
          fresh: false,
          missingTimeframes: [...REQUIRED_FRAMES],
          staleTimeframes: [],
          reasons: ["TRUE_MTF_RUNTIME_NOT_SUPPORTED_FOR_MARKET"],
        },
      };
    }

    const market = candidate.market as RuntimeMarketV204;
    const trueMtf = this.mtfBuilder.getEvidence(candidate.symbol, market, now);
    const runtimeReadiness = this.mtfBuilder.getReadiness(
      candidate.symbol,
      market,
      now,
    );

    let scan = ServerGlobalRealtimeScannerV20.evaluateCandidate({
      ...candidate,
      trueMtf,
    });

    // Technical analysis may inspect REALTIME_DERIVED evidence, but autonomous
    // BUY promotion requires four independently verified execution-grade frames.
    if (
      scan.recommendation === "BUY_CANDIDATE" &&
      !allFramesExecutionVerified(trueMtf)
    ) {
      scan = {
        ...scan,
        recommendation: "WATCH",
        rejectionReason: "TRUE_MTF_NOT_EXECUTION_VERIFIED:1m+3m+5m+D",
        missingFields: Array.from(
          new Set([...scan.missingFields, "trueMTFExecutionVerified"]),
        ),
      };
    }

    return { scan, runtimeReadiness };
  }

  public scanBuyCandidates(
    candidates: ScanCandidateInput[],
    topN: number = 5,
    now: number = Date.now(),
  ): RuntimeScanResultV204[] {
    const evaluated = candidates.map((candidate) =>
      this.evaluateCandidate(candidate, now),
    );

    return evaluated
      .filter(
        ({ scan, runtimeReadiness }) =>
          scan.recommendation === "BUY_CANDIDATE" &&
          runtimeReadiness.ready &&
          runtimeReadiness.fresh,
      )
      .sort((a, b) => {
        if (b.scan.setupScore !== a.scan.setupScore) {
          return b.scan.setupScore - a.scan.setupScore;
        }
        return b.scan.dataCoveragePct - a.scan.dataCoveragePct;
      })
      .slice(0, Math.max(0, Math.floor(topN)));
  }
}

/** Shared server singleton. KIS realtime and scanner routes must use this instance. */
export const serverScannerRuntimeV204 = new ServerScannerRuntimeV204();
