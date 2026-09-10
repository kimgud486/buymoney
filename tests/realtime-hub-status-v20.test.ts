import assert from "node:assert/strict";
import test from "node:test";
import { buildRealtimeHubStatusV20 } from "../server/v20/RealtimeHubStatusV20";

test("realtime hub status exposes truth-first counters without synthetic defaults", () => {
  const status = buildRealtimeHubStatusV20();

  assert.ok(["HEALTHY", "DEGRADED", "NO_DATA"].includes(status.health));
  assert.equal(status.subscriptions.total, status.subscriptions.KOREA + status.subscriptions.US + status.subscriptions.UPBIT);
  assert.equal(status.quotes.total, status.quotes.KOREA + status.quotes.US + status.quotes.UPBIT);
  assert.equal(status.quotes.total, status.quotes.fresh + status.quotes.stale);
  assert.ok(status.warming.requested >= 0);
  assert.ok(status.warming.warmed1m >= 0);
  assert.ok(status.warming.warmed15m >= 0);
  assert.ok(status.warming.failed >= 0);
  assert.ok(status.lastQuoteAt === null || Number.isFinite(status.lastQuoteAt));
});
