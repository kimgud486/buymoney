import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const accountView = readFileSync(
  "src/components/trading/RealBrokerDetailedBalanceAndHoldings.tsx",
  "utf8",
);

test("real broker UI cannot promote server success directly to READY", () => {
  assert.match(accountView, /validateBrokerAccountSyncEvidence/);
  assert.match(accountView, /const verdict = validateBrokerAccountSyncEvidence\(broker, result\)/);
  assert.match(accountView, /if \(!verdict\.verified\)/);
  assert.match(accountView, /accountTotal: verdict\.accountTotal/);
  assert.doesNotMatch(
    accountView,
    /if \(result\?\.success === true\)[\s\S]{0,500}state:\s*["']READY["']/,
  );
});

test("real broker UI refuses legacy client cash breakdown as verified cash", () => {
  assert.doesNotMatch(accountView, /cashBreakdown,/);
  assert.match(accountView, /<MetricCard label="검증 현금 합계" value="NO_DATA"/);
  assert.match(accountView, /<MetricCard label="통합 순자산" value="NO_DATA"/);
});

test("real broker valuation still requires fresh verified live quote", () => {
  assert.match(accountView, /quote\.isVerified/);
  assert.match(accountView, /quote\.status !== "LIVE"/);
  assert.match(accountView, /quote\.providerTimestamp == null/);
  assert.match(accountView, /quote\.ageMs <= 15_000/);
  assert.match(accountView, /const currentPrice = quote\?\.price \?\? null/);
  assert.doesNotMatch(accountView, /positiveNumber\(position\.currentPrice\)/);
});
