export type AutonomousMode =
  | "DISABLED"
  | "SHADOW"
  | "SIGNAL_ONLY"
  | "LIVE_RESTRICTED"
  | "LIVE";

export interface AutonomousRiskPolicy {
  enabled: boolean;
  mode: AutonomousMode;

  maxConcurrentPositions: number;
  maxPositionWeightPct: number;

  maxDailyLossPct: number;
  maxPortfolioDrawdownPct: number;

  maxSlippageBps: number;
  maxSpreadBps: number;

  maxOrdersPerMinute: number;

  requireRealtimeVerified: true;

  killSwitchEnabled: boolean;
}

export const DEFAULT_AUTONOMOUS_RISK_POLICY: AutonomousRiskPolicy = {
  enabled: true,
  mode: "LIVE",
  maxConcurrentPositions: 5,
  maxPositionWeightPct: 20.0,
  maxDailyLossPct: 3.0,
  maxPortfolioDrawdownPct: 7.0,
  maxSlippageBps: 30,
  maxSpreadBps: 20,
  maxOrdersPerMinute: 10,
  requireRealtimeVerified: true,
  killSwitchEnabled: true
};
