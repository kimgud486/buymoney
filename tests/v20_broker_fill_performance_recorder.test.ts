import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";

import { BrokerFillPerformanceRecorderV20 } from "../server/v20/BrokerFillPerformanceRecorderV20";
import { BuyHoldPerformanceStoreV20 } from "../server/v20/BuyHoldPerformanceStoreV20";
import type { ParsedExecutionNotice } from "../server/v20/KISExecutionNoticeParserV20";

function notice(
  noticeId: string,
  side: "BUY" | "SELL",
  qty: number,
  price: number,
  timestamp: number
): ParsedExecutionNotice {
  return {
    rawTrId: "H0STCNI0",
    noticeId,
    accountNo: "TEST",
    orderId: noticeId,
    originalOrderId: "",
    symbol: "005930",
    side,
    execQty: qty,
    execPrice: price,
    orderQty: qty,
    remainingQty: 0,
    isExecuted: true,
    execTime: String(timestamp),
    timestamp,
    rawFields: []
  };
}

test("verified partial exits become one closed-trade performance record", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buymoney-v20-fill-"));
  const file = path.join(dir, "performance.json");
  const store = new BuyHoldPerformanceStoreV20(file);
  const recorder = new BrokerFillPerformanceRecorderV20(store);
  const context = {
    positionId: "pos-1",
    symbol: "005930",
    setup: "DOUBLE_BOTTOM",
    runtimeEntryPrice: 100,
    nextState: "HOLD"
  };

  assert.equal(recorder.onVerifiedFill(notice("b1", "BUY", 10, 100, 1000), context), false);
  assert.equal(recorder.onVerifiedFill(notice("s1", "SELL", 4, 110, 2000), context), false);
  assert.equal(recorder.onVerifiedFill(notice("s2", "SELL", 6, 120, 3000), { ...context, nextState: "CLOSED" }), true);

  const rows = store.query({ setup: "DOUBLE_BOTTOM", symbol: "005930" });
  assert.equal(rows.length, 1);
  assert.ok(Math.abs(rows[0].pnlPct - 16) < 0.0001);

  fs.rmSync(dir, { recursive: true, force: true });
});

test("closed position without verified entry basis is not written to performance DB", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buymoney-v20-fill-no-entry-"));
  const file = path.join(dir, "performance.json");
  const store = new BuyHoldPerformanceStoreV20(file);
  const recorder = new BrokerFillPerformanceRecorderV20(store);

  const written = recorder.onVerifiedFill(notice("s1", "SELL", 10, 120, 3000), {
    positionId: "pos-2",
    symbol: "005930",
    setup: "DOUBLE_BOTTOM",
    nextState: "CLOSED"
  });

  assert.equal(written, false);
  assert.equal(store.query({ setup: "DOUBLE_BOTTOM", symbol: "005930" }).length, 0);
  fs.rmSync(dir, { recursive: true, force: true });
});
