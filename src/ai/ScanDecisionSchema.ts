export type DataTruthStatus =
  | "REALTIME_VERIFIED"
  | "REALTIME_DERIVED"
  | "STALE"
  | "NO_DATA"
  | "INVALID"
  | "CLOSED";

export type AIScanAction = "BUY_CANDIDATE" | "WATCH" | "REJECT";

export interface AIScanDecision {
  symbol: string;
  market: "KR" | "US" | "CRYPTO";

  action: AIScanAction;

  setupScore: number | null;

  pattern: string | null;
  patternStatus:
    | "CANDIDATE"
    | "CONFIRMED"
    | "FAILED"
    | "INVALIDATED"
    | null;

  evidence: {
    relativeStrength: boolean | null;
    rvolExpansion: boolean | null;
    aboveVwap: boolean | null;
    trendAligned: boolean | null;
    breakoutConfirmed: boolean | null;
    retestConfirmed: boolean | null;
    orderflowPositive: boolean | null;
    cvdPositive: boolean | null;
    marketLeader: boolean | null;
    sectorLeader: boolean | null;
  };

  risks: {
    chaseRisk: number | null;
    exhaustionRisk: number | null;
    falseBreakoutRisk: number | null;
    slippageRisk: number | null;
  };

  invalidationPrice: number | null;

  dataStatus: DataTruthStatus;

  reasons: string[];
}
