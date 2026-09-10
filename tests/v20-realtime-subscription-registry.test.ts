import { describe, expect, it } from "vitest";
import { RealtimeSubscriptionRegistryV20 } from "../server/v20/RealtimeSubscriptionRegistryV20";

describe("RealtimeSubscriptionRegistryV20", () => {
  it("normalizes crypto symbols to the Upbit provider format", () => {
    const registry = new RealtimeSubscriptionRegistryV20();
    const item = registry.register({ symbol: "btc", market: "CRYPTO" });
    expect(item?.symbol).toBe("BTC");
    expect(item?.providerSymbol).toBe("KRW-BTC");
  });

  it("deduplicates identical subscription intent", () => {
    const registry = new RealtimeSubscriptionRegistryV20();
    registry.register({ symbol: "005930", market: "KR" });
    registry.register({ symbol: "005930", market: "KR" });
    expect(registry.list()).toHaveLength(1);
  });

  it("rejects empty symbols instead of creating placeholder subscriptions", () => {
    const registry = new RealtimeSubscriptionRegistryV20();
    expect(registry.register({ symbol: " ", market: "US" })).toBeNull();
    expect(registry.list()).toHaveLength(0);
  });
});
