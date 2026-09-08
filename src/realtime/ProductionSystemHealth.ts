export type HealthStatus =
  | "OPERATIONAL"
  | "DEGRADED"
  | "BLOCKED";

export interface ProductionHealthInput {
  feedRealtime: boolean;
  feedFresh: boolean;

  candlesReady: boolean;
  indicatorsReady: boolean;

  brokerConnected: boolean;

  executionEnabled: boolean;

  aiModeEnabled: boolean;

  accountSynced: boolean;

  killSwitchActive: boolean;
}

export interface ProductionHealth {
  status: HealthStatus;

  executionReady: boolean;

  failures: string[];
}

export function evaluateProductionHealth(
  input: ProductionHealthInput
): ProductionHealth {
  const failures: string[] = [];

  if (!input.feedRealtime) {
    failures.push("FEED_NOT_REALTIME");
  }

  if (!input.feedFresh) {
    failures.push("FEED_STALE");
  }

  if (!input.candlesReady) {
    failures.push("CANDLES_NOT_READY");
  }

  if (!input.indicatorsReady) {
    failures.push("INDICATORS_NOT_READY");
  }

  if (!input.brokerConnected) {
    failures.push("BROKER_DISCONNECTED");
  }

  if (!input.accountSynced) {
    failures.push("ACCOUNT_NOT_SYNCED");
  }

  if (!input.aiModeEnabled) {
    failures.push("AI_MODE_OFF");
  }

  if (!input.executionEnabled) {
    failures.push("EXECUTION_DISABLED");
  }

  if (input.killSwitchActive) {
    failures.push("KILL_SWITCH_ACTIVE");
  }

  const executionReady = failures.length === 0;

  if (executionReady) {
    return {
      status: "OPERATIONAL",
      executionReady: true,
      failures: []
    };
  }

  const critical =
    failures.includes("BROKER_DISCONNECTED") ||
    failures.includes("FEED_STALE") ||
    failures.includes("KILL_SWITCH_ACTIVE");

  return {
    status: critical ? "BLOCKED" : "DEGRADED",
    executionReady: false,
    failures
  };
}
