// AISTOCK v13.8 Verified Orderbook Snapshot & Microstructure Metrics

export interface VerifiedOrderbookSnapshot {
  symbol: string;
  market: "KOREA" | "US" | "CRYPTO";
  timestamp: number;

  bidPrices: number[];
  bidSizes: number[];
  askPrices: number[];
  askSizes: number[];

  bestBid: number;
  bestAsk: number;
  spread: number;
  spreadBps: number;

  totalBidSize: number;
  totalAskSize: number;

  source: "KIS_REALTIME_WS";
  trId: "H0STASP0";
  verified: true;
}

export interface OrderflowMetrics {
  topBookImbalance: number; // (bid0 - ask0) / (bid0 + ask0)
  depthImbalance: number;   // (totalBid - totalAsk) / (totalBid + totalAsk)
  spreadBps: number;
  wallPersistence: boolean;
  liquidityDeterioration: boolean;
}

export function calculateOrderflowMetrics(snapshot: VerifiedOrderbookSnapshot): OrderflowMetrics {
  const bestBidSize = snapshot.bidSizes[0] || 0;
  const bestAskSize = snapshot.askSizes[0] || 0;
  const topTotal = bestBidSize + bestAskSize;
  const topBookImbalance = topTotal > 0 ? (bestBidSize - bestAskSize) / topTotal : 0;

  const totalVol = snapshot.totalBidSize + snapshot.totalAskSize;
  const depthImbalance = totalVol > 0 ? (snapshot.totalBidSize - snapshot.totalAskSize) / totalVol : 0;

  const spreadBps = snapshot.spreadBps;
  const wallPersistence = bestBidSize > 5000 || bestAskSize > 5000;
  const liquidityDeterioration = snapshot.spreadBps > 25.0 || totalVol < 100;

  return {
    topBookImbalance: Number(topBookImbalance.toFixed(4)),
    depthImbalance: Number(depthImbalance.toFixed(4)),
    spreadBps: Number(spreadBps.toFixed(2)),
    wallPersistence,
    liquidityDeterioration
  };
}
