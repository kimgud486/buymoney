// AISTOCK v13.5 Observability & Live Readiness Types

export type LiveReadinessStatus = "READY" | "DEGRADED" | "BLOCKED";

export interface ObservabilityMetrics {
  orderLatencyMs: number;
  fillLatencyMs: number;
  staleFeedRatio: number;
  brokerErrorRate: number;
  reconciliationMismatchCount: number;
  slippageBp: number;
  killSwitchActive: boolean;
  timestamp: number;
}

export interface LiveReadinessEvaluation {
  status: LiveReadinessStatus;
  allowNewBuy: boolean;
  reasons: string[];
  metrics: ObservabilityMetrics;
  evaluatedAt: string;
}

export interface SystemEventLog {
  id: string;
  type: "ORDER" | "FILL" | "LATENCY_SPIKE" | "FEED_STALE" | "RECONCILIATION_FAIL" | "KILL_SWITCH";
  severity: "INFO" | "WARN" | "ERROR" | "CRITICAL";
  message: string;
  data?: Record<string, any>;
  timestamp: string;
}
