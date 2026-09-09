import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { AutonomousOrderJournal } from "../server/autonomous/AutonomousOrderJournal";

test("order journal blocks duplicate active client order keys and survives reload", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aistock-journal-"));
  const file = path.join(dir, "journal.json");

  const first = new AutonomousOrderJournal(file);
  first.createIntent({
    clientOrderKey: "AUTO:2026-09-09:005930:BUY",
    symbol: "005930",
    market: "KOREA",
    side: "BUY",
    qty: 10,
    price: 74200,
  });
  first.update("AUTO:2026-09-09:005930:BUY", {
    state: "SUBMITTED",
    brokerOrderId: "KIS-123",
  });

  assert.throws(() => {
    first.createIntent({
      clientOrderKey: "AUTO:2026-09-09:005930:BUY",
      symbol: "005930",
      market: "KOREA",
      side: "BUY",
      qty: 10,
      price: 74200,
    });
  }, /DUPLICATE_ACTIVE_ORDER/);

  const reloaded = new AutonomousOrderJournal(file);
  assert.equal(reloaded.hasActive("AUTO:2026-09-09:005930:BUY"), true);
  assert.equal(reloaded.getUnresolved().length, 1);
  assert.equal(reloaded.get("AUTO:2026-09-09:005930:BUY")?.brokerOrderId, "KIS-123");

  fs.rmSync(dir, { recursive: true, force: true });
});
