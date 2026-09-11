import assert from "node:assert/strict";
import test from "node:test";
import { calculateAbsoluteEvidenceScore } from "../src/services/GlobalRealtimeScannerV192";

test("missing evidence does not get renormalized to 100", () => {
  const result = calculateAbsoluteEvidenceScore(40, 40);
  assert.deepEqual(result, { setupScore: 40, coveragePct: 40 });
});

test("full evidence preserves absolute earned score", () => {
  const result = calculateAbsoluteEvidenceScore(82, 100);
  assert.deepEqual(result, { setupScore: 82, coveragePct: 100 });
});

test("earned score can never exceed available evidence", () => {
  const result = calculateAbsoluteEvidenceScore(90, 60);
  assert.deepEqual(result, { setupScore: 60, coveragePct: 60 });
});

test("invalid oversized inputs are safely clamped", () => {
  assert.deepEqual(calculateAbsoluteEvidenceScore(140, 130), { setupScore: 100, coveragePct: 100 });
  assert.deepEqual(calculateAbsoluteEvidenceScore(-10, -20), { setupScore: 0, coveragePct: 0 });
});
