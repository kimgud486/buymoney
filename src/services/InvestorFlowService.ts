// ----------------------------------------------------------------------
// REAL INVESTOR FLOW SERVICE (V15 ZERO FAKE DATA)
// ----------------------------------------------------------------------

export interface InvestorFlowPoint {
  timestamp: number;
  timeStr: string;

  foreignNet: number | null;
  institutionNet: number | null;
  retailNet: number | null;

  provider: string;
  verified: boolean;
}

export interface InvestorFlowResult {
  symbol?: string;

  status: "LIVE" | "STALE" | "UNAVAILABLE";

  points: InvestorFlowPoint[];

  reason?: string;
}

export async function fetchInvestorFlow(
  symbol?: string
): Promise<InvestorFlowResult> {
  try {
    const url = symbol
      ? `/api/market/investor-flow?symbol=${encodeURIComponent(symbol)}`
      : "/api/market/investor-flow";

    const response = await fetch(url);

    if (!response.ok) {
      return {
        status: "UNAVAILABLE",
        points: [],
        reason: "INVESTOR_FLOW_API_UNAVAILABLE"
      };
    }

    const data = await response.json();

    if (!Array.isArray(data?.points) || data.points.length === 0) {
      return {
        status: "UNAVAILABLE",
        points: [],
        reason: "NO_REAL_DATA_POINTS"
      };
    }

    return {
      symbol: data.symbol || symbol,
      status: "LIVE",
      points: data.points
    };
  } catch {
    return {
      status: "UNAVAILABLE",
      points: [],
      reason: "NETWORK_ERROR"
    };
  }
}
