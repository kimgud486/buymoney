// AISTOCK v13.5 Live Readiness Gate
import { LiveReadinessEvaluation, ObservabilityMetrics } from "./typesV135";

export interface ReadinessThresholds {
  maxOrderLatencyMs: number;
  maxFillLatencyMs: number;
  maxStaleFeedRatio: number;
  maxBrokerErrorRate: number;
  maxReconciliationMismatchCount: number;
  maxSlippageBp: number;
}

export const DEFAULT_READINESS_THRESHOLDS: ReadinessThresholds = {
  maxOrderLatencyMs: 1500,
  maxFillLatencyMs: 3000,
  maxStaleFeedRatio: 0.05, // 5%
  maxBrokerErrorRate: 0.02, // 2%
  maxReconciliationMismatchCount: 0,
  maxSlippageBp: 50.0 // 50 bps
};

export class LiveReadinessGateV135 {
  private thresholds: ReadinessThresholds;

  constructor(thresholds: ReadinessThresholds = DEFAULT_READINESS_THRESHOLDS) {
    this.thresholds = thresholds;
  }

  public evaluate(metrics: ObservabilityMetrics): LiveReadinessEvaluation {
    const reasons: string[] = [];

    if (metrics.killSwitchActive) {
      reasons.push("GLOBAL_KILL_SWITCH_ACTIVE");
    }

    if (metrics.reconciliationMismatchCount > this.thresholds.maxReconciliationMismatchCount) {
      reasons.push(`RECONCILIATION_MISMATCH_EXCEEDED: ${metrics.reconciliationMismatchCount} > ${this.thresholds.maxReconciliationMismatchCount}`);
    }

    if (metrics.brokerErrorRate > this.thresholds.maxBrokerErrorRate) {
      reasons.push(`HIGH_BROKER_ERROR_RATE: ${(metrics.brokerErrorRate * 100).toFixed(2)}% > ${(this.thresholds.maxBrokerErrorRate * 100).toFixed(2)}%`);
    }

    if (metrics.staleFeedRatio > this.thresholds.maxStaleFeedRatio) {
      reasons.push(`HIGH_STALE_FEED_RATIO: ${(metrics.staleFeedRatio * 100).toFixed(2)}% > ${(this.thresholds.maxStaleFeedRatio * 100).toFixed(2)}%`);
    }

    if (metrics.orderLatencyMs > this.thresholds.maxOrderLatencyMs) {
      reasons.push(`HIGH_ORDER_LATENCY: ${metrics.orderLatencyMs}ms > ${this.thresholds.maxOrderLatencyMs}ms`);
    }

    if (metrics.fillLatencyMs > this.thresholds.maxFillLatencyMs) {
      reasons.push(`HIGH_FILL_LATENCY: ${metrics.fillLatencyMs}ms > ${this.thresholds.maxFillLatencyMs}ms`);
    }

    if (metrics.slippageBp > this.thresholds.maxSlippageBp) {
      reasons.push(`HIGH_SLIPPAGE: ${metrics.slippageBp}bp > ${this.thresholds.maxSlippageBp}bp`);
    }

    let status: LiveReadinessEvaluation["status"] = "READY";
    let allowNewBuy = true;

    if (
      metrics.killSwitchActive ||
      metrics.reconciliationMismatchCount > this.thresholds.maxReconciliationMismatchCount ||
      metrics.brokerErrorRate > this.thresholds.maxBrokerErrorRate
    ) {
      status = "BLOCKED";
      allowNewBuy = false;
    } else if (reasons.length > 0) {
      status = "DEGRADED";
      allowNewBuy = false; // Fail-closed for new BUY orders when degraded
    }

    return {
      status,
      allowNewBuy,
      reasons,
      metrics,
      evaluatedAt: new Date().toISOString()
    };
  }
}

export const globalLiveReadinessGateV135 = new LiveReadinessGateV135();
