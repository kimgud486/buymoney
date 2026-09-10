import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RealtimeSubscriptionRegistryV20 } from "../server/v20/RealtimeSubscriptionRegistryV20";

describe("RealtimeSubscriptionRegistryV20", () => {
  it("normalizes crypto symbols to the Upbit provider format", () => {
    const registry = new RealtimeSubscriptionRegistryV20();
    const item = registry.register({ symbol: "btc", market: "CRYPTO" });
    assert.equal(item?.symbol, "BTC");
    assert.equal(item?.providerSymbol, "KRW-BTC");
  });

  it("deduplicates identical subscription intent", () => {
    const registry = new RealtimeSubscriptionRegistryV20();
    registry.register({ symbol: "005930", market: "KR" });
    registry.register({ symbol: "005930", market: "KR" });
    assert.equal(registry.list().length, 1);
  });

  it("rejects empty symbols instead of creating placeholder subscriptions", () => {
    const registry = new RealtimeSubscriptionRegistryV20();
    assert.equal(registry.register({ symbol: " ", market: "US" }), null);
    assert.equal(registry.list().length, 0);
  });
});
