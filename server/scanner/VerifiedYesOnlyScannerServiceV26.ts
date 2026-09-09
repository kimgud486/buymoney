import {
  OpenSourceSignalEnsemble,
  EnsembleEvaluationResult,
} from "../../src/autonomous/OpenSourceSignalEnsemble";
import {
  buildVerifiedSignalCandidateV26,
  ScannerMarketV26,
  VerifiedCandleBatchV26,
} from "./VerifiedIndicatorEngineV26";

export interface ScannerUniverseItemV26 {
  symbol: string;
  name: string;
  market: ScannerMarketV26;
}

/**
 * Adapter contract for a real market-data provider.
 * Implementations must return provider-originated candles only. No mock/fallback bars.
 */
export interface VerifiedMarketDataAdapterV26 {
  fetchCandles(item: ScannerUniverseItemV26): Promise<VerifiedCandleBatchV26>;
}

export interface VerifiedScannerRejectedV26 {
  symbol: string;
  name: string;
  reasons: string[];
}

export interface VerifiedYesOnlyScannerResultV26 {
  success: true;
  scannedAt: string;
  totalRequested: number;
  verifiedCount: number;
  yesCount: number;
  topIdeas: EnsembleEvaluationResult[];
  rejected: VerifiedScannerRejectedV26[];
}

export interface VerifiedYesOnlyScannerOptionsV26 {
  maxCandidates?: number;
  minimumEnsembleScore?: number;
  maxLastBarAgeMs?: number;
}

/**
 * Production scanner service.
 *
 * Market adapter failure, stale data or invalid candles are rejected per symbol.
 * The service never substitutes another symbol, a default price or synthetic candles.
 */
export class VerifiedYesOnlyScannerServiceV26 {
  constructor(private readonly marketData: VerifiedMarketDataAdapterV26) {}

  async scan(
    universe: ScannerUniverseItemV26[],
    options: VerifiedYesOnlyScannerOptionsV26 = {},
  ): Promise<VerifiedYesOnlyScannerResultV26> {
    const maxCandidates = Math.max(1, Math.min(20, options.maxCandidates ?? 5));
    const minimumScore = Math.max(0, Math.min(100, options.minimumEnsembleScore ?? 82));
    const accepted: EnsembleEvaluationResult[] = [];
    const rejected: VerifiedScannerRejectedV26[] = [];
    let verifiedCount = 0;

    for (const item of universe) {
      try {
        const batch = await this.marketData.fetchCandles(item);

        if (
          batch.symbol !== item.symbol ||
          batch.market !== item.market ||
          !batch.source ||
          !Array.isArray(batch.candles)
        ) {
          rejected.push({
            symbol: item.symbol,
            name: item.name,
            reasons: ["MARKET_DATA_ADAPTER_IDENTITY_MISMATCH"],
          });
          continue;
        }

        const candidate = buildVerifiedSignalCandidateV26(batch, {
          maxLastBarAgeMs: options.maxLastBarAgeMs,
        });
        verifiedCount += 1;

        const evaluated = OpenSourceSignalEnsemble.evaluateCandidate(candidate, {
          mode: "ANALYSIS",
          serverExecutionAuthorized: false,
        });

        if (
          evaluated.dataComplete &&
          evaluated.marketDataVerified &&
          evaluated.indicatorDataVerified &&
          evaluated.decision === "YES" &&
          evaluated.ensembleScore >= minimumScore
        ) {
          accepted.push(evaluated);
        } else {
          rejected.push({
            symbol: item.symbol,
            name: item.name,
            reasons:
              evaluated.riskReasons.length > 0
                ? evaluated.riskReasons
                : [`ENSEMBLE_SCORE_BELOW_${minimumScore}`],
          });
        }
      } catch (error) {
        rejected.push({
          symbol: item.symbol,
          name: item.name,
          reasons: [error instanceof Error ? error.message : "UNKNOWN_VERIFIED_SCANNER_ERROR"],
        });
      }
    }

    accepted.sort((a, b) => b.ensembleScore - a.ensembleScore);

    return {
      success: true,
      scannedAt: new Date().toISOString(),
      totalRequested: universe.length,
      verifiedCount,
      yesCount: Math.min(accepted.length, maxCandidates),
      topIdeas: accepted.slice(0, maxCandidates),
      rejected,
    };
  }
}
