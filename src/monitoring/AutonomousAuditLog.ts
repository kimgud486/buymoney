export interface AuditEntry {
  timestamp: number;
  symbol: string;
  market: "KR" | "US" | "CRYPTO";
  action: string;
  dataStatus: string;
  evidence: Record<string, any>;
  riskGateResult: { pass: boolean; reason?: string };
  orderRequest?: any;
  orderResponse?: any;
  executionEvent?: any;
  stateTransition?: { from: string; to: string };
  pnlNet?: number;
}

export class AutonomousAuditLog {
  private static entries: AuditEntry[] = [];

  public static log(entry: AuditEntry): void {
    this.entries.push(entry);
  }

  public static getLogs(): AuditEntry[] {
    return [...this.entries];
  }

  public static clear(): void {
    this.entries = [];
  }
}
