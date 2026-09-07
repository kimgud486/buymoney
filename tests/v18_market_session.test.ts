import { test } from "node:test";
import assert from "node:assert/strict";
import { MarketSessionService } from "../src/services/MarketSessionService";

test("MarketSessionService - US Summer (EDT, UTC-4) Regular Session Test", () => {
  // July 15, 2026 at 14:00 UTC = 10:00 AM EDT (Regular Trading Hours 09:30 - 16:00 EDT)
  const edtSummerTimestamp = Date.UTC(2026, 6, 15, 14, 0, 0); // 14:00 UTC
  const info = MarketSessionService.getSessionInfo("US", edtSummerTimestamp);

  assert.equal(info.market, "US");
  assert.equal(info.session, "US_REGULAR");
  assert.equal(info.isOpen, true);
  assert.ok(info.openTimestamp != null);
  assert.ok(info.closeTimestamp != null);
});

test("MarketSessionService - US Winter (EST, UTC-5) Regular Session Test", () => {
  // January 15, 2026 at 15:00 UTC = 10:00 AM EST (Regular Trading Hours 09:30 - 16:00 EST)
  const estWinterTimestamp = Date.UTC(2026, 0, 15, 15, 0, 0); // 15:00 UTC
  const info = MarketSessionService.getSessionInfo("US", estWinterTimestamp);

  assert.equal(info.market, "US");
  assert.equal(info.session, "US_REGULAR");
  assert.equal(info.isOpen, true);
  assert.ok(info.openTimestamp != null);
  assert.ok(info.closeTimestamp != null);
});

test("MarketSessionService - KR Weekday Regular Session Test", () => {
  // Wednesday July 15, 2026 at 01:00 UTC = 10:00 AM KST (09:00 - 15:30 KST)
  const krWeekdayTimestamp = Date.UTC(2026, 6, 15, 1, 0, 0);
  const info = MarketSessionService.getSessionInfo("KR", krWeekdayTimestamp);

  assert.equal(info.market, "KR");
  assert.equal(info.session, "KR_REGULAR");
  assert.equal(info.isOpen, true);
});

test("MarketSessionService - Weekend Closed Test", () => {
  // Sunday July 12, 2026
  const sundayTimestamp = Date.UTC(2026, 6, 12, 12, 0, 0);
  const krInfo = MarketSessionService.getSessionInfo("KR", sundayTimestamp);
  const usInfo = MarketSessionService.getSessionInfo("US", sundayTimestamp);

  assert.equal(krInfo.isOpen, false);
  assert.equal(krInfo.session, "CLOSED");
  assert.equal(usInfo.isOpen, false);
  assert.equal(usInfo.session, "CLOSED");
});
