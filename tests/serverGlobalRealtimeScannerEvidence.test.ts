import assert from "node:assert/strict";
import test from "node:test";
import { capScannerScoreByEvidence } from "../server/v20/ServerGlobalRealtimeScannerV20";

test("scanner score is capped when evidence coverage is below 60%", () => {
  assert.equal(capScannerScoreByEvidence(99, 45), 61);
});

test("scanner score cannot look A-grade at 60-74% evidence coverage", () => {
  assert.equal(capScannerScoreByEvidence(96, 70), 75);
});

test("scanner score cannot look S-grade at 75-89% evidence coverage", () => {
  assert.equal(capScannerScoreByEvidence(99, 82), 87);
});

test("high evidence coverage preserves the raw score", () => {
  assert.equal(capScannerScoreByEvidence(93, 91), 93);
});

test("score and coverage inputs are clamped safely", () => {
  assert.equal(capScannerScoreByEvidence(130, 120), 100);
  assert.equal(capScannerScoreByEvidence(-20, -5), 0);
});
