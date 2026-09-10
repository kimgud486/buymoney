import { livePositionRuntimeService } from "../../src/trading/LivePositionRuntimeService";
import { reconcilePositions, type BrokerPositionTruth } from "../../src/trading/AccountReconciliationService";

export interface VerifiedBrokerHoldingsSnapshotV20 {
  verified: boolean;
  dataStatus: "REALTIME_VERIFIED" | "STALE" | "NO_DATA";
  asOf: number;
  positions: BrokerPositionTruth[];
}

export interface RuntimeReconciliationActionV20 {
  symbol: string;
  positionId?: string;
  type: "SYNCED" | "QTY_ADJUSTED" | "LOCAL_CLOSED" | "ORPHAN_BROKER_POSITION";
  brokerQty: number;
  localQty: number;
}

export interface RuntimeReconciliationReportV20 {
  applied: boolean;
  blocked: boolean;
  reason: string;
  actions: RuntimeReconciliationActionV20[];
}

const normalize = (value: string) => String(value || "").trim().toUpperCase();

/**
 * Reconciles local runtime quantity against an authoritative broker snapshot.
 * It never submits orders and never invents positions for unknown broker holdings.
 */
export function reconcileRuntimeWithBrokerV20(
  snapshot: VerifiedBrokerHoldingsSnapshotV20,
  options: { nowMs?: number; maxAgeMs?: number } = {}
): RuntimeReconciliationReportV20 {
  const nowMs = options.nowMs ?? Date.now();
  const maxAgeMs = options.maxAgeMs ?? 30_000;
  const ageMs = nowMs - Number(snapshot?.asOf || 0);

  if (!snapshot?.verified || snapshot.dataStatus !== "REALTIME_VERIFIED") {
    return { applied: false, blocked: true, reason: "BROKER_HOLDINGS_NOT_VERIFIED", actions: [] };
  }
  if (!Number.isFinite(ageMs) || ageMs < -60_000 || ageMs > maxAgeMs) {
    return { applied: false, blocked: true, reason: "BROKER_HOLDINGS_STALE", actions: [] };
  }
  if (!Array.isArray(snapshot.positions)) {
    return { applied: false, blocked: true, reason: "BROKER_HOLDINGS_INVALID", actions: [] };
  }

  const active = livePositionRuntimeService.getAllPositions().filter((p) => p.state !== "CLOSED");
  const localTruth = active.map((p) => ({
    symbol: p.symbol,
    qty: p.quantities.currentPositionQty,
    avgPrice: p.entryPrice
  }));
  const comparison = reconcilePositions(snapshot.positions, localTruth);
  if (comparison.status === "BROKER_NO_DATA") {
    return { applied: false, blocked: true, reason: "BROKER_NO_DATA", actions: [] };
  }

  const brokerBySymbol = new Map(snapshot.positions.map((p) => [normalize(p.symbol), p]));
  const localBySymbol = new Map<string, typeof active>();
  for (const position of active) {
    const key = normalize(position.symbol);
    const bucket = localBySymbol.get(key) ?? [];
    bucket.push(position);
    localBySymbol.set(key, bucket);
  }

  const actions: RuntimeReconciliationActionV20[] = [];
  const symbols = new Set([...brokerBySymbol.keys(), ...localBySymbol.keys()]);

  for (const symbol of symbols) {
    const broker = brokerBySymbol.get(symbol);
    const locals = localBySymbol.get(symbol) ?? [];
    const brokerQty = Math.max(0, Number(broker?.qty) || 0);

    if (locals.length === 0) {
      if (brokerQty > 0) {
        actions.push({ symbol, type: "ORPHAN_BROKER_POSITION", brokerQty, localQty: 0 });
      }
      continue;
    }

    // Multiple local positions for one broker symbol cannot be allocated safely.
    if (locals.length > 1) {
      const localQty = locals.reduce((sum, p) => sum + p.quantities.currentPositionQty, 0);
      actions.push({ symbol, type: "SYNCED", brokerQty, localQty });
      continue;
    }

    const position = locals[0];
    const localQty = Math.max(0, Number(position.quantities.currentPositionQty) || 0);
    if (Math.abs(localQty - brokerQty) <= 1e-8) {
      actions.push({ symbol, positionId: position.positionId, type: "SYNCED", brokerQty, localQty });
      continue;
    }

    if (brokerQty === 0) {
      position.quantities.currentPositionQty = 0;
      position.quantities.remainingPositionQty = 0;
      position.state = "CLOSED";
      position.updatedAt = nowMs;
      actions.push({ symbol, positionId: position.positionId, type: "LOCAL_CLOSED", brokerQty, localQty });
      continue;
    }

    position.quantities.currentPositionQty = brokerQty;
    position.quantities.remainingPositionQty = brokerQty;
    position.updatedAt = nowMs;
    actions.push({ symbol, positionId: position.positionId, type: "QTY_ADJUSTED", brokerQty, localQty });
  }

  return {
    applied: true,
    blocked: false,
    reason: comparison.ok ? "SYNCED" : "RECONCILED_FROM_VERIFIED_BROKER_TRUTH",
    actions
  };
}
