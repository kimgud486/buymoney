import test from "node:test";
import assert from "node:assert/strict";

import { ExecutablePatternGateV20 } from "../server/v20/ExecutablePatternGateV20";
import { PATTERN_EXECUTION_AUDIT } from "../src/scanner/patternExecutionAudit";

test("pattern execution audit has real catalog and executable rules", () => {
  assert.ok(PATTERN_EXECUTION_AUDIT.catalog > 0);
  assert.ok(PATTERN_EXECUTION_AUDIT.executable > 0);
  assert.ok(PATTERN_EXECUTION_AUDIT.executable <= PATTERN_EXECUTION_AUDIT.catalog);
  assert.ok(PATTERN_EXECUTION_AUDIT.coveragePct > 0);
  console.log("[V20 PATTERN AUDIT]", {
    catalog: PATTERN_EXECUTION_AUDIT.catalog,
    executable: PATTERN_EXECUTION_AUDIT.executable,
    notImplemented: PATTERN_EXECUTION_AUDIT.notImplemented,
    coveragePct: PATTERN_EXECUTION_AUDIT.coveragePct
  });
});

test("known executable DOUBLE_BOTTOM passes final pattern evidence gate", () => {
  const result = ExecutablePatternGateV20.evaluate(["DOUBLE_BOTTOM"]);
  assert.equal(result.passed, true);
  assert.ok(result.executableMatches.includes("DOUBLE_BOTTOM"));
});

test("unknown or decorative pattern cannot become final BUY evidence", () => {
  const result = ExecutablePatternGateV20.evaluate(["DECORATIVE_FAKE_PATTERN"]);
  assert.equal(result.passed, false);
  assert.ok(result.blockers.includes("NO_EXECUTABLE_PATTERN_MATCH"));
  assert.ok(result.nonExecutableOrUnknown.includes("DECORATIVE_FAKE_PATTERN"));
});

test("missing pattern evidence fails closed", () => {
  const result = ExecutablePatternGateV20.evaluate([]);
  assert.equal(result.passed, false);
  assert.ok(result.blockers.includes("NO_PATTERN_EVIDENCE"));
});
