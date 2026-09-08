import { DataTruthStatus } from "../ai/ScanDecisionSchema";

export class DataHealthMonitor {
  public static isRealtimeVerified(status: DataTruthStatus): boolean {
    return status === "REALTIME_VERIFIED";
  }
}
