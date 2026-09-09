import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import os from "os";
import { BuyHoldPerformanceStoreV20 } from "../server/v20/BuyHoldPerformanceStoreV20";

test("performance store persists unique closed trades and evaluates verified history", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buymoney-v20-"));
  const file = path.join(dir, "performance.json");
  const store = new BuyHoldPerformanceStoreV20(file);

  for (let i = 0; i < 30; i++) {
    store.appendClosedTrade({
      id: `T-${i}`,
      setup: "BREAKOUT_RETEST",
      symbol: "005930",
      market: "KR",
      pnlPct: i < 25 ? 1.2 : -0.5,
      closedAt: 1_800_000_000_000 + i
    });
  }

  store.appendClosedTrade({
    id: "T-0",
    setup: "BREAKOUT_RETEST",
    symbol: "005930",
    market: "KR",
    pnlPct: 99,
    closedAt: 1_900_000_000_000
  });

  const rows = store.query({ setup: "BREAKOUT_RETEST", symbol: "005930", market: "KR" });
  assert.equal(rows.length, 30);

  const result = store.evaluate({ setup: "BREAKOUT_RETEST", symbol: "005930", market: "KR" });
  assert.equal(result.verified80Plus, true);
  assert.ok((result.winRatePct || 0) >= 80);
});
