import type { NetEdgeResult } from "../realtime/types";

export interface NetEdgeArgs {
  probabilityWin: number;
  avgWinPct: number;
  avgLossPct: number;
  feePct: number;
  taxPct: number;
  expectedSlippagePct: number;
}

export function evaluateNetEdge(args: NetEdgeArgs): NetEdgeResult {
  const probWin = Math.max(0, Math.min(1, args.probabilityWin));
  const avgWin = Math.max(0, args.avgWinPct);
  const avgLoss = Math.max(0, args.avgLossPct);

  const gross = probWin * avgWin - (1 - probWin) * avgLoss;
  const cost = Math.max(0, args.feePct) + Math.max(0, args.taxPct) + Math.max(0, args.expectedSlippagePct);
  const net = gross - cost;

  const rewardRisk = avgLoss > 0 ? avgWin / avgLoss : 0;
  const allowEntry = net > 0 && rewardRisk >= 1.5;

  const reason = !allowEntry
    ? net <= 0
      ? `NEGATIVE_EXPECTED_NET_EDGE (${net.toFixed(2)}% <= 0)`
      : `REWARD_RISK_TOO_LOW (${rewardRisk.toFixed(2)} < 1.5)`
    : "POSITIVE_NET_EDGE";

  return {
    expectedGrossEdgePct: Number(gross.toFixed(2)),
    expectedCostPct: Number(cost.toFixed(2)),
    expectedSlippagePct: Number(args.expectedSlippagePct.toFixed(2)),
    expectedNetEdgePct: Number(net.toFixed(2)),
    rewardRisk: Number(rewardRisk.toFixed(2)),
    allowEntry,
    reason
  };
}
