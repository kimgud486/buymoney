import { realtimeSubscriptionRegistryV20 } from "./RealtimeSubscriptionRegistryV20";
import { serverRealtimeMarketHubV20 } from "./ServerRealtimeMarketHubV20";
import { serverCandleWarmCoordinatorV20 } from "./ServerCandleWarmCoordinatorV20";

export interface RealtimeHubStatusV20 {
  generatedAt: number;
  subscriptions: { KOREA: number; US: number; UPBIT: number; total: number };
  quotes: { KOREA: number; US: number; UPBIT: number; total: number; fresh: number; stale: number };
  warming: ReturnType<typeof serverCandleWarmCoordinatorV20.getStats>;
  health: "HEALTHY" | "DEGRADED" | "NO_DATA";
  lastQuoteAt: number | null;
}

export function buildRealtimeHubStatusV20(): RealtimeHubStatusV20 {
  const subscriptions = realtimeSubscriptionRegistryV20.list();
  const quotes = serverRealtimeMarketHubV20.getQuotesByMarket();
  const now = Date.now();

  const kr = subscriptions.filter((x) => x.market === "KR").length;
  const us = subscriptions.filter((x) => x.market === "US").length;
  const upbit = subscriptions.filter((x) => x.market === "CRYPTO").length;

  const qKr = quotes.filter((x) => x.market === "KOREA").length;
  const qUs = quotes.filter((x) => x.market === "US").length;
  const qUpbit = quotes.filter((x) => x.market === "UPBIT").length;
  const fresh = quotes.filter((x) => now - x.updatedAt <= 15_000 && x.grade === "EXECUTION_GRADE").length;
  const stale = quotes.length - fresh;
  const lastQuoteAt = quotes.length ? Math.max(...quotes.map((x) => x.updatedAt)) : null;
  const warming = serverCandleWarmCoordinatorV20.getStats();

  const health: RealtimeHubStatusV20["health"] = quotes.length === 0
    ? "NO_DATA"
    : fresh > 0
      ? "HEALTHY"
      : "DEGRADED";

  return {
    generatedAt: now,
    subscriptions: { KOREA: kr, US: us, UPBIT: upbit, total: subscriptions.length },
    quotes: { KOREA: qKr, US: qUs, UPBIT: qUpbit, total: quotes.length, fresh, stale },
    warming,
    health,
    lastQuoteAt,
  };
}
