import { AIScanner, MarketScanInput } from "../ai/AIScanner";
import { AIScanDecision } from "../ai/ScanDecisionSchema";
import { CandidateRanker } from "../ai/CandidateRanker";
import { AutonomousTradingOrchestrator } from "./AutonomousTradingOrchestrator";

export interface AutonomousMarketContext {
  dailyPnlPct: number;
  portfolioDrawdownPct: number;
  spreadBps: number;
  estimatedSlippageBps: number;
  marketOpen: boolean;
}

export interface CandidateExecutionResult {
  candidate: AIScanDecision;
  executed: boolean;
  reason: string;
}

export interface AutonomousScanResult {
  scanned: AIScanDecision[];
  buyCandidates: AIScanDecision[];
  executions: CandidateExecutionResult[];
}

/**
 * Single entry point for:
 * realtime scan -> verified BUY-only ranking -> autonomous risk gate/execution.
 *
 * IMPORTANT:
 * The orchestrator's policy remains authoritative. The default policy is
 * LIVE_RESTRICTED, so only candidates that pass the realtime/risk gates can
 * reach the broker order manager.
 */
export class AutonomousScanPipeline {
  constructor(private orchestrator: AutonomousTradingOrchestrator) {}

  public async scanAndProcess(
    inputs: MarketScanInput[],
    marketContext: AutonomousMarketContext,
    topN = 5,
  ): Promise<AutonomousScanResult> {
    const scanned = AIScanner.evaluateUniverse(inputs);
    const buyCandidates = CandidateRanker.top(scanned, topN);
    const executions: CandidateExecutionResult[] = [];

    for (const candidate of buyCandidates) {
      if (!CandidateRanker.isExecutableBuyCandidate(candidate)) {
        executions.push({
          candidate,
          executed: false,
          reason: "BUY_CANDIDATE_FAILED_FINAL_PIPELINE_GATE",
        });
        continue;
      }

      const result = await this.orchestrator.evaluateCandidateAndTrade(candidate, marketContext);
      executions.push({ candidate, ...result });
    }

    return {
      scanned,
      buyCandidates,
      executions,
    };
  }
}
