import {
  ProductionSupervisorStatusV134,
  SupervisorStateV134
} from "./typesV134";
import { heartbeatMonitorV134, HeartbeatMonitorV134 } from "./HeartbeatMonitorV134";
import { circuitBreakerV134, CircuitBreakerV134 } from "./CircuitBreakerV134";
import { dualChannelFillVerifierV134, DualChannelFillVerifierV134 } from "./DualChannelFillVerifierV134";

export class ProductionSupervisorV134 {
  private hbMonitor: HeartbeatMonitorV134;
  private cb: CircuitBreakerV134;
  private fillVerifier: DualChannelFillVerifierV134;
  private globalKillSwitchActive: boolean = false;
  private dailyLossLockActive: boolean = false;

  constructor(
    hbMonitor = heartbeatMonitorV134,
    cb = circuitBreakerV134,
    fillVerifier = dualChannelFillVerifierV134
  ) {
    this.hbMonitor = hbMonitor;
    this.cb = cb;
    this.fillVerifier = fillVerifier;
  }

  public setGlobalKillSwitch(active: boolean) {
    this.globalKillSwitchActive = active;
  }

  public setDailyLossLock(active: boolean) {
    this.dailyLossLockActive = active;
  }

  public evaluateStatus(): ProductionSupervisorStatusV134 {
    const rejectionReasons: string[] = [];
    const cbStatus = this.cb.getStatus();
    const healthCheck = this.hbMonitor.checkHealth();
    const hasFillMismatch = this.fillVerifier.hasMismatches();

    if (this.globalKillSwitchActive) {
      rejectionReasons.push("GLOBAL_KILL_SWITCH_ACTIVE");
    }

    if (this.dailyLossLockActive) {
      rejectionReasons.push("DAILY_LOSS_LIMIT_HARD_LOCK");
    }

    if (cbStatus.isTripped) {
      rejectionReasons.push(`CIRCUIT_BREAKER_TRIPPED (${cbStatus.tripReason || "UNKNOWN"})`);
    }

    if (!healthCheck.isAllHealthy) {
      rejectionReasons.push(`HEARTBEAT_FAILURE (${healthCheck.staleOrDead.join(", ")})`);
    }

    if (hasFillMismatch) {
      rejectionReasons.push("DUAL_CHANNEL_FILL_MISMATCH_LOCK");
    }

    // Determine state
    let state: SupervisorStateV134 = "HEALTHY";
    if (this.globalKillSwitchActive || cbStatus.isTripped || this.dailyLossLockActive || hasFillMismatch) {
      state = "UNHEALTHY"; // LOCK
    } else if (!healthCheck.isAllHealthy) {
      state = "DEGRADED"; // DEGRADED
    }

    // Operating Rules:
    // HEALTHY: allow new buy, allow position mgmt, allow recovery
    // DEGRADED: block new buy, allow position mgmt (sell/risk reduction), allow recovery
    // UNHEALTHY: block new buy, allow position mgmt (sell/risk reduction), allow recovery
    const allowNewBuyOrders = state === "HEALTHY";
    const allowPositionManagement = true; // Always allow exit / risk reduction routes
    const allowRecovery = true;

    return {
      state,
      allowNewBuyOrders,
      allowPositionManagement,
      allowRecovery,
      heartbeats: this.hbMonitor.getAllHeartbeats(),
      circuitBreaker: cbStatus,
      rejectionReasons,
      timestamp: new Date().toISOString()
    };
  }
}

export const productionSupervisorV134 = new ProductionSupervisorV134();
