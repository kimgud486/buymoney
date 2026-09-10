import { UpbitRealtimeWebSocketService } from "../server/market/UpbitRealtimeWebSocketService";

const service = new UpbitRealtimeWebSocketService({
  pairs: ["KRW-BTC"],
  staleThresholdMs: 10_000,
  restFallbackIntervalMs: 3_000,
});

service.subscribeStatus((status) => {
  const age = status.lastMessageAt ? `${Date.now() - status.lastMessageAt}ms` : "n/a";
  console.log(`[BTC STATUS] connected=${status.connected} source=${status.activeSource} reconnects=${status.reconnectCount} age=${age}${status.error ? ` error=${status.error}` : ""}`);
});

service.subscribeTicks((tick) => {
  const change = typeof tick.changeRate === "number" ? `${(tick.changeRate * 100).toFixed(2)}%` : "n/a";
  console.log(`[BTC] ${tick.pair} ₩${tick.price.toLocaleString("ko-KR")} change=${change} source=${tick.source} providerTs=${new Date(tick.providerTimestamp).toISOString()}`);
});

service.start();

const shutdown = () => {
  service.stop();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
