export interface BrokerPositionTruth {
  symbol: string;
  qty: number;
  avgPrice: number;
}

export interface LocalPositionTruth {
  symbol: string;
  qty: number;
  avgPrice: number;
}

export interface ReconciliationResult {
  ok: boolean;
  status: "SYNCED" | "MISMATCH" | "BROKER_NO_DATA";
  mismatches: Array<{
    symbol: string;
    brokerQty: number;
    localQty: number;
  }>;
}

const normalize = (symbol: string) =>
  String(symbol || "").trim().toUpperCase();

export function reconcilePositions(
  broker: BrokerPositionTruth[],
  local: LocalPositionTruth[]
): ReconciliationResult {
  if (!broker) {
    return {
      ok: false,
      status: "BROKER_NO_DATA",
      mismatches: []
    };
  }

  const brokerMap = new Map(
    broker.map(p => [normalize(p.symbol), p])
  );

  const localMap = new Map(
    local.map(p => [normalize(p.symbol), p])
  );

  const symbols = new Set([
    ...brokerMap.keys(),
    ...localMap.keys()
  ]);

  const mismatches: ReconciliationResult["mismatches"] = [];

  for (const symbol of symbols) {
    const bp = brokerMap.get(symbol);
    const lp = localMap.get(symbol);

    const brokerQty = bp?.qty ?? 0;
    const localQty = lp?.qty ?? 0;

    if (Math.abs(brokerQty - localQty) > 1e-8) {
      mismatches.push({
        symbol,
        brokerQty,
        localQty
      });
    }
  }

  return {
    ok: mismatches.length === 0,
    status: mismatches.length === 0 ? "SYNCED" : "MISMATCH",
    mismatches
  };
}
