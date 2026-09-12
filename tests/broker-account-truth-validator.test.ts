import test from "node:test";
import assert from "node:assert/strict";
import { validateBrokerAccountSyncEvidence } from "../src/services/brokerAccountTruthValidator";

test("broker account truth rejects success labels without raw evidence", () => {
  const verdict = validateBrokerAccountSyncEvidence("korea", {
    success: true,
    integrityStatus: "HEALTHY",
  });
  assert.equal(verdict.verified, false);
  assert.equal(verdict.reason, "BROKER_RAW_EVIDENCE_MISSING");
});

test("Korea account truth accepts a real zero balance but rejects a missing balance", () => {
  const zeroBalance = validateBrokerAccountSyncEvidence("korea", {
    success: true,
    rawResponse: {
      status: "OK",
      kisRes: { balance: 0, positions: [] },
    },
  });
  assert.equal(zeroBalance.verified, true);

  const missingBalance = validateBrokerAccountSyncEvidence("korea", {
    success: true,
    rawResponse: {
      status: "OK",
      kisRes: { balance: null, positions: [] },
    },
  });
  assert.equal(missingBalance.verified, false);
  assert.equal(missingBalance.reason, "KOREA_BALANCE_EVIDENCE_MISSING");
});

test("US account truth requires both balance evidence and positions evidence", () => {
  const verified = validateBrokerAccountSyncEvidence("us", {
    success: true,
    rawResponse: { status: "OK", usBal: 0, usPositions: [] },
  });
  assert.equal(verified.verified, true);

  const missingPositions = validateBrokerAccountSyncEvidence("us", {
    success: true,
    rawResponse: { status: "OK", usBal: 0 },
  });
  assert.equal(missingPositions.verified, false);
  assert.equal(missingPositions.reason, "US_POSITIONS_EVIDENCE_MISSING");
});

test("Upbit account truth rejects legacy success when total evidence is missing", () => {
  const verified = validateBrokerAccountSyncEvidence("upbit", {
    success: true,
    rawResponse: { status: "OK", upbitTotal: 0, activeKeyUsed: "PRIMARY" },
  });
  assert.equal(verified.verified, true);

  const missingTotal = validateBrokerAccountSyncEvidence("upbit", {
    success: true,
    rawResponse: { status: "OK" },
  });
  assert.equal(missingTotal.verified, false);
  assert.equal(missingTotal.reason, "UPBIT_TOTAL_EVIDENCE_MISSING");
});
