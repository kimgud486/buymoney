import { AutonomousRiskPolicy, DEFAULT_AUTONOMOUS_RISK_POLICY } from "../risk/AutonomousRiskPolicy";

export interface AutonomousTradingConfig {
  policy: AutonomousRiskPolicy;
  scanIntervalMs: number;
  auditLoggingEnabled: boolean;
  reconciliationIntervalMs: number;
}

export const DEFAULT_AUTONOMOUS_TRADING_CONFIG: AutonomousTradingConfig = {
  policy: DEFAULT_AUTONOMOUS_RISK_POLICY,
  scanIntervalMs: 5000,
  auditLoggingEnabled: true,
  reconciliationIntervalMs: 30000
};
